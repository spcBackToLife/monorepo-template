import type { CSSProperties } from './css';
import type { ComponentState } from './state';
import type { ComponentEvent } from './event';

// ===== Node Types =====

/** Primitive HTML element types that map directly to DOM tags */
export type PrimitiveNodeType =
  | 'div'
  | 'span'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'button'
  | 'input'
  | 'textarea'
  | 'select'
  | 'img'
  | 'a'
  | 'ul'
  | 'ol'
  | 'li'
  | 'nav'
  | 'header'
  | 'footer'
  | 'section'
  | 'main';

/** Component instance type — references a template from the asset library */
export type ComponentInstanceType = `component:${string}`;

/** Union of all possible node types */
export type NodeType = PrimitiveNodeType | ComponentInstanceType;

// ===== Layout Constraints =====

export interface LayoutConstraints {
  /** Horizontal constraint */
  horizontal?: 'left' | 'right' | 'center' | 'stretch' | 'scale';
  /** Vertical constraint */
  vertical?: 'top' | 'bottom' | 'center' | 'stretch' | 'scale';
  /** Fixed position */
  fixed?: boolean;
}

// ===== Template Reference =====

export interface TemplateRef {
  /** ID of the referenced ComponentTemplate */
  templateId: string;
  /** reference = syncs with template updates, detached = independent */
  mode: 'reference' | 'detached';
}

// ===== Component Node =====

/** Core building block of the design tree */
export interface ComponentNode {
  /** Unique node identifier */
  id: string;
  /** Element type — primitive HTML tag or component reference */
  type: NodeType;
  /** Human-readable name given by the designer */
  name?: string;
  /** CSS styles applied to this node */
  styles: CSSProperties;
  /** Child nodes */
  children?: ComponentNode[];
  /** Element-specific props (e.g., src for img, placeholder for input) */
  props: Record<string, unknown>;
  /** Component states (hover, pressed, disabled, custom) */
  states: ComponentState[];
  /** Currently active state name */
  activeState: string;
  /** Bound interaction events */
  events: ComponentEvent[];
  /** Layout constraints for responsive behavior */
  constraints?: LayoutConstraints;
  /** Template reference if this node is a component instance */
  templateRef?: TemplateRef;
}
