# Codegen 质量修复方案：从 Schema 到企业级可运行代码

## Context

项目 `833478e8-17c5-4f1f-b2d2-9ae17012cbcc` (Music AI App) 通过 codegen 生成后无法运行，需要手动修复 **25 个文件、341 行新增、1885 行删除**。问题根源是 codegen pipeline 中存在多个系统性缺陷，导致生成的代码：CSS 数值无单位、高度链断裂、事件不透传、类型全是 unknown、组件拆分后不使用、素材/图片丢失等。

**目标**：修复 codegen pipeline，使重新生成即可得到企业级可编译、可运行的代码。

**产出物**：
1. 本方案同步写入 `design_docs/03-tech/codegen-quality-fix.md` 作为持久设计文档
2. 代码修改按 Phase 逐步实施

---

## 第一性原理分析：问题根因归类

所有手动修复都可以追溯到 codegen pipeline 中 **7 个系统性缺陷**：

| # | 缺陷 | 根因位置 | 影响范围 |
|---|------|---------|---------|
| D1 | CSS 数值无单位 | `plan-style.ts` 直接 dump value，无 unit 处理 | 100+ 处 CSS 属性 |
| D2 | CSS Module 文件名错误 | pipeline 写 `index.less` 而非 `index.module.less` | 所有组件 |
| D3 | 高度链断裂 | scaffold `global.less` 缺 `html,body{height:100%}` | 全局布局 |
| D4 | 组件拆分后不被引用 | splitter 拆出组件但 parent JSX 仍内联子树 | 所有拆分组件 |
| D5 | 事件 handler 不透传 | splitter 的 prop 推断缺少 handler prop | 所有含事件的子组件 |
| D6 | 类型全是 unknown | schema 缺 typeDef + parser fallback 不智能 | 所有 state/props |
| D7 | 节点属性丢失 | parser 只取 textContent，丢 src/placeholder/href 等 | img/input/a 等标签 |

次要缺陷：
| # | 缺陷 | 根因 |
|---|------|------|
| D8 | 路由缺根路径 `/` | router 模板无 fallback redirect |
| D9 | JSX 缩进过深（8空格） | renderTree 的 indent 基数错误 |
| D10 | Less 变量名不匹配 | scaffold variables.less 与 global.less 不一致 |
| D11 | vite-env.d.ts 缺失 | scaffold 缺类型声明文件 |
| D12 | service 无 mock fallback | service 模板假设后端可用 |

---

## 修复方案（按 pipeline 阶段分层）

### Phase 1: CSS 值标准化层 — 修复 D1

**文件**: `features/design-codegen/src/emit/plan-style.ts`

**问题本质**: Schema 中 CSS 值存储为 `number` 类型（如 `fontSize: 14`），`plan-style.ts` 直接 `String(value)` 输出为 `font-size: 14;`，浏览器忽略无单位的值。

**方案**: 在 `collectNodeStyles` 中增加 `normalizeCssValue(property, value)` 函数：

```typescript
// features/design-codegen/src/emit/css-normalizer.ts (新文件)

/**
 * CSS 属性是否需要 px 单位（排除无单位属性）
 */
const UNITLESS_PROPERTIES = new Set([
  'opacity', 'z-index', 'zIndex', 'flex', 'flex-grow', 'flexGrow',
  'flex-shrink', 'flexShrink', 'font-weight', 'fontWeight',
  'line-height', 'lineHeight', 'order', 'orphans', 'widows',
  'tab-size', 'tabSize', 'counter-increment', 'counter-reset',
  'animation-iteration-count', 'column-count', 'fill-opacity',
  'flood-opacity', 'stop-opacity', 'stroke-dashoffset',
  'stroke-miterlimit', 'stroke-opacity', 'stroke-width',
]);

/**
 * 将 schema 中的 CSS 值标准化为合法 CSS 字符串。
 * 
 * 规则：
 * 1. 纯数字 + 需要单位的属性 → 追加 "px"
 * 2. 纯数字 0 → "0"（无需单位）
 * 3. 已有单位的字符串 → 原样返回
 * 4. 特殊值（auto, none, inherit 等）→ 原样返回
 */
export function normalizeCssValue(property: string, value: string): string {
  // 已经有单位或不是纯数字 → 原样返回
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;
  
  const num = parseFloat(value);
  if (num === 0) return '0';
  
  const kebabProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
  if (UNITLESS_PROPERTIES.has(property) || UNITLESS_PROPERTIES.has(kebabProp)) {
    return value;
  }
  
  return `${value}px`;
}
```

**修改 `plan-style.ts`**:
```typescript
// 在 collectNodeStyles 的循环中:
const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
const normalized = normalizeCssValue(prop, value);
out.push(`  ${kebabProp}: ${normalized};`);
```

**同时修改 `adapter/react/index.ts` 的 `emitDynamicStyle`**: 动态样式中的 fallback 值也需要单位标准化。

---

### Phase 2: CSS Module 文件名 — 修复 D2

**文件**: `features/design-codegen/src/emit/plan.ts` + `features/codegen-template-react/framework.yaml`

**方案**: 
1. `framework.yaml` 中将 style 文件名模式从 `index.less` 改为 `index.module.less`
2. `plan.ts` 的 `planScreenEmit` 中生成 style 文件路径时使用 `.module.less` 后缀
3. `adapter/react/index.ts` 的 `emitStyleImport` 输出 `'./index.module.less'`

---

### Phase 3: Scaffold 修复 — 修复 D3, D10, D11

**文件**: `features/codegen-template-react/scaffold/`

**D3 - global.less 高度链**:
```less
html,
body {
  height: 100%;
}

#root {
  min-height: 100vh;
  height: 100%;
}
```

**D10 - variables.less 变量名对齐**: 检查 global.less 引用的变量（`@color-text`, `@color-bg`, `@color-primary`, `@color-primary-hover`）在 variables.less 中都有定义。

**D11 - vite-env.d.ts**: 在 scaffold 中新增：
```typescript
/// <reference types="vite/client" />
declare module '*.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.module.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

---

### Phase 4: 组件引用修复（核心） — 修复 D4, D5

**问题本质**: Splitter 正确地将节点标记为 `splitAs = 'component'`，但 `renderTree` 渲染时仍递归渲染完整子树（包括已拆分的节点），导致：
- Parent 页面中出现了子组件的完整 HTML（内联）
- 同时 import 了子组件但从未使用

**文件**: `features/design-codegen/src/adapter/react/index.ts` 的 `renderNodeDeep`

**方案**: 在 `renderNodeDeep` 中检测 `node.splitAs === 'component'`，如果是，则渲染为 `<ComponentName prop1={...} prop2={...} />`，而非递归展开其子树。

```typescript
// 在 renderNodeDeep 方法中，递归 children 时：
for (const child of node.children) {
  if (child.splitAs === 'component' && child.splitComponentName) {
    // 渲染为组件引用而非内联子树
    const propsStr = this.emitComponentProps(child);
    childrenLines.push(`${makeIndent(indent + 1)}<${child.splitComponentName}${propsStr} />`);
  } else {
    childrenLines.push(this.renderTree(child, indent + 1));
  }
}
```

**D5 - Handler prop 透传**:

**文件**: `features/design-codegen/src/core/splitter.ts` 的 `buildChildComponents`

当前的 `inferPropsFromUsage` 需要增强，收集子树中引用的：
1. **State 变量** → 作为数据 props（如 `featureTiles: FeatureTile[]`）
2. **Event handlers** → 作为回调 props（如 `handleCollabTileClick: () => void`）
3. **Repeat item/index** → 如果在 repeat template 内

具体增强 `inferPropsFromUsage`:
```typescript
function inferPropsFromUsage(node: NodeIR, pageHandlers: HandlerIR[]): PropDefinition[] {
  const props: PropDefinition[] = [];
  const usedVars = new Set<string>();
  const usedHandlers = new Set<string>();
  
  // 递归收集子树中引用的变量和 handler
  walkNode(node, (n) => {
    // 从 dynamicStyles 和 textContent 中提取引用的变量
    for (const ds of n.dynamicStyles) {
      extractVarRefs(ds.expression.compiled, usedVars);
    }
    if (n.textContent?.isExpression) {
      extractVarRefs(n.textContent.compiled, usedVars);
    }
    // 收集 handler 引用
    for (const event of n.events) {
      usedHandlers.add(event.handlerName);
    }
  });
  
  // 将 handler 引用转为 () => void props
  for (const handlerName of usedHandlers) {
    props.push({
      name: handlerName,
      type: '() => void',
      required: true,
    });
  }
  
  // 将 state 变量引用转为数据 props  
  for (const varName of usedVars) {
    const stateVar = findStateVar(varName, page);
    if (stateVar) {
      props.push({
        name: varName,
        type: stateVar.type,
        required: true,
      });
    }
  }
  
  return props;
}
```

---

### Phase 5: 类型系统根治 — 修复 D6

**第一性原理分析：类型为什么丢了？**

调查发现，schema 中存在**两套独立的类型系统**，之间没有自动桥接：

```
┌────────────────────────────────┐     ┌────────────────────────────────┐
│  DataSource.typeDef            │     │  stateInit.dataTypes           │
│  (数据源的响应类型)              │     │  (状态变量的类型注解)            │
│                                │     │                                │
│  存储位置:                      │     │  存储位置:                      │
│  screen.dataSources[].typeDef  │     │  screen.stateInit.dataTypes    │
│                                │     │                                │
│  由 data_source > add 写入      │     │  由 state > data_set_init 写入  │
└────────────────────────────────┘     └────────────────────────────────┘
              │         NO AUTO-BRIDGE          ▲
              └─────────── ✗ ✗ ✗ ──────────────┘
```

**问题链**：
1. AI 调用 `data_source.add` 创建 "chat-list" 时，可能传了 `typeDef`（`{responseName: "Message", ...}`）
2. AI 调用 `state.data_set_init` 设置 `data.messages = []` 时，**经常忘记传 `typeAnnotation`**
3. 即使 typeDef 在数据源上存在，`stateInit.dataTypes` 仍为空
4. Codegen 的 `extractDataState` 只读 `stateInit.dataTypes` → 找不到 → 输出 `unknown`
5. 另外，`data_source.add` 的 `typeDef` 是 Zod `.optional()`，MCP 描述虽写"必填"但不强制
6. v1→v2 migration 还会丢掉已有的 typeDef

**根治方案：不在 codegen 打补丁，在源头确保类型信息不丢失**

#### 5a. Operation 层自动桥接 typeDef → dataTypes

**文件**: `features/design-operations/src/operations/screen-state.ts`

当 `screenState.setDataInit` 被调用时，如果 `typeAnnotation` 未提供，自动从同屏的 `dataSources` 中查找匹配的 `typeDef` 并填充：

```typescript
// 在 executeSetDataInit 中:
if (!params.typeAnnotation) {
  // 自动从数据源推断类型
  const inferred = autoInferTypeAnnotation(screen, params.key);
  if (inferred) {
    if (!stateInit.dataTypes) stateInit.dataTypes = {};
    stateInit.dataTypes[params.key] = inferred;
  }
}

function autoInferTypeAnnotation(
  screen: Screen,
  key: string,
): DataTypeAnnotation | undefined {
  // 查找名称匹配的 API 数据源
  for (const ds of screen.dataSources) {
    if (ds.type !== 'api' || !ds.typeDef) continue;
    // 匹配策略：数据源名包含 key，或 effect.fetch 的 onSuccess 写入此 key
    if (dsWritesToKey(screen, ds.id, key)) {
      return {
        typeName: ds.typeDef.responseName,
        isArray: ds.typeDef.responseShape === 'array',
      };
    }
  }
  return undefined;
}
```

#### 5b. MCP data_source.add 强制 typeDef

**文件**: `apps/design-mcp/src/tools/domain/data-source.ts`

将 `typeDef` 从 `.optional()` 改为 `type=api` 时的条件必填。在 handler 中加验证：

```typescript
// handler 中添加:
if (p.type === 'api' && !p.typeDef) {
  // 如果有 mock scenario，自动从 mock responseBody 推断
  if (p.mock?.scenarios?.length) {
    p.typeDef = inferTypeDefFromMockBody(p.mock.scenarios[0].responseBody, p.name);
  } else {
    return { error: 'api 类型数据源必须提供 typeDef（响应类型定义），或提供 mock scenario 以自动推断' };
  }
}
```

这样做的好处：
- 如果 AI 传了 typeDef → 直接使用
- 如果 AI 传了 mock 但没传 typeDef → 自动从 mock 推断（mock 里有完整的 responseBody 样例数据）
- 如果两个都没传 → 报错，要求补充

#### 5c. 修复 removeDataInit 泄漏

**文件**: `features/design-operations/src/operations/screen-state.ts`

```typescript
// executeRemoveDataInit 中，删除 data key 时也清理 dataTypes:
const previousTypeAnnotation = stateInit.dataTypes?.[params.key];
delete stateInit.dataTypes?.[params.key];

// inverse 中保留 typeAnnotation:
inverse: {
  type: 'screenState.setDataInit',
  params: { screenId, key: params.key, value: previous, typeAnnotation: previousTypeAnnotation },
}
```

#### 5d. 修复 v1→v2 migration 丢 typeDef

**文件**: `apps/design-api/src/migrations/v1-to-v2-state-model.ts`

在 migration 重建 ApiDataSource 时，保留原有的 typeDef：

```typescript
// migration 中 rebuild data source 时:
const rebuilt: ApiDataSource = {
  ...original,
  typeDef: original.typeDef,  // ← 保留
};
```

#### 5e. 增强 MCP data_source.add 的 tool description

在工具描述中明确告知 AI：`typeDef` 是 API 类型数据源的必填字段，且说明当有 mock 时可以省略（系统会自动推断）。

#### 5f. Codegen 维持严格模式

**`features/design-codegen/src/core/parser.ts`** 保持现有的"只从显式定义读取"策略：

```typescript
// ✅ 保持不变：
const annotation = dataTypes?.[key];
if (annotation) {
  type = annotation.isArray ? `${annotation.typeName}[]` : annotation.typeName;
} else {
  type = 'unknown'; // 如果走到这里，说明上游 schema pipeline 有 bug
}
```

这确保了：如果 codegen 输出 `unknown`，说明上游 schema pipeline 存在遗漏，应该修复上游而不是在 codegen 端猜测。

---

### Phase 6: 节点属性完整映射 — 修复 D7

**文件**: `features/design-codegen/src/core/parser.ts` 的 `parseNode` + `features/design-codegen/src/adapter/react/emit-element.ts` 的 `buildAttributes`

**问题**: Parser 只提取 `props.textContent` / `props.children`，丢弃了 `src`、`placeholder`、`href`、`alt`、`type` 等关键属性。

**方案**: 在 `NodeIR` 中新增 `htmlProps: Record<string, string | ExpressionIR>` 字段，parser 将 schema 的 `props` 中的标准 HTML 属性映射过来：

```typescript
// parser.ts - parseNode 中新增:
const htmlProps = parseHtmlProps(node.props, node.type, scope);

// 新函数:
const HTML_PROP_WHITELIST = new Set([
  'src', 'alt', 'href', 'target', 'placeholder', 'type', 'disabled',
  'readonly', 'maxLength', 'minLength', 'pattern', 'autoFocus',
  'autoComplete', 'name', 'id', 'title', 'role', 'tabIndex',
  'aria-label', 'aria-hidden', 'aria-expanded',
]);

function parseHtmlProps(
  props: Record<string, unknown>,
  nodeType: string,
  scope: ExpressionScope,
): Record<string, string | ExpressionIR> {
  const result: Record<string, string | ExpressionIR> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (key === 'textContent' || key === 'children') continue;
    if (!HTML_PROP_WHITELIST.has(key)) continue;
    
    const strValue = String(value);
    if (isExpressionString(strValue)) {
      result[key] = compileExpression(strValue, scope);
    } else {
      result[key] = strValue;
    }
  }
  
  return result;
}
```

在 `buildAttributes` 中输出这些属性：
```typescript
// emit-element.ts - buildAttributes 中新增:
for (const [key, value] of Object.entries(node.htmlProps)) {
  if (typeof value === 'string') {
    parts.push(`${key}="${value}"`);
  } else {
    parts.push(`${key}={${value.compiled}}`);
  }
}
```

---

### Phase 7: 路由与 Scaffold 增强 — 修复 D8, D9, D12

**D8 - 路由根路径**:

**文件**: `features/codegen-template-react/patterns/router.tsx.ejs`

生成路由时自动添加 `/` → 首页的 redirect：
```tsx
{ path: '/', element: <Navigate to="/<firstScreenSlug>" replace /> },
```

**D9 - JSX 缩进**:

**文件**: `features/design-codegen/src/adapter/react/emit-plan.ts`

`buildPageTemplateData` 中 `adapter.renderTree(plan.page.node, 4)` 的 indent=4 导致 JSX 从第 8 列开始。改为 `indent=2`（return 语句内标准缩进）。

**D12 - Service mock fallback**:

**文件**: `features/codegen-template-react/patterns/service.ts.ejs`

service 模板增加 mock 检测逻辑：
```typescript
const hasBackend = Boolean(import.meta.env.VITE_API_BASE);
// 各函数中: if (!hasBackend) return MOCK_DATA;
```

当 dataSource 有 mock scenario 时，codegen 自动将 mock responseBody 嵌入 service 文件作为 fallback 数据。

---

### Phase 8: VisualState → CSS pseudo-class / Transition — 补充缺失内容

**当前缺失**: Schema 中的 `VisualState[]`（hover/pressed/disabled）完全没有被 codegen 处理。

**文件**: `features/design-codegen/src/core/parser.ts` + `features/design-codegen/src/emit/plan-style.ts`

**方案**: 将 VisualState 映射为 CSS pseudo-class：

```less
.button {
  background: #1677ff;
  transition: all 200ms ease;
  
  &:hover {
    background: #4096ff;
  }
  
  &:active {
    background: #0958d9;
    transform: scale(0.98);
  }
  
  &.disabled {
    opacity: 0.45;
    pointer-events: none;
  }
}
```

在 `parser.ts` 的 `parseNode` 中新增 `visualStates` 字段到 `NodeIR`：
```typescript
const visualStates = parseVisualStates(node.states);
```

在 `plan-style.ts` 中为有 visualState 的节点输出 pseudo-class 样式块。

---

### Phase 9: 额外发现的关键 Bug 修复

以下是 4 个并行分析 agent 发现的额外关键问题（必须在本次修复中一并处理）：

#### 9a. 多个 fetch 步骤导致 `const result` 重复声明

**文件**: `features/design-codegen/src/adapter/react/emit-handler.ts`

**问题**: 如果一个 handler 中有两个连续的 `effect.fetch`，都会生成 `const result = await xxx()`，导致 JS 语法错误（变量重声明）。

**方案**: 为每个 fetch 步骤生成唯一的 resultVar（如 `result1`, `result2`），或在 parser 中为 `translateEffectFetch` 生成唯一名称：
```typescript
// parser.ts - translateEffectFetch 中:
const resultIndex = fetchCounter++;
const resultVar = fetchCounter === 1 ? 'result' : `result${resultIndex}`;
```

#### 9b. Static 数据源完全被忽略

**文件**: `features/design-codegen/src/core/parser.ts` (line 155)

**问题**: `extractDataSources` 只保留 `type === 'api'` 的数据源，静态数据源（如 Welcome 页的 slides 数据）完全被丢弃。这导致依赖静态数据源的页面（Welcome Onboarding）无法正确初始化数据。

**方案**: 静态数据源应该被转换为页面内的常量声明：
```typescript
// 新增处理 static data source
function extractStaticSources(screen: Screen): StaticDataIR[] {
  return screen.dataSources
    .filter(ds => ds.type === 'static')
    .map(ds => ({
      name: ds.name,
      constName: `${ds.name.toUpperCase()}_DATA`,
      value: JSON.stringify(ds.initial, null, 2),
    }));
}
```

#### 9c. `extractDataState` 的 defaultValue 总是 `'[]'`

**文件**: `features/design-codegen/src/core/parser.ts` (line ~147)

**问题**: 无论 stateInit.data 的初始值是对象还是标量，defaultValue 总是被设为 `'[]'`。这导致 `useState<HeroInfo>([])` 这种类型不匹配的代码。

**方案**: 使用现有的 `serializeDefaultValue` 函数正确序列化：
```typescript
defaultValue: serializeDefaultValue(value),  // 不再硬编码 '[]'
```

#### 9d. Toast 消息双重引号包裹

**文件**: `features/design-codegen/src/adapter/react/emit-handler.ts` (line ~88)

**问题**: `toast.${toastType}('${message}')` 中 `message` 已经是编译后的 JS 表达式字符串，再包一层单引号变成字面字符串。

**方案**: 改为 `toast.${toastType}(${message})`（不额外包引号）。

#### 9e. 未命名节点的样式孤立

**文件**: `features/design-codegen/src/adapter/react/emit-element.ts` (line ~17)

**问题**: `buildAttributes` 只在 `node.name` 存在时才生成 `className`。未命名但有 staticStyles 的节点，其样式被写入 Less 文件但 JSX 中没有 className 引用。

**方案**: 为未命名节点也生成合成 className（使用 `node.id` 后缀）：
```typescript
const cssName = node.name ? toCssClassName(node.name) : `node${node.id.slice(-6)}`;
parts.push(adapter.emitClassName(cssName));
```

#### 9f. 缺少对 stateInit.data 中 JSON 字符串的处理

**问题**: History 和 Profile 页的 `stateInit.data` 中部分值存储为 JSON 字符串（而非对象），需要在生成代码中做 `JSON.parse`。

**方案**: 在 `extractDataState` 中检测值是否为 JSON 字符串：
```typescript
if (typeof value === 'string') {
  try {
    const parsed = JSON.parse(value);
    // 如果解析成功且是对象/数组，使用解析后的值
    defaultValue = JSON.stringify(parsed, null, 2);
    type = inferTypeFromValue(parsed);
  } catch { /* 普通字符串 */ }
}
```

---

## 修改文件清单

### 新增文件
| 文件 | 说明 |
|------|------|
| `features/design-codegen/src/emit/css-normalizer.ts` | CSS 值标准化（单位、颜色等） |
| `features/codegen-template-react/scaffold/vite-env.d.ts` | Vite 类型声明 |

### 修改文件
| 文件 | 修改内容 |
|------|---------|
| `features/design-codegen/src/emit/plan-style.ts` | 引入 normalizeCssValue，处理 visualStates，为未命名节点生成合成 className |
| `features/design-codegen/src/emit/plan.ts` | style 文件名 → `.module.less` |
| `features/design-codegen/src/core/types.ts` | NodeIR 新增 `htmlProps`, `visualStates` 字段；补充 ActionStepIR 缺失 kinds |
| `features/design-codegen/src/core/parser.ts` | 完善类型推断（mock fallback）、HTML 属性提取、visualState 解析、static 数据源处理、defaultValue 正确序列化、JSON 字符串解析 |
| `features/design-codegen/src/core/splitter.ts` | 增强 prop 推断（handler + state 变量引用递归收集） |
| `features/design-codegen/src/adapter/react/index.ts` | renderNodeDeep 处理拆分组件引用；未命名节点 className |
| `features/design-codegen/src/adapter/react/emit-element.ts` | 输出 htmlProps；未命名节点也生成 className |
| `features/design-codegen/src/adapter/react/emit-handler.ts` | 修复 resultVar 唯一性；修复 toast 消息引号 |
| `features/design-codegen/src/adapter/react/emit-plan.ts` | 修正 JSX 缩进、style 文件引用 |
| `features/design-codegen/src/adapter/react/emit-component.ts` | style 文件引用 → `.module.less` |
| `features/codegen-template-react/scaffold/src/styles/global.less` | 添加 html/body height |
| `features/codegen-template-react/scaffold/src/styles/variables.less` | 变量名对齐 |
| `features/codegen-template-react/patterns/router.tsx.ejs` | 添加根路径 redirect |
| `features/codegen-template-react/patterns/service.ts.ejs` | 添加 mock fallback |
| `features/codegen-template-react/framework.yaml` | style 文件名模式 |
| `apps/design-mcp/src/tools/domain/data-source.ts` | typeDef 强制验证 + mock 自动推断 |
| `features/design-operations/src/operations/screen-state.ts` | setDataInit 自动桥接 typeDef→dataTypes；removeDataInit 清理 dataTypes + inverse 保留 |
| `apps/design-api/src/migrations/v1-to-v2-state-model.ts` | 保留 typeDef 字段 |

---

## 实施顺序

```
Phase 1 (D1): css-normalizer.ts + plan-style.ts       ← 影响最大，100+ 处
Phase 2 (D2): .module.less 文件名                       ← 编译必需
Phase 3 (D3,D10,D11): scaffold 修复                     ← 全局基础
Phase 4 (D4,D5): 组件引用 + handler 透传                ← 核心功能
Phase 5 (D6): 类型系统根治（MCP 强制 + Operation 桥接 + Migration 修复） ← 根治 unknown
Phase 6 (D7): HTML 属性完整映射                          ← 内容完整性
Phase 7 (D8,D9,D12): 路由 + 缩进 + mock                ← 可用性
Phase 8: VisualState → CSS                              ← 视觉完整性
Phase 9: 额外 Bug（resultVar/static DS/defaultValue/toast/className/JSON） ← 正确性
```

注：Phase 9 的修复分散在各文件中，实际上会与 Phase 1-8 的文件修改合并执行。

## 验证方案

1. **重新生成**: 对 `833478e8-17c5-4f1f-b2d2-9ae17012cbcc` 项目重新运行 codegen
2. **编译检查**: `cd apps/music-ai-app && npm install && npx tsc --noEmit` → 零错误
3. **运行检查**: `npm run dev` → 页面正常显示，无白屏
4. **视觉检查**: 截图与设计稿对比，CSS 值正确（有单位）、颜色正确、布局正确
5. **交互检查**: 点击按钮触发导航、输入框可输入、列表正确渲染
6. **Diff 检查**: 与手动修复版本对比，确认生成结果不再需要上述 10 类手动修复

---

## 附录：Schema → Code 完整性审计

对 `833478e8-17c5-4f1f-b2d2-9ae17012cbcc` 项目的 5 个屏幕 schema 与当前 codegen 输出进行逐项对比，以下是**丢失内容**清单：

### 已生成 ✅
- 5 个页面的基本结构和路由
- 节点树基本层级
- stateInit.view 变量（inputDraft, welcomePagerIndex）
- stateInit.data 变量（messages, hero, user 等）
- API 数据源（chat-list, chat-send）的 service 函数
- 事件处理（click → nav.go, screenEnter → effect.fetch）
- 列表渲染（messages repeat）
- 双向绑定（input bind）
- 条件样式（item.role 三元表达式）

### 丢失 ❌（本方案修复后将覆盖）
| Schema 内容 | 丢失原因 | 修复 Phase |
|------------|---------|-----------|
| CSS 数值单位（100+ 处） | plan-style 不处理 | Phase 1 |
| CSS Module 文件名 | pipeline 写错后缀 | Phase 2 |
| html/body 高度链 | scaffold 不完整 | Phase 3 |
| 子组件实际使用（import 了但内联） | renderTree 不检查 splitAs | Phase 4 |
| handler 作为 prop 传递 | splitter 不收集 handler | Phase 5 |
| 类型定义（全是 unknown） | 无 mock fallback 推断 | Phase 5 |
| HTML 属性（src, placeholder, type） | parser 只取 textContent | Phase 6 |
| 根路由 `/` redirect | router 模板缺少 | Phase 7 |
| VisualState hover/pressed 样式 | 完全忽略 | Phase 8 |
| Static 数据源（Welcome slides） | parser 过滤掉 | Phase 9b |
| state 初始值正确性（对象 vs 数组） | defaultValue 硬编码 `[]` | Phase 9c |

### 仍将保留为未来工作 ⏳（不在本次修复范围）
| Schema 内容 | 说明 |
|------------|------|
| `materialProjectId` 关联 | 素材工程引用暂时通过 backgroundImage URL 保留，工程级关联后续做 |
| `env(safe-area-inset-bottom)` | BottomTabBar 的安全区域 padding 已在 CSS 值中原样保留 |
| Component template reference (tpl_xxx) | 跨屏复用组件暂时每屏独立生成，后续做组件提取 |
| `scrollReachBottom/Top` 触发器 | 需要 IntersectionObserver，本次暂不处理 |
| `state.merge` / `effect.cancel` action | 使用场景少，本次优先级低 |
| `node.setVisualState` action | 运行时态切换，需配合 Phase 8 的 CSS 方案 |
| Project 级 globalState | 跨屏共享状态，需后续架构设计 |
| `screenExit` 清理逻辑 | useEffect cleanup return，后续补充 |
