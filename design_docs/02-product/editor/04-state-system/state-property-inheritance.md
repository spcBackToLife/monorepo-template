# 状态属性继承机制 — 产品方案

> **核心问题：如何让「一份 Schema + N 套状态覆盖」在编辑和渲染中保持一致？**
>
> 前置文档：[04-状态管理系统](./README.md)
>
> 技术方案：[状态属性继承 — 技术方案](../../../03-tech/editor/state-property-inheritance.md)

---

## 一、问题分析（第一性原理）

### 1.1 设计意图回溯

04-状态管理系统的核心设计理念是：

```
一份 Schema + N 套状态覆盖 = 所有状态的 UI 表达

每个状态只定义「与默认状态不同的部分」（差异覆盖 / Delta）。
```

这意味着：
- **默认状态是所有状态的基线**
- 其他状态只存储差异属性
- 渲染时 = 默认属性 + 当前状态的差异属性
- 编辑默认状态 → 所有未覆盖的属性跟着变
- 编辑某状态的某属性 → 该属性成为该状态的「显式覆盖」，不再跟随默认

### 1.2 当前问题

**该设计理念在样式（styles）上实现正确，但在其他属性维度上存在不一致。**

用一个登录表单的例子说明：

```
场景：登录页的 EmailGroup 容器节点，有三个自定义状态：default / error / success

子元素：
  - 邮箱输入框
  - 错误提示文字（"请输入有效的邮箱地址"）
  - 成功提示文字（"验证通过"）

期望行为：
  default 状态 → 显示输入框，隐藏错误提示和成功提示
  error 状态   → 显示输入框 + 错误提示，隐藏成功提示
  success 状态 → 显示输入框 + 成功提示，隐藏错误提示

现在的问题：设计师通过「显示条件」为 error 状态设置了错误提示可见。
此时如果修改 default 状态下的其他属性（比如输入框边框颜色），
error 状态应该继承这个变化（因为 error 状态没有覆盖边框颜色），
但 error 状态自己设置的「错误提示可见」不应被影响。
```

### 1.3 问题根因诊断

将所有状态相关属性按「默认 + 差异」模型的实现状态分类：

| 属性维度 | 基线存储 | 差异存储 | 编辑器感知状态？ | 渲染时合并？ | 状态 |
|----------|---------|---------|---------------|------------|------|
| **styles** | `node.styles` | `state.styles` | ✅ 是 | ✅ `{...base, ...delta}` | **正确** |
| **props** | `node.props` | `state.props` | ❌ 否（始终写 node.props） | ✅ `{...base, ...delta}` | **编辑缺陷** |
| **childrenVisibility** | 无基线 | `state.childrenVisibility` | ❌ 一次写所有状态 | ❌ 无合并 | **设计缺陷** |
| **childrenStates** | 无基线 | `state.childrenStates` | ✅ 按状态编辑 | ❌ 无合并 | **渲染缺陷** |

**根因：「默认 + 差异」模型没有一致性地贯穿所有属性维度。**

---

## 二、目标设计

### 2.1 统一的继承模型

所有状态属性都遵循同一套规则：

```
                    ┌──────────────────────────────────────────┐
                    │           状态属性继承模型                 │
                    │                                          │
                    │  ┌────────────────────────────────────┐  │
                    │  │  默认状态 (default) = 基线          │  │
                    │  │                                    │  │
                    │  │  styles: { bg: blue, color: white } │  │
                    │  │  props: { placeholder: "邮箱" }     │  │
                    │  │  childVis: { errTip: false }        │  │
                    │  │  childStates: { icon: "normal" }    │  │
                    │  └─────────┬──────────────────────────┘  │
                    │            │                              │
                    │         继承（未覆盖的属性跟随默认）        │
                    │            │                              │
                    │  ┌─────────▼──────────────────────────┐  │
                    │  │  error 状态 = 默认 + 差异           │  │
                    │  │                                    │  │
                    │  │  styles: { borderColor: red }       │  │ ← 只覆盖了边框色
                    │  │  props: (无覆盖 → 继承默认)          │  │
                    │  │  childVis: { errTip: true }         │  │ ← 只覆盖了错误提示可见
                    │  │  childStates: (无覆盖 → 继承默认)    │  │
                    │  └────────────────────────────────────┘  │
                    │                                          │
                    │  最终 error 的渲染结果：                   │
                    │  styles: { bg: blue, color: white,       │
                    │            borderColor: red }             │  ← 合并
                    │  childVis: { errTip: true }               │  ← 差异优先
                    │                                          │
                    └──────────────────────────────────────────┘
```

### 2.2 核心规则

**规则 1：默认状态是基线**
- 默认状态的所有属性（styles / props / childrenVisibility / childrenStates）作为基线
- 所有其他状态**继承**默认状态的全部属性

**规则 2：差异覆盖**
- 非默认状态仅存储与默认不同的属性（delta）
- 有覆盖值 → 使用覆盖值
- 无覆盖值 → 自动继承默认值

**规则 3：编辑传播**
- 编辑默认状态的属性 → 所有未覆盖该属性的状态自动跟随变化
- 编辑某状态的属性 → 该属性成为「显式覆盖」，后续不再跟随默认变化

**规则 4：可重置**
- 非默认状态的任何覆盖值都可以「重置为默认」
- 重置后该属性恢复继承默认值

---

## 三、各属性维度的行为定义

### 3.1 样式（styles）— 当前已正确，保持不变

```
编辑默认状态的 background:
  → 所有没有覆盖 background 的状态自动跟随
  → error 状态如果覆盖了 borderColor 但没覆盖 background
    → error 的 background 跟随默认变化 ✅
    → error 的 borderColor 保持自己的覆盖值 ✅
```

### 3.2 元素属性（props）— 需修复编辑器

```
当前行为（有问题）：
  切换到 error 状态后修改 placeholder
  → 写入 node.props.placeholder（修改了默认！）
  → 所有状态都看到修改后的 placeholder

期望行为：
  切换到 error 状态后修改 placeholder
  → 写入 error.state.props.placeholder（仅 error 的覆盖）
  → 其他状态不受影响
  → 切换回 default 修改 placeholder
  → 没有覆盖 placeholder 的状态跟随变化
  → error 状态保持自己的覆盖值
```

### 3.3 子元素可见性（childrenVisibility）— 需重新设计

```
当前行为（有问题）：
  为 error 状态设置「错误提示可见」
  → setChildVisibility 一次性写入所有状态的 childrenVisibility
  → default 状态: errTip = false
  → error 状态: errTip = true（显式）
  → success 状态: errTip = false（但这是被动写入的，不是用户显式设置的）

  此时如果新增一个 loading 状态：
  → loading 状态没有 childrenVisibility → 不会隐藏 errTip
  → 但按照设计意图，loading 应该继承 default 的行为（隐藏 errTip）

期望行为：
  default 状态: childrenVisibility = { errTip: false }  ← 基线
  error 状态:   childrenVisibility = { errTip: true }   ← 仅覆盖这一条
  success 状态: childrenVisibility = (无覆盖)            ← 继承 default → errTip 隐藏
  loading 状态: childrenVisibility = (无覆盖)            ← 继承 default → errTip 隐藏

  渲染 error 时:
    合并 = { ...default.childrenVisibility, ...error.childrenVisibility }
         = { errTip: false } 被 { errTip: true } 覆盖
         = { errTip: true } → 错误提示可见 ✅

  渲染 loading 时:
    合并 = { ...default.childrenVisibility, ...loading.childrenVisibility }
         = { errTip: false } 无覆盖
         = { errTip: false } → 错误提示不可见 ✅
```

### 3.4 子元素状态绑定（childrenStates）— 需补充合并

```
期望行为与 childrenVisibility 一致：
  default 状态: childrenStates = { submitBtn: "normal" }    ← 基线
  loading 状态: childrenStates = { submitBtn: "loading" }   ← 覆盖按钮状态
  error 状态:   childrenStates = (无覆盖)                    ← 继承 default

  渲染 loading 时:
    合并 = { submitBtn: "normal" } + { submitBtn: "loading" }
         = { submitBtn: "loading" } ✅

  渲染 error 时:
    合并 = { submitBtn: "normal" } 无覆盖
         = { submitBtn: "normal" } ✅
```

---

## 四、编辑器交互设计

### 4.1 状态切换器中的状态上下文

当用户切换到非默认状态时，**所有可编辑面板**都应感知当前状态上下文：

```
┌─────────────────────────────────────────┐
│  默认  悬停  按下  聚焦  禁用            │
├─────────────────────────────────────────┤
│  自定义  [error ●]  success  loading  + │
├─────────────────────────────────────────┤
│  ● 正在编辑「error」状态                 │
│    覆盖值以蓝色标记                      │
├─────────────────────────────────────────┤
│                                         │
│  内容 ──────────────                    │  ← PropsTab：属性值根据状态显示
│    placeholder: [请输入邮箱]  ● 已覆盖  │     - 有覆盖 → 显示覆盖值 + 蓝点
│    type: [email]              (继承)    │     - 无覆盖 → 显示默认值 + 灰色标
│                                         │
│  外观 ──────────────                    │  ← StylesTab：已实现 ✅
│    borderColor: [red]         ● 已覆盖  │
│    background: [blue]         (继承)    │
│                                         │
│  显示条件 ──────────                    │  ← 子元素可见性：根据当前状态
│    当前状态下：                          │
│    ☑ 邮箱输入框    (继承默认)            │
│    ☑ 错误提示文字  ● 此状态覆盖          │
│    ☐ 成功提示文字  (继承默认)            │
│                                         │
└─────────────────────────────────────────┘
```

### 4.2 属性行的继承/覆盖标记

```
属性行有三种状态：

1. 编辑默认状态时：
   ┌──────────────────────────────────────┐
   │  borderColor  [transparent]          │  ← 正常显示，直接编辑 node.styles
   └──────────────────────────────────────┘

2. 编辑非默认状态时 — 该属性未被覆盖（继承默认）：
   ┌──────────────────────────────────────┐
   │  borderColor  [transparent]  (继承)  │  ← 灰色值 + 继承标记
   │                                      │    修改后 → 变为覆盖
   └──────────────────────────────────────┘

3. 编辑非默认状态时 — 该属性已被覆盖：
   ┌──────────────────────────────────────┐
   │  borderColor  [red]         ● [↩]   │  ← 蓝点标记 + 重置按钮
   │                                      │    点击 [↩] → 删除覆盖，恢复继承
   └──────────────────────────────────────┘
```

### 4.3 子元素可见性的状态编辑

**从子元素视角（NodeVisibilityCondition）：**

当前选中子元素（如「错误提示文字」），面板显示：

```
┌──────────────────────────────────────────┐
│  显示条件                                │
│                                          │
│  当前编辑状态：error                      │
│                                          │
│  (●) 在此状态下显示                       │  ← 编辑当前状态的覆盖
│  ( ) 在此状态下隐藏                       │
│  ( ) 跟随默认（默认为：隐藏）             │  ← 继承模式
│                                          │
│  ─── 各状态概览 ──────────────────────── │
│  default:  隐藏  (基线)                   │
│  error:    显示  ● 已覆盖                 │
│  success:  隐藏  (继承默认)               │
│  loading:  隐藏  (继承默认)               │
└──────────────────────────────────────────┘
```

**从父元素视角（ChildrenVisibilitySection）：**

选中父容器，在「子元素」区域：

```
┌──────────────────────────────────────────┐
│  子元素（当前状态：error）                │
│                                          │
│  ☑ 邮箱输入框      (继承默认)            │
│  ☑ 错误提示文字    ● 此状态覆盖           │
│  ☐ 成功提示文字    (继承默认)            │
│                                          │
│  注：灰色 = 继承默认状态设置              │
│      ● = 当前状态有显式覆盖               │
│      修改后自动成为覆盖                   │
│      右键可重置为继承默认                  │
└──────────────────────────────────────────┘
```

### 4.4 「重置为默认」操作

所有属性维度（styles / props / childrenVisibility / childrenStates）在非默认状态下，
都支持「重置为默认」操作：

```
交互方式：
  1. 属性行右键菜单 → 「重置为默认」
  2. 覆盖标记旁的重置按钮 [↩]

效果：
  - 删除该状态中该属性的覆盖值
  - 该属性恢复为继承默认状态
  - 蓝色覆盖标记消失，变为灰色继承标记
```

---

## 五、边界情况

| 场景 | 行为 |
|------|------|
| 新增状态 | 新状态无任何覆盖，完全继承默认 |
| 删除状态 | 该状态的所有覆盖值一起删除 |
| 编辑默认状态的属性 | 所有未覆盖该属性的状态自动跟随变化 |
| 编辑默认状态的子元素可见性 | 所有未覆盖该子元素可见性的状态自动跟随 |
| 非默认状态编辑属性后切换回默认 | 默认状态显示基线值，不受其他状态覆盖影响 |
| 两个非默认状态覆盖同一属性的不同值 | 各自独立，互不影响 |
| 默认状态也修改了被其他状态覆盖的属性 | 被覆盖的状态不受影响，其他继承的状态跟随 |
| 交互状态（hover/active）的属性覆盖 | 与自定义状态相同逻辑，均基于默认继承 |

---

## 六、实施优先级

### P0 — 核心（修复明确的 bug）
1. **childrenVisibility 继承机制** — 渲染时合并 default + active state
2. **setChildVisibility 操作重构** — 改为按状态编辑，不再一次写所有

### P1 — 重要（体验一致性）
3. **PropsTab 状态感知** — 非默认状态下写入 state.props 而非 node.props
4. **childrenStates 合并** — 渲染时合并 default + active state

### P2 — 增强（编辑体验）
5. **属性行覆盖/继承标记** — 所有属性维度统一显示覆盖状态
6. **「重置为默认」操作** — 支持删除单个属性的状态覆盖
7. **NodeVisibilityCondition 重构** — 按当前状态编辑，显示继承关系
