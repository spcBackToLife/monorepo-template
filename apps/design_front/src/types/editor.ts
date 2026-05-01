import type { CSSProperties } from '@globallink/design-schema';

/** Style overrides — partial CSS properties for style merges */
export type StyleOverrides = Partial<CSSProperties>;

/** Element props bag — used for component node properties */
export type ElementProps = Record<string, unknown>;

/** User-defined data payload — JSON data in data sources/scenarios */
export type DataPayload = Record<string, unknown>;

/** Opaque canvas JSON blob from material editor */
export type CanvasJSON = Record<string, unknown>;

/** Generic metadata record for flow graph nodes/edges */
export type FlowMetadata = Record<string, unknown>;

/** Material editor object property updates */
export type MaterialPropertyUpdates = Record<string, unknown>;

/** Event payload being constructed for addEvent/updateEvent operations */
export type EventPayload = Record<string, unknown>;
