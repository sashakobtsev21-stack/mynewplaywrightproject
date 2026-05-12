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

const USAGE = `Usage:
  npm run ai:analyze -- --trace <path-to-trace.zip-or-test-results-folder> [--spec <path-to.spec.ts>]

Examples:
  npm run ai:analyze -- --trace test-results/regression-booking-flow-chromium
  npm run ai:analyze -- --trace test-results/.../trace.zip --spec tests/regression/ui/booking-flow.spec.ts
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      trace: { type: 'string' },
      spec: { type: 'string' },
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

  let ctx = collectFailureContext(dir);
  if (values.spec) {
    ctx = attachSpecSource(ctx, values.spec);
  }

  const result = await analyze(ctx);
  const slug = path.basename(dir).replace(/[^a-z0-9]+/gi, '-').slice(0, 50);
  const out = saveAnalysis(result, slug);

  process.stdout.write('\n' + result + '\n');
  process.stdout.write(`\nSaved to: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`Analysis failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
