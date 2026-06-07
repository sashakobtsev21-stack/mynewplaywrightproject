import type { TraceExporter } from './types';

/** Default exporter: local JSONL only, nothing shipped out. */
export class NoopExporter implements TraceExporter {
  readonly name = 'none';
  export(): void {
    // intentionally does nothing
  }
}
