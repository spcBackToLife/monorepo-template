// ===== Data Set =====

/** A named data set containing mock/sample data for a screen */
export interface DataSet {
  /** Unique data set identifier */
  id: string;
  /** Human-readable name (e.g., "Empty State", "Full Data", "Error Case") */
  name: string;
  /** The actual data — arbitrary JSON structure */
  data: Record<string, unknown>;
  /** Description of what this data set represents */
  description?: string;
}
