import { test, expect } from '@playwright/test';
import { summarize } from '../../src/ai/budget';
import { computeCost } from '../../src/ai/observability';
import type { AiTrace } from '../../src/ai/observability';

const trace = (over: Partial<AiTrace>): AiTrace => ({
  trace_id: 't',
  ts: '2026-05-29T10:00:00.000Z',
  module: 'data-generator',
  model: 'claude-sonnet-4-5',
  latency_ms: 100,
  cost_usd: 0.01,
  success: true,
  ...over,
});

test.describe('summarize edges', () => {
  test('returns zeroed totals for an empty trace list', () => {
    const s = summarize([], new Date('2026-05-29T12:00:00.000Z'));
    expect(s.totalCalls).toBe(0);
    expect(s.failedCalls).toBe(0);
    expect(s.totalCostUsd).toBe(0);
    expect(s.avgLatencyMs).toBe(0);
    expect(s.byModule).toEqual({});
  });

  test('averages latency across all traces', () => {
    const s = summarize(
      [trace({ latency_ms: 100 }), trace({ latency_ms: 300 })],
      new Date('2026-05-29T12:00:00.000Z'),
    );
    expect(s.avgLatencyMs).toBe(200);
  });

  test('rounds per-module cost to six decimals', () => {
    const s = summarize(
      [trace({ cost_usd: 0.0000001 }), trace({ cost_usd: 0.0000002 })],
      new Date('2026-05-29T12:00:00.000Z'),
    );
    // 0.0000003 rounds to 6dp; the key point is no float dust leaks through.
    expect(s.byModule['data-generator'].costUsd).toBeCloseTo(0, 6);
    expect(Number.isFinite(s.byModule['data-generator'].costUsd)).toBe(true);
  });

  test('counts a trace in the month but not the day when only the day differs', () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const s = summarize([trace({ ts: '2026-05-01T10:00:00.000Z' })], now);
    expect(s.monthCostUsd).toBeCloseTo(0.01, 6);
    expect(s.todayCostUsd).toBe(0);
  });

  test('treats a missing cost as zero', () => {
    const s = summarize([trace({ cost_usd: undefined })], new Date('2026-05-29T12:00:00.000Z'));
    expect(s.totalCostUsd).toBe(0);
    expect(s.totalCalls).toBe(1);
  });
});

test.describe('computeCost by tier', () => {
  test('prices opus higher than sonnet for the same tokens', () => {
    const opus = computeCost('claude-opus-4-8', 1000, 1000);
    const sonnet = computeCost('claude-sonnet-4-5', 1000, 1000);
    expect(opus).toBeGreaterThan(sonnet);
  });

  test('computes haiku cost from its per-million rates', () => {
    // haiku: $1/M in, $5/M out -> 1000*1/1e6 + 1000*5/1e6 = 0.006
    expect(computeCost('claude-haiku-4-5', 1000, 1000)).toBeCloseTo(0.006, 6);
  });
});
