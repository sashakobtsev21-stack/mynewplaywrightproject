import { test, expect } from '@playwright/test';
import type { AiTrace } from '../../src/ai/observability';
import {
  getExporter,
  NoopExporter,
  OtlpHttpExporter,
  LangfuseExporter,
  toResourceSpans,
  toIngestionBatch,
} from '../../src/ai/exporters';

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
const okRes = { ok: true, status: 200 } as unknown as Response;

const trace = (over?: Partial<AiTrace>): AiTrace => ({
  trace_id: '12345678-1234-1234-1234-1234567890ab',
  ts: '2026-06-07T12:00:00.000Z',
  module: 'data-generator',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  latency_ms: 250,
  input_tokens: 100,
  output_tokens: 50,
  cost_usd: 0.001,
  success: true,
  ...over,
});

interface Attr {
  key: string;
  value: Record<string, unknown>;
}
interface Span {
  traceId: string;
  spanId: string;
  name: string;
  attributes: Attr[];
  status: { code: number; message?: string };
}
interface Payload {
  resourceSpans: { resource: { attributes: Attr[] }; scopeSpans: { spans: Span[] }[] }[];
}

const attrMap = (attrs: Attr[]): Record<string, unknown> => {
  const m: Record<string, unknown> = {};
  for (const a of attrs) m[a.key] = Object.values(a.value)[0];
  return m;
};

test.describe('toResourceSpans (OTLP mapping)', () => {
  test('maps a successful call to a CLIENT span with GenAI attributes', () => {
    const p = toResourceSpans([trace()], 'svc') as unknown as Payload;
    const span = p.resourceSpans[0].scopeSpans[0].spans[0];

    expect(span.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(span.spanId).toBe(span.traceId.slice(0, 16));
    expect(span.status.code).toBe(1);

    const a = attrMap(span.attributes);
    expect(a['gen_ai.request.model']).toBe('claude-sonnet-4-5');
    expect(a['gen_ai.system']).toBe('anthropic');
    expect(a['gen_ai.usage.input_tokens']).toBe('100'); // OTLP intValue is a string
    expect(a['ai.cost_usd']).toBe(0.001); // doubleValue stays numeric

    const resourceAttrs = attrMap(p.resourceSpans[0].resource.attributes);
    expect(resourceAttrs['service.name']).toBe('svc');
  });

  test('marks a failed call with an ERROR status and message', () => {
    const p = toResourceSpans(
      [trace({ success: false, error: 'boom' })],
      'svc',
    ) as unknown as Payload;
    const span = p.resourceSpans[0].scopeSpans[0].spans[0];
    expect(span.status.code).toBe(2);
    expect(span.status.message).toBe('boom');
  });
});

test.describe('OtlpHttpExporter', () => {
  const cfg = {
    endpoint: 'http://localhost:4318',
    headers: { 'x-key': 'secret' },
    serviceName: 'svc',
  };

  test('POSTs the payload to /v1/traces with the configured headers', async () => {
    const calls: { url: string | URL | Request; init?: RequestInit }[] = [];
    const fetchFake: FetchFn = async (url, init) => {
      calls.push({ url, init });
      return okRes;
    };
    await new OtlpHttpExporter(cfg, fetchFake).send(trace());

    expect(calls).toHaveLength(1);
    expect(String(calls[0].url)).toBe('http://localhost:4318/v1/traces');
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers['x-key']).toBe('secret');
    expect(headers['content-type']).toBe('application/json');
    const body = JSON.parse(String(calls[0].init?.body)) as Payload;
    expect(body.resourceSpans[0].scopeSpans[0].spans).toHaveLength(1);
  });

  test('does nothing without an endpoint', async () => {
    let called = false;
    const fetchFake: FetchFn = async () => {
      called = true;
      return okRes;
    };
    await new OtlpHttpExporter({ endpoint: '', serviceName: 'svc' }, fetchFake).send(trace());
    expect(called).toBe(false);
  });

  test('swallows a transport failure (never rejects)', async () => {
    const fetchFake: FetchFn = async (_u, _i) => {
      throw new Error('network down');
    };
    await expect(new OtlpHttpExporter(cfg, fetchFake).send(trace())).resolves.toBeUndefined();
  });
});

test.describe('getExporter', () => {
  test('defaults to the no-op exporter', () => {
    const e = getExporter();
    expect(e.name).toBe('none');
    expect(e).toBeInstanceOf(NoopExporter);
    expect(() => e.export(trace())).not.toThrow();
  });
});

test.describe('LangfuseExporter', () => {
  const cfg = { baseUrl: 'https://cloud.langfuse.com', publicKey: 'pk', secretKey: 'sk' };

  test('toIngestionBatch maps a trace to a trace + generation event', () => {
    const b = toIngestionBatch(trace(), '2026-06-08T00:00:00.000Z') as {
      batch: { type: string; body: Record<string, unknown> }[];
    };
    expect(b.batch).toHaveLength(2);
    expect(b.batch[0].type).toBe('trace-create');
    expect(b.batch[0].body.id).toBe('12345678-1234-1234-1234-1234567890ab');
    expect(b.batch[1].type).toBe('generation-create');
    expect(b.batch[1].body.model).toBe('claude-sonnet-4-5');
    expect((b.batch[1].body.usage as { input: number }).input).toBe(100);
  });

  test('POSTs to the ingestion endpoint with basic auth', async () => {
    const calls: { url: string | URL | Request; init?: RequestInit }[] = [];
    const fetchFake: FetchFn = async (url, init) => {
      calls.push({ url, init });
      return okRes;
    };
    await new LangfuseExporter(cfg, fetchFake).send(trace(), '2026-06-08T00:00:00.000Z');
    expect(String(calls[0].url)).toBe('https://cloud.langfuse.com/api/public/ingestion');
    expect((calls[0].init?.headers as Record<string, string>).authorization).toMatch(/^Basic /);
  });

  test('does nothing without keys', async () => {
    let called = false;
    const fetchFake: FetchFn = async () => {
      called = true;
      return okRes;
    };
    await new LangfuseExporter(
      { baseUrl: 'https://x', publicKey: undefined, secretKey: undefined },
      fetchFake,
    ).send(trace(), 'now');
    expect(called).toBe(false);
  });
});
