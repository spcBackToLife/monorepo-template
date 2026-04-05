// ===== API Endpoint & Mock System =====
// Defines API request contracts and mock scenarios for preview-time simulation.

/** HTTP request method */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** A complete API request definition */
export interface RequestDefinition {
  id: string;
  name: string;
  description?: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  /** Request body — supports {{}} expression bindings */
  body?: Record<string, unknown> | string;
  /** Response data structure description (for editor hints and codegen) */
  responseSchema?: Record<string, unknown>;
}

/** A single mock scenario for an API endpoint */
export interface MockScenario {
  id: string;
  name: string;
  description?: string;
  statusCode: number;
  /** Simulated network delay in ms */
  delay: number;
  /** Whether this scenario simulates a timeout */
  isTimeout?: boolean;
  /** Mock response body */
  responseBody: unknown;
}

/** An API endpoint combining definition and mock scenarios */
export interface ApiEndpoint {
  definition: RequestDefinition;
  scenarios: MockScenario[];
  activeScenarioId: string;
}
