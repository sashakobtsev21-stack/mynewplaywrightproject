import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { childLogger } from '../utils/logger';

export const aiLogger = childLogger('ai');

/**
 * Default model. Override with AI_MODEL env if you want to A/B with haiku/opus.
 * Sonnet is the sweet spot for our payloads — accurate enough, ~5-10x cheaper than Opus.
 */
export const MODEL = process.env.AI_MODEL ?? 'claude-sonnet-4-5';

let _client: Anthropic | null = null;

export function isAiEnabled(): boolean {
  return !!env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 0;
}

export function getClient(): Anthropic {
  if (!isAiEnabled()) {
    throw new Error('ANTHROPIC_API_KEY is not set. AI features are disabled.');
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/** Extract plain text from a Messages API response. */
export function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
}
