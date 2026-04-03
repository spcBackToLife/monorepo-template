# 03-engine-rendering — 渲染管线设计 (Rendering Pipeline Design)

> **模块归属 / Module**: `features/design-engine`
> **状态 / Status**: Draft
> **最后更新 / Last Updated**: 2026-03-28

---

## 1. 第一性原理 / First Principles

本模块解决的核心问题：

> **How to convert Schema → visible DOM, considering states, data bindings, and list rendering?**

渲染管线是数据模型（Schema）与视觉输出（DOM）之间的核心桥梁。所有节点的最终呈现——包括样式、属性、可见性、列表展开——都必须经过这条管线统一处理。

The rendering pipeline is the core bridge between the data model and visual output. Every node's final presentation — styles, props, visibility, list expansion — must be processed through this single pipeline.

**设计约束 / Constraints**:

- 管线必须是**纯函数式**的：相同输入（Schema + State + DataContext）→ 相同输出
- 每一层 resolution 互相独立，可单独测试
- 性能敏感：画布上可能有数百个节点同时渲染

---

## 2. 来自产品需求 / Product Requirements

本设计衔接以下产品需求文档：

| 产品需求 | 对渲染管线的影响 |
|---|---|
| **04-state-system** | 4 层样式叠加算法（base → global → business → interaction） |
| **05-data-driven** | 表达式解析 `{{data.xxx}}`、列表渲染（ListRenderer） |
| **06-component-props** | Props 4 层叠加、数据绑定 props resolution |

---

## 3. resolveNodeStyles() — 4 层叠加算法 / 4-Layer Style Resolution

### 签名 / Signature

```typescript
function resolveNodeStyles(
  node: ComponentNode,
  globalStates: Record<string, string>,
  interactionState: InteractionState | null
): CSSProperties;
```

### 算法 / Algorithm

4 层**自底向上**叠加，每层用 `Object.assign()` 语义合并到上一层结果之上：

```
Layer 1 (base)        → node.styles
Layer 2 (global)      → matching globalStateBindings[].styles
Layer 3 (business)    → node.states[node.activeState].styles  (if activeState !== 'default')
Layer 4 (interaction) → hover / active / focus styles (CSS pseudo or runtime)
```

**Step-by-step**:

1. **Base layer** — 以 `node.styles` 作为基础样式
2. **Global state layer** — 遍历 `node.globalStateBindings[]`，找到与当前 `globalStates` 匹配的条目，依次 merge 其 `styles`
3. **Business state layer** — 若 `node.activeState !== 'default'`，从 `node.states[node.activeState].styles` 中取出样式并 merge
4. **Interaction layer** — 根据运行时 `interactionState`（hover / active / focus）或 CSS pseudo-class 应用交互样式

```typescript
// 伪代码 / Pseudocode
function resolveNodeStyles(
  node: ComponentNode,
  globalStates: Record<string, string>,
  interactionState: InteractionState | null
): CSSProperties {
  // Layer 1: base
  let resolved: CSSProperties = { ...node.styles };

  // Layer 2: global state bindings
  for (const binding of node.globalStateBindings ?? []) {
    if (globalStates[binding.stateKey] === binding.stateValue) {
      Object.assign(resolved, binding.styles);
    }
  }

  // Layer 3: business state
  if (node.activeState && node.activeState !== 'default') {
    const stateConfig = node.states?.[node.activeState];
    if (stateConfig?.styles) {
      Object.assign(resolved, stateConfig.styles);
    }
  }

  // Layer 4: interaction
  if (interactionState) {
    const interactionStyles = node.interactionStyles?.[interactionState];
    if (interactionStyles) {
      Object.assign(resolved, interactionStyles);
    }
  }

  return resolved;
}
```

**关键点 / Key Points**:

- 后面的层级总是 **覆盖** 前面的层级（后者优先）
- `globalStateBindings` 可能有多条匹配，按数组顺序依次 merge
- 交互层优先级最高，确保 hover 等效果始终可见

---

## 4. resolveNodeProps() — 同样 4 层叠加 / 4-Layer Props Resolution

### 签名 / Signature

```typescript
function resolveNodeProps(
  node: ComponentNode,
  globalStates: Record<string, string>,
  interactionState: InteractionState | null,
  dataContext: DataContext
): Record<string, unknown>;
```

### 算法 / Algorithm

与 `resolveNodeStyles()` 完全对称的 4 层叠加，但作用于 **props** 而非 styles：

```
Layer 1 (base)        → node.props
Layer 2 (global)      → matching globalStateBindings[].props
Layer 3 (business)    → node.states[node.activeState].props  (if activeState !== 'default')
Layer 4 (interaction) → interaction-driven prop overrides
```

### Visible 字段处理 / Visible Field Resolution

`visible` 是一个特殊的 prop，同样参与 4 层叠加：

```typescript
// visible 也遵循 4 层叠加
// 任何一层可以将 visible 设为 false 来隐藏节点
const resolvedProps = resolveNodeProps(node, globalStates, interactionState, dataContext);
const isVisible = resolvedProps.visible !== false;
```

- Base layer 默认 `visible: true`
- Global state binding 可以覆盖为 `visible: false`（例如：当全局状态为 "loggedOut" 时隐藏用户面板）
- Business state 和 interaction state 同样可以覆盖

### 数据绑定 / Data Binding in Props

Props 中的字符串值可能包含表达式（`{{data.xxx}}`），在叠加完成后统一做一次 expression resolution：

```typescript
function resolveNodeProps(node, globalStates, interactionState, dataContext) {
  // 1. 4-layer merge (same as styles)
  let resolved = { ...node.props };
  // ... Layer 2, 3, 4 merge ...

  // 2. Resolve expressions in string values
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string' && value.includes('{{')) {
      resolved[key] = resolveExpression(value, dataContext);
    }
  }

  return resolved;
}
```

---

## 5. resolveExpression() — 数据绑定表达式解析 / Expression Resolution

### 签名 / Signature

```typescript
function resolveExpression(
  expression: string,
  dataContext: DataContext
): unknown;
```

### 支持的语法 / Supported Syntax

| 语法 | 示例 | 说明 |
|---|---|---|
| 基本路径 | `{{data.user.name}}` | 从 dataContext.data 中取值 |
| 默认值 | `{{data.user.name \| "Anonymous"}}` | 值为 undefined/null 时使用默认值 |
| 嵌套路径 | `{{data.items[0].title}}` | 支持数组索引访问 |
| 列表上下文 — item | `{{item.name}}` | 当前列表项 |
| 列表上下文 — index | `{{index}}` | 当前列表索引 |

### 实现 / Implementation

```typescript
function resolveExpression(
  expression: string,
  dataContext: DataContext
): unknown {
  // Match {{...}} pattern
  const match = expression.match(/^\{\{(.+?)\}\}$/);
  if (!match) return expression; // Not an expression, return as-is

  const raw = match[1].trim();

  // Check for default value: "path | default"
  const [pathStr, defaultStr] = raw.split('|').map(s => s.trim());
  const defaultValue = defaultStr
    ? JSON.parse(defaultStr) // parse "Anonymous" → Anonymous
    : undefined;

  // Resolve path against dataContext
  const value = resolvePath(pathStr, dataContext);

  return value !== undefined && value !== null ? value : defaultValue;
}

function resolvePath(path: string, dataContext: DataContext): unknown {
  // "data.user.name" → dataContext.data.user.name
  // "item.name"      → dataContext.item.name
  // "index"          → dataContext.index

  const segments = parsePath(path); // handles bracket notation: items[0] → [items, 0]
  const root = segments[0];

  let current: unknown;
  if (root === 'data') {
    current = dataContext.data;
    segments.shift();
  } else if (root === 'item') {
    current = dataContext.item;
    segments.shift();
  } else if (root === 'index') {
    return dataContext.index;
  } else {
    return undefined;
  }

  for (const seg of segments) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[seg];
  }

  return current;
}
```

**关键决策 / Key Decision**:

> 表达式解析器是**简单路径解析**，而不是完整表达式引擎。不支持 `a + b`、函数调用等。这是有意为之——保持可预测性和安全性。
>
> The expression parser is simple path resolution, NOT a full expression engine. No `a + b`, no function calls. This is intentional — keep it predictable and safe.

---

## 6. DataContext 与 ListRenderer / DataContext & ListRenderer

### DataContext 接口 / Interface

```typescript
interface DataContext {
  data: Record<string, unknown>;  // 页面级数据
  item?: unknown;                  // 列表项数据（仅在列表上下文中）
  index?: number;                  // 列表项索引（仅在列表上下文中）
  parent?: DataContext;            // 父级上下文（支持嵌套列表）
}
```

DataContext 通过 React Context 向下传递：

```typescript
const DataContextReact = React.createContext<DataContext>({
  data: {},
});
```

### ListRenderer 组件 / ListRenderer Component

```typescript
interface ListRendererProps {
  node: ComponentNode;          // 模板节点
  listExpression: string;       // e.g. "{{data.products}}"
  dataContext: DataContext;
  maxPreviewCount?: number;     // 默认 3，限制预览数量
}
```

**行为 / Behavior**:

1. 检测节点上的 `__listData` prop → 识别为列表节点
2. 调用 `resolveExpression(__listData, dataContext)` 获取数组数据
3. 以模板节点为基础，为数组的每一项渲染一次
4. 每个子项获得独立的 DataContext，包含 `item` + `index`
5. **第一个子项** 是模板（template），可编辑；其余为**只读预览**（readonly previews）

```typescript
function ListRenderer({ node, listExpression, dataContext, maxPreviewCount = 3 }: ListRendererProps) {
  const items = resolveExpression(listExpression, dataContext) as unknown[];

  if (!Array.isArray(items)) return null;

  const previewItems = items.slice(0, maxPreviewCount);

  return (
    <>
      {previewItems.map((item, index) => {
        const childContext: DataContext = {
          data: dataContext.data,
          item,
          index,
          parent: dataContext,
        };

        return (
          <DataContextReact.Provider key={index} value={childContext}>
            <SchemaRenderer
              node={node}
              isTemplate={index === 0}
              isReadOnlyPreview={index > 0}
            />
          </DataContextReact.Provider>
        );
      })}
    </>
  );
}
```

**关键决策 / Key Decision**:

> 列表渲染只展示**只读预览**，不展示可编辑副本。只有第一个（模板）是可编辑的。
>
> List rendering shows readonly previews, not editable copies. Only the first one (template) is editable.

---

## 7. SchemaRenderer 扩展 / SchemaRenderer Extensions

现有的 `SchemaRenderer.tsx` 需要扩展以支持完整的渲染管线：

```typescript
function SchemaRenderer({ node, isTemplate, isReadOnlyPreview }: Props) {
  const globalStates = useGlobalStates();
  const interactionState = useInteractionState(node.id);
  const dataContext = useContext(DataContextReact);

  // ① Resolve styles (4-layer)
  const resolvedStyles = resolveNodeStyles(node, globalStates, interactionState);

  // ② Resolve props (4-layer + expression)
  const resolvedProps = resolveNodeProps(node, globalStates, interactionState, dataContext);

  // ③ Visible check — may be overridden by global state binding
  if (resolvedProps.visible === false) {
    return null;
  }

  // ④ List node detection — delegate to ListRenderer
  if (resolvedProps.__listData) {
    return (
      <ListRenderer
        node={node}
        listExpression={resolvedProps.__listData as string}
        dataContext={dataContext}
      />
    );
  }

  // ⑤ Component instance resolution
  const resolvedNode = node.type === 'instance'
    ? resolveInstance(node, templates)
    : node;

  // ⑥ Render
  return (
    <PrimitiveRenderer
      node={resolvedNode}
      styles={resolvedStyles}
      props={resolvedProps}
      isReadOnlyPreview={isReadOnlyPreview}
    >
      {node.children?.map(child => (
        <SchemaRenderer key={child.id} node={child} />
      ))}
    </PrimitiveRenderer>
  );
}
```

**扩展要点 / Extension Points**:

- 渲染每个节点前先检查 `visible` 字段（可能被 global state binding 覆盖）
- 对 props 和 styles 中的字符串值做表达式解析
- 检测列表节点并委托给 ListRenderer
- 必要时用 `DataContext.Provider` 包裹子树
- 处理组件实例（通过 `resolveInstance` 从模板解析）

---

## 8. 渲染管线流程图 / Rendering Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Schema Node (input)                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  resolveNodeStyles()   │  ← 4-layer: base → global
              │  4 层样式叠加           │            → business → interaction
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  resolveNodeProps()    │  ← 4-layer + expression resolution
              │  4 层属性叠加 + 表达式  │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  visible check         │  ← resolvedProps.visible !== false ?
              │  可见性检查             │
              └────────────┬───────────┘
                           │
                    visible │ hidden → return null
                           ▼
              ┌────────────────────────┐
              │  list expansion?       │  ← __listData prop detected?
              │  列表展开判断           │
              └──────┬─────────┬───────┘
                     │         │
              is list│         │ not list
                     ▼         ▼
          ┌──────────────┐  ┌─────────────────────┐
          │ ListRenderer │  │ resolveInstance()    │
          │ 列表渲染      │  │ 实例解析（if needed） │
          └──────┬───────┘  └──────────┬──────────┘
                 │                     │
                 │    ┌────────────────┘
                 │    │
                 ▼    ▼
          ┌────────────────────────┐
          │  DataContext.Provider   │  ← wrap with context if in list
          │  数据上下文注入          │
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │  PrimitiveRenderer     │  ← DOM output
          │  原语渲染 → DOM         │
          └────────────────────────┘
```

**简化单行流 / Simplified single-line flow**:

```
Schema Node → resolveNodeStyles → resolveNodeProps → visible? → list? → DataContext → DOM
```

---

## 9. 性能优化 / Performance Optimizations

| 策略 | 说明 | 阶段 |
|---|---|---|
| **Memoize resolved styles** | 按 `nodeId + globalStates hash + activeState + interactionState` 做缓存，避免重复计算 | Phase 4 |
| **Viewport culling** | 跳过视口外节点的 resolution（虚拟渲染），只渲染可见区域 | Phase 4+ |
| **Debounce data context** | 数据源更新时 debounce DataContext 变更，避免高频重渲染 | Phase 4 |
| **React.memo + custom comparator** | `PrimitiveRenderer` 使用 `React.memo`，自定义比较函数只比较 resolved styles/props | Phase 4 |
| **Shallow equality on layers** | 每层 merge 前先做 shallow equal 检查，未变化则跳过 merge | Phase 4+ |

```typescript
// React.memo 示例 / Example
const MemoizedPrimitiveRenderer = React.memo(
  PrimitiveRenderer,
  (prevProps, nextProps) => {
    return (
      shallowEqual(prevProps.styles, nextProps.styles) &&
      shallowEqual(prevProps.props, nextProps.props) &&
      prevProps.node.id === nextProps.node.id
    );
  }
);
```

---

## 10. 影响的文件路径 / Affected File Paths

```
features/design-engine/src/
├── styles/
│   ├── resolveStyles.ts        ← 扩展为 4 层叠加 (extend to 4-layer)
│   ├── resolveState.ts         ← 已有 (existing)
│   └── resolveProps.ts         ← 🆕 props 4 层叠加 (new: 4-layer props)
├── data/
│   ├── resolveExpression.ts    ← 🆕 表达式解析 (new: expression resolver)
│   ├── DataContext.tsx          ← 🆕 React Context (new)
│   └── ListRenderer.tsx         ← 🆕 列表渲染组件 (new: list renderer)
├── renderer/
│   └── SchemaRenderer.tsx       ← 扩展（数据绑定 + visible + 列表）
└── renderers/
    └── PrimitiveRenderer.tsx    ← 扩展（接收 resolved props）
```

**文件说明 / File Descriptions**:

| 文件 | 类型 | 说明 |
|---|---|---|
| `resolveStyles.ts` | 改造 | 从简单取值改为 4 层叠加算法 |
| `resolveProps.ts` | 新增 | 与 resolveStyles 对称的 props 叠加 + 表达式解析 |
| `resolveExpression.ts` | 新增 | `{{...}}` 表达式解析器，简单路径解析 |
| `DataContext.tsx` | 新增 | React Context 定义 + Provider 组件 |
| `ListRenderer.tsx` | 新增 | 列表渲染组件，管理 item/index 上下文 |
| `SchemaRenderer.tsx` | 改造 | 集成 visible 检查、列表检测、数据绑定 |
| `PrimitiveRenderer.tsx` | 改造 | 接收 resolved props 而非原始 node |

---

## 11. 依赖关系 / Dependencies

```
┌──────────────────────────┐
│  01-schema-extensions    │  ← 本模块依赖（Schema 定义）
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  03-engine-rendering     │  ← 本模块
│  (this document)         │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  05-engine-preview       │  ← 依赖本模块（预览复用渲染管线）
│  08-frontend-panels      │  ← 依赖本模块（面板读取 resolved 数据）
└──────────────────────────┘
```

- **依赖 / Depends on**: `01-schema-extensions` — Schema 中的 `globalStateBindings`、`states`、`__listData` 等字段定义
- **被依赖 / Depended by**:
  - `05-engine-preview` — 预览模式复用同一渲染管线
  - `08-frontend-panels` — 属性面板需要读取 resolved styles/props

---

## 12. MVP vs 后期 / Phasing

| Phase | 内容 | 说明 |
|---|---|---|
| **Phase 2** | `resolveNodeStyles` 4-layer, `resolveNodeProps` 4-layer | 核心叠加算法，支持全局状态 + 业务状态 + 交互状态 |
| **Phase 3** | `resolveExpression`, `DataContext`, `ListRenderer` | 数据绑定 + 列表渲染，实现动态内容 |
| **Phase 4+** | Performance optimization, viewport culling | Memoize、虚拟渲染、debounce 等性能手段 |

**Phase 2 交付物 / Phase 2 Deliverables**:

- `resolveStyles.ts` 改造完成，通过单元测试
- `resolveProps.ts` 新增完成，通过单元测试
- `SchemaRenderer.tsx` 集成 4 层 resolution
- 属性面板能正确显示叠加后的样式

**Phase 3 交付物 / Phase 3 Deliverables**:

- `resolveExpression.ts` 完成，覆盖所有语法
- `DataContext.tsx` + `ListRenderer.tsx` 完成
- SchemaRenderer 支持 `{{...}}` 绑定和列表展开
- 可在画布上看到列表预览（template + readonly previews）

---

## 13. 核心技术决策 / Key Technical Decisions

### Decision 1: 简单路径解析 vs 完整表达式引擎

> **决策**: 表达式解析器只做简单路径解析（path resolution），不支持运算符、函数调用。
>
> **理由**: 完整表达式引擎（如 `a + b`、`fn(x)`）会引入安全风险（代码注入）和调试复杂度。设计工具的数据绑定场景 95% 是简单取值，不需要计算能力。如果后期需要，可以通过「计算字段」在数据源层面解决。

### Decision 2: 列表渲染只读预览

> **决策**: 列表渲染中，第一个子项是可编辑模板，其余子项为只读预览。
>
> **理由**: 如果每个列表项都可编辑，会产生「编辑哪个算数」的歧义。设计工具的心智模型是「编辑模板，预览效果」，与 Figma Auto Layout + Component 的模式一致。

### Decision 3: Global state binding 在渲染时解析

> **决策**: Global state binding 的 resolution 发生在渲染时（render time），而不是操作时（operation time）。
>
> **理由**: 渲染时解析意味着 Schema 中存储的始终是「声明式绑定关系」，而非「已计算的值」。这保证了：
> - 切换全局状态时，所有绑定自动生效，无需遍历更新
> - Schema 保持干净，不会因为状态切换而产生大量 diff
> - Undo/Redo 只需要记录绑定关系的变更，而非所有受影响节点的样式变更
