import { z } from 'zod';
import { callClaude, extractText, isAiEnabled } from '../src/ai/anthropic-client';
import { loadPrompt } from '../src/ai/prompt-loader';
import { stripFences } from '../src/ai/structured';
import { sanitizeUntrusted } from '../src/ai/redaction';

/**
 * LLM-as-judge for the failure analyzer. It automates the manual 1-5 rubric in
 * evals/README.md — but it is itself an LLM, so it's a cheap proxy for quality,
 * not ground truth. It runs on a haiku tier (the grading is mechanical relative
 * to the analysis), and the gate treats its score as an aggregate signal, never
 * as a per-sample verdict. "Sounds right" still isn't "is right" — including for
 * the judge, which is why it also reports a hallucination_risk.
 */

export const JUDGE_MODEL = 'claude-haiku-4-5';

export const judgeVerdictSchema = z.object({
  score: z.number().int().min(1).max(5),
  correct_root_cause: z.boolean(),
  actionable: z.boolean(),
  hallucination_risk: z.enum(['low', 'medium', 'high']),
  rationale: z.string().min(1).max(800),
});

export type JudgeVerdict = z.infer<typeof judgeVerdictSchema>;

/** Parse + validate the judge's JSON reply. Pure — unit-tested without a network. */
export function parseJudge(text: string): JudgeVerdict {
  const raw: unknown = JSON.parse(stripFences(text));
  return judgeVerdictSchema.parse(raw);
}

export interface JudgeInput {
  errorContext: string;
  specSource: string;
  analysis: string;
}

/** Grade one analysis with the LLM judge. Needs a key (live mode only). */
export async function judgeAnalysis(input: JudgeInput): Promise<JudgeVerdict> {
  if (!isAiEnabled()) {
    throw new Error('eval-judge needs ANTHROPIC_API_KEY (live mode only).');
  }
  const prompt = loadPrompt('eval-judge');
  const rendered = prompt.render({
    errorContext: sanitizeUntrusted(input.errorContext),
    specSource: sanitizeUntrusted(input.specSource),
    analysis: sanitizeUntrusted(input.analysis),
  });
  const resp = await callClaude(
    { model: JUDGE_MODEL, max_tokens: 512, messages: [{ role: 'user', content: rendered }] },
    {
      meta: {
        module: 'eval-judge',
        promptName: prompt.meta.name,
        promptVersion: prompt.meta.version,
      },
    },
  );
  return parseJudge(extractText(resp.content));
}
