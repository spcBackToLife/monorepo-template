import type { CSSProperties } from './css';

// ===== Environment State System =====
// Environment states are project-level variables that represent global contexts
// like theme, locale, platform variant, or brand — affecting all screens uniformly.

/**
 * A project-level environment variable (e.g., theme: light/dark, locale: en/zh).
 * Defined on DesignProject and applies across all screens.
 */
export interface EnvironmentVariable {
  id: string;
  name: string;
  label: string;
  values: { value: string; label: string }[];
  defaultValue: string;
  /** Current preview value selected in the editor */
  currentPreviewValue?: string;
}

/**
 * A binding that defines how a node responds to a specific environment variable value.
 * Can be attached to any node in any screen.
 */
export interface EnvironmentStateBinding {
  /** The environment variable name this binding responds to */
  variableName: string;
  /** The specific value that activates this binding */
  value: string;
  /** CSS style overrides applied when this binding is active */
  styles?: Partial<CSSProperties>;
  /** Prop overrides applied when this binding is active */
  props?: Record<string, unknown>;
  /** Visibility override — false hides the node */
  visible?: boolean;
}
