# 04 - 状态管理系统

> **根本问题：如何用一份 Schema 表达所有 UI 状态？**
>
> ← [返回总纲](../README.md)
>
> 相关文档：
> - [03-右侧属性面板](../03-property-panel/README.md) — 状态 Tab 的 UI 设计
> - [05-数据驱动系统](../05-data-driven/README.md) — 全局状态变量属于数据层
> - [01-中央画布](../01-canvas/README.md) — 状态切换触发画布重渲染
> - [design-schema](../../../03-tech/design-schema.md) — ComponentState 类型定义
> - [design-operations](../../../03-tech/design-operations.md) — 状态操作集合

---

## 一、第一性原理：状态系统解决什么根本问题？

### 1.1 现实世界的 UI 状态问题

```
现实中的 UI 从来不只有一个样子：

  一个按钮有: 正常 / 悬浮 / 按下 / 禁用 / 加载中 / 成功 / 失败
  一个输入框有: 空闲 / 聚焦 / 已填写 / 校验通过 / 校验失败
  一个页面有: 正在加载 / 有数据 / 空数据 / 报错

每种状态下 UI 的样子不同：颜色变、尺寸变、内容变、甚至结构变。

Figma 的做法 → 每个状态画一份设计稿
  一个按钮 7 种状态 × 3 种尺寸 × 2 种主题 = 42 份
  一个页面的所有组件全排列 → 几十甚至上百份

这不是设计，这是体力劳动。
```

### 1.2 本质推导

```
我们的 Schema 是结构化的、有语义的 → 可以在同一份 Schema 上叠加"状态覆盖"

一份 Schema + N 套状态覆盖 = 所有状态的 UI 表达

关键问题：UI 的状态有哪些来源？

来源 1: 用户交互 → hover / click / focus 等
  这是 CSS 伪类原生支持的，所有元素天然具备

来源 2: 组件自身的业务逻辑 → loading / success / error 等
  这是组件内部的形态变体，由组件创建者定义

来源 3: 外部数据/全局上下文 → 用户角色 / 任务状态 / 主题模式 等
  这是跨组件的、由数据驱动的状态变化

三种来源 → 三层状态模型
```

### 1.3 与 Figma Variants 的对比

| 维度 | Figma Variants | 我们的三层状态 |
|------|---------------|-------------|
| 建模方式 | 每个 Variant 是独立副本（完整画一份） | 同一个节点叠加差异覆盖（只定义变化的部分） |
| 组合表达 | Variant 组合爆炸（7 状态 × 3 尺寸 = 21 个） | 状态正交叠加（7 + 3 个定义，运行时组合） |
| 数据驱动 | 无 | 全局状态变量驱动多组件联动变化 |
| 实时预览 | 每次手动切换 Variant | 状态预览切换器一键切换，画布实时响应 |
| 输出 | 静态切图 | 代码中直接有 hover/disabled 等状态逻辑 |

**核心优势：我们的状态不是"多份设计稿的枚举"，而是"一份设计稿的参数化变体"。**

---

## 二、三层状态模型

### 2.1 模型概览

```
┌─────────────────────────────────────────────────────────────┐
│                      状态体系                                 │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  第一层：交互状态 (Interaction States)                  │  │
│  │  所有元素天然具备，对应 CSS 伪类                         │  │
│  │                                                       │  │
│  │  normal  →  元素的默认样子                              │  │
│  │  hover   →  鼠标悬浮时 (:hover)                        │  │
│  │  active  →  鼠标按下时 (:active)                       │  │
│  │  focus   →  获得焦点时 (:focus)                        │  │
│  │  disabled → 禁用时 ([disabled] / :disabled)            │  │
│  │                                                       │  │
│  │  特点：不需要用户定义，系统自动为每个元素准备           │  │
│  │  用途：定义 CSS 级别的交互视觉反馈                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  第二层：业务状态 (Component States)                    │  │
│  │  组件自身的不同业务形态，由设计师自定义                   │  │
│  │                                                       │  │
│  │  按钮:    default / loading / success / error          │  │
│  │  输入框:  default / filled / validating / valid / invalid │
│  │  开关:    off / on                                     │  │
│  │  卡片:    collapsed / expanded                         │  │
│  │  通知:    info / warning / error / success             │  │
│  │  自定义:  任意状态名                                    │  │
│  │                                                       │  │
│  │  特点：由组件创建者定义，不同组件状态集不同             │  │
│  │  用途：定义组件在不同业务场景下的外观和行为差异          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  第三层：全局状态 (Global States)                       │  │
│  │  页面级/应用级的数据状态，影响多个组件联动               │  │
│  │                                                       │  │
│  │  任务状态: pending / inProgress / done / cancelled     │  │
│  │  用户角色: admin / member / guest                      │  │
│  │  主题:    light / dark                                 │  │
│  │  网络:    online / offline                             │  │
│  │  认证:    loggedIn / loggedOut                         │  │
│  │  自定义:  任意全局状态变量                              │  │
│  │                                                       │  │
│  │  特点：定义在 Screen/Project 级别，影响多个元素          │  │
│  │  用途：数据驱动的跨组件联动样式/可见性/内容变化          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 三层的本质区别

| 维度 | 交互状态 | 业务状态 | 全局状态 |
|------|---------|---------|---------|
| **作用范围** | 单个元素 | 单个组件（含子树） | 多个组件/整个页面 |
| **触发方式** | 用户物理交互（鼠标/键盘） | 业务逻辑（API 返回/用户操作） | 外部数据变化/条件判定 |
| **定义位置** | 系统自动（所有元素内置） | 组件级 `node.states[]` | 页面级 `screen.globalStates` |
| **CSS 对应** | 伪类 `:hover` `:active` `:focus` | 无直接对应，通过 class 切换 | 无直接对应，通过 data-* 或 context |
| **覆盖内容** | 仅样式 | 样式 + Props + 子元素可见性 | 样式 + Props + 子元素可见性 |
| **是否互斥** | 否（hover + focus 可同时存在） | 是（同一时刻只有一个业务状态） | 每个变量独立（taskStatus 和 userRole 独立） |

---

## 三、数据结构定义

### 3.1 Schema 中的现有结构（ComponentState）

```typescript
// 已有：design-schema 中的 ComponentState（承载第一层 + 第二层）
interface ComponentState {
  name: string;                       // "default" | "hover" | "active" | "focus" | "disabled" | 自定义业务状态
  styles: Partial<CSSProperties>;     // 该状态下的样式覆盖
  props?: Partial<Record<string, any>>; // 该状态下的 Props 覆盖
}

// 已有：ComponentNode.states 和 ComponentNode.activeState
interface ComponentNode {
  // ...
  states: ComponentState[];  // 所有可用状态
  activeState: string;       // 当前激活的状态
  // ...
}
```

### 3.2 新增：全局状态定义（第三层）

```typescript
// 新增：全局状态变量定义（定义在 Screen 级别）
interface GlobalStateVariable {
  name: string;              // 变量名: "taskStatus" / "userRole" / "theme"
  label: string;             // 中文标签: "任务状态" / "用户角色" / "主题"
  values: GlobalStateValue[]; // 所有可选值
  defaultValue: string;      // 默认值
  currentValue: string;      // 当前预览值（编辑器内用于状态预览切换）
}

interface GlobalStateValue {
  value: string;             // "pending" / "inProgress" / "done"
  label: string;             // "待处理" / "进行中" / "已完成"
}

// 新增：Screen 级别的全局状态定义
interface Screen {
  // ...已有字段...
  globalStates: GlobalStateVariable[];  // 页面级全局状态变量
}
```

### 3.3 新增：全局状态绑定（节点响应全局状态）

```typescript
// 新增：节点对全局状态的响应规则
interface GlobalStateBinding {
  variableName: string;      // 响应哪个全局变量: "taskStatus"
  value: string;             // 当变量等于哪个值时生效: "done"
  styles?: Partial<CSSProperties>;   // 样式覆盖
  props?: Partial<Record<string, any>>; // Props 覆盖
  visible?: boolean;         // 是否可见（true/false，控制条件显示/隐藏）
}

// 新增：ComponentNode 中增加全局状态绑定数组
interface ComponentNode {
  // ...已有字段...
  globalStateBindings?: GlobalStateBinding[];  // 全局状态响应规则
}
```

### 3.4 完整的数据结构关系图

```
DesignProject
  └── screens[]
        └── Screen
              ├── globalStates: GlobalStateVariable[]    ← 第三层：页面级状态变量定义
              │     ├── { name: "taskStatus", values: [...], currentValue: "inProgress" }
              │     └── { name: "userRole", values: [...], currentValue: "admin" }
              │
              └── rootNode: ComponentNode
                    ├── states: ComponentState[]          ← 第一层 + 第二层
                    │     ├── { name: "default", styles: {...} }
                    │     ├── { name: "hover", styles: { opacity: 0.8 } }
                    │     ├── { name: "loading", styles: { opacity: 0.6 }, props: { disabled: true } }
                    │     └── { name: "error", styles: { borderColor: "red" } }
                    │
                    ├── activeState: "default"            ← 当前激活的业务状态
                    │
                    └── globalStateBindings[]             ← 第三层绑定
                          ├── { variableName: "taskStatus", value: "done",
                          │     styles: { color: "green" }, props: { text: "已完成" } }
                          └── { variableName: "userRole", value: "guest",
                                visible: false }          ← guest 时隐藏该元素
```

---

## 四、状态叠加算法

### 4.1 叠加规则

```
最终渲染样式的计算（从低优先级到高优先级）：

  第 0 层：基础样式（node.styles）
     ↓ 叠加
  第 3 层：全局状态覆盖（node.globalStateBindings 中匹配当前全局状态的规则）
     ↓ 叠加
  第 2 层：业务状态覆盖（node.states 中 activeState 对应的 state.styles）
     ↓ 叠加
  第 1 层：交互状态覆盖（node.states 中 hover/active/focus 对应的 state.styles）
     ↓
  最终样式
```

### 4.2 叠加算法伪代码

```typescript
function resolveNodeStyles(
  node: ComponentNode,
  globalStates: Record<string, string>,  // 当前全局状态值
  interactionState: "normal" | "hover" | "active" | "focus"  // 当前交互状态
): { styles: CSSProperties; props: Record<string, any>; visible: boolean } {

  // 第 0 层：基础样式和 Props
  let styles = { ...node.styles };
  let props = { ...node.props };
  let visible = node.visible !== false;

  // 第 3 层：全局状态覆盖（可能有多个变量同时匹配）
  if (node.globalStateBindings) {
    for (const binding of node.globalStateBindings) {
      if (globalStates[binding.variableName] === binding.value) {
        if (binding.styles) styles = { ...styles, ...binding.styles };
        if (binding.props) props = { ...props, ...binding.props };
        if (binding.visible !== undefined) visible = binding.visible;
      }
    }
  }

  // 第 2 层：业务状态覆盖
  const businessState = node.states.find(s => s.name === node.activeState);
  if (businessState && businessState.name !== "default") {
    if (businessState.styles) styles = { ...styles, ...businessState.styles };
    if (businessState.props) props = { ...props, ...businessState.props };
  }

  // 第 1 层：交互状态覆盖（仅在非 normal 时应用）
  if (interactionState !== "normal") {
    const interState = node.states.find(s => s.name === interactionState);
    if (interState) {
      if (interState.styles) styles = { ...styles, ...interState.styles };
      if (interState.props) props = { ...props, ...interState.props };
    }
  }

  return { styles, props, visible };
}
```

### 4.3 叠加示例

```
一个按钮的状态解析示例：

基础样式 (node.styles):
  { background: "#0D99FF", color: "#FFF", opacity: 1, borderColor: "transparent" }

全局状态绑定:
  当 taskStatus = "done" → { background: "#52C41A" }  (绿色)

业务状态:
  default → {}
  loading → { opacity: 0.6 }
  error   → { borderColor: "red" }

交互状态:
  hover  → { opacity: 0.85 }
  active → { opacity: 0.7 }

场景 A: taskStatus="inProgress", activeState="default", 交互="hover"
  基础        → { bg: "#0D99FF", color: "#FFF", opacity: 1, border: "transparent" }
  + 全局      → (不匹配，无变化)
  + 业务      → (default，无变化)
  + 交互hover → { opacity: 0.85 }
  最终 = { bg: "#0D99FF", color: "#FFF", opacity: 0.85, border: "transparent" }

场景 B: taskStatus="done", activeState="loading", 交互="normal"
  基础        → { bg: "#0D99FF", color: "#FFF", opacity: 1, border: "transparent" }
  + 全局done  → { bg: "#52C41A" }
  + 业务loading → { opacity: 0.6 }
  + 交互normal → (无变化)
  最终 = { bg: "#52C41A", color: "#FFF", opacity: 0.6, border: "transparent" }

场景 C: taskStatus="done", activeState="error", 交互="hover"
  基础         → { bg: "#0D99FF", color: "#FFF", opacity: 1, border: "transparent" }
  + 全局done   → { bg: "#52C41A" }
  + 业务error  → { border: "red" }
  + 交互hover  → { opacity: 0.85 }
  最终 = { bg: "#52C41A", color: "#FFF", opacity: 0.85, border: "red" }
  (注意: 全局改了 bg, 业务改了 border, 交互改了 opacity → 三层各改各的，互不冲突)
```

### 4.4 冲突处理

```
当多层覆盖了同一个属性时（冲突场景）：

  高层级覆盖低层级（交互 > 业务 > 全局 > 基础）

  例：
    全局状态覆盖了 opacity: 0.5
    业务状态覆盖了 opacity: 0.6
    交互状态覆盖了 opacity: 0.85
    → 最终 opacity = 0.85（交互层优先）

  这符合直觉：
    用户正在 hover → 应该显示 hover 效果（不管业务状态和全局状态是什么）
    用户没在交互 → 显示业务状态效果
    不在特定业务状态 → 显示全局状态效果

同层内多个全局状态同时匹配：
  如果 taskStatus="done" 和 userRole="admin" 同时生效
  且两者都覆盖了 color 属性
  → 后定义的绑定规则覆盖先定义的（按 globalStateBindings 数组顺序）
  → 用户可以通过拖拽排序调整优先级
```

---

## 五、交互状态（第一层）详细设计

### 5.1 交互状态的自动行为

```
交互状态不需要用户定义"触发条件"——它们是 CSS 伪类原生的行为。

编辑器中的交互状态模拟：
  编辑模式下，交互状态不自动触发（因为鼠标事件被 Canvas 覆盖层拦截）
  → 通过状态预览切换器手动切换查看效果

预览模式下：
  hover  → 鼠标悬浮时自动触发（真实 :hover）
  active → 鼠标按下时自动触发（真实 :active）
  focus  → 元素获得焦点时自动触发（真实 :focus）
  disabled → 元素有 disabled 属性时自动触发

代码导出时：
  hover  → 导出为 :hover 伪类或 hover: 事件处理
  active → 导出为 :active 伪类
  focus  → 导出为 :focus 伪类
  disabled → 导出为 :disabled 伪类 或条件渲染
```

### 5.2 交互状态的叠加性

```
交互状态之间可以同时存在（与业务状态不同）：

  一个 input 可以同时是 focus + hover
  一个 button 可以同时是 focus + active

叠加规则（当多个交互状态同时激活）：
  优先级: active > focus > hover > normal
  即: active 样式覆盖 focus，focus 覆盖 hover

但在编辑器的状态预览中，一次只能选择一个交互状态查看
（实际叠加效果在预览模式中体验）
```

### 5.3 交互状态的默认样式建议

```
系统可为常见元素提供交互状态的默认覆盖样式建议：

button:
  hover  → { opacity: 0.85, cursor: "pointer" }
  active → { opacity: 0.7, transform: "scale(0.98)" }
  disabled → { opacity: 0.5, cursor: "not-allowed" }

input:
  focus → { borderColor: "#0D99FF", boxShadow: "0 0 0 2px rgba(13,153,255,0.2)" }
  disabled → { background: "#F5F5F5", cursor: "not-allowed" }

a:
  hover → { textDecoration: "underline" }

这些只是建议（新建元素时自动填充），设计师可以随时修改。
```

---

## 六、业务状态（第二层）详细设计

### 6.1 业务状态的定义与管理

```
业务状态存储在 node.states[] 中：
  · 每个元素有一个 states 数组
  · 第一个元素必须是 "default"（不可删除）
  · 交互状态 (hover/active/focus/disabled) 系统自动管理
  · 其余为设计师自定义的业务状态

一个元素的 states 数组示例：
  [
    { name: "default", styles: {} },                    ← 必须存在
    { name: "hover", styles: { opacity: 0.85 } },      ← 交互状态
    { name: "active", styles: { opacity: 0.7 } },      ← 交互状态
    { name: "focus", styles: { ... } },                 ← 交互状态
    { name: "disabled", styles: { opacity: 0.5 } },    ← 交互状态
    { name: "loading", styles: { opacity: 0.6 }, props: { disabled: true } },  ← 业务状态
    { name: "success", styles: { background: "green" } },                      ← 业务状态
    { name: "error", styles: { borderColor: "red" }, props: { text: "失败" } } ← 业务状态
  ]
```

### 6.2 业务状态 vs 交互状态的区别

```
区分标准：名称是否在预定义列表中

交互状态（系统预定义）：
  "normal" / "hover" / "active" / "focus" / "disabled"
  → 不可由用户删除（但可以编辑覆盖样式）
  → 不占 activeState（它们是正交的）

业务状态（用户自定义）：
  "default" / "loading" / "success" / "error" / 任意名称
  → 可由用户增删
  → activeState 在这些之间切换
  → 同一时刻只有一个业务状态激活
```

### 6.3 业务状态可覆盖的内容

```
业务状态可以覆盖三类内容：

1. 样式覆盖 (styles):
   loading → { opacity: 0.6, pointerEvents: "none" }
   error   → { borderColor: "red", boxShadow: "0 0 0 2px rgba(255,0,0,0.1)" }

2. Props 覆盖 (props):
   loading → { disabled: true, text: "加载中..." }
   error   → { text: "提交失败", icon: "error-icon" }

3. 子元素可见性（远期，通过 props 间接控制）:
   loading → 显示 spinner 子元素, 隐藏文字子元素
   实现方式: 在 spinner 子元素上绑定 globalStateBinding
             当父组件 activeState = "loading" 时 visible = true
   注: 这个能力通过第三层全局状态机制间接实现
       或在 Phase 3 中扩展 ComponentState 增加 childrenVisibility 字段
```

---

## 七、全局状态（第三层）详细设计

### 7.1 全局状态变量的定义

```
全局状态变量定义在 Screen 级别（页面级）。

定义流程（在右侧面板 - 数据 Tab - 全局状态变量区域）：

  [+ 添加状态变量]
  ┌──────────────────────────────────────┐
  │  新建全局状态变量                      │
  │                                      │
  │  变量名:  [taskStatus          ]     │
  │  中文标签: [任务状态             ]     │
  │                                      │
  │  可选值:                              │
  │  ┌────────────────────────────────┐  │
  │  │  值            │  标签         │  │
  │  │  pending       │  待处理       │  │
  │  │  inProgress    │  进行中       │  │
  │  │  done          │  已完成       │  │
  │  │  cancelled     │  已取消       │  │
  │  │  [+ 添加值]                    │  │
  │  └────────────────────────────────┘  │
  │                                      │
  │  默认值: [pending ▾]                 │
  │                                      │
  │              [取消]  [创建]           │
  └──────────────────────────────────────┘
```

### 7.2 全局状态绑定的定义

```
在某个元素的状态 Tab → "响应全局状态" 区域：

  [+ 添加全局状态响应]
  ┌──────────────────────────────────────┐
  │  添加全局状态响应                      │
  │                                      │
  │  当 [任务状态 ▾] = [已完成 ▾] 时：    │
  │                                      │
  │  ── 覆盖内容（至少选一项）───────────  │
  │                                      │
  │  [✓] 样式覆盖:                       │
  │    ┌──────────────────────────────┐  │
  │    │  color: [🎨 #52C41A]         │  │
  │    │  fontWeight: [700 ▾]         │  │
  │    │  [+ 添加样式属性]             │  │
  │    └──────────────────────────────┘  │
  │                                      │
  │  [✓] Props 覆盖:                    │
  │    ┌──────────────────────────────┐  │
  │    │  text: [已完成 ✓             ] │  │
  │    │  [+ 添加 Prop]               │  │
  │    └──────────────────────────────┘  │
  │                                      │
  │  [□] 条件可见性:                      │
  │    (●) 此条件下显示                   │
  │    ( ) 此条件下隐藏                   │
  │                                      │
  │               [取消]  [添加]          │
  └──────────────────────────────────────┘

一个元素可以有多个全局状态响应规则：
  · 响应 taskStatus = "done" → 文字变绿
  · 响应 userRole = "guest" → 隐藏该元素
  · 它们独立生效，互不干扰
```

### 7.3 全局状态的联动效果

```
全局状态最大的价值 = 一次切换，多个组件联动变化

示例：切换 taskStatus 从 "inProgress" 到 "done"

  ┌─────────────────────────────────────────────┐
  │  页面中各组件的响应:                          │
  │                                             │
  │  标题栏 → text 从 "任务进行中" 变为 "已完成"  │
  │  进度条 → width 从 "60%" 变为 "100%"         │
  │  操作按钮 → 从 "暂停" 变为 "重新开始"         │
  │  状态标签 → color 从 orange 变为 green       │
  │  已完成提示 → 从隐藏变为显示                  │
  │                                             │
  │  所有这些变化来自同一个全局状态切换 ——         │
  │  设计师不需要画两份页面来表达这个差异           │
  └─────────────────────────────────────────────┘
```

---

## 八、状态预览切换器

### 8.1 编辑器内的状态预览

```
编辑模式下，交互状态不会自动触发（鼠标被 Canvas 覆盖层拦截）。
设计师需要一个"状态预览切换器"来查看各状态下的 UI。

切换器位置：右侧属性面板 - 状态 Tab 底部

  ┌──────────────────────────────────────┐
  │  🔄 状态预览切换器                     │
  ├──────────────────────────────────────┤
  │                                      │
  │  全局状态:                            │
  │    任务状态: [进行中 ▾]               │
  │    用户角色: [管理员 ▾]               │
  │                                      │
  │  组件状态:                            │
  │    [default ▾]                       │
  │                                      │
  │  交互状态:                            │
  │    [normal ▾]                        │
  │                                      │
  │  → 画布实时预览当前组合效果            │
  │                                      │
  └──────────────────────────────────────┘

切换任何值 → 画布立即更新渲染：
  · 全局状态下拉切换 → setGlobalState Operation → 全页面重渲染
  · 组件状态下拉切换 → setActiveState Operation → 该组件重渲染
  · 交互状态下拉切换 → 临时覆盖（不修改 Schema，只影响预览渲染）
```

### 8.2 快捷状态切换（顶部工具栏）

```
高频的全局状态切换也放在顶部工具栏（见 02-toolbar 区域 D）：

  [全局状态: 进行中 ▾]  [数据集: 默认 ▾]

  · 这里只切换全局状态变量值
  · 适合快速在不同全局状态之间来回切换查看效果
  · 完整的三层状态控制在右侧面板的状态 Tab 中
```

### 8.3 状态组合预览矩阵（与数据 Tab 联动）

```
状态预览可以与数据集组合，生成全景矩阵：

  数据集 × 全局状态 × 视口 = 全部组合

  详见 05-data-driven 的全景截图矩阵设计。

  在状态 Tab 底部有入口：
  [📸 生成全景截图...] → 跳转到数据 Tab 的截图功能
```

---

## 九、状态 Tab 与样式 Tab 的联动

这是状态系统在 UI 层面最核心的交互，已在 [03-property-panel 第六节](../03-property-panel/README.md#六状态-tab--多状态管理) 中定义了 UI 设计，这里补充联动的完整流程。

### 9.1 编辑基础样式（默认流程）

```
1. 用户选中一个元素
2. 状态 Tab → 默认选中 "default" 业务状态 + "normal" 交互状态
3. 样式 Tab → 展示 node.styles（基础样式）
4. 修改任何样式值 → updateStyle Operation → 写入 node.styles
```

### 9.2 编辑状态覆盖样式

```
1. 用户在状态 Tab 点击 "hover" 交互状态卡片
2. 状态 Tab → "hover" 卡片高亮选中
3. 样式 Tab → 顶部出现蓝色横幅: "正在编辑 hover 状态的样式覆盖"
4. 样式 Tab → 值的展示规则变化:
   · 有覆盖值的属性 → 显示覆盖值 + 左侧蓝色圆点标记
   · 无覆盖值的属性 → 显示基础值（灰色，标注"继承"）
5. 修改某个属性 → updateState Operation → 写入该 state.styles
6. 右键属性 → "移除此状态覆盖" → 该属性恢复继承基础值

同理，编辑业务状态（如 "loading"）和全局状态绑定的样式覆盖。
```

### 9.3 覆盖标记的视觉设计

```
样式 Tab 中属性行的覆盖标记：

正常（编辑基础样式时）：
  opacity   ━━━━━●━━━  [0.8]     ← 黑色文字，正常样式

编辑 hover 覆盖时：
  opacity   ━━━━━━━●━  [0.85]    ← 蓝色圆点 + 蓝色值
  ● 表示此属性在当前状态下有覆盖值

  color     [🎨 #333333]         ← 灰色文字 + "继承" 标签
  (继承) 表示此属性无覆盖，显示基础值

视觉对比：
  ┌──────────────────────────────────┐
  │ 🔵 正在编辑 "hover" 状态覆盖     │  ← 蓝色横幅
  ├──────────────────────────────────┤
  │  ● opacity   [0.85]   ← 有覆盖  │  蓝色值
  │    color     [#333]   ← 继承    │  灰色值 + (继承) 标签
  │  ● cursor   [pointer] ← 有覆盖  │  蓝色值
  │    width    [200px]   ← 继承    │  灰色值
  └──────────────────────────────────┘
```

---

## 十、代码导出中的状态映射

### 10.1 交互状态 → CSS 伪类

```typescript
// 导出 React 代码时
// hover / active / focus / disabled → CSS 伪类

// 方案 A: 内联样式 + onMouseEnter/Leave（简单但不优雅）
<button
  style={isHovered ? { ...baseStyles, ...hoverStyles } : baseStyles}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
/>

// 方案 B: CSS 类 + 伪类（更优雅，推荐）
// styles.css:
// .button { background: #0D99FF; }
// .button:hover { opacity: 0.85; }
// .button:active { opacity: 0.7; }
// .button:disabled { opacity: 0.5; }
```

### 10.2 业务状态 → 条件渲染

```typescript
// 业务状态导出为 React 条件逻辑

function SubmitButton({ state = "default" }) {
  const styles = {
    ...baseStyles,
    ...(state === "loading" && { opacity: 0.6 }),
    ...(state === "error" && { borderColor: "red" }),
    ...(state === "success" && { background: "green" }),
  };

  const isDisabled = state === "loading" || state === "disabled";

  return (
    <button style={styles} disabled={isDisabled}>
      {state === "loading" ? "加载中..." : "提交"}
    </button>
  );
}
```

### 10.3 全局状态 → Context / Props

```typescript
// 全局状态导出为 React Context 或 Props 传递

const TaskContext = React.createContext({ taskStatus: "pending" });

function StatusLabel() {
  const { taskStatus } = useContext(TaskContext);

  const styles = {
    ...baseStyles,
    ...(taskStatus === "done" && { color: "green" }),
    ...(taskStatus === "cancelled" && { color: "gray", textDecoration: "line-through" }),
  };

  return <span style={styles}>{statusLabels[taskStatus]}</span>;
}
```

---

## 十一、与其他子系统的接口约定

### 11.1 状态系统 → 画布 (01-canvas)

```typescript
// 状态变化触发画布重渲染
// 所有状态变化通过 Operations 修改 Schema → MobX 响应式更新 → 画布自动重渲染

// 画布的渲染引擎需要调用 resolveNodeStyles() 获取最终样式
// 渲染引擎在 design-engine 中实现
```

### 11.2 状态系统 → 属性面板 (03-property-panel)

```typescript
// 状态 Tab 选中某个状态 → 样式 Tab 切换展示模式
interface StateEditingContext {
  editingLayer: "base" | "interaction" | "business" | "global";
  stateName?: string;           // "hover" / "loading" / ...
  globalBinding?: {             // 仅 editingLayer = "global" 时
    variableName: string;
    value: string;
  };
}

// 当 StateEditingContext 变化时，样式 Tab 重新计算展示值的来源
```

### 11.3 状态系统 → 数据驱动 (05-data-driven)

```typescript
// 全局状态变量的定义与管理在数据层
// 状态系统消费全局状态变量的值来计算覆盖

// 数据 Tab 中全局状态变量的 CRUD → 影响状态 Tab 中的可选变量列表
// 全局状态切换 → 影响状态叠加算法的输入
```

### 11.4 状态系统 → Operations

```typescript
// 状态相关的 Operations

// 业务状态
executor.execute({ type: "addState", params: { nodeId, stateName: "loading", styles: { opacity: 0.6 } } });
executor.execute({ type: "removeState", params: { nodeId, stateName: "loading" } });
executor.execute({ type: "updateState", params: { nodeId, stateName: "hover", styles: { opacity: 0.85 } } });
executor.execute({ type: "setActiveState", params: { nodeId, stateName: "loading" } });

// 全局状态变量
executor.execute({ type: "setGlobalState", params: { variableName: "taskStatus", value: "done" } });

// 全局状态绑定（新增 Operations）
executor.execute({
  type: "addGlobalStateBinding",
  params: {
    nodeId,
    binding: { variableName: "taskStatus", value: "done", styles: { color: "green" } }
  }
});
executor.execute({
  type: "removeGlobalStateBinding",
  params: { nodeId, bindingIndex: 0 }
});
executor.execute({
  type: "updateGlobalStateBinding",
  params: {
    nodeId, bindingIndex: 0,
    binding: { variableName: "taskStatus", value: "done", styles: { color: "#52C41A" } }
  }
});
```

---

## 十二、边界情况与异常处理

| 场景 | 预期行为 |
|------|---------|
| 删除正在编辑的业务状态 | 自动切回 "default"，样式 Tab 恢复基础模式 |
| 删除被全局状态绑定引用的全局变量 | 提示 "该变量被 N 个元素引用，确认删除？" → 删除后清除所有相关绑定 |
| activeState 指向不存在的状态名 | 降级为 "default"，控制台警告 |
| 全局状态多规则冲突（同一属性） | 按 globalStateBindings 数组顺序，后者覆盖前者 |
| 交互状态与业务状态冲突（同一属性） | 交互状态优先（第一层 > 第二层） |
| 状态覆盖值为空对象 {} | 等同于无覆盖，不影响最终样式 |
| 循环依赖（状态 A 的事件触发切换到状态 B，B 又触发 A）| 在交互系统层面处理（事件执行防抖） |
| 组件实例的状态（引用模式） | 实例继承模板的 states 定义，可覆盖但不可增删状态名 |
| 状态名重复 | 创建时校验：不允许重复名称 |
| 超多状态（>20 个） | 允许但给出性能提示；状态 Tab 中卡片区域可滚动 |

---

## 十三、MVP 与后期功能分界

### MVP（Phase 2，紧随 Phase 1 基础编辑之后）

- [x] 交互状态自动管理（hover / active / focus / disabled 内置） <!-- W2 -->
- [x] 业务状态 CRUD（添加/编辑/删除自定义状态） <!-- W2 -->
- [x] 状态 Tab 基础 UI（交互状态卡片 + 业务状态卡片） <!-- W2 -->
- [x] 状态 Tab ↔ 样式 Tab 联动（覆盖编辑模式 + 蓝色横幅 + 覆盖标记） <!-- W2 -->
- [x] 状态叠加算法（resolveNodeStyles） <!-- W2 -->
- [x] setActiveState Operation（切换业务状态） <!-- W2 -->
- [x] 状态预览切换器（右侧面板底部，组件状态 + 交互状态下拉） <!-- W2/W6 -->
- [ ] 交互状态默认样式建议（button / input / a）

### Phase 3（全局状态，与数据驱动同步）

- [x] 全局状态变量定义（GlobalStateVariable CRUD） <!-- W6 -->
- [x] 全局状态绑定（addGlobalStateBinding / removeGlobalStateBinding） <!-- W6 -->
- [x] 全局状态叠加到解析算法中 <!-- W6 -->
- [x] 状态预览切换器增加全局状态下拉 <!-- W6 -->
- [x] 顶部工具栏全局状态快速切换 <!-- W6 -->
- [x] 条件可见性（binding.visible） <!-- W6 -->

### Phase 4（高级状态功能）

- [x] 状态组合预览矩阵入口 <!-- W6 StateCombinationPreview -->
- [ ] 全局状态绑定的拖拽排序（调整优先级）
- [ ] 组件实例的状态继承与覆盖
- [ ] 子元素条件可见性（父状态驱动子元素显示/隐藏）
- [ ] 状态过渡动画（从状态 A 到状态 B 的 transition 定义）
- [ ] 代码导出中的完整状态映射

---

## 十四、核心设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 状态分几层？ | 三层（交互/业务/全局） | 穷举了 UI 状态的所有来源；三层正交、互不干扰、各有明确语义 |
| 叠加优先级？ | 交互 > 业务 > 全局 > 基础 | 符合直觉：用户正在 hover 就应该看到 hover 效果，不管业务状态是什么 |
| 业务状态互斥 or 可叠加？ | 互斥（同一时刻只有一个） | 简化心智模型；叠加带来指数级组合复杂度 |
| 全局状态定义在哪一级？ | Screen（页面级） | 页面是独立的设计单元；跨页面的全局状态可通过 Project 级扩展（远期） |
| 覆盖方式？ | 浅合并（Object.assign 语义） | 只覆盖指定的属性，未指定的继承上一层——最小化定义量 |
| 交互状态是否存入 Schema？ | 是（存在 node.states 中，name 为 hover/active 等）| 统一存储、统一算法；导出代码时有据可依 |
| 状态覆盖编辑方式？ | 复用样式 Tab + 蓝色横幅模式切换 | 不需要新建编辑器；用户已熟悉样式 Tab 的所有控件 |
| 全局状态绑定优先级冲突？ | 按数组顺序，后者覆盖前者 | 简单可预测；用户可通过拖拽排序控制 |
| 预览模式下交互状态？ | 真实触发（:hover 等原生伪类） | 预览模式的目的就是体验真实交互 |
