import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { recordSample } from '../../../src/utils/perf-recorder';

interface Sample {
  name: string;
  durationMs: number;
}

async function timeIt<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t0 = performance.now();
  const v = await fn();
  return [v, Math.round(performance.now() - t0)];
}

test.describe('@perf api latency', () => {
  test('common GET endpoints respond within budget', async (
    { bookingClient, roomClient },
    testInfo,
  ) => {
    const samples: Sample[] = [];

    {
      const [, ms] = await timeIt(() => roomClient.list());
      samples.push({ name: 'GET /room', durationMs: ms });
    }
    {
      const [, ms] = await timeIt(() => bookingClient.list());
      samples.push({ name: 'GET /booking', durationMs: ms });
    }

    recordSample({
      test: testInfo.title,
      project: testInfo.project.name,
      metrics: Object.fromEntries(samples.map((s) => [s.name, s.durationMs])),
    });

    for (const s of samples) {
      expect.soft(s.durationMs, `${s.name} too slow: ${s.durationMs}ms`).toBeLessThan(2_000);
    }
  });

  test('login completes in under 1.5s', async ({ authClient }, testInfo) => {
    const t0 = performance.now();
    await authClient.login({ username: 'admin', password: 'password' });
    const ms = Math.round(performance.now() - t0);

    recordSample({
      test: testInfo.title,
      project: testInfo.project.name,
      metrics: { 'POST /auth/login': ms },
    });

    expect(ms).toBeLessThan(1_500);
  });
});
