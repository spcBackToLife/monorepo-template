> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-events
> 对应 schema 字段：node.events[*] + bind + repeat + visibleWhen + props.textContent（动态部分）+ 派生展示节点 minimal-debug styles

# Step I-events: <屏名> — 节点 events.actions 落库（核心）★

> 详细规范见 `schema-spec/interaction-events.md` + `../common/references/v2-actions-cheatsheet.md`。
>
> 这是 interaction 阶段最核心、最长的任务。所有"操作 → UI 行为"的契约都在这里翻译成结构化 actions。

---

## ☐ 翻译清单 todo（v2.5 §0.1.10 强制段，必须放本 md 最前面）★

> **执行流程刚性要求**：本任务启动前必须**先读完所有上游分析 md 的"★ 翻译契约"段**（statemachine / operations / loading / errors / boundaries / state-vars / datasources），把所有"应翻译为 schema 产物"且"落库任务=I-X-events"的行汇总到这里——形成可逐条勾选的 todo 清单。
>
> **每条 [ ] 必须在 schema 落库后改为 [x]，且配一段"actions 链翻译过程"细节推理（见下方 §推理过程）。本 md 头部 todo 全部 [x] 后才能写"★ 沉淀到 schema 的结论"段并标本任务 done。**
>
> **若发现某个上游决策没列翻译契约段** → 写明"上游 md 此决策没列翻译契约 → 退回上游补"，**不要自行猜测或代行**——这是 AI 的诚实义务（v2.5 §0.1.10.6）。

### 来源汇总（每个上游 md 的"★ 翻译契约"段，对所有 落库任务=I-X-events 的行计数）

```
- statemachine.md  → events 落库 X 条
- operations.md    → events 落库 X 条
- loading.md       → events 落库 X 条（动态文案 / spinner visibleWhen）
- errors.md        → events 落库 X 条
- boundaries.md    → events 落库 X 条
- state-vars.md    → 数据写入点 X 条（每个 view 变量必须找到至少一个 actions 写入它）
- datasources.md   → fetch 调用点 X 条（DS-* 系列）

合计 events 落库 todo: M 条
```

### 逐条 todo（按节点分组组织最便于落库）

> 每条格式：`- [ ] <决策ID>(<分支>): <一句话产物> → 期望指纹 <ArtifactCheck>`
> 同一节点的多条 todo 归一组，落库时一次 event/add 多动作链一并满足。
> 下面是登录屏的样板，**实操时换成本屏的真实节点 + 真实决策 ID**。

#### 节点 1: PhoneInput

- [ ] O-2: bind=view.form.phone → `nonEmpty path: PhoneInput.bind`
- [ ] O-3 + D-E4(1): blur 校验 actions（正则 + state.set view.errors.phone）→ `nodeHasEvent { trigger:'blur' }`
- [ ] B-6: props.maxLength=11

#### 节点 2: CredentialInput

- [ ] O-4: bind=view.form.credential
- [ ] O-4 + D-E4(2): blur 校验 actions（按 loginMode 分支）→ `nodeHasEvent { trigger:'blur' }`
- [ ] B-6: props.maxLength 动态表达式
- [ ] 动态 props（type/inputmode/placeholder/autocomplete 由 loginMode/passwordVisible 切换）

#### 节点 3: SubmitBtn ★ 核心 + 历史漏译复盘点

- [ ] **D-E4(3)**: click 前置校验 actions（强制重跑 phone + credential 校验，写 errors.*；任一非法则 ui.focus 错字段 + Toast + 不进 fetch）★
- [ ] O-7: click 主流程（ui.haptic + state.set submitting=true + effect.fetch ds-login）
- [ ] DS-5: effect.fetch dataSourceId='ds-login' + onSuccess + onError 完整双分支
- [ ] B-1: condition.when 含 `!view.submitting`
- [ ] B-5: condition.when 含 `network online`
- [ ] B-7: condition.when 含 `非锁定`
- [ ] B-8: onSuccess 末尾 logic.if authRedirectTo 消费 + 清空
- [ ] R3 锁定升级: failureCount≥5 写 lockedUntil + 特殊 Toast
- [ ] R2 onSuccess 写 globalView.session = active

→ 综合期望指纹：`nodeHasEvent { nodeId: <SubmitBtn-id>, trigger: 'click' }`

#### 节点 4: GetCodeBtn

- [ ] O-6 + DS-6: click → effect.fetch ds-send-code + onSuccess 启动 60s timer + onError 4-case 分支
- [ ] B-5: condition.when 含 `loginMode==='code' + 手机号合法 + codeCountdown===0 + ds 非 pending + network online + 非锁定`
- [ ] L-3(动态文案): props.textContent 三态表达式（发送中/重新获取(Ns)/获取验证码）

→ 期望指纹：`nodeHasEvent { nodeId: <GetCodeBtn-id>, trigger: 'click' }`

#### 节点 5: PasswordToggleEye

- [ ] O-5 + SV-7: click → state.toggle view.passwordVisible

→ 期望指纹：`nodeHasEvent { nodeId: <PasswordToggleEye-id>, trigger: 'click' }`

#### 节点 6: CodeModeBtn / PasswordModeBtn

- [ ] O-1: 各自 click → state.set loginMode + 清 errors.credential + 清 form.credential
- [ ] condition: 当前已是该模式时 condition 拒绝

#### 节点 7: PolicyCheckbox

- [ ] bind=view.form.policy（无 event；点击/取消由 bind 自动）

#### 节点 8: PhoneError / CredentialError（派生展示节点）

- [ ] D-E1 + 派生显示: textContent 接 errors.* + visibleWhen 接 !!errors.*
- [ ] **minimal-debug styles ☆**：color/fontSize/lineHeight/marginTop/minHeight（让用户预览看到红字）

#### 节点 9: SubmitSpinner / CodeSendSpinner（按钮内 spinner，派生展示节点）

- [ ] visibleWhen 接 effects.status==='pending' 或 view.submitting
- [ ] **minimal-debug styles ☆**

#### 节点 10: RegisterLink / ForgotLink

- [ ] O-8 / O-9: 各自 click → nav.go

#### 节点 11: Root（屏生命周期）

- [ ] O-10 + S-T5: screenEnter → 进屏门禁（active 跳 home）+ 重启 lockedCountdown timer
- [ ] O-11 + B-3 + DS-7: screenExit → effect.cancel × 2 + ui.stopTimer × 2

### 全勾自审

落完所有 schema 后逐条审：
- [ ] 上面所有 [ ] 是否变成 [x]？
- [ ] 每条都有对应的"actions 链翻译过程"细节段（见下文 §推理过程）？
- [ ] 全部产物的 expectedArtifacts 已经塞进 plan 任务（见末尾"沉淀"段）？

→ 全 ✓ 才能写 ★ 沉淀到 schema 的结论。

> ☆ minimal-debug styles 仅限 7 个属性白名单（color/fontSize/lineHeight/marginTop/marginBottom/minHeight/padding），节点须为 inline-error / inline-hint / inline-success / countdown-text / spinner / toast-text 之一。详见 `forbidden-fields-interaction.md §派生展示节点 minimal-debug styles 白名单`。

---

## 推理过程

### 1. 节点交互职责清单

> 列出本屏每个需要 events / bind / repeat / visibleWhen / 动态文案 的节点。

| 节点 name | 节点 id | 类型 | 交互职责 | 实现 |
|----------|---------|------|---------|-----|
| CodeModeBtn / PasswordModeBtn | n5a/n5b | click 切换 | 切换登录方式 | event click → state.set loginMode + 清错 |
| PhoneInput | n6 | 受控输入 + onBlur 校验 | 失焦校验手机号（不抢 focus）| bind + event blur |
| CredentialInput | n7 | 受控输入 + onBlur 校验 + 动态 props | 失焦校验 + 类型/maxLength/placeholder 切换 | bind + event blur + 动态 props |
| GetCodeBtn | n8 | click 请求 | 发短信验证码 + 60s 倒计时 | event click → effect.fetch + ui.startTimer |
| PasswordToggleEye | n9 | click 切换 | 切换密码可见 | event click → state.toggle |
| PolicyCheckbox | n10 | 受控勾选 | 协议状态 | bind |
| SubmitBtn | n11 | 主流程 click ★ | 登录提交（前置校验 + fetch + 6-case onError）| event click（含前置校验 + effect.fetch + onSuccess + onError）|
| RegisterLink / ForgotLink | n12/n13 | nav.go | 跳注册 / 跳忘记密码 | event click → nav.go |
| PhoneError / CredentialError | — | 派生展示 | 行内红字 | textContent + visibleWhen + minimal-debug styles |
| SubmitSpinner / CodeSendSpinner | — | 派生展示 | 按钮内 spinner | visibleWhen + minimal-debug styles |
| rootNode | — | 屏生命周期 | 进入门禁 / 离开取消 | screenEnter + screenExit |

### 2. actions 链翻译过程（每个节点逐个推理）

#### CodeModeBtn / PasswordModeBtn（DAM 对账：O-1）

```jsonc
// CodeModeBtn
{
  trigger: "click",
  description: "切换到验证码登录：清 credential + 清 credential error；当前已是 code 模式则 condition 拒绝",
  condition: { when: "{{ state.view.loginMode !== 'code' }}" },
  actions: [
    { type: "state.set", path: "view.loginMode", value: "code" },
    { type: "state.set", path: "view.form.credential", value: "" },
    { type: "state.set", path: "view.errors.credential", value: "" }
  ]
}
// PasswordModeBtn 对称
```

候选 / 否决：
- A：用 state.toggle → 否决：toggle 仅适用 boolean，loginMode 是字符串枚举
- B：切换时不清错误 → 否决：错误信息可能不再适用，需清空

#### PhoneInput（onBlur 校验）★ DAM 对账：O-2 + O-3 + D-E4(1) + B-6

```jsonc
// bind（值同步）
element/set_bind { nodeId: <PhoneInput-id>, path: "view.form.phone" }

// 动态 props（maxLength 静态 11，type 静态 'tel'，placeholder 静态）
component_prop/update_props { nodeId: <PhoneInput-id>,
  props: { type: "tel", maxLength: 11, placeholder: "请输入手机号" } }

// event blur（onBlur 档校验，不抢 focus 决策 D-E1）
{
  trigger: "blur",
  description: "失焦校验手机号格式（onBlur 档），空不触发；非空走正则",
  actions: [{
    type: "logic.if",
    when: "{{ state.view.form.phone && state.view.form.phone.length > 0 }}",
    then: [{ type: "state.set", path: "view.errors.phone",
              value: "{{ /^1[3-9]\\d{9}$/.test(state.view.form.phone) ? '' : '请输入正确的手机号' }}" }],
    else: [{ type: "state.set", path: "view.errors.phone", value: "" }]
  }]
}
```

#### CredentialInput（onBlur 校验 + 动态 props）★ DAM 对账：O-4 + D-E4(2) + B-6

```jsonc
element/set_bind { nodeId: <CredentialInput-id>, path: "view.form.credential" }

// 动态 props（5 字段全部按 loginMode 切换）
component_prop/update_props { nodeId: <CredentialInput-id>,
  props: {
    type:        "{{state.view.loginMode === 'code' ? 'text' : (state.view.passwordVisible ? 'text' : 'password')}}",
    inputmode:   "{{state.view.loginMode === 'code' ? 'numeric' : 'text'}}",
    maxLength:   "{{state.view.loginMode === 'code' ? 6 : 20}}",
    placeholder: "{{state.view.loginMode === 'code' ? '请输入 6 位验证码' : '请输入密码（6-20 位含字母+数字）'}}",
    autocomplete:"{{state.view.loginMode === 'code' ? 'one-time-code' : 'current-password'}}"
  }
}

// event blur（按 loginMode 分支两套校验）
{
  trigger: "blur",
  description: "失焦校验凭证：空不触发；code 模式校 6 位数字，password 模式校 6-20 位含字母+数字。不抢 focus。",
  actions: [{
    type: "logic.if",
    when: "{{ state.view.form.credential && state.view.form.credential.length > 0 }}",
    then: [{ type: "state.set", path: "view.errors.credential",
              value: "{{ state.view.loginMode === 'code' ? (/^\\d{6}$/.test(state.view.form.credential) ? '' : '请输入 6 位数字验证码') : (/^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/.test(state.view.form.credential) ? '' : '密码需 6-20 位且包含字母和数字') }}" }],
    else: [{ type: "state.set", path: "view.errors.credential", value: "" }]
  }]
}
```

#### SubmitBtn（核心 main flow）★ DAM 对账：D-E4(3) + O-7 + DS-5 + B-1/5/7/8 + R2/R3

⚠️ **历史漏译复盘点**：v2.5 之前 D-E4 决策"onBlur+onSubmit 双档"中的 **onSubmit 档**经常漏译——所以 SubmitBtn click actions 必须**显式**含前置校验链。

⚠️ **关键 UX 决策**：`condition` 仅守"系统级前置"（避免静默拦截无反馈），表单合法性挪到 actions 第一步用 logic.if 判断 + 错时显式给 UI 反馈。

```jsonc
{
  trigger: "click",
  description: "登录提交主流程：前置校验 + ui.haptic + fetch + 6-case onError",
  // ✅ condition 仅守系统级（避免用户输入非法时按钮静默无反馈）
  condition: {
    when: "{{ !state.view.submitting && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > Date.now()) }}"
  },
  actions: [
    // ── Step 1: 强制重跑全部字段校验，写 errors.* ──
    { type: "state.set", path: "view.errors.phone",
      value: "{{ /^1[3-9]\\d{9}$/.test(state.view.form.phone) ? '' : '请输入正确的手机号' }}" },
    { type: "state.set", path: "view.errors.credential",
      value: "{{ state.view.loginMode==='code' ? (/^\\d{6}$/.test(state.view.form.credential) ? '' : '请输入 6 位数字验证码') : (/^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/.test(state.view.form.credential) ? '' : '密码需 6-20 位且包含字母和数字') }}" },

    // ── Step 2: 任一字段错或 policy 未勾 → 反馈 + return（不进 fetch）──
    { type: "logic.if",
      when: "{{ !!state.view.errors.phone || !!state.view.errors.credential || !state.view.form.policy }}",
      then: [
        { type: "ui.showToast", toastType: "error", message: "请检查表单后再提交" },
        // focus 第一个错的字段（按 phone → credential → policy 顺序）
        { type: "logic.if",
          when: "{{ !!state.view.errors.phone }}",
          then: [{ type: "ui.focus", nodeId: "<PhoneInput-id>" }],
          else: [{ type: "logic.if",
                   when: "{{ !!state.view.errors.credential }}",
                   then: [{ type: "ui.focus", nodeId: "<CredentialInput-id>" }],
                   else: [{ type: "ui.animate", nodeId: "<PolicyRow-id>", animation: "shake", duration: 300 }] }]
        }
        // 不调 fetch，end
      ],
      else: [
        // ── Step 3: 全合法 → ui.haptic + 主流程 ──
        { type: "custom", handler: "hapticFeedback", payload: { strength: "medium" } },
        { type: "state.set", path: "view.submitting", value: true },
        { type: "effect.fetch", dataSourceId: "ds-login",
          onSuccess: [
            { type: "state.set", path: "globalView.session",
              value: {
                user: "{{ $last.response.user }}",
                token: "{{ $last.response.token }}",
                status: "active",
                expiresAt: "{{ Date.now() + $last.response.expiresIn * 1000 }}"
              } },
            { type: "state.set", path: "view.submitting", value: false },
            { type: "state.set", path: "view.failureCount", value: 0 },
            { type: "state.set", path: "view.lockedUntil", value: null },
            { type: "ui.delay", duration: 500 },
            { type: "logic.if",
              when: "{{ !!globalView.nav.authRedirectTo }}",
              then: [
                { type: "nav.go", targetScreenId: "{{ globalView.nav.authRedirectTo }}" },
                { type: "state.set", path: "globalView.nav.authRedirectTo", value: null }
              ],
              else: [{ type: "nav.go", targetScreenId: "01-home" }]
            }
          ],
          onError: [
            { type: "state.set", path: "view.submitting", value: false },
            { type: "logic.switch",
              value: "{{ $last.error.code }}",
              cases: [
                { when: "CREDENTIAL", actions: [
                    { type: "state.set", path: "view.failureCount",
                      value: "{{ state.view.failureCount + 1 }}" },
                    { type: "logic.if", when: "{{ state.view.failureCount >= 5 }}",
                      then: [
                        { type: "ui.showToast", toastType: "error", message: "尝试次数过多，账号已锁定 30 分钟" },
                        { type: "state.set", path: "view.lockedUntil",
                          value: "{{ Date.now() + 30*60*1000 }}" }
                      ],
                      else: [{ type: "ui.showToast", toastType: "error", message: "账号或密码错误" }]
                    }
                ]},
                // LOCKED / LIMIT_EXCEEDED / TIMEOUT / NETWORK_ERROR / SERVER_ERROR ...
                // ⚠️ v2.6：TIMEOUT 与 NETWORK_ERROR 必须分两个 case：
                //   { when: "TIMEOUT",       actions: [ui.showToast "请求超时，请检查网络后重试"] },
                //   { when: "NETWORK_ERROR", actions: [ui.showToast "网络异常，请检查后重试"] },
                // 两者都不累加 view.failureCount（弱网误锁）
              ],
              default: [
                { type: "ui.showToast", toastType: "error", message: "出了点问题，请稍后重试" },
                { type: "custom", handler: "platform.reportError",
                  payload: { error: "{{ $last.error }}", scope: "ds-login" } }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

候选 / 否决（关键 UX 决策）：
- ❌ **A**：condition 内含表单合法性 → 否决：用户输入非法时按钮静默无反馈（v2.5 之前的设计漏洞）
- ❌ B：onChange 实时校验 + condition 控制 disabled → 否决：onChange 触发频繁，且仍存在用户跳过 blur 直接点提交的边界
- ✅ **选定方案**：condition 仅守系统级 + actions 强制重跑校验 + 错则 Toast+focus，全合法才 fetch

#### rootNode 生命周期（DAM 对账：O-10 + O-11 + S-T5 + B-3 + DS-7）

```jsonc
[
  {
    trigger: "screenEnter",
    description: "进屏门禁：active 直跳 home / lockedUntil>now 重启 lockedCountdown timer",
    actions: [{
      type: "logic.if",
      when: "{{ globalView.session && globalView.session.status === 'active' }}",
      then: [{ type: "nav.go", targetScreenId: "01-home" }],
      else: [{
        type: "logic.if",
        when: "{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}",
        then: [
          { type: "state.set", path: "view.lockedCountdown",
            value: "{{ Math.max(0, Math.floor((state.view.lockedUntil - Date.now()) / 1000)) }}" },
          { type: "ui.startTimer", timerId: "lockedCountdown",
            duration: "{{ state.view.lockedUntil - Date.now() }}", interval: 1000,
            onTick: [{ type: "state.set", path: "view.lockedCountdown",
                       value: "{{ state.view.lockedCountdown - 1 }}" }],
            onComplete: [
              { type: "state.set", path: "view.lockedUntil", value: null },
              { type: "state.set", path: "view.lockedCountdown", value: 0 },
              { type: "state.set", path: "view.failureCount", value: 0 }
            ]
          }
        ]
      }]
    }]
  },
  {
    trigger: "screenExit",
    description: "离屏副作用清理：取消双 fetch + 停双 timer",
    actions: [
      { type: "effect.cancel", dataSourceId: "ds-login" },
      { type: "effect.cancel", dataSourceId: "ds-send-code" },
      { type: "ui.stopTimer", timerId: "codeCD" },
      { type: "ui.stopTimer", timerId: "lockedCountdown" }
    ]
  }
]
```

### 3. 候选方案与否决（重要决策）

- 候选 A：失败 5 次锁定改在 onError 之外（如 watch 失败次数）→ 否决：当前 schema 不支持 watch，logic.if 内联清晰
- 候选 B：CredentialInput 用 event.change 替代 bind → 否决：失去受控同步，要手写 state.set + value 取值
- 候选 C：PhoneInput 用 onChange 实时校验 → 否决（决策 D-E4）：输入过程闪烁，blur 档已足够
- ...

### 4. 派生展示节点的 minimal-debug styles 落库（v2.5 ☆）

为了让用户预览能看到错误反馈、spinner、倒计时——interaction 阶段必须给派生展示节点写 minimal-debug styles：

```jsonc
// PhoneError / CredentialError（inline-error 角色）
style/update {
  projectId, nodeId: "<PhoneError-id>",
  styles: { color: "#ef4444", fontSize: "12px", lineHeight: "1.4", marginTop: "4px", minHeight: "16px" }
}
style/update {
  projectId, nodeId: "<CredentialError-id>",
  styles: { color: "#ef4444", fontSize: "12px", lineHeight: "1.4", marginTop: "4px", minHeight: "16px" }
}

// SubmitSpinner / CodeSendSpinner（spinner 角色）
style/update {
  projectId, nodeId: "<SubmitSpinner-id>",
  styles: { color: "#5B6CFF", fontSize: "13px", minHeight: "16px" }
}
```

⚠️ 仅限 7 属性白名单：`color / fontSize / lineHeight / marginTop / marginBottom / minHeight / padding`。详见 `forbidden-fields-interaction.md §派生展示节点 minimal-debug styles 白名单`。

design 阶段会用主题 token 完整覆盖（如 `color: '$token:colors.error'`），不冲突。

### 5. 边界覆盖核对（来自 boundaries.md 翻译契约段）

| 边界（boundaries 翻译契约 ID）| 在 events 中如何体现 | ✓/❌ |
|---------------------------|--------------------|-----|
| B-1 重复点击防抖 + submitting 守卫 | SubmitBtn condition.when 含 `!view.submitting` + actions 首步置 true + onSuccess/onError 末尾置 false | ✓ |
| B-3 离开页面取消 | rootNode screenExit + effect.cancel × 2 + ui.stopTimer × 2 | ✓ |
| B-4 重入恢复 lockedCountdown | rootNode screenEnter ui.startTimer 重启 | ✓ |
| B-5 离线阻断提交 | SubmitBtn / GetCodeBtn condition.when 含 `network online` | ✓ |
| B-7 锁定时整表单 disabled | NormalFormView/LockedView visibleWhen 互斥（属 view-business 任务）| ✓ |
| B-8 authRedirectTo 消费即清空 | SubmitBtn.onSuccess 末尾 logic.if 消费 + 清空 | ✓ |
| ... | ... | |

### 6. state-vars 写入点核对（来自 state-vars.md 翻译契约段）

| view 变量 | 写入触发点 | ✓/❌ |
|----------|-----------|-----|
| view.errors.phone | PhoneInput.blur + SubmitBtn.click 前置校验 | ✓ |
| view.errors.credential | CredentialInput.blur + SubmitBtn.click 前置校验 | ✓ |
| view.failureCount | SubmitBtn.onError CREDENTIAL 累加 / onSuccess 清零 / Root.screenEnter onComplete 清零 | ✓ |
| view.lockedUntil | SubmitBtn.onError 5 次时写入 / onSuccess 清空 / Root.screenEnter onComplete 清空 | ✓ |
| view.codeCountdown | GetCodeBtn.onSuccess startTimer onTick / Root.screenEnter 重启 / Root.screenExit stopTimer | ✓ |
| view.passwordVisible | PasswordToggleEye.click toggle | ✓ |
| view.submitting | SubmitBtn.click actions 首步 true / onSuccess+onError 末尾 false | ✓ |

> **任一变量没找到写入点 → schema 死变量，必须补**。

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) 受控绑定
element/set_bind { projectId, nodeId: <PhoneInput-id>, path: "view.form.phone" }
element/set_bind { projectId, nodeId: <CredentialInput-id>, path: "view.form.credential" }
element/set_bind { projectId, nodeId: <PolicyCheckbox-id>, path: "view.form.policy" }

// 2) 动态 props（5 字段一次性更新）
component_prop/update_props { projectId, nodeId: <CredentialInput-id>,
  props: {
    placeholder: "{{state.view.loginMode === 'code' ? '请输入 6 位验证码' : '请输入密码（6-20 位含字母+数字）'}}",
    type:        "{{state.view.loginMode === 'code' ? 'text' : (state.view.passwordVisible ? 'text' : 'password')}}",
    maxLength:   "{{state.view.loginMode === 'code' ? 6 : 20}}",
    inputmode:   "{{state.view.loginMode === 'code' ? 'numeric' : 'text'}}",
    autocomplete:"{{state.view.loginMode === 'code' ? 'one-time-code' : 'current-password'}}"
  }
}

// 3) 派生展示节点的 textContent + visibleWhen
component_prop/update_props { projectId, nodeId: <PhoneError-id>, props: { textContent: "{{state.view.errors.phone}}" } }
element/set_visible_when { projectId, nodeId: <PhoneError-id>, expression: "{{!!state.view.errors.phone}}" }
// (CredentialError / SubmitSpinner / CodeSendSpinner 同)

// 4) 派生展示节点的 minimal-debug styles（v2.5 ☆ 仅 7 属性白名单）
style/update { projectId, nodeId: <PhoneError-id>, styles: { color: "#ef4444", fontSize: "12px", lineHeight: "1.4", marginTop: "4px", minHeight: "16px" } }
style/update { projectId, nodeId: <CredentialError-id>, styles: { color: "#ef4444", fontSize: "12px", lineHeight: "1.4", marginTop: "4px", minHeight: "16px" } }
style/update { projectId, nodeId: <SubmitSpinner-id>, styles: { color: "#5B6CFF", fontSize: "13px", minHeight: "16px" } }
// ...

// 5) events（每个节点 event/add 一次或多次）
event/add { projectId, nodeId: <CodeModeBtn-id>, trigger: "click", ... }
event/add { projectId, nodeId: <PasswordModeBtn-id>, trigger: "click", ... }
event/add { projectId, nodeId: <PhoneInput-id>, trigger: "blur", ... }
event/add { projectId, nodeId: <CredentialInput-id>, trigger: "blur", ... }
event/add { projectId, nodeId: <PasswordToggleEye-id>, trigger: "click", ... }
event/add { projectId, nodeId: <GetCodeBtn-id>, trigger: "click", ... }
event/add { projectId, nodeId: <SubmitBtn-id>, trigger: "click", ... }  // ★ 含前置校验 + fetch + 6-case
event/add { projectId, nodeId: <RegisterLink-id>, trigger: "click", ... }
event/add { projectId, nodeId: <ForgotLink-id>, trigger: "click", ... }
event/add { projectId, nodeId: <Root-id>, trigger: "screenEnter", ... }
event/add { projectId, nodeId: <Root-id>, trigger: "screenExit", ... }

// 6) 任务标 done 时的 expectedArtifacts（从 todo 清单产物指纹列汇总）
meta/update_plan_task { taskId: "I-X-events", patch: {
  status: "done",
  expectedArtifacts: [
    { kind: "anyNodeHasEvents", path: "rootNode", min: 1 },                  // 屏级粗指纹
    { kind: "nodeHasEvent", nodeId: "<SubmitBtn-id>", trigger: "click" },     // D-E4(3) ★
    { kind: "nodeHasEvent", nodeId: "<PhoneInput-id>", trigger: "blur" },     // D-E4(1)
    { kind: "nodeHasEvent", nodeId: "<CredentialInput-id>", trigger: "blur" },// D-E4(2)
    { kind: "nodeHasEvent", nodeId: "<GetCodeBtn-id>", trigger: "click" },    // O-6
    { kind: "nodeHasEvent", nodeId: "<PasswordToggleEye-id>", trigger: "click" }, // O-5
    { kind: "nodeHasEvent", nodeId: "<CodeModeBtn-id>", trigger: "click" },   // O-1a
    { kind: "nodeHasEvent", nodeId: "<PasswordModeBtn-id>", trigger: "click" },// O-1b
    { kind: "nodeHasEvent", nodeId: "<RegisterLink-id>", trigger: "click" },  // O-8
    { kind: "nodeHasEvent", nodeId: "<ForgotLink-id>", trigger: "click" },    // O-9
    { kind: "nodeHasEvent", nodeId: "<Root-id>", trigger: "screenEnter" },    // O-10
    { kind: "nodeHasEvent", nodeId: "<Root-id>", trigger: "screenExit" }      // O-11
  ]
}}
```
