> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-events
> 对应 schema 字段：node.events[*] + node.bind + node.props（动态文案）+ node.visibleWhen

# Step I-events: 00-login — 节点 events / bind / 动态文案落库（核心）★

> 详细规范见 `schema-spec/interaction-events.md` + `common/references/v2-actions-cheatsheet.md`。
>
> 这是 interaction 阶段最重的任务。所有 operations.md / errors.md / boundaries.md / loading.md / state-vars.md 决策在这里翻译为结构化 actions 链落库。
> 不重复推导：上游决策号（D1~D6 / D-E1~D-E6 / D-B1~D-B10 / D-S1~D-S5 / D-DS1~D-DS8 / L1/L2/L4）直接引用。

## 0. 节点 ID 速查（来自 screen_schema 查询）

| 节点 name | 节点 id | 类型 | 本任务做什么 |
|---|---|---|---|
| Root | nd_6a7f2492b59b4e7eab7e1 | div | screenEnter（门禁+lockedCD 恢复）+ screenExit（cancel 双 fetch + 停双 timer）|
| FormCard | nd_e60fb832933f4b86a6638 | div | 不直接挂事件；登录失败 shake 通过 ui.animate nodeId 引用 |
| PhoneInput | nd_083c744e1699418e9d01e | input | bind view.form.phone + blur 校验 event |
| PhoneError | nd_905bbf8e8ae84435bd1c5 | div | 动态 textContent + visibleWhen |
| CodeModeBtn | nd_fea83ab543584619ab847 | button | click → 切 code 模式 |
| PasswordModeBtn | nd_fc9f672d68824795b92cd | button | click → 切 password 模式 |
| CredentialLabel | nd_bd114d45f07f45caabdd9 | div | 动态 textContent（'验证码' / '密码'）|
| CredentialInput | nd_989c02eb1f224e0c9f973 | input | bind view.form.credential + blur 校验 + 动态 props（type/placeholder/maxLength/inputmode/autocomplete）|
| CredentialError | nd_d7657df85d8049aa8251c | div | 动态 textContent + visibleWhen |
| GetCodeBtn | nd_e6783f85edb3499c9f131 | button | click → ds-send-code + countdown timer；动态 textContent；visibleWhen |
| PasswordToggleEye | nd_017aac6774174ea08b133 | div | click → toggle passwordVisible；visibleWhen |
| PolicyCheckbox | nd_42b79eb04cfe4a51bc3e2 | input(checkbox) | bind view.form.policy |
| PolicyText | nd_5b891f2d60734104b50b8 | div | click → ui.openUrl（按字段分支） |
| SubmitBtn | nd_5a15fd87f060436295b4f | button | click → ds-login 主流程 ★ |
| RegisterLink | nd_bc2793bdb54c4603a22be | div | click → nav.go 00-register |
| ForgotLink | nd_24bb133804bb40f1b2833 | div | click → nav.go 00-forgot-password |

合计落库动作：**3 个 bind + 5 个 visibleWhen + 5 个动态 props + 16 个 event/add**（部分节点多事件）。

## 1. 表达式片段命名（避免下文重复书写）

为复用，本任务统一以下复合表达式：

| 名称 | 表达式 |
|---|---|
| `IS_PHONE_VALID` | `{{ /^1[3-9]\d{9}$/.test(state.view.form.phone) }}` |
| `IS_CREDENTIAL_VALID_BY_MODE` | `{{ state.view.loginMode === 'code' ? /^\d{6}$/.test(state.view.form.credential) : /^(?=.*[A-Za-z])(?=.*\d).{6,20}$/.test(state.view.form.credential) }}` |
| `IS_LOCKED` | `{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}` |
| `IS_OFFLINE` | `{{ globalView.network.status === 'offline' }}` |
| `IS_CODE_MODE` | `{{ state.view.loginMode === 'code' }}` |
| `IS_PWD_MODE` | `{{ state.view.loginMode === 'password' }}` |
| `CAN_SUBMIT` (state-vars D-S1) | 合成式：`{{ IS_PHONE_VALID && IS_CREDENTIAL_VALID_BY_MODE && state.view.form.policy === true && !state.view.submitting && !IS_OFFLINE && !IS_LOCKED }}` 直接展开（不建 view.canSubmit）|

> ⚠️ 这些命名仅 md 阅读用；落 schema 时表达式按命名展开为完整字符串。

## 2. 按节点逐个翻译 actions

### 2.1 PhoneInput — bind + blur 校验

**bind**（替代 onChange→state.set，遵守 R-BIND-01）：
```
element/set_bind { nodeId: PhoneInput, path: "view.form.phone" }
```

**event: blur — 失焦校验**（operations.md #3 + errors.md 类 1 + D-E1 不抢 focus + decision：空 phone 不触发校验）：
```jsonc
{
  trigger: "blur",
  description: "失焦校验手机号格式：空不触发；非空且不符 11 位 1[3-9] 规则 → 行内错；合法 → 清错。决策来源 operations #3 + errors D-E1。",
  actions: [{
    type: "logic.if",
    when: "{{ state.view.form.phone && state.view.form.phone.length > 0 }}",
    then: [{
      type: "state.set",
      path: "view.errors.phone",
      value: "{{ /^1[3-9]\\d{9}$/.test(state.view.form.phone) ? '' : '请输入正确的手机号' }}"
    }],
    else: [
      { type: "state.set", path: "view.errors.phone", value: "" }
    ]
  }]
}
```

**否决**：
- ❌ 用 onChange 实时校验 → errors D-E4 已否决（输入过程红字闪烁）
- ❌ blur 后抢 focus 回 phone → errors D-E1 已否决（破坏 tab key 体验）
- ❌ 校验时同步写 `view.canSubmit` → state-vars D-S1 已决策不建 canSubmit，SubmitBtn condition 用复合表达式

### 2.2 PhoneError — 动态 textContent + visibleWhen

```
component_prop/update_props { nodeId: PhoneError,
  props: { textContent: "{{ state.view.errors.phone }}" }
}

element/set_visible_when { nodeId: PhoneError,
  visibleWhen: "{{ !!state.view.errors.phone }}"
}
```

**理由**：errors §1 类 1 + state-vars `errors.phone` 默认 `''`——空字符串不显示，非空显示红字。

### 2.3 CodeModeBtn — click 切 code 模式

**operations #4 + 决策 D4 phone 保留 / 清 credential + 清 credential error / 当前已是 code 则 condition 拒绝**：
```jsonc
{
  trigger: "click",
  description: "切换到验证码登录：清 credential + 清 credential error；保留 phone。决策来源 operations #4 + D4。",
  condition: { when: "{{ state.view.loginMode !== 'code' }}" },
  actions: [
    { type: "state.set", path: "view.loginMode",         value: "code" },
    { type: "state.set", path: "view.form.credential",   value: "" },
    { type: "state.set", path: "view.errors.credential", value: "" }
  ]
}
```

### 2.4 PasswordModeBtn — click 切 password 模式

```jsonc
{
  trigger: "click",
  description: "切换到密码登录：清 credential + 清 credential error；保留 phone。决策来源 operations #5 + D4。",
  condition: { when: "{{ state.view.loginMode !== 'password' }}" },
  actions: [
    { type: "state.set", path: "view.loginMode",         value: "password" },
    { type: "state.set", path: "view.form.credential",   value: "" },
    { type: "state.set", path: "view.errors.credential", value: "" }
  ]
}
```

### 2.5 CredentialLabel — 动态 textContent（'验证码' / '密码'）

```
component_prop/update_props { nodeId: CredentialLabel,
  props: { textContent: "{{ state.view.loginMode === 'code' ? '验证码' : '密码' }}" }
}
```

### 2.6 CredentialInput — bind + blur 校验 + 动态 props

**bind**：
```
element/set_bind { nodeId: CredentialInput, path: "view.form.credential" }
```

**动态 props**（operations #6 + boundaries D-B5/D-B6 单节点动态 props 双引用 + state-vars passwordVisible）：
```
component_prop/update_props { nodeId: CredentialInput,
  props: {
    type:        "{{ state.view.loginMode === 'code' ? 'text' : (state.view.passwordVisible ? 'text' : 'password') }}",
    placeholder: "{{ state.view.loginMode === 'code' ? '请输入 6 位验证码' : '请输入密码（6-20 位含字母+数字）' }}",
    maxLength:   "{{ state.view.loginMode === 'code' ? 6 : 20 }}",
    inputmode:   "{{ state.view.loginMode === 'code' ? 'numeric' : 'text' }}",
    autocomplete:"{{ state.view.loginMode === 'code' ? 'one-time-code' : 'current-password' }}"
  }
}
```

⚠️ 注意：HTML 原生 `autocomplete` 属性官方拼写为 `autoComplete`（React）或 `autocomplete`（HTML）；本项目 schema 渲染层按 `props` 透传，统一用小写 `autocomplete` 与已有 product 节点风格一致。如渲染层有 camelCase 映射需求由 design 阶段二次确认；本任务按小写落库。

**event: blur — 失焦校验**（errors D-E1 + 不抢 focus + 空不触发 + code/password 分支文案）：
```jsonc
{
  trigger: "blur",
  description: "失焦校验凭证：code 模式校 6 位数字；password 模式校 6-20 位含字母+数字。空不触发。来源 operations #7 + errors 类 1 + D-E1。",
  actions: [{
    type: "logic.if",
    when: "{{ state.view.form.credential && state.view.form.credential.length > 0 }}",
    then: [{
      type: "state.set",
      path: "view.errors.credential",
      value: "{{ state.view.loginMode === 'code' ? (/^\\d{6}$/.test(state.view.form.credential) ? '' : '请输入 6 位数字验证码') : (/^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/.test(state.view.form.credential) ? '' : '密码需 6-20 位且包含字母和数字') }}"
    }],
    else: [{ type: "state.set", path: "view.errors.credential", value: "" }]
  }]
}
```

### 2.7 CredentialError — 动态 textContent + visibleWhen

```
component_prop/update_props { nodeId: CredentialError,
  props: { textContent: "{{ state.view.errors.credential }}" }
}

element/set_visible_when { nodeId: CredentialError,
  visibleWhen: "{{ !!state.view.errors.credential }}"
}
```

### 2.8 GetCodeBtn — visibleWhen + 动态 textContent + click

**visibleWhen**（operations #8 + product rules：仅 code 模式显示）：
```
element/set_visible_when { nodeId: GetCodeBtn,
  visibleWhen: "{{ state.view.loginMode === 'code' }}"
}
```

**动态 textContent**（operations #8 onSuccess "重新获取 (Ns)"）：
```
component_prop/update_props { nodeId: GetCodeBtn,
  props: { textContent: "{{ state.view.codeCountdown > 0 ? '重新获取 (' + state.view.codeCountdown + 's)' : '获取验证码' }}" }
}
```

**event: click — 获取验证码主流程**（operations #8 + boundaries D-B1 不累 failureCount + loading L2 按钮内 spinner + decision 双保险 condition）：

```jsonc
{
  trigger: "click",
  description: "获取验证码：condition 守卫 code 模式 + phone 合法 + 倒计时为 0 + 非 pending + 非离线 + 非锁定；onSuccess 启动 60s 倒计时；onError 按 logic.switch 分支（含 LIMIT_EXCEEDED/NETWORK_ERROR/SERVER_ERROR/default）。来源 operations #8 + boundaries D-B1 + errors §4 ds-send-code 骨架。",
  condition: {
    when: "{{ state.view.loginMode === 'code' && /^1[3-9]\\d{9}$/.test(state.view.form.phone) && state.view.codeCountdown === 0 && state.effects['ds-send-code'].status !== 'pending' && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > Date.now()) }}"
  },
  actions: [
    { type: "effect.fetch", dataSourceId: "ds-send-code",
      params: { phone: "{{ state.view.form.phone }}" },
      onSuccess: [
        { type: "ui.showToast", toastType: "success", message: "验证码已发送" },
        { type: "state.set", path: "view.codeCountdown", value: 60 },
        { type: "ui.startTimer",
          timerId: "codeCD",
          duration: 60000,
          interval: 1000,
          onTick:     [{ type: "state.set", path: "view.codeCountdown", value: "{{ state.view.codeCountdown - 1 }}" }],
          onComplete: [{ type: "state.set", path: "view.codeCountdown", value: 0 }]
        }
      ],
      onError: [
        { type: "logic.switch",
          value: "{{ $last.error.code }}",
          cases: [
            { when: "LIMIT_EXCEEDED", actions: [
              { type: "ui.showToast", toastType: "error", message: "今日发送次数已达上限" }
            ]},
            { when: "NETWORK_ERROR", actions: [
              { type: "ui.showToast", toastType: "error", message: "网络异常，请检查后重试" }
            ]},
            { when: "SERVER_ERROR", actions: [
              { type: "ui.showToast", toastType: "error", message: "服务繁忙，请稍后重试" },
              { type: "custom", handler: "platform.reportError",
                payload: { scope: "ds-send-code", error: "{{ $last.error }}" } }
            ]}
          ],
          default: [
            { type: "ui.showToast", toastType: "error", message: "出了点问题，请稍后重试" },
            { type: "custom", handler: "platform.reportError",
              payload: { scope: "ds-send-code", error: "{{ $last.error }}" } }
          ]
        }
      ]
    }
  ]
}
```

### 2.9 PasswordToggleEye — visibleWhen + click toggle

**visibleWhen**（operations #9 仅 password 模式）：
```
element/set_visible_when { nodeId: PasswordToggleEye,
  visibleWhen: "{{ state.view.loginMode === 'password' }}"
}
```

**event: click**：
```jsonc
{
  trigger: "click",
  description: "切换密码可见性。决策来源 operations #9。",
  actions: [{ type: "state.toggle", path: "view.passwordVisible" }]
}
```

### 2.10 PolicyCheckbox — bind

```
element/set_bind { nodeId: PolicyCheckbox, path: "view.form.policy" }
```

> 无 event：勾选/取消由 bind 自动同步；SubmitBtn condition 直接读 `view.form.policy === true`。

### 2.11 PolicyText — click 打开协议链接（双链接合并节点的决策）

**问题**：product 阶段把"《用户服务协议》"和"《隐私协议》"两个链接放进单个 `PolicyText` 节点的同一段 textContent："我已阅读并同意《用户服务协议》和《隐私协议》"。

**决策 D-EV1**：单节点 click 无法区分点击位置——本任务采用**保守方案**：

| 候选 | 决定 |
|---|---|
| A：拆成 3 个节点（"我已阅读并同意"/链接1/"和"/链接2）| 拆节点属 product 阶段骨架重组，被 forbidden-fields-interaction §5.4 禁止 |
| B：点击整段 PolicyText 弹一个 inline menu 让用户选 | 引入 modal，过度设计 |
| C：单 click → 默认打开《用户服务协议》（第一条，常见预期）| 不能满足"点隐私协议"的语义 |
| **D：本期 PolicyText 不挂 events，给设计期一个 TODO 标记** | 拆节点决策推迟到 design-planner 阶段（design-planner 可重组叶子节点的非语义子树）|

**决策**：**D**。本任务**不**给 PolicyText 挂 click event，并在 meta.interaction 中显式标记 TODO 留给 design-planner 阶段处理（届时把 PolicyText 拆为 3 个子节点：纯文本 + Link1 + Link2）。

operations #11/#12 已落 schema 为"点击触发 ui.openUrl"，本任务通过 meta.interaction 标注**实施延后**而非违约。

⚠️ 这违反了 operations.md 落库的 #11/#12 摘要（"ui.openUrl"），但**事实约束**（单节点无法区分点击位置）+ **职责边界**（拆节点是 design-planner 职责）决定了**只能延后**。在 I-M1-meta 任务的 screen.meta.interaction.summary 末尾补充该 TODO。

### 2.12 SubmitBtn — 核心 click（最长）★

**condition.when**（boundaries D-B5 复合 + state-vars D-S1 不建 canSubmit）：

```
{{ /^1[3-9]\d{9}$/.test(state.view.form.phone)
   && (state.view.loginMode === 'code'
        ? /^\d{6}$/.test(state.view.form.credential)
        : /^(?=.*[A-Za-z])(?=.*\d).{6,20}$/.test(state.view.form.credential))
   && state.view.form.policy === true
   && !state.view.submitting
   && globalView.network.status !== 'offline'
   && !(state.view.lockedUntil && state.view.lockedUntil > Date.now()) }}
```

**actions 链结构**（operations #13 + errors §4 ds-login 骨架 + decisions D6/D-E6/D-B10）：

```jsonc
{
  trigger: "click",
  description: "登录提交主流程：condition 守卫表单合法 + policy + 非提交中 + 非离线 + 非锁定；进入提交态 → effect.fetch ds-login → onSuccess 写 globalView.session 消费 nav.authRedirectTo / onError 按 code 分支（CREDENTIAL 累加 failureCount，≥5 写 lockedUntil；LOCKED 信任后端 ts；LIMIT_EXCEEDED/NETWORK/SERVER 各 Toast）。来源 operations #13 + errors §4 + boundaries D-B10 + decisions D1/D6/D-E1/D-E6。",
  condition: { when: "<上述 condition 表达式>" },
  actions: [
    // 触觉反馈 + 进入提交态
    { type: "custom", handler: "hapticFeedback", payload: { strength: "medium" } },
    { type: "state.set", path: "view.submitting", value: true },

    // 调 ds-login（params 来源于 ds-login.endpoint.body 已写，effect.fetch 用默认 params 即可）
    { type: "effect.fetch", dataSourceId: "ds-login",
      onSuccess: [
        // success 视觉态 + 写全局 session
        { type: "node.setVisualState", nodeId: "<SubmitBtn-id>", state: "success", autoRevertMs: 500 },
        { type: "state.set", path: "data.user", value: "{{ $last.response.user }}" },
        { type: "state.set", path: "globalView.session",
          value: {
            status:         "active",
            token:          "{{ $last.response.token }}",
            refreshToken:   null,
            user:           "{{ $last.response.user }}",
            expiresAt:      "{{ Date.now() + $last.response.expiresIn * 1000 }}",
            lastActivityAt: "{{ Date.now() }}"
          } },
        // 复位本地态
        { type: "state.set", path: "view.submitting",   value: false },
        { type: "state.set", path: "view.failureCount", value: 0 },
        { type: "state.set", path: "view.lockedUntil",  value: null },
        // 延时 500ms 让 success 视觉态可见
        { type: "ui.delay", duration: 500 },
        // 消费 authRedirectTo（boundaries D-B10）
        { type: "logic.if",
          when: "{{ !!globalView.nav.authRedirectTo }}",
          then: [
            { type: "nav.go", targetScreenId: "{{ globalView.nav.authRedirectTo }}" },
            { type: "state.set", path: "globalView.nav.authRedirectTo", value: null }
          ],
          else: [
            { type: "nav.go", targetScreenId: "01-home" }
          ]
        }
      ],
      onError: [
        { type: "state.set", path: "view.submitting", value: false },
        { type: "logic.switch",
          value: "{{ $last.error.code }}",
          cases: [
            // 凭证错（错误 4 次：仅 Toast；第 5 次：写 lockedUntil 进入 locked + Toast 特殊文案）
            { when: "CREDENTIAL", actions: [
              { type: "state.set", path: "view.failureCount", value: "{{ state.view.failureCount + 1 }}" },
              { type: "logic.if",
                when: "{{ state.view.failureCount >= 5 }}",
                then: [
                  { type: "ui.showToast", toastType: "error", message: "尝试次数过多，账号已锁定 30 分钟" },
                  { type: "state.set", path: "view.lockedUntil", value: "{{ Date.now() + 30*60*1000 }}" }
                ],
                else: [
                  { type: "ui.showToast", toastType: "error", message: "账号或密码错误" }
                ]
              },
              // password 模式清密码（决策 D-E6）；code 模式保留
              { type: "logic.if",
                when: "{{ state.view.loginMode === 'password' }}",
                then: [{ type: "state.set", path: "view.form.credential", value: "" }]
              },
              // FormCard shake（决策 D5：登录提交才 shake；GetCode 不 shake）
              { type: "ui.animate", nodeId: "<FormCard-id>", animation: "shake", duration: 300 }
            ]},
            // 后端直接判锁定（不累加 failureCount，直接信任后端 ts）
            { when: "LOCKED", actions: [
              { type: "state.set", path: "view.lockedUntil", value: "{{ $last.error.lockedUntil }}" }
            ]},
            // 限流（仅 Toast，不累加）
            { when: "LIMIT_EXCEEDED", actions: [
              { type: "ui.showToast", toastType: "error", message: "今日登录尝试次数已达上限" }
            ]},
            // 网络错（运行时 NETWORK_ERROR；超时也走这里）
            { when: "NETWORK_ERROR", actions: [
              { type: "ui.showToast", toastType: "error", message: "网络异常，请检查后重试" }
            ]},
            // 服务错 5xx
            { when: "SERVER_ERROR", actions: [
              { type: "ui.showToast", toastType: "error", message: "服务繁忙，请稍后重试" },
              { type: "custom", handler: "platform.reportError",
                payload: { scope: "ds-login", error: "{{ $last.error }}" } }
            ]}
          ],
          // 未知错（兜底）
          default: [
            { type: "ui.showToast", toastType: "error", message: "出了点问题，请稍后重试" },
            { type: "custom", handler: "platform.reportError",
              payload: { scope: "ds-login", error: "{{ $last.error }}" } }
          ]
        }
      ]
    }
  ]
}
```

**关键决策回顾**：
- D1 / loading L2：用按钮内 spinner（state.effects['ds-login'].status==='pending' 驱动），不用全屏遮罩
- D6：第 5 次失败特殊文案+写 lockedUntil（统一在 CREDENTIAL 分支处理）
- D-E1：blur 不抢 focus；SubmitBtn 内 onError 也**不显式抢 focus**——按钮内已有 shake + Toast，已足够反馈
- D-E6：password 模式清密码，code 模式保留
- D-B10：authRedirectTo 消费即清空
- D-B1：超时不累 failureCount（mock ds-login.networkTimeout 走 NETWORK_ERROR 分支，自然不累加）

### 2.13 RegisterLink — click nav.go

```jsonc
{
  trigger: "click",
  description: "跳转注册账号屏（本期占位，由 nav.go 触发；目标屏未实现时由宿主路由层兜底）。",
  actions: [{ type: "nav.go", targetScreenId: "00-register" }]
}
```

### 2.14 ForgotLink — click nav.go

```jsonc
{
  trigger: "click",
  description: "跳转忘记密码屏（本期占位）。",
  actions: [{ type: "nav.go", targetScreenId: "00-forgot-password" }]
}
```

### 2.15 rootNode — screenEnter + screenExit

**screenEnter**（operations #1 + boundaries 重入恢复 D-B2 + 决策 D-B2 codeCountdown 不恢复）：
```jsonc
{
  trigger: "screenEnter",
  description: "进屏门禁：(1) session.status='active' 直跳 01-home；(2) lockedUntil>now 重启 lockedCountdown timer。来源 operations #1 + boundaries 重入恢复。",
  actions: [
    { type: "logic.if",
      when: "{{ globalView.session && globalView.session.status === 'active' }}",
      then: [{ type: "nav.go", targetScreenId: "01-home" }],
      else: [
        // 重入恢复：lockedUntil 仍有效 → 重启 lockedCountdown timer
        { type: "logic.if",
          when: "{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}",
          then: [
            { type: "state.set", path: "view.lockedCountdown",
              value: "{{ Math.max(0, Math.floor((state.view.lockedUntil - Date.now()) / 1000)) }}" },
            { type: "ui.startTimer",
              timerId: "lockedCountdown",
              duration: "{{ state.view.lockedUntil - Date.now() }}",
              interval: 1000,
              onTick: [
                { type: "state.set", path: "view.lockedCountdown", value: "{{ state.view.lockedCountdown - 1 }}" }
              ],
              onComplete: [
                { type: "state.set", path: "view.lockedUntil",    value: null },
                { type: "state.set", path: "view.lockedCountdown", value: 0 },
                { type: "state.set", path: "view.failureCount",    value: 0 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**screenExit**（operations #16 + boundaries 离开页面）：
```jsonc
{
  trigger: "screenExit",
  description: "离屏副作用清理：取消 ds-login / ds-send-code 未完成 fetch；停 codeCD / lockedCountdown 两个 timer。来源 operations #16 + boundaries '离开页面'。",
  actions: [
    { type: "effect.cancel", dataSourceId: "ds-login" },
    { type: "effect.cancel", dataSourceId: "ds-send-code" },
    { type: "ui.stopTimer", timerId: "codeCD" },
    { type: "ui.stopTimer", timerId: "lockedCountdown" }
  ]
}
```

## 3. 关键决策汇总（本任务独有）

| 决策 ID | 内容 | 决定 |
|---|---|---|
| D-EV1 | PolicyText 双链接如何挂事件 | 延后到 design-planner 阶段（拆 3 子节点）；本任务在 meta.interaction summary 留 TODO |
| D-EV2 | SubmitBtn condition 使用复合表达式还是建 view.canSubmit | 复合表达式（与 state-vars D-S1 一致）|
| D-EV3 | SubmitBtn onError CREDENTIAL 是否抢 focus 到 credential | 否——shake + Toast 已足够反馈（与 D-E1 一致）|
| D-EV4 | lockedCountdown timer 启动时 duration 怎么传 | 表达式 `state.view.lockedUntil - Date.now()`（动态计算剩余 ms）|
| D-EV5 | screenEnter 是否要恢复 codeCountdown | 否——boundaries D-B2 已决策不恢复 |
| D-EV6 | ds-login.effect.fetch 是否显式传 params | 否——ds-login.endpoint.body 已含 `{{ view.form.phone / credential / loginMode }}` 表达式 + 已设 defaultParams：{}，自动从表达式求值，effect.fetch 无需重写 params |

## 4. 边界覆盖核对（与 boundaries.md 13 条对账）

| boundary | 在 events 中体现 | ✓ |
|---|---|---|
| 重复点击/防抖 | SubmitBtn condition.when 含 `!view.submitting`；GetCodeBtn condition 含 `state.effects['ds-send-code'].status !== 'pending' && codeCountdown===0` | ✓ |
| 请求超时 | ds-send-code / ds-login mock 用 isTimeout 触发 → onError NETWORK_ERROR 分支不累 failureCount | ✓ |
| 离开页面 | rootNode screenExit 取消双 fetch + 停双 timer | ✓ |
| 重入恢复 | rootNode screenEnter 含 session 跳走 + lockedCountdown 重启 | ✓ |
| 并发冲突 | 两 fetch 不同 dataSourceId 不互扰；按钮 condition 守卫 | ✓ |
| 离线 | SubmitBtn / GetCodeBtn condition 含 `globalView.network.status !== 'offline'` | ✓ |
| 极端数据 | CredentialInput 动态 props maxLength/inputmode/autocomplete | ✓ |
| 键盘遮挡 | 决策 D-B7 不在 events 层处理（由 design CSS） | ✓ |
| 锁定时间精度 | lockedCountdown timer interval=1000 + onComplete 复位 | ✓ |
| 设备时间篡改 | D-B8 不前端防改；LOCKED 分支信任后端 ts | ✓ |
| locked 中切模式 | D-B9 visibleWhen 互斥（NormalForm/LockedView 子树切换由 I-M1-view-business 落，**本任务不挂 visibleWhen 给 FormCard**）；当前 events 默认 locked 期间 SubmitBtn condition 守卫已拒绝 | ⏳ 视图切换待 I-M1-view-business |
| authRedirectTo 跨屏消费 | SubmitBtn onSuccess.then 已落 | ✓ |
| token 过期但 status='active' | 本屏不做主动校验（决策一致） | ✓ |

## 5. 红线自检

| 红线 | 触发 | 本任务 |
|------|-----|------|
| R-EVENTS-01 | 节点声明交互意图但缺对应 trigger | ✅ 14 节点交互职责全覆盖（PolicyText 延后已声明）|
| R-EVENTS-02 | event.actions 为空 | ✅ 全部事件 actions ≥ 1 |
| R-EVENTS-03 | effect.fetch 缺 onSuccess/onError | ✅ ds-login / ds-send-code 均双分支 |
| R-BIND-01 | input 用 event.change 而非 set_bind | ✅ 3 个 input 全用 bind |
| R-EVENT-DESC-01 | event.description 缺失 | ✅ 全部 event 已写 description |
| R-LIFECYCLE-01 | 缺 screenEnter / screenExit | ✅ Root 上挂齐 |

---

## ★ 沉淀到 schema 的结论

本任务总落库 24+ MCP 调用，分以下批次执行：

### 批次 A：3 个 bind
```
element/set_bind { nodeId: PhoneInput,       path: "view.form.phone" }
element/set_bind { nodeId: CredentialInput,  path: "view.form.credential" }
element/set_bind { nodeId: PolicyCheckbox,   path: "view.form.policy" }
```

### 批次 B：5 个 visibleWhen
```
element/set_visible_when { nodeId: PhoneError,         visibleWhen: "{{ !!state.view.errors.phone }}" }
element/set_visible_when { nodeId: CredentialError,    visibleWhen: "{{ !!state.view.errors.credential }}" }
element/set_visible_when { nodeId: GetCodeBtn,         visibleWhen: "{{ state.view.loginMode === 'code' }}" }
element/set_visible_when { nodeId: PasswordToggleEye,  visibleWhen: "{{ state.view.loginMode === 'password' }}" }
```
（共 4 个；FormCard 等容器 visibleWhen 留给 I-M1-view-business）

### 批次 C：5 个动态 props
```
component_prop/update_props { PhoneError      → { textContent }}
component_prop/update_props { CredentialLabel → { textContent }}
component_prop/update_props { CredentialInput → { type, placeholder, maxLength, inputmode, autocomplete }}
component_prop/update_props { CredentialError → { textContent }}
component_prop/update_props { GetCodeBtn      → { textContent }}
```

### 批次 D：events（16 条）
- PhoneInput: 1（blur）
- CodeModeBtn: 1（click）
- PasswordModeBtn: 1（click）
- CredentialInput: 1（blur）
- GetCodeBtn: 1（click）
- PasswordToggleEye: 1（click）
- PolicyText: ❌ 延后（D-EV1）
- SubmitBtn: 1（click）★
- RegisterLink: 1（click）
- ForgotLink: 1（click）
- Root: 2（screenEnter / screenExit）
- 合计 **11 条 events**（不计 PolicyText 延后）

> 详细 actions 见上方 §2。落库时表达式按命名表展开为完整字符串。
