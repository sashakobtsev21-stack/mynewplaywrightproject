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
  BASE_URL: z.string().url(),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
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
