import type { CSSProperties } from './css';

// ===== Domain State System =====
// Domain states represent business/module-level state variables
// (e.g., taskStatus, formStep, loginPhase) that affect multiple child elements.

/** A single possible value of a domain state variable */
export interface DomainStateValue {
  value: string;
  label: string;
}

/**
 * A domain state variable defined on a container node or screen.
 * Controls the appearance/behavior of descendant elements via DomainStateBindings.
 */
export interface DomainStateVariable {
  id: string;
  name: string;
  label: string;
  values: DomainStateValue[];
  defaultValue: string;
  /** Current preview value selected in the editor */
  currentPreviewValue?: string;
  /** Whether this variable was manually created or auto-generated from a data source lifecycle */
  source?: 'manual' | 'dataSource';
  /** If source === 'dataSource', links to the originating DataSource */
  dataSourceId?: string;
}

/**
 * A binding that defines how a node responds to a specific domain state variable value.
 * Attached to descendant nodes within the domain state variable's scope.
 */
export interface DomainStateBinding {
  /** The domain state variable name this binding responds to */
  variableName: string;
  /** Optional: the node that owns/defines the domain state variable (for scope resolution) */
  ownerNodeId?: string;
  /** The specific value that activates this binding */
  value: string;
  /** CSS style overrides applied when this binding is active */
  styles?: Partial<CSSProperties>;
  /** Prop overrides applied when this binding is active */
  props?: Record<string, unknown>;
  /** Visibility override — false hides the node */
  visible?: boolean;
  /** Per-child visibility overrides (childId → visible) */
  childrenVisibility?: Record<string, boolean>;
  /** Event names to disable when this binding is active */
  disabledEvents?: string[];
}
