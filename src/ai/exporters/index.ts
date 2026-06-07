import { env } from '../../config/env';
import type { AiTrace } from '../observability';
import type { TraceExporter } from './types';
import { NoopExporter } from './noop.exporter';
import { OtlpHttpExporter } from './otlp.exporter';

let cached: TraceExporter | null = null;

/** The configured exporter (chosen by `TRACE_EXPORT`). Built once, then reused. */
export function getExporter(): TraceExporter {
  if (!cached) {
    cached = env.TRACE_EXPORT === 'otlp' ? new OtlpHttpExporter() : new NoopExporter();
  }
  return cached;
}

/** Ship a trace through the configured exporter. Best-effort; never throws. */
export function exportTrace(trace: AiTrace): void {
  try {
    getExporter().export(trace);
  } catch {
    // belt and braces — exporters are already non-throwing.
  }
}

export { NoopExporter } from './noop.exporter';
export { OtlpHttpExporter, toResourceSpans } from './otlp.exporter';
export type { TraceExporter } from './types';
