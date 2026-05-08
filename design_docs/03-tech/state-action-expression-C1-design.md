# C.1 子项设计稿 — design-operations v2 重写

> **关联**：[执行计划](./state-action-expression-execution-plan.md) §C.1
> **状态**：实施中（2026-05-08）
> **目标**：把 design-operations 完整迁到 v2 schema/state/action/expression 模型

---

## 一、文件级改动清单

### 删除（v1）
```
src/operations/domain-state.ts        (536 行；v1 五层状态)
src/operations/environment.ts         (429 行；v1 环境态)
src/operations/api-endpoint.ts        (327 行；v1 ApiEndpoint，已被 v2 dataSource.endpoint+mock 取代)
```

### 重命名
```
src/operations/state.ts → src/operations/visual-state.ts   (避免与 v2 `state.*` 屏幕态混淆)
```

### 重写
```
src/types.ts                          (964 行 → 拆成 types/ 目录，按域分文件)
src/operations/event.ts               (改用 v2 ComponentEvent + Action 链；删 addNavigation)
src/operations/data.ts                (612 行 → v2 dataSource：endpoint + mock + 默认参数；删 phase / scenario.data)
src/executor/index.ts                 (1364 行 → 拆成多个 dispatcher，按域)
src/executor/description.ts           (656 行 → 同步新 op 列表)
src/index.ts                          (227 行 → 同步 export)
src/operations/element.ts             (删 setNodeVisibilityWhen，改 setNodeVisibleWhen 表达式)
```

### 新增
```
src/types/operations/element.ts        (元素结构 op 类型)
src/types/operations/style.ts          (样式 op 类型)
src/types/operations/visual-state.ts   (节点视觉态 op 类型)
src/types/operations/event.ts          (v2 事件 op 类型)
src/types/operations/screen.ts         (屏幕 op 类型)
src/types/operations/viewport.ts       (视口 op 类型)
src/types/operations/asset.ts          (资产 op 类型)
src/types/operations/template.ts       (模板 op 类型)
src/types/operations/component-props.ts (组件 props op 类型)
src/types/operations/data-source.ts    (v2 dataSource op 类型)
src/types/operations/screen-state.ts   (屏幕级 ScreenState 操作 op 类型；stateInit / view variables / data)
src/types/operations/global-state.ts   (项目级 globalStateInit op 类型)
src/types/operations/annotation.ts     (批注 op 类型)
src/types/operations/material.ts       (素材 op 类型)
src/types/operations/index.ts          (Operation 联合 + Result + InverseData)

src/operations/screen-state.ts         (ScreenState op 实现：addViewVariable / removeViewVariable / setViewDefault / setViewPreview / addDataInit ...)
src/operations/global-state.ts         (项目级 globalStateInit op 实现)
src/operations/data-source.ts          (重命名自 data.ts，v2 形态)
```

### 不动
```
src/operations/style.ts            (199 行；CSS 操作不涉及 v1)
src/operations/screen.ts           (237 行；屏幕 CRUD)
src/operations/viewport.ts         (72 行)
src/operations/asset.ts            (267 行；模板实例化)
src/operations/template.ts         (176 行)
src/operations/component-props.ts  (163 行)
src/operations/annotation.ts       (123 行)
src/operations/material.ts         (131 行)
src/utils/tree.ts                  (132 行)
src/executor/state.ts              (32 行)
src/executor/history.ts            (91 行)
```

---

## 二、新 op 命名约定

v2 op 类型采用 **dot-namespace**，与 schema 的 Action 命名一致（更清晰区分领域）：

### Element / Tree
- `element.add` / `element.remove` / `element.move` / `element.duplicate`
- `element.insertSubtree` / `element.rename` / `element.changeType`
- `element.wrap` / `element.unwrap` / `element.reorder`
- `element.setLocked` / `element.setRole` / `element.setVisible`
- `element.setVisibleWhen`（v2 新：写入 `node.visibleWhen` 表达式）
- `element.setRepeat`（v2 新：写入 `node.repeat` 表达式）
- `element.setBind`（v2 新：写入 `node.bind`）

### Style
- `style.update` / `style.reset` / `style.batchUpdate`

### VisualState（节点视觉态）
- `visualState.add` / `visualState.remove` / `visualState.update`
- `visualState.setActive`
- `visualState.resetStyle`
- `visualState.setChildVisibility`

### Event（v2 ComponentEvent + Action[]）
- `event.add` / `event.remove` / `event.update`

### Screen / Viewport / Asset / Template / Annotation / Material / Component Props
- 现有命名直接 dot-namespace（`screen.add` 等）

### ScreenState（v2 新增：屏幕级运行态变量定义）
- `screenState.addViewVariable`     — 在 stateInit.view 上加变量定义
- `screenState.removeViewVariable`
- `screenState.updateViewVariable`  — 改 label / defaultValue / enum
- `screenState.setViewPreview`      — 编辑期切预览值
- `screenState.setDataInit`         — 设置 stateInit.data 的某个 key 初始值
- `screenState.removeDataInit`

### GlobalState（v2 新增：项目级全局变量）
- `globalState.addViewVariable` / `globalState.removeViewVariable`
- `globalState.updateViewVariable` / `globalState.setViewPreview`

### DataSource（v2：endpoint+mock 共存）
- `dataSource.add` / `dataSource.remove` / `dataSource.update`
- `dataSource.setEndpoint`            — 改 path/method/query/body
- `dataSource.addMockScenario` / `dataSource.removeMockScenario` / `dataSource.updateMockScenario`
- `dataSource.switchMockScenario`
- `dataSource.setStaticInitial`       — 改 static 数据源 initial 字段
- `dataSource.bindData`               — 等价 element.update，把表达式写到节点 props

---

## 三、删除清单（迁移前后对照）

| v1 op | v2 替代 |
|---|---|
| `addDomainState` / `removeDomainState` / `updateDomainState` | 改用 `screenState.addViewVariable` 等（语义相近：从枚举 + 默认值变成自由 JSON + 默认值） |
| `setDomainStatePreview` | `screenState.setViewPreview` |
| `addDomainStateBinding` / `updateDomainStateBinding` / `removeDomainStateBinding` | **删除**：v2 不用 binding，改用 styles/props 中的 `{{ }}` 表达式或 `visibleWhen` 直接表达 |
| `addEnvironmentState` / 等 | 项目级走 `globalState.addViewVariable` 等 |
| `addEnvironmentBinding` / 等 | **删除**：同上 |
| `apiEndpoint.*`（addApiEndpoint / removeApiEndpoint / updateApiEndpoint / addMockScenario / 等） | **删除**：合并到 `dataSource.*` |
| `switchDataSourcePhase` | **删除**：v2 用 `state.effects[id].status` 在运行时反映 |
| `addDataScenario` / `updateDataScenario` / `removeDataScenario` / `switchDataScenario` | `dataSource.addMockScenario` 等（统一到 dataSource.mock 命名空间） |
| `setActiveState`（节点视觉态） | `visualState.setActive`（含 schema 字段重命名） |
| `setNodeVisibilityWhen`（变量名 + 等值） | `element.setVisibleWhen`（表达式） |
| `addNavigation` | **删除**：直接用 `event.add` 加一个 trigger=click + actions=[{type:'nav.go'}] 的事件 |
| `bindData` | **删除**：直接用 `element.updateProps`（component-props 的 `updateComponentProps`）写 `{{ }}` 表达式即可 |

---

## 四、实施顺序

为避免 typecheck 一直全断，按依赖顺序：

1. **新建 types/operations/* 文件** —— 各域 op 类型 + 删除 v1 op（types.ts 拆分入此目录，types.ts 改成 re-export）
2. **改造无 v1 痕迹的 ops**（element / style / screen / viewport / asset / template / component-props / annotation / material）：仅改 import + op type 名（不变行为）
3. **重写 event.ts**：用 v2 Action 联合（ComponentEvent.actions 类型已变）
4. **重写 data.ts → data-source.ts**：v2 dataSource 模型
5. **新增 screen-state.ts / global-state.ts**：v2 ScreenState / GlobalState 操作
6. **重命名 state.ts → visual-state.ts**：op 名加 visualState. 前缀
7. **删除 domain-state.ts / environment.ts / api-endpoint.ts**
8. **executor/index.ts 重写**：拆成 `executor/dispatch/*`（按域分发）+ `executor/inverse/*`（按域 undo）；index.ts 主类只挂粘合
9. **executor/description.ts 同步**：新 op 列表
10. **src/index.ts 同步导出**
11. **typecheck + build 全过**
12. **commit**

---

## 五、验收清单

- [ ] `pnpm --filter @globallink/design-operations typecheck` 通过
- [ ] `pnpm --filter @globallink/design-operations build` 产物 dist/ 无 error
- [ ] `grep -rn "domainState\|environmentState\|apiEndpoint\|switchDataSourcePhase\|visibilityWhen\|addNavigation\|bindData" features/design-operations/src` 应零匹配
- [ ] OperationExecutor.execute 对所有新 v2 op 都能 dispatch（含 undo）
- [ ] `getAvailableOperations()` 返回的 op 列表中没有任何 v1 名字
- [ ] 单文件不超过 300 行（types/operations/*）；executor/dispatch 拆分后单文件 <400 行

---

## 六、commit message

```
refactor(operations): rewrite all ops for v2 schema

- 删除 v1 op 实现：domain-state / environment / api-endpoint
- 重命名 operations/state.ts → visual-state.ts 避开 v2 ScreenState 命名
- types.ts 按域拆分到 types/operations/*（每文件 < 200 行）
- 全部 op type 名 dot-namespace 化（element.add / style.update / visualState.setActive / ...）
- 新增 screen-state.ts / global-state.ts：v2 ScreenStateInit / GlobalStateInit 操作
- 重写 data.ts → data-source.ts：v2 endpoint+mock 共存模型；删 phase / scenario.data
- 重写 event.ts：v2 Action 联合作为 actions；删 addNavigation
- 重写 element.ts：删 setNodeVisibilityWhen，新增 setVisibleWhen / setRepeat / setBind
- 拆分 executor/index.ts 1364 行 → executor/dispatch/* + executor/inverse/* （单文件 <400 行）
- 同步 executor/description.ts 新 op 列表
```
