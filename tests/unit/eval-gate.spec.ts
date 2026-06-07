import { test, expect } from '@playwright/test';
import { evaluateGate, DEFAULT_THRESHOLDS } from '../../evals/gate';
import { parseJudge } from '../../evals/judge';

test.describe('evaluateGate', () => {
  test('passes when every sample passes (offline, no judge)', () => {
    const g = evaluateGate({ passed: 4, total: 4, judgeScores: [], mode: 'offline' });
    expect(g.pass).toBe(true);
    expect(g.passRate).toBe(1);
    expect(g.avgJudgeScore).toBeNull();
  });

  test('fails when the pass rate is below the threshold', () => {
    const g = evaluateGate({ passed: 3, total: 4, judgeScores: [], mode: 'offline' });
    expect(g.pass).toBe(false);
    expect(g.reasons[0]).toMatch(/pass rate/);
  });

  test('respects a relaxed minPassRate', () => {
    const g = evaluateGate(
      { passed: 9, total: 10, judgeScores: [], mode: 'offline' },
      { minPassRate: 0.8, minJudgeScore: 4 },
    );
    expect(g.pass).toBe(true);
  });

  test('fails live when the average judge score is below the bar', () => {
    const g = evaluateGate({ passed: 2, total: 2, judgeScores: [3, 3], mode: 'live' });
    expect(g.pass).toBe(false);
    expect(g.avgJudgeScore).toBe(3);
    expect(g.reasons.some((r) => r.includes('judge'))).toBe(true);
  });

  test('passes live when the average judge score clears the bar', () => {
    const g = evaluateGate({ passed: 2, total: 2, judgeScores: [4, 5], mode: 'live' });
    expect(g.pass).toBe(true);
    expect(g.avgJudgeScore).toBe(4.5);
  });

  test('does not enforce the judge offline even with stray scores', () => {
    const g = evaluateGate({ passed: 1, total: 1, judgeScores: [1], mode: 'offline' });
    expect(g.pass).toBe(true);
  });

  test('default thresholds require a perfect pass rate', () => {
    expect(DEFAULT_THRESHOLDS.minPassRate).toBe(1);
  });
});

test.describe('parseJudge', () => {
  const good = JSON.stringify({
    score: 5,
    correct_root_cause: true,
    actionable: true,
    hallucination_risk: 'low',
    rationale: 'names the exact selector and a fix',
  });

  test('parses a valid verdict', () => {
    const v = parseJudge(good);
    expect(v.score).toBe(5);
    expect(v.hallucination_risk).toBe('low');
  });

  test('tolerates code fences around the JSON', () => {
    expect(parseJudge('```json\n' + good + '\n```').score).toBe(5);
  });

  test('rejects an out-of-range score', () => {
    const bad = JSON.stringify({
      score: 6,
      correct_root_cause: true,
      actionable: true,
      hallucination_risk: 'low',
      rationale: 'x',
    });
    expect(() => parseJudge(bad)).toThrow();
  });

  test('rejects a missing field', () => {
    expect(() => parseJudge('{"score":4}')).toThrow();
  });
});
