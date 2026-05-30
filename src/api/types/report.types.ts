/**
 * Occupancy report. Each entry is a booked (or otherwise blocked) window. The
 * per-room view collapses guest names to the literal "Unavailable".
 */
export interface ReportEntry {
  /** ISO date YYYY-MM-DD */
  start: string;
  /** ISO date YYYY-MM-DD */
  end: string;
  title: string;
}

export interface ReportResponse {
  report: ReportEntry[];
}
