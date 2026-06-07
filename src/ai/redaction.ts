/**
 * Defensive guards for the AI layer's untrusted-input and persisted-output
 * surfaces. The three helpers take untrusted-ish input (a free-text requirement,
 * a failed test's error-context + screenshot, app data), send it to a model, and
 * then persist artifacts. This module makes that boundary explicit:
 *
 *  - redactSecrets()     masks secrets/PII before text is written to a trace/log
 *  - detectInjection()   flags common prompt-injection patterns (for logging)
 *  - sanitizeUntrusted() neutralizes delimiter-breakout before fencing
 *
 * None of these throw — they are best-effort guards, not validators. Redaction is
 * applied to what we PERSIST (traces), not to the prompt sent to the model: the
 * model still sees the real content; only the on-disk copy is masked. The prompt
 * defense is the <untrusted_data> fence the v2 prompts declare as data-only.
 */

/** Delimiter the v2 prompts wrap untrusted content in. Single source of truth. */
export const UNTRUSTED_TAG = 'untrusted_data';

interface RedactionRule {
  kind: string;
  re: RegExp;
  replacement: string;
}

// Ordered most-specific first; an earlier rule masks its match before later
// rules run, so e.g. an Anthropic key is gone before the generic sk- rule looks.
const REDACTION_RULES: readonly RedactionRule[] = [
  {
    kind: 'anthropic-key',
    re: /sk-ant-[A-Za-z0-9_-]{8,}/g,
    replacement: '[REDACTED:anthropic-key]',
  },
  { kind: 'api-key', re: /\bsk-[A-Za-z0-9]{20,}\b/g, replacement: '[REDACTED:api-key]' },
  { kind: 'aws-key', re: /\bAKIA[0-9A-Z]{16}\b/g, replacement: '[REDACTED:aws-key]' },
  {
    kind: 'jwt',
    re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: '[REDACTED:jwt]',
  },
  {
    kind: 'bearer',
    re: /\b(Bearer)\s+[A-Za-z0-9._~+/=-]{10,}/gi,
    replacement: '$1 [REDACTED:token]',
  },
  {
    kind: 'url-credentials',
    re: /([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:)[^\s/@]+@/gi,
    replacement: '$1[REDACTED:password]@',
  },
  {
    kind: 'kv-secret',
    re: /\b(password|passwd|pwd|secret|token|api[_-]?key|authorization)(["']?\s*[:=]\s*["']?)[^\s"'`,;]+/gi,
    replacement: '$1$2[REDACTED:secret]',
  },
  {
    kind: 'email',
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[REDACTED:email]',
  },
];

/**
 * Mask secrets and PII in free text. Conservative by design: it prefers a false
 * positive (over-masking a log line) to leaking a real key. Returns the input
 * unchanged when there's nothing to mask.
 */
export function redactSecrets(text: string): string {
  if (!text) return text;
  let out = text;
  for (const rule of REDACTION_RULES) {
    out = out.replace(rule.re, rule.replacement);
  }
  return out;
}

interface InjectionPattern {
  label: string;
  re: RegExp;
}

// Heuristics, not a classifier. Used to flag-and-log, never to hard-block — the
// real defense is the prompt fence. False negatives are expected; the fence holds.
const INJECTION_PATTERNS: readonly InjectionPattern[] = [
  {
    label: 'ignore-previous',
    re: /\bignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|rules?|context)/i,
  },
  {
    label: 'disregard',
    re: /\bdisregard\s+(?:all\s+|the\s+)?(?:previous|above|prior|system|earlier)\b/i,
  },
  {
    label: 'override-rules',
    re: /\boverride\s+(?:your|the|all)\s+(?:instructions?|rules?|system|guard\w*)/i,
  },
  { label: 'fake-turn', re: /(?:^|\n)\s*(?:system|assistant|developer)\s*:/i },
  { label: 'role-reassign', re: /\byou\s+are\s+now\b/i },
  { label: 'new-instructions', re: /\bnew\s+instructions?\b/i },
  {
    label: 'reveal-prompt',
    re: /\b(?:reveal|print|show|repeat|output)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions)\b/i,
  },
  { label: 'jailbreak', re: /\b(?:jailbreak|DAN\s+mode|developer\s+mode)\b/i },
];

export interface InjectionScan {
  suspected: boolean;
  /** Labels of the patterns that matched — handy in a log line or a trace. */
  patterns: string[];
}

/** Scan untrusted text for common prompt-injection markers. Never throws. */
export function detectInjection(text: string): InjectionScan {
  if (!text) return { suspected: false, patterns: [] };
  const patterns = INJECTION_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
  return { suspected: patterns.length > 0, patterns };
}

/**
 * Strip any occurrence of the untrusted-data delimiter from text, so a payload
 * can't close the fence early and break out into the instruction context. Run
 * this on untrusted input before it's substituted into the v2 prompts'
 * <untrusted_data> block.
 */
export function sanitizeUntrusted(text: string, tag: string = UNTRUSTED_TAG): string {
  if (!text) return text;
  const re = new RegExp(`</?\\s*${tag}[^>]*>`, 'gi');
  return text.replace(re, '');
}
