import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { scoreData, dataPasses, scoreSpec, specPasses, scoreAnalysis } from '../../evals/metrics';

const FIXTURES = path.join(process.cwd(), 'evals', 'fixtures');

test.describe('eval metrics', () => {
  test('scoreData accepts a valid, diverse booking batch', () => {
    const records = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'sample-booking.json'), 'utf8'));
    const s = scoreData('booking', records);
    expect(s.strictValidRatio).toBe(1);
    expect(s.diversity).toBe(1);
    expect(dataPasses(s)).toBe(true);
  });

  test('scoreData flags duplicates as low diversity', () => {
    const dup = [
      { firstname: 'A', lastname: 'B', email: 'a@b.com', phone: '1234567' },
      { firstname: 'A', lastname: 'B', email: 'a@b.com', phone: '1234567' },
    ];
    const s = scoreData('guest', dup);
    expect(s.diversity).toBe(0.5);
    expect(dataPasses(s)).toBe(false);
  });

  test('scoreSpec passes a well-formed draft', () => {
    const code = fs.readFileSync(path.join(FIXTURES, 'sample-spec.txt'), 'utf8');
    expect(specPasses(scoreSpec(code))).toBe(true);
  });

  test('scoreSpec flags an invented relative import', () => {
    const bad =
      "import { thing } from '../../src/made/up';\ntest('x', () => { expect(1).toBe(1); });";
    expect(scoreSpec(bad).noInventedImports).toBe(false);
  });

  test('scoreAnalysis passes a structured analysis', () => {
    const md = fs.readFileSync(path.join(FIXTURES, 'sample-analysis.md'), 'utf8');
    const s = scoreAnalysis(md);
    expect(s.mentionsRootCause).toBe(true);
    expect(s.hasNextSteps).toBe(true);
  });
});
