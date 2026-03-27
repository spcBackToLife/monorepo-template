# DesignUI - 设计文档导航

> 以屏幕为画布、以 Schema 为核心、以操作为手段、以 AI 为加速器的下一代设计工具

## 文档结构

```
design_docs/
├── README.md                        ← 你在这里（导航 + 项目概述）
│
├── 01-vision/                       ← 愿景与第一性原理（稳定层，很少改）
│   └── first-principles.md          - 核心洞察、6 个关键问题的推导
│
├── 02-product/                      ← 产品方案（持续增长，补充产品逻辑）
│   ├── overview.md                  - 产品定位、核心特性、用户流程、页面清单
│   ├── editor.md                    - 编辑器详细设计（画布、操作面板、视口切换）
│   └── component-assets.md          - 组件资产体系（原子元素、资产库、飞轮）
│
├── 03-tech/                         ← 技术方案（按模块拆分，各自独立阅读）
│   ├── architecture.md              - 整体架构、包依赖、技术选型
│   ├── design-schema.md             - SDK: UI Schema 协议
│   ├── design-engine.md             - SDK: 双层渲染引擎
│   ├── design-operations.md         - SDK: 操作集合
│   ├── design-codegen.md            - SDK: 跨平台代码生成
│   ├── design-mcp.md                - APP: MCP Server
│   ├── frontend.md                  - APP: 前端架构 (design_front)
│   ├── backend.md                   - APP: 后端架构 (design-api) + 数据库
│   └── event-sourcing.md            - 存储方案: Event Sourcing + 快照
│
├── 04-roadmap/                      ← 排期与计划
│   └── roadmap.md                   - MVP 执行清单（前/后端 Todo 表 + Phase 总览）
│
└── 05-decisions/                    ← 决策记录（持续追加）
    └── decision-log.md              - 所有关键设计决策及理由
```

## 阅读顺序建议

1. **快速了解项目** → 读本文件 + `01-vision/first-principles.md`
2. **理解产品做什么** → 读 `02-product/overview.md`
3. **开发某个模块** → 直接读 `03-tech/` 下对应的模块文档
4. **看排期计划** → 读 `04-roadmap/roadmap.md`
5. **理解某个决策** → 查 `05-decisions/decision-log.md`

## 项目概述

### 一句话

**设计即产物** —— 设计过程不是"画图"，而是构建结构化 Schema。Schema 本身就是最终产品的源数据，可直接渲染为 React/Vue/Flutter 等任意前端代码。

### Monorepo 结构

```
monorepo-template/
├── apps/
│   ├── design_front          # React 前端（已有）
│   ├── design-api            # NestJS 后端（已有）
│   └── design-mcp            # MCP Server（AI 入口）
├── features/
│   ├── design-schema         # UI Schema 协议
│   ├── design-engine         # 双层渲染引擎
│   ├── design-operations     # 操作集合（核心逻辑）
│   └── design-codegen        # 跨平台代码生成
```

### 核心数据流

```
用户手动操作 / AI (Cursor/Claude Code via MCP)
       │
       ▼
  design-operations（执行 Operation）
       │
       ├─→ design-schema（更新 Schema）→ design-engine（重新渲染画布）
       │
       └─→ design-api（持久化 Operation Log）→ WebSocket 推送
```
