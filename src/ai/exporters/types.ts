import type { AiTrace } from '../observability';

/**
 * A sink for AI traces beyond the local JSONL. Implementations are fire-and-forget
 * and MUST NOT throw — a telemetry failure can never be allowed to break a real
 * call. `writeTrace()` calls the configured exporter after it writes the line.
 */
export interface TraceExporter {
  /** Stable identifier (none / otlp). */
  readonly name: string;
  /** Ship one trace. Fire-and-forget; never throws. */
  export(trace: AiTrace): void;
}
