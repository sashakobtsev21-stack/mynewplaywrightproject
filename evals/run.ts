#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { isAiEnabled } from '../src/ai/anthropic-client';
import { aiDataGenerator } from '../src/ai/data-generator';
import { generateTest } from '../src/ai/test-generator';
import { analyze } from '../src/ai/failure-analyzer';
import { specCases, dataCases, analysisCases } from './datasets';
import {
  analysisPasses,
  dataPasses,
  scoreAnalysis,
  scoreData,
  scoreSpec,
  specPasses,
  typechecksSpec,
} from './metrics';

/**
 * AI eval runner. Two modes:
 *  - live  (ANTHROPIC_API_KEY set): calls the real modules and scores the output.
 *  - offline: scores committed fixtures so the harness — and CI — still run
 *    without a key or spend. The numbers then reflect the fixtures, not Claude.
 */

const FIXTURES = path.join(__dirname, 'fixtures');
const RESULTS_DIR = path.join(__dirname, 'results');
const live = isAiEnabled();

interface Sample {
  id: string;
  score: Record<string, unknown>;
  pass: boolean;
}

interface ModuleResult {
  module: string;
  passed: number;
  total: number;
  samples: Sample[];
}

async function evalDataGenerator(): Promise<ModuleResult> {
  const samples: Sample[] = [];
  for (const c of dataCases) {
    // generate() returns Claude output when live, faker when offline — both valid targets.
    const records = await aiDataGenerator.generate(c.kind, { context: c.context, count: c.count });
    const score = scoreData(c.kind, records as unknown[]);
    samples.push({ id: c.id, score: { ...score }, pass: dataPasses(score) });
  }
  return summarize('data-generator', samples);
}

async function evalTestGenerator(): Promise<ModuleResult> {
  const samples: Sample[] = [];
  const cases = live
    ? specCases
    : [{ id: 'fixture-sample', requirement: '(offline fixture)', kind: 'ui' as const }];

  for (const c of cases) {
    const code = live
      ? await generateTest(c.requirement, c.kind)
      : fs.readFileSync(path.join(FIXTURES, 'sample-spec.txt'), 'utf8');
    const score = scoreSpec(code);
    const typechecks = typechecksSpec(code);
    samples.push({
      id: c.id,
      score: { ...score, typechecks },
      pass: specPasses(score) && typechecks,
    });
  }
  return summarize('test-generator', samples);
}

async function evalFailureAnalyzer(): Promise<ModuleResult> {
  const samples: Sample[] = [];
  if (live) {
    for (const c of analysisCases) {
      const text = await analyze({
        testDir: `eval/${c.id}`,
        errorContextMd: c.errorContext,
        specSource: c.specSource,
      });
      const score = scoreAnalysis(text);
      samples.push({ id: c.id, score: { ...score }, pass: analysisPasses(score) });
    }
  } else {
    const text = fs.readFileSync(path.join(FIXTURES, 'sample-analysis.md'), 'utf8');
    const score = scoreAnalysis(text);
    samples.push({ id: 'fixture-sample', score: { ...score }, pass: analysisPasses(score) });
  }
  return summarize('failure-analyzer', samples);
}

function summarize(module: string, samples: Sample[]): ModuleResult {
  return { module, passed: samples.filter((s) => s.pass).length, total: samples.length, samples };
}

function printResult(r: ModuleResult): void {
  process.stdout.write(`\n${r.module}: ${r.passed}/${r.total} passed\n`);
  for (const s of r.samples) {
    const flags = Object.entries(s.score)
      .map(([k, v]) => `${k}=${typeof v === 'number' ? v : v ? 'y' : 'n'}`)
      .join(' ');
    process.stdout.write(`  [${s.pass ? 'PASS' : 'FAIL'}] ${s.id}: ${flags}\n`);
  }
}

async function main(): Promise<void> {
  process.stdout.write(`AI evals — mode: ${live ? 'live (Claude)' : 'offline (fixtures)'}\n`);

  const results = [
    await evalDataGenerator(),
    await evalTestGenerator(),
    await evalFailureAnalyzer(),
  ];
  results.forEach(printResult);

  const totalPassed = results.reduce((n, r) => n + r.passed, 0);
  const total = results.reduce((n, r) => n + r.total, 0);
  process.stdout.write(`\nTotal: ${totalPassed}/${total} samples passed\n`);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const out = path.join(RESULTS_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(
    out,
    JSON.stringify(
      { ts: new Date().toISOString(), mode: live ? 'live' : 'offline', results },
      null,
      2,
    ),
    'utf8',
  );
  process.stdout.write(`Results written to ${path.relative(process.cwd(), out)}\n`);

  if (totalPassed < total) process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`Eval run failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
