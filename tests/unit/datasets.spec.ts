import { test, expect } from '@playwright/test';
import { specCases, dataCases, analysisCases } from '../../evals/datasets';

/**
 * Guard rails for the hand-written eval datasets: a duplicate id silently
 * overwrites results, and an out-of-range kind/count slips a broken case into a
 * run. Cheap to assert here, annoying to debug mid-eval.
 */

const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;

test.describe('eval datasets integrity', () => {
  test('spec case ids are unique and well-formed', () => {
    expect(uniqueIds(specCases.map((c) => c.id))).toBe(true);
    for (const c of specCases) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.requirement.length).toBeGreaterThan(0);
      expect(['ui', 'api']).toContain(c.kind);
    }
  });

  test('data case ids are unique with a positive count and known kind', () => {
    expect(uniqueIds(dataCases.map((c) => c.id))).toBe(true);
    for (const c of dataCases) {
      expect(c.count).toBeGreaterThan(0);
      expect(['booking', 'guest']).toContain(c.kind);
    }
  });

  test('analysis case ids are unique with both context fields set', () => {
    expect(uniqueIds(analysisCases.map((c) => c.id))).toBe(true);
    for (const c of analysisCases) {
      expect(c.errorContext.length).toBeGreaterThan(0);
      expect(c.specSource.length).toBeGreaterThan(0);
    }
  });
});
