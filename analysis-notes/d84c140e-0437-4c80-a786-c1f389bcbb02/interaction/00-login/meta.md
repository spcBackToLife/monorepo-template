> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-meta
> 对应 schema 字段：18 个交互节点的 meta.interaction.summary（屏级 6 字段已在前序任务落齐，本任务核对 + 补 11 个未填节点）

# Step I-M1-meta: 00-login — meta.interaction 叙事汇总

> 详细 schema 见 `schema-spec/screen-meta-interaction.md` §1-§4。
> 上游依赖：events.md（11 events 已落）/ view-loading.md / view-business.md / view-error.md（衍生视图节点已挂 meta.interaction）。

## 1. 屏级 meta.interaction 完成度核对（前序任务已落，本任务只核对）

| 字段 | 完成度 | 来源 |
|------|--------|-----|
| summary | ✅ 319 字符 | I-M1-statemachine |
| states | ✅ 9 状态（含 entry-checking → idle → inputting → field-validating → code-sending → code-countdown → submitting → success → error → locked）| I-M1-statemachine |
| operations | ✅ 16 条（14 用户主动 + 2 系统生命周期）| I-M1-operations |
| loadingStrategy | ✅ 5 场景齐（initial/refresh/pagination/button/silent）| I-M1-loading |
| errorHandling | ✅ 6 类齐（validation/business/permission/network/server/unknown）| I-M1-errors |
| boundaries | ✅ 13 条（7 类标准 + 5 条本屏特有 X1~X5 + 重入恢复）| I-M1-boundaries |

✓ 屏级 6 字段全齐——本任务**不重落屏级**。

## 2. 节点级 meta.interaction 完成度核对

### 2.1 已有 meta.interaction.summary 的节点（7 个，前序任务已落）

| 节点 | 来源任务 |
|------|---------|
| NormalFormView | C-INT-00-login-001 challenge accepted（product 阶段补）+ I-M1-view-business 补 |
| PhoneError | I-M1-view-error |
| CredentialError | I-M1-view-error |
| CodeSendSpinner | I-M1-view-loading |
| SubmitSpinner | I-M1-view-loading |
| LockedView + 5 子节点 | I-M1-view-business |

### 2.2 缺 meta.interaction.summary 的节点（11 个，本任务补）

| # | 节点 | id | 交互职责（来自 events.md） |
|---|------|-----|--------------------------|
| 1 | Root | nd_6a7f2492b59b4e7eab7e1 | screenEnter（active 跳 home + lockedCD 重启）+ screenExit（取消双 fetch + 停双 timer）|
| 2 | PhoneInput | nd_083c744e1699418e9d01e | bind view.form.phone + onBlur 校验 `/^1[3-9]\d{9}$/` 写 errors.phone + 清 lockedUntil（条件性）|
| 3 | CodeModeBtn | nd_fea83ab543584619ab847 | click → state.set view.loginMode='code' + 清空 errors |
| 4 | PasswordModeBtn | nd_fc9f672d68824795b92cd | click → state.set view.loginMode='password' + 清空 errors |
| 5 | CredentialInput | nd_989c02eb1f224e0c9f973 | bind view.form.credential + onBlur 按 loginMode 分支校验（code: 6 位数字 / password: 6-20 含字母数字）+ 5 字段动态 props（type/placeholder/maxLength/inputmode/autocomplete）|
| 6 | GetCodeBtn | nd_e6783f85edb3499c9f131 | click → ds-send-code（含 condition 6 守卫）+ onSuccess Toast + 60s timer + 动态 textContent + visibleWhen（仅 code 模式）|
| 7 | PasswordToggleEye | nd_017aac6774174ea08b133 | click → toggle view.passwordVisible + visibleWhen（仅 password 模式）|
| 8 | PolicyCheckbox | nd_42b79eb04cfe4a51bc3e2 | bind view.form.policy（无 event：勾选状态由 bind 自动同步；SubmitBtn condition 直接读）|
| 9 | SubmitBtn | nd_5a15fd87f060436295b4f | click → ds-login 主流程 ★（condition 复合守卫 + 5 case onError logic.switch + onSuccess 写 globalView.session 消费 nav.authRedirectTo） |
| 10 | RegisterLink | nd_bc2793bdb54c4603a22be | click → nav.go("00-register") |
| 11 | ForgotLink | nd_24bb133804bb40f1b2833 | click → nav.go("00-forgot-password") |

## 3. 节点级叙事写法约定

每个节点 meta.interaction.summary 写 **1-2 句话**，必含两段：

1. **交互行为**：触发器 → action 关键链路（不写完整 actions，简化指代）
2. **关键约束 / 状态影响**：condition 守卫、依赖的 view 变量 / globalView、onSuccess/onError 大致分支

## 4. 候选方案与否决

- 候选 A：节点级 meta 也写 effects 段（visualState）→ ❌ 否决：effects 是 design 阶段的视觉效果，interaction 阶段只写交互职责
- 候选 B：节点级 meta 也写 flows 详细子流程对象 → ⚠️ 仅核心节点（SubmitBtn / GetCodeBtn / Root）写 flows，其它简单节点保持 summary 单字符串即可
- 候选 C：直接复制 events.md 的 description 当 summary → ❌ 否决：description 是 events.actions 内嵌的运行时叙事；meta.interaction 是节点级叙事，颗粒不同

## 5. 决策记录

- **D-MT1**：节点级 meta 仅写 summary + states（必要时 flows），不写 effects（阶段边界）
- **D-MT2**：核心节点（SubmitBtn / GetCodeBtn / Root）的 summary 含 flows 字段（mainFlow / errorRecovery / lifecycle）
- **D-MT3**：屏级 meta.interaction 已 100% 齐 → 本任务零屏级改动
- **D-MT4**：本任务后**不打 phase=interaction-defined** —— phase 由 I-M1-integrity 任务在最终自检通过后打

## 6. 红线自查

| 红线 | 状态 |
|------|------|
| R-EVENTS-01（节点声明交互意图但 events 缺）| ✅ events.md 已校 |
| R-EVENTS-02（event.actions 空）| ✅ events.md 已校 |
| R-EVENTS-03（fetch 缺 onSuccess/onError）| ✅ events.md 已校 |
| meta.interaction.summary 非空（本任务 expectedArtifacts）| ✅ 本任务补完 11 个后 18 节点全齐 |
| R-PHASE-01（phase=interaction-defined 但 ready 仍 false）| ⏳ 由 integrity 任务校 |

---

## ★ 沉淀到 schema 的结论

```jsonc
// 11 个 meta/set_node 调用（按节点 id 排序）

meta/set_node { nodeId: "nd_6a7f2492b59b4e7eab7e1" /*Root*/, patch: { interaction: {
  summary: "屏根：screenEnter 副效果（active 跳 01-home 门禁 + 重启 lockedCountdown 60s 间隔 timer 直到 lockedUntil 到期）；screenExit 副效果（取消 ds-login/ds-send-code 未完成 fetch + 停 codeCD/lockedCountdown 双 timer）",
  states: ["enter","exit"],
  flows: { lifecycle: "screenEnter→门禁+lockedCD重启 / screenExit→effect.cancel双fetch+ui.stopTimer双timer" }
}}}

meta/set_node { nodeId: "nd_083c744e1699418e9d01e" /*PhoneInput*/, patch: { interaction: {
  summary: "受控双向绑定 view.form.phone；onBlur 用 /^1[3-9]\\d{9}$/ 校验，违则写 errors.phone='请输入正确的手机号'，合规则清空错误；同时条件性清 lockedUntil（若已过期）",
  states: ["empty","valid","invalid"]
}}}

meta/set_node { nodeId: "nd_fea83ab543584619ab847" /*CodeModeBtn*/, patch: { interaction: {
  summary: "click → state.set view.loginMode='code' + 清空 errors.credential（避免切到验证码模式仍显示密码相关错误文案）；condition 自动隐藏 password 模式下的 PasswordToggleEye / 显示 GetCodeBtn",
  states: ["active","inactive"]
}}}

meta/set_node { nodeId: "nd_fc9f672d68824795b92cd" /*PasswordModeBtn*/, patch: { interaction: {
  summary: "click → state.set view.loginMode='password' + 清空 errors.credential；condition 自动显示 PasswordToggleEye / 隐藏 GetCodeBtn",
  states: ["active","inactive"]
}}}

meta/set_node { nodeId: "nd_989c02eb1f224e0c9f973" /*CredentialInput*/, patch: { interaction: {
  summary: "受控双向绑定 view.form.credential；onBlur 按 view.loginMode 分支校验（code: /^\\d{6}$/，password: /^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/）；同时挂 5 个动态 props（type/placeholder/maxLength/inputmode/autocomplete 全部根据 loginMode 切换）",
  states: ["empty","valid","invalid"]
}}}

meta/set_node { nodeId: "nd_e6783f85edb3499c9f131" /*GetCodeBtn*/, patch: { interaction: {
  summary: "获取验证码：click 6 守卫（code 模式 + phone 合法 + codeCountdown===0 + 非 pending + 非离线 + 非锁定）→ effect.fetch ds-send-code → onSuccess Toast '验证码已发送' + 启动 60s 倒计时 timer / onError logic.switch 4 case（LIMIT_EXCEEDED/NETWORK/SERVER/default）；动态 textContent 切'重新获取(Ns)'/'获取验证码'/'发送中…'三态；visibleWhen 仅 code 模式",
  states: ["enabled","disabled","sending","countdown"],
  flows: {
    mainFlow: "click→guard→effect.fetch ds-send-code→onSuccess Toast+60s timer / onError 4-case Toast",
    visibility: "loginMode==='code' ? show : hidden"
  }
}}}

meta/set_node { nodeId: "nd_017aac6774174ea08b133" /*PasswordToggleEye*/, patch: { interaction: {
  summary: "click → state.set view.passwordVisible = !current；CredentialInput.type 通过动态 props 自动切换 password/text；visibleWhen 仅 password 模式（code 模式无此节点）",
  states: ["visible-on","visible-off"]
}}}

meta/set_node { nodeId: "nd_42b79eb04cfe4a51bc3e2" /*PolicyCheckbox*/, patch: { interaction: {
  summary: "受控双向绑定 view.form.policy（boolean）；无 event——勾选/取消由 bind 自动同步；SubmitBtn condition 直接读 view.form.policy===true 作为提交守卫之一",
  states: ["checked","unchecked"]
}}}

meta/set_node { nodeId: "nd_5a15fd87f060436295b4f" /*SubmitBtn*/, patch: { interaction: {
  summary: "登录提交主流程（核心）★：click 复合 condition 6 守卫（form 合法 + policy 勾 + 非 submitting + 非离线 + 非锁定 + 凭证非空）→ ui.haptic + state.set view.submitting=true → effect.fetch ds-login（endpoint.body 表达式包 phone/credential/loginMode）→ onSuccess(state.set globalView.session={status:'authenticated',token,user} + state.set view.submitting=false + nav.go(state.view.authRedirectTo || '01-home') + ui.haptic) / onError 5-case logic.switch（CREDENTIAL 累加 failureCount，第5次写 lockedUntil=now+30min 自动触发 LockedView；LOCKED 信任后端 ts；LIMIT_EXCEEDED/NETWORK/SERVER 各 Toast；default 兜底；统一 state.set view.submitting=false）",
  states: ["disabled","enabled","loading","success","error"],
  flows: {
    mainFlow: "click→guard 6→ui.haptic+set submitting→effect.fetch ds-login→onSuccess(写 session+消费 authRedirectTo+nav.go) / onError(5-case Toast/累加失败/锁定升级)",
    errorRecovery: "shake + Toast + 不抢 focus（D-EV3）",
    lockEscalation: "failureCount===5→state.set lockedUntil=now+30min→NormalFormView.visibleWhen 自动 false / LockedView.visibleWhen 自动 true→Root.screenEnter 重启 lockedCountdown timer"
  }
}}}

meta/set_node { nodeId: "nd_bc2793bdb54c4603a22be" /*RegisterLink*/, patch: { interaction: {
  summary: "click → nav.go('00-register') 跳注册页（注册是多步流程：手机+短信+设密+协议，独立屏承载 - 见 D-OV1 决策）",
  states: ["enabled"]
}}}

meta/set_node { nodeId: "nd_24bb133804bb40f1b2833" /*ForgotLink*/, patch: { interaction: {
  summary: "click → nav.go('00-forgot-password') 跳找回密码页（多步流程独立屏承载 - 见 D-OV1 决策；与 LockedForgotLink 不同：本链接是用户主动忘密入口，LockedForgotLink 是锁定时的逃生路径）",
  states: ["enabled"]
}}}
```

合计 11 个 MCP 调用。expectedArtifacts: `meta.interaction.summary` 非空 ✓
