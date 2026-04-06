# 状态属性继承 — 技术方案

> 产品方案：[状态属性继承 — 产品方案](../../02-product/editor/04-state-system/state-property-inheritance.md)
>
> 相关代码：
> - `features/design-schema/src/types/state.ts` — ComponentState 类型
> - `features/design-operations/src/operations/state.ts` — 状态操作
> - `features/design-engine/src/styles/resolveStyles.ts` — 样式解析
> - `features/design-engine/src/styles/resolveProps.ts` — 属性解析
> - `features/design-engine/src/renderer/SchemaRenderer.tsx` — 渲染器
> - `apps/design_front/src/views/editor/panels/` — 编辑器面板

---

## 一、问题定位

### 1.1 当前各属性维度的实现对照

#### ✅ styles — 正确实现

```
存储:
  node.styles = { background: "blue", color: "white", borderColor: "transparent" }
  error.state.styles = { borderColor: "red" }  ← 只存差异

渲染 (resolveNodeStyles):
  merged = { ...node.styles, ...state.styles }
         = { background: "blue", color: "white", borderColor: "red" }  ✅

编辑器 (StylesTab):
  effectiveState === 'default' → updateStyle → 写 node.styles  ✅
  effectiveState === 'error'   → updateState → 写 state.styles  ✅
```

#### ❌ props — 编辑器不感知状态

```
存储:
  node.props = { placeholder: "邮箱" }

渲染 (resolveNodeProps):
  mergedProps = { ...node.props, ...activeState.props }  ← 引擎支持合并 ✅

编辑器 (PropsTab):
  始终执行 updateComponentProps → 写入 node.props  ← 不区分状态 ❌
  应该: effectiveState === 'error' → updateState(props: {...}) → 写 state.props
```

#### ❌ childrenVisibility — 存储和渲染均有问题

```
存储 (executeSetChildVisibility):
  遍历所有 states，向每个 state 的 childrenVisibility 写入  ← 不符合差异模型 ❌

  // 当前代码 (state.ts L266-L280):
  const visibleSet = new Set(params.visibleInStates);
  for (const state of parent.states) {
    if (visibleSet.has(state.name)) {
      delete state.childrenVisibility[params.childNodeId];  // 可见 → 删除 key
    } else {
      state.childrenVisibility[params.childNodeId] = false; // 隐藏 → 写 false
    }
  }
  // 问题: 一次性写所有状态，丢失了"哪些是显式设置、哪些应该继承默认"的信息

渲染 (SchemaRenderer.tsx):
  // 取 activeState 的 childrenVisibility，无合并逻辑
  const activeStateDef = node.states?.find(s => s.name === node.activeState);
  cvMap = activeStateDef?.childrenVisibility;
  // 问题: 如果 error 状态只覆盖了 errTip 的可见性，
  //        但 default 状态隐藏了 successTip，
  //        error 的 cvMap 不包含 successTip → successTip 不会被隐藏 ❌
```

#### ❌ childrenStates — 渲染无合并

```
存储: 每个 state 独立存储 childrenStates → 存储模型正确 ✅

渲染 (SchemaRenderer.tsx):
  csMap = activeStateDef?.childrenStates;  ← 无合并 ❌
  // 应该: csMap = { ...defaultState.childrenStates, ...activeState.childrenStates }
```

---

## 二、技术方案

### 2.1 统一的「默认 + 差异合并」函数

在 `features/design-engine` 中新建通用合并工具：

```typescript
// features/design-engine/src/styles/resolveStateOverrides.ts

/**
 * 将默认状态的 map 与活动状态的 map 合并。
 * 活动状态的 key 覆盖默认状态的同名 key。
 *
 * 语义: 活动状态中存在的 key = 显式覆盖
 *       活动状态中不存在的 key = 继承默认
 */
export function mergeStateMaps<V>(
  defaultMap: Record<string, V> | undefined,
  activeMap: Record<string, V> | undefined,
): Record<string, V> | undefined {
  if (!defaultMap && !activeMap) return undefined;
  if (!defaultMap) return activeMap;
  if (!activeMap) return defaultMap;
  return { ...defaultMap, ...activeMap };
}
```

### 2.2 修复 SchemaRenderer 的 childrenVisibility 合并

**文件**: `features/design-engine/src/renderer/SchemaRenderer.tsx`

**修改位置**: NodeRenderer 中 cvMap / csMap 的计算逻辑

```typescript
// 修改前 (当前代码):
const activeStateDef = node.states?.find(s => s.name === node.activeState);
cvMap = activeStateDef?.childrenVisibility;

// 修改后:
const defaultStateDef = node.states?.find(s => s.name === 'default');
const activeStateDef = node.states?.find(s => s.name === effectiveStateName);
cvMap = mergeStateMaps(
  defaultStateDef?.childrenVisibility,
  effectiveStateName !== 'default' ? activeStateDef?.childrenVisibility : undefined,
);
```

同样修改 csMap:

```typescript
// 修改前:
csMap = activeStateDef?.childrenStates;

// 修改后:
csMap = mergeStateMaps(
  defaultStateDef?.childrenStates,
  effectiveStateName !== 'default' ? activeStateDef?.childrenStates : undefined,
);
```

**注意**: preview 分支中同样需要应用合并逻辑。

完整的 cvMap 计算逻辑（替换当前 L379-L417）:

```typescript
const defaultStateDef = node.states?.find(s => s.name === 'default');
let cvMap: Record<string, boolean> | undefined;
let csMap: Record<string, string> | undefined;

if (rawPreviewState) {
  const previewStateDef = node.states?.find(s => s.name === rawPreviewState);
  if (rawPreviewState === 'default' || rawPreviewState === 'normal') {
    cvMap = defaultStateDef?.childrenVisibility;
    csMap = defaultStateDef?.childrenStates;
  } else {
    // 非默认预览状态: 合并默认 + 预览状态
    cvMap = mergeStateMaps(
      defaultStateDef?.childrenVisibility,
      previewStateDef?.childrenVisibility,
    );
    csMap = mergeStateMaps(
      defaultStateDef?.childrenStates,
      previewStateDef?.childrenStates,
    );
  }
} else {
  const activeStateDef = node.states?.find(s => s.name === node.activeState);
  if (node.activeState === 'default' || !node.activeState) {
    cvMap = defaultStateDef?.childrenVisibility;
    csMap = defaultStateDef?.childrenStates;
  } else {
    cvMap = mergeStateMaps(
      defaultStateDef?.childrenVisibility,
      activeStateDef?.childrenVisibility,
    );
    csMap = mergeStateMaps(
      defaultStateDef?.childrenStates,
      activeStateDef?.childrenStates,
    );
  }
}
```

### 2.3 重构 setChildVisibility 操作

**文件**: `features/design-operations/src/operations/state.ts`

**问题**: 当前 `executeSetChildVisibility` 遍历所有状态并写入，不区分「显式覆盖」和「继承默认」。

**方案**: 拆分为两种模式：
1. **设置默认态** — 写入 default 状态的 childrenVisibility
2. **设置覆盖态** — 只写入指定状态的 childrenVisibility

```typescript
// 新的操作类型
interface SetChildVisibilityV2Op {
  type: 'setChildVisibility';
  params: {
    parentNodeId: string;
    childNodeId: string;
    /** 要设置可见性的状态名。'default' 表示修改基线。 */
    stateName: string;
    /** true = 在该状态下可见, false = 在该状态下隐藏, undefined = 删除覆盖(恢复继承) */
    visible: boolean | undefined;
  };
}
```

新的实现逻辑:

```typescript
export function executeSetChildVisibility(
  project: DesignProject,
  params: SetChildVisibilityV2Op['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const parent = findNodeInProject(newProject, params.parentNodeId);
  if (!parent) { /* error handling */ }

  if (!parent.states) parent.states = [];

  // 确保 default 状态存在
  let targetState = parent.states.find(s => s.name === params.stateName);
  if (!targetState) {
    targetState = { name: params.stateName, styles: {} };
    if (params.stateName === 'default') {
      parent.states.unshift(targetState);
    } else {
      parent.states.push(targetState);
    }
  }

  // 保存旧值用于 undo
  const oldValue = targetState.childrenVisibility?.[params.childNodeId];

  if (params.visible === undefined) {
    // 删除覆盖 → 恢复继承默认
    if (targetState.childrenVisibility) {
      delete targetState.childrenVisibility[params.childNodeId];
      if (Object.keys(targetState.childrenVisibility).length === 0) {
        delete targetState.childrenVisibility;
      }
    }
  } else {
    if (!targetState.childrenVisibility) targetState.childrenVisibility = {};
    if (params.visible) {
      // 显式设置为可见: 如果是 default 态存 true 不太合理(默认就是可见)
      // 但为了语义明确还是存储: 表示"在此状态下确认为可见"
      // 对于 default 状态: 不存 key = 可见, 存 false = 隐藏
      // 对于非 default 状态: 不存 key = 继承默认, 存 true = 显式可见, 存 false = 显式隐藏
      if (params.stateName === 'default') {
        // default 状态: true = 删除 key(恢复默认可见)
        delete targetState.childrenVisibility[params.childNodeId];
      } else {
        targetState.childrenVisibility[params.childNodeId] = true;
      }
    } else {
      targetState.childrenVisibility[params.childNodeId] = false;
    }
    if (Object.keys(targetState.childrenVisibility).length === 0) {
      delete targetState.childrenVisibility;
    }
  }

  // ... result & inverse
}
```

**关键语义变化**:

| 状态 | childrenVisibility[childId] 值 | 含义 |
|------|-------------------------------|------|
| default | 不存在 | 子元素可见（默认行为） |
| default | `false` | 子元素在默认状态下隐藏 |
| 非 default | 不存在 | **继承默认状态**（之前是"可见"） |
| 非 default | `true` | 显式覆盖：在此状态下可见（即使默认隐藏） |
| 非 default | `false` | 显式覆盖：在此状态下隐藏（即使默认可见） |
| 非 default | `undefined`（删除 key） | **重置为继承默认** |

### 2.4 修复 resolveNodeProps 中的 childrenVisibility

**文件**: `features/design-engine/src/styles/resolveProps.ts`

当前 `resolveNodeProps` 中没有处理 childrenVisibility（这是在 SchemaRenderer 中处理的），
但需要确保 `resolveNodeProps` 的 visible 解析逻辑不会与 childrenVisibility 冲突。

无需修改此文件，childrenVisibility 的合并逻辑在 SchemaRenderer 中处理。

### 2.5 PropsTab 状态感知

**文件**: `apps/design_front/src/views/editor/panels/tabs/PropsTab/index.tsx`

参照 StylesTab 的实现模式，让 PropsTab 感知当前编辑状态：

```typescript
// 在 PropsTab 中:

const effectiveState = parentStateOverride ?? nodeActiveState;

const handlePropChange = (key: string, value: unknown) => {
  if (effectiveState === 'default') {
    editorStore.execute({
      type: 'updateComponentProps',
      params: { nodeId, props: { [key]: value } },
    });
  } else {
    editorStore.execute({
      type: 'updateState',
      params: { nodeId, stateName: effectiveState, props: { [key]: value } },
    });
  }
};

// 显示值时，合并 base + state delta:
const baseProps = node.props;
const stateProps = effectiveState !== 'default'
  ? node.states?.find(s => s.name === effectiveState)?.props
  : undefined;
const mergedProps = { ...baseProps, ...(stateProps ?? {}) };

// 计算哪些 props 是被当前状态覆盖的:
const overriddenPropKeys = new Set(Object.keys(stateProps ?? {}));
```

### 2.6 NodeVisibilityCondition 重构

**文件**: `apps/design_front/src/views/editor/panels/RightPanel/NodeVisibilityCondition.tsx`

当前组件以「此子元素在哪些状态下可见」的全局视角编辑。
需要改为「按当前编辑状态编辑」+ 「概览所有状态」的模式。

核心变更：

```typescript
// 获取当前编辑状态
const currentEditState = editorStore.stateContext.componentStateEditing
  ?? editorStore.stateContext.interactionState
  ?? 'default';

// 计算当前子元素在当前编辑状态下的可见性
const defaultState = parent.states?.find(s => s.name === 'default');
const currentState = parent.states?.find(s => s.name === currentEditState);

const defaultVisible = defaultState?.childrenVisibility?.[node.id] !== false; // 默认基线
const currentExplicit = currentState?.childrenVisibility?.[node.id]; // 当前状态的显式值

const isInherited = currentEditState !== 'default' && currentExplicit === undefined;
const effectiveVisible = isInherited
  ? defaultVisible                    // 继承默认
  : currentExplicit !== false;        // 使用显式值

// 编辑时调用新的 setChildVisibility:
const handleSetVisible = (visible: boolean | undefined) => {
  editorStore.execute({
    type: 'setChildVisibility',
    params: {
      parentNodeId: parent.id,
      childNodeId: node.id,
      stateName: currentEditState,
      visible,
    },
  });
};
```

### 2.7 ChildrenVisibilitySection 重构

**文件**: `apps/design_front/src/views/editor/panels/RightPanel/ChildrenVisibilitySection.tsx`

同样改为状态感知模式：

```typescript
// 在当前编辑状态的上下文下显示子元素可见性
// 每个子元素行显示:
//   - 在当前状态下的可见性（继承 or 覆盖）
//   - 修改时写入当前状态的 childrenVisibility
```

---

## 三、数据迁移兼容

### 3.1 向后兼容

**现有 Schema 数据**中 `childrenVisibility` 的含义会发生变化：

- **旧语义**: 每个状态独立记录可见性，不存在继承关系
- **新语义**: 非 default 状态的 `childrenVisibility` 是差异覆盖

**兼容策略**: 新渲染逻辑（合并 default + active）对旧数据是向后兼容的：

```
旧数据中 default 和 error 都有完整的 childrenVisibility：
  default.childrenVisibility = { errTip: false, successTip: false }
  error.childrenVisibility = { errTip: false, successTip: false }  (被旧 setChildVisibility 写入)

新合并逻辑：
  merged = { ...default.cv, ...error.cv }
         = { errTip: false, successTip: false }
  结果与旧行为一致 ✅（因为旧操作把所有状态都写全了）

新数据（只有 error 覆盖了 errTip）：
  default.childrenVisibility = { errTip: false, successTip: false }
  error.childrenVisibility = { errTip: true }  ← 只有差异

新合并逻辑：
  merged = { errTip: false, successTip: false } + { errTip: true }
         = { errTip: true, successTip: false }
  正确 ✅
```

因此**不需要数据迁移**，新旧数据都兼容。

### 3.2 旧操作的清理

虽然旧数据兼容，但 `setChildVisibility` 旧版操作参数需要保持接受，建议：
- 新 API: `{ stateName, visible }` 模式
- 保留对旧 API `{ visibleInStates }` 的兼容处理（内部转换为按状态写入）

---

## 四、变更清单

按优先级排列的变更文件清单：

### P0 — 核心修复

| # | 文件 | 变更 | 说明 |
|---|------|------|------|
| 1 | `features/design-engine/src/styles/resolveStateOverrides.ts` | **新建** | 通用 `mergeStateMaps` 合并函数 |
| 2 | `features/design-engine/src/renderer/SchemaRenderer.tsx` | **修改** | cvMap/csMap 计算改为 default + active 合并 |
| 3 | `features/design-operations/src/operations/state.ts` | **修改** | `executeSetChildVisibility` 改为按状态写入 |
| 4 | `features/design-operations/src/types.ts` | **修改** | `SetChildVisibilityOp` 参数类型更新 |

### P1 — 编辑体验

| # | 文件 | 变更 | 说明 |
|---|------|------|------|
| 5 | `apps/design_front/.../tabs/PropsTab/index.tsx` | **修改** | 状态感知：非默认状态写 state.props |
| 6 | `apps/design_front/.../RightPanel/NodeVisibilityCondition.tsx` | **重构** | 按当前编辑状态显示/编辑可见性 |
| 7 | `apps/design_front/.../RightPanel/ChildrenVisibilitySection.tsx` | **重构** | 状态感知的子元素可见性编辑 |

### P2 — 增强

| # | 文件 | 变更 | 说明 |
|---|------|------|------|
| 8 | `apps/design_front/.../tabs/StylesTab/index.tsx` | **增强** | 属性行添加「重置为默认」操作 |
| 9 | `apps/design_front/.../tabs/PropsTab/index.tsx` | **增强** | 属性行覆盖/继承标记 |

---

## 五、测试验证场景

### 5.1 childrenVisibility 继承验证

```
准备: 容器 A 有三个子元素 (X, Y, Z) 和三个自定义状态 (default, error, success)

场景 1: 默认隐藏 + 特定状态覆盖
  1. 在 default 状态下设置 Y 为隐藏
  2. 切换到 error 状态 → Y 应该继承默认，仍然隐藏 ✅
  3. 在 error 状态下设置 Y 为可见（显式覆盖）
  4. 切换到 success 状态 → Y 应该继承默认，仍然隐藏 ✅
  5. 切换到 error 状态 → Y 应该显示（覆盖值） ✅
  6. 修改 default 下 Z 为隐藏 → error 和 success 的 Z 都应该隐藏 ✅
  7. error 的 Y 可见性不受步骤 6 影响 ✅

场景 2: 新增状态继承
  1. 在 default 状态下设置 Y 为隐藏
  2. 新增 loading 状态
  3. loading 状态下 Y 应该继承默认 → 隐藏 ✅

场景 3: 重置覆盖
  1. error 状态下 Y 有显式覆盖（可见）
  2. 执行「重置为默认」→ 删除 error.childrenVisibility[Y]
  3. error 状态下 Y 恢复继承默认 → 隐藏 ✅
```

### 5.2 props 状态编辑验证

```
场景: input 节点有 placeholder 属性

  1. 默认状态下 placeholder = "请输入邮箱"
  2. 切换到 error 状态，修改 placeholder = "邮箱格式错误"
     → 应该写入 error.state.props.placeholder ✅
     → 默认状态的 placeholder 不变 ✅
  3. 切换回默认，修改 placeholder = "请输入您的邮箱"
     → success 状态继承新的 placeholder ✅
     → error 状态保持自己的覆盖值 "邮箱格式错误" ✅
```

### 5.3 全景预览验证

```
场景: 全景视图中切换状态预览

  1. 全景视图 default 卡片 → 显示默认的子元素可见性
  2. 全景视图 error 卡片 → 显示合并后的子元素可见性
  3. 全景视图 success 卡片 → 显示继承默认的子元素可见性
  4. 所有卡片的样式/属性都应正确合并显示
```
