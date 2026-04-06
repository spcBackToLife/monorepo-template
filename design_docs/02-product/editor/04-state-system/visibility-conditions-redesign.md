# 显示条件重新设计 — 统一可见性条件系统

> **核心问题：元素的显示/隐藏应该由谁决定？怎么配置？用户如何理解？**
>
> 前置文档：
> - [04-状态管理系统](./README.md) — 三层状态模型
> - [状态属性继承](./state-property-inheritance.md) — 默认+差异继承模型
>
> 技术方案：[显示条件重新设计 — 技术方案](../../../03-tech/editor/visibility-conditions-redesign.md)

---

## 一、第一性原理分析

### 1.1 根本问题

**「显示条件」回答的是：一个 UI 元素什么时候可见？**

这是一个看似简单、实际极为复杂的问题。在真实的 UI 中，一个元素是否可见可能取决于：

```
一个「错误提示」元素的显示取决于：
  ✦ 父容器当前处于 error 状态（组件状态条件）
  ✦ 且表单已经提交过（变量条件：formSubmitted = true）
  ✦ 且不处于加载中（变量条件：isLoading ≠ true）

一个「管理员操作按钮」的显示取决于：
  ✦ 用户角色 = admin（领域状态条件）

一个「空状态占位」的显示取决于：
  ✦ 数据列表为空（数据条件：items.length === 0）

一个「高级设置面板」的显示取决于：
  ✦ 用户点击了「展开高级设置」（交互事件驱动）
```

可见性不是一个简单的开关，而是一个**多因素的条件表达式**。

### 1.2 当前设计的问题

当前「显示条件」面板有以下根本问题：

**问题 1：只覆盖了一种条件来源**

系统中至少有 5 种可以控制可见性的机制：

| 机制 | 存储位置 | 有渲染支持？ | 有编辑器 UI？ | 在「显示条件」中展示？ |
|------|---------|------------|-------------|-------------------|
| 基础开关 | `node.visible` | ✅ | ✅ (图层树眼睛) | ❌ |
| 父容器状态 | `parent.states[x].childrenVisibility` | ✅ | ✅ (当前面板) | ✅ (唯一展示的) |
| 领域状态 | `node.domainStateBindings[].visible` | ✅ | ⚠️ (分散在其他面板) | ❌ |
| 环境状态 | `node.environmentBindings[].visible` | ✅ | ⚠️ (分散在其他面板) | ❌ |
| 简单条件 | `node.visibilityWhen` | ❌ (未实现!) | ❌ | ❌ |

**结果：用户看到的「显示条件」面板只展示了冰山一角。**

**问题 2：心智模型混乱**

当前面板的 UI 是「默认状态下显示 / 默认状态下隐藏」—— 这让用户困惑：
- 「默认状态」是谁的？（实际是父容器的 default 业务状态）
- 为什么只有两个选项？（实际可以按每个状态分别配置）
- 修改了看不到效果？（因为 bug + 概念不清）

用户的自然思维是：**「我想让这个元素在什么条件下显示」**，而不是「我要修改父容器 default 状态的 childrenVisibility 字段」。

**问题 3：条件不可组合**

现实需求经常是多条件组合：
- 「当父容器为 error 状态 **且** formSubmitted 为 true 时显示」
- 「当 userRole 为 admin **或** 处于 debug 模式时显示」

当前设计无法表达这种组合。

### 1.3 竞品参考

| 工具 | 可见性条件设计 |
|------|-------------|
| **Figma** | 无条件显示/隐藏（眼睛图标）；Variant 切换实现不同状态 |
| **Framer** | 条件可见性：`Show when [variable] [operator] [value]`，支持多条件 AND |
| **Webflow** | 条件可见性：基于 CMS 字段值、自定义属性、断点 |
| **Builder.io** | 条件绑定：`visible when expression is truthy` |

**Framer 的模型最值得借鉴**：条件是自描述的、可组合的、统一的。

---

## 二、目标设计

### 2.1 设计原则

**原则 1：元素自描述**
- 可见性条件应该从元素自身的视角表达：「我在什么条件下可见」
- 而不是从父容器视角：「父容器在什么状态时我被设置为可见」

**原则 2：统一面板**
- 所有影响可见性的因素在同一个面板中展示
- 用户不需要去不同地方找不同的可见性设置

**原则 3：条件可组合**
- 支持多个条件的 AND 组合
- 每个条件独立可增删
- 未来可扩展 OR 逻辑

**原则 4：存储解耦**
- UI 统一展示，但底层存储可以分散在不同字段
- 这样不需要大规模数据迁移

### 2.2 条件类型

| 类型 | 表达 | 底层存储 | 优先级 |
|------|------|---------|-------|
| **父容器状态** | 「当父容器为 [状态] 时: 显示/隐藏」 | `parent.states[x].childrenVisibility` | 就近 |
| **变量条件** | 「当 [变量名] [运算符] [值] 时: 显示」 | `node.visibilityWhen`（扩展） | 节点级 |
| **领域状态** | 「当 [业务变量] = [值] 时: 显示/隐藏」 | `node.domainStateBindings[].visible` | 同上 |
| **数据条件** | 「当 {{表达式}} 为真时: 显示」 | `node.visibilityWhen`（扩展） | 同上 |

### 2.3 条件解算

```
最终可见性 = node.visible
             AND (所有父容器状态条件通过)
             AND (所有变量条件通过)
             AND (所有领域/环境状态条件通过)
```

多个条件之间默认为 **AND** 关系（全部满足才可见）。

---

## 三、面板 UI 设计

### 3.1 无条件时（大多数元素）

大多数元素没有任何可见性条件，面板保持极简：

```
┌─────────────────────────────────────────┐
│  可见性                                 │
│                                         │
│  始终可见 ✅                             │
│                                         │
│  [+ 添加显示条件]                        │
└─────────────────────────────────────────┘
```

### 3.2 有父容器状态条件时

当父容器有自定义业务状态时，显示按状态分列的可见性矩阵：

```
┌─────────────────────────────────────────┐
│  可见性                                 │
│                                         │
│  父容器「EmailGroup」状态决定：          │
│                                         │
│  ┌─────────┬──────┬──────────────────┐  │
│  │ 状态     │ 可见  │ 来源            │  │
│  ├─────────┼──────┼──────────────────┤  │
│  │ default │ 🔴 隐藏│ 基线            │  │
│  │ error   │ 🟢 显示│ ● 已覆盖  [↩]  │  │
│  │ success │ 🔴 隐藏│ 继承默认        │  │
│  │ loading │ 🔴 隐藏│ 继承默认        │  │
│  └─────────┴──────┴──────────────────┘  │
│                                         │
│  [+ 添加其他条件]                        │
└─────────────────────────────────────────┘
```

交互说明：
- 点击可见性列的 🟢/🔴 图标可以切换该状态下的可见性
- 点击「已覆盖」行的 [↩] 可以重置为继承默认
- 「继承默认」的行点击修改后自动变为「已覆盖」

### 3.3 有多种条件组合时

```
┌─────────────────────────────────────────┐
│  可见性                              ▾  │
│                                         │
│  条件 1: 父容器状态                      │
│  ┌─────────┬──────┬────────────────┐    │
│  │ default │ 🔴 隐藏│ 基线          │    │
│  │ error   │ 🟢 显示│ ● 覆盖  [↩]  │    │
│  └─────────┴──────┴────────────────┘    │
│                                         │
│  AND                                    │
│                                         │
│  条件 2: 变量条件                        │
│  当 [formSubmitted ▾] [= ▾] [true ▾]    │
│  满足时显示                           🗑  │
│                                         │
│  [+ 添加条件]                            │
│                                         │
│  ─── 当前状态 ────────────────────────── │
│  有效可见性: 🟢 可见                      │
│  原因: 父容器=error ✅ formSubmitted ✅    │
└─────────────────────────────────────────┘
```

### 3.4 添加条件的弹窗

```
┌─────────────────────────────────────────┐
│  添加显示条件                            │
│                                         │
│  条件类型:                               │
│                                         │
│  ○ 父容器状态                           │
│    当父容器处于指定状态时显示/隐藏         │
│                                         │
│  ○ 变量条件                             │
│    当某个状态变量满足条件时显示            │
│                                         │
│  ○ 表达式                               │
│    当数据表达式为真时显示（高级）          │
│                                         │
│                    [取消]  [添加]         │
└─────────────────────────────────────────┘
```

### 3.5 没有父容器状态的元素

当元素的父容器没有自定义业务状态时，面板不显示父容器状态条件，
而是直接提供其他条件类型：

```
┌─────────────────────────────────────────┐
│  可见性                                 │
│                                         │
│  始终可见 ✅                             │
│                                         │
│  [+ 添加显示条件]                        │
│    → 变量条件                           │
│    → 表达式条件                          │
└─────────────────────────────────────────┘
```

---

## 四、数据模型设计

### 4.1 扩展 visibilityWhen

当前 `visibilityWhen` 的 schema 过于简单（只支持 `variableName equals value`），
扩展为支持更多运算符和来源：

```typescript
// 当前（过于简单）
visibilityWhen?: {
  variableName: string;
  equals: string;
};

// 扩展后
visibilityWhen?: VisibilityCondition[];

interface VisibilityCondition {
  id: string;
  type: 'variable' | 'expression';

  // type === 'variable' 时
  variable?: {
    name: string;
    operator: 'equals' | 'notEquals' | 'exists' | 'notExists';
    value?: string;
  };

  // type === 'expression' 时（远期）
  expression?: string;  // e.g., "{{data.items.length > 0}}"
}
```

### 4.2 父容器状态条件（存储不变）

父容器状态驱动的可见性继续使用现有的 `childrenVisibility` 存储，
遵循已设计的「默认+差异」继承模型。

UI 面板将这些分散的存储统一展示。

### 4.3 数据兼容性

| 变更 | 是否需要迁移 | 说明 |
|------|------------|------|
| `visibilityWhen` 从单条件扩展为数组 | 需要 | 旧格式 `{variableName, equals}` → 转为 `[{type:'variable', variable:{name, operator:'equals', value}}]` |
| `childrenVisibility` | 不需要 | 存储不变，仅 UI 展示方式改变 |
| `domainStateBindings[].visible` | 不需要 | 存储不变，面板统一展示 |

---

## 五、条件解算流程

### 5.1 渲染时的可见性解算

```
resolveVisibility(node, parent, globalStates, dataContext):

  // 第 0 步：基础开关
  if node.visible === false → 不可见

  // 第 1 步：父容器状态条件
  if parent 有 childrenVisibility:
    合并 default + active state 的 childrenVisibility
    if cvMap[node.id] === false → 不可见

  // 第 2 步：领域/环境状态条件
  遍历 node.domainStateBindings:
    if binding 匹配当前 globalStates AND binding.visible === false → 不可见
  遍历 node.environmentBindings:
    if binding 匹配当前 globalStates AND binding.visible === false → 不可见

  // 第 3 步：变量条件 (visibilityWhen)
  遍历 node.visibilityWhen (扩展后的数组):
    if 任一条件不满足 → 不可见（AND 逻辑）

  // 通过所有条件 → 可见
```

### 5.2 编辑器中的条件读取

面板需要从多个来源聚合条件信息：

```
aggregateVisibilityInfo(node, parent, globalStates):

  conditions = []

  // 来源 1: 父容器状态
  if parent 有自定义业务状态:
    for each state in parent.states:
      conditions.push({
        source: 'parentState',
        stateName: state.name,
        visible: computeVisibilityInState(parent, node.id, state.name),
        isOverridden: state.childrenVisibility?.[node.id] !== undefined,
      })

  // 来源 2: 领域状态绑定
  for each binding in node.domainStateBindings where binding.visible !== undefined:
    conditions.push({
      source: 'domainState',
      variableName: binding.variableName,
      value: binding.value,
      visible: binding.visible,
    })

  // 来源 3: 环境状态绑定
  for each binding in node.environmentBindings where binding.visible !== undefined:
    conditions.push({
      source: 'environmentState',
      variableName: binding.variableName,
      value: binding.value,
      visible: binding.visible,
    })

  // 来源 4: visibilityWhen
  for each condition in node.visibilityWhen:
    conditions.push({
      source: 'condition',
      ...condition,
    })

  return conditions
```

---

## 六、与现有系统的关系

### 6.1 与状态属性继承的关系

父容器状态条件部分完全复用「默认+差异」继承模型：
- default 状态的 `childrenVisibility` 是基线
- 其他状态仅存储差异覆盖
- 渲染时合并

本方案不改变这个机制，只改变 UI 的展示方式。

### 6.2 与三层状态模型的关系

| 状态层 | 在可见性中的角色 |
|--------|--------------|
| 交互状态 (hover/active/focus) | 通常不影响可见性（但技术上可以通过 childrenVisibility） |
| 业务状态 (error/loading/...) | 主要的可见性控制手段 → 父容器状态条件 |
| 全局状态 (domain/environment) | 跨组件的可见性控制 → 变量条件 |

### 6.3 与数据驱动系统的关系

表达式条件 (`{{data.items.length > 0}}`) 依赖数据上下文，
与数据驱动系统共享表达式解析能力（`resolveExpression`）。

---

## 七、实施优先级

### Phase 1（修复 + 基础改版）

| 项目 | 描述 | 优先级 |
|------|------|-------|
| 修复 defaultState 查找 bug | `customStates` 过滤掉了 default，导致 UI 不更新 | **P0 ✅ 已完成** |
| 父容器状态条件矩阵视图 | 将当前面板改为按状态分列的矩阵，每行可独立切换 | **P0** |
| 无条件时的简洁展示 | 没有父容器状态时显示「始终可见」 | **P0** |
| `visibilityWhen` 渲染实现 | 在 `resolveNodeProps` 中实现第 5 层 | **P1** |

### Phase 2（条件扩展）

| 项目 | 描述 | 优先级 |
|------|------|-------|
| 变量条件 UI | 添加条件弹窗 + 变量选择 | **P1** |
| `visibilityWhen` schema 扩展 | 从单条件扩展为条件数组 | **P1** |
| 领域/环境状态条件聚合展示 | 在面板中展示来自 domainStateBindings 的可见性设置 | **P2** |

### Phase 3（高级功能 — 远期）

| 项目 | 描述 | 优先级 |
|------|------|-------|
| 表达式条件 | `{{data.items.length > 0}}` 类型的条件 | P3 |
| OR 逻辑 | 条件之间支持 AND/OR 切换 | P3 |
| 条件组 | 复杂的嵌套条件逻辑 | P3 |

---

## 八、设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 面板名称 | 「可见性」而非「显示条件」 | 更准确、更通用 |
| 条件逻辑 | 默认 AND | 覆盖 80% 场景；OR 作为远期扩展 |
| 父状态条件的展示方式 | 矩阵视图（每状态一行） | 比 radio 按钮清晰，一目了然 |
| 存储是否统一 | 不统一（保持分散） | 避免大规模迁移；UI 层面统一展示即可 |
| `visibilityWhen` 扩展为数组 | 是 | 单条件太弱，数组支持多条件 AND |
| 条件来源是否在面板标注 | 是 | 帮助用户理解条件来自哪里 |
