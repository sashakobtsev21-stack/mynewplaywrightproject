import * as fs from 'fs';

/**
 * The release gate for the AI evals. A pure function so it's unit-tested, plus a
 * loader for the committed thresholds. Turning "the evals ran" into "the evals
 * cleared the bar" is what makes this a gate rather than a report — CI fails the
 * build when it doesn't clear.
 */

export interface Thresholds {
  /** Minimum fraction of samples that must pass their heuristics (0–1). */
  minPassRate: number;
  /** Minimum average LLM-judge score (1–5). Only enforced in live mode. */
  minJudgeScore: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { minPassRate: 1, minJudgeScore: 4 };

export function loadThresholds(file: string): Thresholds {
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Thresholds>;
      return { ...DEFAULT_THRESHOLDS, ...parsed };
    }
  } catch {
    // Malformed config -> defaults, rather than crash the gate.
  }
  return DEFAULT_THRESHOLDS;
}

export interface GateInput {
  passed: number;
  total: number;
  /** Per-sample judge scores collected in live mode (empty offline). */
  judgeScores: number[];
  mode: 'live' | 'offline';
}

export interface GateResult {
  pass: boolean;
  passRate: number;
  avgJudgeScore: number | null;
  reasons: string[];
}

export function evaluateGate(input: GateInput, t: Thresholds = DEFAULT_THRESHOLDS): GateResult {
  const reasons: string[] = [];

  const passRate = input.total > 0 ? input.passed / input.total : 0;
  if (passRate < t.minPassRate) {
    reasons.push(
      `pass rate ${(passRate * 100).toFixed(0)}% < required ${(t.minPassRate * 100).toFixed(0)}%`,
    );
  }

  const avgJudgeScore =
    input.judgeScores.length > 0
      ? Number((input.judgeScores.reduce((a, b) => a + b, 0) / input.judgeScores.length).toFixed(2))
      : null;
  // The judge is an LLM proxy, so it gates the aggregate quality (live only),
  // not individual samples — one noisy grade shouldn't fail the build.
  if (input.mode === 'live' && avgJudgeScore !== null && avgJudgeScore < t.minJudgeScore) {
    reasons.push(`avg judge score ${avgJudgeScore} < required ${t.minJudgeScore}`);
  }

  return {
    pass: reasons.length === 0,
    passRate: Number(passRate.toFixed(3)),
    avgJudgeScore,
    reasons,
  };
}
