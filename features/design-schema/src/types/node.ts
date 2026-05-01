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

// ===== Editor Metadata =====

/**
 * 节点的"编辑期辅助"角色——**仅服务编辑画布的视觉锚定**，不参与渲染契约：
 *
 * - 渲染管道（SchemaRenderer / PreviewRenderer / 导出代码）一律不读
 * - 设计师如想让某个角色在最终产品里也成立，应在 styles 里直接表达（CSS-first）
 *
 * 详见 `design_docs/02-product/editor/01-canvas/frame-viewport-canvas-redesign.md` §10。
 */
export type EditorRole = 'scroll-container' | 'sticky-bottom' | 'sticky-top';

/**
 * 节点级"编辑期 metadata"命名空间：**渲染契约不读取**。
 *
 * 任何只服务设计师编辑体验、不应影响最终产品/导出代码的字段，应放在这里。
 * 这样保证 schema 主体永远 = 真实设计产物。
 */
export interface NodeEditorMetadata {
  role?: EditorRole;
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

  // ----- Editor-only metadata（不参与渲染） -----

  /**
   * 编辑器视图层 metadata 命名空间。**渲染契约不读取**——
   * 任何只服务编辑画布的辅助字段（如视觉锚定 role）放在这里，
   * 保证 schema 主体永远 = 真实设计产物。
   *
   * 详见 `design_docs/02-product/editor/01-canvas/frame-viewport-canvas-redesign.md` §10。
   */
  editorMetadata?: NodeEditorMetadata;
}
