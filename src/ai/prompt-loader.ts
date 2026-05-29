import * as fs from 'fs';
import * as path from 'path';

/**
 * Prompts live as versioned markdown files in ./prompts (`<name>.v<N>.md`) with
 * a small frontmatter block. Keeping them out of the .ts source means they can
 * be diffed, reviewed, and versioned without touching code, and the loader can
 * enforce the input/output contract declared in the frontmatter.
 */
const PROMPTS_DIR = path.join(__dirname, 'prompts');

export interface PromptMeta {
  name: string;
  version: number;
  description: string;
  /** Variables the template expects. Render fails if any is missing. */
  inputs: string[];
  /** Human-readable description of the expected output. */
  output: string;
}

export interface LoadedPrompt {
  meta: PromptMeta;
  /** Absolute path the prompt was read from — handy for traces. */
  source: string;
  /** Substitute {{var}} placeholders. Throws on missing/unknown variables. */
  render(vars: Record<string, string>): string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const PLACEHOLDER_RE = /\{\{\s*(\w+)\s*\}\}/g;

const cache = new Map<string, LoadedPrompt>();

function versionOf(file: string): number {
  const m = /\.v(\d+)\.md$/.exec(file);
  return m ? Number(m[1]) : 0;
}

function pickLatest(name: string): string {
  const files = fs
    .readdirSync(PROMPTS_DIR)
    .filter((f) => f.startsWith(`${name}.v`) && f.endsWith('.md'));
  if (files.length === 0) {
    throw new Error(`No prompt files found for "${name}" in ${PROMPTS_DIR}`);
  }
  files.sort((a, b) => versionOf(b) - versionOf(a));
  return files[0];
}

function parseFrontmatter(
  raw: string,
  source: string,
): { fields: Record<string, string>; body: string } {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) {
    throw new Error(`Prompt ${source} is missing a "---" frontmatter block`);
  }
  const fields: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    fields[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return { fields, body: m[2] };
}

export function loadPrompt(name: string, version?: number): LoadedPrompt {
  const cacheKey = `${name}@${version ?? 'latest'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const file = version != null ? `${name}.v${version}.md` : pickLatest(name);
  const source = path.join(PROMPTS_DIR, file);
  const raw = fs.readFileSync(source, 'utf8');
  const { fields, body } = parseFrontmatter(raw, source);

  const meta: PromptMeta = {
    name: fields.name ?? name,
    version: Number(fields.version ?? versionOf(file)),
    description: fields.description ?? '',
    inputs: (fields.inputs ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    output: fields.output ?? '',
  };

  const loaded: LoadedPrompt = {
    meta,
    source,
    render(vars: Record<string, string>): string {
      for (const key of meta.inputs) {
        if (!(key in vars)) {
          throw new Error(`Prompt "${meta.name}" is missing required input "${key}"`);
        }
      }
      // Single pass: substituted values are not re-scanned, so user-provided
      // content containing {{...}} can't smuggle in another placeholder.
      const rendered = body.replace(PLACEHOLDER_RE, (_full, key: string) => {
        if (!(key in vars)) {
          throw new Error(
            `Prompt "${meta.name}" references undeclared variable "${key}" (add it to the frontmatter inputs)`,
          );
        }
        return vars[key];
      });
      return rendered.trim() + '\n';
    },
  };

  cache.set(cacheKey, loaded);
  return loaded;
}
