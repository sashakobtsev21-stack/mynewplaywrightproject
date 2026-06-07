import { env } from '../../config/env';
import type { AiTrace } from '../observability';
import type { TraceExporter } from './types';
import { NoopExporter } from './noop.exporter';
import { OtlpHttpExporter } from './otlp.exporter';
import { LangfuseExporter } from './langfuse.exporter';

let cached: TraceExporter | null = null;

function build(): TraceExporter {
  switch (env.TRACE_EXPORT) {
    case 'otlp':
      return new OtlpHttpExporter();
    case 'langfuse':
      return new LangfuseExporter();
    default:
      return new NoopExporter();
  }
}

/** The configured exporter (chosen by `TRACE_EXPORT`). Built once, then reused. */
export function getExporter(): TraceExporter {
  if (!cached) cached = build();
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
export { LangfuseExporter, toIngestionBatch } from './langfuse.exporter';
export type { TraceExporter } from './types';
