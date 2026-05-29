import { test, expect } from '@playwright/test';
import { computeCost, priceFor } from '../../src/ai/observability';
import { summarize } from '../../src/ai/budget';
import type { AiTrace } from '../../src/ai/observability';

test.describe('cost + pricing', () => {
  test('computes cost from per-million rates', () => {
    // sonnet: $3/M in, $15/M out -> 1000*3/1e6 + 500*15/1e6 = 0.0105
    expect(computeCost('claude-sonnet-4-5', 1000, 500)).toBeCloseTo(0.0105, 6);
  });

  test('matches model price by prefix and falls back to a default', () => {
    expect(priceFor('claude-haiku-4-5-20251001').inPerM).toBe(1);
    expect(priceFor('some-unknown-model')).toEqual(priceFor('claude-sonnet-4'));
  });
});

test.describe('budget summarize', () => {
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

  test('totals cost by window and module', () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const traces = [
      trace({ cost_usd: 0.01 }),
      trace({ cost_usd: 0.02, module: 'test-generator' }),
      trace({ cost_usd: 0.04, ts: '2026-04-15T10:00:00.000Z' }), // last month
      trace({ cost_usd: 0.03, success: false }),
    ];
    const s = summarize(traces, now);
    expect(s.totalCalls).toBe(4);
    expect(s.failedCalls).toBe(1);
    expect(s.todayCostUsd).toBeCloseTo(0.06, 6); // three of four are today
    expect(s.monthCostUsd).toBeCloseTo(0.06, 6); // excludes the April one
    expect(s.totalCostUsd).toBeCloseTo(0.1, 6);
    expect(s.byModule['data-generator'].calls).toBe(3);
  });
});
