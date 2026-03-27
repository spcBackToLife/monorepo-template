# design-mcp — MCP Server

> AI 操控入口：将设计操作通过 MCP 协议暴露给一切 AI 工具。
>
> 相关文档：[操作集合 design-operations](./backend.md) | [前端架构](./frontend.md) | [Event Sourcing 存储](./event-sourcing.md)

---

## 核心理念

你的系统能力通过 MCP 协议暴露给一切 AI 工具，前期零成本获得 Cursor/Claude Code 的 AI 能力，后期自建 Client 无缝切换。

---

## MCP Server 实现

基于 `@modelcontextprotocol/sdk` 构建：

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

---

## MCP Server 与前端编辑器的实时同步

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

---

## 前期 vs 后期的 AI 策略

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

> **核心结论：** design-operations 不是扔掉，而是换一个"外壳"——从被前端直接调用的 SDK，变成被 MCP 协议包装的 Server。内核逻辑完全复用。MCP Server 是不变的基座，Client 可以随时换。
