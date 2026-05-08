import type { CSSProperties } from './css';
import type { VisualState } from './visualState';
import type { ComponentEvent } from './action';
import type { Expression } from './expression';

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
 */
export type EditorRole = 'scroll-container' | 'sticky-bottom' | 'sticky-top';

/**
 * 节点级"编辑期 metadata"命名空间：**渲染契约不读取**。
 *
 * 任何只服务设计师编辑体验、不应影响最终产品/导出代码的字段，应放在这里。
 */
export interface NodeEditorMetadata {
  role?: EditorRole;
}

// ===== Expression-aware Styles =====

/**
 * 表达式样式：CSSProperties 的每个属性都允许是 Expression 或字面值。
 * 文本样式里可以写 `{{ item.role === 'user' ? '#667eea' : '#fff' }}`。
 */
export type ExpressionStyles = {
  [K in keyof CSSProperties]?: CSSProperties[K] | Expression<CSSProperties[K]>;
};

// ===== Component Node v2 =====

/** Core building block of the design tree（v2 — state/action/expression 模型） */
export interface ComponentNode {
  /** Unique node identifier */
  id: string;
  /** Element type — primitive HTML tag or component reference */
  type: NodeType;
  /** Human-readable name given by the designer */
  name?: string;

  /**
   * CSS 样式：每个值都可以是 Expression，如
   *   backgroundColor: "{{ item.role === 'user' ? '#667eea' : '#fff' }}"。
   */
  styles: ExpressionStyles;

  /** Child nodes */
  children?: ComponentNode[];

  /**
   * Element-specific props，每个值都可以是 Expression。
   * 文本节点的 textContent 也走这条路：textContent: "{{ item.text }}"
   */
  props: Record<string, Expression | unknown>;

  /** 节点视觉态（hover/pressed/disabled/custom） */
  states: VisualState[];
  /** 当前激活的 visualState 名 */
  activeState: string;

  /** 事件（v2 新动词 Action[]） */
  events: ComponentEvent[];

  /** 布局约束 */
  constraints?: LayoutConstraints;

  /** 模板引用 */
  templateRef?: TemplateRef;

  /** 编辑期锁定 */
  locked: boolean;
  /** 静态可见性（编辑期硬开关）；动态可见性走 visibleWhen */
  visible: boolean;

  // ----- v2 新字段 -----

  /**
   * 表达式驱动的可见性，运行时求值得 boolean。
   * 优先级高于 visible（visible=false 则始终不渲染；visible=true 时才看 visibleWhen）。
   */
  visibleWhen?: Expression<boolean>;

  /**
   * 列表重复渲染：求值得数组，children/props 内可用 {{ item.x }} / {{ index }}。
   * 替代 v1 的 props.__listData。
   */
  repeat?: Expression<unknown[]>;

  /**
   * 受控双向绑定（仅 input/textarea/select 等表单元素）。
   * value 来自 state[bind.path]，change 事件 dispatch state.set(bind.path, e.target.value)。
   */
  bind?: {
    /** 路径，如 "view.inputDraft" */
    path: string;
  };

  // ----- 素材/动画 -----
  animation?: AnimationConfig;
  materialProjectId?: string;

  // ----- 编辑器 metadata（不参与渲染） -----
  editorMetadata?: NodeEditorMetadata;
}
