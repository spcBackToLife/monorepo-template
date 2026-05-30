> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-global-coverage
> 对应 schema 字段：—（核对型任务，无 schema 落库；缺口走 meta/add_plan_tasks 追加任务）

# Step I-global-coverage — 全局态跨屏覆盖核对

> 详细方法见 `methodology/06-three-axis-coverage.md`。
> 上游依赖：
> - `global/state-fill.md`（4 类全局态子结构完整化）
> - `global/overlay-events.md`（2 个 globalOverlays + events）
> - `interaction/00-login/operations.md` / `boundaries.md` / `state-vars.md`（屏内引用清单）

## 0. 作用域说明（关键边界）

**本项目仅 1 个屏 `00-login`**——product 阶段 modules 已明确 M2~M4 是"占位本期不实现"。所以**"跨屏覆盖"实际只检查 1 个屏 + 2 个 globalOverlay**。

⚠️ 这不是"省略检查"——而是产品范围决策的必然结果。任何缺口仍需在 plan 追加补丁任务；任何"建议未来补"的提示写在 §6 缺口处理段，不在本期落库。

## 1. session 跨屏读写矩阵

| 实体 | 读 session | 写 session | 操作锚点 | ✓/❌ |
|------|------------|-----------|---------|------|
| 00-login (#1 screenEnter) | `session.status === 'active'` → nav.go 01-home | — | operations.md #1 + product rules"业务规则: session.status='active' 直跳" | ✓ |
| 00-login (#13 SubmitBtn onSuccess) | — | 写完整 session 对象 `{status:'active', token, user, expiresAt, ...}` | operations.md #13 onSuccess + product rules 第 2 条 | ✓ |
| globalOverlay `global-session-expired` (showWhen) | `session && session.status === 'expired'` | — | overlays.md / overlay-events.md | ✓ |
| globalOverlay `sessionReLoginBtn` (click) | — | `state.set globalView.session = anonymous 完整对象` | overlay-events.md §2.2 | ✓ |

**字段级核对**：所有引用涉及 session.status / session.token / session.user / session.expiresAt——
- state-fill.md 落库的子结构含 `{ status, token, refreshToken, user, expiresAt, lastActivityAt }` 6 字段
- 所有引用字段 ∈ 落库子结构 ✓

**枚举值核对**：
- 引用的 status 值：`'active'` / `'expired'` / `'anonymous'`
- 落库枚举：state-fill.md D-GS6 决策的 `anonymous | active | expired | refreshing` 4 值
- 所有引用值 ∈ 枚举 ✓（`refreshing` 留口未引用，无害）

**未引用字段**：`refreshToken` / `lastActivityAt` / `expiresAt` 在本期屏只写不读——属于"写好留给后续屏读"的合理状态，不算缺口。

**缺口**：无。

## 2. network 跨屏读写矩阵

| 实体 | 读 network | 写 network | 操作锚点 | ✓/❌ |
|------|-----------|-----------|---------|------|
| 00-login (#8 GetCodeBtn condition) | `network.status !== 'offline'` | — | operations.md #8 condition + 决策 D1 | ✓ |
| 00-login (#13 SubmitBtn condition) | `network.status !== 'offline'` | — | operations.md #13 condition + state-vars D-S1 | ✓ |
| globalOverlay `global-offline-banner` (showWhen) | `network.status === 'offline'` | — | overlays.md / overlay-events.md | ✓ |
| globalOverlay `offlineRetryBtn` (click) | 读 retryCount 做 +1 | 写 retryCount + 调用 `custom platform.checkNetwork` 委托宿主写 status | overlay-events.md §2.1 | ✓ |
| 宿主层（外部）| — | listener 写 status / lastOnlineAt | state-fill.md D-GS1 + concerns.md §2 | ✓（合约责任在宿主，不由 schema 落库）|

**字段级核对**：
- 引用字段：status / retryCount / lastOnlineAt（隐含）
- 落库子结构：`{ status, retryCount, lastOnlineAt }`——全覆盖 ✓

**枚举值核对**：
- 引用的 status 值：`'offline'` / `'online'`（隐含，未显式判 online）
- 落库枚举：`online | offline | slow`
- 所有引用 ∈ 枚举 ✓（`slow` 留口未引用，无害——D-GS4 决策的预留口）

**缺口**：无。

## 3. preferences 跨屏读写矩阵

| 实体 | 读 preferences | 写 preferences | 操作锚点 | ✓/❌ |
|------|---------------|--------------|---------|------|
| 00-login | — | — | 本屏未引用 preferences 任何字段 | ⚠️ 见说明 |
| theme 阶段（设计期 design）| 读 `themeVariant`（本项目命名为 `theme`）切主题 | — | T6-variants.md 落库时由 design 阶段读 | ✓（合约责任在 design）|
| design 阶段 stateSpec | 读 `a11y.reduceMotion` 决定动画 | — | state-fill.md D-GS5 决策给的预留口 | ✓（合约责任在 design）|

**说明**：本项目 1 个屏，登录页本身不读不写 preferences——这是**正常**的：

| 候选 | 决定 |
|------|------|
| A：登录页强制读 preferences.theme 决定显示样式 | 否——theme 切换由 design 阶段在 themeConfig.colorSchemes 通过 data-scheme 属性切，不需要业务屏显式读 |
| B：登录页强制读 preferences.lang 决定文案 | 否——本项目不做 i18n，文案硬编码中文 |
| C：登录页让用户切换 fontSize / theme | 否——product 阶段明确"本期占位即可" |

**缺口**：无（preferences 由 design 阶段读 / 设置屏写，本期登录页正确地不引用）。

⚠️ 命名提醒：state-fill.md D-GS1 决策保留 product 已用名 `theme`（非 `themeVariant`）；design 阶段从 `themeConfig` 切色彩方案不读这个字段。`preferences.theme` 在本期本质是"占位字段，留给未来设置屏写"。

## 4. nav 跨屏读写矩阵

| 实体 | 读 nav | 写 nav | 操作锚点 | ✓/❌ |
|------|--------|--------|---------|------|
| 00-login (#13 SubmitBtn onSuccess) | `nav.authRedirectTo` 决定跳哪 | onSuccess 末尾清空 authRedirectTo（决策 D-B10） | operations.md #13 onSuccess + boundaries.md #X4 / D-B10 | ✓ |
| globalOverlay `sessionReLoginBtn` (click) | `nav.lastVisited` | 写 `nav.authRedirectTo = lastVisited` | overlay-events.md §2.2 / D-GO2 | ✓ |
| 宿主层（外部）| — | 在 nav.go 副作用中维护 `lastVisited` | concerns.md §4 跨屏读写矩阵 | ✓（合约责任在宿主）|
| 后续屏 M2~M4 | — | 进受保护屏前写 `nav.authRedirectTo` | concerns.md §4 + boundaries D-B10 | ⏳ 占位，本期不实现 |

**字段级核对**：
- 引用字段：authRedirectTo / lastVisited
- 落库子结构：`{ lastVisited, authRedirectTo, pendingDeepLink }`
- pendingDeepLink 留作分享深链兜底，本期不引用——OK

**缺口**：无（authRedirectTo 写入责任在"未来受保护屏"，本期不引入）。

## 5. errorBoundary 跨屏覆盖

state-fill.md D-GS2 已决策**不引入** errorBoundary 视图变量，concerns.md 也明确"属框架级兜底，由 design-executor 评估"。

**缺口确认**：无（不引入是显式产品决策，不算缺口）。

## 6. 红线总核对

| 红线 | 触发条件 | 本任务结果 |
|------|---------|----------|
| R-GLOBAL-STATE-01 | 全局态必要变量缺子结构 | ✅ 4 类全部完整子结构（state-fill.md） |
| R-GLOBAL-OVERLAY-01 | globalOverlays 节点存在但内部按钮缺 events | ✅ 2 个核心按钮均补 events |
| R-GLOBAL-OVERLAY-02 | 三类核心 overlay 缺 events | ✅ offline-banner / session-expired 有 events；error-boundary 按 concerns 决策不引入 |
| R-COVERAGE-01 | 某条 product rule 没对应实现 | ⏭️ 屏级 rule 覆盖由 `I-M1-coverage` 负责，本任务不重复 |
| R-VIEW-* | 衍生视图缺失 | ⏭️ 屏级，由 `I-M1-view-*` 负责 |
| R-OVERLAY-CONFLICT-01 | 同 overlay 混用 showWhen + ui.showOverlay | ✅ 全用 showWhen 驱动 |
| R-EVENTS-02 | event 没 actions | ✅ 4 条 event 均有 actions ≥ 1 |

## 7. 缺口处理

**结论**：4 类全局态跨屏覆盖核对**全部通过**，无需追加补丁任务。

**未来工作项**（不在本期 plan 范围，记录于此供后续接力会话参考）：

| 未来项 | 触发时机 | 实施方 |
|--------|---------|--------|
| M2-M4 受保护屏增 `screenEnter` session.status 检查 | 后续屏开始落 schema 时 | 后续 interaction-designer 会话 |
| 受保护屏 `screenEnter` 未登录时写 `nav.authRedirectTo = currentScreenId` | 同上 | 同上 |
| 02-profile 退出登录按钮 click 写 `session = anonymous` 全清 | 同上 | 同上 |
| 设置屏写 `preferences.theme/fontSize/lang/a11y` | 设置屏纳入实现范围时 | 同上 |
| 全局 401 拦截器维护 `session.status='expired'` | API client 层 | 宿主接入团队 |
| 宿主 listener 维护 `network.status` / `network.lastOnlineAt` | 接入时 | 宿主接入团队 |
| 宿主 nav.go 副作用维护 `globalView.nav.lastVisited` | 接入时 | 宿主接入团队 |

⚠️ 上述 7 项不是"缺口"——是产品作用域内**明确不实现**或**合约责任在宿主**的项。本项目接力到设置屏 / M2~M4 时，下游 interaction-designer 会话会自然识别并落库。

## 8. 决策汇总

| 决策 ID | 内容 | 决定 |
|---|---|---|
| D-GC1 | 是否在本期为后续受保护屏占位"screenEnter session guard" | 否——M2-M4 占位屏 product 阶段已明确不实现，本期不前瞻落库 |
| D-GC2 | preferences 没被引用是否算缺口 | 否——本项目作用域 1 屏，登录页本就不需要读 preferences |
| D-GC3 | 是否需要追加补丁任务 | 否——4 类全部 ✓ |

---

## ★ 沉淀到 schema 的结论

本任务是**核对型任务**，无 schema 落库。

```
✅ 4 类全局态跨屏覆盖核对全通过：
   • session：00-login 读写齐 + global-session-expired overlay 完整生命周期
   • network：00-login 双 condition 守卫 + global-offline-banner overlay 完整
   • preferences：本期作用域内合理不引用（design 阶段从 themeConfig 读）
   • nav：authRedirectTo 消费协议落地 + lastVisited 复用于重登跳回

下一步 → I-handover 移交 design-planner（仍需先做 00-login 屏级 events 等核心任务）
```

> 任务无 schema 写入。`update_plan_task` 直接标 done，无 expectedArtifacts 校验。
