import * as crypto from 'crypto';
import { env } from '../../config/env';
import { aiLogger } from '../anthropic-client';
import { computeCost, writeTrace, type AiTrace } from '../observability';
import { redactSecrets } from '../redaction';
import type { LLMProvider, LLMRequest, LLMResponse } from './types';

type FetchFn = typeof globalThis.fetch;

export interface OpenAIConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
}

interface ChatCompletion {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
const RETRY = { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 8_000 };
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** A localhost endpoint (Ollama, LM Studio) needs no API key and bills nothing. */
function isLocal(baseUrl: string): boolean {
  return /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(baseUrl);
}

/**
 * One provider for every OpenAI-compatible `/chat/completions` endpoint: OpenAI
 * itself, a local Ollama / LM Studio server, OpenRouter, etc. — switched by
 * `OPENAI_BASE_URL`. Uses `fetch` (no extra SDK), writes the same trace shape as
 * the Anthropic path so cost/observability stay unified across providers. The
 * `fetch` impl is injectable for tests.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = 'openai';
  private readonly cfg: OpenAIConfig;
  private readonly fetchImpl: FetchFn;

  constructor(cfg?: Partial<OpenAIConfig>, fetchImpl: FetchFn = globalThis.fetch) {
    this.cfg = {
      apiKey: cfg?.apiKey ?? env.OPENAI_API_KEY,
      baseUrl: (cfg?.baseUrl ?? env.OPENAI_BASE_URL).replace(/\/+$/, ''),
      model: cfg?.model ?? env.OPENAI_MODEL,
    };
    this.fetchImpl = fetchImpl;
  }

  isConfigured(): boolean {
    return !!this.cfg.apiKey || isLocal(this.cfg.baseUrl);
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const model = req.model ?? this.cfg.model;
    const local = isLocal(this.cfg.baseUrl);
    const chatMessages = [
      ...(req.system ? [{ role: 'system', content: req.system }] : []),
      ...req.messages.map((m) => ({ role: m.role, content: m.text })),
    ];
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.cfg.apiKey) headers.authorization = `Bearer ${this.cfg.apiKey}`;
    const body = JSON.stringify({
      model,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      messages: chatMessages,
    });

    const base = {
      trace_id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      module: req.meta?.module ?? 'unknown',
      prompt_name: req.meta?.promptName,
      prompt_version: req.meta?.promptVersion,
      model,
      provider: this.name,
      injection_suspected: req.meta?.injectionSuspected,
    };
    const start = Date.now();

    try {
      const res = await this.fetchWithRetry(`${this.cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        // Redact before the message enters trace exporters (OTLP/Langfuse):
        // a provider 401 body can echo the API key.
        throw new Error(`openai HTTP ${res.status}: ${redactSecrets(text.slice(0, 200))}`);
      }
      const data = (await res.json()) as ChatCompletion;
      const text = data.choices?.[0]?.message?.content ?? '';
      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;
      const trace: AiTrace = {
        ...base,
        latency_ms: Date.now() - start,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: local ? 0 : computeCost(model, inputTokens, outputTokens),
        success: true,
      };
      writeTrace(trace);
      return {
        text,
        model: data.model ?? model,
        provider: this.name,
        inputTokens,
        outputTokens,
      };
    } catch (err) {
      writeTrace({
        ...base,
        latency_ms: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      let res: Response | null = null;
      try {
        res = await this.fetchImpl(url, init);
      } catch (err) {
        if (attempt >= RETRY.maxRetries) throw err;
        aiLogger.warn(
          { attempt: attempt + 1, err: err instanceof Error ? err.message : err },
          'openai fetch failed, retrying',
        );
        await sleep(this.backoff(attempt));
        continue;
      }
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt >= RETRY.maxRetries) return res;
      aiLogger.warn({ attempt: attempt + 1, status: res.status }, 'openai non-ok status, retrying');
      await sleep(this.backoff(attempt));
    }
  }

  private backoff(attempt: number): number {
    const b = Math.min(RETRY.maxDelayMs, RETRY.baseDelayMs * 2 ** attempt);
    return Math.round(b + Math.random() * b * 0.25);
  }
}
