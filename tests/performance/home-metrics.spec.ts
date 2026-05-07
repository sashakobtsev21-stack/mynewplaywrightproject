import { test, expect } from '../../src/fixtures/playwright-fixtures';
import { recordSample } from '../../src/utils/perf-recorder';

// Soft budgets — public demo, shared infra. Adjust when running against local docker.
const BUDGETS = {
  domContentLoadedMs: 4_000,
  loadCompleteMs: 6_000,
  fcpMs: 3_500,
};

test.describe('@perf home page', () => {
  test('captures paint + navigation timings', async ({ page }, testInfo) => {
    const t0 = Date.now();
    await page.goto('/', { waitUntil: 'load' });
    const wallClockMs = Date.now() - t0;

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find((p) => p.name === 'first-contentful-paint')?.startTime ?? -1;
      return {
        dnsMs: nav.domainLookupEnd - nav.domainLookupStart,
        tcpMs: nav.connectEnd - nav.connectStart,
        ttfbMs: nav.responseStart - nav.requestStart,
        domContentLoadedMs: nav.domContentLoadedEventEnd,
        loadCompleteMs: nav.loadEventEnd,
        fcpMs: fcp,
      };
    });

    recordSample({
      test: testInfo.title,
      project: testInfo.project.name,
      url: page.url(),
      metrics: { ...metrics, wallClockMs },
    });

    // expect.soft so we collect all metrics in one report, even if budgets miss
    expect.soft(metrics.domContentLoadedMs).toBeLessThan(BUDGETS.domContentLoadedMs);
    expect.soft(metrics.loadCompleteMs).toBeLessThan(BUDGETS.loadCompleteMs);
    if (metrics.fcpMs > 0) {
      expect.soft(metrics.fcpMs).toBeLessThan(BUDGETS.fcpMs);
    }
  });

  test('LCP for above-the-fold content', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'load' });

    // Wait a bit so largest-contentful-paint observer has a chance to settle
    await page.waitForTimeout(1_500);

    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const obs = new PerformanceObserver((entries) => {
          const last = entries.getEntries().at(-1) as PerformanceEntry | undefined;
          if (last) {
            resolve(last.startTime);
            obs.disconnect();
          }
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true });
        // Fallback: resolve if no LCP arrives in 2s
        setTimeout(() => resolve(-1), 2_000);
      });
    });

    recordSample({
      test: testInfo.title,
      project: testInfo.project.name,
      metrics: { lcpMs: lcp },
    });

    if (lcp > 0) {
      expect(lcp).toBeLessThan(4_500);
    }
  });
});
