import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { aiLogger, extractText, getClient, isAiEnabled, MODEL } from './anthropic-client';
import { loadPrompt } from './prompt-loader';
import { bookingFactory, guestFactory } from '../fixtures/data-factory';
import type { CreateBookingPayload, GuestContact } from '../api/types/booking.types';

export type AiKind = 'booking' | 'guest';

export interface AiGenerateOpts {
  context?: string;
  count?: number;
}

type ResultMap = {
  booking: CreateBookingPayload;
  guest: GuestContact;
};

const CACHE_DIR = path.join(process.cwd(), 'cache', 'ai-data');

// TypeScript-like description of the shape we want back. Sonnet handles this
// better than a full JSON Schema and uses fewer tokens.
const SHAPES: Record<AiKind, string> = {
  booking: `{
  roomid: number,
  firstname: string,
  lastname: string,
  email: string,
  phone: string,
  depositpaid: boolean,
  bookingdates: { checkin: string /* YYYY-MM-DD */, checkout: string /* YYYY-MM-DD */ }
}`,
  guest: `{
  firstname: string,
  lastname: string,
  email: string,
  phone: string
}`,
};

function fallbackFactory<K extends AiKind>(kind: K, count: number): ResultMap[K][] {
  const out: unknown[] =
    kind === 'booking'
      ? Array.from({ length: count }, () => bookingFactory())
      : Array.from({ length: count }, () => guestFactory());
  return out as ResultMap[K][];
}

function cacheKey(kind: AiKind, opts: AiGenerateOpts): string {
  const h = crypto.createHash('sha1');
  h.update(`${kind}|${opts.context ?? ''}|${opts.count ?? 1}`);
  return h.digest('hex').slice(0, 16);
}

function readCache(key: string): unknown | null {
  const f = path.join(CACHE_DIR, `${key}.json`);
  if (!fs.existsSync(f)) return null;
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(data, null, 2), 'utf8');
}

function parseJsonArray(text: string): unknown[] {
  // Tolerate stray code fences if the model ignores instructions
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array, got: ${cleaned.slice(0, 120)}`);
  }
  return parsed;
}

export class AiDataGenerator {
  async generate<K extends AiKind>(kind: K, opts: AiGenerateOpts = {}): Promise<ResultMap[K][]> {
    const count = opts.count ?? 1;

    if (!isAiEnabled()) {
      aiLogger.debug({ kind, count }, 'AI disabled, using faker fallback');
      return fallbackFactory(kind, count);
    }

    const key = cacheKey(kind, opts);
    const cached = readCache(key);
    if (cached) {
      aiLogger.debug({ key }, 'ai-data cache hit');
      return cached as ResultMap[K][];
    }

    const prompt = loadPrompt('data-generator').render({
      count: String(count),
      kind,
      shape: SHAPES[kind],
      context: opts.context ? `\n\nContext: ${opts.context}` : '',
    });

    try {
      const client = getClient();
      aiLogger.info({ kind, count }, 'calling claude for data generation');
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const parsed = parseJsonArray(extractText(resp.content));
      writeCache(key, parsed);
      return parsed as ResultMap[K][];
    } catch (err) {
      // Any failure -> faker. Tests still need to run.
      aiLogger.warn(
        { err: err instanceof Error ? err.message : err },
        'AI generation failed, falling back to faker',
      );
      return fallbackFactory(kind, count);
    }
  }
}

export const aiDataGenerator = new AiDataGenerator();
