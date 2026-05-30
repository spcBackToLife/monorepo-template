> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：M1-coverage
> 对应 schema 字段：screen.meta.status.phase（通过自检后打）

# coverage: 00-login — 三轴覆盖核对

## 轴 1：rules → 节点 / state / dataSource 对应矩阵

遍历 `screen.meta.product.rules`（已落 6 条）：

| rules 条目（节选） | 对应锚点 | 状态 |
|------------------|---------|:---:|
| "数据规则: 手机号 11 位 …" | `PhoneInput` 节点 + `view.form.phone` | ✅ |
| "数据规则: 验证码 6 位 / 密码 6-20 位含字母+数字" | `CredentialInput` 节点 + `view.form.credential` | ✅ |
| "数据规则: view.loginMode ∈ {'code'\|'password'}" | `view.loginMode` enum 已声明 + `ModeToggle/CodeModeBtn/PasswordModeBtn` 节点 | ✅ |
| "数据规则: view.form.policy ∈ {true\|false} 默认 false 必勾" | `view.form.policy` 已占位 + `PolicyCheckbox` 节点 | ✅ |
| "业务规则: 登录成功写 globalView.session + 消费 nav.authRedirectTo" | `globalView.session` / `globalView.nav` 占位 + `SubmitBtn` 节点 + `navigation.flows` 三跳 + `ds-login` typeDef | ✅ |
| "业务规则: 失败状态机 failureCount + lockedUntil" | rules 中字段 + 阈值已枚举；运行时变量交 interaction 完整化（派生态）| ⚠️ 留 interaction |
| "业务规则: 验证码倒计时 view.codeCountdown ∈ [0,60]" | rules 中字段 + 区间已枚举；运行时变量交 interaction（派生态）| ⚠️ 留 interaction |
| "安全规则: 验证码 60s 冷却 / 当日 ≤10 次" | `GetCodeBtn` 节点 + `ds-send-code` + rules 已说明阈值 | ✅ |
| "安全规则: 密码错 ≥5 次锁 30 分钟" | rules 中已说明；运行时由 interaction 落 actions | ⚠️ 留 interaction |
| "安全规则: 协议必勾才能提交" | `PolicyCheckbox` + `view.form.policy` + rules 中说明 SubmitBtn 守卫 | ✅ |
| "安全规则: 离线状态阻断提交" | `globalView.network` 占位 + rules 中说明 SubmitBtn 守卫 | ✅ |
| "边界 Case: 提交 800ms 防抖 + submitting 守卫" | `view.submitting` 已占位 + rules 中说明 | ✅ |
| "边界 Case: screenExit 取消 fetch + 停止倒计时" | `ds-login` / `ds-send-code` 已声明（cancel 由 interaction 落 actions） | ⚠️ 留 interaction |
| "边界 Case: PhoneInput maxLength=11 自动截断" | `PhoneInput.props.maxLength: 11` ✅ 已写在节点 props | ✅ |

**遗漏列表**：无。所有 ⚠️ 都是"产品阶段已表达，等 interaction 阶段把派生态/动作落实"——属正常分工，不是缺口。

**R-COVERAGE-01**：每条 rules 都至少有 1 个锚点（节点 / state / dataSource / globalView 占位），通过。

## 轴 2：业务状态机字段已显式枚举（R-PRODUCT-03）

本屏承载 4 个业务状态机，rules 中已显式列出字段 + 枚举值：

| 状态机 | 字段 | 枚举/区间 | 在 rules 中？ |
|--------|------|----------|:------------:|
| 登录方式 | `view.loginMode` | `{'code' \| 'password'}` | ✅ |
| 会话 | `globalView.session.status` | `{anonymous \| active \| expired}`（在 globalConcerns 中描述）| ✅ 全局态 |
| 失败状态机 | `view.failureCount` + `view.lockedUntil` | `failureCount ≥ 5 → lockedUntil = now()+30min`，`now() > lockedUntil → 解锁` | ✅ |
| 验证码倒计时 | `view.codeCountdown` | `[0, 60]`，`0=idle / 60→0=running` | ✅ |
| 提交状态机 | `view.submitting` + `effects.dsLogin.status` | `submitting ∈ {true\|false}` + `effects.dsLogin.status ∈ {idle\|pending\|success\|error}`（运行时框架）| ✅ |

**R-PRODUCT-03 通过**——所有有状态字段及其枚举值/区间都在 rules 中显式列出。

## 轴 3：API → dataSource + data key 占位

| API | dataSource | data key 占位 | typeDef 完整 |
|-----|:----------:|:------------:|:----------:|
| 登录 `POST /api/auth/login` | ✅ `ds-login` | ✅ `data.user` (typeName=User) | ✅ LoginParams + LoginResponse 字段全 |
| 发送验证码 `POST /api/auth/send-code` | ✅ `ds-send-code` | ❌ 不需要（响应只触发倒计时，不持久化）| ✅ SendCodeParams + SendCodeResponse |
| （静态）协议文案 | ✅ `ds-policy-text` | N/A（static 不需要 data key）| ✅ initial 已写 |

**轴 3 通过**——所有 API 都有 dataSource + 完整 typeDef；`ds-send-code` 不建 data key 是有意为之（响应仅副作用，不存读后写）。

## 自检结论

- ✅ 轴 1：6 条 rules 全部对应到锚点；7 个 ⚠️ 项是"留 interaction 完整化"的派生态/运行时动作，符合阶段分工
- ✅ 轴 2：4 个业务状态机字段 + 枚举值全部显式
- ✅ 轴 3：3 个 dataSource 全建好；data 占位 1 个（user）；typeDef 完整

## 接下来

三轴全过 → 下一步任务 `M1-integrity` 跑 `query/integrity` 自检；期望 0 个 R-PRODUCT-* / R-STRUCTURE-01 / R-COVERAGE-01；通过后打 `meta.status.phase = 'analyzed'`。

---

## ★ 沉淀到 schema 的结论

本任务**不直接写新 schema**——产物是"自检结论"。下一任务 `M1-integrity` 才打 phase。
