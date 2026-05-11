#!/usr/bin/env tsx
import { parseArgs } from 'node:util';
import { generateTest, writeGenerated, slugify, type TestKind } from '../src/ai/test-generator';
import { isAiEnabled } from '../src/ai/anthropic-client';

const USAGE = `Usage:
  npm run ai:generate-test -- --requirement "<text>" [--type ui|api] [--slug name]

Example:
  npm run ai:generate-test -- --requirement "User can cancel a booking from account page" --type ui
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      requirement: { type: 'string' },
      type: { type: 'string', default: 'ui' },
      slug: { type: 'string' },
    },
  });

  if (!values.requirement) {
    process.stderr.write(USAGE);
    process.exit(1);
  }

  if (!isAiEnabled()) {
    process.stderr.write(
      'ANTHROPIC_API_KEY is not set. Add it to .env and try again.\n' +
        'Tests themselves work without it — the AI helpers are optional.\n',
    );
    process.exit(2);
  }

  const kind: TestKind = values.type === 'api' ? 'api' : 'ui';
  const slug = values.slug ? slugify(values.slug) : slugify(values.requirement);

  process.stdout.write(`Generating ${kind} draft for: "${values.requirement}"\n`);
  const code = await generateTest(values.requirement, kind);
  const out = writeGenerated(code, slug);

  process.stdout.write(`\nDraft written: ${out}\n`);
  process.stdout.write('Review it, fix selectors if needed, then move into the right folder.\n');
}

main().catch((err) => {
  process.stderr.write(`Generation failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
