import * as fs from 'fs';
import * as path from 'path';
import { redactSecrets } from './redaction';

/**
 * Lightweight tracing for AI calls. Every call through callClaude() appends one
 * JSON line to logs/ai-traces.jsonl with timing, token, and cost data. The file
 * is git-ignored; `npm run ai:budget` reads it back to total spend.
 *
 * Tracing never throws — a logging problem must not fail a real call.
 */

const TRACES_DIR = path.join(process.cwd(), 'logs');
export const TRACES_FILE = path.join(TRACES_DIR, 'ai-traces.jsonl');

export interface AiTrace {
  trace_id: string;
  ts: string;
  module: string;
  prompt_name?: string;
  prompt_version?: number;
  model: string;
  /** Which provider served the call (anthropic / openai). */
  provider?: string;
  input_hash?: string;
  latency_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  success: boolean;
  error?: string;
  /** Set when an untrusted input tripped the prompt-injection heuristic. */
  injection_suspected?: boolean;
}

interface Price {
  /** USD per million input tokens. */
  inPerM: number;
  /** USD per million output tokens. */
  outPerM: number;
}

// Published per-million-token prices. Last verified: 2026-06. Update when the
// model list moves. Dated model ids (e.g. -20251001 suffixes) match by prefix.
// Order matters: priceFor() matches by prefix and takes the first hit, so a more
// specific id (gpt-4o-mini) must precede the general one (gpt-4o). Local models
// served via an OpenAI-compatible endpoint (Ollama) are billed at $0 by the
// provider, so they don't need an entry here.
const PRICING: Record<string, Price> = {
  'claude-opus-4': { inPerM: 15, outPerM: 75 },
  'claude-sonnet-4': { inPerM: 3, outPerM: 15 },
  'claude-haiku-4': { inPerM: 1, outPerM: 5 },
  'gpt-4o-mini': { inPerM: 0.15, outPerM: 0.6 },
  'gpt-4o': { inPerM: 2.5, outPerM: 10 },
  'gpt-4.1-mini': { inPerM: 0.4, outPerM: 1.6 },
  'gpt-4.1-nano': { inPerM: 0.1, outPerM: 0.4 },
  'gpt-4.1': { inPerM: 2, outPerM: 8 },
};
const DEFAULT_PRICE: Price = PRICING['claude-sonnet-4'];

export function priceFor(model: string): Price {
  const key = Object.keys(PRICING).find((k) => model.startsWith(k));
  return key ? PRICING[key] : DEFAULT_PRICE;
}

export function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceFor(model);
  const usd = (inputTokens * p.inPerM + outputTokens * p.outPerM) / 1_000_000;
  return Number(usd.toFixed(6));
}

export function writeTrace(trace: AiTrace): void {
  try {
    fs.mkdirSync(TRACES_DIR, { recursive: true });
    // The error message is the one free-text field that can carry a leaked
    // secret or PII (a stack trace, a logged token); redact before it lands.
    const safe: AiTrace = trace.error ? { ...trace, error: redactSecrets(trace.error) } : trace;
    fs.appendFileSync(TRACES_FILE, JSON.stringify(safe) + '\n', 'utf8');
  } catch {
    // Intentionally swallowed: tracing is best-effort.
  }
}
