// ===== Data Source Model =====
// A DataSource encapsulates both data content and its lifecycle,
// replacing the simpler DataSet concept.

/** Describes a single field in the data structure (for auto-complete and validation) */
export interface DataField {
  /** Dot-notation path, e.g. "user.name", "items[].title" */
  path: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  label?: string;
}

/** Schema describing the shape of data a DataSource provides */
export interface DataSchema {
  fields: DataField[];
}

/** A lifecycle phase of a data source (relevant for API-type sources) */
export interface DataSourcePhase {
  /** Phase identifier, e.g. "loading", "loaded", "empty", "error" */
  name: string;
  /** Human-readable label */
  label: string;
}

/** A named mock data scenario within a data source */
export interface DataScenario {
  id: string;
  name: string;
  description?: string;
  /** The actual mock data — arbitrary JSON structure */
  data: Record<string, unknown>;
  /** Whether this is the default scenario */
  isDefault?: boolean;
}

/**
 * A data source that provides data to the UI.
 * For API-type sources, lifecycle phases are tracked and automatically
 * bridged to domain state variables.
 */
export interface DataSource {
  id: string;
  name: string;
  description?: string;
  /** 'api' sources have lifecycle phases (loading/loaded/empty/error); 'static' sources do not */
  lifecycle: 'api' | 'static';
  /** Lifecycle phases — populated automatically for 'api' type */
  phases: DataSourcePhase[];
  /** Currently active phase for preview */
  activePhase: string;
  /** Mock data scenarios (each scenario is a complete data set) */
  scenarios: DataScenario[];
  /** Currently active scenario ID for preview */
  activeScenarioId: string;
  /** Optional schema for auto-complete and validation */
  schema?: DataSchema;
}

/** Default lifecycle phases for API-type data sources */
export const API_DATA_SOURCE_PHASES: DataSourcePhase[] = [
  { name: 'loading', label: '加载中' },
  { name: 'loaded', label: '已加载' },
  { name: 'empty', label: '无数据' },
  { name: 'error', label: '加载失败' },
];
