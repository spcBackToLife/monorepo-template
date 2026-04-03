# Editor v2 —— 完整实施规划
> **从第一性原理出发，不考虑改造成本，定义最佳方案。**
>
> 本文档是编辑器从当前状态升级到产品设计文档所描述的理想状态的完整路线图。
>
> 对应产品设计文档：
> - [产品概述](../02-product/overview.md)
> - [编辑器总纲](../02-product/editor/README.md)
> - [状态管理系统](../02-product/editor/04-state-system/README.md)
> - [数据驱动系统](../02-product/editor/05-data-driven/README.md)
> - [右侧面板重组](../02-product/editor/03-property-panel/redesign.md)
> - [交互与事件](../02-product/editor/09-interaction-bindding/README.md)
> - [预览与测试](../02-product/editor/10-preview-mode/README.md)
---
## 一、当前状态 vs 目标状态
### 1.1 总体差距
```
当前状态：
  · 三/四层状态模型（交互态 + 业务态 + 数据场景 + 全局状态混杂）
  · 数据集（DataSet）作为简单 mock 数据列表
  · 右侧 6 Tab 平铺面板（状态是一个 Tab）
  · 左侧面板：元素树 + 页面列表（无数据视图）
  · 画布：无上下文提示条
  · 全局状态（globalStates）混杂了环境变量和领域状态
  · 渲染引擎：4 层样式合并（base → global → business → interaction）
目标状态：
  · 五层状态模型（交互态 > 组件态 > 领域态 > 数据态 > 环境态）
  · 数据源（DataSource）= 数据内容 + 生命周期 + 数据场景
  · 右侧统一编辑面板（状态是最高层上下文）
  · 左侧三视图导航器（页面 / 元素 / 数据）
  · 画布：上下文提示条 + 状态感知渲染
  · 领域态独立 + 环境态独立 + 数据源生命周期→领域态桥接
  · 渲染引擎：5 层叠加算法 + 领域态绑定 + 环境态绑定
```
### 1.2 架构依赖关系
```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Phase 0: design-schema（类型基础）                                      │
│     ↓                                                                    │
│   Phase 1: design-operations（操作语义）                                  │
│     ↓                                                                    │
│   Phase 2: design-engine（渲染引擎）                                      │
│     ↓                                                                    │
│   ┌──────────────┬──────────────┬───────────────┬──────────────┐         │
│   │ Phase 3      │ Phase 4      │ Phase 5       │ Phase 6      │         │
│   │ 右侧面板     │ 左侧导航器   │ 画布增强       │ 后端适配     │ ← 可并行  │
│   └──────┬───────┴──────┬───────┴───────┬───────┴──────┬───────┘         │
│          └──────────────┴───────────────┴──────────────┘                 │
│                                  ↓                                       │
│   ┌──────────────┬──────────────┬───────────────┐                        │
│   │ Phase 7      │ Phase 8      │ Phase 9       │ ← 可并行               │
│   │ MCP 工具     │ 预览增强     │ 代码生成       │                        │
│   └──────────────┴──────────────┴───────────────┘                        │
│                                  ↓                                       │
│   Phase 10: 高级功能 + 精打细磨                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```
---
## 二、Phase 0：类型基础（design-schema）
> 所有上层的基石。定义五层状态模型、数据源模型、领域态绑定的完整 TypeScript 类型。
### 0.1 领域态类型（新增）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 0.1.1 | `DomainStateVariable` | `types/domainState.ts` | `{ id, name, label, values: DomainStateValue[], defaultValue, currentPreviewValue, source?: 'manual'\|'dataSource', dataSourceId? }` |
| 0.1.2 | `DomainStateValue` | `types/domainState.ts` | `{ value: string, label: string }` |
| 0.1.3 | `DomainStateBinding` | `types/domainState.ts` | `{ variableName, ownerNodeId?, value, styles?, props?, visible?, childrenVisibility?, disabledEvents? }` |
| 0.1.4 | `ComponentNode` 扩展 | `types/node.ts` | 新增 `domainStates?: DomainStateVariable[]`（容器上定义领域态变量）和 `domainStateBindings?: DomainStateBinding[]`（子元素对领域态的响应） |
| 0.1.5 | `Screen` 扩展 | `types/screen.ts` | 新增 `domainStates?: DomainStateVariable[]`（页面级领域态） |
### 0.2 环境态类型（新增）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 0.2.1 | `EnvironmentVariable` | `types/environment.ts` | `{ id, name, label, values: {value,label}[], defaultValue, currentPreviewValue }` |
| 0.2.2 | `EnvironmentStateBinding` | `types/environment.ts` | `{ variableName, value, styles?, props?, visible? }` |
| 0.2.3 | `DesignProject` 扩展 | `types/project.ts` | 新增 `environmentStates: EnvironmentVariable[]` |
| 0.2.4 | `ComponentNode` 扩展 | `types/node.ts` | 新增 `environmentBindings?: EnvironmentStateBinding[]` |
### 0.3 数据源模型（替代 DataSet）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 0.3.1 | `DataSource` | `types/dataSource.ts` | `{ id, name, description?, lifecycle: 'api'\|'static', phases: DataSourcePhase[], activePhase, scenarios: DataScenario[], activeScenarioId, schema?: DataSchema }` |
| 0.3.2 | `DataSourcePhase` | `types/dataSource.ts` | `{ name: string, label: string }` |
| 0.3.3 | `DataScenario` | `types/dataSource.ts` | `{ id, name, description?, data: Record<string,any>, isDefault? }` |
| 0.3.4 | `DataSchema` + `DataField` | `types/dataSource.ts` | 数据结构描述（用于自动补全） |
| 0.3.5 | `Screen` 扩展 | `types/screen.ts` | 删除旧 `dataSets` 字段，替换为 `dataSources: DataSource[]` |
### 0.4 组件态增强
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 0.4.1 | `ComponentState` 扩展 | `types/state.ts` | 新增 `childrenVisibility?: Record<string, boolean>` 和 `disabledEvents?: string[]` |
| 0.4.2 | 删除 `GlobalStateVariable` | `types/state.ts` | 删除旧类型，由 `DomainStateVariable` + `EnvironmentVariable` 替代 |
| 0.4.3 | 删除 `GlobalStateBinding` | `types/state.ts` | 删除旧类型，由 `DomainStateBinding` + `EnvironmentStateBinding` 替代 |
### 0.5 事件类型更新
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 0.5.1 | `setDomainState` action | `types/event.ts` | `{ type: 'setDomainState', variableName: string, value: string }` |
| 0.5.2 | `setEnvironmentState` action | `types/event.ts` | `{ type: 'setEnvironmentState', variableName: string, value: string }` |
| 0.5.3 | 删除 `setGlobalState` action | `types/event.ts` | 从 `EventAction` 联合类型中移除 |
| 0.5.4 | `EventCondition` 更新 | `types/event.ts` | `type` 改为 `'domainState' \| 'environmentState' \| 'dataBinding' \| 'propValue'` |
### 0.6 导出更新
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 0.7.1 | 更新 `index.ts` 导出 | `index.ts` | 导出所有新类型 |
| 0.7.2 | 验证器更新 | `validators/` | 新增 domainState/environment/dataSource 验证 |
**Phase 0 完成标志：**
```
✓ 所有新类型定义完毕且导出
✓ 旧类型（GlobalStateVariable/GlobalStateBinding/DataSet/setGlobalState）已删除
✓ 类型编译通过（无 TypeScript 错误）
```
---
## 三、Phase 1：操作语义（design-operations）
> 在类型基础上定义所有新操作的语义和实现。
### 1.1 领域态操作（新增）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.1.1 | `addDomainState` | `operations/domainState.ts` | 在指定容器节点或 Screen 上添加领域态变量 |
| 1.1.2 | `removeDomainState` | `operations/domainState.ts` | 删除领域态变量（含子元素绑定清理提示） |
| 1.1.3 | `updateDomainState` | `operations/domainState.ts` | 修改领域态变量定义（名称、values 等） |
| 1.1.4 | `setDomainStatePreview` | `operations/domainState.ts` | 切换领域态预览值（编辑器画布实时更新） |
| 1.1.5 | `addDomainStateBinding` | `operations/domainState.ts` | 为子节点添加对领域态变量的响应规则 |
| 1.1.6 | `updateDomainStateBinding` | `operations/domainState.ts` | 修改已有的领域态绑定 |
| 1.1.7 | `removeDomainStateBinding` | `operations/domainState.ts` | 删除领域态绑定 |
### 1.2 环境态操作（新增）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.2.1 | `addEnvironmentState` | `operations/environment.ts` | 在项目级添加环境变量（theme, locale 等） |
| 1.2.2 | `removeEnvironmentState` | `operations/environment.ts` | 删除环境变量 |
| 1.2.3 | `updateEnvironmentState` | `operations/environment.ts` | 修改环境变量定义 |
| 1.2.4 | `setEnvironmentPreview` | `operations/environment.ts` | 切换环境态预览值 |
| 1.2.5 | `addEnvironmentBinding` | `operations/environment.ts` | 为节点添加对环境变量的响应规则 |
| 1.2.6 | `updateEnvironmentBinding` | `operations/environment.ts` | 修改已有的环境态绑定 |
| 1.2.7 | `removeEnvironmentBinding` | `operations/environment.ts` | 删除环境态绑定 |
### 1.3 数据源操作（替代 DataSet 操作）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.3.1 | `addDataSource` | `operations/dataSource.ts` | 创建数据源；若 lifecycle=api → 自动调用 `addDomainState` 生成生命周期变量 |
| 1.3.2 | `removeDataSource` | `operations/dataSource.ts` | 删除数据源 + 关联的自动生成领域态变量 |
| 1.3.3 | `updateDataSource` | `operations/dataSource.ts` | 更新数据源元信息 |
| 1.3.4 | `switchDataSourcePhase` | `operations/dataSource.ts` | 切换数据源生命周期阶段（同步更新关联的领域态预览值） |
| 1.3.5 | `addDataScenario` | `operations/dataSource.ts` | 添加数据场景（mock 数据集） |
| 1.3.6 | `updateDataScenario` | `operations/dataSource.ts` | 更新数据场景内容 |
| 1.3.7 | `removeDataScenario` | `operations/dataSource.ts` | 删除数据场景 |
| 1.3.8 | `switchDataScenario` | `operations/dataSource.ts` | 切换当前预览的数据场景 |
### 1.4 组件态操作增强
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.4.1 | `updateState` 增强 | `operations/state.ts` | 支持写入 `childrenVisibility`、`disabledEvents` |
| 1.4.2 | `updateStatePropsOverride` | `operations/state.ts` | 在指定状态下覆盖 props（独立操作，细粒度） |
| 1.4.3 | `updateStateChildVisibility` | `operations/state.ts` | 在指定状态下设置子元素可见性（独立操作） |
### 1.5 清理旧操作

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.5.1 | 删除 `setGlobalState` 操作 | `operations/globalState.ts` | 直接删除，由 `setDomainStatePreview` 替代 |
| 1.5.2 | 删除 `addGlobalStateVariable` 操作 | `operations/globalState.ts` | 直接删除，由 `addDomainState` / `addEnvironmentState` 替代 |
| 1.5.3 | 删除 `removeGlobalStateVariable` 操作 | `operations/globalState.ts` | 直接删除 |
| 1.5.4 | 删除全部 GlobalStateBinding 操作 | `operations/globalState.ts` | 删除 `addGlobalStateBinding` / `removeGlobalStateBinding` / `updateGlobalStateBinding` |
| 1.5.5 | 删除全部 DataSet 操作 | `operations/dataset.ts` | 删除 `addDataSet` / `updateDataSet` / `removeDataSet` / `switchDataSet` / `bindData`，由 DataSource 操作替代 |

### 1.6 Operation 联合类型更新
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.6.1 | 更新 `Operation` 联合类型 | `types.ts` | 添加所有新操作到联合类型 |
| 1.6.2 | 更新 `OperationType` | `types.ts` | 同步更新类型字面量联合 |
| 1.6.3 | 更新 `getAvailableOperations()` | `executor/description.ts` | 新操作的描述信息（供 MCP 使用） |
**Phase 1 完成标志：**
```
✓ 所有新 Operation 可通过 OperationExecutor.execute() 正确执行
✓ 旧操作（globalState/dataSet 相关）已全部删除
✓ addDataSource(lifecycle=api) 自动生成领域态变量
✓ switchDataSourcePhase 联动领域态预览值
✓ 操作的 undo/redo 正常
```
---
## 四、Phase 2：渲染引擎（design-engine）
> 实现五层状态叠加算法，让画布真正理解新的状态模型。
### 2.1 核心：五层叠加算法
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.1.1 | `resolveNodeAppearance()` | `styles/resolveNodeAppearance.ts` | 全新的五层叠加入口函数，替代当前的 `resolveNodeStyles` + `resolveNodeProps` 分离逻辑 |
| 2.1.2 | 第 0 层：基础样式/属性 | resolveNodeAppearance | `{ ...node.styles }` + `{ ...node.props }` |
| 2.1.3 | 第 5 层：环境态叠加 | resolveNodeAppearance | 遍历 `node.environmentBindings`，匹配当前环境变量 |
| 2.1.4 | 第 4 层：数据态叠加 | resolveNodeAppearance | `resolveDataBindings(props, dataContext)` 数据绑定表达式解析 |
| 2.1.5 | 第 3 层：领域态叠加 | resolveNodeAppearance | 遍历 `node.domainStateBindings`，匹配当前领域态值 |
| 2.1.6 | 第 2 层：组件态叠加 | resolveNodeAppearance | 取 `states[activeState]` 合并 |
| 2.1.7 | 第 1 层：交互态叠加 | resolveNodeAppearance | 取 `states[interactionState]` 合并 |
| 2.1.8 | 可见性决议 | resolveNodeAppearance | 各层 `visible` 按优先级覆盖 |
| 2.1.9 | 子元素可见性决议 | resolveNodeAppearance | 合并各层 `childrenVisibility` |
### 2.2 SchemaRenderer 适配
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.2.1 | 新增渲染上下文 | `renderer/SchemaRenderer.tsx` | 新增 `domainStates: Record<string,string>`、`environmentStates: Record<string,string>` 作为 props |
| 2.2.2 | 领域态作用域传递 | SchemaRenderer | 渲染节点时，从祖先到后代传递领域态变量的当前值（React Context 或 props 递推） |
| 2.2.3 | 使用 `resolveNodeAppearance` | SchemaRenderer | 替换原有的 `resolveNodeStyles` + 独立 globalState 合并逻辑 |
| 2.2.4 | 子元素可见性应用 | SchemaRenderer | 渲染 children 前检查 `childrenVisibility` 决议结果 |
### 2.3 DataContext 升级
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.3.1 | `DataContext` 重定义 | `data/DataContext.tsx` | 从 DataSet 模型迁移到 DataSource 模型（`dataSource, scenario, phase, data, listContext`） |
| 2.3.2 | 数据源阶段感知 | DataContext | 当 `phase !== 'loaded'` 时不提供场景数据（模拟 loading/empty/error） |
| 2.3.3 | 表达式解析器适配 | `data/resolveExpression.ts` | 保持 `{{data.xxx}}` 语法不变，底层数据来源从 DataSet.data → DataSource.activeScenario.data |
### 2.4 预览渲染器适配
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.4.1 | PreviewRenderer 状态传入 | `preview/PreviewRenderer.tsx` | 接收五层状态上下文，传递给 SchemaRenderer |
| 2.4.2 | CSS 伪类注入更新 | `preview/CSSPseudoInjector.ts` | 保持交互态 CSS 注入逻辑不变 |
| 2.4.3 | 事件执行引擎更新 | `preview/EventExecutionEngine.ts` | 支持 `setDomainState` action 执行 |
### 2.5 EditorOverlay 适配
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.5.1 | 领域态绑定角标 | `overlay/EditorOverlay.tsx` | 有 `domainStateBindings` 的节点显示 📎 角标 |
| 2.5.2 | 环境态绑定角标 | EditorOverlay | 有 `environmentBindings` 的节点显示 🌐 角标（可选） |
| 2.5.3 | 状态上下文在覆盖层的传递 | EditorOverlay | 将 `stateContext` 传给 SchemaRenderer 用于实时预览 |
### 2.6 代码生成适配
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.6.1 | 领域态 → Context 代码 | `codegen/reactCodegen.ts` | `DomainStateVariable` → `React.createContext` + `useContext` |
| 2.6.2 | 环境态 → CSS 变量/ThemeProvider | reactCodegen | `EnvironmentVariable` → `data-theme` + CSS 变量 |
| 2.6.3 | 领域态绑定 → 条件渲染 | reactCodegen | `domainStateBindings` → `{taskStatus === 'completed' && ...}` |
| 2.6.4 | 数据源生命周期 → API hooks | reactCodegen | DataSource(api) → `useFetch` / `useQuery` 代码框架 |
**Phase 2 完成标志：**
```
✓ resolveNodeAppearance 正确实现五层叠加算法
✓ 画布能正确渲染领域态绑定的差异
✓ 画布能正确渲染环境态绑定的差异
✓ 数据源阶段切换 → 画布正确反映 loading/loaded/empty/error
✓ 预览模式下 setDomainState action 可执行
✓ 代码生成能输出领域态/环境态相关代码
```
---
## 五、Phase 3：右侧面板重组（design_front）
> 核心 UI 变化：6 Tab → 状态驱动的统一编辑面板。
### 3.1 Store 层改造
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.1.1 | 新增 `stateContext` | `stores/editor/index.ts` | `{ interactionState, componentState, domainStates, lockedDomainState, environmentStates }` |
| 3.1.2 | 状态切换 actions | stores/editor | `setInteractionState`, `setComponentState`, `setDomainState`, `lockDomainState`, `unlockDomainState`, `setEnvironmentState` |
| 3.1.3 | 领域态锁定逻辑 | stores/editor | 选中子元素时，如果仍在被锁定领域态的作用域内 → 保持锁定；离开作用域 → 自动解锁 |
| 3.1.4 | `collapsedSections` | stores/editor | `Set<string>` 用于记忆各 Section 折叠状态 |
| 3.1.5 | 删除 `activeRightTab` | stores/editor | 删除 `RightTabType`、`activeRightTab`、`setActiveRightTab`、`focusRightPanelTab` 及所有调用方 |
| 3.1.6 | `resolvedInheritedDomainStates` | stores/editor（computed） | 根据当前选中节点，向上遍历祖先收集所有作用域内的领域态变量 |
| 3.1.7 | `resolvedEnvironmentStates` | stores/editor（computed） | 从项目级读取所有环境变量 |
### 3.2 状态上下文栏
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.2.1 | `StateContextBar` 组件 | `panels/RightPanel/StateContextBar.tsx` | 五层状态切换控制器，固定在面板顶部 |
| 3.2.2 | 交互态切换器 | StateContextBar | 5 个 radio button: default/hover/active/focus/disabled |
| 3.2.3 | 组件态切换器 | StateContextBar | 下拉框（读取 node.states 的非交互态项）+ [+添加] 按钮 |
| 3.2.4 | 领域态区域 | StateContextBar | 列出所有继承的领域态变量，每个变量一行 |
| 3.2.5 | 领域态来源标注 | StateContextBar | 显示「来源: TaskCard [↑跳转]」或「来源: 数据源"用户列表" [📊]」 |
| 3.2.6 | 🔒 锁定按钮 | StateContextBar | 领域态切到非 default 时 → 进入锁定模式 + 醒目提示条 |
| 3.2.7 | 数据源生命周期集成 | StateContextBar | `source === 'dataSource'` 的领域态显示 [📊]；loaded 时显示场景子选择器 |
| 3.2.8 | 环境态切换器 | StateContextBar | 每个环境变量一个下拉框 |
| 3.2.9 | 自适应收起 | StateContextBar | 无组件态/领域态/环境态定义时 → 对应行自动隐藏 |
| 3.2.10 | 醒目提示条 | StateContextBar | 非 default 上下文时显示蓝色/紫色提示条「正在编辑 xxx 上下文」 |
### 3.3 统一面板容器
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.3.1 | `RightPanel` 组件 | `panels/RightPanel/index.tsx` | 替代 PropertyPanel：元素信息条 + StateContextBar(固定) + 滚动内容区 |
| 3.3.2 | `CollapsibleSection` 通用组件 | `panels/RightPanel/CollapsibleSection.tsx` | 可折叠区域（title + chevron + 内容），读取 `collapsedSections` |
| 3.3.3 | 挂载替换 | `views/editor/index.tsx` | `<PropertyPanel />` → `<RightPanel />` |
### 3.4 属性区（PropsSection）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.4.1 | 从 PropsTab 提取核心逻辑 | `panels/RightPanel/sections/PropsSection.tsx` | 保留属性编辑 UI，移除 Tab 外壳 |
| 3.4.2 | 状态感知：覆盖值读取 | PropsSection | 非 default 态 → 显示当前状态的 props 覆盖值 |
| 3.4.3 | 状态感知：写入路由 | PropsSection | default → `updateProps`；交互/组件态 → `updateState`；领域态 → `updateDomainStateBinding`；环境态 → `updateEnvironmentBinding` |
| 3.4.4 | 覆盖标记 🔵 | PropsSection | 非 default 且有覆盖值 → 蓝色圆点 |
| 3.4.5 | 继承值灰色展示 | PropsSection | 非 default 且无覆盖 → 显示 default 值但灰色 |
| 3.4.6 | 数据绑定 🔗 内联 | PropsSection | 保留 `{{data.xxx}}` 绑定能力 |
### 3.5 样式区（StylesSection）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.5.1 | 从 StylesTab 提取核心逻辑 | `panels/RightPanel/sections/StylesSection.tsx` | 保留 CSS 八组编辑器，移除 Tab 外壳 |
| 3.5.2 | 状态感知：覆盖值读取 | StylesSection | 非 default 态 → 读取当前状态的 styles 覆盖 |
| 3.5.3 | 状态感知：写入路由 | StylesSection | 同 PropsSection 的写入路由逻辑 |
| 3.5.4 | 覆盖标记 🔵 | StylesSection | 蓝色圆点 + 点击删除覆盖 |
| 3.5.5 | 继承值灰色展示 | StylesSection | 未覆盖的值灰色显示 |
| 3.5.6 | default 态下的覆盖来源提示 | StylesSection | hover 属性 → tooltip 显示「default: #1677FF」 |
### 3.6 子元素可见性区（新增）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.6.1 | `ChildrenVisibilitySection` | `panels/RightPanel/sections/ChildrenVisibilitySection.tsx` | 列出直接子元素，每个有 checkbox + 名称 |
| 3.6.2 | 仅容器元素显示 | RightPanel | `node.children?.length > 0` 时渲染此区域 |
| 3.6.3 | 状态感知的可见性切换 | ChildrenVisibilitySection | default → `setNodeVisible`；非 default → 写入当前状态的 `childrenVisibility` |
| 3.6.4 | 覆盖标记 🔵 | ChildrenVisibilitySection | 与 default 不同 → 蓝色标记 |
### 3.7 交互行为区
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.7.1 | 从 InteractionsTab 提取 | `panels/RightPanel/sections/InteractionSection.tsx` | 保留事件卡片列表 + 添加事件 UI |
| 3.7.2 | 状态感知：事件禁用标记 | InteractionSection | 当前状态 `disabledEvents` 包含事件 → 显示删除线 + 「已禁用」 |
| 3.7.3 | 当前状态下添加事件 | InteractionSection | 添加事件可选「仅在当前状态下生效」 |
### 3.8 代码预览区
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.8.1 | 从 CodeTab 提取 | `panels/RightPanel/sections/CodePreviewSection.tsx` | 默认折叠，展开后显示 JSON/React 代码 |
| 3.8.2 | 状态感知代码 | CodePreviewSection | 生成的代码反映当前状态上下文 |
### 3.9 删除旧代码
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.9.1 | 删除 `PropertyPanel` | `panels/PropertyPanel/` | 由 RightPanel 完全替代，直接删除目录 |
| 3.9.2 | 删除 `panels/tabs/` | `panels/tabs/` | StylesTab/PropsTab/StatesTab/DataTab/CodeTab 全部删除 |
| 3.9.3 | 清理所有旧引用 | 全局搜索 | `focusRightPanelTab`、`RightTabType`、`activeRightTab` 等调用方全部清理 |
**Phase 3 完成标志：**
```
✓ 右侧面板是统一滚动面板（无 Tab）
✓ 状态上下文栏显示五层状态控制
✓ 交互态/组件态切换 → 样式区/属性区实时反映
✓ 领域态切换 → 锁定模式 → 子元素导航不丢上下文
✓ 非 default 态下编辑 → 自动写入正确的覆盖位置
✓ 蓝色标记 🔵 正确标识覆盖值
✓ 子元素可见性区正常工作
✓ 交互行为区感知状态上下文
```
---
## 六、Phase 4：左侧产品导航器
> 左侧面板从「图层树 + 页面列表」升级为**产品导航器**三视图。
### 4.1 三视图容器
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 4.1.1 | LeftPanel 三视图重构 | `panels/LeftPanel/index.tsx` | 底部三个 tab 图标：📄页面 / 🌳元素 / 📊数据 |
| 4.1.2 | `leftPanelView` store 字段 | `stores/editor/index.ts` | `'pages' \| 'elements' \| 'data'` |
| 4.1.3 | 快捷键 | `hooks/useKeyboardShortcuts.ts` | Alt+1/2/3 切换左侧视图 |
### 4.2 页面视图
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 4.2.1 | `PageView` 组件 | `panels/LeftPanel/PageView/index.tsx` | 页面列表 + 跳转关系标注 |
| 4.2.2 | 跳转关系提取 | `panels/LeftPanel/PageView/extractNavigations.ts` | 遍历 screen 所有节点的 events → 提取 navigate 目标 |
| 4.2.3 | 每个页面项显示跳转目标 | PageView | 页面名右侧 → 「→ 首页, → 设置页」 |
| 4.2.4 | 迷你导航关系图 | `panels/LeftPanel/PageView/NavigationGraph.tsx` | 底部可折叠区域：节点 + 有向连线 |
| 4.2.5 | 当前页面高亮 | PageView | 当前 activeScreen 显示蓝色/加粗 |
### 4.3 元素视图
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 4.3.1 | `ElementView` 组件 | `panels/LeftPanel/ElementView/index.tsx` | 从 NodeTree 演化，增加行为指示器 |
| 4.3.2 | ⚡ 事件指示器 | ElementView | `events.length > 0` → 显示闪电图标 |
| 4.3.3 | 🔗 数据绑定指示器 | ElementView | props 中含 `{{}}` 表达式 → 显示链接图标 |
| 4.3.4 | 🔵 状态指示器 | ElementView | 有非 default 组件态 或 `domainStates.length > 0` → 显示蓝点 |
| 4.3.5 | 📎 领域态绑定指示器 | ElementView | 有 `domainStateBindings.length > 0` → 显示别针 |
| 4.3.6 | 👁 可见性条件指示器 | ElementView | 有 `visibilityWhen` → 显示眼睛图标 |
| 4.3.7 | 指示器 tooltip | ElementView | hover 图标 → 显示详情 |
| 4.3.8 | 搜索元素 | ElementView | 顶部搜索框，按名称/类型过滤 |
### 4.4 数据视图
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 4.4.1 | `DataView` 组件 | `panels/LeftPanel/DataView/index.tsx` | 数据源管理 + 环境变量管理 + JSON 编辑器 |
| 4.4.2 | 数据源列表 | `DataView/DataSourceList.tsx` | 列出所有数据源，每个可展开显示生命周期 + 场景 |
| 4.4.3 | 生命周期切换器 | DataSourceList | API 类型：4 个 radio（加载中/已加载/空/失败） |
| 4.4.4 | 数据场景选择器 | DataSourceList | 下拉框选择场景 + [+新建场景] |
| 4.4.5 | 添加数据源 | `DataView/AddDataSourcePanel.tsx` | 名称 + 类型(API/静态) + 初始数据模板选择 |
| 4.4.6 | 环境变量管理器 | `DataView/EnvironmentManager.tsx` | 列出环境变量 + 切换器 + [+添加] |
| 4.4.7 | JSON 编辑器 | `DataView/JsonEditor.tsx` | 当前选中数据源+场景的 mock 数据编辑（复用已有组件） |
| 4.4.8 | 可视化编辑器 | `DataView/VisualEditor.tsx` | 树形 JSON 展示 + 叶子字段内联编辑 |
| 4.4.9 | 切换联动 | DataView | 数据源阶段/场景切换 → `execute(switchDataSourcePhase/switchDataScenario)` → 画布实时更新 |
### 4.5 删除旧代码
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 4.5.1 | 删除 `DataTab` | `panels/tabs/DataTab/` | 数据管理移至左侧 DataView，直接删除 |
| 4.5.2 | 删除 `StatesTab` 中 GlobalState 管理 | StatesTab 内 | 环境态 → DataView/EnvironmentManager；领域态 → StateContextBar |
| 4.5.3 | 删除 `PageList` | `panels/PageList/` | 由 PageView 替代，直接删除 |
| 4.5.4 | 删除 `NodeTree` | `panels/NodeTree/` | 由 ElementView 替代，直接删除 |
**Phase 4 完成标志：**
```
✓ 左侧面板有三个视图可切换
✓ 页面视图显示跳转关系
✓ 元素视图有行为指示器（⚡🔗🔵📎👁）
✓ 数据视图可管理数据源（增删改 + 生命周期切换 + 场景管理）
✓ 环境变量可在数据视图中管理
✓ 切换数据源阶段/场景 → 画布实时更新
```
---
## 七、Phase 5：画布增强
> 画布从「静态画板」升级为「产品在当前上下文下的实时预览」。
### 5.1 画布上下文提示条
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 5.1.1 | `CanvasContextBar` 组件 | `Canvas/CanvasContextBar.tsx` | 画布顶部提示条：显示当前数据源阶段/场景、领域态、环境态 |
| 5.1.2 | 快速切换入口 | CanvasContextBar | 点击各指示器 → 下拉切换（同 StateContextBar 的数据联动） |
| 5.1.3 | 非 default 上下文高亮 | CanvasContextBar | 任一维度非 default → 提示条显示醒目颜色（蓝色/紫色） |
| 5.1.4 | 显示/隐藏控制 | `stores/editor/index.ts` | `showCanvasContextBar: boolean`，可在顶部工具栏切换 |
| 5.1.5 | 画布内挂载 | `Canvas/index.tsx` | 条件渲染 CanvasContextBar |
### 5.2 画布状态感知渲染
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 5.2.1 | stateContext 传入 SchemaRenderer | `Canvas/index.tsx` | 将 editorStore.stateContext 传给渲染引擎 |
| 5.2.2 | 切换状态 → 画布实时更新 | Canvas | MobX 响应式：stateContext 变化 → SchemaRenderer 重渲染 |
| 5.2.3 | 领域态作用域内子元素联动 | Canvas | 领域态切换 → 所有 `domainStateBindings` 匹配的节点同时变化 |
| 5.2.4 | 环境态全局切换 | Canvas | 环境态切换 → 所有 `environmentBindings` 节点同时变化 |
### 5.3 画布覆盖层增强
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 5.3.1 | 领域态绑定角标绘制 | `overlay/EditorOverlay.tsx` | 有 domainStateBindings 的节点在覆盖层显示 📎 小图标 |
| 5.3.2 | 锁定模式边框 | EditorOverlay | 领域态锁定模式下，作用域容器显示蓝色虚线边框 |
**Phase 5 完成标志：**
```
✓ 画布顶部显示上下文提示条
✓ 提示条可快速切换各维度
✓ 切换领域态 → 画布多元素联动变化
✓ 切换环境态 → 全局主题/语言切换
✓ 领域态锁定模式下可视化提示
```
---
## 八、Phase 6：后端适配（design-api）
> 确保新的数据结构能正确持久化和同步。
### 6.1 数据源 API
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 6.1.1 | DataSource CRUD 端点 | `modules/datasources/` | `POST/GET/PUT/DELETE /api/projects/:id/screens/:sid/datasources` |
| 6.1.2 | DataScenario CRUD 端点 | datasources module | 子资源：`/datasources/:dsId/scenarios` |
| 6.1.3 | 切换阶段端点 | datasources module | `POST /datasources/:dsId/phase` |
| 6.1.4 | 删除旧 Datasets API | datasets module | 删除旧端点和 datasets 模块 |
### 6.2 Operation 路由扩展
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 6.3.1 | 新 Operation 类型支持 | `operations/operations.service.ts` | 后端 Operation 执行器支持所有新操作 |
| 6.3.2 | WebSocket 推送 | `operations/operations.gateway.ts` | 新操作通过 WS 实时推送给前端 |
**Phase 6 完成标志：**
```
✓ 新数据源 API 工作正常
✓ 旧 Datasets API 已删除
✓ 所有新 Operation 可通过 REST API 执行
✓ WebSocket 推送新操作正常
```
---
## 九、Phase 7：MCP 工具（design-mcp）
> 让 AI 也能操作新的状态和数据系统。
### 7.1 领域态工具
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 7.1.1 | `list_domain_states` | `tools/domain-state-tools.ts` | 列出指定节点/页面的所有领域态变量 |
| 7.1.2 | `add_domain_state` | domain-state-tools | 在容器/Screen 上添加领域态变量 |
| 7.1.3 | `remove_domain_state` | domain-state-tools | 删除领域态变量 |
| 7.1.4 | `set_domain_state_preview` | domain-state-tools | 切换领域态预览值 |
| 7.1.5 | `add_domain_state_binding` | domain-state-tools | 为节点添加领域态响应规则 |
| 7.1.6 | `update_domain_state_binding` | domain-state-tools | 修改领域态绑定 |
| 7.1.7 | `remove_domain_state_binding` | domain-state-tools | 删除领域态绑定 |
### 7.2 环境态工具
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 7.2.1 | `list_environment_states` | `tools/environment-tools.ts` | 列出项目的所有环境变量 |
| 7.2.2 | `add_environment_state` | environment-tools | 添加环境变量 |
| 7.2.3 | `set_environment_preview` | environment-tools | 切换环境态预览值 |
| 7.2.4 | `add_environment_binding` | environment-tools | 为节点添加环境态响应 |
### 7.3 数据源工具（替代 dataset tools）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 7.3.1 | `list_data_sources` | `tools/data-source-tools.ts` | 替代 `list_datasets` |
| 7.3.2 | `add_data_source` | data-source-tools | 创建数据源 |
| 7.3.3 | `switch_data_source_phase` | data-source-tools | 切换数据源生命周期阶段 |
| 7.3.4 | `add_data_scenario` | data-source-tools | 添加数据场景 |
| 7.3.5 | `update_data_scenario` | data-source-tools | 更新场景数据 |
| 7.3.6 | `switch_data_scenario` | data-source-tools | 切换当前场景 |
### 7.4 Resources 更新
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 7.4.1 | `datasources://` resource | `resources/datasource-resources.ts` | 替代 `datasets://`，展示数据源 + 生命周期 + 场景 |
| 7.4.2 | `domainstates://` resource | `resources/domain-state-resources.ts` | 展示领域态变量定义 |
| 7.4.3 | `environmentstates://` resource | resources | 展示环境变量定义 |
### 7.5 删除旧工具
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 7.5.1 | 删除 `list_datasets` | `tools/dataset-tools.ts` | 由 `list_data_sources` 替代，直接删除 |
| 7.5.2 | 删除 `set_global_state` | `tools/global-state-tools.ts` | 由 `set_domain_state_preview` 替代，直接删除 |
| 7.5.3 | 删除 `datasets://` resource | `resources/dataset-resources.ts` | 由 `datasources://` 替代，直接删除 |
| 7.5.4 | 删除 `global-state://` resource | `resources/global-state-resources.ts` | 由 `domainstates://` + `environmentstates://` 替代，直接删除 |
**Phase 7 完成标志：**
```
✓ AI 可通过 MCP 创建/管理领域态变量和绑定
✓ AI 可切换数据源生命周期阶段
✓ AI 可管理环境变量
✓ 旧 MCP 工具（list_datasets/set_global_state/datasets://）已全部删除
```
---
## 十、Phase 8：预览增强
> 预览模式完整支持五层状态和数据源生命周期。
### 8.1 预览控制条增强
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 8.1.1 | 数据源控制 | `PreviewBar/index.tsx` | 预览控制条显示数据源阶段/场景切换器 |
| 8.1.2 | 领域态控制 | PreviewBar | 预览控制条显示领域态变量切换器 |
| 8.1.3 | 环境态控制 | PreviewBar | 预览控制条显示环境变量切换器 |
| 8.1.4 | 布局优化 | PreviewBar | 控制项按分组排列，溢出时折叠到 [更多▾] 下拉 |
### 8.2 事件执行引擎增强
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 8.2.1 | `setDomainState` action | `preview/EventExecutionEngine.ts` | 预览中点击按钮 → 切换领域态 → 多元素联动变化 |
| 8.2.2 | `setEnvironmentState` action | EventExecutionEngine | 预览中切换环境态 |
| 8.2.3 | 数据源阶段模拟 | EventExecutionEngine | 预览中模拟 loading → loaded 过渡 |
### 8.3 转场动画
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 8.3.1 | 6 种转场动画实现 | `preview/TransitionAnimator.tsx` | slideLeft/Right/Up/Down, fadeIn, zoomIn |
| 8.3.2 | 后退时反向动画 | TransitionAnimator | slideLeft 进入 → slideRight 后退 |
### 8.4 PreviewController 更新
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 8.4.1 | `switchDataSource` API | `preview/PreviewController.ts` | 程序化切换数据源阶段 |
| 8.4.2 | `setDomainState` API | PreviewController | 程序化切换领域态 |
| 8.4.3 | `setEnvironmentState` API | PreviewController | 程序化切换环境态 |
**Phase 8 完成标志：**
```
✓ 预览控制条可切换数据源阶段/场景/领域态/环境态
✓ setDomainState action 在预览中正确执行
✓ 页面跳转有转场动画
✓ PreviewController API 支持新状态系统
```
---
## 十一、Phase 9：代码生成增强
> 让代码导出完整反映五层状态和数据源模型。
### 9.1 领域态导出
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 9.1.1 | 领域态 → React Context | `codegen/reactCodegen.ts` | `const TaskContext = createContext({ taskStatus: 'pending' })` |
| 9.1.2 | 领域态绑定 → 条件渲染 | reactCodegen | `domainStateBindings` → `{taskStatus === 'completed' && <CompletedView />}` |
| 9.1.3 | 领域态绑定 → 条件样式 | reactCodegen | `domainStateBindings.styles` → `style={taskStatus === 'completed' ? {...} : {...}}` |
### 9.2 环境态导出
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 9.2.1 | 环境态 → ThemeProvider | reactCodegen | `<ThemeProvider theme={currentTheme}>` |
| 9.2.2 | 环境态 → CSS 变量 | reactCodegen | `data-theme="dark"` + CSS 变量定义 |
### 9.3 数据源导出
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 9.3.1 | API 数据源 → useQuery hook | reactCodegen | 生成 `const { data, isLoading, error } = useFetch('/api/users')` 框架代码 |
| 9.3.2 | 静态数据源 → 常量 | reactCodegen | `const siteConfig = { ... }` |
| 9.3.3 | 生命周期条件渲染 | reactCodegen | `if (isLoading) return <Skeleton />;` + `if (error) return <ErrorView />;` + `if (!data.length) return <EmptyView />;` |
### 9.4 全景截图增强
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 9.4.1 | 截图维度扩展 | 截图生成逻辑 | 支持 数据源阶段 × 数据场景 × 领域态 × 环境态 × 视口 的笛卡尔矩阵 |
| 9.4.2 | 截图配置 UI | 截图面板 | 勾选各维度值，计算组合数 |
| 9.4.3 | 批量生成 | 截图引擎 | 自动遍历所有组合生成截图 |
**Phase 9 完成标志：**
```
✓ 导出的 React 代码包含完整的领域态/环境态逻辑
✓ 数据源(API) 导出 useQuery + 生命周期条件渲染
✓ 全景截图支持多维度组合
```
---
## 十二、Phase 10：高级功能 + 精打细磨
> 产品体验的最后一公里。
### 10.1 编辑体验
| # | 任务 | 说明 |
|---|------|------|
| 10.1.1 | 覆盖链 tooltip | hover 属性 → 显示各层覆盖来源链（「← hover 覆盖 ← loading 覆盖 ← default」） |
| 10.1.2 | 子元素快速属性编辑 | 子元素可见性区展开子元素 → 内联编辑关键属性（文本、颜色） |
| 10.1.3 | 状态组合预览矩阵 | 弹出面板：交互态 × 组件态 × 领域态 × 环境态 的笛卡尔矩阵小预览 |
| 10.1.4 | 状态切换动画 | 蓝色标记/灰色继承值的平滑过渡动画 |
| 10.1.5 | 键盘快捷键 | 1-9 快速切换组件态；领域态快捷键可配置 |
### 10.2 领域态高级
| # | 任务 | 说明 |
|---|------|------|
| 10.2.1 | 领域态绑定拖拽排序 | 调整 `domainStateBindings` 优先级 |
| 10.2.2 | 组件模板的领域态 | 组件资产保存时保留 domainStates 定义，实例继承 |
| 10.2.3 | 领域态批量编辑 | 选中容器 → 一次性编辑多个子元素在某领域态值下的表现 |
### 10.3 数据高级
| # | 任务 | 说明 |
|---|------|------|
| 10.3.1 | 带默认值的绑定 | `{{data.user.name \| 未命名}}` 语法支持 |
| 10.3.2 | 预设数据场景模板 | 选择常见数据模式（用户列表/商品列表/表单数据等）快速填充 |
| 10.3.3 | AI 自动生成数据场景 | 根据 DataSchema 自动生成正常/空/极端/多语言等场景 |
| 10.3.4 | 数据结构自动推断 | 从手写 JSON 自动提取 DataSchema（字段路径 + 类型） |
### 10.4 事件高级
| # | 任务 | 说明 |
|---|------|------|
| 10.4.1 | 事件链（多行为顺序执行） | 一个触发器 → ①setState + ②setDomainState + ③navigate |
| 10.4.2 | hover 自动反转 | hover → enterHandler + 自动生成 leaveHandler |
| 10.4.3 | 条件事件 | `EventCondition`: if domainState === "xxx" 才执行 |
| 10.4.4 | 延时行为 | 事件链中插入 delay(2000) |
### 10.5 导航高级
| # | 任务 | 说明 |
|---|------|------|
| 10.5.1 | 全屏导航关系图 | 展开为全屏模态框查看完整产品流程图（可用 React Flow） |
| 10.5.2 | 跳转目标关联线 | 选中带 navigate 事件的元素 → 页面列表高亮目标页面 |
| 10.5.3 | 页面缩略图 | 页面列表每项旁显示小预览图 |
### 10.6 预览高级
| # | 任务 | 说明 |
|---|------|------|
| 10.6.1 | AI 自动化测试用例生成 | AI 分析 Schema → 生成测试用例 |
| 10.6.2 | AI 自动化测试执行 | 通过 PreviewController API 自动执行 + 截图 |
| 10.6.3 | 预览链接分享 | 生成可分享的预览 URL（远期） |
---
## 十三、实施优先级与并行策略
### 13.1 依赖图
```
Phase 0 (schema)
  ↓
Phase 1 (operations) ──────────────────────────────────────────────────
  ↓                                                                    │
Phase 2 (engine)                                                       │
  ↓                                                                    │
  ├── Phase 3 (右侧面板)  ←─ 需要 engine 的 resolveNodeAppearance     │
  ├── Phase 4 (左侧导航)  ←─ 需要 DataSource 类型                     │
  ├── Phase 5 (画布增强)   ←─ 需要 engine + stateContext               │
  └── Phase 6 (后端适配)   ←─ 需要 schema types + operations            │
  ↓                                                                    │
  ├── Phase 7 (MCP)        ←─ 需要 operations 定义完毕 ────────────────┘
  ├── Phase 8 (预览)       ←─ 需要 engine 更新
  └── Phase 9 (代码生成)   ←─ 需要 schema types
  ↓
Phase 10 (高级功能)
```
### 13.2 推荐并行路径
```
阶段一（串行，2-3 周）:
  Phase 0: design-schema 类型定义 → Phase 1: design-operations 新操作
阶段二（串行，1-2 周）:
  Phase 2: design-engine 五层叠加算法
阶段三（并行，4-6 周）:
  ├── 路径 A: Phase 3 右侧面板（1 人）
  ├── 路径 B: Phase 4 左侧面板 + Phase 5 画布增强（1 人）
  ├── 路径 C: Phase 6 后端适配 + Phase 7 MCP（1 人）
阶段四（并行，2-3 周）:
  ├── 路径 D: Phase 8 预览增强
  ├── 路径 E: Phase 9 代码生成增强
阶段五（1-2 周）:
  Phase 10: 高级功能（根据优先级挑选）
总计估算: 10-16 周（1 人串行）/ 6-10 周（多人并行）
```
### 13.3 里程碑定义
| 里程碑 | 包含 Phase | 核心交付 | 用户感知 |
|--------|-----------|---------|---------|
| **M1: 基础设施就绪** | P0 + P1 + P2 | 新类型 + 新操作 + 五层渲染 | 不可见（内部基础） |
| **M2: 右侧面板 v2** | P3 | 统一面板 + 状态上下文栏 | 编辑体验质变：状态是上下文 |
| **M3: 产品导航器** | P4 + P5 | 三视图 + 数据源管理 + 画布上下文 | 编辑器从画图工具变为产品构建器 |
| **M4: 全链路适配** | P6 + P7 | 后端持久化 + AI 工具 | AI 可操作领域态/环境态/数据源 |
| **M5: 完整预览 + 导出** | P8 + P9 | 预览增强 + 代码生成增强 | 预览完整产品行为 + 导出含状态的代码 |
| **M6: 精品化** | P10 | 高级功能 + 体验细节 | 专业级产品构建器 |
---
## 十四、影响范围总表
| 包/模块 | 主要变化 | 涉及 Phase |
|---------|---------|-----------|
| `design-schema` | 新增 DomainState/Environment/DataSource 类型；删除 GlobalState/DataSet 旧类型；扩展 ComponentNode/Screen/Project | P0 |
| `design-operations` | 新增 ~20 个操作（领域态/环境态/数据源）；删除旧 globalState/dataSet 操作 | P1 |
| `design-engine/styles` | `resolveNodeAppearance()` 五层叠加算法 | P2 |
| `design-engine/renderer` | SchemaRenderer 接收五层状态上下文 | P2 |
| `design-engine/data` | DataContext 从 DataSet → DataSource | P2 |
| `design-engine/preview` | EventExecutionEngine 支持 setDomainState | P2, P8 |
| `design-engine/codegen` | 领域态/环境态/数据源代码生成 | P2, P9 |
| `design-engine/overlay` | 领域态绑定角标 | P2, P5 |
| `design-api` | 新 DataSource API；删除旧 Datasets API；Operation 路由 | P6 |
| `design-mcp` | 领域态/环境态/数据源工具；删除旧 dataset/globalState 工具 | P7 |
| `design_front/stores/editor` | stateContext(五层)、领域态锁定、leftPanelView、数据源状态 | P3, P4 |
| `design_front/panels/RightPanel` | 全新：统一面板 + StateContextBar + 5 个 Section | P3 |
| `design_front/panels/LeftPanel` | 重构为三视图（Page/Element/Data） | P4 |
| `design_front/Canvas` | CanvasContextBar + 状态感知渲染 | P5 |
| `design_front/PreviewBar` | 增强控制条（数据源/领域态/环境态切换） | P8 |
---
## 十五、风险与缓解
| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 五层叠加算法性能 | 大型项目渲染变慢 | 缓存叠加结果，只在状态变化时重算；benchmark 验证 |
| 领域态锁定 UX 复杂度 | 用户困惑 | 醒目的视觉提示（蓝色提示条 + 🔒图标）+ 一键退出 |
| 统一面板过长 | 用户找不到目标区域 | Section 折叠记忆 + 快捷键跳转 + 极简元素自适应精简 |
| 多 Phase 并行的代码冲突 | 合并困难 | Phase 0-2 串行完成后再并行；各 Phase 独立目录/模块 |
---
## 十六、核心设计决策
| 决策 | 选择 | 理由 |
|------|------|------|
| 为什么五层而非三层？ | 五层 | 语义类型×作用范围双维度；taskStatus 和 theme 本质不同 |
| 为什么引入数据源概念？ | 数据源 = 数据 + 生命周期 | 数据获取的结果导致状态变化；统一管理减少概念割裂 |
| 领域态为什么需要锁定机制？ | 解决切换子元素丢上下文 | 没有锁定 → 编辑 5 个子元素的 completed 态需要切换 5 次 |
| 右侧面板为什么去掉 Tab？ | 状态是上下文不是 Tab | Tab 割裂了同一状态下的编辑流；统一面板零切换 |
| 数据面板为什么移到左侧？ | 数据源是页面级概念 | 右侧是节点级编辑面板；数据源与选中哪个元素无关 |
| 为什么直接删除旧类型而非渐进迁移？ | 一步到位 | 概念唯一、代码干净、无维护负担；当前项目数据量可控 |
| 叠加优先级为什么交互最高？ | 符合直觉 | 用户正在 hover → 必须看到 hover 效果 |
| 为什么 Phase 0-2 必须串行？ | 上层依赖下层类型 | Operations 依赖 Schema 类型；Engine 依赖 Operation 语义 |
