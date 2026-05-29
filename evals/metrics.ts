import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { RECORD_SCHEMAS } from '../src/ai/schemas';
import type { AiKind } from '../src/ai/data-generator';

/**
 * Metric functions for the AI evals. All pure and synchronous except the
 * compile check, which shells out to tsc. Each returns a flat object of
 * booleans/ratios so the runner can aggregate and print them.
 */

const ratio = (n: number, total: number): number =>
  total === 0 ? 0 : Number((n / total).toFixed(3));

// --- test-generator --------------------------------------------------------

export interface SpecScore {
  importsFixtures: boolean;
  hasDescribe: boolean;
  hasTest: boolean;
  hasExpect: boolean;
  withinLineBudget: boolean;
  noInventedImports: boolean;
}

/** Static checks on a generated spec. `pass` requires every check to hold. */
export function scoreSpec(code: string): SpecScore {
  const importLines = code.match(/^import .*$/gm) ?? [];
  // The only relative import we expect is the fixtures barrel; everything else
  // should come from node_modules. A relative import elsewhere means the model
  // invented a module path.
  const noInventedImports = importLines.every(
    (l) => !/from ['"]\.\.?\//.test(l) || /fixtures\/playwright-fixtures/.test(l),
  );
  return {
    importsFixtures: /from ['"][^'"]*fixtures\/playwright-fixtures['"]/.test(code),
    hasDescribe: /\b(test\.describe|describe)\s*\(/.test(code),
    hasTest: /\btest\s*\(/.test(code),
    hasExpect: /\bexpect\s*\(/.test(code),
    withinLineBudget: code.split('\n').length <= 120,
    noInventedImports,
  };
}

export function specPasses(s: SpecScore): boolean {
  return Object.values(s).every(Boolean);
}

/**
 * Whether a generated spec type-checks in the project. Writes the candidate into
 * tests/_generated (git-ignored), runs tsc once, and checks whether any error
 * references the candidate. Assumes the rest of the project already type-checks.
 */
export function typechecksSpec(code: string): boolean {
  const dir = path.join(process.cwd(), 'tests', '_generated');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, '__eval_candidate__.spec.ts');
  fs.writeFileSync(file, code, 'utf8');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: process.cwd() });
    return true;
  } catch (err) {
    const out = `${(err as { stdout?: Buffer }).stdout ?? ''}${(err as { stderr?: Buffer }).stderr ?? ''}`;
    return !out.includes('__eval_candidate__');
  } finally {
    fs.rmSync(file, { force: true });
  }
}

// --- data-generator --------------------------------------------------------

export interface DataScore {
  count: number;
  strictValidRatio: number;
  looseValidRatio: number;
  diversity: number;
}

export function scoreData(kind: AiKind, records: unknown[]): DataScore {
  const { strict, loose } = RECORD_SCHEMAS[kind];
  const strictValid = records.filter((r) => strict.safeParse(r).success).length;
  const looseValid = records.filter((r) => loose.safeParse(r).success).length;
  const unique = new Set(records.map((r) => JSON.stringify(r))).size;
  return {
    count: records.length,
    strictValidRatio: ratio(strictValid, records.length),
    looseValidRatio: ratio(looseValid, records.length),
    diversity: ratio(unique, records.length),
  };
}

export function dataPasses(s: DataScore): boolean {
  return s.count > 0 && s.strictValidRatio === 1 && s.diversity === 1;
}

// --- failure-analyzer ------------------------------------------------------

export interface AnalysisScore {
  mentionsRootCause: boolean;
  hasNextSteps: boolean;
  hasActionableVerb: boolean;
  withinLength: boolean;
}

/**
 * Heuristic scoring for a failure analysis. These catch the obvious misses
 * (empty/rambling output, no actionable step). True quality still needs a human
 * rubric (1-5) — see evals/README.md.
 */
export function scoreAnalysis(text: string): AnalysisScore {
  const lower = text.toLowerCase();
  return {
    mentionsRootCause: /root cause|likely cause|because|caused by/.test(lower),
    hasNextSteps: /next step|next:|try |check |verify |confirm /.test(lower),
    hasActionableVerb:
      /\b(check|verify|run|update|fix|inspect|confirm|add|replace|wait|assert)\b/.test(lower),
    withinLength: text.trim().length >= 80 && text.trim().length <= 4000,
  };
}

export function analysisPasses(s: AnalysisScore): boolean {
  return Object.values(s).every(Boolean);
}
