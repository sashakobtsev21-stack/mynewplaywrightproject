import * as fs from 'fs';
import * as path from 'path';
import type Anthropic from '@anthropic-ai/sdk';
import { aiLogger, callClaude, extractText, isAiEnabled } from './anthropic-client';
import { loadPrompt, type LoadedPrompt } from './prompt-loader';
import { detectInjection, sanitizeUntrusted } from './redaction';

const OUT_DIR = 'ai-analysis';

export interface FailureContext {
  testDir: string;
  errorContextMd?: string;
  screenshotPath?: string;
  specSource?: string;
  specPath?: string;
}

/**
 * Collect what's useful from a Playwright test-results/<test>/ folder.
 *
 * NOTE: trace.zip would need yauzl/adm-zip to parse properly. For now we work
 * off error-context.md and the failure screenshot, which Playwright extracts
 * automatically. Good enough for a first cut.
 */
export function collectFailureContext(testDir: string): FailureContext {
  const errorContextMd = readIfExists(path.join(testDir, 'error-context.md'));
  const screenshotPath = pickScreenshot(testDir);

  return { testDir, errorContextMd, screenshotPath };
}

export function attachSpecSource(ctx: FailureContext, specPath: string): FailureContext {
  return { ...ctx, specPath, specSource: readIfExists(specPath, 6000) };
}

function pickScreenshot(dir: string): string | undefined {
  if (!fs.existsSync(dir)) return undefined;
  const candidates = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    // test-failed-N.png is the canonical Playwright failure screenshot
    .sort((a, b) => (a.includes('failed') ? -1 : b.includes('failed') ? 1 : 0));
  return candidates.length > 0 ? path.join(dir, candidates[0]) : undefined;
}

function readIfExists(p: string, limit = 8000): string | undefined {
  if (!fs.existsSync(p)) return undefined;
  return fs.readFileSync(p, 'utf8').slice(0, limit);
}

export async function analyze(ctx: FailureContext): Promise<string> {
  if (!isAiEnabled()) {
    return formatLocalAnalysis(ctx);
  }

  // The failure artifacts are untrusted (a page under test, or its DOM snapshot,
  // can carry text that reads like an instruction — including text inside the
  // screenshot). Flag it for the trace/log; the prompt fences it as data.
  const scan = detectInjection(`${ctx.errorContextMd ?? ''}\n${ctx.specSource ?? ''}`);
  if (scan.suspected) {
    aiLogger.warn(
      { dir: ctx.testDir, patterns: scan.patterns },
      'possible prompt-injection in failure artifacts — fenced as data',
    );
  }

  const prompt = loadPrompt('failure-analyzer');
  const userContent: Anthropic.ContentBlockParam[] = [
    { type: 'text', text: buildPrompt(prompt, ctx) },
  ];

  if (ctx.screenshotPath && fs.existsSync(ctx.screenshotPath)) {
    const data = fs.readFileSync(ctx.screenshotPath).toString('base64');
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data },
    });
  }

  aiLogger.info({ dir: ctx.testDir, hasScreenshot: !!ctx.screenshotPath }, 'analyzing failure');

  const resp = await callClaude(
    { max_tokens: 1024, messages: [{ role: 'user', content: userContent }] },
    {
      meta: {
        module: 'failure-analyzer',
        promptName: prompt.meta.name,
        promptVersion: prompt.meta.version,
        injectionSuspected: scan.suspected,
      },
    },
  );
  return extractText(resp.content);
}

function buildPrompt(prompt: LoadedPrompt, ctx: FailureContext): string {
  // Sanitize strips any stray </untrusted_data> so the artifact can't close the
  // fence early and break out of the data block in the v2 prompt.
  return prompt.render({
    testDir: ctx.testDir,
    errorContext: sanitizeUntrusted(ctx.errorContextMd ?? '<error-context.md not found>'),
    specSource: sanitizeUntrusted(ctx.specSource ?? '<spec source not provided>'),
  });
}

function formatLocalAnalysis(ctx: FailureContext): string {
  return [
    '# AI disabled — local heuristics only',
    '',
    `**Folder:** ${ctx.testDir}`,
    `**Screenshot:** ${ctx.screenshotPath ?? '<not found>'}`,
    '',
    '## error-context.md',
    '',
    '```',
    ctx.errorContextMd ?? '<not found>',
    '```',
    '',
    '_Set `ANTHROPIC_API_KEY` and re-run for an actual analysis._',
  ].join('\n');
}

export function saveAnalysis(content: string, slug: string): string {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${Date.now()}-${slug}.md`);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}
