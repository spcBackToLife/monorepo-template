import type { CSSProperties } from './css';
import type { VisualState } from './visualState';
import type { ComponentEvent } from './action';
import type { Expression } from './expression';
import type { NodeMeta } from './meta';

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
  | 'svg'
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

// ===== List Repeat Binding (v2.1 三层模型) =====

/**
 * 列表绑定 —— "数据源 + 每项模板"。
 *
 * 语义：
 *   1. 容器节点（承载 `repeat` 字段的节点）自身正常渲染，不再被"幽灵化"；
 *      容器的 `styles` / `children`（静态装饰 + 空态占位）维持原语义。
 *   2. 运行期对 `expression` 求值得数组，**对每个 item** 把 `template` 作为一棵新的子树渲染，
 *      template 根节点起就能读 `{{ item }}` / `{{ index }}` / `{{ parent }}`。
 *   3. 静态 children 和重复出来的 template 在容器里的顺序：先 children，再 N 份 template。
 *
 * 设计要点：
 *   - template 是完整子树；AI / 设计师自由决定"每行外框"（row flex / column / grid cell 都行）
 *   - 任何 item 级变体（alignSelf、backgroundColor 二元色等）都放在 template 子树内部表达
 */
export interface RepeatBinding {
  /** 求值得数组；支持 `{{ state.data.messages }}` / `{{ state.effects[...].data }}` 等 */
  expression: Expression<unknown[]>;
  /** 每 item 的根节点模板；其 styles/props/events 可读 `item` / `index` / `parent` */
  template: ComponentNode;
}

// ===== Component Node v2 =====

/** Core building block of the design tree（v2 — state/action/expression 模型） */
/**
 * 设计画布的运行时节点 / 渲染最小单位。
 *
 * ## 字段互斥与优先级矩阵（v1.0 起渲染契约固化）
 *
 * 1. **`props.textContent` / `props.text` ⊥ `children`**
 *    - 渲染层 PrimitiveRenderer.readInlineTextFromProps 解析顺序：
 *      `textContent → text → props.children → children 树`
 *    - 字符串值 `''`（空字符串）视为「显式无叶子文本」，让渲染层 fall through 到 `children`
 *    - 数字 `0` 仍渲染为 `'0'`（非空叶子文本）
 *    - 同时设置 `props.textContent`（非空字符串）+ `children`（非空数组）→ children 不会渲染
 *    - lint：ops 层 `lintComponentNodeFieldRelations` 在 add/change_type 时给 warning
 *
 * 2. **`bind` × `events[trigger='change']`**
 *    - input/textarea/select 节点 bind 已自动同步 store；再写 change event 等于双写
 *    - lint：warning，建议把 change 行为合并到 events[blur] 或 events[click] 等其它 trigger
 *
 * 3. **`visibleWhen` (运行时) × `meta.editorMetadata.hiddenInEditor` (编辑期)**
 *    - 互不干涉，前者运行时求值，后者仅编辑期视觉
 *
 * 4. **`visible` × `visibleWhen`**
 *    - `visible=false` 始终不渲染（硬开关）
 *    - `visible=true` 时才求值 `visibleWhen`（动态可见性）
 *
 * 渲染契约实现位置：design-engine PrimitiveRenderer.readInlineTextFromProps
 */
export interface ComponentNode {
  /** Unique node identifier */
  id: string;
  /** Element type — primitive HTML tag or component reference */
  type: NodeType;
  /** Code-friendly identifier (PascalCase, e.g. "CodeInputGroup") — used for codegen */
  name?: string;
  /** Display label for the UI panel (e.g. "验证码输入组") — shown in node tree; priority: label > name > type */
  label?: string;

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
   * 列表重复渲染（v2.1 三层模型）：
   *
   *   - `expression` 求值得数组
   *   - `template`   是每 item 的根节点模板；**template 根节点本身**就在 item 作用域里求值
   *     （解决老版本"容器样式不能读 item"的坑，支持 assistant/user 用 alignSelf 切左右对齐等）
   *
   * 容器节点自己的样式按正常节点处理；`children` 作为**静态装饰**（EmptyState / LoadingSkeleton 等），
   * 与 template 并存：静态 children 先渲染，然后重复渲染 N 份 template。
   */
  repeat?: RepeatBinding;

  /**
   * 受控双向绑定（仅 input/textarea/select 等表单元素）。
   * value 来自 state[bind.path]，change 事件 dispatch state.set(bind.path, e.target.value)。
   *
   * ⚠️ `bind.path` 使用 **ScreenState 根相对路径**,与 Expression 内部 scope 不同:
   *   - bind.path:           `"view.form.phone"`         → ScreenState.view.form.phone
   *   - Expression 等价访问: `"{{ state.view.form.phone }}"`
   *
   * 不要带 `state.` 前缀;那是 Expression Language 内部 scope 的写法。
   * 详见 `types/action.ts` StateSetAction.path JSDoc 的对照表。
   */
  bind?: {
    /**
     * ScreenState 根相对路径(如 "view.inputDraft" / "view.form.phone")。
     * 不要带 `state.` 前缀。
     */
    path: string;
  };

  // ----- 素材/动画 -----
  animation?: AnimationConfig;
  materialProjectId?: string;

  // ----- 编辑器 metadata（不参与渲染） -----
  editorMetadata?: NodeEditorMetadata;

  /**
   * 设计意图 / 溯源 / 完成度（B 类，渲染契约不读）。
   * 取代旧 design-registry 节点 JSON 的 product/interaction/design/implementation 层。
   * 详见 SCHEMA-FIRST-REFACTOR.md §4。
   */
  meta?: NodeMeta;

  // ----- Codegen 辅助 -----

  /**
   * 组件边界标记。标记后 codegen 引擎会将此节点及其子树作为独立组件输出。
   * 设计时由 AI 分析决策，也可由设计师手动标记。
   */
  componentBoundary?: boolean;
}
