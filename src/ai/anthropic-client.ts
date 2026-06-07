import * as crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { childLogger } from '../utils/logger';
import { computeCost, writeTrace } from './observability';

export const aiLogger = childLogger('ai');

/**
 * Default model. Override with AI_MODEL env if you want to A/B with haiku/opus.
 * Sonnet is the sweet spot for our payloads — accurate enough, ~5-10x cheaper than Opus.
 */
export const MODEL = process.env.AI_MODEL ?? 'claude-sonnet-4-5';

/** Per-request timeout. Payloads are small; a slow call means trouble, not work. */
const REQUEST_TIMEOUT_MS = 60_000;

let _client: Anthropic | null = null;

export function isAiEnabled(): boolean {
  return !!env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 0;
}

export function getClient(): Anthropic {
  if (!isAiEnabled()) {
    throw new Error('ANTHROPIC_API_KEY is not set. AI features are disabled.');
  }
  if (!_client) {
    // maxRetries: 0 — we run our own backoff in callClaude so the two don't stack.
    _client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      maxRetries: 0,
      timeout: REQUEST_TIMEOUT_MS,
    });
  }
  return _client;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryConfig = { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 8_000 };

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Retry on rate limits, server errors, and transient connection failures. */
export function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  if (status === 429 || status === 408 || (status != null && status >= 500)) return true;
  const name = (err as { name?: string } | null)?.name ?? '';
  return name === 'APIConnectionError' || name === 'APIConnectionTimeoutError';
}

export type CallParams = Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'> & {
  model?: Anthropic.MessageCreateParamsNonStreaming['model'];
};

/** Where a call came from, recorded in the trace line. */
export interface CallMeta {
  module: string;
  promptName?: string;
  promptVersion?: number;
  /** Which provider served the call — recorded on the trace. */
  provider?: string;
  /** Set by a caller whose untrusted input tripped the injection heuristic. */
  injectionSuspected?: boolean;
}

export interface CallOptions {
  retry?: RetryConfig;
  meta?: CallMeta;
}

// Exported so unit tests can drive the backoff loop with a fake client; the
// production entry point is still callClaude().
export async function sendWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  retry: RetryConfig,
): Promise<Anthropic.Message> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      if (attempt >= retry.maxRetries || !isRetryable(err)) throw err;
      const backoff = Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** attempt);
      const delay = Math.round(backoff + Math.random() * backoff * 0.25);
      aiLogger.warn(
        { attempt: attempt + 1, delayMs: delay, err: err instanceof Error ? err.message : err },
        'claude call failed, retrying',
      );
      await sleep(delay);
    }
  }
}

/**
 * Single entry point for Messages API calls: applies the default model, runs an
 * exponential backoff with jitter, and writes one trace line per call (timing,
 * tokens, cost). All three AI helpers go through here so reliability and
 * observability live in one place.
 */
export async function callClaude(
  params: CallParams,
  opts: CallOptions = {},
): Promise<Anthropic.Message> {
  const client = getClient();
  const retry = opts.retry ?? DEFAULT_RETRY;
  const withModel: Anthropic.MessageCreateParamsNonStreaming = {
    ...params,
    model: params.model ?? MODEL,
  };

  const traceId = crypto.randomUUID();
  const inputHash = crypto
    .createHash('sha1')
    .update(JSON.stringify(withModel.messages))
    .digest('hex')
    .slice(0, 16);
  const start = Date.now();

  try {
    const resp = await sendWithRetry(client, withModel, retry);
    writeTrace({
      trace_id: traceId,
      ts: new Date().toISOString(),
      module: opts.meta?.module ?? 'unknown',
      prompt_name: opts.meta?.promptName,
      prompt_version: opts.meta?.promptVersion,
      model: withModel.model,
      provider: opts.meta?.provider ?? 'anthropic',
      input_hash: inputHash,
      latency_ms: Date.now() - start,
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
      cost_usd: computeCost(withModel.model, resp.usage.input_tokens, resp.usage.output_tokens),
      success: true,
      injection_suspected: opts.meta?.injectionSuspected,
    });
    return resp;
  } catch (err) {
    writeTrace({
      trace_id: traceId,
      ts: new Date().toISOString(),
      module: opts.meta?.module ?? 'unknown',
      prompt_name: opts.meta?.promptName,
      prompt_version: opts.meta?.promptVersion,
      model: withModel.model,
      provider: opts.meta?.provider ?? 'anthropic',
      input_hash: inputHash,
      latency_ms: Date.now() - start,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      injection_suspected: opts.meta?.injectionSuspected,
    });
    throw err;
  }
}

/** Extract plain text from a Messages API response. */
export function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
}
