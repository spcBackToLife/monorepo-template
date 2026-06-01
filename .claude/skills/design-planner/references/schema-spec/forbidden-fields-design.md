# schema-spec：design 阶段字段边界

> 适用任务：`D-X-integrity`,任何时刻发现想写非法字段也必须加载本文件
>
> 每条字段都明确「✅ 允许」/「❌ 禁止」+ 理由。AI 在落 schema 时若动了禁字段 → service 端拒。

---

## 0. 红线总表

| 红线 | 触发条件 | 涉及字段 |
|---|---|---|
| **R-GOAL-COUNT** | designGoals 数量 < 3 或 > 7 | screen.meta.design.designGoals |
| **R-GOAL-STATEMENT** | designGoal.statement 不含动词+主体+视觉机制 | designGoals[].statement |
| **R-GOAL-CRITERIA** | successCriteria 含抽象描述 / < 3 条 | designGoals[].successCriteria |
| **R-GOAL-DECOMPOSE** | involvedElements < 2 / 主角 = 0 | goalElementMap[].involvedElements |
| **R-GOAL-DIMENSION** | changes 单维度 | goalElementMap[].changes |
| **R-GOAL-COVERAGE** | goal 涉及元素被 craft 没改动 | (运行时,跑 craft 任务时) |
| **R-ORPHAN-DECORATION** | 装饰/视觉容器/素材帧节点无 servingGoals | node.meta.design.servingGoals |
| **R-INVALID-KIND** | 设计阶段新建节点未挂 kind | node.meta.design.kind |
| **R-INVALID-GOAL-REF** | servingGoals 引用的 goalId 不存在 | node.meta.design.servingGoals |
| **R-DECORATION-MULTI-FAMILY** | 一屏内出现 ≥ 2 装饰族 | screen.meta.design.visualStrategy.decorationSystem.family |
| **R-LEGACY-TASK-CREATE** | 创建按字段类别任务（D-X-styles/D-X-states/D-X-materials/D-X-decorations）| meta/add_plan_tasks |
| **R-STATUS-02** | ready.styles=true 但 styles 空 | screen.meta.status |
| **R-STATUS-03** | ready.visualStates=true 但 states 空 | screen.meta.status |
| **R-PHASE-01** | phase="designed" 但 ready 仍有 false | screen.meta.status |
| **R-STRUCTURE-02** | styles 用硬编码颜色 | node.styles |
| **R-MATERIAL-01 / 02** | materialSpec 红线（colorStrategy 缺 / 用硬编码）| node.meta.design.materialSpec |
| **R-VISUALSTATE-01** | 交互节点缺必要状态 | node.states |
| **R-BUDGET-01 / 02** | 视觉预算红线（总 weight > 30 / 主角 > 2）| componentBudgets |
| **R-VIEW-DESIGN-01** | 衍生视图节点缺 styles/meta.design | node |
| **R-GLOBAL-OVERLAY-02** | overlay rootNode 缺 styles/design | globalOverlays |
| **R-TOKEN-COVERAGE** | $token: 引用率 < 95% | 全屏 styles |
| **R-BOUNDARY-01** | 写了 ❌ 行字段 | 任意 |
| **R-CHALLENGE-MISS-01** | 发现上游缺东西不挂 challenge 反而当场补 | - |

---

## 1. 节点级字段

| 字段 | 允许 | 留给 / 原因 |
|------|:---:|---|
| `node.styles` | ✅ design 写 | A 类一等产物 |
| `node.states[]`（VisualState）| ✅ design 写 | A 类一等产物 |
| `node.meta.design.{summary, rationale, visualSpec, materialSpec}` | ✅ design 写 | B 类 meta |
| `node.meta.design.kind` | ✅ design 写 | 新增节点必挂 ∈ ['decoration','visual-container','material-frame'];未挂 → R-INVALID-KIND |
| `node.meta.design.servingGoals` | ✅ design 写 | 装饰/视觉容器/素材帧节点必挂; servingGoals 引用 designGoals[].id; 空或无效 → R-ORPHAN-DECORATION / R-INVALID-GOAL-REF |
| `node.materialProjectId` | ✅ design 写 | 素材已画完 + applyMaterialDesign 自动写入 |
| `node.animation` | ✅ design 写 | CSS 动画配置 |
| `node.editorMetadata` | ✅ design 写 | 编辑期角色提示 |
| `node.constraints` | ✅ design 写 | 布局约束 |
| `node.templateRef` | ✅ design 写 | 模板引用 |
| `node.componentBoundary` | ✅ design 写 | 组件边界标记 |
| `node.props.textContent` 静态部分 | ✅ design 写 | 仅静态文案；含 `{{state.x}}` 表达式部分由 interaction 写,design 不动 |
| `node.events[]` | ❌ 禁 | interaction 已写；触发器 + actions 链不动 |
| `node.bind` | ❌ 禁 | interaction 已写；受控双向绑定 |
| `node.repeat` | ❌ 禁 | interaction 已写；列表绑定 |
| `node.visibleWhen` | ❌ 禁 | interaction 已写；动态显隐 |
| `node.activeState` | ❌ 禁 | 由运行时 / activeWhen 切换，design 默认 "default" 不动 |

---

## 2. 节点结构操作

| 操作 | 允许 | 条件 / 原因 |
|---|:---:|---|
| `element/add` 装饰节点 | ✅ | 必挂 `meta.design.kind = 'decoration'` |
| `element/add` 视觉容器节点 | ✅ | 必挂 `meta.design.kind = 'visual-container'`（如 wrapper-label / TabIndicator / HeroFrame）|
| `element/add` material-frame 节点 | ✅ | 必挂 `meta.design.kind = 'material-frame'` |
| `element/wrap` 现有兄弟（视觉容器外壳）| ✅ | newParent 节点必挂 kind |
| `element/move` 同父级内移动 | ✅ | 不改变业务结构 |
| `element/remove` design 自加的视觉 / 装饰节点 | ✅ | 自加自删 |
| `element/move` 跨父级移动业务节点 | ❌ | 推翻业务结构 → 走 UpstreamChallenge |
| `element/remove` 业务节点 | ❌ | 推翻业务设计 → 走 UpstreamChallenge |
| `element/change_type` 业务节点 | ❌ | 走 UpstreamChallenge |

---

## 3. 屏级字段

| 字段 | 允许 | 留给 / 原因 |
|------|:---:|---|
| `screen.backgroundColor` | ✅ design 写 | A 类一等字段 |
| `screen.meta.design.{positioning, designGoals, goalElementMap, visualStrategy}` | ✅ design 写 | A 类一等产物（目标驱动契约链）|
| `screen.meta.design.{summary, palette, layers, componentBudgets}` | ✅ design 写 | A 类一等产物 |
| `screen.stateInit.view.<field>.previewValue` | ⚠️ 可补 | 设计期预览用 |
| `screen.dataSources` mock scenario 内 `previewValue` 微调 | ⚠️ 可补 | 设计期预览用 |
| `screen.overlays` 业务 overlay 内节点的 styles + states + materialSpec | ✅ design 写 | 给视觉规格 |
| `screen.overlays` 新增视觉 overlay（如 LoadingBackdrop / FocusMask）| ✅ design 写 | 新 overlay 节点必挂 `kind='visual-container'` |
| `screen.dataSources` 主体（endpoint / mock / typeDef）| ❌ 禁 | interaction 已写 |
| `screen.stateInit.view/data` 字段定义结构 | ❌ 禁 | interaction 已写 |
| `screen.overlays` 业务 overlay 结构 + showWhen + events | ❌ 禁 | interaction 已建 |
| `screen.rootNode.events`（screenEnter/Exit）| ❌ 禁 | interaction 已写 |

---

## 4. 项目级字段

| 字段 | 允许 | 留给 / 原因 |
|------|:---:|---|
| `project.componentAssets` 通用模板 | ✅ design 写 | A 类产物（D-templates 任务）|
| `project.globalOverlays` 内节点 styles + states + materialSpec | ✅ design 写 | 给视觉规格 |
| `project.meta.designSystem.*` | ✅ design 写 | 设计系统基线 / audit 结论 / globalOverlayBudget |
| `project.theme` / `themeConfig.tokens` | ❌ 禁 | theme-generator 写；缺 token 走 UpstreamChallenge |
| `project.globalOverlays` 业务结构 + showWhen + events | ❌ 禁 | product/interaction 已建 |
| `project.globalStateInit` | ❌ 禁 | product/interaction 已写 |
| `project.meta.product` / `meta.interaction` | ❌ 禁 | 上游决策 |
| `project.meta.targetUser / coreScenarios / styleDirection / modules / navigation` | ❌ 禁 | product 已写 |

---

## 5. plan 任务

| 操作 | 允许 | 条件 |
|---|:---:|---|
| `meta/add_plan_tasks` 自创 D-X-G<N>-craft 任务 | ✅ | 基于 visualStrategy 自创目标驱动 craft 任务 |
| `meta/update_plan_task` 改自己阶段任务 | ✅ | pending → doing → done/skipped |
| `meta/update_plan_task` 改其他阶段任务 | ❌ | 走 UpstreamChallenge |
| 自创按字段类别任务（D-X-styles/D-X-states/D-X-materials/D-X-decorations）| ❌ | R-LEGACY-TASK-CREATE 拒；只能按 goal 拆 craft |

---

## 6. 装饰 vs 衍生视图 vs 业务节点（一句话区分）

| 类型 | 谁建 | design 能否新建 |
|------|------|:---------------:|
| 业务骨架节点（FormCard / SubmitBtn / PhoneInput）| product 已建 | ❌ 不能新建（违反结构 → UpstreamChallenge）|
| 衍生视图节点（LoadingOverlay / EmptyState / ErrorBanner / OrderPendingView）| interaction 已建 | ❌ 不能新建（缺 → UpstreamChallenge 让 interaction 补）|
| **装饰节点（PinkCircleDeco / MintLeafDeco / OrnamentSeparator / BrandWatermark）**| design 建 | ✅ 唯一允许新建,必挂 kind+servingGoals |
| **视觉容器节点（PolicyCheckLabel / TabIndicator / HeroFrame）**| design 建 | ✅ 必挂 kind='visual-container'+servingGoals |
| **素材帧节点**| design 建 | ✅ 必挂 kind='material-frame'+servingGoals |

---

## 7. 派生展示节点 minimal-debug styles 升级

interaction 阶段为派生展示节点（PhoneError / CredentialError / 各 InlineFieldError / 倒计时位 / 按钮内 spinner / 屏内 Toast 文案位）写了一组**最小调试 styles**：

```jsonc
// minimal-debug 白名单（仅 7 属性）
{
  color: "#ef4444",
  fontSize: "12px",
  lineHeight: "1.4",
  marginTop: "4px",
  marginBottom: "4px",
  minHeight: "16px",
  padding: "2px 4px"
}
```

**design 阶段的职责**：
- 把这些硬编码升级为 `$token:` 引用
- 补完整 styles 维度（如加 fontWeight / letterSpacing 等）
- **不要因为 styles 已有内容就跳过**——design 必须把 token 化补完整

```jsonc
// design 阶段升级后
node.styles = {
  color: "$token:colors.error",
  fontSize: "$token:typography.body-sm.fontSize",
  lineHeight: "$token:typography.body-sm.lineHeight",
  marginTop: "$token:spacing.xs",
  minHeight: "$token:spacing.md",
  fontWeight: "$token:typography.body-sm.fontWeight",
  letterSpacing: "0.01em"
}
```

---

## 8. 自检 mental check

落 schema 前问自己：

```
1. 这个字段是不是 events / bind / repeat / visibleWhen / textContent 表达式？→ 如果是，停。
2. 这个字段是不是 themeConfig / globalStateInit / globalOverlays 结构？→ 如果是，停。
3. 这个改动是不是动了 product/interaction 已建的节点（move/wrap/remove）→ 如果是，停。**优先走 UpstreamChallenge 协议**。
4. 这个改动是不是动了 dataSources / stateInit 主体结构 → 如果是，停。
5. 这个 token 在 themeConfig 中存在吗？→ 不存在 → 停，先退回 theme-generator 补 token。
6. element/add 新节点 → 必须挂 meta.design.kind ∈ ['decoration','visual-container','material-frame'] + servingGoals。
7. 自创任务 → 必须形如 D-X-G<N>-craft；不能 D-X-styles / D-X-states / D-X-materials / D-X-decorations。
```

任何一个"停" → 不写。**优先**走 UpstreamChallenge 协议（带留痕的双向回流）；**只有**上游 typo 级真错误才走旧式口头退回。

---

## 9. design 阶段允许写的字段汇总（白名单）

```
A 类一等字段：
  ✅ node.styles.*（全量 styles）
  ✅ node.states[]（VisualState 完整字段）
  ✅ node.animation
  ✅ node.editorMetadata
  ✅ node.constraints
  ✅ node.templateRef
  ✅ node.componentBoundary
  ✅ node.props.textContent（仅静态文案；不动 interaction 写的表达式部分）
  ✅ node.materialProjectId（applyMaterialDesign 自动写入）
  ✅ screen.backgroundColor
  ✅ screen.stateInit.view.*.previewValue
  ✅ project.componentAssets[]
  ✅ 装饰 / 视觉容器 / material-frame 节点新建（element/add，必挂 kind + servingGoals）

B 类 meta 字段：
  ✅ node.meta.design.{summary, rationale, visualSpec, materialSpec, kind, servingGoals, ref}
  ✅ screen.meta.design.{positioning, designGoals, goalElementMap, visualStrategy, summary, palette, layers, componentBudgets, ref}
  ✅ node.meta.status.phase = "designed"
  ✅ screen.meta.status.phase = "designed"
  ✅ project.meta.designSystem.*
```

---

## 10. 红线汇总

- ❌ 写了 events / bind / repeat / visibleWhen → 越界（interaction 阶段字段）
- ❌ 写了 dataSources mock / endpoint / typeDef → 越界（interaction/product 字段）
- ❌ 写了 themeConfig.themes[*].tokens → 越界（theme-generator 字段）
- ❌ 改了 globalOverlays 结构 / showWhen / events → 越界
- ❌ 删除 / 移动 product 或 interaction 已建节点 → 必须 UpstreamChallenge
- ❌ minimal-debug styles 不升级 token → R-TOKEN-COVERAGE 风险
- ❌ 自造 ThemeConfig 外色值 → 必须先退回 theme-generator 补 token
- ❌ R-KIND-01：element/add 新节点没挂 meta.design.kind
- ❌ R-KIND-02：meta.design.kind 值不在枚举内
- ❌ R-CHALLENGE-MISS-01：发现上游缺东西不挂 challenge 反而当场补
- ❌ 自创按字段类别任务 → R-LEGACY-TASK-CREATE
