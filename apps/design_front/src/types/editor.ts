import type { CSSProperties } from '@globallink/design-schema';
import type { GradientDef } from '@globallink/material-operations';

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

/** Material editor object property updates from the canvas/property panel */
export interface MaterialPropertyUpdates {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  opacity?: number;
  angle?: number;
  fill?: string | GradientDef | null;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
  mixBlendMode?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: string;
  text?: string;
  /** profiledStroke fields */
  profiledGapDegrees?: number;
  profiledGapFeatherDegrees?: number;
  profiledSampleSegments?: number;
  profiledWidthStops?: { t: number; width: number }[];
  profiledColorStops?: { t: number; color: string }[];
  profiledLineCap?: 'round' | 'butt';
  [key: string]: unknown;
}

/** Event payload being constructed for addEvent/updateEvent operations */
export type EventPayload = Record<string, unknown>;
