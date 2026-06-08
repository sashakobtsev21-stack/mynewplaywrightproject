import * as path from 'path';
import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load env-specific file first (overrides win), then plain .env as a fallback.
// TEST_ENV is read from process.env directly so the env file itself doesn't have
// to declare it — keeps each .env.* focused on its own values.
const envName = process.env.TEST_ENV ?? 'public';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envName}`) });
dotenv.config();

const schema = z.object({
  TEST_ENV: z.enum(['public', 'local']).default('public'),
  // Defaults point at the public demo so the suite runs with zero config
  // (CI, fresh clone). Override via .env / .env.<env> for local runs.
  BASE_URL: z.string().url().default('https://automationintesting.online'),
  ADMIN_USERNAME: z.string().min(1).default('admin'),
  ADMIN_PASSWORD: z.string().min(1).default('password'),
  ANTHROPIC_API_KEY: z.string().optional(),
  // Anthropic model id for the text helpers. Override to A/B haiku/opus.
  // Validated here so a typo fails loudly instead of silently mis-billing.
  AI_MODEL: z.string().default('claude-sonnet-4-6'),
  // Which LLM vendor the text helpers use. `openai` covers any OpenAI-compatible
  // endpoint (OpenAI, a local Ollama / LM Studio server, OpenRouter, ...).
  LLM_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  // Which retriever grounds the test generator. `bm25` is lexical (no key);
  // `embeddings` is semantic via an OpenAI-compatible /embeddings endpoint.
  RETRIEVER: z.enum(['bm25', 'embeddings']).default('bm25'),
  EMBEDDINGS_MODEL: z.string().default('text-embedding-3-small'),
  // Export AI traces to an external sink in addition to local JSONL.
  // `otlp` ships an OTLP/HTTP span; `langfuse` posts to the Langfuse ingestion API.
  TRACE_EXPORT: z.enum(['none', 'otlp', 'langfuse']).default('none'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default('restful-booker-ai'),
  LANGFUSE_BASE_URL: z.string().url().default('https://cloud.langfuse.com'),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  CI: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors;
  // Fail loudly — much better than getting cryptic null deref deep inside a test
  console.error('Invalid environment variables:', JSON.stringify(issues, null, 2));
  throw new Error('Invalid environment. Check .env.example and your .env / .env.<env> files.');
}

export const env: Env = parsed.data;
export const isCi = !!env.CI;
