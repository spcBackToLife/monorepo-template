> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-view-error
> 对应 schema 字段：仅给已有的 PhoneError / CredentialError 节点补 meta.interaction（不新建任何错误视图节点）

# Step I-view-error: 00-login — 错误态视图

> 详细方法见 `methodology/07-derivative-views.md` 类 3 + `methodology/04-error-handling.md`。
> 详细 schema 见 `schema-spec/derivative-views.md` §3。
> 上游依赖：errors.md（6 类错误判定 + 决策 D-E3 5xx 不用整页）/ events.md（PhoneError/CredentialError 已挂 textContent 表达式 + visibleWhen / 5xx 已落 ds-login.onError SERVER_ERROR Toast 链）。

## 推理过程

### 1. 适用性判定（错误的两层呈现 × 5 错误源）

> 错误分**瞬时反馈**（Toast/Banner，关闭后页面恢复）和**页面态**（ErrorView，整页/整区域被替代）。本任务只关心后者；前者已由 events.md 在 onError 链落 ui.showToast。

| 错误场景 | 是否需要"页面态"节点 | 节点 name | visibleWhen | 处理方式 |
|---------|-------------------|----------|-------------|---------|
| ① 5xx 整页错（ds-login / ds-send-code）| ❌ | — | — | errors.md 决策 **D-E3**：登录页关键路径短，整页错误反让用户找不到表单和重试入口，5xx 走 ui.showToast(error) '服务繁忙' + custom platform.reportError（已落 events.md SubmitBtn / GetCodeBtn onError SERVER_ERROR 分支）|
| ② 网络断（offline / NETWORK_ERROR）| ❌ | — | — | 前置 condition 守卫 + 全局 globalOverlays.global-offline-banner 接管（已在 product 阶段建 + global/overlay-events.md 落 events）；运行时 NETWORK_ERROR 走 Toast；不再单建 NetworkErrorState |
| ③ 区域加载错（区域 fetch 错）| ❌ | — | — | 本屏无"区域 fetch"——两个 ds 都是 click 触发的整体提交，没有 LeftPanel/RightPanel 之类局部 fetch 区 |
| ④ 字段行内错（PhoneInput / CredentialInput 校验失败）| ✅ 节点已建 | PhoneError / CredentialError | 已挂 `{{ !!state.view.errors.phone }}` / `{{ !!state.view.errors.credential }}` | **product 阶段已建节点 + events 阶段已挂 textContent 表达式 + visibleWhen + blur 校验逻辑**，本任务仅补 meta.interaction 节点叙事 |
| ⑤ 业务错（CREDENTIAL / LIMIT_EXCEEDED）| ❌ | — | — | 走 Toast；CREDENTIAL 第 5 次特殊态进 locked 由 view-business 任务建 LockedView |
| ⑥ 表单全局错条（FormErrorBanner）| ❌ | — | — | 本屏只有两字段且各自有行内错；无需汇总 banner |
| ⑦ 维护页（MaintenancePage）| ❌ | — | — | 全平台层职责，不属本屏 |

**结论**：本任务**不新建错误视图节点**；只给 PhoneError / CredentialError（product 阶段已建、events 阶段已挂表达式）补 `meta.interaction.summary` 让节点叙事完整化。

### 2. 候选与否决（关键决策）

#### 决策 D-VR1：要不要为 5xx 建一个 ServerErrorPage？

- **候选 A**：建 ServerErrorPage 节点，visibleWhen 接 `state.effects['ds-login'].status === 'error' && state.effects['ds-login'].error.code === 'SERVER_ERROR'`
  - 劣势：登录页关键路径就是表单 → 提交 → onSuccess。整页错误把表单遮住，用户既看不到自己的输入，也找不到重试按钮（除非整页错误页里再放一个"重试"——但那等于两套 UI 实现同一逻辑）
- **候选 B**：5xx 走 Toast(error) + 按钮恢复 + 提交按钮原地可重试
- **决策**：**B**（沿用 errors.md D-E3）—— 与 D-E3 一字不改

#### 决策 D-VR2：要不要为离线建 NetworkErrorState？

- **候选 A**：建 NetworkErrorState 节点，visibleWhen 接 `globalView.network.status === 'offline'`
- **候选 B**：复用项目级 `globalOverlays.global-offline-banner`（顶部全局横幅，所有屏共享）+ SubmitBtn/GetCodeBtn condition 拒提交
- **决策**：**B**（沿用 errors.md 类 4 + global/coverage.md）—— 全局横幅已经在做这件事，本屏再建一个会和 banner 重复呈现，违 R-OVERLAY-CONFLICT-01

#### 决策 D-VR3：PhoneError / CredentialError 是不是该重建？

- **现状**：这两个节点 product 阶段已建（含 product.summary）、events 阶段已挂 props.textContent 表达式 + visibleWhen + blur 校验 actions
- **候选 A**：本任务删掉重建（重建一遍 ID 会变 → 影响 events 已挂的引用，得重挂）
- **候选 B**：保留节点，仅补 meta.interaction（增量 patch）让 B 类信息齐
- **决策**：**B**——遵循阶段边界红线"重组上游骨架（move/wrap/remove product 已建节点）→ 退回 product-analyst"。本任务只做增量 meta 补全

#### 决策 D-VR4：要不要在 events 阶段已落的 SERVER_ERROR Toast 之外再加 banner？

- **候选 A**：除 Toast 外再 visibleWhen banner 显示 5s
- **候选 B**：仅 Toast（toast 本身就带 5s 自动消失语义）
- **决策**：**B**——Toast 是过渡反馈节点（I-M1-view-feedback 任务的范畴）；banner 是页面态节点。同一错误两种节点冗余、噪音

#### 决策 D-VR5：要不要建一个全局 errorBoundary 节点？

- **候选 A**：catch 所有 fetch / 渲染异常的兜底页面
- **候选 B**：不建——按 global/state-fill.md `errorBoundary 按 concerns 决策不引入`，本屏遵从同一决策
- **决策**：**B**

### 3. 与上游契约对账

| 上游来源 | 本任务承接 | 实现位置 |
|---------|----------|---------|
| errors.md 类 1 校验错（行内） | ✅ PhoneError/CredentialError 已建已挂表达式，仅补 meta | meta/set_node × 2 |
| errors.md 类 2 业务错（Toast）| ✅ events.md 已落 onError 链 | 不在本任务（events 已完成）|
| errors.md 类 3 权限错 "—" | ✅ 不适用 | — |
| errors.md 类 4 网络错（前置守卫 + 运行时 Toast）| ✅ events.md 已落 condition + Toast；globalOverlays banner 已建 | 不在本任务 |
| errors.md 类 5 服务错（5xx Toast，不整页）| ✅ events.md 已落 SERVER_ERROR 分支；决策 D-VR1 不建 ServerErrorPage | 不在本任务 |
| errors.md 类 6 未知错（Toast + reportError）| ✅ events.md 已落 default 分支 | 不在本任务 |

### 4. 红线自查

| 红线 | 是否触发 | 说明 |
|-----|---------|------|
| R-VIEW-ERROR-01 | ❌ 不触发 | "dataSource 缺 error 视图"——errors.md 决策 D-E3 明文 5xx 走 Toast 替代视图，且整页 ErrorView 在登录页关键路径上反作用；网络错走 globalOverlays 共享。所有 dataSource 的 error 形态全部有显式处理（非节点形式） |
| R-VIEW-VISIBLE-01 | ❌ 不触发 | 不新建节点；已有 PhoneError/CredentialError 节点 visibleWhen 在 product/events 阶段已挂 |
| 阶段边界 | ✅ 通过 | 不重组 product 已建节点；不写 styles/visualState/material |

### 5. 配套 meta 补全清单

| 节点 | 现有 meta.product | 本任务补的 meta.interaction.summary |
|------|------------------|------------------------------------|
| PhoneError | "手机号校验错误行内提示位（动态文案 由 interaction 写 textContent 表达式 + visibleWhen）" | "手机号失焦校验错的行内提示：textContent 接 `{{state.view.errors.phone}}`；visibleWhen 接 `{{!!state.view.errors.phone}}`；空字符串隐藏，非空显示；aria-live=polite（design 阶段加 role 属性）。文案由 PhoneInput.blur 事件写入 view.errors.phone（'请输入正确的手机号'/''）" |
| CredentialError | "凭证错误行内提示位（动态文案 + visibleWhen 由 interaction 写）" | "凭证失焦校验错的行内提示：textContent 接 `{{state.view.errors.credential}}`；visibleWhen 接 `{{!!state.view.errors.credential}}`；按 view.loginMode 切两套文案（code: '请输入 6 位数字验证码' / password: '密码需 6-20 位且包含字母和数字'）；空字符串隐藏。文案由 CredentialInput.blur 写入" |

> 这俩节点 events 任务已挂 props.textContent + visibleWhen，但 meta.interaction 此前为空。本任务补叙事让 R-PHASE-01 在 I-M1-meta 任务能正常通过（节点级 meta.interaction.summary 不为空）。

---

## ★ 沉淀到 schema 的结论

本任务共 **2 个 MCP 调用**（不新建节点）：

```jsonc
// ① meta/set_node — PhoneError 节点 meta.interaction
meta/set_node {
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  nodeId: "nd_905bbf8e8ae84435bd1c5",   // PhoneError
  patch: {
    interaction: {
      summary: "手机号失焦校验错的行内提示位：textContent 接 {{state.view.errors.phone}}；visibleWhen 接 {{!!state.view.errors.phone}}；空字符串隐藏，非空显示。文案由 PhoneInput.blur 事件根据 /^1[3-9]\\d{9}$/ 写入 '请输入正确的手机号' / ''。aria-live=polite（design 阶段补 role 属性 + 红字红框 visualState）。来源 errors.md 类 1 + events.md PhoneInput.blur。",
      states: ["showing", "hidden"]
    }
  }
}

// ② meta/set_node — CredentialError 节点 meta.interaction
meta/set_node {
  projectId,
  nodeId: "nd_d7657df85d8049aa8251c",   // CredentialError
  patch: {
    interaction: {
      summary: "凭证失焦校验错的行内提示位：textContent 接 {{state.view.errors.credential}}；visibleWhen 接 {{!!state.view.errors.credential}}；CredentialInput.blur 按 view.loginMode 分支两套校验文案（code 模式 /^\\d{6}$/ → '请输入 6 位数字验证码'；password 模式 /^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/ → '密码需 6-20 位且包含字母和数字'）；模式切换时 CodeModeBtn/PasswordModeBtn 已自动清错。来源 errors.md 类 1 + events.md CredentialInput.blur + 决策 D-E1 不抢 focus。",
      states: ["showing", "hidden"]
    }
  }
}
```

> **不落库的视图**（按本表 §1 否决）：ServerErrorPage / NetworkErrorState / SectionErrorBlock / FormErrorBanner / MaintenancePage / ErrorBoundary——本屏全部按决策 D-VR1~D-VR5 否决，对应错误形态由 events.md 已落的 Toast/condition 链 + globalOverlays.global-offline-banner 接管。三轴覆盖（I-M1-coverage）会再次显式核对。
