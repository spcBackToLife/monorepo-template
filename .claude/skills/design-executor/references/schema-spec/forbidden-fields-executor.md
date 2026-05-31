# schema-spec：严禁本阶段写的字段（v3 重写）

> 适用任务：`E-X-handover-check` / `E-X-qa-diff` / `E-X-verified` / `E-integrity`，任何时刻发现想写非法字段必须加载
>
> ⚠️ **v3 ★ 重大变化**：v3 起 executor **不再写素材相关字段**——materialProjectId / 9 项 background-* / props.src / svgContent **全部归 design**。executor 实际允许写的只剩 `meta.status.{phase, ready, notes}` 和 plan 任务的 status / notes。

---

## 0. v3 一览（"我能写什么？"）

```
v3 executor 实际允许写：
  ✅ node.meta.status.{phase, ready, notes}     // 唯一节点级写
  ✅ screen.meta.status.{phase, ready, notes}   // 唯一屏级写
  ✅ project.meta.plan 中 stage='executor' 任务的 status / notes
  ✅ meta/add_plan_tasks 创建 stage='design' 的 D-X-fix-* 任务（退回工具）

v3 executor 严禁写：
  ⛔ node.styles.* 任何字段                      // v3 ★ 全部归 design（含 9 项 background-*）
  ⛔ node.materialProjectId                      // v3 ★ 归 design
  ⛔ node.props.src / svgContent / textContent / 任何 props
  ⛔ node.events / bind / repeat / visibleWhen / states / animation
  ⛔ node.meta.* （除 status）
  ⛔ screen.meta.* （除 status）
  ⛔ screen.dataSources / stateInit / overlays / backgroundColor
  ⛔ project.themeConfig / globalOverlays / globalStateInit / componentAssets
  ⛔ meta.status.ready.*                          // 由 integrity 自动核验，不允许人工自报
```

---

## 1. 节点级（写到这些字段都是错）

| 字段 | 留给 | 原因 / v3 备注 |
|------|-----|------|
| `node.events[]` | ⛔ interaction | 触发器 + actions 链 |
| `node.bind` | ⛔ interaction | 受控双向绑定 |
| `node.repeat` | ⛔ interaction | 列表绑定 |
| `node.visibleWhen` | ⛔ interaction | 动态显隐 |
| `node.props.textContent` | ⛔ product (静态) / interaction (动态) | 静态由 product 写、动态表达式由 interaction 写 |
| `node.props.src`（**v3 ★ 收紧**）| ⛔ design | v3 起 img 节点素材应用归 design |
| `node.props.svgContent`（**v3 ★ 收紧**）| ⛔ design | v3 起 SVG 内联归 design |
| `node.props.*` 其他 | ⛔ product / interaction | 不动 |
| `node.styles.*`（**v3 ★ 全部禁**）| ⛔ design | v3：含全部 background-* / color / padding / 任何字段 |
| `node.materialProjectId`（**v3 ★ 收紧**）| ⛔ design | v3：design 自跑 painter 后绑定 |
| `node.states[]`（VisualState）| ⛔ design | 越权 |
| `node.activeState` | ⛔ design / 运行时 | 不动 |
| `node.animation` | ⛔ design | 越权 |
| `node.editorMetadata` | ⛔ design | 编辑期角色提示 |
| `node.constraints` | ⛔ design | 布局约束 |
| `node.templateRef` | ⛔ design | 模板引用 |
| `node.componentBoundary` | ⛔ design | 组件边界标记 |
| `node.layoutHint` | ⛔ design | 布局提示 |
| `node.meta.product.*` | ⛔ product | 产品决策 |
| `node.meta.interaction.*` | ⛔ interaction | 交互决策 |
| `node.meta.design.*` | ⛔ design | 视觉决策（含 v3 design.kind）|
| `node.meta.status.ready.*` | ⛔ integrity 自动核验 | 不允许人工自报 |

## 2. 屏级

| 字段 | 留给 | 原因 |
|------|-----|------|
| `screen.dataSources` | ⛔ interaction | mock 场景 / endpoint / typeDef |
| `screen.stateInit.view/data` | ⛔ interaction | UI 临时态 |
| `screen.overlays`（结构 + showWhen + events）| ⛔ product / interaction / design | 不动 |
| `screen.backgroundColor` | ⛔ design | 视觉决策 |
| `screen.meta.product.*` | ⛔ product | |
| `screen.meta.interaction.*` | ⛔ interaction | |
| `screen.meta.design.*`（含 v3 briefing/visualConcept/visualStrategy）| ⛔ design | |
| `screen.meta.status.ready.*` | ⛔ integrity 自动核验 | 不允许人工自报 |

## 3. 项目级

| 字段 | 留给 |
|------|-----|
| `project.themeConfig` | ⛔ theme-generator |
| `project.globalOverlays`（结构 + showWhen + events）| ⛔ product / interaction / design |
| `project.globalStateInit` | ⛔ product / interaction |
| `project.componentAssets` | ⛔ design |
| `project.meta.{targetUser,coreScenarios,styleDirection,modules,navigation,globalConcerns}` | ⛔ product |
| `project.meta.designSystem.*` | ⛔ design |
| `project.meta.plan` | ⛔ 各阶段挂自己阶段的任务，executor 只挂 stage='executor' 自己的；v3 例外：可挂 stage='design' 的 D-X-fix-* 退回任务 |

## 4. 重组节点（v3 ★ 全部禁）

| 操作 | v3 是否允许 |
|------|:-------:|
| `element/add` 业务节点 / 衍生视图节点 / 装饰节点 / 视觉容器节点 | ❌ 越权（应在 product / interaction / design 阶段建）|
| `element/move` / `wrap` / `unwrap` / `remove` | ❌ 越权 |
| `element/add` SVG 内联节点 | ❌ **v3 ★ 收紧**（v2 允许；v3 归 design）|
| `style/update` / `style/reset` / `style/batch_update` | ❌ **v3 ★ 全部禁**（v2 允许素材应用相关；v3 全归 design）|
| `visual_state/*` | ❌ 越权（design）|
| `event/*` | ❌ 越权（interaction）|
| `meta/set_node_status` 推进 phase=verified | ✅ v3 唯一允许的写入 |
| `meta/update_plan_task` 自己阶段 | ✅ v3 允许 |
| `meta/add_plan_tasks` 创建 D-X-fix-* | ✅ **v3 ★ 新增**：退回 design 的工具 |

## 5. styles 越权细分（v3 ★ 全部 ❌）

executor v3 **绝不**改 styles 任何字段：

| styles 属性 | v2 是否允许 | v3 是否允许 |
|------------|:---:|:---:|
| `backgroundImage` | ✅（material-painter 自动写）| ❌ **v3 ★ 改 design 写** |
| `backgroundSize` / `backgroundPosition` / `backgroundRepeat` | ⚠️（仅当 design 漏写时补默认值）| ❌ **v3 ★ 改 design 写** |
| `backgroundColor` / `backgroundOrigin` / `backgroundClip` / `backgroundAttachment` / `imageRendering` | ❌ | ❌ **v3 ★ 同样禁** |
| `color` / `width` / `height` / `padding` / `margin` / `border*` / `boxShadow` / `transform` / `transition` / `display` / `flex*` / `font*` / `opacity` / `pointerEvents` / 其他任何 | ❌ | ❌ |

发现 design 漏写或写错 styles → **v3 ★ 一律退回 design-planner**（不补 default 值，不亲自补）。

## 6. props 越权细分（v3 ★ 全部 ❌）

| props 属性 | v2 是否允许 | v3 是否允许 |
|------------|:---:|:---:|
| `src`（img）| ✅ | ❌ **v3 ★ 改 design 写** |
| `svgContent` | ✅ | ❌ **v3 ★ 改 design 写** |
| `textContent` 静态 | ❌（product）| ❌ |
| `textContent` 动态 | ❌（interaction）| ❌ |
| `alt` / `title` / 其他 | ❌（product）| ❌ |

## 7. 子技能调用（v3 ★ 收紧）

| 子技能 | v2 | v3 |
|--------|:---:|:---:|
| `material-painter` | ✅（executor 唯一调用方）| ❌ **v3 ★ 已断绝**（归 design-planner）|
| `page-builder` | ❌（v2 起已废）| ❌ |

## 8. 自检 mental check（v3 ★ 落 schema 前必走 6 问）

写一行 schema 前问自己：

```
1. 这个字段是不是 events / bind / repeat / visibleWhen / textContent？→ 如果是，停。
2. 这个字段是不是 design 的 meta / componentBudgets / layers / palette / briefing / visualConcept / visualStrategy？→ 如果是，停。
3. 这个字段是不是 styles 任何字段（含 background-* / props.src / svgContent / materialProjectId）？→ 如果是，停。
4. 这个字段是不是 ready.* / 跨阶段 meta？→ 如果是，停。
5. 这个字段是不是 themeConfig / globalOverlays 结构？→ 如果是，停。
6. 这个操作是不是 Skill('material-painter')？→ 如果是，停。
```

任何一个"停" → 不写。**找到对应 SKILL 退回**（v3 ★：素材问题也走"退回 design"路径，不在本阶段补）。

## 9. v3 实际允许写的字段（白名单极窄）

```
A 类一等字段：
  （v3 ★ 完全无；v2 的 backgroundImage/Size/Position/Repeat/props.src/materialProjectId 全部归 design）

B 类 meta 字段（唯一允许）：
  ✅ node.meta.status.phase = "verified"
  ✅ node.meta.status.notes
  ✅ screen.meta.status.phase = "verified"
  ✅ screen.meta.status.notes

plan 任务（v3 唯一可挂的跨阶段任务）：
  ✅ project.meta.plan / screen.meta.plan 中 stage='executor' 的任务（自己阶段）
  ✅ stage='design' 的 D-X-fix-* 任务（v3 ★ 退回工具）

⛔ 严禁手动设置 meta.status.ready.*
```

## 10. R-* 红线汇总（executor 阶段相关）

| 红线 | 触发 | 修复方 |
|------|------|--------|
| R-PHASE-01 | phase=verified 但 ready 仍有 false | 当前阶段（按 ready 分项路由）|
| R-PLAN-01 | done 任务的 expectedArtifacts 不再满足 | 触发产物缺失的阶段 |
| 上游 R-* | 入场前应已为 0；如出现 → 路由 | 退回对应 SKILL |
| **R-MATERIAL-V3-01 / 02（v3 ★）** | design 没自跑 painter / 没绑 materialProjectId | 退回 design |

## 11. 红线汇总（v3）

- ❌ 写了 events / bind / repeat / visibleWhen / textContent → 越权
- ❌ **v3 ★ 写了 styles 任何字段（含 background-*）** → 越权
- ❌ **v3 ★ 写了 props.src / svgContent / materialProjectId** → 越权
- ❌ 写了 visualState / animation → 越权
- ❌ 写了 design / interaction / product 的 meta 字段 → 越权
- ❌ 手动设置 ready.* → integrity 戳穿（R-PHASE-01）
- ❌ 改 themeConfig / globalOverlays 结构 → 越权
- ❌ element/add 业务节点 / 衍生视图节点 / 装饰节点 / 视觉容器节点 → 越权
- ❌ **v3 ★ 调 material-painter 子技能** → 越权（已断绝）
- ❌ "差不多就给用户看" → 0 error 是硬约束
- ❌ 跳过截图核对就标 verified → 漏验证
- ❌ 跳过 5 维度对账（识别 / 层次 / 状态 / 契合 / 情绪）就标 verified → 漏验证
