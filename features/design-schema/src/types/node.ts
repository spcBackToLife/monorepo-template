import type { CSSProperties } from './css';
import type { ComponentState } from './state';
import type { ComponentEvent } from './event';
import type { DomainStateVariable, DomainStateBinding } from './domainState';
import type { EnvironmentStateBinding } from './environment';

// ===== Animation Config =====

/** CSS keyframe definition */
export interface CSSKeyframeSchema {
  /** Offset from 0 to 1 (0% – 100%) */
  offset: number;
  /** CSS property key→value pairs */
  styles: Record<string, string>;
}

/** CSS animation configuration */
export interface CSSAnimationConfigSchema {
  name: string;
  duration: string;
  timingFunction: string;
  delay?: string;
  iterationCount?: string | number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  keyframes: CSSKeyframeSchema[];
}

/** External animation resource configuration (Lottie/PAG/Rive/GIF) */
export interface ExternalAnimationConfigSchema {
  type: 'lottie' | 'pag' | 'rive' | 'gif';
  /** asset:// URL or remote URL */
  src: string;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
}

/** Structured animation config stored on a ComponentNode */
export interface AnimationConfig {
  css?: CSSAnimationConfigSchema;
  external?: ExternalAnimationConfigSchema;
}

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
  | 'main'
  | 'annotation';

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
  /** Whether the node is locked (prevents editing via canvas interactions) */
  locked: boolean;
  /** Whether the node is visible in the canvas */
  visible: boolean;
  /**
   * Optional: node is shown only when the named state variable equals `equals`
   * (evaluated against runtime domain/environment maps in preview).
   */
  visibilityWhen?: {
    variableName: string;
    equals: string;
  };

  // ----- Five-layer state system -----

  /** Domain state variables defined on this container node (scoped to descendants) */
  domainStates?: DomainStateVariable[];
  /** Bindings that define how this node responds to domain state variable values */
  domainStateBindings?: DomainStateBinding[];
  /** Bindings that define how this node responds to environment variable values */
  environmentBindings?: EnvironmentStateBinding[];

  // ----- Material / Animation -----

  /** Structured animation config (CSS keyframes + external animation resources) */
  animation?: AnimationConfig;
  /** Associated material project ID (links to a material-editor project) */
  materialProjectId?: string;
}
