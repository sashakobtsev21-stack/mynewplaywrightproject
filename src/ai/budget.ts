import * as fs from 'fs';
import * as path from 'path';
import { TRACES_FILE, type AiTrace } from './observability';

/**
 * Spend tracking, derived from the trace log. There's no separate ledger to keep
 * in sync — `npm run ai:budget` reads logs/ai-traces.jsonl and totals it up,
 * comparing against an optional .ai-budget.json (git-ignored, per-developer).
 */

export interface BudgetConfig {
  monthlyUsd: number;
  /** Warn once spend crosses this percentage of the monthly budget. */
  alertAtPct: number;
}

const DEFAULT_BUDGET: BudgetConfig = { monthlyUsd: 5, alertAtPct: 80 };
const BUDGET_FILE = path.join(process.cwd(), '.ai-budget.json');

export function loadBudget(): BudgetConfig {
  try {
    if (fs.existsSync(BUDGET_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8')) as Partial<BudgetConfig>;
      return { ...DEFAULT_BUDGET, ...parsed };
    }
  } catch {
    // Malformed config -> fall back to defaults rather than crash the CLI.
  }
  return DEFAULT_BUDGET;
}

export function readTraces(): AiTrace[] {
  if (!fs.existsSync(TRACES_FILE)) return [];
  return fs
    .readFileSync(TRACES_FILE, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line): AiTrace | null => {
      try {
        return JSON.parse(line) as AiTrace;
      } catch {
        return null;
      }
    })
    .filter((t): t is AiTrace => t !== null);
}

export interface BudgetSummary {
  totalCalls: number;
  failedCalls: number;
  totalCostUsd: number;
  todayCostUsd: number;
  monthCostUsd: number;
  avgLatencyMs: number;
  byModule: Record<string, { calls: number; costUsd: number }>;
}

export function summarize(traces: AiTrace[], now: Date = new Date()): BudgetSummary {
  const today = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);

  const summary: BudgetSummary = {
    totalCalls: traces.length,
    failedCalls: 0,
    totalCostUsd: 0,
    todayCostUsd: 0,
    monthCostUsd: 0,
    avgLatencyMs: 0,
    byModule: {},
  };

  let latencySum = 0;
  for (const t of traces) {
    const cost = t.cost_usd ?? 0;
    if (!t.success) summary.failedCalls += 1;
    summary.totalCostUsd += cost;
    if (t.ts.startsWith(today)) summary.todayCostUsd += cost;
    if (t.ts.startsWith(month)) summary.monthCostUsd += cost;
    latencySum += t.latency_ms ?? 0;

    const m = (summary.byModule[t.module] ??= { calls: 0, costUsd: 0 });
    m.calls += 1;
    m.costUsd += cost;
  }

  summary.avgLatencyMs = traces.length > 0 ? latencySum / traces.length : 0;
  summary.totalCostUsd = round(summary.totalCostUsd);
  summary.todayCostUsd = round(summary.todayCostUsd);
  summary.monthCostUsd = round(summary.monthCostUsd);
  for (const v of Object.values(summary.byModule)) v.costUsd = round(v.costUsd);
  return summary;
}

function round(n: number): number {
  return Number(n.toFixed(6));
}
