/** Target platform category */
export type Platform = 'pc' | 'mobile' | 'tablet';

/** Viewport definition for device preview */
export interface Viewport {
  /** Human-readable device name, e.g., "iPhone 15 Pro" */
  name: string;
  /** Viewport width in logical pixels */
  width: number;
  /** Viewport height in logical pixels */
  height: number;
  /** Device pixel ratio (default: 1) */
  devicePixelRatio?: number;
  /** Target platform */
  platform: Platform;
}
