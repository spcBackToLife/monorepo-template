# schema-spec：design 阶段字段边界（v3 重写）

> 适用任务：`D-X-integrity`，任何时刻发现想写非法字段也必须加载本文件
>
> **v3 ★ 关键变化**：放开「视觉创作」字段（element/add 视觉容器、装饰节点、materialProjectId、自创任务、视觉 overlay 新增），收紧「业务结构」字段（events / bind / 业务节点结构 / 字段定义）。
>
> 每条字段都明确「✅ 允许」/「❌ 禁止」+ 理由。AI 在落 schema 时若动了禁字段 → service 端拒。

---

## 1. 节点级

| 字段 | v3 | 留给 / 原因 |
|------|:---:|---|
| `node.styles` | ✅ design 写 | A 类一等产物 |
| `node.states[]`（VisualState）| ✅ design 写 | A 类一等产物 |
| `node.meta.design.{summary, rationale, visualSpec, materialSpec}` | ✅ design 写 | B 类 meta |
| `node.meta.design.kind`（v3 新增）| ✅ design 写 | 新增节点必挂 ∈ ['decoration','visual-container','material-frame']|
| **`node.materialProjectId`（v3 ★ 放开）** | ✅ design 写 | 素材已画完 + applyMaterialDesign 自动写入 |
| `node.events[]` | ❌ 禁 | interaction 已写；触发器 + actions 链不动 |
| `node.bind` | ❌ 禁 | interaction 已写；受控双向绑定 |
| `node.repeat` | ❌ 禁 | interaction 已写；列表绑定 |
| `node.visibleWhen` | ❌ 禁 | interaction 已写；动态显隐 |
| `node.props.textContent`（含 `{{state.x}}` 表达式部分）| ❌ 禁 | interaction 已写；纯静态文案 design 可写 |
| `node.activeState` | ❌ 禁 | 由运行时 / activeWhen 切换，design 默认 "default" 不动 |

---

## 2. 节点结构操作（v3 ★ 边界放开 / 收紧分明）

| 操作 | v3 | 条件 / 原因 |
|---|:---:|---|
| **`element/add` 装饰节点** | ✅ | 必挂 `meta.design.kind = 'decoration'` |
| **`element/add` 视觉容器节点** | ✅ | 必挂 `meta.design.kind = 'visual-container'`（如 wrapper-label / TabIndicator / HeroFrame）|
| **`element/add` material-frame 节点** | ✅ | 必挂 `meta.design.kind = 'material-frame'` |
| **`element/wrap` 现有兄弟（视觉容器外壳）** | ✅ | newParent 节点必挂 kind |
| **`element/move` 同父级内移动** | ✅ | 不改变业务结构 |
| `element/move` 跨父级移动业务节点 | ❌ | 推翻业务结构 → 走 UpstreamChallenge |
| `element/remove` 业务节点 | ❌ | 推翻业务设计 → 走 UpstreamChallenge |
| `element/remove` design 自加的视觉 / 装饰节点 | ✅ | 自加自删 |
| `element/change_type` 业务节点 | ❌ | 走 UpstreamChallenge |

---

## 3. 屏级

| 字段 | v3 | 留给 / 原因 |
|------|:---:|---|
| `screen.backgroundColor` | ✅ design 写 | A 类一等字段 |
| `screen.meta.design.{summary, palette, layers, componentBudgets}` | ✅ design 写 | A 类一等产物 |
| **`screen.meta.design.briefing`（v3 新增）** | ✅ design 写 | D-X-briefing 任务产物 |
| **`screen.meta.design.visualConcept`（v3 新增）** | ✅ design 写 | D-X-concept 任务产物 |
| **`screen.meta.design.visualStrategy`（v3 新增）** | ✅ design 写 | D-X-strategy 任务产物 |
| `screen.dataSources` 主体（endpoint / mock / typeDef）| ❌ 禁 | interaction 已写 |
| `screen.dataSources` mock scenario 内 `previewValue` 微调 | ⚠️ 可补 | 设计期预览用 |
| `screen.stateInit.view/data` 字段定义结构 | ❌ 禁 | interaction 已写 |
| `screen.stateInit.view.<field>.previewValue` | ⚠️ 可补 | 设计期预览用 |
| `screen.overlays` 业务 overlay 结构 + showWhen + events | ❌ 禁 | interaction 已建 |
| `screen.overlays` 业务 overlay 内节点的 styles + states + materialSpec | ✅ design 写 | 给视觉规格 |
| **`screen.overlays` 新增视觉 overlay**（v3 ★）| ✅ design 写 | 如 LoadingBackdrop / FocusMask；新 overlay 节点必挂 `kind='visual-container'` |
| `screen.rootNode.events`（screenEnter/Exit）| ❌ 禁 | interaction 已写 |

---

## 4. 项目级

| 字段 | v3 | 留给 / 原因 |
|------|:---:|---|
| `project.theme` / `themeConfig.tokens` | ❌ 禁 | theme-generator 写；缺 token 走 UpstreamChallenge |
| `project.componentAssets` 通用模板 | ✅ design 写 | A 类产物（D-templates 任务）|
| `project.globalOverlays` 业务结构 + showWhen + events | ❌ 禁 | product/interaction 已建 |
| `project.globalOverlays` 内节点 styles + states + materialSpec | ✅ design 写 | 给视觉规格 |

---

## 5. plan 任务

| 操作 | v3 | 条件 |
|---|:---:|---|
| `meta/add_plan_tasks` 自创 D-X-craft-* / D-X-fix-* 任务（v3 ★）| ✅ | 基于 strategy 自创 |
| `meta/update_plan_task` 改自己阶段任务 | ✅ | pending → doing → done/skipped |
| `meta/update_plan_task` 改其他阶段任务 | ❌ | 走 UpstreamChallenge |

---

## 6. 自检 mental check

```
Q1. 我要写的字段在 §1-§5 哪一行？
  → ✅ 行 → 继续 Q2
  → ❌ 行 → 停下，改走 UpstreamChallenge

Q2. element/add 新节点？
  → 是 → 必须挂 meta.design.kind ∈ ['decoration','visual-container','material-frame']

Q3. 改业务节点结构 / events / bind / 数据？
  → 是 → 走 UpstreamChallenge
  → 否 → ✅ 落 schema
```

---

## 7. 红线

- ❌ R-BOUNDARY-01：写了 ❌ 行字段
- ❌ R-KIND-01：element/add 新节点没挂 meta.design.kind
- ❌ R-KIND-02：meta.design.kind 值不在枚举内
- ❌ R-CHALLENGE-MISS-01：发现上游缺东西不挂 challenge 反而当场补
| `node.bind` | ⛔ interaction 已写 | 受控双向绑定 |
| `node.repeat` | ⛔ interaction 已写 | 列表绑定 |
| `node.visibleWhen` | ⛔ interaction 已写 | 动态显隐 |
| `node.props.textContent`（含 `{{state.x}}` 表达式部分）| ⛔ interaction 已写 | 状态驱动文案 |
| `node.materialProjectId` | ⛔ executor 写 | 素材上传产物 |
| `node.activeState` | ⛔ 一般默认 "default"，不动 | 由运行时 / activeWhen 切换 |

## 2. 屏级

| 字段 | 留给 | 原因 |
|------|-----|------|
| `screen.dataSources` 主体 | ⛔ interaction 已写 | mock 场景 / endpoint / typeDef |
| `screen.stateInit.view/data` 主体结构 | ⛔ interaction 已写 | 但可补 `previewValue` |
| `screen.overlays`（结构 + showWhen + events）| ⛔ interaction 已建 | design 可补 overlay 内节点的 styles + visualStates + materialSpec |
| `screen.rootNode.events`（生命周期事件 screenEnter/Exit）| ⛔ interaction 已写 | screen 级生命周期 |

## 3. 项目级

| 字段 | 留给 | 原因 |
|------|-----|------|
| `project.themeConfig` | ⛔ theme-generator 写 | 全部 token / decoration / iconSpec / stateSpec |
| `project.globalOverlays`（结构 + showWhen + events）| ⛔ product/interaction 已建 | design 可补 styles + visualStates + materialSpec |
| `project.globalStateInit` | ⛔ product/interaction 已写 | 全局态变量定义 |
| `project.meta.product` | ⛔ product 已写 | 产品决策 |
| `project.meta.interaction` | ⛔ interaction 已写 | 交互决策 |
| `project.meta.targetUser / coreScenarios / styleDirection / modules / navigation` | ⛔ product 已写 | 产品决策 |

## 4. 重组上游骨架

| 操作 | 是否允许 |
|------|:-------:|
| 在已有屏追加**装饰节点**（PinkCircle / GradientGlow / 角落 blob / 分割装饰 / 品牌点缀）| ✅（4 类装饰，详见 decoration-nodes.md）|
| 修改自己刚建的装饰节点 | ✅ |
| 移动 / 删除 / 包裹 product / interaction 已建的业务骨架节点 | ❌（如发现真有问题，**优先走 UpstreamChallenge 协议**；只有 typo 级真错误走旧式口头退回 product/interaction-designer）|
| 修改 product 已写的 `meta.product.*` | ❌（产品契约不可改）|
| 修改 interaction 已写的 `meta.interaction.*` | ❌（交互契约不可改）|
| 修改 interaction 已写的 events / bind / repeat / visibleWhen | ❌（如发现冲突，走 UpstreamChallenge） |
| 修改 product 已声明的 dataSource.endpoint / typeDef | ❌ |
| 修改 theme-generator 已写的 themeConfig.themes[*] tokens | ❌（缺 token 必须退回 theme-generator 补）|

## 5. 装饰 vs 衍生视图 vs 业务节点（一句话区分）

| 类型 | 谁建 | design 能否新建 |
|------|------|:---------------:|
| 业务骨架节点（FormCard / SubmitBtn / PhoneInput）| product 已建 | ❌ 不能新建（违反结构 → UpstreamChallenge）|
| 衍生视图节点（LoadingOverlay / EmptyState / ErrorBanner / OrderPendingView）| interaction 已建 | ❌ 不能新建（缺 → UpstreamChallenge 让 interaction 补）|
| **装饰节点（PinkCircleDeco / MintLeafDeco / OrnamentSeparator / BrandWatermark）**| design 建 | ✅ 唯一允许新建的 4 类 |

## 6. 派生展示节点 minimal-debug styles 升级（v2.5 ★）

interaction 阶段为派生展示节点（PhoneError / CredentialError / 各 InlineFieldError / 倒计时位 / 按钮内 spinner / 屏内 Toast 文案位）写了一组**最小调试 styles**：

```jsonc
// v2.5 minimal-debug 白名单（仅 7 属性）
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
  color: "$token:colors.error",                       // 替代 #ef4444
  fontSize: "$token:typography.body-sm.fontSize",     // 替代 12px
  lineHeight: "$token:typography.body-sm.lineHeight", // 替代 1.4
  marginTop: "$token:spacing.xs",                     // 替代 4px
  minHeight: "$token:spacing.md",                     // 替代 16px（或保留 16px）
  fontWeight: "$token:typography.body-sm.fontWeight",
  letterSpacing: "0.01em"
}
```

## 7. 自检 mental check（落 schema 前必走 5 问）

写一行 schema 前问自己：

```
1. 这个字段是不是 events / bind / repeat / visibleWhen / textContent 表达式？→ 如果是，停。
2. 这个字段是不是 themeConfig / globalStateInit / globalOverlays 结构？→ 如果是，停。
3. 这个改动是不是动了 product/interaction 已建的节点（move/wrap/remove）→ 如果是，停。**优先走 UpstreamChallenge 协议**。
4. 这个改动是不是动了 dataSources / stateInit 主体结构 → 如果是，停。
5. 这个 token 在 themeConfig 中存在吗？→ 不存在 → 停，先退回 theme-generator 补 token。
```

任何一个"停" → 不写。**优先**走 UpstreamChallenge 协议（带留痕的双向回流）；**只有**上游 typo 级真错误才走旧式口头退回。

## 8. design 阶段允许写的字段汇总（白名单）

```
A 类一等字段：
  ✅ node.styles.*（全量 styles，所有视觉相关属性）
  ✅ node.states[]（VisualState 完整字段）
  ✅ node.animation（CSS 动画配置）
  ✅ node.editorMetadata（编辑期角色提示）
  ✅ node.constraints（布局约束）
  ✅ node.templateRef（模板引用）
  ✅ node.componentBoundary（组件边界标记）
  ✅ node.props.textContent（仅静态文案；不动 interaction 写的表达式部分）
  ✅ screen.backgroundColor
  ✅ screen.stateInit.view.*.previewValue（编辑期预览值）
  ✅ project.componentAssets[]（通用组件模板）
  ✅ 装饰节点新建（element/add，4 类装饰，详见 decoration-nodes.md）

B 类 meta 字段：
  ✅ node.meta.design.{summary, rationale, visualSpec, materialSpec, ref}
  ✅ screen.meta.design.{summary, palette, layers, componentBudgets, ref}
  ✅ node.meta.status.phase = "designed"
  ✅ screen.meta.status.phase = "designed"
  ✅ project.meta.designSystem.*（设计系统基线 / audit 结论 / globalOverlayBudget）
```

## 9. R-* 红线汇总（design 阶段相关）

| 红线 | 触发 | 修复方 |
|------|------|--------|
| R-STATUS-02 | ready.styles=true 但 styles 空 | design |
| R-STATUS-03 | ready.visualStates=true 但 states 空 | design |
| R-PHASE-01 | phase="designed" 但 ready 仍有 false | design |
| R-PLAN-01 | done 任务的 expectedArtifacts 不再满足 | 触发该产物缺失的阶段 |
| R-STRUCTURE-02（待实现）| styles 用硬编码颜色 | design |
| R-MATERIAL-01 / R-MATERIAL-02（待实现）| materialSpec 红线（colorStrategy 缺 / 用硬编码）| design |
| R-VISUALSTATE-01（待实现）| 交互节点缺必要状态 | design |
| R-BUDGET-01 / R-BUDGET-02（待实现）| 视觉预算红线（总 weight > 30 / 主角 > 2）| design |
| R-VIEW-DESIGN-01（待实现）| 衍生视图节点缺 styles/meta.design | design |
| R-GLOBAL-OVERLAY-02（待实现）| overlay rootNode 缺 styles/design | design |
| R-TOKEN-COVERAGE（待实现）| $token: 引用率 < 95% | design |

## 10. 红线汇总

- ❌ 写了 events / bind / repeat / visibleWhen → 越界（interaction 阶段字段）
- ❌ 写了 dataSources mock / endpoint / typeDef → 越界（interaction/product 字段）
- ❌ 写了 themeConfig.themes[*].tokens → 越界（theme-generator 字段）
- ❌ 改了 globalOverlays 结构 / showWhen / events → 越界
- ❌ 删除 / 移动 product 或 interaction 已建节点 → 必须 UpstreamChallenge
- ❌ 写了 materialProjectId → 越界（executor 字段）
- ❌ minimal-debug styles 不升级 token → R-TOKEN-COVERAGE 风险
- ❌ 自造 ThemeConfig 外色值 → 必须先退回 theme-generator 补 token
