> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-statemachine
> 对应 schema 字段：screen.meta.interaction.summary + screen.meta.interaction.states[]

# Step I-statemachine: 00-login — 状态机三要素

> 详细方法见 `methodology/01-state-machine.md`。

## 推理过程

### 0. 输入回顾（来自 product 阶段）

来自 `screen.meta.product`：
- 主线：进屏(若已 active 直跳主屏) → 输入手机号(失焦校验) → 选模式(code/password) → 输凭证 → 勾协议 → 提交(800ms 防抖+submitting 守卫) → onSuccess 写 session+消费 authRedirectTo 跳转 / onError 按 code 分支
- 规则要点：
  - 失败状态机：`view.failureCount` 累加；≥5 触发 `view.lockedUntil = now()+30min` 进入锁定；锁定期间表单整体阻断；`now() > lockedUntil` 自动解锁（failureCount=0 + lockedUntil=null）；登录成功也清零
  - 验证码倒计时：`view.codeCountdown ∈ [0,60]`；发送成功 0→60 启动 `ui.startTimer`；每秒 -1；screenExit `stopTimer` 归 0
  - 验证码同号 60s 冷却（按钮 disabled）+ 当日 ≤10 次（后端 LIMIT_EXCEEDED 兜底）
  - 协议必勾才能提交（合规红线）
  - 离线（`globalView.network.status==='offline'`）阻断提交
  - 提交 800ms 防抖 + `view.submitting` 守卫忽略重复点击
  - screenExit 触发 `effect.cancel ds-login` + `ui.stopTimer codeCD`

### 1. States 穷举

本屏是一个**两层状态机叠加**：
- 屏级主状态机（用户感知的"我在哪个阶段"）
- 业务对象副状态机（账号锁定态——product rules 已显式枚举的 failureCount/lockedUntil）

**屏级主状态机 8 个状态**（语义化命名）：

- `idle`              ：刚进屏；session 检查通过保留在本屏；表单空白；登录按钮 disabled（手机号/凭证空 + 协议未勾）
- `entry-checking`    ：屏入门瞬时态——screenEnter 后判断 `globalView.session.status === 'active'` 若是则立即 `nav.go 01-home`。⚠️ 这是一个**逻辑过路态**，不需要独立视觉，但要在 events.screenEnter actions 内体现
- `inputting`         ：用户开始输入（手机号 / 凭证 / 勾协议），实时绑定 `view.form.*`
- `field-validating`  ：单字段失焦校验（手机号正则 / 凭证按当前 mode 校验）；显示行内 error
- `mode-switching`    ：用户点击 CodeModeBtn / PasswordModeBtn 切换 `view.loginMode`；副效果：清空 `view.form.credential` + 清 credential error
- `code-sending`      ：点击 GetCodeBtn 触发 `effect.fetch ds-send-code` 进行中；按钮 disabled + 显示"发送中..."
- `code-countdown`    ：ds-send-code onSuccess 后启动 60s 倒计时；按钮文字"重新获取 (Ns)" + disabled
- `submitting`        ：点击 SubmitBtn 通过守卫；`effect.fetch ds-login` 进行中；按钮 spinner + 文字"登录中..." + 全表单 disabled
- `success`           ：ds-login.onSuccess；按钮 ✓ + 写 `globalView.session` + 消费 `nav.authRedirectTo` 跳转（无则 01-home）
- `error`             ：ds-login.onError 的**瞬时态**（按 code 分支 CREDENTIAL / LIMIT_EXCEEDED / NETWORK / 5xx 等）；显示 Toast / 行内错误 / 累加 failureCount；通常用户修改输入即回 inputting
- `locked`            ：`view.lockedUntil > now()` 的**持续态**；全表单 disabled + LockedView 显示 + 倒计时；`now() > lockedUntil` 自动回 idle

> ⚠️ `entry-checking` 在 schema 的 `states[]` 里**不暴露**——它是逻辑过路态而非用户感知状态。但 md 必须留痕。
> 同理 `mode-switching` 是瞬时副作用（数据清空 + UI 重渲染），不入 schema 主线但本节穷举。

**最终入 schema 的 8 个状态**（去掉两个瞬时过路态）：
`idle / inputting / field-validating / code-sending / code-countdown / submitting / success / error / locked`

### 2. Transitions（每条注明触发源）

| from | → | to | 触发源 | 备注 |
|------|---|---|--------|------|
| (初始) | → | entry-checking | screenEnter | 过路逻辑 |
| entry-checking | → | idle | session.status ≠ 'active' || lockedUntil > now() == false | 留在本屏 |
| entry-checking | → | (离屏) | session.status === 'active' | nav.go 01-home |
| idle | → | inputting | focus PhoneInput / CredentialInput / click PolicyCheckbox | bind 自动写 view.form |
| inputting | → | field-validating | blur PhoneInput / blur CredentialInput | 失焦校验 |
| field-validating | → | inputting | 用户继续输入 | input.change → bind 同步 |
| inputting | → | inputting | click CodeModeBtn / PasswordModeBtn | mode-switching 副效果：清 credential + 清 error |
| inputting | → | code-sending | click GetCodeBtn + 守卫 (phone 合法 && codeCountdown===0 && network online) | effect.fetch ds-send-code |
| code-sending | → | code-countdown | ds-send-code.onSuccess | 启动 ui.startTimer codeCD 60s |
| code-sending | → | inputting | ds-send-code.onError | ui.showToast 错误原因 |
| code-countdown | → | inputting | onComplete (60s 到) | view.codeCountdown 归 0 |
| code-countdown | → | (离屏前) | screenExit | ui.stopTimer codeCD |
| inputting | → | submitting | click SubmitBtn + 守卫通过 | 见下方守卫详解 |
| submitting | → | success | ds-login.onSuccess | 写 session + nav.go |
| submitting | → | error | ds-login.onError | logic.switch by error.code |
| submitting | → | inputting | screenExit (用户离开) | effect.cancel ds-login |
| error | → | inputting | 用户修改输入 / 重新点击 | 错误显示由 view.errors / Toast 决定 |
| error | → | locked | failureCount 累加到 ≥5 | 写 view.lockedUntil = now()+30min |
| inputting | → | locked | (理论上不直接发生；通过 error → locked) | — |
| locked | → | idle | now() > lockedUntil | 自动解锁；清 failureCount + lockedUntil |
| success | → | (离屏) | nav.go 01-home / 消费 authRedirectTo | — |

**submitting 的守卫（condition.when）**：

```
phone 合法 (11 位匹配 /^1[3-9]\d{9}$/)
  && credential 合法 (mode='code' → 6 位数字; mode='password' → 6-20 位含字母+数字)
  && form.policy === true
  && !submitting
  && globalView.network.status !== 'offline'
  && (!view.lockedUntil || view.lockedUntil < now())
```

### 3. Effects（每个目标状态注明 UI 变化）

- → **idle**：
  - 所有 errorText 清空
  - SubmitBtn 状态由计算属性决定（看守卫）
  - locked 子树隐藏

- → **inputting**：
  - 仅 view.form.* 字段绑定写入
  - 无显式视觉变化

- → **field-validating**：
  - 对应字段（PhoneError / CredentialError）显示文案；红框（design 阶段 visualState）
  - aria-live=polite

- → **code-sending**：
  - GetCodeBtn 文字 "发送中…" + disabled
  - 不阻塞其他字段输入

- → **code-countdown**：
  - GetCodeBtn 文字 "重新获取 (Ns)" + disabled（disabled until codeCountdown===0）
  - 不阻塞其他字段输入

- → **submitting**：
  - SubmitBtn 内 spinner + 文字 "登录中…" + disabled
  - 全表单 disabled（PhoneInput / CredentialInput / 各按钮）
  - **本屏不采用全屏 LoadingOverlay**：登录是单按钮触发，按钮内反馈已足够（避免半透明遮罩造成"卡死感"）
  - 阻断重复点击（800ms 防抖在 condition 内体现）

- → **success**：
  - SubmitBtn ✓ 0.5s（visualState: success；design 阶段实施）
  - 写 `globalView.session = {status:'active', token, user, expiresAt}`
  - 消费 `globalView.nav.authRedirectTo`（有则 nav.go 该屏，无则 nav.go '01-home'）

- → **error**：
  - 按错误 code 分支（在 events 任务里 logic.switch 详细展开）：
    - CREDENTIAL → CredentialError 文案 + 红框 + focus CredentialInput + `view.failureCount += 1`
    - LIMIT_EXCEEDED → Toast "今日发送次数已达上限" / "今日登录尝试已达上限"
    - LOCKED → 直接进入 locked 态（同步 `view.lockedUntil`）
    - NETWORK → Toast "网络异常，请检查后重试"
    - 5xx → Toast "服务繁忙，请稍后重试"
  - SubmitBtn 恢复默认
  - 触觉 `custom hapticFeedback strength=medium`（可选，写在 events）

- → **locked**：
  - 全表单 disabled（PhoneInput / CredentialInput / GetCodeBtn / SubmitBtn / 模式切换）
  - LockedView 子树显示（业务态视图，I-M1-view-business 任务建）
    - 文案 "账号已锁定，请 mm:ss 后重试"
    - 倒计时 view.lockedCountdown 实时更新（每秒 -1 直到 0）
  - 解锁瞬间自动回 idle

### 4. 候选方案与否决

- **候选 A：合并 code-sending 与 submitting 为 ds-loading 一个态**
  - 否决：两者是不同 API 不同 UI 反馈位（按钮不同 / 用户期待不同），合并会丢失精度

- **候选 B：locked 改用 modal / overlay 而非业务态子树**
  - 否决：modal 会盖在表单上，但表单和 locked 提示是**互斥**视图（locked 时表单本就不可用）。用 visibleWhen 切表单和 LockedView 两棵子树，语义更清晰；overlay 适用于"叠加在主流程上"的场景

- **候选 C：把 entry-checking 做成显式视觉过路态（如显示 "正在检查登录态…" 0.5s）**
  - 否决：本地 session 检查是同步操作；显示过路提示反而引入"闪烁"
  - 直接在 screenEnter 的 actions 第一步做 logic.if，不留视觉

- **候选 D：把 mode-switching 暴露为独立 state**
  - 否决：模式切换是瞬时副作用（state.set + 清 credential），用户感知是"立刻看到新输入框"，没有独立视觉阶段

- **候选 E：把 success 态省略，直接 nav.go**
  - 否决：成功反馈（✓ 0.5s）是产品的诚意细节，避免"按一下就跳走"的突兀感。同时给运行时一个写 session 的缓冲

### 5. 与 product rules / 业务对象状态机的关联

product rules 已枚举的两个状态字段：

```
view.loginMode ∈ {'code','password'}        → bind 切换 + ModeToggle 按钮高亮（design 阶段 visualState）
                                            → 影响 CredentialInput 的 placeholder/校验 / 后缀按钮可见性
                                            → 本质是"配置态"，不需要每个值建独立屏视图

账号锁定字段 (view.lockedUntil + view.failureCount)
  → 衍生两个视图（在 I-M1-view-business 任务建）：
     - NormalFormView（visibleWhen: !view.lockedUntil || view.lockedUntil < now()）
     - LockedView    （visibleWhen: view.lockedUntil && view.lockedUntil > now()）
```

⚠️ loginMode 不需要"每个 enum 建独立屏视图"——它是输入控件的配置态，不是页面级业务状态机。R-VIEW-BUSINESS-01 不会因此触发。

### 6. screenEnter / screenExit 的状态机出入口

- **screenEnter actions**（events 任务详细展开）：
  1. logic.if `globalView.session.status === 'active'` then `nav.go 01-home`
  2. logic.if `view.lockedUntil && view.lockedUntil > now()` then 啟動 lockedCountdown timer（每秒刷 view.lockedCountdown；onComplete 清 lockedUntil + failureCount → 自动解锁）
  
- **screenExit actions**：
  1. `effect.cancel ds-login`
  2. `effect.cancel ds-send-code`
  3. `ui.stopTimer codeCD`
  4. `ui.stopTimer lockedCountdown`（如果在跑）

---

## ★ 沉淀到 schema 的结论

本任务仅 1 个 MCP 调用：

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId:  "sc_27ee2293945046b69cc00",
  patch: {
    interaction: {
      summary: "登录屏主状态机：entry-checking → idle → inputting/field-validating ↔ (mode 切换/code-sending/code-countdown) → submitting → success(nav.go) | error(按 code 分支：CREDENTIAL/LIMIT_EXCEEDED/NETWORK/5xx；累加 failureCount，≥5 进入 locked) → locked(持续态 30min 倒计时，到点自动回 idle)；screenExit 取消 ds-login/ds-send-code + 停止 codeCD/lockedCountdown 计时器。",
      states: ["idle","inputting","field-validating","code-sending","code-countdown","submitting","success","error","locked"]
    }
  }
}
```

> Transitions / Effects / 守卫条件 / 候选方案否决 全在 md 留痕；schema 不存细节——会通过后续 events.actions 间接体现。
