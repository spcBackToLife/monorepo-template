# 严禁本阶段写的字段（边界表）

theme-generator 的职责非常聚焦——**只写 `project.themeConfig`，其他所有字段都属于下游**。任何越界写入都视为错误。

## 节点级（一律不写）

| 字段 | 留给 | 原因 |
|------|-----|------|
| `node.styles.*` | design | 视觉决策由 design-planner 基于 token 引用做出 |
| `node.states[]`（VisualState）| design | hover/pressed/focus 等视觉态属于 design |
| `node.events[]` / `bind` / `repeat` / `visibleWhen` | interaction | 交互行为 |
| `node.props.*` | product / interaction | 内容由 product 写、表达式由 interaction 写 |
| `node.materialProjectId` | executor | 素材绑定产物 |
| `node.editorMetadata` / `constraints` / `templateRef` / `componentBoundary` | design | 设计期元信息 |
| 任何 `element/add` / `element/remove` / `element/move` 等结构操作 | product / design | theme 不重组节点树 |

## 屏级（一律不写）

| 字段 | 留给 |
|------|-----|
| `screen.backgroundColor` | design |
| `screen.overlays` | interaction |
| `screen.dataSources` | product / interaction |
| `screen.stateInit` | product / interaction |
| `screen.rootNode` 任何修改 | product / interaction / design |
| 任何 `screen/add` / `screen/remove` 等 | product |

## 项目级（除 themeConfig 外都不写）

| 字段 | 留给 |
|------|-----|
| `project.meta.targetUser / coreScenarios / styleDirection / constraints / modules / navigation` | product |
| `project.meta.globalConcerns` | product |
| `project.meta.plan`（除 add T1~T7 自身的任务）| product / interaction / design |
| `project.globalStateInit` | product / interaction |
| `project.globalOverlays` | product / interaction |
| `project.componentAssets` | design |
| `project.viewport` 等 | design / product |

## ThemeConfig 内部也禁止越界写法

- ❌ token 值用裸数字/字符串而非 hex/HSL/CSS 标准值
- ❌ themes[] 写完整 token（应只写 override 差异）
- ❌ tokens 中混入未定义的"私货"字段（如 `customColors.brand1`）
- ❌ decorationRules 内嵌 React 组件 / 函数 / 表达式（必须是纯数据）
- ❌ 在 intent.summary 里塞所有维度（不是 dump 字段，是 ≤30 字定性）

## 触发越界时的正确处理

发现自己想写"node 上 hover 的颜色变化" / "某屏 backgroundColor" / "某模块的 modules 划分"等下游字段时，**立刻停止**，回到 SKILL.md §5.3 阶段边界红线，把对应需求写到 md 里作为"建议"，等下游阶段执行时参考——而不是越界落 schema。

```
❌ AI 越界："这个按钮在 hover 时变粉，我顺手在 button node 写了 styles.hover"
✅ AI 正确："stateSpec.hover.lightnessChange = +6% 已写入主题；
   下游 design-planner 看到 stateSpec 后会自然在每个按钮 visualState 里 +6% L。"
```
