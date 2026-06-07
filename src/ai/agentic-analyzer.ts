import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import {
  aiLogger,
  callClaude,
  extractText,
  isAiEnabled,
  type CallOptions,
  type CallParams,
} from './anthropic-client';
import { loadPrompt } from './prompt-loader';
import { detectInjection, sanitizeUntrusted } from './redaction';

/**
 * Agentic (tool-use) failure analyzer. Where `failure-analyzer.ts` is a single
 * shot — we collect the artifacts and hand them to the model — this version gives
 * the model a small toolbox and lets it investigate the repo itself in a loop:
 * list a folder, read the error context, open the spec, grep for a selector,
 * look at the screenshot, then conclude.
 *
 * Every file read is sandboxed to the project root (no path traversal), and the
 * loop still goes through callClaude(), so each step is retried and traced like
 * any other call. Tool inputs are zod-validated; file contents are treated as
 * untrusted data (the system prompt fences them, and reads are injection-scanned).
 */

export const PROJECT_ROOT = process.cwd();

/** Resolve a model-supplied path and refuse anything that escapes the root. */
export function resolveWithinRoot(p: string, root: string = PROJECT_ROOT): string {
  const abs = path.resolve(root, p);
  const rel = path.relative(root, abs);
  if (rel === '') return abs; // the root itself
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`path escapes the project root: ${p}`);
  }
  return abs;
}

// Directories never worth walking into for a debug investigation.
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'allure-results',
  'allure-report',
  'playwright-report',
  'blob-report',
  'dist',
  'build',
  '.husky',
]);

const GREP_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.md', '.json', '.txt', '.yml', '.yaml']);

const readFileInput = z.object({
  path: z.string().min(1),
  max_bytes: z.number().int().positive().max(200_000).optional(),
});
const listDirInput = z.object({ path: z.string().min(1) });
const grepInput = z.object({ query: z.string().min(1), dir: z.string().optional() });
const viewScreenshotInput = z.object({ path: z.string().min(1) });

/** Tool schemas advertised to the model. Inputs are re-validated with zod on use. */
export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_dir',
    description:
      'List the files and subdirectories of a directory (path relative to the project root).',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path, relative to the project root.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a UTF-8 text file (relative to the project root). Truncated if large.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path, relative to the project root.' },
        max_bytes: {
          type: 'number',
          description: 'Optional cap on bytes to read (default 12000).',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'grep',
    description: 'Find a literal substring across project text files. Returns file:line matches.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Literal text to search for.' },
        dir: {
          type: 'string',
          description: 'Optional directory to scope the search (default: project root).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'view_screenshot',
    description: 'Return a PNG image (e.g. the failure screenshot) to look at.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'PNG path, relative to the project root.' },
      },
      required: ['path'],
    },
  },
];

const DEFAULT_READ_CAP = 12_000;
const GREP_FILE_LIMIT = 800;
const GREP_MATCH_LIMIT = 40;

function ok(
  id: string,
  content: Anthropic.ToolResultBlockParam['content'],
): Anthropic.ToolResultBlockParam {
  return { type: 'tool_result', tool_use_id: id, content };
}
function fail(id: string, message: string): Anthropic.ToolResultBlockParam {
  return { type: 'tool_result', tool_use_id: id, content: message, is_error: true };
}

function toolReadFile(id: string, input: unknown): Anthropic.ToolResultBlockParam {
  const { path: p, max_bytes } = readFileInput.parse(input);
  const abs = resolveWithinRoot(p);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return fail(id, `not a file: ${p}`);
  const cap = max_bytes ?? DEFAULT_READ_CAP;
  const buf = fs.readFileSync(abs);
  const text = buf.subarray(0, cap).toString('utf8');
  const scan = detectInjection(text);
  if (scan.suspected) {
    aiLogger.warn({ path: p, patterns: scan.patterns }, 'agentic read: untrusted content flagged');
  }
  const note = buf.length > cap ? `\n…[truncated ${buf.length - cap} more bytes]` : '';
  return ok(id, text + note);
}

function toolListDir(id: string, input: unknown): Anthropic.ToolResultBlockParam {
  const { path: p } = listDirInput.parse(input);
  const abs = resolveWithinRoot(p);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory())
    return fail(id, `not a directory: ${p}`);
  const entries = fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => !IGNORED_DIRS.has(e.name))
    .slice(0, 200)
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
  return ok(id, entries.length ? entries.join('\n') : '(empty)');
}

function* walkFiles(dir: string, budget: { left: number }): Generator<string> {
  if (budget.left <= 0) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (budget.left <= 0) return;
    if (IGNORED_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkFiles(full, budget);
    } else if (GREP_EXTENSIONS.has(path.extname(e.name))) {
      budget.left--;
      yield full;
    }
  }
}

function toolGrep(id: string, input: unknown): Anthropic.ToolResultBlockParam {
  const { query, dir } = grepInput.parse(input);
  const base = resolveWithinRoot(dir ?? '.');
  if (!fs.existsSync(base)) return fail(id, `not found: ${dir ?? '.'}`);
  const hits: string[] = [];
  const budget = { left: GREP_FILE_LIMIT };
  for (const file of walkFiles(base, budget)) {
    if (hits.length >= GREP_MATCH_LIMIT) break;
    let lines: string[];
    try {
      lines = fs.readFileSync(file, 'utf8').split('\n');
    } catch {
      continue;
    }
    const rel = path.relative(PROJECT_ROOT, file);
    for (let i = 0; i < lines.length && hits.length < GREP_MATCH_LIMIT; i++) {
      if (lines[i].includes(query)) hits.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
    }
  }
  return ok(id, hits.length ? hits.join('\n') : `no matches for "${query}"`);
}

function toolViewScreenshot(id: string, input: unknown): Anthropic.ToolResultBlockParam {
  const { path: p } = viewScreenshotInput.parse(input);
  const abs = resolveWithinRoot(p);
  if (!abs.toLowerCase().endsWith('.png')) return fail(id, `not a png: ${p}`);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return fail(id, `not a file: ${p}`);
  const data = fs.readFileSync(abs).toString('base64');
  return ok(id, [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data } }]);
}

/** Run one tool call in the sandbox. Never throws — errors come back as is_error results. */
export function executeTool(tool: Anthropic.ToolUseBlock): Anthropic.ToolResultBlockParam {
  try {
    switch (tool.name) {
      case 'read_file':
        return toolReadFile(tool.id, tool.input);
      case 'list_dir':
        return toolListDir(tool.id, tool.input);
      case 'grep':
        return toolGrep(tool.id, tool.input);
      case 'view_screenshot':
        return toolViewScreenshot(tool.id, tool.input);
      default:
        return fail(tool.id, `unknown tool: ${tool.name}`);
    }
  } catch (err) {
    return fail(tool.id, err instanceof Error ? err.message : String(err));
  }
}

export type Send = (params: CallParams, opts?: CallOptions) => Promise<Anthropic.Message>;

export interface AgentResult {
  text: string;
  /** Number of model turns taken. */
  steps: number;
  /** Number of tool calls executed across the run. */
  toolCalls: number;
}

export interface AgentLoopOptions {
  system: string;
  userPrompt: string;
  send?: Send;
  maxSteps?: number;
  meta?: CallOptions['meta'];
}

const DEFAULT_MAX_STEPS = 8;

/**
 * Drive the tool-use loop: call the model with the tools, run any tool_use blocks
 * it returns, feed the results back, and repeat until it answers with text (or we
 * hit the step cap, after which we ask once more without tools to force an answer).
 * `send` is injectable so the loop can be unit-tested with a scripted fake client.
 */
export async function runAgentLoop(opts: AgentLoopOptions): Promise<AgentResult> {
  const send = opts.send ?? callClaude;
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  const meta = opts.meta ?? { module: 'failure-analyzer-agent' };
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: opts.userPrompt }];
  let toolCalls = 0;

  for (let step = 1; step <= maxSteps; step++) {
    const resp = await send(
      { max_tokens: 1024, system: opts.system, tools: TOOLS, messages },
      { meta },
    );
    messages.push({ role: 'assistant', content: resp.content });

    const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) {
      return { text: extractText(resp.content), steps: step, toolCalls };
    }

    const results = toolUses.map((tu) => {
      toolCalls++;
      return executeTool(tu);
    });
    messages.push({ role: 'user', content: results });
  }

  // Step cap reached — one final call with no tools so the model must conclude.
  messages.push({ role: 'user', content: 'Stop investigating and give your final answer now.' });
  const final = await send({ max_tokens: 1024, system: opts.system, messages }, { meta });
  return { text: extractText(final.content), steps: maxSteps, toolCalls };
}

/**
 * Public entry point: analyze a failed test's results folder agentically. Unlike
 * the single-shot `analyze()`, this needs a key (there's no offline fallback —
 * the whole point is the tool-use loop).
 */
export async function analyzeFailureAgentic(testDir: string): Promise<string> {
  if (!isAiEnabled()) {
    throw new Error('ANTHROPIC_API_KEY is not set — the agentic analyzer needs a key.');
  }
  const prompt = loadPrompt('failure-analyzer-agent');
  const system = prompt.render({});
  const userPrompt = `Investigate the failed Playwright test. Its results folder is: ${sanitizeUntrusted(
    testDir,
  )}\nBegin by listing that folder.`;

  aiLogger.info({ testDir }, 'agentic failure analysis: start');
  const result = await runAgentLoop({
    system,
    userPrompt,
    meta: {
      module: 'failure-analyzer-agent',
      promptName: prompt.meta.name,
      promptVersion: prompt.meta.version,
    },
  });
  aiLogger.info(
    { steps: result.steps, toolCalls: result.toolCalls },
    'agentic failure analysis: done',
  );
  return result.text;
}
