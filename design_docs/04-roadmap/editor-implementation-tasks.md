# 编辑器改造 — 实现任务清单

> **来源：** 产品方案 `02-product/editor/`（11 个子系统）+ 技术方案 `03-tech/editor/`（11 个模块）
>
> **现状：** 7 个包均有基础实现（~12,000 行代码），23 个 Operation、渲染引擎、Canvas 交互、MobX Store、REST API、WebSocket、MCP Tools 已就绪。
>
> 相关文档：[技术总纲](../03-tech/editor/README.md) | [产品总纲](../02-product/editor/README.md) | [原 MVP 排期](./roadmap.md)

---

## 第一性原理：任务拆解逻辑

```
一切修改必须经过 Operation → 每个功能都遵循固定链路：

  ① Schema 类型先行（定义数据形状）
  ② Operation 实现（定义状态转换 + 逆操作）
  ③ Engine 渲染/交互（可视化 + 坐标计算）
  ④ Frontend UI（用户触发 Operation 的入口）
  ⑤ Backend API（持久化 + 广播）
  ⑥ MCP Tools（AI 入口，与人类共享同一套 Operation）

任务粒度：每个任务可独立 git commit（不超过 200-300 行改动）。
```

---

## 总览

| Phase | 任务数 | 周期 | 核心交付 |
|-------|-------|------|---------|
| Phase 1 | 50 | 3 周 | 基础编辑：4 区布局、画布交互、样式面板、组件树、页面管理 |
| Phase 2 | 27 | 2 周 | 三层状态 + 组件 Props：全局状态、状态叠加渲染、StatesTab、PropsTab |
| Phase 3 | 28 | 2 周 | 数据驱动：数据集、表达式解析、列表渲染、DataTab、后端 API、MCP |
| Phase 4 | 33 | 3 周 | 高级编辑：预览模式、事件引擎、交互面板、组件库、截图生成 |
| Phase 5 | 17 | 2 周 | 协作同步：OperationEnvelope、回声去重、断线重连、保存指示器 |
| **总计** | **155** | **12 周** | **155/155** |

> **状态枚举：** `未开始` / `进行中` / `已完成` / `阻塞`

---

## Phase 1：基础编辑（3 周）

> **目标：** 能用鼠标创建、选择、移动、调整、删除元素，4 区布局框架可用，基本属性编辑、组件树、页面管理就绪。

### 1.1 Schema 扩展 — 基础字段

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 1.1.1 | ComponentNode 新增 `locked` 和 `visible` 字段 | design-schema | `src/types/node.ts` | 两个 boolean，默认 `locked: false`, `visible: true`；更新 types/index.ts | 已完成 |
| 1.1.2 | PrimitiveNodeType 新增 `'annotation'` | design-schema | `src/types/node.ts` | 联合类型追加一项 | 已完成 |
| 1.1.3 | 更新 Zod 校验器适配新字段 | design-schema | `src/validators/index.ts` | ComponentNode schema 追加 locked/visible；NodeType 追加 annotation | 已完成 |
| 1.1.4 | 更新 primitives 注册表追加 annotation | design-schema | `src/registry/primitives.ts` | 添加 annotation 的默认 styles + 类别 | 已完成 |

### 1.2 Operations 扩展 — 元素操作

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 1.2.1 | 定义新 Operation 类型接口 | design-operations | `src/types.ts` | WrapInContainerOp, UnwrapContainerOp, ReorderElementOp, BatchUpdateStyleOp, ChangeElementTypeOp + 更新 Operation 联合类型 | 已完成 |
| 1.2.2 | 实现 `wrapInContainer` 操作 | design-operations | `src/operations/element.ts` | 创建 container → 将 nodeIds 移入；inverse: unwrap | 已完成 |
| 1.2.3 | 实现 `unwrapContainer` 操作 | design-operations | `src/operations/element.ts` | 子节点提升到 container 的父级 → 删除 container；inverse: wrap | 已完成 |
| 1.2.4 | 实现 `reorderElement` 操作 | design-operations | `src/operations/element.ts` | parentId.children 中移动到 newIndex；inverse: 原始 index | 已完成 |
| 1.2.5 | 实现 `batchUpdateStyle` 操作 | design-operations | `src/operations/style.ts` | 遍历 updates 数组批量 merge；inverse: 保存原始 styles | 已完成 |
| 1.2.6 | 实现 `changeElementType` 操作 | design-operations | `src/operations/element.ts` | 修改 node.type 保留 children/styles；inverse: 恢复原 type | 已完成 |
| 1.2.7 | 实现 `reorderScreen` 操作 | design-operations | `src/operations/screen.ts` | 移动 screen 到 newIndex；inverse: 恢复原位 | 已完成 |
| 1.2.8 | 注册新操作到 OperationExecutor | design-operations | `src/executor.ts` | handler map 注册 7 个新操作 | 已完成 |
| 1.2.9 | 更新 getAvailableOperations 描述 | design-operations | 描述文件 | 为新操作添加 AI 可读描述 | 已完成 |

### 1.3 Engine — 画布交互增强

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 1.3.1 | CanvasViewState 接口 + 4 套坐标转换 | design-engine | `src/overlay/coordinateMap.ts` | CanvasViewState { zoom, panX, panY, containerRect }；screenToCanvas, canvasToScreen, canvasToViewport, viewportToParent | 已完成 |
| 1.3.2 | 实现 BoundingBoxCache 类 | design-engine | `src/overlay/BoundingBoxCache.ts` 🆕 | update/get/invalidate；基于 ResizeObserver 自动更新 | 已完成 |
| 1.3.3 | 提取 hitTest 为独立模块 | design-engine | `src/overlay/hitTest.ts` 🆕 | hitTest(point, cache, zoom) + hitTestResizeHandle；locked/visible 过滤 | 已完成 |
| 1.3.4 | 实现对齐线算法 | design-engine | `src/overlay/alignment.ts` 🆕 | computeAlignmentGuides：left/center/right × top/center/bottom 6 方向 | 已完成 |
| 1.3.5 | 实现吸附算法 | design-engine | `src/overlay/snapping.ts` 🆕 | computeSnap：对齐线吸附 > 栅格吸附 > 无吸附 | 已完成 |
| 1.3.6 | drag 交互集成对齐线 + 吸附 | design-engine | `src/overlay/interactions/drag.ts` | 拖拽中调用 alignment + snap | 已完成 |
| 1.3.7 | resize 交互集成对齐线 + 吸附 | design-engine | `src/overlay/interactions/resize.ts` | resize 中调用 alignment + snap | 已完成 |
| 1.3.8 | EditorOverlay 绘制对齐线 | design-engine | `src/overlay/EditorOverlay.tsx` | Canvas 上绘制红色对齐虚线 | 已完成 |

### 1.4 Frontend — 布局框架

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 1.4.1 | EditorStore 扩展 UI 状态 | design_front | `src/stores/editor.store.ts` | activeTool, previewMode, panelWidths, panelCollapsed, activeRightTab | 已完成 |
| 1.4.2 | EditorLayout 4 区 CSS Grid | design_front | `src/views/editor/EditorLayout.tsx` 🆕 | 顶 48px + 左可调 + 中 flex:1 + 右可调；替换现有布局 | 已完成 |
| 1.4.3 | PanelResizer 拖拽调整宽度 | design_front | `src/views/editor/panels/PanelResizer.tsx` 🆕 | 竖向拖拽条，min/max 约束，双击折叠 | 已完成 |
| 1.4.4 | TopToolbar 组件 | design_front | `src/views/editor/TopToolbar.tsx` 🆕 | 4 区：项目信息 / Undo Redo / 视口+缩放 / 导出预览 | 已完成 |
| 1.4.5 | BottomToolbar 浮动胶囊 | design_front | `src/views/editor/BottomToolbar.tsx` 🆕 | 底部居中，8 工具 3 分组，点击切换 activeTool | 已完成 |
| 1.4.6 | BottomToolbar 下拉子菜单 | design_front | `src/views/editor/BottomToolbar.tsx` | Container/Element/Text 子类型 dropdown | 已完成 |
| 1.4.7 | LeftPanel 框架（上下分隔） | design_front | `src/views/editor/panels/LeftPanel.tsx` 🆕 | 上：组件树，下：页面列表，中间可拖拽分隔条 | 已完成 |

### 1.5 Frontend — 画布组件

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 1.5.1 | ToolStateMachine | design_front | `src/views/editor/canvas/ToolStateMachine.ts` 🆕 | activate/activateTemporary/deactivateTemporary/lock/autoReturn | 已完成 |
| 1.5.2 | useZoomPan hook | design_front | `src/views/editor/hooks/useZoomPan.ts` 🆕 | Cmd+滚轮缩放（光标中心）、Space+拖拽平移、10%-400% | 已完成 |
| 1.5.3 | useKeyboardShortcuts hook | design_front | `src/views/editor/hooks/useKeyboardShortcuts.ts` 🆕 | V/F/R/T/C/A/H 切换、Cmd+Z/Shift+Z、Delete、Cmd+C/V/X/D/P/S；输入框豁免 | 已完成 |
| 1.5.4 | useCanvasInteractions hook | design_front | `src/views/editor/hooks/useCanvasInteractions.ts` 🆕 | 按 activeTool 分发：select→选中/拖拽、draw→绘制创建、hand→平移 | 已完成 |
| 1.5.5 | ContextMenu 右键菜单 | design_front | `src/views/editor/canvas/ContextMenu.tsx` 🆕 | 元素菜单 + 空白菜单 | 已完成 |
| 1.5.6 | CanvasContainer 集成 | design_front | `src/views/editor/canvas/CanvasContainer.tsx` 🆕 | 整合 Viewport + Renderer + Overlay + hooks | 已完成 |

### 1.6 Frontend — 面板 MVP

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 1.6.1 | PropertyPanel 框架 + Tab 切换 | design_front | `src/views/editor/panels/PropertyPanel.tsx` 🆕 | 元素信息条 + 5 Tab（先只实现 Styles） | 已完成 |
| 1.6.2 | NumericInput 控件 | design_front | `src/views/editor/controls/NumericInput.tsx` 🆕 | 拖拽调整、单位选择器（px/rem/%）、Shift×10 | 已完成 |
| 1.6.3 | ColorPicker 控件 | design_front | `src/views/editor/controls/ColorPicker.tsx` 🆕 | hex/rgb 输入、透明度滑块、最近颜色 | 已完成 |
| 1.6.4 | StylesTab — Layout 折叠组 | design_front | `src/views/editor/panels/tabs/StylesTab.tsx` 🆕 | display, flexDirection, flexWrap, justifyContent, alignItems, gap | 已完成 |
| 1.6.5 | StylesTab — Size 折叠组 | design_front | StylesTab.tsx | width, height, min/max, overflow | 已完成 |
| 1.6.6 | StylesTab — Spacing + BoxModel | design_front | StylesTab.tsx + `controls/BoxModelEditor.tsx` 🆕 | margin/padding 四方向 + 交互式盒模型可视化 | 已完成 |
| 1.6.7 | StylesTab — Position 折叠组 | design_front | StylesTab.tsx | position, top/right/bottom/left, zIndex | 已完成 |
| 1.6.8 | StylesTab — Background 折叠组 | design_front | StylesTab.tsx | backgroundColor, backgroundImage, backgroundSize | 已完成 |
| 1.6.9 | StylesTab — Border 折叠组 | design_front | StylesTab.tsx | borderWidth/Style/Color, borderRadius（4 角联动/独立） | 已完成 |
| 1.6.10 | StylesTab — Typography 折叠组 | design_front | StylesTab.tsx | fontFamily, fontSize, fontWeight, lineHeight, color, textAlign | 已完成 |
| 1.6.11 | StylesTab — Effects 折叠组 | design_front | StylesTab.tsx | opacity, boxShadow, transform, transition, cursor | 已完成 |
| 1.6.12 | NodeTree 基础版 | design_front | `src/views/editor/panels/NodeTree.tsx` 🆕 | 递归树、选中联动画布、折叠展开、类型图标、inline 重命名 | 已完成 |
| 1.6.13 | NodeTree 拖拽排序 | design_front | NodeTree.tsx | 3 放置区域（上方/内部/下方），悬停自动展开 | 已完成 |
| 1.6.14 | NodeTree 虚拟滚动 | design_front | NodeTree.tsx | react-window，扁平化树数组 | 已完成 |
| 1.6.15 | NodeTree 搜索过滤 | design_front | NodeTree.tsx | 搜索框，过滤时保留路径祖先 | 已完成 |
| 1.6.16 | NodeTree lock/visible 按钮 | design_front | NodeTree.tsx | 锁定/可见性图标按钮，调用 Operation | 已完成 |
| 1.6.17 | PageList 组件 | design_front | `src/views/editor/panels/PageList.tsx` 🆕 | 缩略图 64×48 + CRUD + 拖拽排序 + 活跃页高亮 | 已完成 |

### 1.7 Frontend — 编辑器整合

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 1.7.1 | 重构 editor/index.tsx 使用新布局 | design_front | `src/views/editor/index.tsx` | 替换为 EditorLayout + 所有新组件 | 已完成 |
| 1.7.2 | 多选支持 | design_front | editor.store + Canvas | selectedNodeIds: string[]，Shift+点击追加，batchUpdateStyle | 已完成 |

**Phase 1 小计：50 个任务**

---

## Phase 2：状态 + 属性（2 周）

> **目标：** 三层状态系统可用（交互/业务/全局），组件 Props 标准化，StatesTab + PropsTab 完成。

### 2.1 Schema 扩展 — 状态 + Props 类型

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 2.1.1 | 定义 GlobalStateVariable + GlobalStateBinding | design-schema | `src/types/state.ts` | GlobalStateVariable { name, values[], defaultValue }; GlobalStateBinding { id, variableName, value, styles?, props?, visible? } | 已完成 |
| 2.1.2 | ComponentNode 新增 `globalStateBindings` | design-schema | `src/types/node.ts` | `globalStateBindings: GlobalStateBinding[]` 默认 [] | 已完成 |
| 2.1.3 | Screen 新增 `globalStates` | design-schema | `src/types/screen.ts` | `globalStates: GlobalStateVariable[]` 默认 [] | 已完成 |
| 2.1.4 | 定义 PropType + ComponentPropDefinition + PropBinding | design-schema | `src/types/props.ts` 🆕 | PropType 10 种；ComponentPropDefinition { key, type, label, defaultValue, ... }；PropBinding { propKey, targetNodePath, targetField, targetKey } | 已完成 |
| 2.1.5 | ComponentTemplate 新增 kind/propDefinitions/propBindings/version | design-schema | `src/types/template.ts` | kind: 'skeleton'\|'styled'；版本号；Props 定义和绑定 | 已完成 |
| 2.1.6 | ElementPropRegistry 注册表 | design-schema | `src/registry/element-props.ts` 🆕 | 每个 HTML 元素的可编辑 props（img→src/alt，input→placeholder/type 等） | 已完成 |
| 2.1.7 | Zod 校验器：state + props | design-schema | `src/validators/props.ts` 🆕 | GlobalStateVariable, GlobalStateBinding, ComponentPropDefinition, PropBinding | 已完成 |
| 2.1.8 | 更新 index.ts re-export | design-schema | `src/index.ts` + `src/types/index.ts` | 导出所有新类型 | 已完成 |

### 2.2 Operations 扩展 — 全局状态 + Props

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 2.2.1 | 定义全局状态 + Props Operation 类型 | design-operations | `src/types.ts` | 9 个新 Op 接口 + 更新联合类型 | 已完成 |
| 2.2.2 | 实现 `addGlobalStateVariable` | design-operations | `src/operations/global-state.ts` 🆕 | screen.globalStates 追加；inverse: remove | 已完成 |
| 2.2.3 | 实现 `removeGlobalStateVariable` | design-operations | global-state.ts | 删除；inverse: restore | 已完成 |
| 2.2.4 | 实现 `setGlobalState` | design-operations | global-state.ts | 修改当前值；inverse: 恢复旧值 | 已完成 |
| 2.2.5 | 实现 `addGlobalStateBinding` | design-operations | global-state.ts | node.globalStateBindings 追加；inverse: remove | 已完成 |
| 2.2.6 | 实现 `removeGlobalStateBinding` | design-operations | global-state.ts | 删除绑定；inverse: restore | 已完成 |
| 2.2.7 | 实现 `updateGlobalStateBinding` | design-operations | global-state.ts | 更新绑定 styles/props/visible；inverse: 恢复 | 已完成 |
| 2.2.8 | 实现 `updateComponentProps` | design-operations | `src/operations/component-props.ts` 🆕 | 更新 node.props；inverse: 恢复 | 已完成 |
| 2.2.9 | 实现 `addPropDefinition` | design-operations | component-props.ts | template.propDefinitions 追加；inverse: remove | 已完成 |
| 2.2.10 | 实现 `removePropDefinition` | design-operations | component-props.ts | 删除；inverse: restore | 已完成 |
| 2.2.11 | 注册 9 个新操作到 Executor | design-operations | `src/executor.ts` | handler 注册 | 已完成 |

### 2.3 Engine — 4 层渲染叠加

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 2.3.1 | resolveStyles 扩展为 4 层叠加 | design-engine | `src/styles/resolveStyles.ts` | base → globalBinding → activeState → interaction 四层 merge | 已完成 |
| 2.3.2 | 实现 resolveProps 4 层叠加 | design-engine | `src/styles/resolveProps.ts` 🆕 | 与 styles 同构逻辑，含 visible 判断 | 已完成 |
| 2.3.3 | SchemaRenderer 集成 visible 判断 | design-engine | `src/renderer/SchemaRenderer.tsx` | visible === false 时跳过 | 已完成 |
| 2.3.4 | SchemaRenderer 集成 4 层 props | design-engine | SchemaRenderer.tsx | 用 resolveProps 替代直接 node.props | 已完成 |

### 2.4 Frontend — StatesTab + PropsTab

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 2.4.1 | EditorStore 扩展全局状态运行时 | design_front | editor.store.ts | currentGlobalStates: Record<string, string> | 已完成 |
| 2.4.2 | StatesTab — 交互状态层 | design_front | `src/views/editor/panels/tabs/StatesTab.tsx` 🆕 | hover/active/focus/disabled 切换预览 | 已完成 |
| 2.4.3 | StatesTab — 业务状态层 | design_front | StatesTab.tsx | 自定义状态 CRUD，StylesTab 联动 override | 已完成 |
| 2.4.4 | StatesTab — 全局状态绑定层 | design_front | StatesTab.tsx | globalStateBindings CRUD | 已完成 |
| 2.4.5 | 全局状态变量管理 UI | design_front | TopToolbar 或独立组件 | screen.globalStates 的 CRUD | 已完成 |
| 2.4.6 | PropsTab — HTML 属性编辑 | design_front | `src/views/editor/panels/tabs/PropsTab.tsx` 🆕 | 根据 ElementPropRegistry 渲染属性控件 | 已完成 |
| 2.4.7 | PropsTab — 组件 Props 编辑 | design_front | PropsTab.tsx | component:XXX 实例的 propDefinitions 渲染 | 已完成 |
| 2.4.8 | PropertyPanel 启用 States + Props Tab | design_front | PropertyPanel.tsx | 接入 + 蓝点徽标 | 已完成 |

**Phase 2 小计：27 个任务**

---

## Phase 3：数据驱动（2 周）

> **目标：** 数据集管理，`{{data.xxx}}` 表达式解析，列表渲染，DataTab，后端 API + MCP。

### 3.1 Schema 扩展 — 数据类型

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 3.1.1 | 定义 DataSet 类型 | design-schema | `src/types/data.ts` 🆕 | { id, name, data: Record<string, unknown>, description? } | 已完成 |
| 3.1.2 | Screen 新增 dataSets + activeDataSetId | design-schema | `src/types/screen.ts` | 默认 [], '' | 已完成 |
| 3.1.3 | Zod 校验器 DataSet | design-schema | `src/validators/data.ts` 🆕 | DataSet + Screen 扩展 | 已完成 |
| 3.1.4 | 更新 re-export | design-schema | `src/index.ts` | 导出 DataSet | 已完成 |

### 3.2 Operations 扩展 — 数据操作

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 3.2.1 | 定义数据 Operation 类型 | design-operations | `src/types.ts` | AddDataSetOp, RemoveDataSetOp, UpdateDataSetOp, SwitchDataSetOp, BindDataOp | 已完成 |
| 3.2.2 | 实现 `addDataSet` | design-operations | `src/operations/data.ts` 🆕 | screen.dataSets 追加；inverse: remove | 已完成 |
| 3.2.3 | 实现 `removeDataSet` | design-operations | data.ts | 删除；inverse: restore | 已完成 |
| 3.2.4 | 实现 `updateDataSet` | design-operations | data.ts | 更新 data 内容；inverse: 恢复原内容 | 已完成 |
| 3.2.5 | 实现 `switchDataSet` | design-operations | data.ts | 修改 activeDataSetId；inverse: 恢复 | 已完成 |
| 3.2.6 | 实现 `bindData` | design-operations | data.ts | node.props[key] = `{{data.xxx}}`；inverse: 恢复 | 已完成 |
| 3.2.7 | 注册 5 个数据操作到 Executor | design-operations | `src/executor.ts` | handler 注册 | 已完成 |

### 3.3 Engine — 表达式解析 + 列表渲染

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 3.3.1 | resolveExpression 表达式解析器 | design-engine | `src/data/resolveExpression.ts` 🆕 | 解析 `{{data.user.name}}`/`{{item.x}}`/`{{index}}`/默认值语法 | 已完成 |
| 3.3.2 | DataContext React Context | design-engine | `src/data/DataContext.tsx` 🆕 | { data, item?, index?, parent? } + Provider + useDataContext | 已完成 |
| 3.3.3 | ListRenderer 列表渲染组件 | design-engine | `src/data/ListRenderer.tsx` 🆕 | `__listData` → 数组 → 模板 + readonly 预览（最多 3） | 已完成 |
| 3.3.4 | SchemaRenderer 集成表达式解析 | design-engine | SchemaRenderer.tsx | `{{...}}` → resolveExpression → PrimitiveRenderer | 已完成 |
| 3.3.5 | SchemaRenderer 集成列表渲染 | design-engine | SchemaRenderer.tsx | listData 节点 → 委托 ListRenderer | 已完成 |
| 3.3.6 | SchemaRenderer 注入 DataContext | design-engine | SchemaRenderer.tsx | 顶层 DataContext.Provider + 活跃数据集 | 已完成 |

### 3.4 Frontend — DataTab

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 3.4.1 | DataTab — 数据集选择器 + CRUD | design_front | `src/views/editor/panels/tabs/DataTab.tsx` 🆕 | 下拉选择 + 新增/删除/重命名 | 已完成 |
| 3.4.2 | DataTab — JSON 编辑器 | design_front | DataTab.tsx | JSON 编辑（monaco 或 textarea + 语法高亮） | 已完成 |
| 3.4.3 | DataTab — 可视化树编辑器 | design_front | DataTab.tsx | 树形展示 JSON，叶节点可编辑 | 已完成 |
| 3.4.4 | DataTab — 数据绑定面板 | design_front | DataTab.tsx | prop → `{{data.xxx}}` 表达式 + 路径自动补全 | 已完成 |
| 3.4.5 | DataTab — 全局状态变量管理 | design_front | DataTab.tsx | screen.globalStates CRUD | 已完成 |
| 3.4.6 | ExpressionInput 控件 | design_front | `src/views/editor/controls/ExpressionInput.tsx` 🆕 | 自动补全表达式输入框 | 已完成 |
| 3.4.7 | PropsTab 集成数据绑定切换 | design_front | PropsTab.tsx | 🔗 图标切换为表达式模式 | 已完成 |
| 3.4.8 | PropertyPanel 启用 DataTab | design_front | PropertyPanel.tsx | 接入 + 蓝点 | 已完成 |

### 3.5 Backend — 数据集 API

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 3.5.1 | 创建 datasets module | design-api | `src/modules/datasets/datasets.module.ts` 🆕 | NestJS module 注册 | 已完成 |
| 3.5.2 | DatasetsController (CRUD + activate) | design-api | `src/modules/datasets/datasets.controller.ts` 🆕 | 5 个端点 | 已完成 |
| 3.5.3 | DatasetsService | design-api | `src/modules/datasets/datasets.service.ts` 🆕 | 通过 Operation 持久化 | 已完成 |
| 3.5.4 | Asset 文件上传端点 | design-api | `src/modules/assets/assets.controller.ts` | multipart + 类型/大小校验 + 本地存储 + asset:// URL | 已完成 |
| 3.5.5 | 文件存储服务 | design-api | `src/modules/assets/storage.service.ts` 🆕 | 抽象存储层（本地/S3）+ 缩略图 | 已完成 |

### 3.6 MCP — 数据集 Tools

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 3.6.1 | dataset MCP Tools | design-mcp | `src/tools/dataset-tools.ts` 🆕 | list/switch/update/add/bind_data | 已完成 |
| 3.6.2 | dataset MCP Resources | design-mcp | `src/resources/dataset-resources.ts` 🆕 | datasets://{projectId}/{screenId} | 已完成 |
| 3.6.3 | 扩展 api-client | design-mcp | `src/api-client.ts` | dataset API 调用方法 | 已完成 |

**Phase 3 小计：28 个任务**

---

## Phase 4：高级编辑（3 周）

> **目标：** 预览模式、事件执行引擎、交互面板、组件库、截图生成。

### 4.1 Schema 扩展 — 事件 V2

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 4.1.1 | ComponentEventV2 + 新 Action 类型 | design-schema | `src/types/event.ts` | ComponentEventV2 { trigger, actions[], condition? }；SetGlobalStateAction, ToggleVisibleAction | 已完成 |
| 4.1.2 | Zod 校验器 EventV2 | design-schema | `src/validators/index.ts` | ComponentEventV2 schema | 已完成 |
| 4.1.3 | ComponentTemplate 新增 kind + version | design-schema | `src/types/template.ts` | kind: 'skeleton'\|'styled'；version: number | 已完成 |

### 4.2 Operations — 模板 + 标注

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 4.2.1 | 定义模板 + 标注 Operation 类型 | design-operations | `src/types.ts` | UpdateTemplate, DeleteTemplate, DuplicateTemplate, AddAnnotation, RemoveAnnotation | 已完成 |
| 4.2.2 | 实现 `updateTemplate` | design-operations | `src/operations/template.ts` | 更新字段；inverse: 恢复 | 已完成 |
| 4.2.3 | 实现 `deleteTemplate` | design-operations | template.ts | 从 componentAssets 删除；inverse: restore | 已完成 |
| 4.2.4 | 实现 `duplicateTemplate` | design-operations | template.ts | 深拷贝 + 新 ID；inverse: delete | 已完成 |
| 4.2.5 | 实现 `addAnnotation` | design-operations | `src/operations/annotation.ts` 🆕 | 创建 type='annotation' 节点；inverse: remove | 已完成 |
| 4.2.6 | 实现 `removeAnnotation` | design-operations | annotation.ts | 删除；inverse: restore | 已完成 |
| 4.2.7 | 注册 5 个新操作到 Executor | design-operations | `src/executor.ts` | handler 注册 | 已完成 |

### 4.3 Engine — 预览模式

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 4.3.1 | PreviewRenderer | design-engine | `src/preview/PreviewRenderer.tsx` 🆕 | pointer-events:auto，无 Overlay，深灰背景 | 已完成 |
| 4.3.2 | EventExecutionEngine 核心 | design-engine | `src/preview/EventExecutionEngine.ts` 🆕 | 绑定 DOM 事件 → actions[] 逐个执行 | 已完成 |
| 4.3.3 | EventExecution — navigate | design-engine | EventExecutionEngine.ts | 页面跳转 + 6 种转场动画 300ms | 已完成 |
| 4.3.4 | EventExecution — setState/setGlobalState/toggleVisible | design-engine | EventExecutionEngine.ts | 状态变更 | 已完成 |
| 4.3.5 | CSSPseudoInjector | design-engine | `src/preview/CSSPseudoInjector.ts` 🆕 | 交互状态 → :hover/:active/:focus CSS → `<style>` 注入 | 已完成 |
| 4.3.6 | NavigationStack | design-engine | `src/preview/NavigationStack.ts` 🆕 | 页面跳转历史 + 后退 + 转场状态 | 已完成 |

### 4.4 Engine — 画布高级覆盖层

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 4.4.1 | marquee 选区框交互 | design-engine | `src/overlay/interactions/marquee.ts` 🆕 | 拖拽选区 → 选中区域内节点 | 已完成 |
| 4.4.2 | draw 绘制工具交互 | design-engine | `src/overlay/interactions/draw.ts` 🆕 | 拖拽绘制预览矩形 → 创建元素 | 已完成 |
| 4.4.3 | EditorOverlay 栅格绘制 | design-engine | EditorOverlay.tsx | 高缩放下像素栅格 | 已完成 |
| 4.4.4 | 对齐线等距检测 | design-engine | `src/overlay/alignment.ts` | 3+ 元素等间距 + 距离标注 | 已完成 |

### 4.5 Frontend — 交互面板 + 组件库

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 4.5.1 | InteractionsTab — 事件卡片列表 | design_front | `src/views/editor/panels/tabs/InteractionsTab.tsx` 🆕 | trigger 徽标 + action 摘要 | 已完成 |
| 4.5.2 | InteractionsTab — 添加事件流程 | design_front | InteractionsTab.tsx | trigger → action 类型 → 针对性配置 | 已完成 |
| 4.5.3 | InteractionsTab — 元素选择器 | design_front | InteractionsTab.tsx | 树视图 + 画布点选 | 已完成 |
| 4.5.4 | PropertyPanel 启用 InteractionsTab | design_front | PropertyPanel.tsx | 接入 + 蓝点 | 已完成 |
| 4.5.5 | ComponentLibrary 浮动面板 | design_front | `src/views/editor/panels/ComponentLibrary.tsx` 🆕 | 搜索 + 分类 + 网格卡片 + 缩略图 | 已完成 |
| 4.5.6 | ComponentLibrary 拖拽实例化 | design_front | ComponentLibrary + Canvas | 拖拽到画布 → instantiateTemplate | 已完成 |
| 4.5.7 | 预览模式入口 + 退出 | design_front | TopToolbar + EditorLayout | Cmd+P → previewMode → PreviewRenderer | 已完成 |
| 4.5.8 | 预览控制条 | design_front | `src/views/editor/PreviewBar.tsx` 🆕 | [■ 退出] + 页名 + [← 返回] + 状态/数据集切换 | 已完成 |

### 4.6 Backend — 截图

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 4.6.1 | snapshots module | design-api | `src/modules/snapshots/snapshots.module.ts` 🆕 | NestJS module | 已完成 |
| 4.6.2 | 截图生成控制器 | design-api | `src/modules/snapshots/snapshots.controller.ts` 🆕 | POST generate, GET status, GET download | 已完成 |
| 4.6.3 | Puppeteer 截图 worker | design-api | `src/modules/snapshots/snapshots.worker.ts` 🆕 | screen × dataset × state × viewport 矩阵 | 已完成 |
| 4.6.4 | SnapshotsService | design-api | `src/modules/snapshots/snapshots.service.ts` 🆕 | 任务管理 | 已完成 |

### 4.7 MCP — 全局状态 + Props + 截图

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 4.7.1 | global state MCP Tools | design-mcp | `src/tools/global-state-tools.ts` 🆕 | list/set/add_binding | 已完成 |
| 4.7.2 | component props MCP Tools | design-mcp | `src/tools/component-props-tools.ts` 🆕 | get_template_props/update/list | 已完成 |
| 4.7.3 | snapshot MCP Tool | design-mcp | `src/tools/snapshot-tools.ts` 🆕 | generate_snapshots | 已完成 |
| 4.7.4 | 新 MCP Resources | design-mcp | `src/resources/` | globalstates://, template:// | 已完成 |
| 4.7.5 | 扩展 api-client | design-mcp | `src/api-client.ts` | 全局状态 + props + 截图 API | 已完成 |

**Phase 4 小计：33 个任务**

---

## Phase 5：协作同步（2 周）

> **目标：** OperationEnvelope 协议，回声去重、断线重连、保存指示器、AI 操作通知。

### 5.1 Schema — OperationEnvelope

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 5.1.1 | OperationEnvelope 类型 | design-schema | `src/types/envelope.ts` 🆕 | { id, fingerprint, operation, author, authorId?, seq?, timestamp } | 已完成 |
| 5.1.2 | Zod 校验器 | design-schema | `src/validators/envelope.ts` 🆕 | OperationEnvelope schema | 已完成 |
| 5.1.3 | 更新 re-export | design-schema | `src/index.ts` | 导出 OperationEnvelope | 已完成 |

### 5.2 Backend — 协议增强

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 5.2.1 | operations 表新增列 | design-api | DB 初始化 SQL | fingerprint, author, author_id | 已完成 |
| 5.2.2 | OperationsService envelope 持久化 | design-api | operations.service.ts | 接收 envelope → 存储额外字段 → 分配 seq | 已完成 |
| 5.2.3 | WebSocket 广播 OperationEnvelope | design-api | operations.gateway.ts | 推送完整 envelope（fingerprint + author + seq） | 已完成 |
| 5.2.4 | WebSocket 重连握手 | design-api | operations.gateway.ts | { type: 'handshake', lastSeq } → 回放 | 已完成 |
| 5.2.5 | 补全 redo 端点 | design-api | operations.service.ts | POST /redo | 已完成 |

### 5.3 Frontend — 同步系统

| # | 任务 | 包 | 文件 | 说明 | 状态 |
|---|------|---|------|------|------|
| 5.3.1 | EchoDeduplicator | design_front | `src/services/EchoDeduplicator.ts` 🆕 | markOutgoing + shouldApplyIncoming 指纹匹配 | 已完成 |
| 5.3.2 | SyncManager 增强 | design_front | `src/services/SyncManager.ts` | 发送 envelope + EchoDedup 过滤 | 已完成 |
| 5.3.3 | 断线重连 — 指数退避 | design_front | SyncManager.ts | 1s→2s→4s→8s→16s；5 次后 HTTP 轮询 | 已完成 |
| 5.3.4 | 重连握手 — 补发缺失 | design_front | SyncManager.ts | lastSeq → apply 缺失操作 | 已完成 |
| 5.3.5 | SaveStatusTracker | design_front | `src/services/SaveStatusTracker.ts` 🆕 | saved/saving/failed/offline 四状态 | 已完成 |
| 5.3.6 | SaveStatusIndicator 组件 | design_front | `src/views/editor/SaveStatusIndicator.tsx` 🆕 | ✅/🔄/⚠️/📵 + 重试按钮 | 已完成 |
| 5.3.7 | AiOperationToast 组件 | design_front | `src/views/editor/AiOperationToast.tsx` 🆕 | 🤖 AI 修改了 xxx，3s 消失，Undo 按钮 | 已完成 |
| 5.3.8 | 集成到 EditorStore | design_front | editor.store.ts | execute → fingerprint → envelope → SyncManager | 已完成 |
| 5.3.9 | 集成到 EditorLayout | design_front | EditorLayout.tsx | SaveStatus + AiToast 放入布局 | 已完成 |

**Phase 5 小计：17 个任务**

---

## 统计

| Phase | 任务数 | 周期 | 核心交付 | 进度 |
|-------|-------|------|---------|------|
| Phase 1 | 50 | 3 周 | 基础编辑体验完整 | 50/50 |
| Phase 2 | 27 | 2 周 | 三层状态 + Props 系统 | 27/27 |
| Phase 3 | 28 | 2 周 | 数据驱动 + 表达式解析 | 28/28 |
| Phase 4 | 33 | 3 周 | 预览模式 + 高级编辑 | 33/33 |
| Phase 5 | 17 | 2 周 | 协作同步 | 17/17 |
| **总计** | **155** | **12 周** | **155/155** | **0/155** |

---

## 执行原则

1. **严格按依赖顺序：** 每个 Phase 内部按 Schema → Operations → Engine → Frontend → Backend → MCP 执行
2. **每个任务可独立提交：** 单次 git commit 不超过 200-300 行改动
3. **先类型后逻辑：** 先定义接口/类型，再实现功能
4. **先测试后 UI：** Operation 的 execute + inverse 必须有单元测试
5. **增量交付：** 每个 Phase 结束后有可演示的完整功能切片

## 验证清单

- [ ] `pnpm build` 全量构建通过
- [ ] `pnpm test` 所有测试通过
- [ ] Phase 1 验证：手动创建元素 → 编辑样式 → 拖拽移动 → 组件树联动
- [ ] Phase 2 验证：创建全局状态 → 绑定节点 → 切换状态 → 样式自动变化
- [ ] Phase 3 验证：创建数据集 → 绑定表达式 → 切换数据集 → 画布实时更新
- [ ] Phase 4 验证：进入预览 → 点击按钮触发导航 → hover 样式生效 → 截图生成
- [ ] Phase 5 验证：MCP 操作 → WebSocket 推送 → 前端 Toast → Echo 不重复 → 断线重连
