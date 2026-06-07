#!/usr/bin/env tsx
import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import {
  analyze,
  attachSpecSource,
  collectFailureContext,
  saveAnalysis,
} from '../src/ai/failure-analyzer';
import { analyzeFailureAgentic } from '../src/ai/agentic-analyzer';

const USAGE = `Usage:
  npm run ai:analyze -- --trace <path-to-trace.zip-or-test-results-folder> [--spec <path-to.spec.ts>] [--agent]

Examples:
  npm run ai:analyze -- --trace test-results/regression-booking-flow-chromium
  npm run ai:analyze -- --trace test-results/.../trace.zip --spec tests/regression/ui/booking-flow.spec.ts
  npm run ai:analyze -- --trace test-results/regression-booking-flow-chromium --agent

--agent runs the tool-use analyzer: the model explores the folder, reads the spec,
and greps the source itself (no --spec needed). Without it, the single-shot
analyzer hands the model the pre-collected error-context + screenshot.
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      trace: { type: 'string' },
      spec: { type: 'string' },
      agent: { type: 'boolean' },
    },
  });

  const input = values.trace;
  if (!input) {
    process.stderr.write(USAGE);
    process.exit(1);
  }

  if (!fs.existsSync(input)) {
    process.stderr.write(`Path does not exist: ${input}\n`);
    process.exit(2);
  }

  // Accept either a trace.zip path or the parent folder
  const stat = fs.statSync(input);
  const dir = stat.isFile() && input.endsWith('.zip') ? path.dirname(input) : input;

  let result: string;
  if (values.agent) {
    result = await analyzeFailureAgentic(dir);
  } else {
    let ctx = collectFailureContext(dir);
    if (values.spec) {
      ctx = attachSpecSource(ctx, values.spec);
    }
    result = await analyze(ctx);
  }

  const slug = path
    .basename(dir)
    .replace(/[^a-z0-9]+/gi, '-')
    .slice(0, 50);
  const out = saveAnalysis(result, slug);

  process.stdout.write('\n' + result + '\n');
  process.stdout.write(`\nSaved to: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`Analysis failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
