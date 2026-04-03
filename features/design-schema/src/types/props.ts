// ===== Component Props System =====

/** Supported prop types for component prop definitions */
export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'color'
  | 'image'
  | 'url'
  | 'action'
  | 'textarea'
  | 'options';

/** A standardized prop definition exposed by a component template */
export interface ComponentPropDefinition {
  /** Prop key (unique within a template) */
  key: string;
  /** Data type of the prop — determines the editor control rendered */
  type: PropType;
  /** Display label in the props panel */
  label: string;
  /** Default value */
  defaultValue: unknown;
  /** Grouping label for the props panel */
  group?: string;
  /** Human-readable description */
  description?: string;
  /** Allowed values when type is 'enum' or 'options' */
  enumValues?: string[];
  /** Whether this prop is required */
  required?: boolean;
}

/** Maps a template-level prop key to an internal node's field */
export interface PropBinding {
  /** The prop key from ComponentPropDefinition */
  propKey: string;
  /** Dot-separated path to the target node within the template tree (e.g., "children.0.children.1") */
  targetNodePath: string;
  /** Which field on the target node to bind to */
  targetField: 'props' | 'styles' | 'children';
  /** The specific key within the target field (e.g., "src", "backgroundColor", "0") */
  targetKey: string;
}
