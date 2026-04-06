# DesignUI 项目 —— 完整探索分析

## 📋 项目概览

### 一句话定位
**设计即产物** —— 设计过程不是"画图"，而是构建结构化 Schema。Schema 本身就是最终产品的源数据，可直接渲染为 React/Vue/Flutter 等任意前端代码。

### 核心理念
这不是设计工具，而是**可视化的产品构建器**。用户设计出来的不是一张张图，而是一个**数据流动、状态切换、交互可用**的完整产品原型，天然可以导出为企业级代码，天然可以转化为需求文档。

---

## 📁 完整目录结构

```
design_docs/
├── README.md                                     ← 导航与项目概述
├── editor-v2-roadmap.md                        ← 编辑器 V2 路线图
├── editor-v3.md                                ← 编辑器 V3 想法
├── 想法.md                                      ← 核心想法记录
│
├── 01-vision/                                   ← 愿景与第一性原理（稳定层）
│   └── first-principles.md                     ← 8 个 Q&A 推导
│
├── 02-product/                                  ← 产品方案（持续增长）
│   ├── overview.md                             ← 产品定位、特性、用户流程
│   ├── editor.md                               ← 编辑器文档（已迁移）
│   ├── component-assets.md                     ← 组件资产体系
│   └── editor/                                 ← 🆕 编辑器产品方案（11 个子系统）
│       ├── README.md                           ← 总纲（第一性原理+子系统+任务清单）
│       ├── 01-canvas/README.md                 ← 中央画布（双层架构、坐标系统）
│       ├── 02-toolbar/README.md                ← 工具栏系统（快捷键体系）
│       ├── 03-property-panel/                  ← 右侧属性面板
│       │   ├── README.md
│       │   ├── panel-design-v2.md              ← 五维 Tab 重组
│       ├── 04-state-system/                    ← 状态管理
│       │   ├── README.md                       ← 三层状态模型
│       │   ├── state-property-inheritance.md
│       │   └── visibility-conditions-redesign.md
│       ├── 05-data-driven/                     ← 数据驱动
│       │   ├── README.md
│       │   └── page-load-api-design.md
│       ├── 06-component-props/README.md        ← 组件 Props
│       ├── 07-asset-management/README.md       ← 资产管理
│       ├── 08-layer-tree/README.md             ← 元素树与页面
│       ├── 09-interaction-bindding/             ← 交互与事件
│       │   ├── README.md
│       │   └── login-success-navigation.md
│       ├── 10-preview-mode/README.md           ← 预览模式
│       ├── 11-collaboration/README.md          ← 协作与同步
│       ├── 12-page-lifecycle/README.md         ← 页面生命周期
│       └── 13-panorama-view/README.md          ← 🆕 状态全景视图 V2
│
├── 03-tech/                                     ← 技术方案（模块独立阅读）
│   ├── architecture.md                         ← 整体架构、包依赖、技术选型
│   ├── design-schema.md                        ← SDK: UI Schema 协议
│   ├── design-engine.md                        ← SDK: 双层渲染引擎
│   ├── design-operations.md                    ← SDK: 操作集合
│   ├── design-codegen.md                       ← SDK: 跨平台代码生成
│   ├── design-mcp.md                           ← APP: MCP Server
│   ├── frontend.md                             ← APP: 前端架构
│   ├── backend.md                              ← APP: 后端架构 + 数据库
│   ├── event-sourcing.md                       ← 存储方案: Event Sourcing + 快照
│   └── editor/                                 ← 🆕 编辑器技术方案（11 个技术模块）
│       ├── README.md                           ← 技术总纲
│       ├── 01-schema-extensions.md
│       ├── 02-operations-extensions.md
│       ├── 03-engine-rendering.md
│       ├── 04-engine-canvas.md
│       ├── 05-engine-preview.md
│       ├── 06-frontend-layout.md
│       ├── 07-frontend-canvas.md
│       ├── 08-frontend-panels.md
│       ├── 09-backend-extensions.md
│       ├── 10-mcp-extensions.md
│       └── 11-sync-system.md
│
├── 04-roadmap/                                  ← 排期与计划
│   ├── roadmap.md                              ← MVP 执行清单
│   ├── editor-implementation-tasks.md           ← 🆕 编辑器改造任务清单（155 个任务）
│   ├── editor-product-full-implementation-plan.md
│   ├── panorama-view-implementation.md
│   ├── goal-implementation-plan.md
│   ├── editor-roadmap-w5-w8-index.md
│   ├── editor-w{1-8}-issues.md                 ← 周级任务清单
│   └── ... 其他计划
│
└── 05-decisions/                                ← 决策记录
    ├── decision-log.md                         ← 所有关键设计决策及理由
    └── goal-alignment-analysis.md

images/  ← 文档配图
```

**目录组织逻辑：**
- **01-vision** — 不动点，回答"为什么"
- **02-product** — 用户视角，回答"做什么"
- **03-tech** — 工程师视角，回答"怎么做"
- **04-roadmap** — 执行，回答"何时做"
- **05-decisions** — 决策追溯

---

## 🎯 四大根本目标

```
G1 设计即代码
   设计稿天然具备完整的组件结构、状态逻辑、交互行为、数据绑定，
   无需额外分析即可导出企业级代码（组件拆分 + 状态管理 + 路由 + API 层）。

G2 AI 增量操作
   AI 通过 MCP 一步步构建和调整 UI（不是从 0 到 1 整页生成），
   每一步可撤销、可调整、可组合——像人一样画，不像生成器一样吐。

G3 设计师友好
   具备组件资产沉淀，基于交互的设计（不是画 N 个 frame 反复解释如何交互），
   设计过程中就是正常的软件交互，结合数据 Mock 能力快速设计各种状态下的表现。

G4 产品友好
   设计即需求表达。根据设计数据，轻松转化为需求文档，
   所有交互链路、状态流转、数据依赖清清楚楚，无需大模型做深度分析。
```

---

## 🏗️ 架构核心

### Monorepo 结构

```
monorepo/
├── apps/
│   ├── design_front          # React 前端（已有）
│   ├── design-api            # NestJS 后端（已有）
│   └── design-mcp            # 🆕 MCP Server（AI 入口）
└── features/
    ├── design-schema         # UI Schema 协议
    ├── design-engine         # 双层渲染引擎
    ├── design-operations     # 操作集合（核心逻辑）
    └── design-codegen        # 跨平台代码生成
```

### 核心数据流

```
用户手动操作 / AI (via MCP)
       │
       ▼
  design-operations（执行 Operation）
       │
       ├─→ design-schema（更新 Schema）→ design-engine（重新渲染画布）
       │
       └─→ design-api（持久化 Operation Log）→ WebSocket 推送
```

### 关键 SDK 说明

| SDK 包 | 职责 |
|--------|------|
| **design-schema** | UI Schema 协议：类型定义、校验、组件资产模型 |
| **design-engine** | 双层渲染引擎：React DOM 内容层 + Canvas 编辑层 |
| **design-operations** | 操作集合：所有设计操作的标准化定义与执行 |
| **design-codegen** | 代码生成：Schema → React/Vue/Flutter/RN |
| **design-mcp** | MCP Server：将 operations 包装为 Tools 供 AI 调用 |

---

## 🎨 编辑器设计（11 个子系统）

### 编辑器三大核心概念

1. **产品上下文（Product Context）** —— 当前 UI 表现是多维上下文的函数
   ```
   当前 UI = f(页面, 全局状态, 数据场景, 业务状态, 交互状态, 视口)
   ```

2. **连接的页面（Connected Pages）** —— 页面通过交互事件自然连接
   ```
   页面不是孤立的画面，而是通过交互事件（navigate）自然连接的产品节点
   ```

3. **实时渲染（Live Rendering）** —— 画布是活的产品预览
   ```
   数据绑定实时求值、状态覆盖实时应用、列表根据数据自动渲染
   ```

### 编辑器 11 个子系统

| # | 子系统 | 核心职责 | 文档链接 |
|---|--------|---------|---------|
| 01 | **中央画布** | Schema 如何渲染为可操作的活产品界面 | 双层架构、坐标系统、视口适配 |
| 02 | **工具栏系统** | 构建操作如何触手可达 | 底部/顶部工具栏、快捷键 |
| 03 | **右侧编辑面板** | 如何在状态上下文中精确编辑全部维度 | [五维 Tab 重组方案](../02-product/editor/03-property-panel/redesign.md) |
| 04 | **状态系统** | 如何用一份 Schema 表达所有状态 | 四层状态模型、覆盖机制 |
| 05 | **数据驱动** | 如何让数据驱动 UI 成为设计一等公民 | 数据集、绑定表达式、Mock |
| 06 | **组件 Props** | 如何标准化组件的可配置能力 | Props 定义、实例配置 |
| 07 | **资产管理** | 如何积累和复用设计资产 | 骨架/风格两层资产 |
| 08 | **元素树与页面** | 如何让产品结构清晰可导航 | 元素树、页面列表、行为指示器 |
| 09 | **交互与事件** | 如何在设计阶段定义真实交互行为 | 事件绑定、页面跳转 |
| 10 | **预览与验证** | 如何验证产品的真实交互效果 | 预览模式、交互执行 |
| 11 | **协作与同步** | 如何让人和 AI 实时协作构建 | MCP 同步、WebSocket |
| 12 | **页面生命周期** | 如何描述页面在各生命阶段的行为 | screenEnter/Exit、滚动 |
| 13 | **状态全景视图** | 如何一眼看到所有状态的表现 | 组件全景、页面全景矩阵 |

---

## 📊 Schema 数据模型

### 关键类型

```typescript
// UI Schema 的最核心部分
interface ComponentNode {
  id: string;
  type: NodeType;                    // "div" | "button" | "component:LoginForm" 等
  name?: string;
  styles: CSSProperties;             // 直接用 CSS 属性
  children?: ComponentNode[];        // 子节点
  props: Record<string, any>;        // 元素属性
  states: ComponentState[];          // 状态集
  activeState: string;               // 当前激活状态
  events: ComponentEvent[];          // 绑定事件
  constraints?: LayoutConstraints;   // 布局约束
  templateRef?: {                    // 如果是组件实例
    templateId: string;
    mode: "reference" | "detached";
  };
}

// 每个状态下的样式/属性覆盖
interface ComponentState {
  name: string;                      // "default" | "hover" | "pressed" | 自定义
  styles: Partial<CSSProperties>;    // 样式覆盖
  props?: Partial<Record<string, any>>; // 属性覆盖
}

// 事件定义
interface ComponentEvent {
  trigger: "click" | "hover" | "focus" | "blur" | "longPress";
  action: EventAction;               // navigate | setState | openUrl | custom
}

// 完整的设计项目
interface DesignProject {
  id: string;
  name: string;
  platform: "pc" | "mobile";
  screens: Screen[];                 // 多个页面
  componentAssets: ComponentTemplate[]; // 可复用组件资产
  viewportPresets: Viewport[];       // 视口预设
  defaultViewport: Viewport;
  currentViewport: Viewport;
}
```

### 核心特点

- **用 CSS 描述样式** —— 不发明新语法，1:1 对应真实代码
- **原子元素 + 组件资产** —— 双层体系，灵活组合
- **状态是第一等公民** —— 同一元素可表达多种状态
- **交互是设计过程的一部分** —— 事件直接绑定在元素上
- **数据驱动 UI** —— 属性通过表达式绑定数据 `{{ data.user.name }}`

---

## 🎭 状态系统（四层状态模型）

### 四层状态

```
┌─────────────────────────────────────┐
│ 全局状态（Global State）            │  theme: dark | light
│                                     │  role: admin | user | guest
├─────────────────────────────────────┤
│ 业务状态（Domain State）            │  pagePhase: loading | loaded | error
│                                     │  loginForm: idle | validating | failed
├─────────────────────────────────────┤
│ 交互状态（Interaction State）       │  default | hover | pressed | focus | disabled
├─────────────────────────────────────┤
│ 数据场景（Data Scenario）          │  正常数据 | 空数据 | VIP数据
└─────────────────────────────────────┘
```

**编辑器的关键机制**
- 切换任何一个维度 → UI 实时变化 → 可在新上下文中编辑差异
- 右侧面板的"状态上下文栏"让用户在多维上下文中自由导航
- 每个状态下可覆盖：样式、属性、子元素可见性、交互行为

---

## 📐 双层渲染架构

```
┌─────────────────────────────────────┐
│  Canvas 覆盖层（EditorOverlay）     │ ← 编辑交互层
│  选区框、拖拽手柄、对齐线、绘制预览  │   负责所有几何操作
├─────────────────────────────────────┤
│  React DOM 渲染层（SchemaRenderer）  │ ← 内容层
│  Schema → 真实 HTML 元素             │   所见即所得
│  数据绑定实时求值                   │   CSS 1:1 对应
│  状态覆盖实时应用                   │
└─────────────────────────────────────┘
```

**设计理由**
- DOM 层：Schema 样式就是 CSS，浏览器天然渲染，零翻译成本
- Canvas 层：提供像素级精确的几何操作（选区、拖拽、对齐）
- 分离关切：内容用产品真实技术渲染，编辑用最适合的技术

---

## 💾 存储方案：Event Sourcing + 快照

### 核心模型

```
设计操作 (Operation)
    ↓
design-operations 的操作
  = 编辑器的命令
  = MCP 的 Tool Call
  = 版本管理的事件日志
    四者合一！
```

### 好处

| 优势 | 说明 |
|------|------|
| 增量存储 | 每次只存一条 Operation（~200 bytes） |
| 精确版本 | 可回溯到任意一次操作 |
| 天然 Undo/Redo | 操作日志正反向执行 |
| 天然审计 | 谁在什么时候做了什么，AI 操作也记录 |
| 协作友好 | 不需要 CRDT/OT，单线程事件序列足够 |

---

## 🔄 全景视图 V2（状态全景视图）

### 核心问题
**如何让设计师一眼看到一个组件或页面在所有状态下的表现？**

### V2 的突破
V1 的错误：把两种不同需求（快速看看 + 仔细走查）揉进一个功能

**V2 的解决方案：拆成两个互补 Feature**

#### Feature A: 状态预览缩略图条（编辑态内）
```
位置：右侧属性面板 StateContextBar 下方
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ 默认 │  │ 悬停 │  │ 按下 │  │ 聚焦 │  │ 禁用 │  ← 80x60px 缩略图
└──────┘  └──────┘  └──────┘  └──────┘  └──────┘

交互：
  · 点击缩略图 → 切换编辑到该状态
  · Hover 缩略图 → 显示 Tooltip 放大预览
  · 点击"↗ 全景对比" → 跳转全景路由页
```

#### Feature B: 全景独立路由页
```
独立路由：/editor/:id/panorama 或 /editor/:id/panorama?node=xxx

入口：
  · 顶部工具栏 [全景] 按钮
  · 快捷键 Cmd+Shift+P
  · 缩略图条的"↗ 全景对比"链接

展示方式：
  · 组件全景：所有状态并排 (100% 尺寸)
  · 页面全景：领域态 × 数据场景的矩阵 (35% 缩放)

URL 可分享：团队成员打开同一 URL 看到同样的全景视图
```

### 两种认知需求

| 需求 | Feature | 用途 |
|------|---------|------|
| 快速看看 | 缩略图条 | 不打断编辑流，轻量级前置检查 |
| 仔细走查 | 全景路由页 | 全屏空间对比，可分享 review |

---

## 🔄 AI 集成方式

### MCP 架构

```
Cursor / Claude Code (MCP Client)
           │
           ▼ MCP 协议 (stdio / SSE)
┌────────────────────────┐
│  design-mcp Server     │
│  暴露 Tools + Resources│
└────────┬───────────────┘
         │
         ├─ tools        ← design-operations 的操作
         ├─ schema       ← 读取当前状态
         └─ codegen      ← 导出代码
```

### 操作的标准化

所有操作统一为：

```typescript
interface Operation {
  type: string;
  params: Record<string, any>;
  description: string;           // 人类可读，给 AI 理解
}
```

**AI 的工作流**
1. 调用 `getAvailableOperations()` 获取所有操作列表
2. 根据用户需求选择操作并生成参数
3. 调用 `execute(operation)` 执行操作
4. 操作同步到前端 WebSocket → 画布实时更新
5. 每一步都可撤销、可调整、可组合

---

## 🛠️ 核心设计决策（第一性原理推导）

### Q1：画布应该用 Canvas 还是 React DOM？
**答案：双层架构**
- React DOM 渲染内容（所见即所得）
- Canvas 覆盖层处理编辑交互（选区、拖拽、对齐线）

### Q2：Schema 能否转换成任意前端代码？
**答案：完全可以**
- CSS 属性集合是所有 UI 框架的"最大公约数"
- 通过插件化 Codegen 管道翻译到任意平台

### Q3：屏幕选择的本质？
**答案：选择初始视口，不是锁死**
- Schema 不变 → 切换视口只是改变观看窗口 → 验证适配效果

### Q4：元素添加应该分几个层次？
**答案：双层体系**
- 原子元素：div、button、img 等，完全样式自由度
- 组件资产：之前设计好的 Schema 片段，可复用

### Q5：操作层应该做成 MCP Server 还是内置 SDK？
**答案：MCP Server**
- 关注点分离：核心竞争力是 Schema+渲染+操作，不是"AI 对话 UI"
- 即插即用：Cursor/Claude Code 零成本接入
- 生态开放：任何 MCP Client 都能操控设计系统

### Q6：大型 Schema 如何存储与版本管理？
**答案：Event Sourcing + 周期快照**
- 设计系统天然就是 Operation-based
- 增量存储、精确版本、天然 Undo/Redo、审计日志

### Q7：为什么不"每个操作都同步等待保存成功"？
**答案：异步批量化**
- 编辑反馈绑定到网络延迟 = 把不稳定暴露给用户
- 正确做法：前端本地先执行 → 后端异步批量写入 → WebSocket 推送

### Q8：拖拽定位为什么存局部坐标而不是屏幕坐标？
**答案：存父容器局部坐标**
- 视觉语义是"放进某个父容器"，不是"屏幕绝对像素"
- 保持结构稳定，天然可导出为 CSS left/top

---

## 🚀 用户工作流

### 7 步产品构建流程

```
Step 1: 创建项目 → 选择端 + 视口 → 进入编辑器

Step 2: 构建页面 UI → 添加元素 → 调整样式 → 设置属性
        画布实时渲染真实 DOM（所见即所得）

Step 3: 定义交互 → 在按钮上绑定 click → navigate: /signup
        系统自动创建新页面 → 两页面形成导航关系

Step 4: 接入数据 → 创建数据集 → 属性绑定 {{ data.user.name }}
        切换数据集 → UI 实时变化 → 设计各场景表现

Step 5: 定义状态变体 → 全局状态 / 业务状态 / 交互状态
        每个状态下编辑完整表现（样式+属性+子元素+行为）

Step 6: 预览验证 → 进入预览模式 → 像真实 App 一样操作
        所有交互行为真实执行

Step 7: 导出产出 → 导出代码 / 需求文档 / 全景截图矩阵
        没有二次翻译——设计就是最终产出的源头
```

---

## 📚 相关文档深度阅读清单

### 快速了解
1. ✅ `/design_docs/README.md` — 导航 + 项目概述
2. ✅ `/design_docs/01-vision/first-principles.md` — 8 个 Q&A 推导

### 理解产品
3. `/design_docs/02-product/overview.md` — 产品定位 + 特性
4. `/design_docs/02-product/editor/README.md` — 编辑器总纲
5. `/design_docs/02-product/component-assets.md` — 组件资产体系

### 理解技术
6. `/design_docs/03-tech/architecture.md` — 整体架构 + 包依赖
7. `/design_docs/03-tech/design-schema.md` — Schema 类型定义
8. `/design_docs/03-tech/design-operations.md` — 操作集合
9. `/design_docs/03-tech/design-engine.md` — 渲染引擎
10. `/design_docs/03-tech/event-sourcing.md` — 存储方案

### 深入特定领域
11. `/design_docs/02-product/editor/04-state-system/README.md` — 状态系统
12. `/design_docs/02-product/editor/05-data-driven/README.md` — 数据驱动
13. `/design_docs/02-product/editor/13-panorama-view/README.md` — 全景视图
14. `/design_docs/03-tech/design-mcp.md` — MCP 集成

### 排期与决策
15. `/design_docs/04-roadmap/roadmap.md` — MVP 执行清单
16. `/design_docs/05-decisions/decision-log.md` — 决策记录

---

## 📝 关键洞察总结

### 核心洞察 1：三个断裂
传统设计工具（Figma/Sketch）的"描述"是视觉像素，导致三个根本性断裂：

| 断裂 | 原因 | 代价 |
|------|------|------|
| **交互断裂** | 像素无法表达"点击后跳到哪、状态怎么变" | 需要额外的连线图、交互说明文档 |
| **语义断裂** | 像素没有语义，一个矩形是 Button 还是 Card 不确定 | 设计稿转代码靠猜 |
| **状态断裂** | 像素是瞬间快照，无法描述组件的多种状态 | 每个状态画一份，维护指数增长 |

**我们的解决**：用结构化 Schema（JSON 数据）代替像素图
- 包含：组件树 + 样式(CSS) + 交互(事件) + 状态 + 数据
- 直接就是代码可以消费的形式
- 设计过程 = Schema 构建过程 = 代码生成源头

### 核心洞察 2：心智模型转变

```
传统工具心智模型：
  创建画板 → 画 UI → 标注交互（连线、注释）
         → 导出切图 → 开发者重新理解并编码

我们的心智模型：
  创建项目 → 设计页面 → 定义交互 → 绑定数据 → 切换状态 → 预览 → 导出
  页面通过交互连接 | 状态在一份 Schema 内多维表达 | 数据驱动 UI 变化
  设计过程 = 产品定义过程
```

### 核心洞察 3：渗透 vs 孤立

```
传统工具：数据/状态/交互藏在附加功能里
  → 设计师忘记定义 → 开发者需要猜测 → 需求文档不完整

我们的编辑器：数据/状态/交互随处可见
  · 左侧数据视图 / 右侧属性区 / 画布上的指示器 / 元素树的标记
  → 设计过程自然地定义完整行为
  → 代码导出和需求文档天然完整
```

### 核心洞察 4：全景视图的两种认知需求

```
需求 A：快速看看 → 缩略图条（轻量级，不离开编辑态）
需求 B：仔细走查 → 全景路由页（沉浸式，可分享 URL）

V1 的错误：用一个功能解决两种需求 → 两头不讨好
V2 的改进：拆成两个互补 Feature
```

---

## 🎬 编辑器 UI 布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  顶部栏                                                               │
│  [产品名] [视口: iPhone 15 ▾] [缩放] [↩撤销 ↪重做] [▶预览] [导出 ▾]   │
├──────────┬───────────────────────────────┬───────────────────────┤
│          │                               │                       │
│  左侧    │          中央画布              │    右侧编辑面板        │
│  导航器  │       (Schema 实时渲染)       │                       │
│          │                               │  ┌─ 状态上下文栏 ────┐ │
│ · 页面   │  ┌─────────────────────────┐  │  │ ● default ○ hover │ │
│ · 元素   │  │ Canvas 覆盖层           │  │  │ 数据: [正常 ▾]    │ │
│ · 数据   │  │ 选区 / 拖拽 / 对齐线    │  │  └───────────────────┘ │
│          │  ├─────────────────────────┤  │                       │
│          │  │ React DOM 渲染层        │  │  ▸ 属性               │
│          │  │ Schema → 真实组件       │  │  ▸ 样式               │
│          │  │ 数据绑定实时求值        │  │  ▸ 子元素可见性       │
│          │  └─────────────────────────┘  │  ▸ 交互行为           │
│          │                               │  ▸ 代码预览           │
│          │                               │                       │
├──────────┴───────────────────────────────┴───────────────────────┤
│  底部工具栏                                                           │
│  [↖选择] [✋平移] [# 容器] [□ 方块] [T 文本] [◇ 组件库] [💬 注释]     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Monorepo 包依赖

```
design-schema (最底层)
    ↑
design-operations
    ↑
design-engine              design-codegen
    ↑                            ↑
    └─ design_front             │
       └─ design-api ◄───────────┘
```

---

## 🎯 总结：为什么这个设计很重要？

1. **打破了三个根本性断裂** —— 交互、语义、状态的断裂
2. **设计过程就是产品定义** —— 不是画完后还要开发者翻译
3. **AI 和人类使用同一套操作** —— 不是 AI 另外做一套
4. **零维护的全景视图** —— Schema 自动投影，改一处处处变
5. **从 Figma 到代码工厂** —— 一站式的产品构建工具

这不是"把设计工具做更好"，而是"重新定义了设计工具的基础范式"。

