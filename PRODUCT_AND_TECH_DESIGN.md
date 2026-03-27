# DesignUI - 产品方案 & 技术方案

> 基于第一性原理推导的整体设计文档

---

## 一、第一性原理分析

### 1.1 当前设计工具的本质问题是什么？

回到最底层思考：**设计工具的本质是什么？**

设计工具 = **生成一份"描述"，让开发者把描述变成产品**。

但现有工具（Figma/Sketch）的"描述"是**视觉像素**——一张静态图片。这带来三个根本性断裂：


| 断裂       | 原因                              | 代价                   |
| -------- | ------------------------------- | -------------------- |
| **交互断裂** | 像素无法表达"点击后跳到哪、状态怎么变"            | 需要额外的连线图、交互说明文档、反复对齐 |
| **语义断裂** | 像素没有语义，一个矩形是 Button 还是 Card 不确定 | 设计稿转代码靠猜，需要人工翻译      |
| **状态断裂** | 像素是一个瞬间的快照，无法描述组件的多种状态          | 每个状态画一份，维护成本指数增长     |


### 1.2 第一性原理推导：什么是正确的"描述"？

既然最终产物是**可运行的 UI 代码**（React/Vue/...），那最正确的描述应该**天然就是代码可以直接消费的结构化数据**。

**推导链条：**

```
设计的目的 → 最终产出可运行的 UI
         → 描述应该直接就是 UI 的结构化表达
         → 这个表达必须包含：组件树 + 样式(CSS) + 交互(事件/跳转) + 状态
         → 这就是一个 UI Schema 协议
         → 渲染引擎 consume 这个协议 → 就是最终产品
         → 设计过程 = 通过操作修改这个 Schema
         → AI = 用自然语言调用这些操作
```

### 1.3 核心洞察

> **设计即产物：设计过程不是"画图"，而是"构建 Schema"。Schema 本身就是最终产品的源数据。**

这意味着：

- 不需要"设计稿转代码"这一步——Schema 直接就能渲染成代码
- AI 不需要"生成图片"——它调用结构化操作来修改 Schema
- 交互逻辑天然包含在 Schema 中——不需要额外说明

### 1.4 四个关键子问题的第一性原理推导

#### Q1：画布应该用 Canvas 渲染还是 React DOM 渲染？

回到第一性原理：**编辑器画布的本质需求是什么？**

画布同时承担两个完全不同的职责：


| 职责                         | 本质                    | 最佳技术      |
| -------------------------- | --------------------- | --------- |
| **A. 内容预览** — 展示设计结果       | "所见即所得"，用户看到的应该就是最终产品 | React DOM |
| **B. 编辑交互** — 选区、拖拽、缩放、对齐线 | 像素级精确控制的几何操作          | Canvas    |


**推导：**

- 如果用纯 Canvas 渲染内容：需要自己实现文本排版、Flex 布局、CSS 属性映射……等于重写浏览器，工作量巨大且永远不如浏览器精确
- 如果用纯 React DOM：内容预览完美（因为最终产品就是 DOM），但选区框、拖拽手柄、对齐辅助线等"编辑器 UI"用 DOM 实现很别扭
- Schema 样式用的就是 CSS → 浏览器天然就能渲染 CSS → 用 DOM 渲染内容是零翻译成本的

**结论：双层架构**

```
┌─────────────────────────────┐
│  Canvas 覆盖层（透明）        │ ← 选区框、拖拽手柄、对齐线、hover 高亮
│  z-index: 上层               │    纯几何绘制，不涉及业务渲染
├─────────────────────────────┤
│  React DOM 渲染层            │ ← Schema → 真实 React 组件树
│  z-index: 下层               │    所见即所得，CSS 1:1 对应
└─────────────────────────────┘
```

- **下层 React DOM**：渲染 Schema 中的组件树，使用真实 CSS。用户看到的就是最终产品的样子。
- **上层 Canvas**：仅负责编辑器交互——选区矩形、resize handle、hover 外框、拖拽预览、对齐辅助线。透明覆盖在 DOM 之上，通过坐标映射与底层 DOM 节点关联。

这和 Figma 的思路不同（Figma 全部用 Canvas 是因为它要渲染任意矢量图形），但我们的 Schema **本质就是 DOM 结构**，所以用 DOM 渲染内容反而是最正确的选择。

> **核心原则：内容层用产品的真实技术渲染（DOM），编辑层用最适合几何操作的技术（Canvas）。**

#### Q2：Schema 能否转换成 Flutter、React、Vue 等任意前端代码？

回到第一性原理：**什么数据才能被"万能翻译"？**

答案是：**语义足够、抽象正确的中间表示（IR）**。

类比编译器：LLVM IR 能编译到 x86/ARM/WASM，是因为它描述的是**计算的本质**（指令+数据流），而不是某一个平台的细节。

同理，我们的 Schema 要成为 "UI 的 IR"，必须满足：

```
Schema 描述的是：                          ≠ 描述某个平台的细节
─────────────────────────────────────────────────────────────
✅ "这是一个按钮"（语义）                    ❌ "这是一个 <button> 标签"
✅ "背景色 #1890ff"（视觉属性，用 CSS 表达） ❌ "Color(0xFF1890FF)"（Flutter 写法）
✅ "子元素水平排列，间距 8px"（布局意图）     ❌ "display: flex"（CSS 实现细节）
✅ "点击后跳转到首页"（交互意图）             ❌ "onClick={router.push('/home')}"
```

**关键设计决策：Schema 的样式层应该分为两层：**

```
┌──────────────────────────────────────────────┐
│  语义层（layout intent）                      │
│  flexDirection, gap, padding, alignment...    │  ← 所有平台都有等价概念
│  这些恰好是 CSS Flexbox 的子集               │等 App（20 个屏幕，每屏
├──────────────────────────────────────────────┤
│  视觉层（visual properties）                  │
│  backgroundColor, borderRadius, fontSize...   │  ← CSS 属性名作为通用语言
│  每个平台都有明确的映射关系                    │
└──────────────────────────────────────────────┘
```

**翻译管道（Codegen Pipeline）：**

```
                    ┌→ React Codegen   → JSX + CSS Modules / Tailwind
                    │
Schema (UI IR) ─────┼→ Vue Codegen     → SFC + <style scoped>
                    │
                    ┼→ Flutter Codegen  → Widget Tree + ThemeData
                    │
                    ├→ React Native     → RN Components + StyleSheet
                    │
                    └→ HTML/CSS         → 纯静态页面
```

每个 Codegen 是一个**独立的翻译插件**，负责：

1. **组件映射**：`Button` → `<button>` (React) / `<el-button>` (Vue+Element) / `ElevatedButton` (Flutter)
2. **样式翻译**：`{ backgroundColor: "#1890ff", borderRadius: 8 }` → CSS / Flutter `BoxDecoration` / RN `StyleSheet`
3. **布局翻译**：`{ flexDirection: "row", gap: 8 }` → `display:flex` / `Row(spacing:8)` / `Flex(direction: Axis.horizontal)`
4. **交互翻译**：`{ trigger: "click", action: { type: "navigate", target: "home" } }` → `onClick` / `@click` / `onTap`
5. **项目脚手架**：生成符合目标框架规范的完整项目结构（路由、状态管理等）

**这完全可以满足需求，因为：**

- CSS 属性集合是所有 UI 框架的"最大公约数"，几乎每个属性都有跨平台映射
- 组件是语义化的（Button 不是 div），所以能映射到任何组件库
- 交互是意图化的（"跳转到首页"不是"调用 router.push"），所以能适配任何路由方案

> 这意味着需要新增一个 SDK：`**@globallink/design-codegen`**，作为跨平台代码生成的插件化引擎。

#### Q3：屏幕选择的本质是什么？

回到第一性原理：选择屏幕 ≠ 锁死屏幕。

**屏幕选择的真正含义是"选择一个初始视口（Viewport）"**，它决定的是：

- 设计时画布的默认宽高
- 设计师首先面对的约束条件

但设计完成后，用户必须能**切换视口来检验适配效果**。这是因为：

```
设计稿的本质 = Schema（结构 + 样式 + 交互）
屏幕/视口   = 观看 Schema 的窗口大小

Schema 不变 → 切换视口只是改变观看窗口 → 看适配效果
```

**产品行为：**

```
┌──────────────────────────────────────────────────┐
│  编辑器顶部工具栏                                  │
│                                                  │
│  当前视口: [iPhone 15 Pro ▼]  [375×812]           │
│                                                  │
│  快速切换: [iPhone SE] [iPhone 15] [iPad]          │
│           [Pixel 7]  [Samsung S24] [自定义...]     │
│                                                  │
│  ← 切换后画布实时缩放到对应尺寸，Schema 不变 →       │
└──────────────────────────────────────────────────┘
```

- 初始选择：决定 `project.device` 的默认值
- 后续切换：只改变画布渲染的 viewport 宽高，Schema 不变
- 如果某些布局在小屏上溢出了，用户能直观看到并调整
- 未来可扩展：同一个 Schema 配置响应式断点规则

#### Q4：元素添加的两个层次——原子元素 vs 组件资产

回到第一性原理：**设计工具里能放什么东西？**

Figma 的做法是：矩形、椭圆、文字等"图形原语"。这太底层了，没有语义。

但反过来，如果只有"Button、Card、NavBar"这种高级组件，又不够灵活——有时候就是需要一个纯 div 容器。

**正确答案：分两层，且两层之间可以互相转化。**

```
┌──────────────────────────────────────────────────────────────┐
│                     组件添加面板                               │
│                                                              │
│  ┌─────────────────────────┐  ┌────────────────────────────┐ │
│  │  原子元素（Primitives）   │  │  组件资产（Component Assets）│ │
│  │                         │  │                            │ │
│  │  📦 div (容器)           │  │  📚 来源：                  │ │
│  │  📝 span (文本)          │  │                            │ │
│  │  🔘 button (按钮)        │  │  [我的组件] ← 当前项目沉淀   │ │
│  │  📷 img (图片)           │  │  [团队组件] ← 团队共享资产   │ │
│  │  📥 input (输入框)       │  │  [官方组件] ← 预置模板库    │ │
│  │  🔗 a (链接)             │  │                            │ │
│  │  📋 ul/ol (列表)         │  │  ┌──────────┐             │ │
│  │  ...                    │  │  │ LoginForm │ ← 之前设计的 │ │
│  │                         │  │  │ NavBar    │   Schema 片段│ │
│  │  这些是最基础的 HTML 元素 │  │  │ UserCard  │   直接复用   │ │
│  │  有完全的样式自由度       │  │  │ ...       │             │ │
│  │                         │  │  └──────────┘             │ │
│  └─────────────────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**数据模型：**

```
原子元素：ComponentNode 的 type = "div" | "span" | "img" | "input" | ...
         → 直接映射 HTML 标签
         → 样式完全由 CSS 控制
         → 是最灵活的构建单元

组件资产：ComponentTemplate（一个可复用的 ComponentNode 子树）
         → 本质上就是一段保存好的 Schema 片段
         → 带有名称、描述、缩略图、分类标签
         → 使用时"实例化"到当前 Schema 中
         → 可以选择：引用模式（同步更新）或 副本模式（独立修改）
```

**飞轮效应：设计 → 沉淀 → 加速设计**

```
设计师用原子元素设计了一个 LoginForm
       ↓
保存为组件资产（Schema 片段 + 元信息）
       ↓
下次自己或同事可以直接拖入使用
       ↓
AI 也可以调用："用我们的 LoginForm 组件"
       ↓
越用越快，组件资产库越来越丰富
```

> **这是一个产品生态的增长飞轮：设计行为本身就在生产可复用的资产。**

#### Q5：操作层应该做成 MCP Server，还是内置 SDK？

回到第一性原理：**AI 调用设计操作的本质是什么？**

```
AI 调用操作的本质 = 外部智能体通过"标准协议"控制系统
```

那么问题变成：**什么是"标准协议"的最优选择？**

**方案 A：内置 SDK（design-operations）+ 自建 AI 对话**

```
自建前端 AI 面板 → 自建后端 AI Service → 调用 LLM → 解析输出 → 调用 SDK
```

问题：

- 要自己建对话 UI、管理上下文、处理流式输出、做 function calling 解析……
- 这些 Cursor/Claude Code 已经做到极致了，你在重新发明轮子
- 前期 MVP 阶段投入大量精力在"AI 对话"上，偏离了核心价值（Schema 设计）

**方案 B：操作层 = MCP Server，AI 层 = 任何 MCP Client**

```
Cursor / Claude Code / 自建 Client
          │
          │  MCP 协议（标准化的 Tool 调用）
          ▼
    DesignUI MCP Server
          │
          │  调用内部操作
          ▼
    Schema 修改 → 引擎重新渲染
```

**第一性原理推导为什么 MCP 更好：**

1. **关注点分离的极致**
  - 你的核心竞争力是 **Schema 协议 + 渲染引擎 + 操作集合**，不是"AI 对话 UI"
  - MCP 让你把"AI 智能"完全外包给 Cursor/Claude Code 等成熟工具
  - 你只需要专注于"我的系统能被怎样操控"
2. **即插即用的 AI 能力**
  - Cursor 已经有最好的代码理解、上下文管理、多轮对话
  - Claude Code 已经有最好的 function calling、工具编排
  - 做成 MCP Server → 这些能力零成本接入
3. **前期快后期不受限**
  - 前期：Cursor + MCP Server = 立刻就能用 AI 操控设计
  - 后期：自建 AI 对话 = 只需要做一个 MCP Client（调用同一个 Server）
  - **MCP Server 是不变的基座，Client 可以随时换**
4. **生态开放性**
  - 任何支持 MCP 的工具都能操控你的设计系统
  - VS Code + Copilot、Cursor、Claude Code、Windsurf、自建 Agent……
  - 这不是锁死在某一个 AI 产品上

**MCP Server 暴露的 Tools（就是之前 design-operations 的操作）：**

```
┌──────────────────────────────────────────────────────┐
│              DesignUI MCP Server                      │
│                                                      │
│  Tools:                                              │
│  ├── get_project_info      → 获取当前项目信息          │
│  ├── get_current_screen    → 获取当前屏幕 Schema       │
│  ├── list_screens          → 列出所有屏幕              │
│  ├── add_element           → 添加原子元素              │
│  ├── remove_element        → 删除元素                  │
│  ├── move_element          → 移动元素                  │
│  ├── update_style          → 修改样式                  │
│  ├── add_state             → 添加组件状态              │
│  ├── set_active_state      → 切换组件状态              │
│  ├── add_event             → 添加交互事件              │
│  ├── add_navigation        → 添加页面跳转              │
│  ├── add_screen            → 新建屏幕                  │
│  ├── switch_viewport       → 切换视口                  │
│  ├── instantiate_template  → 使用组件资产              │
│  ├── save_as_template      → 保存为组件资产            │
│  ├── undo / redo           → 撤销/重做                 │
│  ├── export_code           → 导出代码                  │
│  └── get_available_assets  → 列出可用组件资产           │
│                                                      │
│  Resources:                                          │
│  ├── schema://project      → 完整项目 Schema           │
│  ├── schema://screen/{id}  → 单屏幕 Schema             │
│  └── assets://list         → 组件资产列表              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**产品形态变化：**

```
之前的方案：
  编辑器右侧 = [操作面板] + [AI 对话面板]
                                ↑ 自建，工作量大，体验追不上 Cursor

MCP 方案：
  编辑器右侧 = [操作面板]（手动操作，保留）
  AI 对话    = Cursor / Claude Code（通过 MCP 连接，体验极好）
  后期       = 自建对话面板（做一个 MCP Client 即可，渐进式建设）
```

> **核心结论：design-operations 不是扔掉，而是换一个"外壳"——从被前端直接调用的 SDK，变成被 MCP 协议包装的 Server。内核逻辑完全复用。**

**架构变化：**

```
之前：
  design-operations (SDK) → 被 design_front 直接 import 调用
                          → 被 design-api 的 AI service 调用

现在：
  design-operations (SDK) → 被 design-mcp (MCP Server) 包装
                          → 被 design_front 直接 import 调用（手动操作仍需要）
                          → MCP Server 同时暴露给外部 AI 工具
```

#### Q6：大型 Schema 的存储与版本管理——CRDT/OT 还是 Operation Log？

回到第一性原理：**一个设计稿的数据会有多大？**

先估算：

```
一个中等 App（20 个屏幕，每屏 50 个节点）:
- 每个 ComponentNode ≈ 500 bytes（id + type + styles + props + states + events）
- 20 × 50 × 500 = 500 KB JSON

一个复杂 App（100 个屏幕，每屏 200 个节点）:
- 100 × 200 × 500 = 10 MB JSON
```

10 MB JSON 不算"超大"，但问题不在体积，而在**变更频率**——设计师每秒可能触发多次操作（拖拽时每帧都在改位置）。

**核心问题：每次操作都保存完整 Schema 吗？**

回到第一性原理：**什么是"保存"的本质？**

```
保存 = 记录状态，使其可恢复
版本管理 = 记录状态变化的历史，支持回溯
```

有两种根本不同的记录方式：

```
方式 A：快照法（保存每个版本的完整 Schema）
  V1: { ... 500KB ... }
  V2: { ... 500KB ... }（只改了一个按钮颜色）
  V3: { ... 500KB ... }（只移动了一个元素）
  → 存储爆炸，diff 困难

方式 B：事件溯源法（只保存操作日志，状态通过重放得到）
  V1: [initial schema]
  Op1: { type: "updateStyle", params: { nodeId: "btn-1", styles: { color: "red" } } }
  Op2: { type: "moveElement", params: { nodeId: "card-1", newParentId: "section-2" } }
  Op3: ...
  → 当前状态 = 重放所有操作得到
  → 任意历史 = 重放到某个操作点
```

**你提到的"markdown 文档里的一种设计"，应该是 CRDT（Conflict-free Replicated Data Types）或 OT（Operational Transformation）的思路。**

但对于这个项目，**最优解是 Event Sourcing（事件溯源）+ 定期快照**：

**为什么？因为我们的系统天然就是 Operation-based 的！**

```
设计过程：
  用户点击 / AI 调用 → Operation → OperationExecutor.execute() → 新 Schema

这个 Operation 已经是结构化的、可序列化的、有语义的！
它就是天然的事件日志！
不需要额外设计任何东西来做版本管理！
```

**这是整个架构中最优雅的一个巧合：**

```
design-operations 的操作 = 编辑器的命令 = AI 的工具调用 = 版本管理的事件日志
                           四者合一！
```

**具体方案：Operation Log + 周期快照**

```
┌──────────────────────────────────────────────────────────┐
│                   存储架构                                │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │  Snapshots 表    │    │  Operation Log 表            │  │
│  │                 │    │                             │  │
│  │  snap_001:      │    │  op_001: updateStyle(...)   │  │
│  │    Schema@V0    │    │  op_002: addElement(...)    │  │
│  │    (完整JSON)   │    │  op_003: moveElement(...)   │  │
│  │                 │    │  op_004: updateStyle(...)   │  │
│  │  snap_002:      │    │  op_005: ...               │  │
│  │    Schema@V100  │    │  ...                       │  │
│  │    (每100次快照) │    │  op_150: removeElement(...)│  │
│  └─────────────────┘    └─────────────────────────────┘  │
│                                                          │
│  恢复到 op_137 的状态:                                     │
│  1. 加载 snap_002 (V100 的快照)                            │
│  2. 重放 op_101 ~ op_137                                  │
│  3. 得到精确的 V137 状态                                   │
│  → 最多重放 100 次操作（快照间隔），性能完全可控              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**五大好处：**


| 好处                 | 说明                                       |
| ------------------ | ---------------------------------------- |
| **增量存储**           | 每次只存一条 Operation（~200 bytes），不存完整 Schema |
| **精确版本历史**         | 可以回溯到任意一次操作，不是粗粒度的"保存点"                  |
| **天然支持 Undo/Redo** | 撤销 = 弹出最后一条 Op 并反向执行；重做 = 重新执行           |
| **天然支持协作（未来）**     | 多人操作 = 多人的 Op 流合并（OT/CRDT 只需要处理冲突排序）     |
| **天然的审计日志**        | 谁在什么时候做了什么操作，一目了然；AI 的操作也完整记录            |


**数据库设计：**

```sql
-- 快照表：存完整 Schema，定期创建
CREATE TABLE design_snapshots (
  id            UUID PRIMARY KEY,
  project_id    UUID NOT NULL REFERENCES design_projects(id),
  version       INTEGER NOT NULL,              -- 快照对应的操作序号
  schema        JSONB NOT NULL,                -- 完整 Schema
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 操作日志表：每次操作一条记录
CREATE TABLE design_operations (
  id            UUID PRIMARY KEY,
  project_id    UUID NOT NULL REFERENCES design_projects(id),
  seq           SERIAL,                        -- 操作序号（全局自增）
  operation     JSONB NOT NULL,                -- Operation JSON
  author        VARCHAR(255),                  -- 操作者（用户 or "ai:cursor" or "ai:claude"）
  created_at    TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, seq)                      -- 每个项目内操作序号唯一
);
CREATE INDEX idx_ops_project_seq ON design_operations(project_id, seq);

-- 项目表：只存元信息，不再存完整 Schema
CREATE TABLE design_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  platform      VARCHAR(20) NOT NULL,
  default_viewport JSONB NOT NULL,
  current_version  INTEGER DEFAULT 0,          -- 当前最新操作序号
  latest_snapshot  INTEGER DEFAULT 0,          -- 最新快照对应的序号
  thumbnail     TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

**加载流程：**

```
打开设计稿:
1. 读取 design_projects → 获取 latest_snapshot 和 current_version
2. 读取最近的 snapshot → 得到基准 Schema
3. 读取 snapshot.version ~ current_version 之间的操作
4. 依次重放操作 → 得到最新 Schema
5. 渲染到画布

保存操作:
1. 用户/AI 执行一次操作
2. INSERT INTO design_operations
3. 更新 projects.current_version
4. 如果距离上次快照超过 N 次操作 → 创建新快照
```

**Q5 + Q6 组合在一起的优雅之处：**

```
MCP Server 接收 AI Tool Call
       │
       ▼
Operation 对象（结构化）
       │
       ├─→ 1. OperationExecutor.execute() → 更新内存中的 Schema → 画布重新渲染
       │
       ├─→ 2. INSERT INTO design_operations → 持久化操作日志
       │
       └─→ 3. 操作历史可回溯 → undo/redo / 版本管理

同一个 Operation 对象，同时完成了：执行、持久化、版本管理 三件事
```

> **核心结论：不需要引入 CRDT 或 OT 这种复杂机制。Event Sourcing 是最自然的选择，因为系统本身就是 Operation-driven 的。操作日志 + 周期快照 = 增量存储 + 精确版本 + 无限回溯。**

---

## 二、产品方案

### 2.1 产品定位

**一句话：以屏幕为画布、以 Schema 为核心、以操作为手段、以 AI 为加速器的下一代设计工具。**

### 2.2 核心用户流程

```
┌─────────────────────────────────────────────────────┐
│                     首页                             │
│                                                     │
│   [+ 新建设计稿]     [已有设计稿列表...]              │
│                                                     │
└──────────┬──────────────────────────────────────────┘
           │ 点击新建
           ▼
┌─────────────────────────────────────────────────────┐
│              选择设备 & 屏幕（初始视口）               │
│                                                     │
│   端：  [PC]  [Mobile]                               │
│   机型：[iPhone 15 Pro] [Samsung S24] [自定义]        │
│   屏幕：自动匹配分辨率                                │
│                                                     │
│                           [确认，进入编辑器 →]        │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  编辑器                                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 工具栏: 视口 [iPhone 15 Pro ▼] [375×812]               │  │
│  │         快切: [SE] [15] [iPad] [Pixel] [S24] [自定义]   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │                      │  │ [操作面板] | [AI 对话]        │ │
│  │                      │  ├──────────────────────────────┤ │
│  │       画布            │  │ 添加元素:                     │ │
│  │    (当前视口)         │  │ ┌─────────┐ ┌─────────────┐ │ │
│  │                      │  │ │原子元素  │ │组件资产      │ │ │
│  │  ┌───────────────┐   │  │ │div      │ │📚 我的组件   │ │ │
│  │  │ Canvas 覆盖层  │   │  │ │span     │ │📚 团队组件   │ │ │
│  │  │ (选区/拖拽/    │   │  │ │button   │ │📚 官方组件   │ │ │
│  │  │  对齐线)       │   │  │ │img      │ │             │ │ │
│  │  ├───────────────┤   │  │ │input    │ │ LoginForm   │ │ │
│  │  │ React DOM 层   │   │  │ │...      │ │ NavBar      │ │ │
│  │  │ (真实组件渲染) │   │  │ └─────────┘ │ UserCard    │ │ │
│  │  └───────────────┘   │  │              └─────────────┘ │ │
│  │                      │  │ 修改样式 / 设置交互 / 管理状态 │ │
│  │                      │  │                              │ │
│  └──────────────────────┘  │ AI 对话:                      │ │
│                            │ "把登录按钮改成圆角,           │ │
│                            │  点击后跳转到首页"             │ │
│                            └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 核心产品特性（MVP）

#### 特性 1：屏幕驱动的设计模式 + 视口切换

- 没有自由画布，没有无限 Frame
- 一个设计稿 = 一组屏幕（页面），每个屏幕就是一个手机/PC 的真实屏幕大小
- 新页面的产生方式：**在某个按钮上设置"点击跳转到新页面"**，此时才创建新页面
- 天然形成页面间的跳转关系图
- **初始选择的屏幕只是起始视口**，编辑器内可随时切换设备来查看适配效果
- 切换视口只改变画布宽高，Schema 不变——天然验证响应式适配

#### 特性 2：双层元素体系——原子元素 + 组件资产

- **原子元素**：div、span、button、img、input 等基础 HTML 元素，有完全的样式自由度
- **组件资产**：之前设计好的 Schema 片段，作为可复用资产沉淀（如 LoginForm、NavBar、UserCard）
- 组件资产来源三级：我的组件（当前项目沉淀）→ 团队组件（共享） → 官方组件（预置模板）
- **飞轮效应**：每次设计行为都在生产可复用资产，越用越快

#### 特性 3：组件化 + 状态化设计

- 画布上所有元素都是有语义的组件
- 每个组件有明确的**状态集**（如 Button: default / hover / pressed / disabled）
- 设计师通过操作面板切换和编辑不同状态，而不是画 N 份

#### 特性 4：AI 辅助设计（操作调用，非图片生成）

- AI 不生成像素图，而是调用标准化的操作 API
- "在页面顶部添加一个导航栏" → AI 调用 `addComponent("NavBar", { position: "top" })`
- "把这个按钮改成红色" → AI 调用 `updateStyle(buttonId, { backgroundColor: "#ff0000" })`
- "用我们之前的 LoginForm" → AI 调用 `instantiateTemplate("LoginForm", { parentId: "root" })`
- 好处：**指哪改哪、增量修改、完全可撤销**

#### 特性 5：设计即代码，跨平台导出

- Schema 使用 CSS 规范描述样式，1:1 对应真实代码
- 画布上看到的就是最终产品的样子
- **可导出到任意前端框架**：React、Vue、Flutter、React Native、纯 HTML/CSS
- 导出时可选择目标组件库（如 Ant Design、Element UI、Material Design）和项目规范

### 2.4 MVP 页面清单


| 页面       | 功能                                 |
| -------- | ---------------------------------- |
| **首页**   | 新建设计稿、设计稿列表（卡片展示，含缩略图、名称、更新时间）     |
| **新建弹窗** | 选择端(PC/Mobile)、选择机型/分辨率            |
| **编辑器**  | 左侧画布 + 右侧操作区（操作面板 Tab + AI 对话 Tab） |


### 2.5 设计稿数据模型（概念层）

```
DesignProject
├── id, name, createdAt, updatedAt
├── platform: "pc" | "mobile"
├── defaultDevice: { name, width, height }     ← 初始视口
├── screens: Screen[]
│   ├── Screen
│   │   ├── id, name
│   │   ├── rootNode: ComponentNode  ← 组件树（原子元素 + 组件实例混合）
│   │   └── transitions: Transition[]  ← 页面跳转
│   │       └── { trigger, fromComponentId, toScreenId, animation }
├── componentAssets: ComponentTemplate[]        ← 项目级组件资产
│   └── ComponentTemplate
│       ├── id, name, description, category, tags
│       ├── thumbnail: string
│       ├── schema: ComponentNode              ← 组件的 Schema 片段
│       └── scope: "project" | "team" | "global"
├── viewportPresets: Viewport[]                ← 可快速切换的视口列表
└── globalStyles: { ... }
```

---

## 三、技术方案

### 3.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                      monorepo-template                       │
│                                                              │
│  apps/                                                       │
│  ├── design_front        ← React 前端（已有）                 │
│  ├── design-api          ← NestJS 后端（已有）                │
│  └── design-mcp          ← 🆕 MCP Server（AI 操控入口）      │
│                                                              │
│  features/                                                   │
│  ├── jarvis-tools        ← 工具库（已有）                     │
│  ├── design-schema       ← 🆕 UI Schema 协议（类型+校验+资产）│
│  ├── design-engine       ← 🆕 双层渲染引擎（DOM+Canvas）      │
│  ├── design-operations   ← 🆕 设计操作集合（核心逻辑）        │
│  └── design-codegen      ← 🆕 跨平台代码生成（插件化）        │
│                                                              │
└──────────────────────────────────────────────────────────────┘

外部 AI 工具通过 MCP 协议连接:
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Cursor      │  │  Claude Code  │  │  自建 Client  │
│   (MCP Client)│  │  (MCP Client) │  │  (后期建设)   │
└──────┬────────┘  └──────┬────────┘  └──────┬────────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │ MCP 协议 (stdio / SSE)
                          ▼
              ┌───────────────────────┐
              │   design-mcp Server   │
              │   (暴露 Tools +       │
              │    Resources)         │
              └───────────┬───────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        operations    schema      codegen
        (执行操作)    (读取状态)   (导出代码)
```

### 3.2 是否需要创建新的 SDK？—— 需要 4 个 SDK + 1 个 MCP Server

结合 monorepo 的 `pnpm new` 命令和模板，需要创建：

**4 个 features（内部 SDK）：**

| SDK 包名 | 模板 | 运行环境 | 职责 |
|----------|------|---------|------|
| `@globallink/design-schema` | `features/lib-sdk` | browser | UI Schema 协议：类型定义、校验、组件资产模型、序列化 |
| `@globallink/design-engine` | `features/ui-sdk` | browser | 双层渲染引擎：React DOM 内容层 + Canvas 编辑层 |
| `@globallink/design-operations` | `features/lib-sdk` | browser | 操作集合：所有设计操作的标准化定义与执行（核心逻辑） |
| `@globallink/design-codegen` | `features/lib-sdk` | node | 跨平台代码生成：Schema → React/Vue/Flutter/RN |

**1 个 apps（MCP Server 应用）：**

| 包名 | 位置 | 职责 |
|------|------|------|
| `@globallink/design-mcp` | `apps/design-mcp` | MCP Server：将 design-operations 包装成 MCP Tools，供 Cursor/Claude Code 等调用 |

> **design-mcp 不是 SDK 模板能直接创建的（它不是 lib-sdk 也不是 ui-sdk），需要手动在 apps/ 下创建一个 Node.js 应用。**


**为什么放在 features 而不是 packages？**

- 这些 SDK 目前仅在 monorepo 内部使用（design_front 和 design-api 消费）
- 不需要发布到 npm
- 如果未来需要开源/发布，可以迁移到 packages

**为什么必须拆成独立 SDK 而不是写在 design_front 里？**

1. **design-schema** 前后端共用（前端渲染 + 后端存储/校验都需要）
2. **design-engine** 未来要支持多渲染目标（React、Canvas、Vue），必须独立
3. **design-operations** 要被 AI 模块和手动操作面板共同调用，必须独立
4. 关注点分离，每个包独立构建、独立测试

### 3.3 各 SDK 详细设计

#### 3.3.1 `@globallink/design-schema` — UI Schema 协议

**核心理念：用 CSS 的语言描述样式，用组件树描述结构，用事件描述交互，用资产描述复用。**

```typescript
// ===== 节点类型 =====
// type 分为两类：原子元素（HTML 标签）和组件实例（来自资产库）
type NodeType =
  // 原子元素 — 直接映射 HTML 标签
  | "div" | "span" | "p" | "h1" | "h2" | "h3"
  | "button" | "input" | "textarea" | "select"
  | "img" | "a" | "ul" | "ol" | "li"
  | "nav" | "header" | "footer" | "section" | "main"
  // 组件实例 — 引用资产库中的模板
  | `component:${string}`;  // e.g. "component:LoginForm", "component:NavBar"

interface ComponentNode {
  id: string;
  type: NodeType;
  name?: string;                // 设计师给的名字
  styles: CSSProperties;       // 直接用 CSS 属性，不发明新语法
  children?: ComponentNode[];   // 子节点
  props: Record<string, any>;   // 元素属性（如 img 的 src、input 的 placeholder）
  states: ComponentState[];     // 组件状态集
  activeState: string;          // 当前激活状态
  events: ComponentEvent[];     // 绑定的事件
  constraints?: LayoutConstraints; // 布局约束
  // 如果是组件实例，记录来源
  templateRef?: {
    templateId: string;         // 引用的 ComponentTemplate.id
    mode: "reference" | "detached"; // 引用模式（同步更新）或 脱离模式（独立修改）
  };
}

// ===== 组件状态 =====
interface ComponentState {
  name: string;                 // "default" | "hover" | "pressed" | "disabled" | 自定义
  styles: Partial<CSSProperties>; // 该状态下的样式覆盖
  props?: Partial<Record<string, any>>; // 该状态下的属性覆盖
}

// ===== 事件/交互 =====
interface ComponentEvent {
  trigger: "click" | "hover" | "focus" | "blur" | "longPress";
  action: EventAction;
}

type EventAction =
  | { type: "navigate"; targetScreenId: string; animation?: TransitionAnimation }
  | { type: "setState"; targetId: string; state: string }
  | { type: "openUrl"; url: string }
  | { type: "custom"; handler: string };

// ===== 组件资产模板 =====
interface ComponentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;             // "表单" | "导航" | "卡片" | "布局" | ...
  tags: string[];
  thumbnail?: string;           // 缩略图 base64/url
  schema: ComponentNode;        // 组件的 Schema 片段（子树）
  scope: "project" | "team" | "global";
  createdAt: string;
  updatedAt: string;
}

// ===== 视口预设 =====
interface Viewport {
  name: string;                 // "iPhone 15 Pro"
  width: number;
  height: number;
  devicePixelRatio?: number;
  platform: "pc" | "mobile" | "tablet";
}

// ===== 屏幕 =====
interface Screen {
  id: string;
  name: string;
  rootNode: ComponentNode;
  backgroundColor?: string;
}

// ===== 设计项目 =====
interface DesignProject {
  id: string;
  name: string;
  platform: "pc" | "mobile";
  defaultViewport: Viewport;              // 初始选择的视口
  currentViewport: Viewport;              // 当前正在预览的视口（可切换）
  viewportPresets: Viewport[];            // 快速切换列表
  screens: Screen[];
  componentAssets: ComponentTemplate[];   // 项目级组件资产
  createdAt: string;
  updatedAt: string;
}
```

**这个包导出什么：**

- TypeScript 类型定义（上面这些 interface）
- Schema 校验函数（`validateProject()`, `validateNode()`）
- 原子元素注册表（所有支持的 HTML 标签及其默认属性/样式）
- 组件资产管理工具（`saveAsTemplate()`, `instantiateTemplate()`, `detachInstance()`）
- 序列化/反序列化工具（JSON ↔ Schema 对象）
- 内置视口预设库（iPhone 系列、Android 系列、iPad、PC 分辨率等 20+ 种）

#### 3.3.2 `@globallink/design-engine` — 双层渲染引擎

**职责：把 Schema 渲染成可视化的 UI，同时提供编辑器交互层。**

**双层架构：**

```
┌─────────────────────────────────────────┐
│        Canvas 覆盖层（编辑交互）          │
│  - 选区框 / hover 高亮                   │  ← 纯几何绘制
│  - 拖拽手柄 / resize handle              │     Canvas 2D API
│  - 对齐辅助线 / 吸附提示                 │     接收鼠标事件
│  - 间距标注 / 尺寸标注                   │
├─────────────────────────────────────────┤
│        React DOM 渲染层（内容预览）       │
│  - Schema → React 组件树                 │  ← 真实 DOM 渲染
│  - 直接使用 CSS 样式                     │     所见即所得
│  - 状态切换实时预览                      │     浏览器原生布局
│  - 组件实例渲染（从资产库实例化）         │
└─────────────────────────────────────────┘
     ↕ 通过坐标映射关联（getBoundingClientRect → Canvas 坐标）
```

**核心模块：**

```typescript
// ===== 1. React DOM 内容渲染器 =====
// 将 Schema 递归渲染为真实 React 组件树
function SchemaRenderer(props: {
  screen: Screen;
  viewport: Viewport;          // 当前视口，决定画布宽高
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
}): React.ReactElement;

// ===== 2. Canvas 编辑覆盖层 =====
// 透明覆盖在 DOM 层之上，处理所有编辑交互
function EditorOverlay(props: {
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  showAlignmentGuides: boolean;
  onSelect: (nodeId: string) => void;
  onDrag: (nodeId: string, deltaX: number, deltaY: number) => void;
  onResize: (nodeId: string, newWidth: number, newHeight: number) => void;
}): React.ReactElement;  // 内部使用 <canvas> 元素

// ===== 3. 原子元素渲染器 =====
// 将 Schema 中的原子元素（div, span, button...）渲染为真实 HTML 元素
interface PrimitiveRenderer {
  type: string;  // "div" | "button" | "img" | ...
  render(node: ComponentNode, children: React.ReactNode[]): React.ReactElement;
}

// ===== 4. 组件实例渲染器 =====
// 将 "component:LoginForm" 类型的节点，找到对应 template 并渲染
function resolveComponentInstance(
  node: ComponentNode,
  assets: ComponentTemplate[]
): ComponentNode;  // 展开为完整的子树

// ===== 5. 样式引擎 =====
function resolveStyles(node: ComponentNode): React.CSSProperties;

// ===== 6. 状态引擎 =====
function resolveActiveState(node: ComponentNode): {
  styles: CSSProperties;
  props: Record<string, any>;
};

// ===== 7. 视口适配 =====
// 根据当前视口调整画布容器大小，内容按比例缩放
function ViewportContainer(props: {
  viewport: Viewport;
  children: React.ReactNode;
}): React.ReactElement;
```

**为什么选 ui-sdk 模板？**

- 这个包需要引入 React 来渲染 DOM 层
- ui-sdk 模板自带 React + Vite + Tailwind 配置
- 同时支持作为库导出（给 design_front 使用）和独立 dev 调试

#### 3.3.3 `@globallink/design-operations` — 操作集合

**核心理念：设计工具的所有动作，统一为标准化的 Operation。AI 和人类使用同一套操作。**

```typescript
// ===== Operation 定义 =====
interface Operation {
  type: string;
  params: Record<string, any>;
  description: string;           // 人类可读描述（也给 AI 理解）
}

// ===== 操作分类 =====

// 原子元素操作
type PrimitiveOps =
  | { type: "addElement"; params: { parentId: string; tag: string; styles?: CSSProperties; props?: any; position?: number } }
  | { type: "removeElement"; params: { elementId: string } }
  | { type: "moveElement"; params: { elementId: string; newParentId: string; position?: number } }
  | { type: "duplicateElement"; params: { elementId: string } }

// 组件资产操作
type AssetOps =
  | { type: "instantiateTemplate"; params: { templateId: string; parentId: string; position?: number; mode?: "reference" | "detached" } }
  | { type: "saveAsTemplate"; params: { nodeId: string; name: string; category: string; scope: "project" | "team" } }
  | { type: "detachInstance"; params: { nodeId: string } }  // 从引用模式变为脱离模式
  | { type: "syncInstance"; params: { nodeId: string } }    // 重新同步到最新模板

// 样式操作
type StyleOps =
  | { type: "updateStyle"; params: { nodeId: string; styles: Partial<CSSProperties> } }
  | { type: "resetStyle"; params: { nodeId: string; properties: string[] } }

// 状态操作
type StateOps =
  | { type: "addState"; params: { nodeId: string; stateName: string; styles?: any } }
  | { type: "removeState"; params: { nodeId: string; stateName: string } }
  | { type: "updateState"; params: { nodeId: string; stateName: string; styles: any } }
  | { type: "setActiveState"; params: { nodeId: string; stateName: string } }

// 交互操作
type InteractionOps =
  | { type: "addEvent"; params: { nodeId: string; event: ComponentEvent } }
  | { type: "removeEvent"; params: { nodeId: string; eventIndex: number } }
  | { type: "addNavigation"; params: { nodeId: string; trigger: string; targetScreenId: string } }

// 屏幕操作
type ScreenOps =
  | { type: "addScreen"; params: { name: string } }
  | { type: "removeScreen"; params: { screenId: string } }
  | { type: "setActiveScreen"; params: { screenId: string } }

// 视口操作
type ViewportOps =
  | { type: "switchViewport"; params: { viewport: Viewport } }
  | { type: "addViewportPreset"; params: { viewport: Viewport } }

// ===== 操作执行器 =====
class OperationExecutor {
  constructor(project: DesignProject);

  // 执行操作，返回新的 project（不可变更新）
  execute(op: Operation): DesignProject;

  // 批量执行
  executeBatch(ops: Operation[]): DesignProject;

  // 撤销/重做
  undo(): DesignProject;
  redo(): DesignProject;

  // 获取所有可用操作的描述（给 AI 用）
  getAvailableOperations(): OperationDescription[];
}
```

**AI 集成关键点：**

- `getAvailableOperations()` 返回所有操作的结构化描述，作为 AI 的 function calling tools
- AI 可以同时使用原子元素操作（"加一个 div"）和组件资产操作（"用 LoginForm 组件"）
- AI 输出 Operation JSON → `execute()` 执行 → Schema 更新 → 引擎重新渲染
- 所有操作都是原子化的，支持 undo/redo

#### 3.3.4 `@globallink/design-codegen` — 跨平台代码生成引擎

**核心理念：Schema 是 "UI 的中间表示（IR）"，Codegen 是翻译器。每个目标平台一个插件。**

```
                    ┌→ ReactCodegen    → JSX + CSS Modules / Tailwind
                    │
Schema (UI IR) ─────┼→ VueCodegen      → SFC (.vue) + <style scoped>
                    │
                    ┼→ FlutterCodegen   → Dart Widget Tree + ThemeData
                    │
                    ├→ RNCodegen        → React Native + StyleSheet
                    │
                    └→ HTMLCodegen      → 纯 HTML + CSS（静态页面）
```

**架构设计：**

```typescript
// ===== 代码生成插件接口 =====
interface CodegenPlugin {
  name: string;                    // "react" | "vue" | "flutter" | "react-native" | "html"
  displayName: string;             // "React (TypeScript)"
  fileExtension: string;           // ".tsx" | ".vue" | ".dart"

  // 核心翻译方法
  generateComponent(node: ComponentNode, children: string[]): string;
  generateStyles(styles: CSSProperties): string;
  generateEvent(event: ComponentEvent): string;
  generateScreen(screen: Screen): GeneratedFile[];
  generateProject(project: DesignProject): GeneratedFile[];

  // 组件映射表：Schema 组件名 → 目标平台组件
  componentMap: Record<string, ComponentMapping>;
}

interface ComponentMapping {
  // 原子元素映射
  // "div" → React: <div>, Vue: <div>, Flutter: Container(), RN: <View>
  // "button" → React: <button>, Flutter: ElevatedButton(), RN: <TouchableOpacity>
  import?: string;                 // 需要的 import 语句
  tag: string;                     // 目标平台的组件/标签名
  propsTransform?: (props: Record<string, any>) => Record<string, any>;
}

interface GeneratedFile {
  path: string;                    // "src/screens/LoginScreen.tsx"
  content: string;                 // 文件内容
}

// ===== 样式翻译器 =====
// CSS Properties → 目标平台样式语法
interface StyleTranslator {
  // CSS → Flutter
  // { backgroundColor: "#1890ff", borderRadius: 8, padding: 16 }
  // → BoxDecoration(color: Color(0xFF1890FF), borderRadius: BorderRadius.circular(8))
  //   + EdgeInsets.all(16)

  // CSS → React Native
  // { backgroundColor: "#1890ff", borderRadius: 8 }
  // → StyleSheet.create({ container: { backgroundColor: '#1890ff', borderRadius: 8 } })

  translate(styles: CSSProperties): string;
}

// ===== 代码生成管理器 =====
class CodegenManager {
  // 注册插件
  registerPlugin(plugin: CodegenPlugin): void;

  // 列出所有可用目标
  listTargets(): { name: string; displayName: string }[];

  // 生成代码
  generate(project: DesignProject, target: string, options?: CodegenOptions): GeneratedFile[];
}

interface CodegenOptions {
  componentLibrary?: string;       // "antd" | "element-ui" | "material" | "none"
  styleStrategy?: "css-modules" | "tailwind" | "styled-components" | "inline";
  typescript?: boolean;
  projectTemplate?: string;        // 使用哪个项目脚手架模板
}
```

**为什么 Schema 能翻译到任何平台？关键在于样式层的抽象正确：**

```
Schema 中的 CSS 属性:              各平台的等价表达:
──────────────────────────         ──────────────────────
flexDirection: "row"          →    Row() (Flutter) / flexDirection:'row' (RN)
gap: 8                        →    spacing: 8 (Flutter) / gap:8 (RN 0.71+)
backgroundColor: "#1890ff"    →    Color(0xFF1890FF) (Flutter)
borderRadius: 8               →    BorderRadius.circular(8) (Flutter)
fontSize: 16                  →    TextStyle(fontSize:16) (Flutter)
padding: "16px"               →    EdgeInsets.all(16) (Flutter)
```

CSS 的布局模型（Flexbox）和视觉属性，是所有 UI 框架的"最大公约数"——每个属性都有明确的跨平台映射。这就是为什么选择 CSS 作为 Schema 的样式语言是正确的。

**这个包放在 node 环境：** 代码生成主要在后端执行（文件I/O密集），但核心翻译逻辑也可在浏览器端预览。

#### 3.3.5 `@globallink/design-mcp` — MCP Server（AI 操控入口）

**核心理念：你的系统能力通过 MCP 协议暴露给一切 AI 工具，前期零成本获得 Cursor/Claude Code 的 AI 能力，后期自建 Client 无缝切换。**

```typescript
// ===== MCP Server 实现 =====
// 基于 @modelcontextprotocol/sdk 构建

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "designui",
  version: "0.1.0",
});

// ===== Tools（操作）=====

// 查询类 — 让 AI 了解当前设计稿状态
server.tool("get_project_info",
  "获取当前设计项目的基本信息（名称、平台、屏幕列表、视口）",
  { projectId: z.string() },
  async ({ projectId }) => { /* 返回项目概要 */ }
);

server.tool("get_screen_schema",
  "获取指定屏幕的完整 Schema（组件树、样式、交互、状态）",
  { projectId: z.string(), screenId: z.string() },
  async ({ projectId, screenId }) => { /* 返回屏幕 Schema JSON */ }
);

server.tool("get_available_assets",
  "列出可用的组件资产（我的组件/团队组件/官方组件）",
  { scope: z.enum(["project", "team", "global"]).optional() },
  async ({ scope }) => { /* 返回资产列表 */ }
);

// 元素操作类 — 添加/删除/移动原子元素和组件实例
server.tool("add_element",
  "在指定父节点下添加一个 HTML 原子元素（div/button/img/input 等），可设置初始样式",
  {
    projectId: z.string(),
    screenId: z.string(),
    parentId: z.string(),
    tag: z.string(),           // "div" | "button" | "img" | ...
    styles: z.record(z.any()).optional(),
    props: z.record(z.any()).optional(),
    position: z.number().optional(),
  },
  async (params) => { /* 执行 addElement 操作 */ }
);

server.tool("instantiate_template",
  "从组件资产库实例化一个组件到指定位置（如 LoginForm、NavBar 等）",
  {
    projectId: z.string(),
    screenId: z.string(),
    templateId: z.string(),
    parentId: z.string(),
    position: z.number().optional(),
  },
  async (params) => { /* 执行 instantiateTemplate 操作 */ }
);

server.tool("remove_element", ...);
server.tool("move_element", ...);
server.tool("duplicate_element", ...);

// 样式操作类
server.tool("update_style",
  "修改指定元素的 CSS 样式（如 backgroundColor、fontSize、padding 等）",
  {
    projectId: z.string(),
    screenId: z.string(),
    nodeId: z.string(),
    styles: z.record(z.any()),
  },
  async (params) => { /* 执行 updateStyle 操作 */ }
);

// 状态操作类
server.tool("add_state", ...);
server.tool("update_state", ...);
server.tool("set_active_state", ...);

// 交互操作类
server.tool("add_navigation",
  "为元素添加页面跳转交互（如点击按钮跳到注册页）",
  {
    projectId: z.string(),
    screenId: z.string(),
    nodeId: z.string(),
    trigger: z.enum(["click", "hover", "longPress"]),
    targetScreenId: z.string(),
  },
  async (params) => { /* 执行 addNavigation 操作 */ }
);

server.tool("add_event", ...);

// 屏幕/视口操作类
server.tool("add_screen", ...);
server.tool("switch_viewport", ...);

// 撤销/重做
server.tool("undo", ...);
server.tool("redo", ...);

// 资产管理
server.tool("save_as_template",
  "将当前选中的节点子树保存为可复用的组件资产",
  { projectId: z.string(), nodeId: z.string(), name: z.string(), category: z.string() },
  async (params) => { /* 执行 saveAsTemplate 操作 */ }
);

// 代码导出
server.tool("export_code",
  "将设计稿导出为目标平台代码（react/vue/flutter/react-native/html）",
  { projectId: z.string(), target: z.string(), options: z.any().optional() },
  async (params) => { /* 调用 design-codegen */ }
);

// ===== Resources（状态数据，供 AI 读取上下文）=====
server.resource("schema://project/{projectId}", ...);
server.resource("schema://screen/{projectId}/{screenId}", ...);
server.resource("assets://list", ...);

// ===== 启动 =====
const transport = new StdioServerTransport();
await server.connect(transport);
```

**MCP Server 与前端编辑器的实时同步：**

```
问题：MCP Server 修改了 Schema，前端画布怎么知道要重新渲染？

方案：design-api 作为中间桥梁，通过 WebSocket 通知前端

┌──────────┐   MCP Tool Call   ┌───────────┐   REST/WS   ┌────────────┐
│  Cursor  │ ─────────────────→│ MCP Server│ ──────────→│ design-api │
└──────────┘                   └───────────┘            └─────┬──────┘
                                                              │ WebSocket
                                                              ▼
                                                        ┌────────────┐
                                                        │design_front│
                                                        │ (画布刷新)  │
                                                        └────────────┘

流程：
1. Cursor 调用 MCP Tool → MCP Server 收到操作
2. MCP Server 调用 design-api 的 REST 接口执行操作
3. design-api 执行操作 + 写入 Operation Log + 通过 WebSocket 推送变更
4. design_front 收到 WebSocket 消息 → 应用操作 → 画布重新渲染
```

**前期 vs 后期的 AI 策略：**

```
前期（MVP）：
  AI 对话 = Cursor / Claude Code（成熟的 AI 编程工具）
  连接方式 = MCP Server（stdio 模式）
  优势 = 零开发成本就有顶级 AI 对话体验

后期（自建）：
  AI 对话 = 自建 Chat Panel（右侧面板，做一个 MCP Client）
  连接方式 = 调用同一个 MCP Server（SSE 模式 / 直接 import SDK）
  优势 = 完全自定义的产品体验

关键点：MCP Server 是不变的基座，永远可以复用
```

### 3.4 前端架构（design_front）

```
apps/design_front/src/
├── main.tsx                    # 入口
├── router/                     # 路由
│   └── index.tsx               # / → 首页, /editor/:id → 编辑器
├── stores/                     # MobX 状态管理
│   ├── project.store.ts        # 设计项目状态（持有 DesignProject）
│   ├── editor.store.ts         # 编辑器 UI 状态（选中节点、当前屏幕等）
│   └── sync.store.ts           # WebSocket 同步状态（接收 MCP/外部操作推送）
├── views/
│   ├── home/                   # 首页（项目列表 + 新建）
│   │   └── index.tsx
│   └── editor/                 # 编辑器
│       ├── index.tsx           # 编辑器主布局
│       ├── Canvas.tsx          # 左侧画布（调用 design-engine 双层渲染）
│       ├── OperationPanel.tsx  # 右侧操作面板（手动操作）
│       └── ComponentTree.tsx   # 组件层级树（可选）
├── components/                 # 通用 UI 组件
└── services/                   # API 调用层
    ├── api.ts                  # 与 design-api 通信（REST）
    └── ws.ts                   # WebSocket 连接（接收实时操作推送）
```

> **注意：去掉了 AIChatPanel.tsx 和 ai.store.ts。前期 AI 对话完全由 Cursor/Claude Code 通过 MCP 完成，前端不需要自建 AI 对话。**

**数据流（两条路径并行）：**

```
路径 A：手动操作（前端直接）
  用户点击操作面板
       │
       ▼
  OperationExecutor.execute(op)    ← 前端直接调用 SDK
       │
       ├─→ MobX Store 更新 → 画布重新渲染
       └─→ REST API → design-api 持久化（Operation Log + 快照）

路径 B：AI 操作（通过 MCP）
  Cursor/Claude Code 发出 Tool Call
       │
       ▼
  MCP Server → design-api REST 接口
       │
       ├─→ 持久化（Operation Log + 快照）
       └─→ WebSocket 推送给前端
              │
              ▼
        前端收到变更 → 应用操作 → 画布重新渲染
```

### 3.5 后端架构（design-api）

```
apps/design-api/src/
├── main.ts                     # NestJS 入口
├── app.module.ts               # 根模块
├── projects/                   # 设计项目 CRUD
│   ├── projects.controller.ts  # REST API
│   ├── projects.service.ts     # 业务逻辑
│   └── projects.entity.ts      # 数据库实体
├── operations/                 # 操作执行 & 日志
│   ├── operations.controller.ts # 接收操作请求（来自前端 or MCP Server）
│   ├── operations.service.ts    # 执行操作 + 写入日志 + 触发快照
│   └── operations.gateway.ts    # WebSocket 网关（推送操作给前端）
├── assets/                     # 组件资产管理
│   ├── assets.controller.ts
│   └── assets.service.ts
└── codegen/                    # 代码生成服务
    ├── codegen.controller.ts
    └── codegen.service.ts      # 调用 design-codegen
```

> **注意：去掉了 ai/ 模块。AI 对话不再由后端负责，而是通过 MCP 协议由外部工具（Cursor/Claude Code）直接处理。**

**API 设计：**

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/projects` | 获取项目列表 |
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects/:id` | 获取项目详情（从快照+操作日志重建 Schema） |
| DELETE | `/api/projects/:id` | 删除项目 |
| POST | `/api/projects/:id/operations` | 执行操作（写入日志 + 推送 WebSocket） |
| POST | `/api/projects/:id/operations/batch` | 批量执行操作 |
| GET | `/api/projects/:id/operations?since=N` | 获取某个版本后的操作日志 |
| POST | `/api/projects/:id/operations/undo` | 撤销最后一次操作 |
| POST | `/api/projects/:id/export/:target` | 导出目标平台代码 |
| GET | `/api/assets` | 获取组件资产列表 |
| POST | `/api/assets` | 保存组件资产 |
| PUT | `/api/assets/:id` | 更新组件资产 |
| DELETE | `/api/assets/:id` | 删除组件资产 |
| WS | `/ws/projects/:id` | WebSocket：实时操作推送 |

### 3.6 数据存储 — Event Sourcing + 周期快照

**核心理念：操作日志就是版本历史，快照是加速恢复的缓存。**

（详细分析见 1.4 Q6 的第一性原理推导）

```sql
-- 项目表：只存元信息，不再存完整 Schema
CREATE TABLE design_projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  platform         VARCHAR(20) NOT NULL,
  default_viewport JSONB NOT NULL,
  current_version  INTEGER DEFAULT 0,        -- 当前最新操作序号
  latest_snapshot  INTEGER DEFAULT 0,        -- 最新快照对应的序号
  thumbnail        TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- 操作日志表：每次操作一条记录（增量存储的核心）
CREATE TABLE design_operations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES design_projects(id),
  seq           SERIAL,                       -- 操作序号
  operation     JSONB NOT NULL,               -- Operation JSON（~200 bytes）
  author        VARCHAR(255),                 -- "user:xxx" | "ai:cursor" | "ai:claude-code"
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, seq)
);
CREATE INDEX idx_ops_project_seq ON design_operations(project_id, seq);

-- 快照表：每 N 次操作创建一次（加速恢复）
CREATE TABLE design_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES design_projects(id),
  version       INTEGER NOT NULL,              -- 快照对应的操作序号
  schema        JSONB NOT NULL,                -- 完整 Schema（恢复基准）
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_snap_project ON design_snapshots(project_id, version);

-- 组件资产表
CREATE TABLE component_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  category      VARCHAR(100),
  tags          TEXT[],
  scope         VARCHAR(20) NOT NULL,          -- 'project' | 'team' | 'global'
  project_id    UUID REFERENCES design_projects(id), -- scope=project 时关联
  schema        JSONB NOT NULL,                -- 组件 Schema 片段
  thumbnail     TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

**快照策略：**
- 每 100 次操作自动创建一次快照
- 恢复时：加载最近快照 + 重放剩余操作（最多 100 次，毫秒级完成）
- 旧快照可定期清理（保留最近 N 个 + 关键里程碑）

### 3.7 技术选型总结

| 层 | 技术 | 理由 |
|----|------|------|
| 前端框架 | React 18 + Vite | monorepo 已有，生态成熟 |
| 状态管理 | MobX | monorepo 已有，响应式更新适合编辑器场景 |
| UI 组件库 | Ant Design | monorepo 已有 |
| 样式 | Tailwind CSS + CSS-in-JS | Tailwind 做编辑器 UI，CSS-in-JS 做画布渲染 |
| 画布渲染 | 双层：React DOM + Canvas 覆盖层 | DOM 层所见即所得（CSS 1:1），Canvas 层做选区/拖拽/对齐线 |
| AI 集成 | MCP Server + 外部 AI Client | 前期用 Cursor/Claude Code，零成本；后期自建 Client |
| MCP SDK | @modelcontextprotocol/sdk | 官方标准实现，TypeScript 原生支持 |
| 后端 | NestJS | 已有，TypeScript 全栈一致 |
| 数据库 | PostgreSQL | 已有 |
| 存储模型 | Event Sourcing + 周期快照 | 增量存储、精确版本、天然 undo/redo、审计日志 |
| 实时同步 | WebSocket (NestJS Gateway) | MCP 操作实时推送到前端画布 |
| 构建 | tsup (SDK) + Vite (App) | monorepo 标准配置 |


---

## 四、创建 SDK 的具体操作步骤

使用 monorepo 的 `pnpm new` 命令创建 4 个 features SDK，手动创建 1 个 MCP Server app：

```bash
# 1. 创建 design-schema（UI 协议定义）
pnpm new
# → 选择: features
# → 选择模板: lib-sdk
# → 目录名: design-schema
# → 运行环境: browser

# 2. 创建 design-engine（双层渲染引擎）
pnpm new
# → 选择: features
# → 选择模板: ui-sdk
# → 目录名: design-engine

# 3. 创建 design-operations（操作集合）
pnpm new
# → 选择: features
# → 选择模板: lib-sdk
# → 目录名: design-operations
# → 运行环境: browser

# 4. 创建 design-codegen（跨平台代码生成）
pnpm new
# → 选择: features
# → 选择模板: lib-sdk
# → 目录名: design-codegen
# → 运行环境: node

# 5. 手动创建 design-mcp（MCP Server）
#    不用 pnpm new，因为 MCP Server 不是 lib-sdk / ui-sdk 模板
mkdir -p apps/design-mcp/src
cd apps/design-mcp
npm init -y
# 安装 MCP SDK
pnpm add @modelcontextprotocol/sdk zod
pnpm add -D typescript tsup @types/node
```

创建后的 monorepo 结构：

```
monorepo-template/
├── apps/
│   ├── design_front          # 前端应用（已有）
│   ├── design-api            # 后端 API（已有）
│   └── design-mcp            # 🆕 MCP Server（AI 入口）
├── features/
│   ├── jarvis-tools          # 工具库（已有）
│   ├── design-schema         # 🆕 UI Schema 协议 + 组件资产
│   ├── design-engine         # 🆕 双层渲染引擎
│   ├── design-operations     # 🆕 操作集合
│   └── design-codegen        # 🆕 跨平台代码生成
```

**包依赖关系：**

```
design-schema              ← 无依赖，最底层（类型 + 校验 + 资产模型）
      ↑
design-operations          ← 依赖 design-schema
      ↑
design-engine              ← 依赖 design-schema（渲染 Schema 为 DOM + Canvas）
design-codegen             ← 依赖 design-schema（翻译 Schema 为代码）
design-mcp                 ← 依赖 design-schema + design-operations（MCP 壳）
      ↑
design_front               ← 依赖 schema + operations + engine
design-api                 ← 依赖 schema + operations + codegen
```

---

## 五、MVP 开发路线图

### Phase 1：协议层（1 周）

- 创建 `design-schema`，定义核心类型（NodeType 含原子元素 + 组件实例）
- 实现原子元素注册表（HTML 标签及其默认属性）
- 实现组件资产模型（ComponentTemplate CRUD、实例化/脱离逻辑）
- 实现 Schema 校验器
- 内置视口预设库（20+ 设备尺寸）

### Phase 2：操作层（1 周）

- 创建 `design-operations`
- 实现原子元素操作（addElement/removeElement/moveElement...）
- 实现组件资产操作（instantiateTemplate/saveAsTemplate/detachInstance...）
- 实现样式/状态/交互/屏幕/视口操作
- 实现 undo/redo 栈
- 实现 `getAvailableOperations()` 供 MCP 注册 Tools 使用

### Phase 3：MCP Server（0.5 周）

- 创建 `design-mcp`，基于 @modelcontextprotocol/sdk
- 将所有 design-operations 的操作注册为 MCP Tools
- 注册 Resources（项目 Schema、屏幕 Schema、资产列表）
- 实现与 design-api 的 REST 通信（操作持久化）
- 配置 Cursor / Claude Code 连接测试

### Phase 4：渲染层（1.5 周）

- 创建 `design-engine`
- 实现 React DOM 内容渲染层（SchemaRenderer）
- 实现 Canvas 编辑覆盖层（EditorOverlay：选区、拖拽、对齐线）
- 实现坐标映射系统（DOM getBoundingClientRect → Canvas 坐标）
- 实现视口容器（ViewportContainer：切换设备尺寸）
- 实现组件实例解析器（展开 templateRef 为完整子树）

### Phase 5：前端整合（2 周）

- 首页：项目列表 + 新建流程（含视口选择）
- 编辑器画布：集成双层渲染引擎 + 视口切换工具栏
- 操作面板：原子元素添加 + 组件资产面板（三级资产源）
- 样式编辑、交互设置、状态管理
- WebSocket 集成：接收 MCP 操作推送，实时刷新画布

### Phase 6：后端 + Event Sourcing（1 周）

- 项目 CRUD API + 组件资产 CRUD API
- Operation Log 持久化 + 周期快照机制
- WebSocket Gateway（推送操作变更给前端）
- 数据库表结构（projects + operations + snapshots + assets）

### Phase 7：代码生成（2 周）

- 创建 `design-codegen`，实现插件化架构
- React 代码生成插件（MVP 首要目标）
- Vue 代码生成插件
- Flutter 代码生成插件
- 导出 API 接口 + 前端导出功能 + MCP export_code Tool

### Phase 8（后期）：自建 AI 对话（按需）

- 在 design_front 中添加 AI Chat Panel
- 实现为 MCP Client，调用同一个 design-mcp Server
- 自定义 system prompt、上下文管理、操作预览
- 逐步替代 Cursor/Claude Code 依赖（如果产品需要）

---

## 六、关键设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| Schema 样式用什么规范？ | CSS Properties | 不发明新语法，前端开发者零学习成本，导出代码 1:1 对应，且 CSS 是所有 UI 框架的"最大公约数" |
| 画布渲染方式？ | 双层：React DOM + Canvas | DOM 层渲染内容（CSS 1:1 所见即所得），Canvas 层做编辑交互（选区/拖拽/对齐线） |
| 为什么不用纯 Canvas？ | DOM 更适合 | Schema 就是 DOM 结构 + CSS 样式，浏览器天然能渲染；纯 Canvas 要自己实现文本排版/Flex 布局，等于重写浏览器 |
| AI 集成方式？ | MCP Server | 操作层 = MCP Tools，前期 Cursor/Claude Code 零成本接入，后期自建 Client 无缝切换 |
| 为什么不自建 AI 对话？ | 关注点分离 | 核心竞争力是 Schema+渲染+操作，不是"AI 对话 UI"；MCP 让 AI 能力外包给成熟工具 |
| 数据存储模型？ | Event Sourcing + 周期快照 | Operation 天然就是事件日志，增量存储、精确版本、undo/redo、审计日志四合一 |
| 为什么不用 CRDT？ | Event Sourcing 更自然 | 系统本身就是 Operation-driven，操作日志+快照已满足需求；CRDT 是多人实时协作时才需要的更复杂方案 |
| 能否跨平台导出？ | 能，插件化 Codegen | CSS 属性是跨平台的"最大公约数"，每个平台有明确映射；Codegen 做翻译插件 |
| 元素添加方式？ | 双层：原子元素 + 组件资产 | 原子元素（HTML 标签）给灵活性，组件资产（Schema 片段）给效率和复用 |
| 组件资产模式？ | 引用 + 脱离两种 | 引用模式同步更新，脱离模式独立修改；满足不同场景需求 |
| 屏幕选择后能切换？ | 能，初始视口 ≠ 锁死 | Schema 不变，切换视口只改画布宽高，天然验证响应式适配 |
| 新页面如何产生？ | 通过交互操作触发创建 | 核心产品理念——屏幕间跳转天然形成交互关系图 |
| 包数量？ | 4 SDK + 1 MCP Server | schema + engine + operations + codegen + mcp，各司其职 |


