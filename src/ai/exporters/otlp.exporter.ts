import { env } from '../../config/env';
import { childLogger } from '../../utils/logger';
import type { AiTrace } from '../observability';
import type { TraceExporter } from './types';

/**
 * Ships each trace to an OpenTelemetry collector over OTLP/HTTP (JSON) with
 * `fetch` — no SDK. Works with anything that speaks OTLP: Jaeger, Grafana Tempo,
 * Honeycomb, an otel-collector, etc. One LLM call becomes one CLIENT span carrying
 * the GenAI semantic-convention attributes (model, tokens) plus our own cost.
 *
 * Best-effort by design: `export()` is fire-and-forget and `send()` swallows every
 * error — observability must never break a real call. A Langfuse/other exporter
 * would implement the same `TraceExporter` interface.
 */

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const exportLog = childLogger('ai-export');

interface OtlpConfig {
  endpoint?: string;
  headers?: Record<string, string>;
  serviceName?: string;
}

function parseHeaders(raw?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const pair of raw.split(',')) {
    const i = pair.indexOf('=');
    if (i > 0) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return out;
}

// --- OTLP/HTTP JSON mapping (pure, unit-tested) ----------------------------

type AttrValue =
  | { stringValue: string }
  | { intValue: string }
  | { doubleValue: number }
  | { boolValue: boolean };
interface Attribute {
  key: string;
  value: AttrValue;
}

const str = (key: string, v: string): Attribute => ({ key, value: { stringValue: v } });
const int = (key: string, v: number): Attribute => ({ key, value: { intValue: String(v) } });
const dbl = (key: string, v: number): Attribute => ({ key, value: { doubleValue: v } });
const bool = (key: string, v: boolean): Attribute => ({ key, value: { boolValue: v } });

const MILLIS_TO_NANOS = 1_000_000n;

function toSpan(t: AiTrace): Record<string, unknown> {
  const endMs = Date.parse(t.ts);
  const endNano = BigInt(Number.isFinite(endMs) ? endMs : 0) * MILLIS_TO_NANOS;
  const startNano = endNano - BigInt(Math.max(0, Math.round(t.latency_ms || 0))) * MILLIS_TO_NANOS;

  // OTLP wants a 16-byte trace id (32 hex) and an 8-byte span id (16 hex).
  const traceId = t.trace_id.replace(/-/g, '').slice(0, 32).padEnd(32, '0');
  const spanId = traceId.slice(0, 16);

  const attributes: Attribute[] = [
    str('ai.module', t.module),
    str('gen_ai.system', t.provider ?? 'anthropic'),
    str('gen_ai.request.model', t.model),
  ];
  if (t.prompt_name) attributes.push(str('ai.prompt.name', t.prompt_name));
  if (t.prompt_version != null) attributes.push(int('ai.prompt.version', t.prompt_version));
  if (t.input_tokens != null) attributes.push(int('gen_ai.usage.input_tokens', t.input_tokens));
  if (t.output_tokens != null) attributes.push(int('gen_ai.usage.output_tokens', t.output_tokens));
  if (t.cost_usd != null) attributes.push(dbl('ai.cost_usd', t.cost_usd));
  if (t.injection_suspected != null)
    attributes.push(bool('ai.injection_suspected', t.injection_suspected));

  return {
    traceId,
    spanId,
    name: `llm ${t.module}`,
    kind: 3, // SPAN_KIND_CLIENT
    startTimeUnixNano: startNano.toString(),
    endTimeUnixNano: endNano.toString(),
    attributes,
    status: t.success ? { code: 1 } : { code: 2, message: t.error ?? 'error' },
  };
}

/** Map traces to an OTLP/HTTP `resourceSpans` payload. Pure — unit-tested. */
export function toResourceSpans(traces: AiTrace[], serviceName: string): Record<string, unknown> {
  return {
    resourceSpans: [
      {
        resource: { attributes: [str('service.name', serviceName)] },
        scopeSpans: [{ scope: { name: 'restful-booker-ai' }, spans: traces.map(toSpan) }],
      },
    ],
  };
}

// --- exporter --------------------------------------------------------------

export class OtlpHttpExporter implements TraceExporter {
  readonly name = 'otlp';
  private readonly endpoint?: string;
  private readonly headers: Record<string, string>;
  private readonly serviceName: string;
  private readonly fetchImpl: FetchFn;

  constructor(cfg?: OtlpConfig, fetchImpl: FetchFn = globalThis.fetch) {
    this.endpoint = (cfg?.endpoint ?? env.OTEL_EXPORTER_OTLP_ENDPOINT)?.replace(/\/+$/, '');
    this.headers = cfg?.headers ?? parseHeaders(env.OTEL_EXPORTER_OTLP_HEADERS);
    this.serviceName = cfg?.serviceName ?? env.OTEL_SERVICE_NAME;
    this.fetchImpl = fetchImpl;
  }

  export(trace: AiTrace): void {
    void this.send(trace);
  }

  /** Awaitable for tests; never rejects. */
  async send(trace: AiTrace): Promise<void> {
    if (!this.endpoint) return;
    try {
      const payload = toResourceSpans([trace], this.serviceName);
      await this.fetchImpl(`${this.endpoint}/v1/traces`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...this.headers },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      exportLog.debug(
        { err: err instanceof Error ? err.message : err },
        'otlp trace export failed',
      );
    }
  }
}
