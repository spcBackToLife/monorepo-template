# A.1 子项设计稿 — design-schema v2 类型反转

> **关联**：[执行计划](./state-action-expression-execution-plan.md) §A.1
> **状态**：设计稿（未实施）
> **目的**：让下个会话/AI 助手能直接照此实施 A.1，不需重新推导

---

## 一、文件级改动清单

### 删除（v1）

```
features/design-schema/src/types/event.ts          (151 行)
features/design-schema/src/types/domainState.ts    (52 行)
features/design-schema/src/types/environment.ts    (36 行)
features/design-schema/src/types/dataSource.ts     (66 行)
features/design-schema/src/types/state.ts          (28 行)
features/design-schema/src/types/api.ts            (41 行) — 部分内容融入 dataSource
```

### 重写（保留文件名，全新内容）

```
features/design-schema/src/types/index.ts          (64 → ~80 行)
features/design-schema/src/types/node.ts           (184 → ~150 行，去 binding 字段)
features/design-schema/src/types/screen.ts         (22 → ~40 行)
features/design-schema/src/types/project.ts        (30 → ~30 行)
features/design-schema/src/validators/index.ts     (281 → ~250 行，全部重写 zod)
features/design-schema/src/validators/data.ts      (38 → ~120 行)
features/design-schema/src/validators/props.ts     (80 → ~50 行，去 binding zod)
features/design-schema/src/validators/envelope.ts  (11，几乎不动)
features/design-schema/src/index.ts                (190 → ~200 行)
features/design-schema/src/serialization/*.ts      (按需调整，保 deepClone)
```

### 新建

```
features/design-schema/src/types/expression.ts     (~80 行)
features/design-schema/src/types/state.ts          (重新写，~120 行；不是删的那个 ComponentState)
features/design-schema/src/types/visualState.ts    (~30 行；ComponentState 改名移到这里，与 ScreenState 区分)
features/design-schema/src/types/action.ts         (~250 行；新动词联合)
features/design-schema/src/types/dataSource.ts     (重新写，~150 行；endpoint+mock 共存)
features/design-schema/src/validators/expression.ts(~50 行)
features/design-schema/src/validators/state.ts     (~80 行)
features/design-schema/src/validators/action.ts    (~200 行)
```

### 不动（CSS/viewport/template/props/envelope 等通用类型）

```
features/design-schema/src/types/css.ts            (131 行)
features/design-schema/src/types/viewport.ts       (16 行)
features/design-schema/src/types/template.ts       (40 行)
features/design-schema/src/types/props.ts          (46 行)
features/design-schema/src/types/envelope.ts       (17 行)
features/design-schema/src/registry/*              (全保留)
features/design-schema/src/presets/*               (全保留)
features/design-schema/src/assets/*                (后续 issue 调整 instantiateTemplate)
```

---

## 二、类型定义详细设计

### 2.1 `types/expression.ts` —— 表达式品牌类型

```typescript
/**
 * 表达式字符串。运行时由 design-engine 的 evaluateExpression 解析。
 * 形如 "{{ state.data.messages }}" / "{{ item.role === 'user' ? 'red' : 'blue' }}"。
 *
 * 编辑期被当作字符串编辑；运行期被表达式引擎求值。
 * 用 brand 防止与普通字符串混用造成静态丢失。
 */
export type Expression<T = unknown> = string & {
  readonly __brand: 'Expression';
  readonly __returns?: T;
};

/**
 * 编辑期可选注解，描述表达式的预期返回类型与作用域可见性。
 * 仅用于编辑器自动补全和静态检查；运行时不读取。
 */
export interface ExpressionMeta {
  /** 期望返回类型 */
  returnType?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  /** 可见的作用域字段（编辑器补全用），如 ['state', 'item', '$'] */
  scope?: string[];
}

/** 帮助构造表达式（仅类型层，运行时按字符串处理） */
export function expr<T = unknown>(s: string): Expression<T> {
  return s as Expression<T>;
}

/** 判断是否是表达式语法（包含 `{{ }}`） */
export function isExpression(value: unknown): value is Expression {
  return typeof value === 'string' && /\{\{[^}]+\}\}/.test(value);
}
```

### 2.2 `types/state.ts` —— ScreenState 模型

```typescript
import type { Expression } from './expression';

/** 单个 effect 的运行时状态 */
export interface EffectStatus<TData = unknown> {
  /** 'idle' = 未发起；'pending' = 进行中；'success' / 'error' = 已结束 */
  status: 'idle' | 'pending' | 'success' | 'error';
  /** 上次成功响应数据（保留至下次 fetch 覆盖） */
  data?: TData;
  /** 错误信息 */
  error?: { code?: string | number; message: string };
  /** 时间戳 */
  startedAt?: number;
  finishedAt?: number;
}

/**
 * 屏幕级运行时状态。新模型的核心容器，替代 v1 的
 * domainStates / environmentStates / response 临时上下文。
 *
 * 三个命名空间互不冲突：
 *   - data    = 业务数据（dataSource 加载结果、由 Action 维护）
 *   - view    = UI 临时状态（输入框值、当前 tab、modal 是否开）
 *   - effects = effect.fetch 等副作用的运行时状态
 */
export interface ScreenState {
  data: Record<string, unknown>;
  view: Record<string, unknown>;
  effects: Record<string, EffectStatus>;
}

/** 屏幕的 stateInit：用于初始化 ScreenState（serialize 进 schema） */
export interface ScreenStateInit {
  /** data 的初始值（通常被 dataSource 覆盖；可手动加常量） */
  data?: Record<string, unknown>;
  /** view 的初始值（变量定义） */
  view?: Record<string, ViewVariableDef>;
}

/** 屏幕级 view 变量定义 */
export interface ViewVariableDef {
  /** 变量名（同时是 ScreenState.view 的 key） */
  name: string;
  /** 人类可读标签 */
  label?: string;
  /** 默认值（任意 JSON 类型） */
  defaultValue: unknown;
  /** 可选：枚举值列表（编辑器下拉提示用） */
  enum?: { value: unknown; label: string }[];
  /**
   * 编辑期"预览值" —— 用于设计师切换不同状态查看 UI 效果。
   * 不进运行时；运行时永远从 defaultValue 起。
   */
  previewValue?: unknown;
}

/** 项目级 globalStateInit（顶替 v1 EnvironmentVariable[]） */
export interface GlobalStateInit {
  view?: Record<string, ViewVariableDef>;
}

/** 表达式中可见的运行时 ctx —— 仅类型，便于编辑器自动补全 */
export interface ExpressionContext {
  state: ScreenState;
  /** 列表项中可见 */
  item?: unknown;
  /** 列表项中可见 */
  index?: number;
  /** 嵌套列表的父项 */
  parent?: unknown;
  /** 上一步副作用的结果（onSuccess/onError 链中可用） */
  $last?: EffectStatus;
  /** 内置工具函数命名空间 */
  $: BuiltinFunctions;
}

/** 内置函数白名单（具体实现在 design-engine） */
export interface BuiltinFunctions {
  length(v: unknown): number;
  upper(s: string): string;
  lower(s: string): string;
  format(template: string, ...args: unknown[]): string;
  includes(arr: unknown[] | string, item: unknown): boolean;
  first<T>(arr: T[]): T | undefined;
  last<T>(arr: T[]): T | undefined;
  // ... 详见 BuiltinFunctions 实现
}
```

### 2.3 `types/visualState.ts` —— 节点视觉态

ComponentState 改名 `VisualState`（与 ScreenState 区分语义）。内容几乎不变。

```typescript
import type { CSSProperties } from './css';

/**
 * 节点视觉态：描述节点的 hover/pressed/disabled/custom 等视觉变体。
 * 与 ScreenState 正交：state（屏幕态）改数据；visualState（节点态）改样式。
 */
export interface VisualState {
  name: string;
  styles: Partial<CSSProperties>;
  props?: Record<string, unknown>;
  transition?: {
    duration?: number;
    easing?: string;
    properties?: string[];
  };
  /** 父态进入时，强制把指定子节点临时切到某个 visualState */
  childrenStates?: Record<string, string>;
  /** 父态进入时，强制隐藏/显示指定子节点 */
  childrenVisibility?: Record<string, boolean>;
  /** 此态下需禁用的事件触发器 */
  disabledEvents?: string[];
}
```

### 2.4 `types/action.ts` —— 新动词联合

```typescript
import type { Expression } from './expression';

// ===== State 操作动词 =====

/** state.set — 把 state 路径上的值替换为 valueExpression 求值结果 */
export interface StateSetAction {
  type: 'state.set';
  /** 路径，如 "view.inputDraft" 或 "data.messages[2].text" */
  path: string;
  /** 表达式或字面值 */
  value: Expression | unknown;
}

/** state.append — path 必须指向数组，把 value 追加进去 */
export interface StateAppendAction {
  type: 'state.append';
  path: string;
  value: Expression | unknown;
}

/** state.remove — path 数组中按索引或 predicate 删除 */
export interface StateRemoveAction {
  type: 'state.remove';
  path: string;
  /** 索引（负数表示倒数）或谓词表达式 (item, index) => boolean */
  index?: number;
  predicate?: Expression<boolean>;
}

/** state.merge — path 必须指向对象，与 value 浅合并 */
export interface StateMergeAction {
  type: 'state.merge';
  path: string;
  value: Expression | Record<string, unknown>;
}

/** state.toggle — path 必须指向 boolean，反转 */
export interface StateToggleAction {
  type: 'state.toggle';
  path: string;
}

// ===== Effect 副作用动词 =====

/**
 * effect.fetch — 触发数据源加载（mock 或真实接口由运行时按 env 决定）。
 * onSuccess/onError 在副作用结束后展开成动作链。
 */
export interface EffectFetchAction {
  type: 'effect.fetch';
  /** 引用 Screen.dataSources[].id 中的某个 api 类型源 */
  dataSourceId: string;
  /** 运行时参数（覆盖 endpoint.params 默认值） */
  params?: Record<string, Expression | unknown>;
  /** 成功后串行执行的子动作链 */
  onSuccess?: Action[];
  /** 失败后串行执行的子动作链 */
  onError?: Action[];
}

/** effect.cancel — 取消进行中的 fetch */
export interface EffectCancelAction {
  type: 'effect.cancel';
  /** 不传则取消该屏幕所有 pending fetch */
  dataSourceId?: string;
}

// ===== 导航动词 =====

export interface NavGoAction {
  type: 'nav.go';
  targetScreenId: string;
  animation?: { type: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'none'; duration?: number; easing?: string };
}

export interface NavBackAction {
  type: 'nav.back';
}

// ===== 节点视觉态动词 =====

/** 临时切换某节点的 visualState（含可选自动回退） */
export interface NodeSetVisualStateAction {
  type: 'node.setVisualState';
  /** 目标节点 id（不传则用宿主节点） */
  nodeId?: string;
  /** 要切到的 visualState 名 */
  state: string;
  /** N ms 后自动回退到 default（不写则永久） */
  autoRevertMs?: number;
}

// ===== UI 副作用动词 =====

export interface UiShowToastAction {
  type: 'ui.showToast';
  toastType: 'success' | 'error' | 'warning' | 'info';
  message: Expression<string> | string;
  duration?: number; // ms, default 3000
  position?: 'top-center' | 'bottom-center' | 'top-right';
}

export interface UiOpenUrlAction {
  type: 'ui.openUrl';
  url: Expression<string> | string;
  openInNewTab?: boolean;
}

export interface UiDelayAction {
  type: 'ui.delay';
  duration: number; // ms
}

// ===== 自定义扩展 =====

export interface CustomAction {
  type: 'custom';
  /** 业务方实现：宿主侧注册的 handler 名 */
  handler: string;
  /** 任意附加参数 */
  payload?: Record<string, unknown>;
}

// ===== 动词联合 =====

export type Action =
  | StateSetAction
  | StateAppendAction
  | StateRemoveAction
  | StateMergeAction
  | StateToggleAction
  | EffectFetchAction
  | EffectCancelAction
  | NavGoAction
  | NavBackAction
  | NodeSetVisualStateAction
  | UiShowToastAction
  | UiOpenUrlAction
  | UiDelayAction
  | CustomAction;

export type ActionType = Action['type'];

// ===== Event 触发器 =====

export type EventTrigger =
  | 'click' | 'doubleClick' | 'hover' | 'focus' | 'blur' | 'longPress'
  | 'screenEnter' | 'screenExit' | 'screenVisible' | 'screenHidden'
  | 'scrollReachBottom' | 'scrollReachTop'
  | 'navigateBack'
  | 'change'        // 受控 input 变化时触发（v2 新增）
  | 'submit';       // 表单提交时触发（v2 新增）

/** 事件条件 —— 用表达式替代 v1 的 'domainState' / 'expression' 二元 */
export interface EventCondition {
  /** boolean 表达式，true 才执行 actions */
  when: Expression<boolean>;
}

export interface ComponentEvent {
  trigger: EventTrigger;
  actions: Action[];
  condition?: EventCondition;
  description?: string;
  disabled?: boolean;
  scrollConfig?: { threshold?: number; debounce?: number };
}
```

### 2.5 `types/dataSource.ts` —— v2 DataSource

```typescript
import type { Expression } from './expression';

/** HTTP 请求方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 真实接口配置 */
export interface ApiEndpoint {
  method: HttpMethod;
  /** 路径，可含 {{ state.x }} 表达式参数 */
  path: string;
  headers?: Record<string, string | Expression<string>>;
  query?: Record<string, Expression | unknown>;
  /** 请求体（POST/PUT/PATCH） */
  body?: Expression | Record<string, Expression | unknown>;
  /** 响应数据结构描述（编辑器 hints + codegen 类型用） */
  responseSchema?: Record<string, unknown>;
}

/** Mock 场景 */
export interface MockScenario {
  id: string;
  name: string;
  description?: string;
  /** HTTP 状态码 */
  statusCode: number;
  /** 模拟网络延迟 ms */
  delay: number;
  /** 是否模拟 timeout */
  isTimeout?: boolean;
  /** 响应体 */
  responseBody: unknown;
}

/** Mock 配置（仅 type='api' 数据源用） */
export interface MockConfig {
  scenarios: MockScenario[];
  activeScenarioId: string;
}

/**
 * 数据源 —— v2 模型。
 * 运行时由 EffectExecutor 消费：static 同步注入，api 触发 effect.fetch。
 * mock 与 endpoint 共存：编辑器/Storybook 用 mock，生产 codegen 用 endpoint。
 */
export type DataSource = StaticDataSource | ApiDataSource;

export interface StaticDataSource {
  id: string;
  type: 'static';
  name: string;
  description?: string;
  /** 启动时同步注入到 state.data[name] */
  initial: unknown;
}

export interface ApiDataSource {
  id: string;
  type: 'api';
  name: string;
  description?: string;
  endpoint: ApiEndpoint;
  /** Mock 配置：可选；缺失时编辑器/storybook 也走真实接口 */
  mock?: MockConfig;
  /** 是否在 screenEnter 时自动 fetch（默认 true） */
  autoFetchOnEnter?: boolean;
  /** 自动 fetch 时携带的默认参数 */
  defaultParams?: Record<string, Expression | unknown>;
}
```

### 2.6 `types/node.ts` —— v2 ComponentNode

主要变化：
- 删除 `domainStates` / `domainStateBindings` / `environmentBindings` / `visibilityWhen`
- 新增 `visibleWhen?: Expression<boolean>` —— 表达式驱动可见性
- 新增 `bind?: { path: string }` —— input/textarea/select 受控双向绑定
- 新增 `repeat?: Expression<unknown[]>` —— 列表重复（替代 props.__listData）
- `activeState` / `states` 保留（重命名 ComponentState → VisualState 在 visualState.ts）
- 节点级 events / animation / templateRef / locked / visible / constraints / editorMetadata 全保留

```typescript
import type { CSSProperties } from './css';
import type { VisualState } from './visualState';
import type { ComponentEvent } from './action';
import type { Expression } from './expression';

// ===== Animation Config =====（同 v1，全保留）
export interface CSSKeyframeSchema { /* ... */ }
export interface CSSAnimationConfigSchema { /* ... */ }
export interface ExternalAnimationConfigSchema { /* ... */ }
export interface AnimationConfig { /* ... */ }

// ===== Node Types =====（同 v1）
export type PrimitiveNodeType = /* ... 同 v1 全集 */;
export type ComponentInstanceType = `component:${string}`;
export type NodeType = PrimitiveNodeType | ComponentInstanceType;

// ===== Layout Constraints =====（同 v1）
export interface LayoutConstraints { /* ... */ }

// ===== Template Reference =====（同 v1）
export interface TemplateRef { /* ... */ }

// ===== Editor Metadata =====（同 v1）
export type EditorRole = 'scroll-container' | 'sticky-bottom' | 'sticky-top';
export interface NodeEditorMetadata { role?: EditorRole; }

// ===== Component Node v2 =====
export interface ComponentNode {
  id: string;
  type: NodeType;
  name?: string;

  /**
   * CSS 样式：每个值都可以是 Expression，如 backgroundColor: "{{ item.role === 'user' ? '#667eea' : '#fff' }}"。
   * 注意 v2 的 styles 不再是 Partial<CSSProperties>，而是一个表达式安全的版本。
   */
  styles: ExpressionStyles;

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

  /** 事件 */
  events: ComponentEvent[];

  /** 布局约束 */
  constraints?: LayoutConstraints;

  /** 模板引用 */
  templateRef?: TemplateRef;

  locked: boolean;
  /** 静态可见性（编辑期硬开关）；动态可见性走 visibleWhen */
  visible: boolean;

  // ----- v2 新字段 -----

  /** 表达式驱动的可见性，运行时求值得 boolean。优先级高于 visible */
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

/**
 * 表达式样式：CSSProperties 的每个属性都允许是 Expression 或字面值。
 */
export type ExpressionStyles = {
  [K in keyof CSSProperties]?: CSSProperties[K] | Expression<CSSProperties[K]>;
};
```

### 2.7 `types/screen.ts` —— v2 Screen

```typescript
import type { ComponentNode } from './node';
import type { DataSource } from './dataSource';
import type { ScreenStateInit } from './state';

export interface Screen {
  id: string;
  name: string;
  rootNode: ComponentNode;
  backgroundColor?: string;

  /** v2 数据源（含 endpoint+mock 共存） */
  dataSources: DataSource[];

  /** 屏幕级 state 初始化 */
  stateInit?: ScreenStateInit;
}
```

### 2.8 `types/project.ts` —— v2 DesignProject

```typescript
import type { Screen } from './screen';
import type { Viewport } from './viewport';
import type { ComponentTemplate } from './template';
import type { GlobalStateInit } from './state';

export interface DesignProject {
  id: string;
  name: string;
  platform: 'pc' | 'mobile';
  defaultViewport: Viewport;
  currentViewport: Viewport;
  viewportPresets: Viewport[];
  screens: Screen[];
  componentAssets: ComponentTemplate[];
  /** 项目级全局 state（替换 v1 environmentStates） */
  globalStateInit?: GlobalStateInit;
  createdAt: string;
  updatedAt: string;
}
```

---

## 三、validators 重写要点

每个新类型对应一份 zod schema：

- `expression.ts`：`ExpressionSchema = z.string().regex(/\{\{.*\}\}/)`，加 brand
- `state.ts`：`ScreenStateSchema` / `ScreenStateInitSchema` / `ViewVariableDefSchema` / `EffectStatusSchema`
- `action.ts`：每个 Action 子类型一份 discriminated union
- `dataSource.ts`：StaticDataSourceSchema / ApiDataSourceSchema 用 discriminated union
- `index.ts`：聚合 ComponentNodeSchema / ScreenSchema / DesignProjectSchema 用 v2 类型重写

---

## 四、实施顺序（让 typecheck 在文件级渐进通过）

```
1. 新建 types/expression.ts                           ← 无依赖
2. 新建 types/state.ts                                ← 依赖 expression
3. 新建 types/visualState.ts                          ← 无依赖（独立文件，避免循环）
4. 重写 types/action.ts（覆盖原 event.ts 内容）       ← 依赖 expression
5. 重写 types/dataSource.ts                           ← 依赖 expression
6. 重写 types/node.ts                                 ← 依赖 visualState/action/expression
7. 重写 types/screen.ts                               ← 依赖 node/dataSource/state
8. 重写 types/project.ts                              ← 依赖 screen/state
9. 删除 types/domainState.ts / environment.ts / event.ts （重命名/合并的）
10. 重写 types/index.ts export 面
11. 重写 validators/* zod schemas
12. 重写 src/index.ts export 面
13. 同步检查 src/serialization/* / src/assets/* / src/utils/* 是否仍编译通过
14. pnpm --filter @globallink/design-schema typecheck && build
```

---

## 五、验收清单

- [ ] `features/design-schema/src/types/index.ts` 中 v1 名字（DomainStateVariable / DomainStateBinding / EnvironmentVariable / EnvironmentStateBinding / DomainStateValue / SetDomainStateAction / SetEnvironmentStateAction / ApiRequestAction / DataSourcePhase / DataScenario / ToggleVisibleAction / ShowToastAction / NavigateAction / SetStateAction / OpenUrlAction / DelayAction / CustomAction（注：v2 重新有同名 CustomAction 但形状不同，可保留）/ TransitionAnimation / EventCondition.type / DataField / DataSchema）应不再出现
- [ ] `pnpm --filter @globallink/design-schema typecheck` 通过
- [ ] `pnpm --filter @globallink/design-schema build` 产物 dist/ 无 error
- [ ] `grep -rn "DomainStateBinding\|EnvironmentStateBinding" features/design-schema/src` 零匹配
- [ ] 阶段窗口：下游包编译会全断（design-engine / design-operations / design-mcp / design-api / design_front）—— 这是 A.1 的预期，不算回归

---

## 六、commit message

```
refactor(schema): v2 type system — replace v1 (state/action/expression model)

- 引入 Expression<T> 品牌类型 + ExpressionContext / BuiltinFunctions
- 引入 ScreenState（data/view/effects）+ ScreenStateInit + GlobalStateInit
- 引入 Action 联合：state.set/append/remove/merge/toggle、effect.fetch/cancel、
  nav.go/back、node.setVisualState、ui.showToast/openUrl/delay、custom
- DataSource v2：static + api，api 数据源 endpoint + mock 共存
- ComponentNode v2：删除 domainStateBindings / environmentBindings / visibilityWhen，
  新增 visibleWhen / repeat / bind / ExpressionStyles
- Screen v2：去 domainStates / apiEndpoints，新增 stateInit
- DesignProject v2：去 environmentStates，新增 globalStateInit
- ComponentState 改名 VisualState，独立到 types/visualState.ts
- 全部 zod validators 重写匹配 v2 类型
- ComponentEvent 用新 Action[] 与表达式条件

下游包（design-engine / design-operations / design-mcp / design-api / design_front）
编译会全断，将在 A.2~C.2 子项中逐步迁移。
```
