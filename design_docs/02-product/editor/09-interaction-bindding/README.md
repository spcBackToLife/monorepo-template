# 09 - 交互与事件系统

> **根本问题：如何在设计阶段定义真实的交互行为？**
>
> ← [返回总纲](../README.md)
>
> 相关文档：
> - [03-右侧属性面板](../03-property-panel/README.md) — 交互 Tab 的 UI 设计
> - [04-状态管理系统](../04-state-system/README.md) — 事件可触发状态切换
> - [05-数据驱动系统](../05-data-driven/README.md) — 事件可联动数据状态
> - [10-预览与测试](../10-preview-mode/README.md) — 预览模式下事件真实执行
> - [design-schema](../../../03-tech/design-schema.md) — ComponentEvent / EventAction 类型定义

---

## 一、第一性原理：事件系统解决什么根本问题？

### 1.1 本质推导

```
传统设计工具的交互表达方式：

  Figma: 在 Prototype 模式下画箭头连线
    · 从按钮 A → 画面 B，选个转场动画
    · 优点: 直观
    · 缺点: 只能表达页面跳转，无法表达状态切换、数据变化、条件逻辑

  我们的 Schema 是有语义的 → 交互不应该是"两个画面之间的连线"
  而应该是"元素上的事件绑定" → 与真实前端代码一致

  真实代码:
    <button onClick={() => navigate("/register")}>注册</button>
    <button onClick={() => setState("loading")}>提交</button>
    <div onMouseEnter={() => setHovered(true)}>...</div>

  我们的 Schema:
    button.events = [{ trigger: "click", action: { type: "navigate", target: "register" } }]
    button.events = [{ trigger: "click", action: { type: "setState", state: "loading" } }]

  事件直接绑定在元素上 → 与设计同步 → 导出代码时直接可用
```

### 1.2 与 Figma Prototype 的对比

| 维度 | Figma Prototype | 我们的事件系统 |
|------|----------------|--------------|
| 定义方式 | 独立的 Prototype 模式，画连线 | 在编辑模式中直接绑定，无需切换模式 |
| 绑定粒度 | Frame 到 Frame 的跳转 | 任意元素上的任意事件 |
| 可表达的行为 | 仅页面跳转 + 转场动画 | 跳转 + 状态切换 + 全局状态 + 打开链接 + 显示隐藏 + 自定义 |
| 条件逻辑 | 无 | 支持条件行为（远期） |
| 事件链 | 无 | 一个触发器可绑多个行为顺序执行 |
| 代码价值 | 连线不导出到代码 | 事件定义直接导出为 onClick / onHover 等 |

### 1.3 设计原则

```
1. 声明式 → 事件是 Schema 的一部分，不是独立的连线图层
2. 粒度细 → 任意元素上可绑定任意事件，不限于"页面跳转"
3. 可组合 → 一个触发器可以顺序执行多个行为（事件链）
4. 可预览 → 在预览模式中真实执行事件行为
5. 可导出 → 事件定义直接映射到前端代码的事件处理器
```

---

## 二、事件模型

### 2.1 核心数据结构

```typescript
// 已有（design-schema 中定义）
interface ComponentEvent {
  trigger: EventTrigger;
  action: EventAction;
}

type EventTrigger = "click" | "hover" | "focus" | "blur" | "longPress";

type EventAction =
  | { type: "navigate"; targetScreenId: string; animation?: TransitionAnimation }
  | { type: "setState"; targetId: string; state: string }
  | { type: "openUrl"; url: string; target?: "_self" | "_blank" }
  | { type: "setGlobalState"; variableName: string; value: string }
  | { type: "toggleVisible"; targetId: string; mode: "show" | "hide" | "toggle" }
  | { type: "custom"; handler: string };
```

### 2.2 扩展：事件链与条件

```typescript
// 扩展：支持事件链（一个触发器多个行为）
interface ComponentEventV2 {
  id: string;                    // 事件唯一标识
  trigger: EventTrigger;
  actions: EventAction[];        // 行为数组（顺序执行）
  condition?: EventCondition;    // 条件（远期）
  description?: string;          // 人类可读描述
}

// 转场动画
type TransitionAnimation =
  | "none"
  | "slideLeft"       // 向左滑入
  | "slideRight"      // 向右滑入
  | "slideUp"         // 向上滑入
  | "slideDown"       // 向下滑入
  | "fadeIn"          // 淡入
  | "zoomIn"          // 缩放进入
  | "zoomOut";        // 缩放退出

// 条件（远期 Phase 5）
interface EventCondition {
  type: "globalState" | "dataBinding" | "propValue";
  variable?: string;    // 全局状态变量名
  operator: "==" | "!=" | ">" | "<";
  value: any;
}

// 例: 仅当 taskStatus == "pending" 时才执行
// condition: { type: "globalState", variable: "taskStatus", operator: "==", value: "pending" }
```

### 2.3 触发器详解

```
┌─────────────┬──────────────────────────────────────────────────────┐
│  触发器       │  说明                                               │
├─────────────┼──────────────────────────────────────────────────────┤
│  click      │  鼠标点击 / 触屏点击                                 │
│             │  最常用的触发器，适用于所有元素                        │
│             │  导出: onClick                                       │
├─────────────┼──────────────────────────────────────────────────────┤
│  hover      │  鼠标进入元素范围                                    │
│             │  注意：hover 触发后，鼠标离开时行为自动反转           │
│             │  例: hover → setState("hover") → 离开时自动恢复      │
│             │  导出: onMouseEnter / onMouseLeave                   │
├─────────────┼──────────────────────────────────────────────────────┤
│  focus      │  元素获得焦点（input/textarea/button 等可聚焦元素）  │
│             │  导出: onFocus                                       │
├─────────────┼──────────────────────────────────────────────────────┤
│  blur       │  元素失去焦点                                        │
│             │  常与 focus 配对使用                                  │
│             │  导出: onBlur                                        │
├─────────────┼──────────────────────────────────────────────────────┤
│  longPress  │  长按（按住 > 500ms）                                │
│             │  适用于移动端场景                                     │
│             │  导出: onTouchStart + setTimeout 模拟                │
└─────────────┴──────────────────────────────────────────────────────┘
```

### 2.4 行为详解

```
┌────────────────┬─────────────────────────────────────────────────────┐
│  行为类型        │  说明                                              │
├────────────────┼─────────────────────────────────────────────────────┤
│  navigate      │  跳转到另一个页面                                    │
│                │  参数: targetScreenId (目标页面 ID)                  │
│                │        animation (转场动画类型)                      │
│                │  预览模式: 画布切换到目标页面                         │
│                │  导出: router.push() 或 navigate()                  │
├────────────────┼─────────────────────────────────────────────────────┤
│  setState      │  切换组件的业务状态                                  │
│                │  参数: targetId (目标元素 ID，默认当前元素)           │
│                │        state (目标状态名)                            │
│                │  预览模式: 目标元素切换到指定状态                     │
│                │  导出: setState() 或状态管理逻辑                     │
├────────────────┼─────────────────────────────────────────────────────┤
│  openUrl       │  打开外部链接                                       │
│                │  参数: url (完整 URL)                                │
│                │        target ("_self" / "_blank")                  │
│                │  预览模式: 新窗口打开 URL                            │
│                │  导出: window.open() 或 <a href>                    │
├────────────────┼─────────────────────────────────────────────────────┤
│  setGlobalState│  切换全局状态变量                                    │
│                │  参数: variableName (状态变量名)                     │
│                │        value (目标值)                                │
│                │  预览模式: 全页面响应状态变化                         │
│                │  导出: context.setState() 或 store.dispatch()       │
├────────────────┼─────────────────────────────────────────────────────┤
│  toggleVisible │  显示/隐藏某个元素                                   │
│                │  参数: targetId (目标元素 ID)                        │
│                │        mode ("show" / "hide" / "toggle")            │
│                │  预览模式: 目标元素显示或隐藏                         │
│                │  导出: 条件渲染 或 display:none                      │
├────────────────┼─────────────────────────────────────────────────────┤
│  custom        │  自定义动作（高级，远期）                            │
│                │  参数: handler (动作标识字符串)                      │
│                │  用途: 打开弹窗 / 表单提交 / 调用 API / ...         │
│                │  导出: 自定义函数调用                                │
└────────────────┴─────────────────────────────────────────────────────┘
```

---

## 三、事件编辑 UI

### 3.1 交互 Tab 整体布局

```
┌──────────────────────────────────────┐
│  交互                                 │
├──────────────────────────────────────┤
│                                      │
│  已绑定事件:                          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ● click (点击)          [⋮]  │  │
│  │  ① → 跳转到: [注册页面 ▾]     │  │
│  │      动画: [向左滑入 ▾]       │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ● hover (悬浮)          [⋮]  │  │
│  │  ① → 切换状态: [hover ▾]      │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ● click (点击)          [⋮]  │  │
│  │  ① → 切换状态: [loading ▾]    │  │
│  │  ② → 切换全局: 任务→进行中    │  │
│  │  ↑ 事件链: 两个行为顺序执行    │  │
│  └────────────────────────────────┘  │
│                                      │
│  [+ 添加事件]                         │
│                                      │
│  ──────────────────────────────────  │
│  ℹ️ 事件在预览模式 (Cmd+P) 下        │
│     真实执行，编辑模式下仅配置。      │
│                                      │
└──────────────────────────────────────┘
```

### 3.2 事件卡片设计

```
单个事件卡片的结构:

┌──────────────────────────────────────┐
│  ● click (点击)                [⋮]  │ ← 触发器类型 + 中文名 + 更多菜单
│  ① → 跳转到: [注册页面 ▾]           │ ← 行为 1（内联可编辑下拉）
│      动画: [向左滑入 ▾]             │ ← 行为 1 的参数
│  ② → 切换状态: [loading ▾]          │ ← 行为 2（事件链第二步）
│  [+ 添加行为]                        │ ← 为此事件追加更多行为
└──────────────────────────────────────┘

卡片视觉规范:
  · 背景: #F8F9FA，圆角 8px，1px 边框 #E5E5E5
  · 触发器行: 字号 13px 加粗，● 蓝色圆点
  · 行为行: 字号 12px 常规，缩进 16px
  · 序号 ①②③: 灰色圆角数字，仅事件链（多行为）时显示
  · 行为内的下拉框: 内联，可直接修改（快速调整）
  · [⋮] 更多菜单:
    - 编辑（弹出完整配置面板）
    - 复制事件
    - 禁用/启用
    - 删除
  · 卡片之间间距: 8px
  · 拖拽卡片可调整事件顺序
```

### 3.3 添加事件：完整配置面板

```
点击 [+ 添加事件] → 弹出事件配置面板（Overlay）:

┌──────────────────────────────────────────────┐
│  配置事件                             [×]    │
├──────────────────────────────────────────────┤
│                                              │
│  ── 触发器 ──────────────────────────────── │
│                                              │
│  (●) click    点击                           │
│  ( ) hover    悬浮                           │
│  ( ) focus    获得焦点                       │
│  ( ) blur     失去焦点                       │
│  ( ) longPress 长按                          │
│                                              │
│  ── 行为列表 ────────────────────────────── │
│                                              │
│  ① ┌──────────────────────────────────────┐ │
│    │  行为类型: [跳转页面 ▾]              │ │
│    │                                      │ │
│    │  目标页面: [注册页面 ▾]              │ │
│    │  切换动画: [向左滑入 ▾]              │ │
│    │                              [× 删除]│ │
│    └──────────────────────────────────────┘ │
│                                              │
│  ② ┌──────────────────────────────────────┐ │
│    │  行为类型: [切换全局状态 ▾]          │ │
│    │                                      │ │
│    │  状态变量: [任务状态 ▾]              │ │
│    │  设置为:   [进行中 ▾]               │ │
│    │                              [× 删除]│ │
│    └──────────────────────────────────────┘ │
│                                              │
│  [+ 添加行为]   ← 事件链：添加更多行为      │
│                                              │
│  ── 描述（可选）─────────────────────────── │
│  [点击提交按钮跳转注册页并开始任务      ]    │
│                                              │
│                        [取消]  [确认]        │
└──────────────────────────────────────────────┘
```

### 3.4 各行为类型的配置 UI

```
── 跳转页面 (navigate) ──

  目标页面: [注册页面 ▾]
    (列出当前项目的所有 Screen)
  切换动画: [向左滑入 ▾]
    无 / 向左滑入 / 向右滑入 / 向上滑入 / 向下滑入 / 淡入 / 缩放进入

── 切换状态 (setState) ──

  目标元素: [当前元素 ▾]
    当前元素 / [选择其他元素...] → 弹出组件树选择器
  目标状态: [loading ▾]
    (列出目标元素定义的所有业务状态)

── 打开链接 (openUrl) ──

  URL: [https://example.com         ]
  打开方式: [新窗口 ▾]
    当前窗口 (_self) / 新窗口 (_blank)

── 切换全局状态 (setGlobalState) ──

  状态变量: [任务状态 ▾]
    (列出当前页面定义的所有全局状态变量)
  设置为: [进行中 ▾]
    (列出该变量的所有可选值)

── 显示/隐藏 (toggleVisible) ──

  目标元素: [选择元素... ▾] → 弹出组件树选择器
  操作: [切换 ▾]
    显示 (show) / 隐藏 (hide) / 切换 (toggle)

── 自定义动作 (custom) ──

  动作标识: [showModal          ]
  说明: 导出代码时将生成占位函数，需开发者实现
```

### 3.5 元素选择器（跨组件引用）

```
"目标元素" 选择器用于 setState / toggleVisible 等需要引用其他元素的行为:

点击 [选择元素...] → 弹出组件树选择器:

┌────────────────────────────────────┐
│  选择目标元素                 [×]   │
├────────────────────────────────────┤
│  [🔍 搜索节点...             ]    │
│                                    │
│  ▾ 📦 div.root                    │
│    ▾ 📦 div.header                │
│      📷 img.logo                  │
│      📝 h1 "欢迎登录"             │
│    ▾ 📦 div.form                  │
│      📥 input.username            │
│      📥 input.password            │
│      ☑️ div.remember              │  ← 点击选中
│      🔘 button.submit             │
│    ▾ 📦 div.footer                │
│                                    │
│  已选择: div.remember             │
│                                    │
│               [取消]  [确认]       │
└────────────────────────────────────┘

也可以直接在画布上点击选择:
  · 弹出选择器后，画布进入"选择目标模式"
  · 鼠标变为十字准星
  · hover 元素 → 高亮（绿色边框，区别于编辑时的蓝色）
  · 点击 → 确认选择
```

---

## 四、事件链（多行为顺序执行）

### 4.1 设计理念

```
一个触发器可以顺序执行多个行为——这就是事件链:

示例: 点击"提交"按钮
  ① 切换自身状态为 loading
  ② 切换全局状态 taskStatus = inProgress
  ③ 2 秒后切换自身状态为 success（远期，需要延时行为）

事件链中的行为按顺序同步执行（当前版本）。
远期可支持延时行为（② → 等待 2s → ③）。
```

### 4.2 行为排序

```
事件配置面板中:
  · 行为按序号 ①②③ 排列
  · 拖拽行为卡片可调整顺序
  · [+ 添加行为] 追加到末尾

执行顺序:
  · 预览模式: 按序号从 ① 到 N 同步执行
  · 导出代码: 按顺序生成函数调用
    function handleClick() {
      setState("loading");        // ①
      setGlobalState("taskStatus", "inProgress");  // ②
    }
```

---

## 五、页面跳转与导航关系

### 5.1 导航关系图（远期）

```
当多个页面之间通过 navigate 事件建立了跳转关系时，
可以生成一个导航关系图:

  ┌──────────┐   click    ┌──────────┐
  │  登录页   │ ─────────→ │  首页     │
  └──────────┘             └──────────┘
       │                        │
       │ click                  │ click
       ▼                        ▼
  ┌──────────┐            ┌──────────┐
  │  注册页   │            │  设置页   │
  └──────────┘            └──────────┘

入口: 顶部工具栏 → [🗺 页面关系] 或页面列表底部 → [查看关系图]

关系图 UI:
  · 每个页面 = 一个卡片节点（显示缩略图 + 名称）
  · 跳转关系 = 箭头连线（标注触发器元素名 + 动画类型）
  · 可拖拽调整节点位置
  · 点击节点 → 跳转到该页面编辑
  · 孤岛页面（无跳转关系）→ 灰色标记

这是远期功能，MVP 阶段不实现。
```

### 5.2 跳转行为在预览模式中的表现

```
预览模式下点击一个绑定了 navigate 事件的按钮:

  1. 执行转场动画（如向左滑入）
  2. 画布内容切换为目标页面
  3. 预览控制条更新当前页面名
  4. 导航栈记录跳转历史:
     [← 后退] 可回到上一个页面

  导航栈:
    登录页 → 注册页 → 首页
                       ↑ 当前
    点击 [← 后退] → 回到注册页
```

---

## 六、hover 事件的特殊处理

### 6.1 hover 的对称性

```
hover 触发器与其他触发器不同 —— 它天然有"进入"和"离开"两个阶段:

  鼠标进入 → 触发 hover 事件绑定的行为
  鼠标离开 → 行为自动反转

自动反转规则:
  · setState("hover") → 离开时自动 setState("default")
  · toggleVisible("show") → 离开时自动 toggleVisible("hide")
  · setGlobalState(var, val) → 离开时恢复为之前的值
  · navigate → 不反转（跳转是不可逆的）
  · openUrl → 不反转

用户不需要手动定义"鼠标离开时做什么" —— 系统自动处理。
如果需要不对称的 hover 行为，可以分别绑定 hover + blur。
```

### 6.2 hover 与交互状态的关系

```
hover 触发器 vs 交互状态 hover:

  交互状态 hover（04-state-system 定义）:
    · 仅影响样式覆盖
    · 自动触发（CSS 伪类级别）
    · 不需要显式绑定事件

  hover 事件触发器（本文档定义）:
    · 可触发任意行为（状态切换、显示隐藏、等）
    · 需要显式绑定
    · 用于超出"样式变化"的 hover 行为

  两者互补:
    · 简单的 hover 效果（变色、透明度）→ 用交互状态的样式覆盖
    · 复杂的 hover 效果（显示 tooltip、切换元素可见性）→ 用 hover 事件
```

---

## 七、事件在画布中的视觉标记

### 7.1 编辑模式下的事件标记

```
已绑定事件的元素在画布中显示标记（Canvas 覆盖层绘制）:

  ┌──────────────────────────────┐
  │                         ⚡   │  ← 右上角闪电图标
  │    button "提交"             │     小图标 (12×12px)
  │                              │     颜色: #FF9500 (橙色)
  └──────────────────────────────┘

  hover 闪电图标 → tooltip 显示事件摘要:
    "click → 跳转: 注册页面"
    "hover → 状态: hover"

  ⚡ 图标的变体:
    · 单个事件 → ⚡
    · 多个事件 → ⚡ 后面显示数字（⚡3）
    · 被禁用的事件 → 灰色 ⚡
```

### 7.2 组件树中的事件标记

```
组件树中:
  🔘 button.submit ⚡       ← 节点名后方显示闪电图标

属性面板 Tab 栏:
  交互 Tab → 蓝色小圆点徽标（表示有已绑定的事件）
```

### 7.3 跳转目标的关联线（可选）

```
选中一个带有 navigate 事件的元素时:
  可选择在页面列表中显示目标页面的高亮关联线

  组件树:
    🔘 button "注册" ⚡
       └─→ 📱 注册页          ← 灰色虚线箭头连到页面列表的目标页面

这是远期功能，MVP 不实现。
```

---

## 八、代码导出映射

### 8.1 React 导出

```typescript
// navigate 行为
<button onClick={() => router.push("/register", { animation: "slideLeft" })}>
  注册
</button>

// setState 行为
<button onClick={() => setButtonState("loading")}>
  {buttonState === "loading" ? "加载中..." : "提交"}
</button>

// 事件链（多行为）
<button onClick={() => {
  setButtonState("loading");
  setGlobalState("taskStatus", "inProgress");
}}>
  提交
</button>

// hover 行为（对称处理）
<div
  onMouseEnter={() => setTooltipVisible(true)}
  onMouseLeave={() => setTooltipVisible(false)}
>
  hover 我
</div>

// toggleVisible 行为
<button onClick={() => setModalVisible(!modalVisible)}>
  {modalVisible ? "关闭" : "打开"} 弹窗
</button>

// openUrl 行为
<a onClick={() => window.open("https://example.com", "_blank")}>
  打开链接
</a>
```

### 8.2 导出的完整性

```
事件导出策略:
  · navigate → 生成路由跳转代码（需要路由库配置）
  · setState → 生成 useState + 条件渲染
  · setGlobalState → 生成 Context 或状态管理代码
  · toggleVisible → 生成 useState<boolean> + 条件渲染
  · openUrl → 生成 window.open()
  · custom → 生成带 TODO 注释的占位函数

每个行为的导出都是完整可运行的——
  不是注释、不是伪代码，而是真实的 React/Vue 代码。
```

---

## 九、与其他子系统的接口约定

### 9.1 事件系统 → 状态系统 (04-state-system)

```typescript
// setState 行为 → 调用状态系统
function executeSetState(targetId: string, stateName: string) {
  executor.execute({
    type: "setActiveState",
    params: { nodeId: targetId, stateName }
  });
}

// setGlobalState 行为 → 调用全局状态
function executeSetGlobalState(variableName: string, value: string) {
  executor.execute({
    type: "setGlobalState",
    params: { variableName, value }
  });
}
```

### 9.2 事件系统 → 预览模式 (10-preview-mode)

```typescript
// 预览模式下的事件执行引擎
interface EventExecutor {
  execute(event: ComponentEventV2, sourceNodeId: string): void;
  // 预览模式下注册到真实 DOM 事件
  // click → addEventListener("click", ...)
  // hover → addEventListener("mouseenter", ...) + addEventListener("mouseleave", ...)
}
```

### 9.3 事件系统 → Operations

```typescript
// 事件 CRUD
executor.execute({
  type: "addEvent",
  params: { nodeId, event: { trigger: "click", actions: [{ type: "navigate", targetScreenId: "s2" }] } }
});

executor.execute({
  type: "removeEvent",
  params: { nodeId, eventId: "evt-1" }
});

executor.execute({
  type: "updateEvent",
  params: { nodeId, eventId: "evt-1", event: { ... } }
});

// 快捷操作: 添加页面跳转
executor.execute({
  type: "addNavigation",
  params: { nodeId, trigger: "click", targetScreenId: "s2", animation: "slideLeft" }
});
```

---

## 十、边界情况与异常处理

| 场景 | 预期行为 |
|------|---------|
| navigate 目标页面被删除 | 事件卡片显示 ⚠️ "目标页面不存在"；预览模式下跳转无效 |
| setState 目标状态被删除 | 事件卡片显示 ⚠️ "目标状态不存在" |
| toggleVisible 目标元素被删除 | 事件卡片显示 ⚠️ "目标元素不存在" |
| 同一元素绑定重复的触发器 | 允许（两个独立的 click 事件各自执行，顺序按定义顺序） |
| 事件链中某行为执行失败 | 跳过失败行为，继续执行后续行为；控制台输出警告 |
| hover + navigate（hover 触发跳转）| 允许但不推荐；跳转不可反转（离开时不会跳回） |
| 编辑模式下误触发事件 | 不会——编辑模式下事件不执行（Canvas 覆盖层拦截所有鼠标事件） |
| 禁用的事件 | 事件卡片灰色显示，预览模式不执行，导出代码时注释掉 |
| 循环跳转（A→B→A→B...）| 预览模式下允许（用户可以手动 [← 后退]）；导出代码时不特殊处理 |
| 超多事件（一个元素 > 10 个事件）| 允许但给出提示；交互 Tab 中事件卡片区域可滚动 |

---

## 十一、MVP 与后期功能分界

### MVP（Phase 4，紧随数据驱动之后）

- [x] 事件模型：trigger + 单个 action（暂不支持事件链） <!-- W5 -->
- [x] 5 种触发器：click / hover / focus / blur / longPress <!-- W5 + doubleClick -->
- [x] 4 种核心行为：navigate / setState / openUrl / setGlobalState <!-- W5 -->
- [x] 交互 Tab 基础 UI（事件卡片列表 + 添加事件面板） <!-- W5 -->
- [ ] 事件卡片内联编辑（下拉快速修改参数）
- [x] 画布 ⚡ 闪电图标标记 <!-- W5 -->
- [ ] addEvent / removeEvent / updateEvent Operations <!-- addEvent/removeEvent done W5；updateEvent 待补 -->

### Phase 5（事件链 + 高级行为）

- [ ] 事件链：一个触发器多个行为顺序执行
- [x] toggleVisible 行为 + 元素选择器 <!-- W6 EventExecutionEngine -->
- [ ] hover 事件的自动反转逻辑
- [ ] 元素选择器（组件树弹窗 + 画布点击选择）
- [ ] 事件禁用/启用
- [ ] 事件描述字段（人类可读注释）

### Phase 6（远期高级功能）

- [ ] 条件事件（EventCondition: if globalState == "xxx"）
- [ ] custom 自定义动作
- [ ] 延时行为（事件链中插入 delay）
- [ ] 页面导航关系图可视化
- [ ] 跳转目标关联线（选中元素→页面列表高亮）
- [ ] 代码导出中的完整事件映射

---

## 十二、核心设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 事件定义在哪？ | ComponentNode.events[]（声明式） | 事件是元素的属性，不是独立的连线图层；与前端代码的 onXxx 一致 |
| 触发器有哪些？ | 5 种（click/hover/focus/blur/longPress）| 覆盖 95% 的交互场景；真实前端代码也就这些事件 |
| 行为有哪些？ | 6 种（navigate/setState/openUrl/setGlobalState/toggleVisible/custom）| 从 Figma Prototype 的跳转扩展到状态/数据/可见性全覆盖 |
| 事件链的执行？ | 同步顺序执行 | 简单可预测；异步/延时是远期增强 |
| hover 的反转？ | 自动反转（鼠标离开自动恢复） | 99% 的 hover 行为都是对称的；不对称场景用 hover+blur 分别绑定 |
| 编辑模式下事件执行？ | 不执行（仅配置） | 编辑时需要点击选中元素，不是触发事件；预览模式下真实执行 |
| 目标元素选择方式？ | 组件树弹窗 + 画布点击选择 双模式 | 组件树精确但需要知道节点名；画布点击直观但可能误选 |
| 条件事件？ | 远期（Phase 6）| MVP 阶段先满足无条件的直接事件，条件逻辑复杂度高 |
