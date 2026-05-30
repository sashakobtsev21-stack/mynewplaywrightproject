import { test, expect } from '@playwright/test';
import type Anthropic from '@anthropic-ai/sdk';
import {
  DEFAULT_RETRY,
  isRetryable,
  sendWithRetry,
  type RetryConfig,
} from '../../src/ai/anthropic-client';

// Tight delays keep the backoff loop fast under test.
const fastRetry: RetryConfig = { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 5 };
const params = {} as Anthropic.MessageCreateParamsNonStreaming;

const okMessage = {
  id: 'msg_ok',
  usage: { input_tokens: 1, output_tokens: 1 },
} as unknown as Anthropic.Message;

/** Fake client that throws `err` for the first `failTimes` calls, then succeeds. */
function fakeClient(failTimes: number, err: unknown) {
  const state = { calls: 0 };
  const client = {
    messages: {
      create: async () => {
        state.calls += 1;
        if (state.calls <= failTimes) throw err;
        return okMessage;
      },
    },
  } as unknown as Anthropic;
  return { client, state };
}

test.describe('isRetryable', () => {
  test('retries on rate limit, timeout and server errors', () => {
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 408 })).toBe(true);
    expect(isRetryable({ status: 500 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
  });

  test('retries on transient connection failures', () => {
    expect(isRetryable({ name: 'APIConnectionError' })).toBe(true);
    expect(isRetryable({ name: 'APIConnectionTimeoutError' })).toBe(true);
  });

  test('does not retry on client errors or unknown shapes', () => {
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ status: 404 })).toBe(false);
    expect(isRetryable(null)).toBe(false);
    expect(isRetryable(new Error('boom'))).toBe(false);
  });
});

test.describe('sendWithRetry', () => {
  test('succeeds after transient failures and stops retrying', async () => {
    const { client, state } = fakeClient(2, { status: 429 });
    const res = await sendWithRetry(client, params, fastRetry);
    expect(res).toBe(okMessage);
    expect(state.calls).toBe(3); // two failures + one success
  });

  test('throws immediately on a non-retryable error', async () => {
    const { client, state } = fakeClient(1, { status: 400 });
    await expect(sendWithRetry(client, params, fastRetry)).rejects.toMatchObject({ status: 400 });
    expect(state.calls).toBe(1);
  });

  test('gives up after exhausting the retry budget', async () => {
    const { client, state } = fakeClient(Number.MAX_SAFE_INTEGER, { status: 429 });
    const retry: RetryConfig = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 };
    await expect(sendWithRetry(client, params, retry)).rejects.toMatchObject({ status: 429 });
    expect(state.calls).toBe(3); // initial attempt + 2 retries
  });

  test('exposes sensible production defaults', () => {
    expect(DEFAULT_RETRY.maxRetries).toBeGreaterThan(0);
    expect(DEFAULT_RETRY.baseDelayMs).toBeGreaterThan(0);
    expect(DEFAULT_RETRY.maxDelayMs).toBeGreaterThanOrEqual(DEFAULT_RETRY.baseDelayMs);
  });
});
