#!/usr/bin/env tsx
import { loadBudget, readTraces, summarize } from '../src/ai/budget';

const usd = (n: number): string => `$${n.toFixed(4)}`;

function main(): void {
  const traces = readTraces();
  if (traces.length === 0) {
    process.stdout.write(
      'No AI traces yet (logs/ai-traces.jsonl is empty or missing).\n' +
        'Run an AI helper with ANTHROPIC_API_KEY set, then check again.\n',
    );
    return;
  }

  const budget = loadBudget();
  const s = summarize(traces);
  const pct = budget.monthlyUsd > 0 ? (s.monthCostUsd / budget.monthlyUsd) * 100 : 0;

  const lines = [
    'AI spend (from logs/ai-traces.jsonl)',
    '------------------------------------',
    `Calls       : ${s.totalCalls} total, ${s.failedCalls} failed`,
    `Avg latency : ${Math.round(s.avgLatencyMs)} ms`,
    `Today       : ${usd(s.todayCostUsd)}`,
    `This month  : ${usd(s.monthCostUsd)}`,
    `All time    : ${usd(s.totalCostUsd)}`,
    '',
    'By module:',
  ];
  for (const [module, v] of Object.entries(s.byModule)) {
    lines.push(`  ${module.padEnd(18)} ${String(v.calls).padStart(4)} calls  ${usd(v.costUsd)}`);
  }
  lines.push('', `Monthly budget: ${usd(budget.monthlyUsd)} — used ${pct.toFixed(1)}%`);

  process.stdout.write(lines.join('\n') + '\n');

  if (pct >= budget.alertAtPct) {
    process.stdout.write(
      `\nWARNING: this month is at ${pct.toFixed(1)}% of the ${usd(budget.monthlyUsd)} budget.\n`,
    );
    process.exitCode = 1;
  }
}

main();
