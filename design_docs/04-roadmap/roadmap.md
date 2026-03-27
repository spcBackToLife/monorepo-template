# MVP 执行清单

> 按依赖关系排序，前后端任务分开，可并行的阶段明确标注。

相关文档：[整体架构](../03-tech/architecture.md) | [产品概述](../02-product/overview.md)

---

## Phase 总览


| Phase | 内容                 | 周期   | 端      | 核心产出                               | 实现状态 |
| ----- | ------------------ | ---- | ------ | ---------------------------------- | ---- |
| 0     | 工程脚手架              | 0.5d | 全栈     | 创建所有包、安装依赖、打通构建                    | 已完成  |
| 1     | Schema 协议          | 3d   | 全栈(共用) | `design-schema` SDK                | 未开始  |
| 2     | 操作集合               | 4d   | 全栈(共用) | `design-operations` SDK            | 已完成  |
| 3A    | 后端 API + DB        | 4d   | 后端     | `design-api` CRUD + Event Sourcing | 未开始  |
| 3B    | 渲染引擎               | 5d   | 前端     | `design-engine` SDK                | 已完成  |
| 4A    | 后端 WebSocket + MCP | 3d   | 后端     | WebSocket Gateway + `design-mcp`   | 未开始  |
| 4B    | 前端编辑器              | 7d   | 前端     | `design_front` 编辑器完整功能             | 已完成  |
| 5     | 联调 + 代码生成          | 5d   | 全栈     | 前后端联调 + `design-codegen` MVP       | 未开始  |


> Phase 3A/3B 可并行，Phase 4A/4B 可并行。总关键路径约 **24 天（~5 周）**。
>
> 状态枚举建议：`未开始` / `进行中` / `已完成` / `阻塞`

---

## Phase 0：工程脚手架（0.5d）

> 目标：所有包创建完毕，依赖关系正确，构建跑通。


| #   | 任务                              | 端   | 说明                                                              | 实现状态 |
| --- | ------------------------------- | --- | --------------------------------------------------------------- | ---- |
| 0.1 | `pnpm new` 创建 design-schema     | 全栈  | features/lib-sdk, browser                                       | 已完成  |
| 0.2 | `pnpm new` 创建 design-operations | 全栈  | features/lib-sdk, browser                                       | 已完成  |
| 0.3 | `pnpm new` 创建 design-engine     | 全栈  | features/ui-sdk                                                 | 已完成  |
| 0.4 | `pnpm new` 创建 design-codegen    | 全栈  | features/lib-sdk, node                                          | 已完成  |
| 0.5 | 手动创建 design-mcp                 | 全栈  | apps/ 下，安装 @modelcontextprotocol/sdk + zod                      | 已完成  |
| 0.6 | 配置包间依赖                          | 全栈  | schema←operations←engine, schema←codegen, schema+operations←mcp | 已完成  |
| 0.7 | 验证 `pnpm build` 全量构建通过          | 全栈  | 确保 tsup/vite 配置正确                                               | 已完成  |


→ 创建命令详见文末[脚手架命令](#脚手架命令)

---

## Phase 1：design-schema — 协议层（3d）

> 目标：所有类型定义导出，校验可用，视口预设完整。这是一切的地基。


| #    | 任务                              | 端   | 产出文件                         | 说明                                                                                      | 实现状态 |
| ---- | ------------------------------- | --- | ---------------------------- | --------------------------------------------------------------------------------------- | ---- |
| 1.1  | 定义 NodeType                     | 全栈  | `src/types/node.ts`          | 原子元素标签联合类型 + `component:${string}`                                                      | 未开始  |
| 1.2  | 定义 ComponentNode                | 全栈  | `src/types/node.ts`          | id, type, styles(CSSProperties), children, props, states, events, templateRef           | 未开始  |
| 1.3  | 定义 ComponentState               | 全栈  | `src/types/state.ts`         | name, styles 覆盖, props 覆盖                                                               | 未开始  |
| 1.4  | 定义 ComponentEvent + EventAction | 全栈  | `src/types/event.ts`         | trigger 枚举, navigate/setState/openUrl/custom 四种 action                                  | 未开始  |
| 1.5  | 定义 Screen                       | 全栈  | `src/types/screen.ts`        | id, name, rootNode, backgroundColor                                                     | 未开始  |
| 1.6  | 定义 Viewport                     | 全栈  | `src/types/viewport.ts`      | name, width, height, devicePixelRatio, platform                                         | 未开始  |
| 1.7  | 定义 ComponentTemplate            | 全栈  | `src/types/template.ts`      | id, name, category, tags, schema(ComponentNode), scope, thumbnail                       | 未开始  |
| 1.8  | 定义 DesignProject                | 全栈  | `src/types/project.ts`       | 顶层类型，聚合 screens + componentAssets + viewports                                           | 未开始  |
| 1.9  | 实现视口预设库                         | 全栈  | `src/presets/viewports.ts`   | iPhone SE/15/15Pro/16, Pixel 7/8, Samsung S24, iPad Mini/Pro, PC 1080p/1440p/4K 等 20+ 种 | 未开始  |
| 1.10 | 实现原子元素注册表                       | 全栈  | `src/registry/primitives.ts` | 每个标签的默认 styles + 允许的 props + 类别分组（布局/表单/文本/媒体）                                          | 未开始  |
| 1.11 | 实现 Schema 校验器                   | 全栈  | `src/validators/`            | validateNode(), validateScreen(), validateProject() — 用 zod 或手写                         | 未开始  |
| 1.12 | 实现组件资产工具函数                      | 全栈  | `src/assets/`                | instantiateTemplate(), saveAsTemplate(), detachInstance() — 纯函数，操作 ComponentNode 树      | 未开始  |
| 1.13 | 实现序列化工具                         | 全栈  | `src/serialization/`         | toJSON(), fromJSON(), deepClone() — Schema 对象 ↔ JSON                                    | 未开始  |
| 1.14 | 实现 ID 生成器                       | 全栈  | `src/utils/id.ts`            | generateNodeId() — nanoid 或 uuid，保证唯一                                                   | 未开始  |
| 1.15 | 统一 index.ts 导出                  | 全栈  | `src/index.ts`               | 导出所有类型 + 工具函数 + 预设                                                                      | 未开始  |


→ 设计详情：[design-schema](../03-tech/design-schema.md)

---

## Phase 2：design-operations — 操作层（4d）

> 目标：所有操作可执行、可撤销、可序列化，AI 能获取操作描述列表。


| #    | 任务                                            | 端   | 产出文件                          | 说明                                                               | 实现状态 |
| ---- | --------------------------------------------- | --- | ----------------------------- | ---------------------------------------------------------------- | ---- |
| 2.1  | 定义 Operation 基础接口                             | 全栈  | `src/types.ts`                | Operation { type, params, description } + OperationResult        | 已完成  |
| 2.2  | 实现不可变状态管理内核                                   | 全栈  | `src/executor/state.ts`       | 持有 DesignProject，每次 execute 返回新引用（immer 或手写 immutable）           | 已完成  |
| 2.3  | 实现 addElement 操作                              | 全栈  | `src/operations/element.ts`   | 在 parentId 下指定 position 插入新节点，自动生成 id                            | 已完成  |
| 2.4  | 实现 removeElement 操作                           | 全栈  | `src/operations/element.ts`   | 递归删除节点及其子节点                                                      | 已完成  |
| 2.5  | 实现 moveElement 操作                             | 全栈  | `src/operations/element.ts`   | 从旧 parent 移除 → 插入新 parent                                        | 已完成  |
| 2.6  | 实现 duplicateElement 操作                        | 全栈  | `src/operations/element.ts`   | 深拷贝子树 + 重新生成所有 id                                                | 已完成  |
| 2.7  | 实现 updateStyle 操作                             | 全栈  | `src/operations/style.ts`     | 合并 partial CSSProperties 到目标节点                                   | 已完成  |
| 2.8  | 实现 resetStyle 操作                              | 全栈  | `src/operations/style.ts`     | 删除指定 CSS 属性                                                      | 已完成  |
| 2.9  | 实现 addState / removeState / updateState       | 全栈  | `src/operations/state.ts`     | 增删改组件状态定义                                                        | 已完成  |
| 2.10 | 实现 setActiveState                             | 全栈  | `src/operations/state.ts`     | 切换当前激活状态                                                         | 已完成  |
| 2.11 | 实现 addEvent / removeEvent                     | 全栈  | `src/operations/event.ts`     | 增删交互事件                                                           | 已完成  |
| 2.12 | 实现 addNavigation                              | 全栈  | `src/operations/event.ts`     | 快捷操作：添加 click→navigate 事件，若 targetScreenId 为 "new" 则自动创建新 Screen | 已完成  |
| 2.13 | 实现 addScreen / removeScreen / setActiveScreen | 全栈  | `src/operations/screen.ts`    | 屏幕增删切换                                                           | 已完成  |
| 2.14 | 实现 switchViewport / addViewportPreset         | 全栈  | `src/operations/viewport.ts`  | 视口切换与预设管理                                                        | 已完成  |
| 2.15 | 实现 instantiateTemplate                        | 全栈  | `src/operations/asset.ts`     | 从资产库克隆子树到指定位置，设置 templateRef                                     | 已完成  |
| 2.16 | 实现 saveAsTemplate                             | 全栈  | `src/operations/asset.ts`     | 将节点子树提取为 ComponentTemplate 并加入 project.componentAssets           | 已完成  |
| 2.17 | 实现 detachInstance / syncInstance              | 全栈  | `src/operations/asset.ts`     | 引用→脱离，或重新同步到最新模板                                                 | 已完成  |
| 2.18 | 实现 Undo/Redo 栈                                | 全栈  | `src/executor/history.ts`     | 操作历史栈 + 反向操作生成（每个 op 需要记录 inverse）                               | 已完成  |
| 2.19 | 实现 OperationExecutor 主类                       | 全栈  | `src/executor/index.ts`       | execute(), executeBatch(), undo(), redo() — 调度所有操作               | 已完成  |
| 2.20 | 实现 getAvailableOperations()                   | 全栈  | `src/executor/description.ts` | 返回所有操作的 JSON Schema 描述（供 MCP 注册 Tools）                           | 已完成  |
| 2.21 | 树查找工具函数                                       | 全栈  | `src/utils/tree.ts`           | findNodeById(), findParent(), walkTree() — 递归遍历 ComponentNode 树  | 已完成  |


→ 设计详情：[design-operations](../03-tech/design-operations.md)

---

## Phase 3A：后端 API + DB（4d）⬅ 可与 3B 并行

> 目标：项目 CRUD + 操作持久化 + Event Sourcing 跑通。


| #     | 任务                                          | 端   | 产出文件                       | 说明                                                                         | 实现状态 |
| ----- | ------------------------------------------- | --- | -------------------------- | -------------------------------------------------------------------------- | ---- |
| 3A.1  | 创建数据库表                                      | 后端  | `migration/`               | design_projects, design_operations, design_snapshots, component_assets 四张表 | 未开始  |
| 3A.2  | 实现 Project Entity + Module                  | 后端  | `src/projects/`            | TypeORM Entity 对应 design_projects 表                                        | 未开始  |
| 3A.3  | 实现 POST /api/projects                       | 后端  | `projects.controller.ts`   | 创建项目（含初始视口、空 Screen），同时创建初始快照(V0)                                          | 未开始  |
| 3A.4  | 实现 GET /api/projects                        | 后端  | `projects.controller.ts`   | 项目列表（返回基本信息 + 缩略图）                                                         | 未开始  |
| 3A.5  | 实现 GET /api/projects/:id                    | 后端  | `projects.service.ts`      | **核心**：加载最近快照 + 重放操作日志 → 返回完整 Schema                                       | 未开始  |
| 3A.6  | 实现 DELETE /api/projects/:id                 | 后端  | `projects.controller.ts`   | 级联删除 operations + snapshots                                                | 未开始  |
| 3A.7  | 实现 Operation Entity + Module                | 后端  | `src/operations/`          | TypeORM Entity 对应 design_operations 表                                      | 未开始  |
| 3A.8  | 实现 POST /api/projects/:id/operations        | 后端  | `operations.controller.ts` | **核心**：接收 Operation JSON → 写入日志 → 更新 current_version → 触发快照检查              | 未开始  |
| 3A.9  | 实现 POST /api/projects/:id/operations/batch  | 后端  | `operations.controller.ts` | 批量写入（AI 一次可能产出多条操作）                                                        | 未开始  |
| 3A.10 | 实现 GET /api/projects/:id/operations?since=N | 后端  | `operations.controller.ts` | 增量拉取操作日志（WebSocket 断线重连用）                                                  | 未开始  |
| 3A.11 | 实现周期快照机制                                    | 后端  | `operations.service.ts`    | 每 100 次操作自动创建快照 → INSERT design_snapshots                                  | 未开始  |
| 3A.12 | 实现 POST /api/projects/:id/operations/undo   | 后端  | `operations.service.ts`    | 生成反向操作 → 写入日志 → 推送                                                         | 未开始  |
| 3A.13 | 实现 Asset Entity + Module                    | 后端  | `src/assets/`              | CRUD 四个接口 for component_assets 表                                           | 未开始  |
| 3A.14 | 实现 GET/POST/PUT/DELETE /api/assets          | 后端  | `assets.controller.ts`     | 组件资产管理，支持 scope 过滤                                                         | 未开始  |


→ 设计详情：[后端架构](../03-tech/backend.md) | [Event Sourcing](../03-tech/event-sourcing.md)

---

## Phase 3B：design-engine — 渲染引擎（5d）⬅ 可与 3A 并行

> 目标：给一个 Screen + Viewport，能渲染出真实 DOM + 可交互的编辑覆盖层。


| #     | 任务                            | 端   | 产出文件                                  | 说明                                                                                | 实现状态 |
| ----- | ----------------------------- | --- | ------------------------------------- | --------------------------------------------------------------------------------- | ---- |
| 3B.1  | 实现 ViewportContainer 组件       | 前端  | `src/viewport/ViewportContainer.tsx`  | 根据 Viewport 设置容器宽高，内容居中，支持缩放                                                      | 已完成  |
| 3B.2  | 实现原子元素渲染器                     | 前端  | `src/renderers/PrimitiveRenderer.tsx` | 将 type="div"/"button"/... 的节点渲染为对应真实 HTML 元素 + 应用 styles                          | 已完成  |
| 3B.3  | 实现 resolveStyles()            | 前端  | `src/styles/resolveStyles.ts`         | CSSProperties → React.CSSProperties 转换（处理单位、简写等）                                  | 已完成  |
| 3B.4  | 实现 resolveActiveState()       | 前端  | `src/styles/resolveState.ts`          | 合并 activeState 的样式覆盖到基础 styles                                                    | 已完成  |
| 3B.5  | 实现 resolveComponentInstance() | 前端  | `src/assets/resolveInstance.ts`       | 将 `component:XXX` 类型节点展开为完整子树（查找 template → 深拷贝）                                  | 已完成  |
| 3B.6  | 实现 SchemaRenderer 核心组件        | 前端  | `src/renderer/SchemaRenderer.tsx`     | **核心**：递归渲染 ComponentNode 树 → 调用 PrimitiveRenderer + resolveStyles + resolveState | 已完成  |
| 3B.7  | 给每个渲染节点注入 data-node-id 属性     | 前端  | SchemaRenderer 内                      | DOM 元素带 `data-node-id={node.id}`，供 Canvas 层坐标映射                                   | 已完成  |
| 3B.8  | 实现 Canvas 坐标映射系统              | 前端  | `src/overlay/coordinateMap.ts`        | 遍历 `[data-node-id]` 元素 → getBoundingClientRect → 建立 nodeId→Rect 映射                | 已完成  |
| 3B.9  | 实现 EditorOverlay Canvas 组件    | 前端  | `src/overlay/EditorOverlay.tsx`       | 透明 Canvas 覆盖层，绘制选区框、hover 高亮                                                      | 已完成  |
| 3B.10 | 实现选区交互                        | 前端  | `src/overlay/interactions/select.ts`  | 点击 Canvas → 坐标命中测试 → 找到对应 nodeId → 触发 onSelect                                    | 已完成  |
| 3B.11 | 实现 hover 高亮                   | 前端  | `src/overlay/interactions/hover.ts`   | mousemove → 命中测试 → 绘制蓝色边框                                                         | 已完成  |
| 3B.12 | 实现拖拽移动                        | 前端  | `src/overlay/interactions/drag.ts`    | mousedown+move → 绘制拖拽预览 → mouseup 触发 onDrag                                       | 已完成  |
| 3B.13 | 实现 resize 手柄                  | 前端  | `src/overlay/interactions/resize.ts`  | 选中节点显示 8 个 handle → 拖拽改变宽高                                                        | 已完成  |
| 3B.14 | 统一导出                          | 前端  | `src/index.ts`                        | 导出 SchemaRenderer, EditorOverlay, ViewportContainer                               | 已完成  |


→ 设计详情：[design-engine](../03-tech/design-engine.md)

---

## Phase 4A：后端 WebSocket + MCP Server（3d）⬅ 可与 4B 并行

> 目标：MCP Server 能被 Cursor 调用，操作能实时推送到前端。


| #     | 任务                   | 端   | 产出文件                              | 说明                                                                       | 实现状态 |
| ----- | -------------------- | --- | --------------------------------- | ------------------------------------------------------------------------ | ---- |
| 4A.1  | 实现 WebSocket Gateway | 后端  | `operations.gateway.ts`           | NestJS @WebSocketGateway，客户端按 projectId 订阅                               | 未开始  |
| 4A.2  | 操作写入后触发 WS 推送        | 后端  | `operations.service.ts`           | POST operation 成功后 → gateway.broadcast(projectId, operation)             | 未开始  |
| 4A.3  | 实现 MCP Server 入口     | 后端  | `apps/design-mcp/src/index.ts`    | McpServer 初始化 + StdioServerTransport                                     | 未开始  |
| 4A.4  | 注册查询类 Tools          | 后端  | `design-mcp/src/tools/query.ts`   | get_project_info, get_screen_schema, list_screens                        | 未开始  |
| 4A.5  | 注册元素操作 Tools         | 后端  | `design-mcp/src/tools/element.ts` | add_element, remove_element, move_element, duplicate_element             | 未开始  |
| 4A.6  | 注册样式操作 Tools         | 后端  | `design-mcp/src/tools/style.ts`   | update_style, reset_style                                                | 未开始  |
| 4A.7  | 注册状态/交互/屏幕/视口 Tools  | 后端  | `design-mcp/src/tools/misc.ts`    | add_state, set_active_state, add_navigation, add_screen, switch_viewport | 未开始  |
| 4A.8  | 注册资产操作 Tools         | 后端  | `design-mcp/src/tools/asset.ts`   | instantiate_template, save_as_template, get_available_assets             | 未开始  |
| 4A.9  | 注册 undo/redo Tools   | 后端  | `design-mcp/src/tools/history.ts` | undo, redo                                                               | 未开始  |
| 4A.10 | MCP→API 通信层          | 后端  | `design-mcp/src/api-client.ts`    | 封装对 design-api REST 接口的 HTTP 调用                                          | 未开始  |
| 4A.11 | 注册 Resources         | 后端  | `design-mcp/src/resources/`       | schema://project/{id}, schema://screen/{id}/{screenId}, assets://list    | 未开始  |
| 4A.12 | Cursor 连接测试          | 后端  | `.cursor/mcp.json`                | 配置 Cursor MCP，验证能调用 Tools 并看到画布变化                                        | 未开始  |


→ 设计详情：[MCP Server](../03-tech/design-mcp.md)

---

## Phase 4B：前端编辑器整合（7d）⬅ 可与 4A 并行

> 目标：完整可用的编辑器——首页、画布、操作面板、WebSocket 同步。


| #                | 任务                  | 端   | 产出文件                                   | 说明                                                                   | 实现状态 |
| ---------------- | ------------------- | --- | -------------------------------------- | -------------------------------------------------------------------- | ---- |
| **首页**           |                     |     |                                        |                                                                      |      |
| 4B.1             | 实现 project.store.ts | 前端  | `stores/project.store.ts`              | MobX store：项目列表、当前项目、CRUD 方法                                         | 已完成  |
| 4B.2             | 实现首页视图              | 前端  | `views/home/index.tsx`                 | 项目卡片列表（缩略图+名称+时间）+ 新建按钮                                              | 已完成  |
| 4B.3             | 实现新建弹窗              | 前端  | `views/home/CreateModal.tsx`           | 选择平台(PC/Mobile) → 选择设备(预设列表) → 确认创建                                  | 已完成  |
| **编辑器框架**        |                     |     |                                        |                                                                      |      |
| 4B.4             | 实现 editor.store.ts  | 前端  | `stores/editor.store.ts`               | 当前 Screen、选中 nodeId、hoveredNodeId、当前 Viewport                        | 已完成  |
| 4B.5             | 实现编辑器主布局            | 前端  | `views/editor/index.tsx`               | 顶部工具栏 + 左侧画布 + 右侧操作面板的 flex 布局                                       | 已完成  |
| 4B.6             | 实现视口切换工具栏           | 前端  | `views/editor/Toolbar.tsx`             | 设备下拉选择 + 自定义尺寸输入 + 快速切换按钮                                            | 已完成  |
| **画布**           |                     |     |                                        |                                                                      |      |
| 4B.7             | 集成画布组件              | 前端  | `views/editor/Canvas.tsx`              | ViewportContainer + SchemaRenderer + EditorOverlay 三层组合              | 已完成  |
| 4B.8             | 画布选中→操作面板联动         | 前端  | Canvas + editor.store                  | 点击节点 → store 更新 selectedNodeId → 操作面板刷新                              | 已完成  |
| **操作面板**         |                     |     |                                        |                                                                      |      |
| 4B.9             | 操作面板框架              | 前端  | `views/editor/OperationPanel.tsx`      | Tab 布局：元素添加 / 样式编辑 / 交互设置 / 状态管理                                     | 已完成  |
| 4B.10            | 元素添加面板              | 前端  | `views/editor/panels/AddElement.tsx`   | 左列：原子元素网格（div/button/img/...），右列：组件资产列表（三级折叠）                        | 已完成  |
| 4B.11            | 样式编辑面板              | 前端  | `views/editor/panels/StyleEditor.tsx`  | 选中节点 → 展示/编辑 CSS 属性（分组：布局/尺寸/颜色/字体/边框）                               | 已完成  |
| 4B.12            | 交互设置面板              | 前端  | `views/editor/panels/EventEditor.tsx`  | 事件列表 + 添加事件（trigger 选择 + action 配置：跳转/状态切换/打开链接）                     | 已完成  |
| 4B.13            | 状态管理面板              | 前端  | `views/editor/panels/StateEditor.tsx`  | 状态列表 + 添加状态 + 切换预览 + 编辑各状态样式差异                                       | 已完成  |
| 4B.14            | 组件资产保存功能            | 前端  | `views/editor/panels/SaveTemplate.tsx` | 右键/按钮 → 将选中节点保存为组件资产（输入名称、分类）                                        | 已完成  |
| **WebSocket 同步** |                     |     |                                        |                                                                      |      |
| 4B.15            | 实现 sync.store.ts    | 前端  | `stores/sync.store.ts`                 | WebSocket 连接管理 + 断线重连 + 增量拉取                                         | 已完成  |
| 4B.16            | 实现 ws.ts 服务         | 前端  | `services/ws.ts`                       | WebSocket 封装：connect(projectId), onOperation(callback), disconnect() | 已完成  |
| 4B.17            | WS 消息→画布刷新          | 前端  | sync.store.ts                          | 收到 operation → OperationExecutor.execute() → MobX 触发画布重新渲染           | 已完成  |
| **屏幕管理**         |                     |     |                                        |                                                                      |      |
| 4B.18            | 屏幕列表/切换             | 前端  | `views/editor/ScreenList.tsx`          | 左侧或底部的屏幕缩略图列表，点击切换当前 Screen                                          | 已完成  |
| 4B.19            | 添加导航跳转时自动创建 Screen  | 前端  | EventEditor 内                          | addNavigation 到 "new" → 自动执行 addScreen → 跳转到新 Screen                 | 已完成  |


→ 设计详情：[前端架构](../03-tech/frontend.md) | [编辑器产品设计](../02-product/editor.md) | [组件资产](../02-product/component-assets.md)

---

## Phase 5：联调 + 代码生成（5d）

> 目标：前后端完整跑通 + Cursor MCP 可操控 + React 代码导出。


| #        | 任务                      | 端   | 说明                                                           | 实现状态 |
| -------- | ----------------------- | --- | ------------------------------------------------------------ | ---- |
| **联调**   |                         |     |                                                              |      |
| 5.1      | 前端↔后端 REST 联调           | 全栈  | 项目 CRUD + 操作提交 + 操作历史拉取                                      | 未开始  |
| 5.2      | WebSocket 联调            | 全栈  | 操作提交 → WS 推送 → 画布刷新                                          | 未开始  |
| 5.3      | MCP↔API↔前端 全链路测试        | 全栈  | Cursor 调用 MCP Tool → API 持久化 → WS 推送 → 画布更新                  | 未开始  |
| 5.4      | Undo/Redo 全链路           | 全栈  | 前端撤销/MCP 撤销 → API 记录反向操作 → 画布回退                              | 未开始  |
| **代码生成** |                         |     |                                                              |      |
| 5.5      | 实现 CodegenPlugin 接口     | 全栈  | `design-codegen/src/types.ts`                                | 未开始  |
| 5.6      | 实现 CodegenManager       | 全栈  | `design-codegen/src/manager.ts` — 插件注册 + generate() 调度       | 未开始  |
| 5.7      | 实现 React 代码生成插件         | 全栈  | `design-codegen/src/plugins/react.ts` — 组件映射 + 样式翻译 + JSX 生成 | 未开始  |
| 5.8      | 实现后端导出接口                | 后端  | POST `/api/projects/:id/export/:target`                      | 未开始  |
| 5.9      | 实现 MCP export_code Tool | 后端  | design-mcp 注册 export_code                                    | 未开始  |
| 5.10     | 前端导出按钮                  | 前端  | 编辑器工具栏 → 选择目标平台 → 下载 zip                                     | 未开始  |


→ 设计详情：[design-codegen](../03-tech/design-codegen.md)

---

## 依赖关系图

```
Phase 0 (脚手架)
    │
    ▼
Phase 1 (schema)
    │
    ▼
Phase 2 (operations)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3A (后端API)   Phase 3B (渲染引擎)    ← 可并行
    │                  │
    ├──────────────────┤
    ▼                  ▼
Phase 4A (WS+MCP)   Phase 4B (前端编辑器)   ← 可并行
    │                  │
    └──────────────────┘
              │
              ▼
        Phase 5 (联调+codegen)
```

---

## 脚手架命令

```bash
cd monorepo-template

# 1. design-schema
pnpm new  # → features → lib-sdk → design-schema → browser

# 2. design-operations
pnpm new  # → features → lib-sdk → design-operations → browser

# 3. design-engine
pnpm new  # → features → ui-sdk → design-engine

# 4. design-codegen
pnpm new  # → features → lib-sdk → design-codegen → node

# 5. design-mcp (手动)
mkdir -p apps/design-mcp/src
cat > apps/design-mcp/package.json << 'EOF'
{
  "name": "@globallink/design-mcp",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup src/index.ts --format cjs --dts",
    "dev": "tsup src/index.ts --format cjs --watch",
    "start": "node dist/index.js"
  }
}
EOF
cd apps/design-mcp
pnpm add @modelcontextprotocol/sdk zod
pnpm add -D typescript tsup @types/node
cd ../..

# 6. 安装依赖
pnpm install

# 7. 验证构建
pnpm build
```

