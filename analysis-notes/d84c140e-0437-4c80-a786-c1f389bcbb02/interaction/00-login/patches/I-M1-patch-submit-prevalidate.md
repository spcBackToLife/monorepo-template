> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-patch-submit-prevalidate
> 对应 schema 字段：rootNode > NormalFormView > FormCard > SubmitBtn(nd_5a15fd87f060436295b4f).events[0]（click）
> 上游来源：v2.5-dam-process-overhaul-decision.md §5 第 1 条 + errors.md D-E4 决策"onBlur+onSubmit 两档"
> v2.5 §0.1.10 翻译契约结构强制段（落库类）

# Patch I-M1-patch-submit-prevalidate — D-E4(3) SubmitBtn.click 前置校验补译

---

## ☐ 翻译清单 todo（v2.5 §0.1.10 强制头部段）★

> 来源：errors.md 决策 D-E4 写"onBlur+onSubmit 两档"；events.md 落库时只翻译了 onBlur 那档，onSubmit 档（即 SubmitBtn.click 进入主流程前的强制校验）漏译。

来源汇总（精确到来源 md 的决策行）：
- errors.md D-E4(1) PhoneInput.blur 校验 → 已落库 ✓（events.md §2 PhoneInput）
- errors.md D-E4(2) CredentialInput.blur 校验 → 已落库 ✓
- errors.md **D-E4(3) SubmitBtn.click 前置校验 → 历史漏译复盘点 ★**

合计本任务 events 落库 todo: **1 条**（含若干嵌套子动作）

逐条 todo：

- [ ] **D-E4(3)** SubmitBtn.click actions 重写：
  - [ ] (a) condition 仅守系统级（移除复合表达式中的"表单合法性"部分；保留 !submitting / !offline / !locked 三守卫）
  - [ ] (b) actions Step-1：强制重跑 phone 正则校验，写 view.errors.phone
  - [ ] (c) actions Step-2：强制重跑 credential 正则校验（按 loginMode 分支两套），写 view.errors.credential
  - [ ] (d) actions Step-3：logic.if 任一字段错或 policy 未勾 → ui.showToast(error,"请检查表单后再提交")
        + 按 phone → credential → policy 顺序选第一条错的字段做 focus/animate
        + 不进 fetch（短路 return）
  - [ ] (e) actions Step-4（else 分支）：原有主流程不变（haptic + state.set submitting=true + effect.fetch ds-login + onSuccess/onError 完整保留）
  - [ ] **(f) 期望指纹**：`nodeHasEvent { nodeId: 'nd_5a15fd87f060436295b4f', trigger: 'click' }` —— 已在 I-M1-events 任务的 expectedArtifacts 中存在；本任务的 expectedArtifacts 复用同一指纹（精度未变：仍是"SubmitBtn.click 有 actions 非空"，但 actions 内容从 v2.4 单分支主流程变成 v2.5 含前置校验的 if/else 双分支）

→ 全部 [x] 才能写"沉淀"段。

---

## 推理过程

### 1. 历史漏译现场还原（v2.5-dam-process-overhaul-decision.md §1.1）

**事实链**：
- `errors.md` 决策 D-E4 文字：「校验时机 onBlur+onSubmit 两档（不用 onChange，不做 debounce 查重）」
- `events.md` 落库时只在 PhoneInput.blur / CredentialInput.blur 写了 onBlur 档校验
- onSubmit 档（指 SubmitBtn.click 在进入 fetch 前再校验一次）**只活在 D-E4 决策的脑子里**——events.md 把"表单合法性"塞进了 SubmitBtn.click 的 condition 守卫
- 但 condition 守卫是**静默拦截**：condition.when 为 false 时 actions 整段不执行，用户**看不到任何反馈**——这正是 v2.5 §1.1 暴露的"用户实操静默无反馈"现场

**根因**：condition 守卫语义不等于 onSubmit 档校验。"onSubmit 档校验"的语义要求是：
1. 用户点了按钮 → 必须给反馈（即使表单非法）
2. 反馈包含"哪里错了 + 怎么修"（Toast 提示 + focus 第一个错的字段）
3. 校验过的才进 fetch

condition 守卫只满足 (3)，缺 (1)(2)，所以语义不等价。

### 2. 候选方案与否决

| 候选 | 内容 | 决定 |
|---|---|---|
| ❌ A | 维持现状（复合 condition 守卫）| 否决：违反 D-E4 字面要求 + v2.5 §1.1 的根因诊断（用户静默无反馈） |
| ❌ B | 把表单合法性挪到 disabled 视觉态（用 visualState 表达 disabled，design 阶段画灰按钮）| 否决：① interaction 阶段不应该写 visualState（边界 R-INTERACTION-FORBIDDEN）② 即使设了 disabled，盲人/键盘用户仍可能 click 触发；要兜反馈 |
| ❌ C | onChange 实时校验 + Submit 按钮 disabled | 否决：D-E4 已明文不做 onChange（输入过程闪烁） + B 同样问题 |
| ✅ D | **condition 仅守系统级 + actions 用 logic.if 强制重跑校验 + 错时 Toast+focus + 全合法才 fetch** | **选定**——v2.5 events.template.md §推理过程 SubmitBtn 段示例方案 |

### 3. 字段级最小改动 plan

当前 SubmitBtn.click event：
```jsonc
{
  trigger: "click",
  condition: { when: "<6 个守卫 AND 表达式：表单+policy+system>" },
  actions: [
    { type: "custom", handler: "hapticFeedback" },
    { type: "state.set", path: "view.submitting", value: true },
    { type: "effect.fetch", dataSourceId: "ds-login", onSuccess: [...], onError: [...] }
  ]
}
```

改造后 SubmitBtn.click event：
```jsonc
{
  trigger: "click",
  condition: { when: "<3 个系统级守卫>" },                   // ← (a) 简化
  actions: [
    { type: "state.set", path: "view.errors.phone",      value: "<phone 校验>" },        // ← (b) 新增
    { type: "state.set", path: "view.errors.credential", value: "<credential 校验>" },   // ← (c) 新增
    { type: "logic.if",                                                                  // ← (d) 包外层
      when: "<任一字段错或 policy 未勾>",
      then: [
        { type: "ui.showToast", ... },                                                   //     反馈
        { type: "logic.if", ..., then: [ui.focus PhoneInput], else: [...] }              //     focus/animate
        // 不进 fetch
      ],
      else: [                                                                            // ← (e) 原主流程进 else
        { type: "custom", handler: "hapticFeedback", ... },
        { type: "state.set", path: "view.submitting", value: true },
        { type: "effect.fetch", ..., onSuccess: [...原样保留], onError: [...原样保留] }
      ]
    }
  ]
}
```

**保留契约**：
- onSuccess 5 步逻辑（visualState success / data.user / globalView.session / 清 submitting+failureCount+lockedUntil / delay+nav 消费）100% 不动
- onError 5-case logic.switch（CREDENTIAL/LOCKED/LIMIT_EXCEEDED/NETWORK_ERROR/SERVER_ERROR + default 兜底）100% 不动
- description 更新成包含"前置校验"的描述

**改动幅度**：1 个 `event/update_event` 调用（actions 替换式更新——event 工具描述明文写"actions 替换式更新，不做合并"，所以必须把整段 actions 拼齐重写）。

### 4. condition 系统级 3 守卫分析

保留：
- `!state.view.submitting` —— 防重复点击（B-1 边界）
- `globalView.network.status !== 'offline'` —— 离线阻断（B-5 边界 / D-E2）
- `!(state.view.lockedUntil && state.view.lockedUntil > Date.now())` —— 锁定阻断（B-7 边界 / locked 态）

移除：
- `formValid && policy === true` 部分 —— 挪到 actions Step-1~3 用 logic.if 内联校验

**为什么这 3 个不挪进 actions**：
- submitting/network/locked 是**真正的"系统级"前置**——它们不应给"表单错误"类反馈
  - submitting=true 时再点击：用户已经点过了，最好的反馈是"按钮 disabled 视觉态"（design 阶段做），不是 Toast
  - offline 时点击：全局已有 network banner（globalOverlays.global-offline-banner），无需额外 Toast 噪音
  - locked 态：整个 LockedView 子树占位，SubmitBtn 在 NormalFormView 内已被 visibleWhen 隐藏（view-business 任务已落）——理论上点不到；condition 守卫是双保险
- 表单合法性是**用户级**前置——出错就要给用户清晰反馈

### 5. focus 顺序设计

按文档读序「phone → credential → policy」：
1. phone 错 → ui.focus PhoneInput
2. phone 没错 + credential 错 → ui.focus CredentialInput
3. 上面都没错 + policy 没勾 → policy 不能 focus（checkbox 焦点对盲人无意义），改用 ui.animate(shake) PolicyRow

**节点 ID**：
- PhoneInput: nd_083c744e1699418e9d01e
- CredentialInput: nd_989c02eb1f224e0c9f973
- PolicyRow: nd_36cea068f4af4b8fbdbb3（FormCard.children 中第 4 个 div，是 PolicyCheckbox+PolicyText 的容器）

### 6. ui.focus 动作可用性核对

v2 actions 22 动词 cheatsheet 中 ui 命名空间已包含：showToast / openUrl / delay / showOverlay / hideOverlay / animate / startTimer。**ui.focus 不在 22 动词列表里。**

候选：
- A: 用 `custom { handler: "ui.focus", payload: { nodeId } }` —— ✓ custom 是兜底，符合现行 schema
- B: 等 schema 扩展加 ui.focus —— ✗ 越界，本任务不动 schema
- C: 不做 focus，仅 Toast 提示 —— ✗ 用户体验差，不知道哪个字段错了

→ 选定 **A**：用 custom + handler 字符串 'ui.focus' 表达。actions/v2-actions-cheatsheet.md 的 custom 用例示范了 platform.checkNetwork / platform.reportError / hapticFeedback 等。运行时 EffectExecutor 收到 custom 动作时会按 handler 字符串分发——若运行时未实现 ui.focus 会优雅退化为无操作（不会崩），符合渐进增强原则。

→ ui.animate 在 22 动词内（已有 SubmitBtn.onError CREDENTIAL 分支用 `ui.animate shake FormCard`）；PolicyRow shake 直接用。

### 7. 边界 / state-vars / errors / operations 三轴覆盖核对（仅本 patch 范围）

| 来源决策 | 体现 | ✓/❌ |
|---|---|---|
| D-E4 onBlur 档 | PhoneInput.blur / CredentialInput.blur 已落库（无变动） | ✓ |
| **D-E4 onSubmit 档** | **本 patch 在 SubmitBtn.click 前置校验里实现** | **✓ 本次补译** |
| D-E1 不抢 focus（blur 阶段）| blur 事件未变；click 阶段 focus 是合理的（用户主动点了按钮，焦点引导符合预期，与 D-E1"输入过程不打扰"语义不冲突）| ✓ |
| B-1 防重复点击 | condition.when 含 !view.submitting | ✓ |
| B-5 离线阻断 | condition.when 含 network online | ✓ |
| B-7 锁定阻断 | condition.when 含 !lockedUntil | ✓ |
| view.errors.phone 写入点 | 新增 SubmitBtn.click Step-1 写入 + 原 PhoneInput.blur | ✓ |
| view.errors.credential 写入点 | 新增 SubmitBtn.click Step-2 写入 + 原 CredentialInput.blur | ✓ |
| view.submitting 写入点 | else 分支 Step-4 内 state.set true（位置不变）| ✓ |

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) 替换 SubmitBtn.click 事件（event/update_event index=0）
event/update_event {
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId:  "sc_27ee2293945046b69cc00",
  nodeId:    "nd_5a15fd87f060436295b4f",
  index:     0,
  patch: {
    description: "登录提交主流程（v2.5 含 D-E4(3) onSubmit 档前置校验）：condition 仅守系统级 → actions 重跑两字段校验 → 任一错则 Toast+focus 不 fetch / 全合法走原 ds-login 主流程",
    condition: {
      when: "{{ !state.view.submitting && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > Date.now()) }}"
    },
    actions: [
      // ── Step 1: 强制重跑 phone 校验（写入 view.errors.phone）──
      { type: "state.set", path: "view.errors.phone",
        value: "{{ state.view.form.phone && /^1[3-9]\\d{9}$/.test(state.view.form.phone) ? '' : '请输入正确的手机号' }}" },

      // ── Step 2: 强制重跑 credential 校验（按 loginMode 两套规则；空也算错）──
      { type: "state.set", path: "view.errors.credential",
        value: "{{ state.view.loginMode === 'code' ? (state.view.form.credential && /^\\d{6}$/.test(state.view.form.credential) ? '' : '请输入 6 位数字验证码') : (state.view.form.credential && /^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/.test(state.view.form.credential) ? '' : '密码需 6-20 位且包含字母和数字') }}" },

      // ── Step 3: 任一错或 policy 未勾 → 反馈 + 不 fetch ──
      // ── Step 4(else): 全合法 → 原主流程 ──
      { type: "logic.if",
        when: "{{ !!state.view.errors.phone || !!state.view.errors.credential || !state.view.form.policy }}",
        then: [
          { type: "ui.showToast", toastType: "error", message: "请检查表单后再提交" },
          { type: "logic.if",
            when: "{{ !!state.view.errors.phone }}",
            then: [
              { type: "custom", handler: "ui.focus",
                payload: { nodeId: "nd_083c744e1699418e9d01e" } }
            ],
            else: [
              { type: "logic.if",
                when: "{{ !!state.view.errors.credential }}",
                then: [
                  { type: "custom", handler: "ui.focus",
                    payload: { nodeId: "nd_989c02eb1f224e0c9f973" } }
                ],
                else: [
                  { type: "ui.animate", nodeId: "nd_36cea068f4af4b8fbdbb3",
                    animation: "shake", duration: 300 }
                ]
              }
            ]
          }
        ],
        else: [
          { type: "custom", handler: "hapticFeedback", payload: { strength: "medium" } },
          { type: "state.set", path: "view.submitting", value: true },
          { type: "effect.fetch", dataSourceId: "ds-login",
            onSuccess: [
              { type: "node.setVisualState", state: "success",
                nodeId: "nd_5a15fd87f060436295b4f", autoRevertMs: 500 },
              { type: "state.set", path: "data.user",
                value: "{{ $last.response.user }}" },
              { type: "state.set", path: "globalView.session",
                value: {
                  user: "{{ $last.response.user }}",
                  token: "{{ $last.response.token }}",
                  status: "active",
                  expiresAt: "{{ Date.now() + $last.response.expiresIn * 1000 }}",
                  refreshToken: null,
                  lastActivityAt: "{{ Date.now() }}"
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
                        { type: "ui.showToast", toastType: "error",
                          message: "尝试次数过多，账号已锁定 30 分钟" },
                        { type: "state.set", path: "view.lockedUntil",
                          value: "{{ Date.now() + 30*60*1000 }}" }
                      ],
                      else: [{ type: "ui.showToast", toastType: "error",
                              message: "账号或密码错误" }]
                    },
                    { type: "logic.if", when: "{{ state.view.loginMode === 'password' }}",
                      then: [{ type: "state.set", path: "view.form.credential", value: "" }] },
                    { type: "ui.animate", nodeId: "nd_e60fb832933f4b86a6638",
                      duration: 300, animation: "shake" }
                  ]},
                  { when: "LOCKED", actions: [
                    { type: "state.set", path: "view.lockedUntil",
                      value: "{{ $last.error.lockedUntil }}" }
                  ]},
                  { when: "LIMIT_EXCEEDED", actions: [
                    { type: "ui.showToast", toastType: "error",
                      message: "今日登录尝试次数已达上限" }
                  ]},
                  { when: "NETWORK_ERROR", actions: [
                    { type: "ui.showToast", toastType: "error",
                      message: "网络异常，请检查后重试" }
                  ]},
                  { when: "SERVER_ERROR", actions: [
                    { type: "ui.showToast", toastType: "error",
                      message: "服务繁忙，请稍后重试" },
                    { type: "custom", handler: "platform.reportError",
                      payload: { error: "{{ $last.error }}", scope: "ds-login" } }
                  ]}
                ],
                default: [
                  { type: "ui.showToast", toastType: "error",
                    message: "出了点问题，请稍后重试" },
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
}

// 2) 任务标 done（expectedArtifacts 沿用 patch 任务挂的指纹）
meta/update_plan_task {
  taskId: "I-M1-patch-submit-prevalidate",
  patch: {
    status: "done",
    notes: "md: analysis-notes/.../interaction/00-login/patches/I-M1-patch-submit-prevalidate.md；改动单点：SubmitBtn(nd_5a15fd87f060436295b4f).events[0]（click），condition 简化为 3 系统级守卫 + actions 包 logic.if 双分支前置校验/主流程；onSuccess/onError 100% 保留原契约。事前漏译复盘点已闭环。"
  }
}
```

### 后置自检（schema 落库后回填）

- [x] (a) condition 仅守系统级 ← submitting/offline/locked
- [x] (b) Step-1 phone 校验 ← state.set view.errors.phone
- [x] (c) Step-2 credential 校验 ← state.set view.errors.credential（含 loginMode 分支）
- [x] (d) Step-3 if-then 任一错 → Toast + focus/animate
- [x] (e) Step-4 else 主流程不变
- [x] (f) nodeHasEvent { nodeId, trigger:'click' } 指纹满足
