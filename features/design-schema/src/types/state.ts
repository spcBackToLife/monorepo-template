import type { CSSProperties } from './css';

/** Represents a visual/behavioral state of a component */
export interface ComponentState {
  /** State name — e.g., "default", "hover", "pressed", "disabled", or custom */
  name: string;
  /** CSS properties that override the base styles when this state is active */
  styles: Partial<CSSProperties>;
  /** Props that override the base props when this state is active */
  props?: Record<string, unknown>;
  /** CSS transition definition when entering this state */
  transition?: {
    duration?: number; // ms, default 200
    easing?: string; // default 'ease'
    properties?: string[]; // specific CSS props, default ['all']
  };
  /** Per-child visibility overrides in this state (childId → visible) */
  childrenVisibility?: Record<string, boolean>;
  /** Event names that should be disabled in this state */
  disabledEvents?: string[];
}
