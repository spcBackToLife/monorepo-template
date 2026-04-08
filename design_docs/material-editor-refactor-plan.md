# 素材编辑器架构改造方案 v2

> 基于第一性原理，参照设计编辑器的成熟模式，对素材编辑器进行前后端全栈改造
> **v2 核心变化：前端去掉 Fabric.js，与设计编辑器同构 — Schema → SVG/DOM 自研渲染**

---

## 一、第一性原理分析

### 1.1 设计编辑器的核心设计（参照标杆）

设计编辑器有一套**极其成熟**的数据架构：

| 层 | 职责 | 技术实现 |
|----|------|----------|
| **数据模型** | `DesignProject` — 纯 JSON Schema（节点树 + 样式 + 状态 + 事件） | `@globallink/design-schema` |
| **操作系统** | 60+ 种 Operation 类型，每个 Op 产生 InverseData 用于 undo | `@globallink/design-operations` |
| **执行器** | `OperationExecutor` — 纯函数式，输入 (Project, Op) → 输出 (NewProject, Result, Inverse) | executor/index.ts |
| **历史管理** | `HistoryManager` — undo/redo 双栈，最多 200 条 | executor/history.ts |
| **前端渲染** | `SchemaRenderer` — 递归遍历节点树 → React DOM（无第三方渲染库） | design-engine |
| **交互覆盖层** | `EditorOverlay` — 选中框/拖拽/缩放/对齐线（独立于渲染层） | design-engine/overlay |
| **后端持久化** | 操作日志表 `design_operations` + 快照表 `design_snapshots` | operations.service.ts |
| **恢复机制** | 快照 + 重放：找到最新快照，重放后续操作日志 → 完整状态 | projects.service.ts `findOne()` |
| **自动快照** | 每 100 次操作自动创建一个快照 | `maybeSnapshot()` |
| **WS 广播** | 后端执行操作后广播 → 前端接收后同步更新 UI | operations.gateway.ts |
| **MCP 入口** | MCP → REST API → 后端执行 → 写日志+广播 | api-client.ts |

**关键洞察1：MCP 不依赖前端！** 整个路径是：
```
MCP工具 → REST API → 后端 OperationExecutor 直接操作数据 → 写入DB → WS广播 → 前端同步渲染
```

**关键洞察2：前端不依赖任何第三方渲染库！** 渲染路径是：
```
Schema 节点树 → SchemaRenderer (React) → 递归生成真实 DOM → PrimitiveRenderer 映射 HTML 标签
EditorOverlay → 选中/拖拽/缩放/对齐 → 独立的 SVG/DOM 覆盖层
```

### 1.2 素材编辑器的当前设计（问题所在）

| 层 | 现状 | 问题 |
|----|------|------|
| **数据模型** | Fabric.js Canvas JSON — 第三方不透明格式 | ❌ 后端无法解析和操作 |
| **操作系统** | 无！只有 action 名称字符串的路由 | ❌ 没有类型化的 Operation |
| **执行器** | 无！操作完全在前端 Fabric.js 中执行 | ❌ 后端无法执行操作 |
| **前端渲染** | Fabric.js Canvas 2D — 2747 行重度依赖 | ❌ 黑盒渲染，无法与 Schema 同步 |
| **历史管理** | `HistoryManager` 基于 Canvas JSON 快照 | ⚠️ 粗粒度，不支持操作级 undo |
| **后端持久化** | 只有 `material_projects` 表存储整个 canvasJSON | ❌ 没有操作日志 |
| **恢复机制** | 无快照+重放，只有整体覆盖写入 | ❌ 没有版本历史 |
| **自动保存** | 无！只有用户手动触发 | ❌ 随时可能丢数据 |
| **WS 广播** | 后端只做操作转发 | ❌ MCP 完全依赖前端在线 |

### 1.3 为什么要去掉 Fabric.js（v2 核心决策）

1. **数据模型不统一**：Fabric.js 有自己的序列化格式，与我们的 Schema 是两套东西。保留 Fabric.js 就需要维护 Schema ↔ Fabric JSON 的双向转换器，这是永远补不完的坑。
2. **设计编辑器已经证明了自研可行**：`SchemaRenderer` + `EditorOverlay` + `PrimitiveRenderer` 完全自研，无第三方渲染库，效果优秀。
3. **素材编辑器的渲染需求是 SVG + DOM**：矩形、椭圆、多边形、路径、文字、图片 — 这些全部可以用 SVG 渲染，比 Canvas 2D 更适合编辑器场景（天然支持 DOM 事件、CSS 样式、无损缩放）。
4. **一致的架构 = 更低的维护成本**：两个编辑器用完全相同的架构模式，减少团队认知负担。

---

## 二、改造方案

### 2.1 设计原则

1. **后端为数据唯一真相来源** — 所有写操作先在后端执行，再广播给前端
2. **操作日志 + 快照** — 与设计编辑器同构的持久化模式
3. **MCP 不依赖前端** — 前端不在线时 MCP 也能正常操作
4. **前端去掉 Fabric.js** — 自研 SVG 渲染器，与设计编辑器同构
5. **渐进式迁移** — 先建新系统跑通，再逐步替换旧代码

### 2.2 新数据模型：MaterialProjectSchema

```typescript
// features/material-operations/src/schema.ts

/** 渐变定义 */
interface GradientDef {
  type: 'linear' | 'radial' | 'conic';
  angle?: number;          // linear: 角度
  stops: { color: string; offset: number }[];
  // radial
  cx?: number; cy?: number; r?: number;
}

/** 阴影定义 */
interface ShadowDef {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

/** 素材对象（画布上的一个图形） */
interface MaterialObject {
  id: string;
  type: 'rect' | 'ellipse' | 'polygon' | 'star' | 'path' | 'line' | 'textbox' | 'image' | 'group';
  name: string;

  // 变换（统一用 transform 模型）
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;       // 度数
  scaleX: number;
  scaleY: number;

  // 样式
  fill: string | GradientDef | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  blendMode: string;

  // 形状特定属性
  rx?: number; ry?: number;           // rect 圆角
  sides?: number;                      // polygon
  points?: number;                     // star
  innerRatio?: number;                 // star
  pathData?: string;                   // SVG path d
  x1?: number; y1?: number;           // line
  x2?: number; y2?: number;

  // 文字
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;

  // 图片
  src?: string;

  // 控制
  visible: boolean;
  locked: boolean;

  // 组
  children?: MaterialObject[];
  clipPath?: { type: string; [key: string]: unknown };

  // 滤镜
  filters?: { type: string; value: string; enabled: boolean }[];

  // 阴影
  shadow?: ShadowDef | null;
}

/** 素材工程 Schema */
interface MaterialProjectSchema {
  id: string;
  projectId: string;
  name: string;

  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;

  // 参考框
  referenceFrame: {
    enabled: boolean;
    width: number;
    height: number;
  };

  // 对象列表（有序，索引 = 图层顺序）
  objects: MaterialObject[];

  // 版本
  version: number;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 操作系统：MaterialOperation（~20 种）

与设计编辑器 `Operation` 完全同构的模式：每个操作都有类型、参数、反向数据。

```typescript
// 画布操作
type: 'me:setBackgroundColor' | 'me:resizeCanvas' | 'me:resizeReferenceFrame'
// 对象 CRUD
type: 'me:addObject' | 'me:removeObject' | 'me:updateObject' | 'me:duplicateObject'
// 图层
type: 'me:reorderObject' | 'me:setVisibility' | 'me:setLock' | 'me:renameObject'
// 样式
type: 'me:setFill' | 'me:setStroke' | 'me:setOpacity' | 'me:setShadow' | 'me:setBlendMode'
// 组
type: 'me:groupObjects' | 'me:ungroupObjects'
// 文字
type: 'me:updateText'
// 布尔（标记式，前端执行几何运算后回报结果路径）
type: 'me:booleanOp'
```

### 2.4 前端渲染：SVG MaterialRenderer（类比 SchemaRenderer）

```
设计编辑器：
  SchemaRenderer → 递归 ComponentNode 树 → PrimitiveRenderer → HTML DOM

素材编辑器（改造后）：
  MaterialRenderer → 遍历 MaterialObject[] → MaterialObjectRenderer → SVG 元素
  MaterialEditorOverlay → 选中框/拖拽/缩放/旋转/对齐线 → SVG 覆盖层
```

SVG 渲染的优势：
- **矢量图形天然适合 SVG**：rect/ellipse/polygon/path 直接对应 SVG 标签
- **无损缩放**：编辑器缩放时无需 Canvas 重绘
- **DOM 事件**：每个图形都是真实 DOM 节点，天然支持点击/hover/拖拽
- **CSS 样式**：渐变/阴影/滤镜/混合模式直接用 CSS/SVG 属性
- **与设计编辑器架构统一**：都是 Schema → React DOM/SVG

### 2.5 新的数据流

```
MCP/用户操作 → REST/WS → MaterialOperationsService.execute()
  → MaterialOperationExecutor 执行操作
  → 写入 material_operations 操作日志
  → 更新 version + maybeSnapshot
  → WS 广播 me:operation
  → 前端 MaterialRenderer 重新渲染 SVG
```

---

## 三、数据库设计

（与 v1 相同，此处不重复）

---

## 四、实现路径

### Phase 1: 核心数据层 (`features/material-operations/`)

**目标：** 建立 `@globallink/material-operations` 包

| Step | 文件 | 内容 |
|------|------|------|
| 1.1 | `src/schema.ts` | MaterialObject, MaterialProjectSchema, GradientDef, ShadowDef |
| 1.2 | `src/types.ts` | 所有 MaterialOperation 类型、InverseData、OperationResult |
| 1.3 | `src/utils.ts` | deepClone, generateObjectId, findObjectById |
| 1.4 | `src/operations/object.ts` | addObject, removeObject, updateObject, duplicateObject |
| 1.5 | `src/operations/canvas.ts` | setBackgroundColor, resizeCanvas, resizeReferenceFrame |
| 1.6 | `src/operations/layer.ts` | reorderObject, setVisibility, setLock, renameObject |
| 1.7 | `src/operations/style.ts` | setFill, setStroke, setOpacity, setShadow, setBlendMode |
| 1.8 | `src/operations/group.ts` | groupObjects, ungroupObjects |
| 1.9 | `src/operations/text.ts` | updateText |
| 1.10 | `src/executor/history.ts` | HistoryManager (复用 design-operations 同结构) |
| 1.11 | `src/executor/index.ts` | MaterialOperationExecutor — dispatch + undo/redo |
| 1.12 | `src/index.ts` + `package.json` | 统一导出 |

### Phase 2: 后端服务层（`apps/design-api/`）

在已有的 `material-editor.service.ts` / `material-editor.gateway.ts` / `material-editor.controller.ts` 上改造（增量迭代，不新建重复文件）。

| Step | 改造点 |
|------|--------|
| 2.1 | `material-editor.service.ts` — 从「广播转发」改为「执行+持久化+广播」 |
| 2.2 | `material-editor.gateway.ts` — 新增 `me:operation` 广播，移除 `me:save-snapshot` |
| 2.3 | `material-editor.controller.ts` — 新增 `/operations` 和 `/operations/batch` 端点 |
| 2.4 | `materials.module.ts` — 注册新依赖 |

### Phase 3: MCP 工具层（`apps/design-mcp/`）

在已有文件上改造。

| Step | 改造点 |
|------|--------|
| 3.1 | `api-client.ts` — 新增 `executeMaterialOperation()`, `getMaterialProject()` |
| 3.2 | `material-tools.ts` — 所有 `me_*` 工具走操作系统 |
| 3.3 | `material-resources.ts` — Resource 返回 MaterialProjectSchema |

### Phase 4: 前端渲染层（替换 Fabric.js）

新建 `features/material-engine/`（类比 `features/design-engine/`），然后改造前端页面。

| Step | 文件 | 内容 |
|------|------|------|
| 4.1 | `material-engine/src/renderer/MaterialRenderer.tsx` | Schema → SVG 渲染器 |
| 4.2 | `material-engine/src/renderer/ObjectRenderer.tsx` | 单个对象 → SVG 元素 |
| 4.3 | `material-engine/src/overlay/MaterialOverlay.tsx` | 选中/拖拽/缩放/旋转 |
| 4.4 | `material-engine/src/overlay/SmartGuides.tsx` | 对齐线 |
| 4.5 | 改造 `CanvasEditor.tsx` | 替换 Fabric.js 画布为 MaterialRenderer + Overlay |
| 4.6 | 改造 `MaterialEditorSyncManager.ts` | 接收 `me:operation` 事件 → 操作 Schema → 触发重渲染 |

---

## 五、改造前后对比

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| 渲染引擎 | Fabric.js (Canvas 2D, 2747行) | 自研 SVG MaterialRenderer (~500行) |
| 数据模型 | Fabric.js Canvas JSON (不透明) | MaterialProjectSchema (结构化) |
| 数据真相来源 | 前端 Fabric.js | 后端 Schema |
| MCP 依赖前端 | ✅ 必须依赖 | ❌ 完全独立 |
| 操作持久化 | ❌ 无 | ✅ 操作日志 + 快照 |
| 自动保存 | ❌ 手动 | ✅ 每次操作自动持久化 |
| Undo/Redo | Canvas JSON 快照 | 操作级 InverseData |
| 第三方依赖 | fabric (~200KB) | 无 |
| 架构一致性 | 与设计编辑器完全不同 | 与设计编辑器完全同构 |

---

## 六、风险与对策

| 风险 | 对策 |
|------|------|
| SVG 渲染性能（大量对象时） | 虚拟化：只渲染视口内的对象；分层：静态对象用 CSS will-change 提示 |
| 布尔运算需要真实几何计算 | 后端标记操作意图；前端用 paper.js 执行几何运算后回报结果路径 |
| 用户拖拽操作频率高 | 拖拽过程只更新本地视图；mouseUp 时才发送 updateObject 操作 |
| 钢笔工具的贝塞尔曲线交互 | SVG path 天然支持贝塞尔；控制手柄用 SVG circle + line |
| 文字编辑需要内联编辑 | 与设计编辑器的 TextInlineEditor 同模式：SVG 定位 + HTML contenteditable overlay |

建议按 Phase 1 → 2 → 3 → 4 顺序实施。Phase 1-3 完成后 MCP 即可独立工作。

---

## 七、实施进度

### ✅ Phase 1: 操作系统包（已完成）

`features/material-operations/` 创建完成，TypeScript 编译通过。

- `src/schema.ts` — MaterialProjectSchema, MaterialObject, 工厂函数
- `src/types.ts` — 20 种 MaterialOperation 类型定义
- `src/utils.ts` — deepClone, generateObjectId, findObjectById 等
- `src/operations/canvas.ts` — setBackgroundColor, resizeCanvas, resizeReferenceFrame
- `src/operations/object.ts` — addObject, removeObject, updateObject, duplicateObject
- `src/operations/layer.ts` — reorderObject, setVisibility, setLock, renameObject
- `src/operations/style.ts` — setFill, setStroke, setOpacity, setShadow, setBlendMode
- `src/operations/group.ts` — groupObjects, ungroupObjects
- `src/operations/text.ts` — updateText
- `src/executor/history.ts` — HistoryManager (undo/redo 双栈)
- `src/executor/state.ts` — MaterialProjectState (不可变状态持有器)
- `src/executor/index.ts` — MaterialOperationExecutor (dispatch + undo/redo + snapshot)
- `src/index.ts` + `package.json` — 统一导出

### ✅ Phase 2: 后端服务层（已完成）

在已有文件上增量改造完成。

- `material-editor.service.ts` — 从「广播转发」改为「执行+持久化+广播」
  - `execute()` — 单条操作：Executor 执行 → 写日志 → 更新版本 → 快照检查 → WS 广播
  - `executeBatch()` — 事务批量执行
  - `undo()` / `redo()` — undo/redo 双栈操作 + 快照记录
  - `findSince()` — 增量拉取操作日志
  - `getSchema()` — 快照+重放恢复
  - `rebuildSchema()` — 从快照+操作日志重建完整 Schema
  - `maybeSnapshot()` — 每50次操作自动快照
  
- `material-editor.gateway.ts` — 全面改造
  - 新增 `broadcastOperation()` — 广播类型化操作 (替代旧 `broadcastAction()`)
  - 新增 `broadcastUndo()` — 广播 undo/redo 事件
  - 新增 `me:operation` WS handler — 前端操作也经后端 Executor 执行
  - 新增 `me:batch` WS handler — 前端批量操作
  - 新增 `me:handshake` — 断线重连重放
  - 移除旧的 `me:action` 纯广播转发
  - 移除旧的 `me:save-snapshot` 前端回传机制

- `material-editor.controller.ts` — 与 OperationsController 同构
  - `POST .../operations` — 单条操作
  - `POST .../operations/batch` — 批量操作
  - `GET .../operations` — 增量拉取
  - `POST .../operations/undo` — 撤销
  - `POST .../operations/redo` — 重做
  - `GET .../schema` — 完整 Schema

- `materials.module.ts` — 新增 MaterialEditorService 导出

### ✅ Phase 3: MCP 工具层（已完成）

- `api-client.ts` — 新增 v2 API 方法
  - `executeMaterialOperation()` — 执行单条操作
  - `executeMaterialBatch()` — 批量执行
  - `getMaterialOperationsSince()` — 增量拉取
  - `materialUndo()` / `materialRedo()` — 撤销/重做
  - `getMaterialSchema()` — 获取完整 Schema

- `material-tools.ts` — 全面重构
  - 所有画布操作改为发送类型化 `MaterialOperation`
  - 每个操作需要 `materialId` 参数（不再隐式依赖前端选中状态）
  - 新增 `me_get_schema` 工具
  - undo/redo 调用后端 API
  - 纯 CSS 计算工具保持不变
  - 工具数量从 55 个精简为 ~30 个（去掉冗余工具）

### ✅ Phase 4: 前端渲染层（已完成）

`features/material-engine/` 核心实现完成，TypeScript 编译通过。

- `src/context/MaterialEditorContext.tsx` — 编辑器核心上下文
  - `MaterialEditorProvider` — Schema 状态 + Executor 实例 + 操作分发
  - `useMaterialEditor()` — Hook 访问编辑器状态和操作
  - 管理：选中对象、hover、工具、缩放、平移、undo/redo 状态
  - `onOperation` / `onBatch` / `onUndoRedo` 回调（用于同步到后端）

- `src/renderer/MaterialRenderer.tsx` — SVG 渲染器（核心组件）
  - Schema.objects[] → SVG 元素（类比 SchemaRenderer）
  - 画布背景 + 参考框 + 对象层
  - 点击选中 / Shift 多选 / 空白取消选中

- `src/renderer/ObjectRenderer.tsx` — 单个对象 → SVG 元素
  - rect → `<rect>`, ellipse → `<ellipse>`, polygon/star → `<polygon>`
  - path → `<path>`, line → `<line>`, textbox → `<foreignObject>`
  - image → `<image>`, group → 递归 `<g>`
  - 支持渐变填充、阴影 filter、CSS 滤镜、混合模式

- `src/renderer/GradientDefs.tsx` — SVG 渐变定义
- `src/renderer/ShadowDefs.tsx` — SVG 阴影 filter 定义
- `src/renderer/svg-utils.ts` — SVG 渲染工具函数
  - 变换计算、填充解析、多边形/星形点计算、包围盒

- `src/overlay/SelectionOverlay.tsx` — 交互覆盖层
  - 选中框（蓝色边框 + 8 个缩放手柄 + 旋转手柄）
  - hover 提示框（蓝色虚线）
  - 拖拽移动、手柄缩放

- `src/overlay/SmartGuides.tsx` — 智能对齐线
  - 边缘对齐、中心对齐、画布中心对齐
  - 自动去重、可配置吸附阈值

- `src/MaterialEditorCanvas.tsx` — 完整编辑器画布
  - 组合 MaterialRenderer + SelectionOverlay + SmartGuides
  - 滚轮缩放、空格+拖拽平移、hand 工具平移

- `src/hooks/useMaterialSync.ts` — WS 同步 Hook
  - 接收 `me:operation` → Executor.execute() → SVG 自动重渲染
  - 断线重连 handshake 重放
  - Echo dedup 防止回显

- `src/hooks/useMaterialKeyboard.ts` — 键盘快捷键 Hook
  - ⌘Z/⌘⇧Z undo/redo, Delete 删除, ⌘D 复制
  - ⌘A 全选, ⌘G 编组, ⌘+/- 缩放
  - V/H/R/O/P/S/L/B/T/I 工具快捷键

- `src/index.tsx` + `package.json` — 统一导出

### ✅ 数据库迁移（已完成）

在 `database.service.ts` 中增量完成：

- `material_design_projects` 表添加 `current_version` 和 `latest_snapshot` 字段（幂等 ALTER）
- 创建 `material_operations` 操作日志表（与 `design_operations` 同构）
  - 外键关联 `design_projects` 和 `material_design_projects`
  - `(material_id, seq)` 唯一约束
  - 索引：`material_id+seq`、`project_id`
- 创建 `material_snapshots` 快照表（与 `design_snapshots` 同构）
  - 外键关联 `design_projects` 和 `material_design_projects`
  - 索引：`material_id+version`
- 修复 `MaterialEditorService` 中所有 SQL 查询的表名（`material_projects` → `material_design_projects`）
- 导出 `MaterialOperationRow` 接口供 controller 使用

### ✅ 前端集成改造（已完成）

- `CanvasEditor.tsx` — 从 Fabric.js 切换到 SVG MaterialEditorCanvas
  - 使用 `MaterialEditorProvider` + `MaterialEditorCanvas` + WS 同步架构
  - `CanvasToolbar` — 工具切换、填充/描边、缩放、撤销/重做、导出 SVG
  - `SyncedCanvas` — WS 操作同步 + undo/redo Schema 刷新
  - 回调签名匹配 Context 接口（`onOperation`/`onBatch`/`onUndoRedo` 含 result 参数）
  - 接口名称修正：`execute` 替代 `dispatch`、`state.tool` 替代 `activeTool`、`initialProject` 替代 `initialSchema`

- `MaterialEditorSyncManager.ts` — v2 操作系统同步管理器
  - 接收 `me:operation` WS 事件 → 通知 Context execute
  - 接收 `me:undo` WS 事件 → 触发 Schema 重新加载
  - Echo dedup — 跳过自己发出的操作
  - 断线重连增量重放（handshake + lastSeq）
  - 全局单例模式

- 依赖注册
  - `@globallink/material-engine` → design_front package.json
  - `@globallink/material-operations` → design_front package.json + design-api package.json

---

## 八、编译验证

| 模块 | 状态 |
|------|------|
| `@globallink/material-operations` | ✅ tsc --noEmit 通过 |
| `@globallink/material-engine` | ✅ tsc --noEmit 通过 |
| `apps/design-api` | ✅ tsc --noEmit 通过 |
| `apps/design-mcp` | ✅ tsc --noEmit 通过 |
| `apps/design_front` (相关文件) | ✅ 零 lint 错误，无相关 tsc 错误 |
