import { z } from 'zod';

/**
 * Helpers for turning a model's text reply into validated structured data.
 *
 * LLMs ignore "no code fences" instructions often enough, and occasionally get
 * cut off at max_tokens mid-array. These helpers tolerate both, then hand the
 * result to a zod schema so nothing unvalidated leaks into a test.
 */

export function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

/**
 * Recover a truncated JSON array (model hit max_tokens mid-element) by trimming
 * to the last fully-closed top-level object and re-closing the array. Returns
 * the original slice unchanged if the array already closes cleanly.
 */
export function recoverJsonArray(text: string): string {
  const start = text.indexOf('[');
  if (start === -1) throw new Error('no JSON array start found');

  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastTopLevelClose = -1;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === '[' || c === '{') {
      depth++;
    } else if (c === ']' || c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1); // array closed cleanly
      if (depth === 1 && c === '}') lastTopLevelClose = i; // a top-level object closed
    }
  }

  if (lastTopLevelClose === -1) throw new Error('no complete element to recover');
  return text.slice(start, lastTopLevelClose + 1) + ']';
}

export interface ParsedRecords<T> {
  records: T[];
  /** True when the strict schema rejected the batch but the loose one accepted it. */
  usedLoose: boolean;
}

/**
 * Parse a JSON array from model text and validate every element. Tries the
 * strict schema first, falls back to the loose schema, and only throws when
 * both reject the data (caller then falls back to faker).
 */
export function parseRecords<S, L>(
  text: string,
  strict: z.ZodType<S>,
  loose: z.ZodType<L>,
): ParsedRecords<S | L> {
  const cleaned = stripFences(text);

  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    raw = JSON.parse(recoverJsonArray(cleaned));
  }

  if (!Array.isArray(raw)) {
    throw new Error(`expected a JSON array, got ${raw === null ? 'null' : typeof raw}`);
  }

  const strictResult = z.array(strict).safeParse(raw);
  if (strictResult.success) return { records: strictResult.data, usedLoose: false };

  const looseResult = z.array(loose).safeParse(raw);
  if (looseResult.success) return { records: looseResult.data, usedLoose: true };

  const first = strictResult.error.issues[0];
  throw new Error(
    `output failed strict and loose validation${first ? `: ${first.path.join('.')} ${first.message}` : ''}`,
  );
}
