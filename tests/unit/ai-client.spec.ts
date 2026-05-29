import { test, expect } from '@playwright/test';
import { isRetryable } from '../../src/ai/anthropic-client';

test.describe('isRetryable', () => {
  test('retries on rate limits and server errors', () => {
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 500 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
    expect(isRetryable({ status: 408 })).toBe(true);
  });

  test('retries on transient connection errors', () => {
    expect(isRetryable({ name: 'APIConnectionError' })).toBe(true);
    expect(isRetryable({ name: 'APIConnectionTimeoutError' })).toBe(true);
  });

  test('does not retry on client errors or unknown failures', () => {
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ status: 401 })).toBe(false);
    expect(isRetryable(new Error('boom'))).toBe(false);
    expect(isRetryable(null)).toBe(false);
  });
});
