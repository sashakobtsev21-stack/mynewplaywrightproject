import * as crypto from 'crypto';
import { env } from '../../config/env';
import { childLogger } from '../../utils/logger';
import type { AiTrace } from '../observability';
import type { TraceExporter } from './types';

/**
 * Ships each trace to Langfuse (the LLM-observability platform) via its public
 * ingestion API — a second `TraceExporter` alongside the OTLP one, selected by
 * `TRACE_EXPORT=langfuse`. One AI call becomes a Langfuse trace + a `generation`
 * observation carrying the model, token usage, latency, and our cost.
 *
 * Same contract as every exporter: `fetch`, no SDK; fire-and-forget; never throws.
 */

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
const log = childLogger('ai-export');

export interface LangfuseConfig {
  baseUrl: string;
  publicKey?: string;
  secretKey?: string;
}

/** Map a trace to a Langfuse ingestion batch (trace-create + generation-create). */
export function toIngestionBatch(trace: AiTrace, eventTs: string): Record<string, unknown> {
  const endMs = Date.parse(trace.ts);
  const startMs =
    (Number.isFinite(endMs) ? endMs : 0) - Math.max(0, Math.round(trace.latency_ms || 0));
  const startTime = new Date(startMs).toISOString();

  return {
    batch: [
      {
        id: crypto.randomUUID(),
        type: 'trace-create',
        timestamp: eventTs,
        body: {
          id: trace.trace_id,
          name: trace.module,
          timestamp: trace.ts,
          metadata: {
            provider: trace.provider,
            prompt: trace.prompt_name,
            prompt_version: trace.prompt_version,
            injection_suspected: trace.injection_suspected,
          },
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'generation-create',
        timestamp: eventTs,
        body: {
          id: `${trace.trace_id}-gen`,
          traceId: trace.trace_id,
          name: trace.module,
          model: trace.model,
          startTime,
          endTime: trace.ts,
          usage: {
            input: trace.input_tokens,
            output: trace.output_tokens,
            unit: 'TOKENS',
          },
          level: trace.success ? 'DEFAULT' : 'ERROR',
          statusMessage: trace.error,
          metadata: { cost_usd: trace.cost_usd },
        },
      },
    ],
  };
}

export class LangfuseExporter implements TraceExporter {
  readonly name = 'langfuse';
  private readonly cfg: LangfuseConfig;
  private readonly fetchImpl: FetchFn;

  constructor(cfg?: Partial<LangfuseConfig>, fetchImpl: FetchFn = globalThis.fetch) {
    this.cfg = {
      baseUrl: (cfg?.baseUrl ?? env.LANGFUSE_BASE_URL).replace(/\/+$/, ''),
      publicKey: cfg?.publicKey ?? env.LANGFUSE_PUBLIC_KEY,
      secretKey: cfg?.secretKey ?? env.LANGFUSE_SECRET_KEY,
    };
    this.fetchImpl = fetchImpl;
  }

  export(trace: AiTrace): void {
    void this.send(trace, new Date().toISOString());
  }

  /** Awaitable for tests; never rejects. `eventTs` is injected for determinism. */
  async send(trace: AiTrace, eventTs: string): Promise<void> {
    if (!this.cfg.publicKey || !this.cfg.secretKey) return;
    try {
      const auth = Buffer.from(`${this.cfg.publicKey}:${this.cfg.secretKey}`).toString('base64');
      await this.fetchImpl(`${this.cfg.baseUrl}/api/public/ingestion`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
        body: JSON.stringify(toIngestionBatch(trace, eventTs)),
      });
    } catch (err) {
      log.debug({ err: err instanceof Error ? err.message : err }, 'langfuse export failed');
    }
  }
}
