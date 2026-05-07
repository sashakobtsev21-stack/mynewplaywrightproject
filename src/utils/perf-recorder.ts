import * as fs from 'fs';
import * as path from 'path';

/**
 * Append performance samples as JSONL.
 * Later (whenever I get round to it) we can build a tiny trend dashboard from
 * these files — or pipe them into Grafana. For now: just record.
 */

const OUT_DIR = path.join(process.cwd(), 'performance-results');

export interface MetricSample {
  test: string;
  project: string;
  url?: string;
  metrics: Record<string, number>;
}

export function recordSample(sample: MetricSample): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(OUT_DIR, `${day}.jsonl`);
  const entry = { ts: new Date().toISOString(), ...sample };
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8');
}
