/**
 * Canvas object types for the material editor canvas.
 *
 * These types describe the shape of objects stored in material canvas schemas.
 * They use an index signature to remain forward-compatible with new properties
 * added by the backend or frontend, while providing IDE autocompletion for
 * known fields.
 */

/** Base properties shared by all canvas objects */
export interface CanvasObjectProps {
  id?: string;
  type?: string;
  name?: string;
  x?: number;
  y?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  w?: number;
  h?: number;
  fill?: string | GradientDefLike | null;
  stroke?: string | null;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  angle?: number;
  rx?: number;
  ry?: number;
  cornerRadius?: number;
  sides?: number;
  points?: number | Array<{ x: number; y: number }>;
  innerRadius?: number;
  outerRadius?: number;
  innerRatio?: number;
  pathData?: string;
  path?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: string;
  src?: string;
  visible?: boolean;
  locked?: boolean;
  blendMode?: string;
  scaleX?: number;
  scaleY?: number;
  originX?: string;
  originY?: string;
  children?: CanvasObjectProps[];
  // profiledStroke fields
  profiledKind?: string;
  profiledGapDegrees?: number;
  profiledGapFeatherDegrees?: number;
  profiledSampleSegments?: number;
  profiledWidthStops?: Array<{ t: number; width: number }>;
  profiledColorStops?: Array<{ t: number; color: string }>;
  profiledLineCap?: string;
  // line-specific
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // fabric internal (polygon sizing)
  _width?: number;
  _height?: number;
  /** Allow additional dynamic properties */
  [key: string]: unknown;
}

/** Structured gradient definition (mirrors GradientDef from material-operations) */
export interface GradientDefLike {
  type: 'linear' | 'radial' | 'conic';
  angle?: number;
  stops: Array<{ color: string; offset: number }>;
  cx?: number;
  cy?: number;
  r?: number;
}

/** Canvas schema returned by getMaterialSchema */
export interface CanvasSchema {
  objects?: CanvasObjectProps[];
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  referenceFrame?: {
    enabled?: boolean;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
  };
  defaultElementId?: string;
  [key: string]: unknown;
}

/** Generic API JSON response (typed better than bare `unknown`) */
export interface ApiJsonResponse {
  [key: string]: unknown;
}

/** Data payload for data-source scenarios (key-value JSON object) */
export type DataPayload = Record<string, unknown>;

/** Material project update body */
export interface MaterialProjectUpdateBody {
  targetNodeId?: string;
  name?: string;
  tags?: string[];
  [key: string]: unknown;
}
