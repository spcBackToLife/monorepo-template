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
}

// ===== Global State System =====

/** A screen-level global state variable (e.g., "theme": ["light","dark"], "userRole": ["admin","user"]) */
export interface GlobalStateVariable {
  /** Variable name (unique within a screen) */
  name: string;
  /** All possible values for this variable */
  values: string[];
  /** Default / initial value */
  defaultValue: string;
  /** Human-readable description */
  description?: string;
}

/** A binding from a global state variable value to node style/prop/visible overrides */
export interface GlobalStateBinding {
  /** Unique binding identifier */
  id: string;
  /** Name of the GlobalStateVariable this binding targets */
  variableName: string;
  /** The specific value that activates this binding */
  value: string;
  /** CSS style overrides applied when this binding is active */
  styles?: Partial<CSSProperties>;
  /** Prop overrides applied when this binding is active */
  props?: Record<string, unknown>;
  /** Visibility override — false hides the node when this binding is active */
  visible?: boolean;
}
