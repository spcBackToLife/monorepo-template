# 14 - 产品全景 PRD 与交互链路图

> Schema 不只是导出代码——它应该自动沉淀为一份**完整的、可阅读的、结构化的产品 PRD**，
> 让任何人打开就能感知产品的一切：模块、功能、每个组件的细节交互、所有用户故事的完整链路。

---

## 一、问题本质：从第一性原理出发

### 1.1 重新审视 Schema 的本质

我们在 `first-principles.md` 中确立了核心命题：

> **设计 ≠ 画图。设计 = 构造 Schema。Schema 本身就是产品的源数据。**

这意味着 Schema 同时是三种东西：

```
Schema
  ├── 可渲染的 UI ────→ 画布实时预览
  ├── 可编译的代码 ────→ Codegen（React / Vue / Flutter）
  └── 可阅读的产品 ────→ ???
```

前两个已经实现。第三个——**从 Schema 自动生成一份人类可阅读的、体系化的产品文档**——是缺失的。

### 1.2 当前的真实痛点

设计师/PM 在编辑器里完成了一个产品的设计后：

| 问题 | 现状 |
|------|------|
| "这个产品有哪些模块？每个模块什么功能？" | 只能打开编辑器，逐页面看 |
| "这个按钮点击后完整发生了什么？" | 要打开节点、展开事件面板、逐 action 阅读 |
| "用户从登录到完成购买的完整链路是什么？" | 脑子里串，没有任何地方沉淀 |
| "新来的 PM 如何快速理解这个产品？" | 没有文档，只能看编辑器或听人讲 |
| "想给开发交付一份需求文档？" | 手写，且与设计数据脱节 |
| "产品一共有多少种状态组合和交互场景？" | 无法量化，凭感觉 |

**根因：Schema 虽然蕴含完整的产品信息，但它是「机器可读」的——对人类来说，散落在树结构和事件数组里的信息不等于「可感知的产品全景」。**

### 1.3 真正需要的是什么

```
一份结构化 PRD
  ├── 产品概览：名称、平台、页面数量、核心数据
  ├── 模块拆解：按页面/功能域拆解为模块
  ├── 每个模块：
  │   ├── 功能描述：这个页面做什么
  │   ├── 页面结构：组件树的语义化描述
  │   ├── 组件清单：每个关键组件的完整行为
  │   │   ├── 基本信息：名称、类型、位置
  │   │   ├── 状态描述：所有视觉状态及切换条件
  │   │   ├── 交互描述：每个事件 → 触发条件 → 完整动作链
  │   │   ├── 数据绑定：消费了什么数据、数据来源
  │   │   └── 条件逻辑：什么条件下显示/隐藏/样式变化
  │   ├── 状态变量：该页面定义的所有状态及其影响范围
  │   ├── 数据依赖：数据源、API、各场景下的表现
  │   └── 页面截图矩阵：各状态 × 数据场景的渲染效果
  │
  ├── 全局状态总览：跨页面共享的状态变量及其影响
  ├── 数据架构总览：所有数据源和 API 的汇总
  │
  └── 交互链路图：
      ├── 产品全局流程图：页面间跳转拓扑
      ├── 用户故事链路：具名的端到端流程（如"购买流程"）
      ├── 状态流转图：某个状态变量的生命周期
      └── 数据流图：数据从 API → 绑定 → UI 的完整流向
```

**核心洞察：这不是一个「查询工具」，而是一个「文档生成引擎」——Schema 的第三种导出格式。**

```
Codegen   = Schema → 代码（给机器执行）
PRD Gen   = Schema → 产品文档（给人类阅读）
Flow Gen  = Schema → 交互链路图（给人类感知）
```

三者共享同一份 Schema 数据源，零维护成本，永远与设计同步。

---

## 二、产品设计

### 2.1 产品定位

**产品全景 PRD** 是编辑器的一个独立视图，与画布模式、全景渲染模式并列：

```
画布模式（Canvas）     → 逐组件编辑交互和样式
全景渲染（Panorama）   → 查看所有状态的渲染效果（视觉维度）
产品全景（Blueprint）  → 阅读完整的产品逻辑和交互链路（逻辑维度）
```

路由：`/editor/:projectId/blueprint`

**核心价值：任何人打开 Blueprint，不需要理解编辑器、不需要理解 Schema，就能完整感知这个产品的一切。**

### 2.2 Blueprint 的两大组成

```
Blueprint（产品全景）
  │
  ├── Part 1: 结构化 PRD（Product Spec）
  │   可滚动阅读的文档体验
  │   从概览到细节，层层深入
  │   每个字都从 Schema 自动生成
  │
  └── Part 2: 交互链路图（Flow Map）
      可交互的可视化图表
      展示页面流、状态流、数据流
      支持用户故事追踪
```

两者互联互通：PRD 中的交互描述可跳转到链路图的对应位置；链路图中的节点可跳转到 PRD 的对应章节。

---

## 三、Part 1：结构化 PRD（自动生成的产品文档）

### 3.1 文档结构设计

PRD 采用**书籍式结构**，从全局到局部，逐层展开：

```
产品全景 PRD
│
├── 第一章：产品概览
│   ├── 产品信息（名称、平台、视口）
│   ├── 产品规模（页面数、组件数、事件数、状态数、API 数）
│   ├── 页面地图（所有页面缩略图 + 跳转关系缩略图）
│   └── 全局配置（环境变量、默认视口、主题信息）
│
├── 第二章：全局定义
│   ├── 2.1 环境变量总览（theme, locale, userRole...每个的值和影响）
│   ├── 2.2 组件资产库（所有复用组件及其 Props 接口）
│   └── 2.3 全局数据架构（跨页面共享的数据定义）
│
├── 第三章：[Login 页面]          ← 按页面生成章节
│   ├── 3.1 页面概述
│   ├── 3.2 页面结构
│   ├── 3.3 组件行为清单
│   ├── 3.4 状态定义与流转
│   ├── 3.5 数据与 API
│   ├── 3.6 交互事件汇总
│   └── 3.7 状态 × 数据截图矩阵
│
├── 第四章：[Home 页面]
│   └── ...（同上结构）
│
├── ...更多页面章节...
│
├── 第 N 章：用户故事链路
│   ├── N.1 链路概览（所有具名链路列表）
│   ├── N.2 注册登录流程
│   ├── N.3 购买下单流程
│   └── N.4 ...
│
└── 附录
    ├── A. 完整事件索引（按触发器类型分组）
    ├── B. 完整状态变量索引（定义位置 + 读写者）
    ├── C. 完整 API 索引（端点 + Mock 场景）
    └── D. 完整数据绑定索引（表达式 + 消费组件）
```

### 3.2 各章节的生成逻辑

#### 第一章：产品概览

**生成来源**：`DesignProject` 顶层字段

```
┌──────────────────────────────────────────────────────────┐
│  📋 产品概览                                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  产品名称：电商 App                                       │
│  目标平台：Mobile（375 × 812, iPhone 15 Pro）             │
│  创建时间：2026-04-01                                     │
│                                                          │
│  ┌─────────┬──────────┬──────────┬──────────┬─────────┐  │
│  │  8 页面  │ 156 组件  │ 42 事件  │ 12 状态  │  5 API  │  │
│  └─────────┴──────────┴──────────┴──────────┴─────────┘  │
│                                                          │
│  页面地图：                                               │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐           │
│  │Login │───→│ Home │───→│Order │───→│Detail│           │
│  │      │    │      │───→│ List │    │      │           │
│  └──────┘    └──┬───┘    └──────┘    └──────┘           │
│                 │                                        │
│            ┌────┴───┐    ┌──────┐                        │
│            │Profile │    │ Cart │                        │
│            │        │    │      │                        │
│            └────────┘    └──────┘                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**提取算法**：
```typescript
function generateOverview(project: DesignProject): OverviewSection {
  const stats = {
    screenCount: project.screens.length,
    componentCount: countAllNodes(project),
    eventCount: countAllEvents(project),
    stateCount: countAllStates(project),
    apiCount: countAllApis(project),
  }

  const pageMap = buildNavigationGraph(project) // 提取所有 navigate 边

  return { info: project, stats, pageMap }
}
```

#### 第二章：全局定义

**2.1 环境变量总览**

从 `project.environmentStates[]` 生成：

```
┌──────────────────────────────────────────────────────────┐
│  🌐 环境变量：theme（主题）                                │
├──────────────────────────────────────────────────────────┤
│  可选值：light（浅色）| dark（深色）                       │
│  默认值：light                                            │
│                                                          │
│  影响范围（12 个组件）：                                   │
│  ┌────────────────────────────────────────────────┐      │
│  │ Login Page                                      │      │
│  │   • PageBackground → 背景色: #FFF / #1A1A1A     │      │
│  │   • LoginCard → 背景色: #FFF / #2D2D2D          │      │
│  │   • InputField → 边框色: #D9D9D9 / #434343      │      │
│  │ Home Page                                       │      │
│  │   • NavBar → 背景色: #FFF / #141414              │      │
│  │   • TabBar → 文字色: #333 / #FFF                 │      │
│  │   ...共 12 个组件受影响                           │      │
│  └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

**提取算法**：
```typescript
function generateEnvStateSection(project: DesignProject): EnvStateSection[] {
  return project.environmentStates.map(envVar => {
    // 遍历所有页面所有节点，找到 environmentBindings 中引用此变量的
    const consumers = findAllEnvBindingConsumers(project, envVar.name)
    return {
      variable: envVar,
      consumers, // 按页面分组的消费者列表
      totalAffected: consumers.reduce((sum, c) => sum + c.nodes.length, 0)
    }
  })
}
```

**2.2 组件资产库**

从 `project.componentAssets[]` 生成：

```
┌──────────────────────────────────────────────────────────┐
│  🧩 组件：PrimaryButton                                   │
├──────────────────────────────────────────────────────────┤
│  分类：表单 / 按钮    使用次数：14                          │
│                                                          │
│  Props 接口：                                             │
│  ┌──────────┬─────────┬─────────┬────────────────┐      │
│  │ 属性名    │ 类型    │ 默认值   │ 说明           │      │
│  ├──────────┼─────────┼─────────┼────────────────┤      │
│  │ label    │ string  │ "按钮"  │ 按钮文案       │      │
│  │ variant  │ enum    │ solid   │ solid / outline │      │
│  │ disabled │ boolean │ false   │ 是否禁用       │      │
│  │ onClick  │ action  │ -       │ 点击回调       │      │
│  └──────────┴─────────┴─────────┴────────────────┘      │
│                                                          │
│  视觉状态：                                               │
│  [default] [hover] [pressed] [focus] [disabled]          │
│  （各状态缩略图）                                         │
│                                                          │
│  使用位置：                                               │
│  • Login Page → loginBtn, registerBtn                    │
│  • Home Page → searchBtn, filterBtn                      │
│  • Cart Page → checkoutBtn                               │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

#### 第三章起：每个页面的详细文档

这是 PRD 的核心。对每个 `Screen`，生成以下子章节：

---

**3.1 页面概述**

```
┌──────────────────────────────────────────────────────────┐
│  📱 Login Page（登录页）                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  功能概述：                             │
│  │              │  用户通过手机号/密码登录系统。             │
│  │  (页面截图)   │  支持记住密码、忘记密码、跳转注册。       │
│  │              │                                        │
│  │              │  入口来源（谁跳到这里）：                 │
│  └──────────────┘    • App 启动（首页，未登录时重定向）     │
│                      • Profile → 退出登录                 │
│                                                          │
│                   出口去向（从这里跳到哪）：                 │
│                      • → Home（登录成功）                  │
│                      • → Register（点击注册）              │
│                      • → ForgotPassword（点击忘记密码）     │
│                                                          │
│  页面统计：24 个组件 · 8 个事件 · 2 个状态变量 · 1 个 API  │
└──────────────────────────────────────────────────────────┘
```

**"功能概述" 的生成逻辑**：

这一段是唯一需要**AI 辅助生成**的内容——基于页面的组件树结构、事件类型、数据绑定，推断出这个页面的功能定位：

```typescript
function generatePageSummary(screen: Screen, project: DesignProject): string {
  // 收集事实
  const facts = {
    componentTypes: extractComponentTypes(screen.rootNode),   // 有 input? form? list?
    eventTypes: extractEventTypes(screen.rootNode),           // 有 navigate? apiRequest?
    dataBindings: extractDataBindings(screen.rootNode),       // 绑定了什么数据
    incomingNavs: findIncomingNavigations(screen, project),   // 谁跳到这里
    outgoingNavs: findOutgoingNavigations(screen, project),   // 从这里跳到哪
    domainStates: screen.domainStates,                        // 状态变量
    apis: screen.apiEndpoints,                                // API 端点
  }

  // 方案 A：基于规则模板生成（确定性，不需要 AI）
  return templateBasedSummary(facts)

  // 方案 B：调用 AI 生成自然语言摘要（更自然）
  // return await aiGenerateSummary(facts)
}
```

---

**3.2 页面结构（语义化组件树）**

将 `ComponentNode` 树转换为人类可读的结构描述：

```
┌──────────────────────────────────────────────────────────┐
│  📐 页面结构                                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Login Page                                              │
│  └── main (div) ─ 全屏容器，纵向 flex 居中                │
│      ├── Logo (img) ─ 品牌 Logo，48×48                    │
│      ├── Title (h1) ─ "欢迎登录"                          │
│      ├── LoginForm (div) ─ 表单容器                       │
│      │   ├── PhoneInput (input) ─ 手机号输入               │
│      │   │   └── 📎 绑定: {{data.savedPhone}}             │
│      │   ├── PasswordInput (input) ─ 密码输入              │
│      │   ├── RememberMe (div) ─ 记住密码勾选               │
│      │   │   └── 👁 条件: 仅 loginStep=filling 时显示     │
│      │   └── LoginButton ⚡ (button) ─ "登录"             │
│      │       ├── ⚡ click → apiRequest + navigate         │
│      │       └── 🔵 states: default / loading / error     │
│      ├── Divider (div) ─ 分隔线                           │
│      ├── RegisterLink ⚡ (a) ─ "没有账号？立即注册"         │
│      │   └── ⚡ click → navigate(Register)                │
│      └── ForgotLink ⚡ (a) ─ "忘记密码？"                  │
│          └── ⚡ click → navigate(ForgotPassword)          │
│                                                          │
│  图例：⚡ 有交互事件  📎 有数据绑定  👁 条件可见            │
│        🔵 多状态组件  🧩 组件实例                          │
└──────────────────────────────────────────────────────────┘
```

**生成算法**：
```typescript
function generateStructureTree(
  node: ComponentNode,
  depth: number,
  screen: Screen
): StructureNode {
  const annotations: string[] = []

  // 收集组件标注
  if (node.events.length > 0) annotations.push('⚡ 有交互')
  if (hasDataBindings(node)) annotations.push('📎 有数据绑定')
  if (node.visibilityWhen || hasVisibilityBindings(node))
    annotations.push('👁 条件可见')
  if (node.states.length > 1) annotations.push('🔵 多状态')
  if (node.templateRef) annotations.push('🧩 组件实例')

  // 生成语义描述（从 props 推断）
  const description = inferDescription(node)
  // 如: type=img → "图片" + props.src
  //     type=input → "输入框" + props.placeholder
  //     type=button → "按钮" + props.children text

  return {
    name: node.name || node.type,
    type: node.type,
    description,
    annotations,
    children: node.children?.map(c => generateStructureTree(c, depth + 1, screen))
  }
}
```

---

**3.3 组件行为清单（核心！）**

对每个**有交互、有状态或有数据绑定**的组件，生成完整的行为规格：

```
┌──────────────────────────────────────────────────────────┐
│  ⚡ LoginButton 行为规格                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  类型：button（PrimaryButton 实例）                        │
│  位置：LoginPage → LoginForm → LoginButton               │
│  文案：{{data.loginBtnText | "登录"}}                     │
│                                                          │
│  ── 视觉状态 ──────────────────────────────────          │
│                                                          │
│  ┌───────────┬──────────────────────────────────┐       │
│  │ default   │ 蓝底白字，圆角 8px，高 44px       │       │
│  │ hover     │ 背景色加深至 #1157CC              │       │
│  │ pressed   │ 缩放 0.98，背景色 #0E4AB3         │       │
│  │ loading   │ 文字换为 Spinner + "登录中..."     │       │
│  │           │ 禁用点击事件                       │       │
│  │ error     │ 红色边框，文字 "重试"              │       │
│  │ disabled  │ 灰底灰字，不可点击                 │       │
│  └───────────┴──────────────────────────────────┘       │
│                                                          │
│  ── 交互事件 ──────────────────────────────────          │
│                                                          │
│  事件 1：click（点击）                                    │
│  ┌─ 条件：loginStep == "filling"                         │
│  │                                                       │
│  ├─ action 1: setState(LoginButton, "loading")           │
│  │  → 按钮切换到 loading 状态                             │
│  │                                                       │
│  ├─ action 2: apiRequest("loginApi")                     │
│  │  → 调用登录接口                                        │
│  │  │                                                    │
│  │  ├── onSuccess（成功）:                                │
│  │  │   action: setDomainState("authStatus", "loggedIn") │
│  │  │   → 将认证状态设为已登录                             │
│  │  │   action: navigate("Home", slide-left)              │
│  │  │   → 跳转到首页，左滑动画                             │
│  │  │   action: showToast("success", "登录成功")          │
│  │  │   → 显示成功提示                                    │
│  │  │                                                    │
│  │  └── onFailure（失败）:                                │
│  │      action: setState(LoginButton, "error")           │
│  │      → 按钮切换到错误状态                               │
│  │      action: showToast("error","账号或密码错误")        │
│  │      → 显示错误提示                                    │
│  │                                                       │
│  └─ 事件 2：hover（鼠标悬停）                              │
│     action: setState(LoginButton, "hover")               │
│     → 自动在鼠标离开时恢复 default                         │
│                                                          │
│  ── 数据绑定 ──────────────────────────────────          │
│                                                          │
│  • children(文案) ← {{data.loginBtnText | "登录"}}       │
│                                                          │
│  ── 条件逻辑 ──────────────────────────────────          │
│                                                          │
│  • 当 loginStep = "submitting" → disabled = true         │
│  • 当 authStatus = "loggedIn" → visible = false          │
│                                                          │
│  [跳转到画布编辑] [查看链路图中的位置]                      │
└──────────────────────────────────────────────────────────┘
```

**生成算法（核心）**：

```typescript
interface ComponentBehaviorSpec {
  // 基本信息
  identity: {
    name: string
    type: string
    templateName?: string      // 组件实例来源
    path: string               // 在树中的位置路径
    textContent?: string       // 显示文案
  }

  // 视觉状态
  states: {
    name: string
    description: string        // 从样式差异推断的描述
    styleChanges: string[]     // 相对 default 的关键样式变化
    disabledEvents?: string[]  // 该状态下禁用的事件
  }[]

  // 交互事件
  events: {
    trigger: string
    condition?: string         // 执行条件的自然语言描述
    actionChain: ActionDescription[]  // 完整事件链的自然语言描述
  }[]

  // 数据绑定
  dataBindings: {
    propKey: string            // 绑定到哪个属性
    expression: string         // 绑定表达式
    dataSource?: string        // 来自哪个数据源
  }[]

  // 条件逻辑
  conditionalLogic: {
    condition: string          // 条件描述
    effect: string             // 效果描述
    source: 'domainState' | 'environmentState' | 'visibilityWhen'
  }[]
}

function generateComponentSpec(
  node: ComponentNode,
  screen: Screen,
  project: DesignProject,
  parentPath: string
): ComponentBehaviorSpec | null {
  // 跳过无行为的纯布局节点
  const hasBehavior =
    node.events.length > 0 ||
    node.states.length > 1 ||
    hasDataBindings(node) ||
    node.domainStateBindings?.length ||
    node.environmentBindings?.length ||
    node.visibilityWhen

  if (!hasBehavior) return null

  const path = parentPath + ' → ' + (node.name || node.type)

  return {
    identity: {
      name: node.name || node.type,
      type: node.type,
      templateName: node.templateRef?.templateId,
      path,
      textContent: extractTextContent(node),
    },

    states: node.states.map(state => ({
      name: state.name,
      description: describeStateChange(state, node.styles),
      styleChanges: diffStyles(node.styles, state.styles),
      disabledEvents: state.disabledEvents,
    })),

    events: node.events.map(event => ({
      trigger: event.trigger,
      condition: event.condition
        ? describeCondition(event.condition)
        : undefined,
      actionChain: describeActionChain(event.actions, project),
    })),

    dataBindings: extractDataBindings(node),

    conditionalLogic: [
      ...describeVisibilityWhen(node),
      ...describeDomainBindings(node.domainStateBindings),
      ...describeEnvBindings(node.environmentBindings),
    ]
  }
}

/**
 * 将 EventAction 转换为自然语言描述
 */
function describeAction(
  action: EventAction,
  project: DesignProject
): ActionDescription {
  switch (action.type) {
    case 'navigate': {
      const targetScreen = project.screens.find(
        s => s.id === action.targetScreenId
      )
      return {
        type: 'navigate',
        description: `跳转到「${targetScreen?.name}」页面`,
        detail: action.animation
          ? `动画：${action.animation.type}`
          : undefined,
      }
    }

    case 'setState':
      return {
        type: 'setState',
        description: `将「${resolveNodeName(action.targetId)}」切换到「${action.state}」状态`,
        detail: action.autoRevertMs
          ? `${action.autoRevertMs}ms 后自动恢复`
          : undefined,
      }

    case 'apiRequest': {
      const endpoint = resolveApiEndpoint(action.requestId, project)
      return {
        type: 'apiRequest',
        description: `调用「${endpoint?.definition.name}」接口（${endpoint?.definition.method} ${endpoint?.definition.path}）`,
        branches: {
          onSuccess: action.onSuccess?.map(a => describeAction(a, project)),
          onFailure: action.onFailure?.map(a => describeAction(a, project)),
        }
      }
    }

    case 'setDomainState':
      return {
        type: 'setDomainState',
        description: `将状态「${action.variableName}」设为「${action.value}」`,
      }

    case 'showToast':
      return {
        type: 'showToast',
        description: `显示${action.toastType === 'success' ? '成功' : action.toastType === 'error' ? '错误' : ''}提示："${action.message}"`,
      }

    case 'toggleVisible':
      return {
        type: 'toggleVisible',
        description: `切换「${resolveNodeName(action.targetId)}」的可见性`,
      }

    case 'delay':
      return {
        type: 'delay',
        description: `等待 ${action.duration}ms`,
      }

    // ... 其他 action 类型
  }
}
```

---

**3.4 状态定义与流转**

```
┌──────────────────────────────────────────────────────────┐
│  🔄 Login Page 状态定义                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  状态变量 1：loginStep（登录步骤）                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  定义位置：Login Page（页面级）                     │    │
│  │  可选值：                                          │    │
│  │    • filling（填写中）← 默认值                     │    │
│  │    • submitting（提交中）                          │    │
│  │    • success（成功）                               │    │
│  │    • error（失败）                                 │    │
│  │                                                    │    │
│  │  谁写入：                                          │    │
│  │    • LoginButton.click → "submitting"             │    │
│  │    • loginApi.onSuccess → "success"               │    │
│  │    • loginApi.onFailure → "error"                 │    │
│  │                                                    │    │
│  │  谁响应：                                          │    │
│  │    • LoginButton                                  │    │
│  │    │  filling → 正常可点击                          │    │
│  │    │  submitting → 显示 loading，禁用点击           │    │
│  │    │  error → 显示 "重试"                          │    │
│  │    • RememberMe                                   │    │
│  │    │  submitting → 隐藏                            │    │
│  │    • ErrorMessage                                 │    │
│  │    │  error → 显示                                 │    │
│  │    │  其他 → 隐藏                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  流转图：                                                 │
│  filling ──[click loginBtn]──→ submitting                │
│  submitting ──[API success]──→ success                   │
│  submitting ──[API failure]──→ error                     │
│  error ──[click loginBtn]──→ submitting                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**生成算法**：
```typescript
function generateStateSection(screen: Screen, project: DesignProject) {
  return screen.domainStates.map(stateVar => {
    // 1. 找到所有写入者：遍历全树找 setDomainState 引用此变量的 action
    const writers = findStateWriters(screen.rootNode, stateVar.name)

    // 2. 找到所有消费者：遍历全树找 domainStateBindings 引用此变量的节点
    const consumers = findStateConsumers(screen.rootNode, stateVar.name)

    // 3. 推导流转图：从 writers 的触发条件 → 写入值，构建状态机
    const transitions = buildStateTransitions(writers, stateVar)

    return { variable: stateVar, writers, consumers, transitions }
  })
}
```

---

**3.5 数据与 API**

```
┌──────────────────────────────────────────────────────────┐
│  📡 Login Page 数据依赖                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  数据源 1：loginData（静态数据）                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  场景 A "默认数据":                                │    │
│  │  {                                                │    │
│  │    "savedPhone": "138****8888",                    │    │
│  │    "loginBtnText": "登录",                         │    │
│  │    "agreement": "《用户服务协议》"                   │    │
│  │  }                                                │    │
│  │                                                    │    │
│  │  场景 B "首次使用":                                 │    │
│  │  { "savedPhone": "", "loginBtnText": "登录", ... } │    │
│  │                                                    │    │
│  │  数据消费者：                                       │    │
│  │  • PhoneInput.value ← {{data.savedPhone}}         │    │
│  │  • LoginButton.children ← {{data.loginBtnText}}   │    │
│  │  • AgreementText.children ← {{data.agreement}}    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  API 端点 1：loginApi                                     │
│  ┌──────────────────────────────────────────────────┐    │
│  │  POST /api/auth/login                             │    │
│  │  请求体：{ phone, password }                       │    │
│  │                                                    │    │
│  │  Mock 场景：                                       │    │
│  │  • "登录成功" → 200, { token, user }              │    │
│  │  • "密码错误" → 401, { message: "密码错误" }      │    │
│  │  • "网络超时" → timeout after 5000ms              │    │
│  │                                                    │    │
│  │  调用位置：LoginButton.click                       │    │
│  │  成功处理：setDomainState + navigate + showToast   │    │
│  │  失败处理：setState(error) + showToast             │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

**3.6 交互事件汇总**

该页面所有事件的一览表：

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚡ Login Page 事件汇总                                              │
├────────────┬──────────┬────────────────────────┬────────────────────┤
│ 元素        │ 触发器   │ 动作摘要               │ 目标               │
├────────────┼──────────┼────────────────────────┼────────────────────┤
│ LoginBtn   │ click    │ API→navigate→toast     │ Home Page          │
│ LoginBtn   │ hover    │ setState(hover)        │ self               │
│ RegisterLnk│ click    │ navigate               │ Register Page      │
│ ForgotLink │ click    │ navigate               │ ForgotPwd Page     │
│ PhoneInput │ focus    │ setState(focused)      │ self               │
│ PhoneInput │ blur     │ setState(default)      │ self               │
│ PwdInput   │ focus    │ setState(focused)      │ self               │
│ PwdInput   │ blur     │ setState(default)      │ self               │
│ (页面)      │ screenEnter │ apiRequest(checkAuth) │ API: checkAuth  │
│ (页面)      │ screenExit  │ cancelApiRequest      │ 清理            │
├────────────┴──────────┴────────────────────────┴────────────────────┤
│ 共 10 个事件 · 3 个页面跳转 · 2 个 API 调用 · 5 个状态切换          │
└─────────────────────────────────────────────────────────────────────┘
```

---

**3.7 状态 × 数据截图矩阵**

调用全景渲染生成截图，嵌入 PRD：

```
┌──────────────────────────────────────────────────────────┐
│  📸 Login Page 截图矩阵                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│           │  默认数据    │  首次使用    │  错误状态       │
│  ─────────┼─────────────┼─────────────┼──────────────   │
│  filling  │  [截图]      │  [截图]      │  [截图]        │
│  loading  │  [截图]      │  [截图]      │  [截图]        │
│  error    │  [截图]      │  [截图]      │  [截图]        │
│                                                          │
│  共 3 状态 × 3 数据场景 = 9 种组合                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**生成方式**：调用现有的全景渲染 `SchemaRenderer`，逐状态 × 逐场景切换后截图。

### 3.3 附录：索引表

PRD 最后附带完整索引，方便按维度查询：

**A. 事件索引**（全项目所有事件按类型分组）

```
click 事件 (18 个)
  LoginPage.LoginButton    → apiRequest(login) + navigate(Home) + ...
  LoginPage.RegisterLink   → navigate(Register)
  HomePage.OrderCard       → navigate(OrderDetail)
  ...

screenEnter 事件 (5 个)
  LoginPage   → apiRequest(checkAuth)
  HomePage    → apiRequest(fetchOrders) + apiRequest(fetchUser)
  ...

hover 事件 (12 个)
  ...
```

**B. 状态变量索引**

```
authStatus（全局环境变量）
  定义位置: Project 级别
  值: loggedIn / loggedOut / expired
  写入者: LoginPage.LoginButton, ProfilePage.LogoutButton
  消费者: NavBar, OrderPage, CartPage (共 8 个组件)

loginStep（页面级状态）
  定义位置: Login Page
  值: filling / submitting / success / error
  写入者: LoginButton.click, loginApi.onSuccess/onFailure
  消费者: LoginButton, RememberMe, ErrorMessage
```

---

## 四、Part 2：交互链路图（Flow Map）

### 4.1 定位

交互链路图是 PRD 的**视觉化表达**——用图而非文字来展示产品的交互逻辑。

与 Part 1（结构化文档）的关系：
- PRD 回答「有什么」——模块、功能、细节
- 链路图回答「怎么串」——页面间如何流转，状态如何变化，用户如何走完一个故事

### 4.2 三种图

#### 图一：产品全局流程图（Page Flow Map）

**所有页面间跳转关系的完整拓扑图**：

```
节点 = 页面（卡片 + 缩略图）
边 = navigate 事件（标注触发元素和动作）
```

```
                        ┌─────────┐
              ┌────────→│ Register│
              │         └────┬────┘
              │              │ click: submitBtn
         ┌────┴────┐   ┌────┴────┐
  Start → │  Login  │──→│  Home   │──→ ...
         └─────────┘   └────┬────┘
           click:loginBtn    │
                        ┌────┴────┐
                        │ Profile │
                        └─────────┘
```

与 PRD 联动：
- 点击页面节点 → 跳转到 PRD 中该页面的章节
- 点击连线 → 跳转到 PRD 中该事件的详情

#### 图二：用户故事链路（User Story Flow）

**具名的端到端用户流程**，从 Schema 的交互事件中自动推导 + 人工命名：

```
📖 购买流程（Purchase Flow）

  Login ──[登录成功]──→ Home ──[点击商品]──→ ProductDetail
    │                                          │
    │                                   [加入购物车]
    │                                          │
    │                                     ┌────┴────┐
    │                                     │  Cart   │
    │                                     └────┬────┘
    │                                    [点击结算]
    │                                          │
    │                                   ┌──────┴──────┐
    └───────────────────────────────────│   Checkout   │
                                        └──────┬──────┘
                                          [支付成功]
                                               │
                                        ┌──────┴──────┐
                                        │ OrderDetail  │
                                        └─────────────┘
```

每一步标注：
- 触发元素和触发方式
- 条件（如有）
- 状态变化
- API 调用

**自动推导算法**：
```typescript
/**
 * 从某个页面出发，自动发现所有可达路径
 */
function discoverUserFlows(
  startScreenId: string,
  project: DesignProject,
  maxDepth = 10
): UserFlowPath[] {
  const paths: UserFlowPath[] = []

  function dfs(
    currentScreenId: string,
    currentPath: FlowStep[],
    visited: Set<string>
  ) {
    if (currentPath.length > maxDepth) return
    if (visited.has(currentScreenId)) {
      // 发现环路，记录为一条完整路径
      paths.push({ steps: [...currentPath], hasLoop: true })
      return
    }

    visited.add(currentScreenId)
    const screen = project.screens.find(s => s.id === currentScreenId)
    if (!screen) return

    // 找到该页面所有 navigate 出口
    const navigations = findAllNavigateActions(screen.rootNode)

    if (navigations.length === 0) {
      // 终点页面，记录完整路径
      paths.push({ steps: [...currentPath], hasLoop: false })
      return
    }

    navigations.forEach(nav => {
      currentPath.push({
        fromScreen: currentScreenId,
        toScreen: nav.targetScreenId,
        trigger: nav.trigger,
        element: nav.sourceNode,
        actions: nav.fullActionChain,
        condition: nav.condition,
      })
      dfs(nav.targetScreenId, currentPath, new Set(visited))
      currentPath.pop()
    })

    visited.delete(currentScreenId)
  }

  dfs(startScreenId, [], new Set())
  return paths
}
```

用户可以：
1. 系统自动发现所有路径
2. 对有意义的路径**命名保存**为用户故事（如"购买流程"）
3. 命名的用户故事作为**持久化数据**保存在 Schema 中（新增 `project.userFlows[]`）

```typescript
// Schema 扩展
interface UserFlow {
  id: string
  name: string                    // "购买流程"
  description?: string            // "用户从登录到完成购买的完整流程"
  steps: FlowStep[]               // 手动编辑或自动发现的步骤序列
  createdAt: string
}

interface FlowStep {
  fromScreenId: string
  toScreenId: string
  triggerNodeId: string           // 触发元素
  trigger: EventTrigger           // click / screenEnter / ...
  description?: string            // 可选的人工注释
}

// DesignProject 扩展
interface DesignProject {
  // ... existing fields
  userFlows: UserFlow[]           // 用户故事链路
}
```

#### 图三：状态生命周期图（State Lifecycle）

以某个状态变量为中心，展示其完整生命周期：

```
┌─ authStatus 生命周期 ──────────────────────────────────┐
│                                                         │
│  ┌──────────┐    LoginBtn.click     ┌──────────┐       │
│  │ loggedOut │───(loginApi.success)──→│ loggedIn │       │
│  │          │                       │          │       │
│  └────┬─────┘                       └────┬─────┘       │
│       │                                  │              │
│       │         LogoutBtn.click          │              │
│       │←─────────────────────────────────┘              │
│       │                                                 │
│       │         token 过期                               │
│       │←─────────────────── expired ←───┘               │
│                                                         │
│  影响：                                                  │
│  loggedIn  → NavBar 显示头像, OrderPage 可访问           │
│  loggedOut → NavBar 显示登录按钮, OrderPage 重定向       │
│  expired   → 弹出重新登录弹窗                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 链路图的 UI 交互

```
┌──────────────────────────────────────────────────────────────────┐
│  Blueprint     [PRD 文档]  [链路图]                               │
├──────────┬───────────────────────────────────────┬───────────────┤
│          │                                       │               │
│  图类型   │                                       │   节点/边      │
│          │    产品全局流程图                       │   详情面板     │
│  ○ 页面流 │                                       │               │
│  ○ 用户   │    ┌─────┐     ┌─────┐               │  点击节点/边   │
│    故事   │    │Login│────→│Home │               │  显示详情      │
│  ○ 状态   │    └─────┘     └──┬──┘               │               │
│    生命周期│                   │                  │  双击 → 跳转   │
│          │              ┌────┴────┐             │  PRD 章节      │
│  ┌──────┐│              │         │             │               │
│  │用户   ││          ┌───┴──┐  ┌──┴────┐         │               │
│  │故事   ││          │Order │  │Profile│         │               │
│  │列表   ││          └──────┘  └───────┘         │               │
│  │      ││                                       │               │
│  │📖 购买 ││                                       │               │
│  │📖 注册 ││                                       │               │
│  │📖 退出 ││                                       │               │
│  │      ││                                       │               │
│  │[+ 新建]││                                       │               │
│  └──────┘│                                       │               │
├──────────┴───────────────────────────────────────┴───────────────┤
│  5 个页面 · 8 条跳转 · 3 个用户故事 · 12 个状态变量              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 五、Part 1 + Part 2 如何联动

```
PRD 文档                              链路图
┌─────────────────┐              ┌─────────────────┐
│ 3.3 LoginButton │              │                 │
│   click 事件     │──"查看链路"──→│  高亮 Login→Home │
│   → navigate    │              │  这条边          │
│                 │              │                 │
│ 3.4 loginStep   │──"查看流转"──→│  展开 loginStep  │
│   filling→...   │              │  生命周期图      │
│                 │              │                 │
└─────────────────┘              └────────┬────────┘
                                          │
                                    双击节点
                                          │
                                    ┌─────┴────────┐
                                    │ 跳回 PRD 对应 │
                                    │ 页面章节      │
                                    └──────────────┘
```

**实现方式**：
- PRD 中每个事件描述旁有「🔗 查看链路」按钮 → 跳转到链路图并高亮对应边
- PRD 中每个状态变量旁有「🔗 查看流转」按钮 → 跳转到状态生命周期图
- 链路图中双击节点 → 跳转到 PRD 对应页面章节
- 链路图中点击边 → 右侧面板显示该事件的完整描述（同 PRD 中的内容）

---

## 六、导出格式

Blueprint 不仅是在编辑器中查看，更可以**导出为独立文档**：

### 6.1 导出为 Markdown PRD

```
# 电商 App 产品需求文档
> 自动生成于 2026-04-06，来源：DesignUI Schema

## 1. 产品概览
...

## 2. 全局定义
### 2.1 环境变量
...

## 3. Login Page（登录页）
### 3.1 页面概述
...
### 3.2 页面结构
...
### 3.3 组件行为清单
#### LoginButton
**类型**: button (PrimaryButton 实例)
**视觉状态**: default / hover / pressed / loading / error / disabled
**交互事件**:
- click: 调用登录接口 → 成功跳转首页 → 显示成功提示
  - 条件: loginStep == "filling"
  - 失败: 显示错误提示
...
```

### 6.2 导出为 HTML 站点

生成可独立部署的静态站点，包含：
- 左侧导航目录
- 右侧文档内容
- 嵌入式链路图（SVG）
- 截图矩阵图片
- 响应式布局，可分享 URL

### 6.3 导出为 PDF

适合正式交付的排版格式。

### 6.4 导出链路图

- SVG（矢量，可嵌入文档）
- PNG（位图，可分享）
- Mermaid 语法（可嵌入 Markdown）

---

## 七、技术架构

### 7.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Blueprint View                           │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────┐    │
│  │   PRD Renderer       │    │   Flow Map Renderer      │    │
│  │   (文档渲染)          │    │   (链路图渲染)            │    │
│  │   Markdown/React     │    │   React Flow + ELK.js    │    │
│  └──────────┬──────────┘    └──────────┬──────────────┘    │
│             │                          │                    │
│  ┌──────────┴──────────────────────────┴──────────────┐    │
│  │                 Blueprint Engine                     │    │
│  │                                                     │    │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────┐ │    │
│  │  │ PRD Generator │  │ Graph Builder │  │ Exporter │ │    │
│  │  │ Schema → Doc  │  │ Schema → Graph│  │ → MD/HTML│ │    │
│  │  └──────────────┘  └───────────────┘  └──────────┘ │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────┐          │    │
│  │  │ Schema Analyzer                       │          │    │
│  │  │ (遍历 + 提取 + 关联 + 统计)            │          │    │
│  │  └──────────────────────────────────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐  │
│  │              DesignProject Schema (数据源)              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 核心模块：Schema Analyzer

所有生成的基础——从 Schema 中提取结构化的分析结果：

```typescript
interface SchemaAnalysis {
  // 产品概览
  overview: {
    project: DesignProject
    stats: ProjectStats
    navigationGraph: NavigationGraph
  }

  // 全局定义
  globals: {
    environmentStates: EnvStateAnalysis[]
    componentAssets: AssetAnalysis[]
  }

  // 按页面分析
  screens: ScreenAnalysis[]

  // 交互链路
  flows: {
    allNavigations: NavigationEdge[]
    discoveredPaths: UserFlowPath[]
    savedUserFlows: UserFlow[]
    stateCycles: StateCycleAnalysis[]
  }

  // 索引
  indices: {
    eventIndex: EventIndexEntry[]
    stateIndex: StateIndexEntry[]
    apiIndex: ApiIndexEntry[]
    dataBindingIndex: DataBindingIndexEntry[]
  }
}

interface ScreenAnalysis {
  screen: Screen
  summary: string                    // 页面功能概述
  structure: StructureNode           // 语义化组件树
  componentSpecs: ComponentBehaviorSpec[]  // 所有有行为的组件规格
  stateAnalysis: StateAnalysis[]     // 状态定义 + 写入者 + 消费者 + 流转
  dataAnalysis: DataAnalysis[]       // 数据源 + 消费者 + 场景
  apiAnalysis: ApiAnalysis[]         // API + 调用者 + Mock
  eventSummary: EventSummaryEntry[]  // 事件汇总表
  screenshotMatrix: ScreenshotMatrix // 状态 × 数据截图
  incomingNavs: NavigationEdge[]     // 入口
  outgoingNavs: NavigationEdge[]     // 出口
}

class SchemaAnalyzer {
  analyze(project: DesignProject): SchemaAnalysis {
    // 1. 统计概览
    const overview = this.analyzeOverview(project)

    // 2. 分析全局定义
    const globals = this.analyzeGlobals(project)

    // 3. 逐页面深度分析
    const screens = project.screens.map(screen =>
      this.analyzeScreen(screen, project)
    )

    // 4. 构建交互链路
    const flows = this.analyzeFlows(project, screens)

    // 5. 生成索引
    const indices = this.buildIndices(screens)

    return { overview, globals, screens, flows, indices }
  }

  private analyzeScreen(
    screen: Screen,
    project: DesignProject
  ): ScreenAnalysis {
    // 深度遍历组件树，提取所有信息
    const componentSpecs = this.extractAllComponentSpecs(
      screen.rootNode, screen, project, screen.name
    )

    const stateAnalysis = screen.domainStates.map(stateVar =>
      this.analyzeState(stateVar, screen, project)
    )

    const dataAnalysis = screen.dataSources.map(ds =>
      this.analyzeDataSource(ds, screen)
    )

    const apiAnalysis = (screen.apiEndpoints || []).map(api =>
      this.analyzeApi(api, screen)
    )

    const eventSummary = this.summarizeEvents(screen.rootNode, screen)

    return {
      screen,
      summary: this.generateScreenSummary(screen, project),
      structure: this.buildStructureTree(screen.rootNode, screen),
      componentSpecs: componentSpecs.filter(Boolean),
      stateAnalysis,
      dataAnalysis,
      apiAnalysis,
      eventSummary,
      screenshotMatrix: this.buildScreenshotMatrix(screen),
      incomingNavs: this.findIncomingNavigations(screen, project),
      outgoingNavs: this.findOutgoingNavigations(screen),
    }
  }
}
```

### 7.3 PRD Generator

将 `SchemaAnalysis` 转换为可渲染的文档结构：

```typescript
interface PRDDocument {
  title: string
  generatedAt: string
  chapters: PRDChapter[]
}

interface PRDChapter {
  id: string
  title: string
  level: number              // 1=一级标题, 2=二级标题, ...
  content: PRDContentBlock[]
  children: PRDChapter[]
}

type PRDContentBlock =
  | { type: 'text'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'tree'; root: StructureNode }
  | { type: 'component-spec'; spec: ComponentBehaviorSpec }
  | { type: 'state-diagram'; analysis: StateAnalysis }
  | { type: 'event-summary'; entries: EventSummaryEntry[] }
  | { type: 'screenshot-matrix'; matrix: ScreenshotMatrix }
  | { type: 'page-thumbnail'; screenId: string }
  | { type: 'flow-link'; flowId: string; label: string }  // 链接到链路图
  | { type: 'stats-card'; stats: Record<string, number> }

class PRDGenerator {
  generate(analysis: SchemaAnalysis): PRDDocument {
    return {
      title: `${analysis.overview.project.name} 产品需求文档`,
      generatedAt: new Date().toISOString(),
      chapters: [
        this.generateOverviewChapter(analysis.overview),
        this.generateGlobalsChapter(analysis.globals),
        ...analysis.screens.map((s, i) =>
          this.generateScreenChapter(s, i + 3)
        ),
        this.generateUserFlowsChapter(analysis.flows),
        this.generateAppendixChapter(analysis.indices),
      ]
    }
  }
}
```

### 7.4 Graph Builder（链路图数据）

```typescript
interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

interface FlowNode {
  id: string
  type: 'screen' | 'state' | 'api'
  label: string
  thumbnail?: string           // 页面缩略图
  metadata: Record<string, any>
}

interface FlowEdge {
  id: string
  source: string
  target: string
  type: 'navigation' | 'state-write' | 'state-read' | 'api-call'
  label: string
  triggerElement?: string
  trigger?: string
  prdChapterId?: string        // 关联到 PRD 章节 ID，实现互跳
}

class FlowGraphBuilder {
  buildPageFlow(analysis: SchemaAnalysis): FlowGraph {
    // 页面流拓扑
  }

  buildUserStoryFlow(flow: UserFlow, project: DesignProject): FlowGraph {
    // 单条用户故事
  }

  buildStateLifecycle(
    variableName: string,
    analysis: SchemaAnalysis
  ): FlowGraph {
    // 状态生命周期
  }
}
```

### 7.5 Exporter（多格式导出）

```typescript
class BlueprintExporter {
  // 导出为 Markdown
  toMarkdown(doc: PRDDocument): string {
    return doc.chapters.map(ch => this.chapterToMarkdown(ch)).join('\n\n')
  }

  // 导出为静态 HTML 站点
  toHTML(doc: PRDDocument, flows: FlowGraph[]): string {
    // 生成带侧边栏导航的 HTML
    // 链路图渲染为内联 SVG
    // 截图矩阵渲染为图片网格
  }

  // 导出为 PDF
  toPDF(doc: PRDDocument): Buffer {
    // 使用 puppeteer 或类似工具从 HTML 生成 PDF
  }

  // 单独导出链路图
  flowToMermaid(graph: FlowGraph): string { ... }
  flowToSVG(graph: FlowGraph): string { ... }
}
```

---

## 八、MCP 集成

扩展 MCP Server，让 AI 能够查询和生成 Blueprint：

```typescript
// 获取完整产品 PRD
// Tool: generate_product_prd
// 返回: 完整的结构化 PRD 文档（JSON 或 Markdown）

// 获取某个页面的详细规格
// Tool: get_screen_blueprint
// 参数: screenId
// 返回: 该页面的完整分析（结构、组件行为、状态、数据、事件）

// 获取某个组件的完整行为规格
// Tool: get_component_spec
// 参数: nodeId
// 返回: ComponentBehaviorSpec

// 查找状态变量的完整影响面
// Tool: get_state_impact
// 参数: variableName
// 返回: 写入者 + 消费者 + 流转图

// 获取用户故事链路
// Tool: get_user_flows
// 返回: 所有已命名的用户故事 + 自动发现的路径

// 运行产品完整性审计
// Tool: audit_product
// 返回: 孤立页面、缺少清理、未绑定数据、状态孤岛等
```

---

## 九、实现路线

### Phase 1：Schema Analyzer + PRD 核心（2 周）

- [ ] 实现 `SchemaAnalyzer`，从 Schema 提取完整分析结果
- [ ] 产品概览生成（统计、页面地图）
- [ ] 页面结构树生成（语义化组件树）
- [ ] 组件行为规格生成（状态 + 事件 + 数据绑定 + 条件逻辑）
- [ ] 状态分析（写入者、消费者、流转图）
- [ ] 事件汇总表生成
- [ ] PRD 文档数据模型 + Markdown 导出

### Phase 2：Blueprint UI（1.5 周）

- [ ] `/editor/:projectId/blueprint` 路由
- [ ] PRD 文档阅读器（左侧目录 + 右侧内容，书籍式布局）
- [ ] 组件行为规格卡片渲染
- [ ] 状态流转小图（inline SVG）
- [ ] 事件汇总表格
- [ ] 与画布的互跳（"在画布中编辑"按钮）

### Phase 3：交互链路图（1.5 周）

- [ ] React Flow + ELK.js 集成
- [ ] 页面流拓扑图
- [ ] 用户故事自动发现算法
- [ ] 用户故事命名、保存（Schema 扩展 `userFlows[]`）
- [ ] 状态生命周期图
- [ ] PRD ↔ 链路图互跳

### Phase 4：截图矩阵 + 导出（1 周）

- [ ] 调用 SchemaRenderer 生成截图矩阵
- [ ] 嵌入 PRD 文档
- [ ] HTML 站点导出
- [ ] PDF 导出
- [ ] 链路图导出（SVG / Mermaid）

### Phase 5：MCP 扩展（3 天）

- [ ] 6 个新 MCP Tools
- [ ] AI 对话中支持产品文档查询

---

## 十、为什么这个方案是对的

### 10.1 回归本质

```
传统工具链：设计稿 → 手写 PRD → 手画流程图 → 交付开发
                ↑         ↑          ↑
             三份独立文档，永远不同步，永远在过时

DesignUI：   Schema ──→ 画布（可视化编辑）
               │──→ 代码（Codegen）
               │──→ PRD + 链路图（Blueprint）
               └──→ 截图矩阵（Panorama）
                    ↑
               一份数据源，四种视图，永远同步
```

### 10.2 核心差异

| 维度 | 传统 PRD | Blueprint |
|------|---------|-----------|
| 数据来源 | 人手写 | Schema 自动生成 |
| 同步性 | 写完就过时 | 永远与设计同步 |
| 完整性 | 遗漏是常态 | Schema 有什么就生成什么 |
| 粒度 | 看作者心情 | 到每个组件的每个事件每个状态 |
| 可查询 | Ctrl+F | 结构化索引 + 链路图可视化 |
| 可验证 | 不可能 | 截图矩阵 + 预览模式 |
| 多格式 | 一份 Word | Markdown + HTML + PDF + 在线阅读 |

### 10.3 产品全景的完整性

有了 Blueprint，一个产品的「可感知性」变成：

```
感知层级          对应功能             维度
─────────────────────────────────────────────
宏观全貌          产品概览 + 页面地图    结构
模块功能          按页面展开的 PRD      功能
组件细节          组件行为规格          行为
状态逻辑          状态分析 + 流转图     逻辑
数据流向          数据分析 + 绑定索引   数据
用户路径          用户故事链路图        流程
视觉呈现          截图矩阵             渲染
完整性校验        审计规则              质量
```

**任何一个人，打开 Blueprint，从上到下阅读，就能完整理解这个产品的一切。这就是我们要做的。**
