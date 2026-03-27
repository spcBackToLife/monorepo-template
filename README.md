# DesignUI Monorepo

AI 驱动的可视化设计工具 — 通过 MCP 协议让 Cursor / Claude Code 直接操控设计画布。

## 项目结构

```
apps/
├── design_front        ← React 前端编辑器 (Vite + MobX + Ant Design)
├── design-api          ← NestJS 后端 (REST + WebSocket + PostgreSQL)
└── design-mcp          ← MCP Server (供 Cursor/Claude Code 调用)

features/
├── design-schema       ← Schema 协议 (类型定义 + 校验 + 预设)
├── design-operations   ← 操作集合 (21 种设计操作 + undo/redo)
├── design-engine       ← 渲染引擎 (双层: React DOM + Canvas)
└── design-codegen      ← 代码生成 (Schema → React/Vue/Flutter)
```

## 前置条件

- **Node.js** ≥ 18
- **pnpm** ≥ 10
- **PostgreSQL** ≥ 14（运行中，且已创建 `design_db` 数据库）

```bash
# 创建数据库（如果还没有）
psql -U root -c "CREATE DATABASE design_db;"
```

## 快速启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建 features 包（必须先构建，后端和前端依赖它们）

```bash
# 构建所有 features（design-schema → design-operations → design-engine → design-codegen）
pnpm -r --filter './features/*' run build
```

> 开发时可用 watch 模式：`pnpm dev:features`，修改 features 代码后自动重新构建。

### 3. 配置后端环境变量

```bash
cp apps/design-api/.env.example apps/design-api/.env
# 或直接编辑 apps/design-api/.env：
```

```env
DATABASE_URL=postgresql://root:yourpassword@127.0.0.1:5432/design_db
PORT=3001
HOST=0.0.0.0
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

> 数据库表会在后端启动时自动创建（`ensureSchema`），无需手动执行 migration。

### 4. 启动后端

```bash
pnpm dev:api
# 或
pnpm --filter '@globallink/design-api' dev
```

后端运行在 `http://localhost:3001`，启动后会自动创建以下数据库表：
- `users` — 用户认证
- `design_projects` — 设计项目
- `design_operations` — 操作日志 (Event Sourcing)
- `design_snapshots` — 周期快照 (每 100 次操作)
- `component_assets` — 组件资产库

### 5. 启动前端

```bash
pnpm --filter '@globallink/design_front' dev
```

前端运行在 `http://localhost:5174`。

### 6. 构建 MCP Server

```bash
pnpm --filter '@globallink/design-mcp' build
```

## 完整开发流程（三终端）

```bash
# 终端 1 — features watch 模式（修改 SDK 自动重构建）
pnpm dev:features

# 终端 2 — 后端 (NestJS watch 模式)
pnpm dev:api

# 终端 3 — 前端 (Vite HMR)
pnpm --filter '@globallink/design_front' dev
```

## MCP Server — AI 操控设计画布

MCP Server 让 Cursor / Claude Code 通过 MCP 协议直接操作设计稿。

### 配置 Cursor

项目已包含 `.cursor/mcp.json`，Cursor 打开项目后会自动识别。
确保后端正在运行（`pnpm dev:api`），然后 Cursor 即可调用以下 Tools：

| Tool | 说明 |
|------|------|
| `get_project_info` | 获取项目基本信息 |
| `get_screen_schema` | 获取屏幕完整 Schema |
| `list_screens` | 列出所有屏幕 |
| `add_element` | 添加 HTML 元素 |
| `remove_element` | 删除元素 |
| `move_element` | 移动元素 |
| `duplicate_element` | 复制元素 |
| `update_style` | 修改 CSS 样式 |
| `reset_style` | 重置样式 |
| `add_state` | 添加组件状态 |
| `set_active_state` | 切换状态 |
| `add_navigation` | 添加页面跳转 |
| `add_screen` | 新建屏幕 |
| `switch_viewport` | 切换设备视口 |
| `instantiate_template` | 实例化组件模板 |
| `save_as_template` | 保存为模板 |
| `get_available_assets` | 查看资产列表 |
| `undo` | 撤销操作 |

### 手动测试 MCP

```bash
# 确保已构建
pnpm --filter '@globallink/design-mcp' build

# 直接运行（stdio 模式）
DESIGN_API_URL=http://localhost:3001 node apps/design-mcp/dist/index.js
```

## 数据流架构

```
Cursor / Claude Code
       │ MCP Tool Call
       ▼
   design-mcp (stdio)
       │ HTTP REST
       ▼
   design-api (NestJS)
       │
       ├── 写入 DB (PostgreSQL)
       │
       └── WebSocket 广播 ──→ design_front (画布自动刷新)
```

## API 一览

### 项目

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects` | 项目列表 |
| GET | `/api/projects/:id` | 项目详情（快照+重放恢复） |
| DELETE | `/api/projects/:id` | 删除项目 |

### 操作 (Event Sourcing)

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/projects/:id/operations` | 执行操作 |
| POST | `/api/projects/:id/operations/batch` | 批量执行 |
| GET | `/api/projects/:id/operations?since=N` | 增量拉取 |
| POST | `/api/projects/:id/operations/undo` | 撤销 |

### 组件资产

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/assets` | 资产列表 |
| POST | `/api/assets` | 创建资产 |
| PUT | `/api/assets/:id` | 更新资产 |
| DELETE | `/api/assets/:id` | 删除资产 |

### WebSocket

连接 `ws://localhost:3001/ws`，发送 `subscribe` 事件加入项目房间：

```javascript
socket.emit('subscribe', { projectId: 'xxx' });
socket.on('operation', (data) => { /* 收到操作推送 */ });
socket.on('undo', (data) => { /* 收到撤销推送 */ });
```

## 常用命令

```bash
# 全量构建（所有包）
pnpm build

# 单独构建某个包
pnpm --filter '@globallink/design-schema' build
pnpm --filter '@globallink/design-operations' build
pnpm --filter '@globallink/design-api' build
pnpm --filter '@globallink/design-mcp' build
pnpm --filter '@globallink/design_front' build

# 类型检查
pnpm --filter '@globallink/design-api' typecheck
pnpm --filter '@globallink/design-mcp' typecheck

# Lint
pnpm --filter '@globallink/design-schema' lint

# 快速验证后端 API
curl -X POST http://localhost:3001/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"My App","platform":"mobile"}'

curl http://localhost:3001/api/projects
```
