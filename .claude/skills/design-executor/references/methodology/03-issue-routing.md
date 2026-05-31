# 方法论 3：发现问题路由表（Issue Routing）

> 适用任务：截图核对发现不一致时；`E-X-handover-check` / `E-X-qa-diff` / `E-integrity` 看到 R-* 错误时
> 核心原则：**executor 不补不修上游字段——发现问题立刻路由到正确的责任方**。
>
> ⚠️ **v3 ★ 重大变化**：v3 起 executor **不再修任何素材层面问题**——色值偏 / 形状错 / 透明通道错 全部退回 design-planner（design 自跑 painter 重画）。本文档已按 v3 重排路由表。

## 1. 路由决策树（v3）

```
发现问题
   ↓
是不是 phase / notes / status 这种 executor 自己的字段写错？
   ├── 是 → executor 自己改（极少；只有 phase=verified 的 status 字段属于 executor）
   └── 否 → 全部退回上游
        ↓
具体路由（见 §2）
```

⚠️ **v3 与 v2 关键差异**：
- v2：素材问题 executor 自己修（material-painter 重画）
- v3：素材问题也退回 design-planner（design 自跑 painter 重画 + 重新 applyMaterialDesign）

## 2. 按问题类型路由（v3）

| 问题现象 | 责任方 | v3 处理 |
|---------|--------|------|
| **素材层面（v3 ★ 全部退回 design）** | | |
| PNG 色值偏差 < 5% | **design-planner** | design 自跑 material-painter 重画 |
| PNG 色值偏差 ≥ 5% | **design-planner** | 同上 |
| PNG 形状不符 composition | **design-planner** | 同上 |
| PNG 透明通道有问题 | **design-planner** | 同上 |
| SVG 路径错 | **design-planner** | 重新生成 svgContent |
| 9 项 background-* 不齐（applyMaterialDesign 漏跑）| **design-planner** | 重新跑 applyMaterialDesign |
| materialProjectId 未绑 | **design-planner** | 退回；design 漏调 painter |
| 重画 ≥ 3 次仍不通过 | **design-planner** | materialSpec 本身可能有问题（如对比度不够）→ 调 spec 再重画 |
| **样式层面** | | |
| 节点 styles 缺关键属性（如缺 padding/radius/shadow）| design-planner | 退回 |
| 硬编码颜色（出现 palette 外色）| design-planner | 退回（D-token-coverage 应在出场前过 95%）|
| 装饰节点抢戏（z-index 错 / 透明度过高）| design-planner | 退回 |
| visualState 缺必要状态（如按钮缺 disabled）| design-planner | 退回 |
| 主角视觉权重不够（与 budget weight 不匹配）| design-planner | 退回 |
| **结构层面** | | |
| 缺装饰节点 / 视觉容器节点（v3 design 创作权范围）| design-planner | 退回 |
| 衍生视图节点缺（如 OrderRefundingView 未建）| interaction-designer | 退回 |
| 业务节点结构错（如 FormCard 内布局乱）| interaction / product | 退回（看哪一阶段）|
| 全局 overlay 节点结构问题 | product / interaction / design | 退回（看是 product 建还是 interaction 补）|
| **交互层面** | | |
| 按钮点击无反应 | interaction-designer | events / actions 漏 → 退回 |
| effect.fetch 无反馈（loading/error 看不到）| interaction-designer | 退回 |
| state.view 漏字段 | interaction-designer | 退回 |
| dataSources mock 场景缺（无法切换 error 态截图）| interaction-designer | 退回 |
| **主题层面** | | |
| 缺 token | theme-generator | 退回 |
| token 引用率 < 95% | design-planner（先尝试用现有 token 替换）/ theme-generator（必要时扩展 token）| 退回 |
| APCA 对比度不够 | theme-generator | 退回（R-THEME-03）|
| **产品层面** | | |
| screen.meta.product.rules 漏边界 | product-analyst | 退回 |
| 业务对象状态机的某个状态没视图 | interaction（先建衍生视图）/ design（再补样式）| 通常退回 interaction |
| globalConcerns 5 类不齐 | product-analyst | 退回 |
| **v3 ★ 视觉概念 / 策略层面** | | |
| screen.meta.design.briefing / visualConcept / visualStrategy 空 | design-planner | 退回（v3 创作流程未跑全）|
| theme.intent.tone 与实际视觉不一致 | design-planner（重新选 theme-element-dict）| 退回 |
| design self-review.md 5 维度有 < 4 分 | design-planner | 退回（design 没出场就交付了）|

## 3. integrity R-* 错误路由（v3）

| R-* | 责任方 | 路由 |
|-----|--------|------|
| R-EVENTS-02 / R-EVENTS-03 | interaction-designer | 退回 |
| R-STATUS-01 | interaction-designer | 退回（events.actions 空壳）|
| R-STATUS-02 | design-planner | 退回（styles 空假完成）|
| R-STATUS-03 | design-planner | 退回（visualStates 空假完成）|
| R-PHASE-01 | 当前阶段 | 当前阶段补 ready 不齐的字段 |
| R-PLAN-01 | 触发产物缺失的阶段 | 看 expectedArtifacts 路径属于哪个阶段 |
| R-THEME-* | theme-generator | 退回 |
| R-STRUCTURE-02 | design-planner | 退回（硬编码颜色）|
| R-MATERIAL-01 / 02 | design-planner | 退回（materialSpec 红线）|
| R-MATERIAL-V3-01 / 02（v3 ★）| design-planner | 退回（design 没自跑 painter / 没绑 materialProjectId）|
| R-VISUALSTATE-01 | design-planner | 退回 |
| R-BUDGET-01 / 02 | design-planner | 退回（视觉预算超）|
| R-VIEW-DESIGN-01 | design-planner | 退回（衍生视图缺 styles）|
| R-GLOBAL-OVERLAY-02 | design-planner | 退回（overlay 缺 styles）|
| R-TOKEN-COVERAGE | design-planner | 退回（< 95%）|
| R-STYLE-TOKEN-01 / 02（v3 ★ B1）| design-planner | 退回（styles 字符串内嵌 $token:）|

## 4. 退回上游的标准操作（v3）

```
1. 在 md 写明：
   - 问题现象（具体到截图 / 节点 / 字段）
   - 责任方（哪个 SKILL）
   - 期望修复（让用户切到对应 SKILL 修什么）

2. v3 ★ 创建退回任务：
   meta/add_plan_tasks {
     scope: 'screen' / 'project',
     screenId: '<X>',
     tasks: [{
       id: 'D-<X>-fix-<节点>-<问题>',     // design 阶段任务
       title: 'design 修 X：<具体>',
       stage: 'design',
       status: 'pending',
       notes: '由 executor <任务名> 退回；详 executor/<X>/<md 路径>'
     }]
   }

3. 当前 executor 任务标 blocked（v3 ★ 推荐）：
   meta/update_plan_task {
     taskId: 'E-<X>-<任务名>',
     patch: { status: 'blocked', blockedReason: '等 design 修 D-<X>-fix-* (N 条)' }
   }

4. 通知用户：
   "发现 X 问题，需要切到 design-planner 修。已挂 D-<X>-fix-<问题> 任务。"

5. 等用户切到 design-planner 修完后：
   - 用户回到 executor 时 query/blocked_tasks 自动看到本任务
   - 重读 schema 验证 design 已修
   - 标 status:'pending' 后继续 / 直接重新核对
```

## 5. 不路由的特殊情况（v3 极少）

某些情况 executor 可以**直接修**（v3 范围很窄）：

```
1. 节点 phase 推进错 → 直接修
   - 漏写 phase=verified → 补
   - notes 写错 → 修

2. 项目级 plan 任务自身的 status / notes → 直接修
```

⚠️ **v3 ★ 已废止的"自己修"清单**（这些 v2 允许，v3 全部退回 design）：
- ❌ ~~material-painter 内部错误重试~~ → v3：design 重试，executor 不动
- ❌ ~~PNG 上传失败重试~~ → v3：design 重试
- ❌ ~~backgroundSize/Position/Repeat 默认值补~~ → v3：design 写

## 6. 不要用 UpstreamChallenge 协议（v2.3）

executor 阶段一般**不发起 UpstreamChallenge**：
- 大部分问题都能通过"退回上游 → 上游小修 → executor 续做"解决
- challenge 是为"分歧"准备的，executor 阶段不该有分歧（上游已定 → 你执行）
- v3 起 executor 几乎只看到 design 漏 / 错 → 全部走"退回 D-X-fix-*"流程，不发 challenge

## 7. md 落地（v3 例）

```markdown
## 不一致项诊断（qa-diff）

### 问题 1：BrandLogo 9 项 background-* 缺 backgroundClip
- 现象：query/screen_schema 看 BrandLogo.styles 只有 8 项 background-*，缺 backgroundClip
- 责任方：design-planner（v3 ★ applyMaterialDesign 漏跑全 9 项）
- 期望：design 重新跑 canvas/export_and_apply 或 applyMaterialDesign 把 9 项补齐
- 退回任务：D-00-login-fix-BrandLogo-bg9
- 当前任务：标 blocked，等 design 修完再核对

### 问题 2：截图主 CTA hover 态没有 translateY
- 现象：design self-review.md 自评"主 CTA hover 5/5（translateY -2px + shadow lg）"，但截图 hover 态无位移
- 责任方：design-planner（v3 ★ visualState 写错或 transform 写错）
- 期望：design 检查 PrimaryButton.states[hover].styles.transform
- 退回任务：D-00-login-fix-PrimaryButton-hover-transform
```

## 8. 红线（v3）

- ❌ executor 自己补 design 漏的字段（events / styles / visualStates / 9 项 background-*）→ 越权
- ❌ executor v3 调 material-painter 子技能 → 越权（已断绝）
- ❌ executor v3 写 node.styles 任何字段 → 越权
- ❌ 看到 R-* 错误不路由不退回，自己想办法绕过 → 假完成
- ❌ 退回上游时不写清楚问题现象 / 期望修复 → 用户切过去不知道修什么
- ❌ 退回上游后不等修复就标 done → 假完成
- ❌ 滥用 UpstreamChallenge（small fix 也发 challenge）→ 摩擦上游 SKILL
