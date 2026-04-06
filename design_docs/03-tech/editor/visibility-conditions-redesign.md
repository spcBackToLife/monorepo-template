# 显示条件重新设计 — 技术实现规划

> 产品方案：[显示条件重新设计 — 产品方案](../../02-product/editor/04-state-system/visibility-conditions-redesign.md)

---

## 一、现状分析

### 1.1 可见性相关代码分布

| 模块 | 文件 | 职责 | 现状 |
|------|------|------|------|
| **design-schema** | `types/node.ts` | `node.visible`, `visibilityWhen` 类型定义 | ✅ 已定义 |
| **design-schema** | `types/state.ts` | `ComponentState.childrenVisibility` | ✅ 已定义 |
| **design-schema** | `types/domainState.ts` | `DomainStateBinding.visible` | ✅ 已定义 |
| **design-schema** | `types/environment.ts` | `EnvironmentStateBinding.visible` | ✅ 已定义 |
| **design-engine** | `styles/resolveProps.ts` | 4 层 props + visible 解算 | ⚠️ `visibilityWhen` 注释中提到但未实现 |
| **design-engine** | `renderer/SchemaRenderer.tsx` | `childrenVisibility` 合并 + Ghost 渲染 | ✅ 已实现合并 |
| **design-operations** | `operations/state.ts` | `setChildVisibility` 操作 | ✅ 按状态写入 |
| **design-operations** | `operations/element.ts` | `setVisibilityWhen` 操作 | ✅ 已定义 |
| **design_front** | `NodeVisibilityCondition.tsx` | 显示条件面板 UI | ⚠️ 有 bug（已修复），设计过于简单 |

### 1.2 关键 Bug（已修复）

`NodeVisibilityCondition.tsx` 中 `defaultState` 从 `customStates`（已过滤 'default'）查找，
导致永远为 `undefined`，"默认状态下隐藏" 无法选中。

修复：改为从 `parent.states` 查找。

---

## 二、实施计划

### Phase 1: 基础改版（P0/P1）

#### 任务 1.1: 重写 NodeVisibilityCondition 组件

**目标**：将当前的 radio 按钮 UI 改为状态矩阵视图。

**当前代码问题**：
```
当前 UI: 两个 radio 按钮
  ○ 默认状态下显示
  ○ 默认状态下隐藏

用户理解困难，且只能配置 default 状态，无法直接看到/编辑其他状态的可见性。
```

**目标 UI**：
```
可见性

父容器「EmailGroup」状态条件:
┌───────────┬──────┬────────────┐
│ default   │ 🔴   │ 基线       │
│ error     │ 🟢   │ ● 覆盖 [↩] │
│ success   │ 🔴   │ 继承默认   │
│ loading   │ 🔴   │ 继承默认   │
└───────────┴──────┴────────────┘
```

**实现要点**：
- 从 `parent.states` 获取所有状态（包括 default）
- 对每个状态计算可见性和继承关系
- 每行可以直接点击切换可见性
- 覆盖行显示重置按钮
- 继承行显示灰色文字

**组件 Props 和状态**：
```typescript
interface StateVisibilityRow {
  stateName: string;
  visible: boolean;
  source: 'baseline' | 'overridden' | 'inherited';
  defaultVisible: boolean;
}

function computeStateVisibilityRows(
  parent: ComponentNode,
  childId: string,
): StateVisibilityRow[] {
  const allStates = parent.states ?? [];
  const defaultState = allStates.find(s => s.name === 'default');
  const defaultVisible = defaultState?.childrenVisibility?.[childId] !== false;
  const customStates = allStates.filter(s => !BUILT_IN_STATES.has(s.name));

  return customStates.map(state => {
    if (state.name === 'default') {
      return {
        stateName: 'default',
        visible: defaultVisible,
        source: 'baseline',
        defaultVisible,
      };
    }
    const explicit = state.childrenVisibility?.[childId];
    const inherited = explicit === undefined;
    return {
      stateName: state.name,
      visible: inherited ? defaultVisible : (explicit !== false),
      source: inherited ? 'inherited' : 'overridden',
      defaultVisible,
    };
  });
}
```

**事件处理**：
```typescript
function handleToggleVisibility(stateName: string, visible: boolean) {
  editorStore.execute({
    type: 'setChildVisibility',
    params: {
      parentNodeId: parent.id,
      childNodeId: node.id,
      stateName,
      visible,
    },
  });
}

function handleResetToDefault(stateName: string) {
  editorStore.execute({
    type: 'setChildVisibility',
    params: {
      parentNodeId: parent.id,
      childNodeId: node.id,
      stateName,
      visible: undefined,
    },
  });
}
```

#### 任务 1.2: 无父容器状态时的简洁展示

当父容器没有自定义业务状态时，面板显示「始终可见」而非空白：

```typescript
if (customStates.length === 0) {
  return (
    <div className="...">
      <span>可见性</span>
      <span>始终可见</span>
    </div>
  );
}
```

#### 任务 1.3: 面板标题改名

从「显示条件」改为「可见性」，更准确更通用。

#### 任务 1.4: 实现 visibilityWhen 渲染

在 `resolveNodeProps.ts` 中添加第 5 层：

```typescript
// Layer 5: visibilityWhen
if (visible && node.visibilityWhen) {
  const { variableName, equals } = node.visibilityWhen;
  const currentValue = globalStates[variableName];
  if (currentValue !== undefined && currentValue !== equals) {
    visible = false;
  }
}
```

---

### Phase 2: 条件扩展（P1/P2）

#### 任务 2.1: 聚合展示领域/环境状态的可见性条件

在面板中展示来自 `domainStateBindings` 和 `environmentBindings` 的可见性设置。

**展示方式**：
```
可见性

父容器状态条件:
  ... (矩阵视图)

变量条件:
  📋 当 userRole = admin 时: 隐藏
  📋 当 theme = dark 时: 隐藏

来自: 领域状态绑定
```

**实现**：
- 遍历 `node.domainStateBindings` 和 `node.environmentBindings`
- 筛选出 `visible !== undefined` 的绑定
- 以只读方式展示（编辑跳转到相应的绑定面板）

#### 任务 2.2: visibilityWhen 编辑器 UI

提供添加简单变量条件的 UI：

```typescript
interface VisibilityWhenEditor {
  variableName: string;
  equals: string;
}
```

UI：
```
+ 添加变量条件
  当 [变量名 ▾] = [值 ▾] 时显示
```

调用 `setVisibilityWhen` 操作保存。

#### 任务 2.3: visibilityWhen schema 扩展（远期准备）

当需要支持多条件时，扩展 `visibilityWhen` 为数组：

```typescript
// 兼容策略：
// 旧数据: visibilityWhen: { variableName, equals }
// 新数据: visibilityConditions: VisibilityCondition[]
//
// 渲染时：两者都检查
// 编辑时：新条件写入 visibilityConditions
// 迁移：读到旧格式时转为新格式写回
```

---

## 三、文件变更清单

### Phase 1 变更

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/design_front/.../NodeVisibilityCondition.tsx` | **重写** | 矩阵视图 + 简洁展示 |
| `features/design-engine/src/styles/resolveProps.ts` | **修改** | 添加 visibilityWhen 第 5 层 |
| `apps/design_front/.../RightPanel/index.tsx` | **修改** | 面板标题改名 |

### Phase 2 变更

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/design_front/.../NodeVisibilityCondition.tsx` | **扩展** | 聚合展示其他条件来源 |
| `features/design-schema/src/types/node.ts` | **扩展** | visibilityConditions 类型（远期） |
| `features/design-engine/src/styles/resolveProps.ts` | **扩展** | 支持条件数组 |
| `features/design-operations/src/operations/element.ts` | **扩展** | 条件 CRUD 操作 |

---

## 四、风险评估

| 风险 | 影响 | 应对 |
|------|------|------|
| visibilityWhen schema 变更不兼容 | 旧数据无法解析 | 保持旧字段兼容，新字段独立；渲染两者都检查 |
| 多条件组合导致意外隐藏 | 用户无法定位原因 | 面板底部显示「当前有效可见性」和原因分析 |
| 父容器状态条件 + 变量条件同时存在 | 解算顺序不明确 | 文档化：AND 逻辑，任一条件导致隐藏则不可见 |
| 性能：多条件解算 | 大量元素时渲染变慢 | 条件数通常 < 5，影响可忽略 |

---

## 五、测试要点

### Phase 1

1. 父容器有自定义状态时，矩阵视图正确显示每个状态的可见性
2. 点击矩阵行可以正确切换可见性
3. 继承关系正确：修改 default 的可见性，未覆盖的状态跟随
4. 覆盖行的重置按钮正确移除覆盖
5. 父容器无自定义状态时显示「始终可见」
6. `visibilityWhen` 在渲染时正确生效

### Phase 2

7. 面板正确聚合领域/环境状态的可见性条件
8. 变量条件编辑器正确保存和读取
9. 多条件 AND 逻辑正确
