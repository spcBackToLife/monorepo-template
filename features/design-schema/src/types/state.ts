import type { CSSProperties } from './css';

/** Represents a visual/behavioral state of a component */
export interface ComponentState {
  /** State name — e.g., "default", "hover", "pressed", "disabled", or custom */
  name: string;
  /** CSS properties that override the base styles when this state is active */
  styles: Partial<CSSProperties>;
  /** Props that override the base props when this state is active */
  props?: Record<string, unknown>;
}
