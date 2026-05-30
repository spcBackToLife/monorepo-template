> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-operations
> 对应 schema 字段：screen.meta.interaction.operations[]

# Step I-operations: 00-login — 操作清单 7 列穷举

> 详细方法见 `methodology/02-feedback-levels.md`。
> 上游依赖：`statemachine.md`（9 个状态 + transitions 已穷举）；`screen.meta.product.rules`（6 条规则）。

## 推理过程

### 0. 操作来源穷举法

把"用户可执行的操作"按节点遍历一遍——product 阶段有 24 个节点，从 rootNode 自顶向下逐个看：

```
Root
├── HeaderArea
│   ├── BrandLogo                    [纯展示，无操作]
│   └── BrandSlogan                  [纯展示，无操作]
├── FormCard
│   ├── PhoneField
│   │   ├── PhoneLabel               [纯展示]
│   │   ├── PhoneInput               → 操作 #2/3：输入 + 失焦校验
│   │   └── PhoneError               [被动显示]
│   ├── ModeToggle
│   │   ├── CodeModeBtn              → 操作 #4：切换到验证码模式
│   │   └── PasswordModeBtn          → 操作 #5：切换到密码模式
│   ├── CredentialField
│   │   ├── CredentialLabel          [被动显示动态文案]
│   │   ├── CredentialInput          → 操作 #6/7：输入 + 失焦校验
│   │   ├── CredentialError          [被动显示]
│   │   ├── GetCodeBtn               → 操作 #8：获取验证码（仅 code 模式）
│   │   └── PasswordToggleEye        → 操作 #9：切换密码显隐（仅 password 模式）
│   ├── PolicyRow
│   │   ├── PolicyCheckbox           → 操作 #10：勾选/取消协议
│   │   └── PolicyText               → 操作 #11/12：点击协议链接（用户服务 / 隐私）
│   └── SubmitBtn                    → 操作 #13：提交登录
├── FooterLinks
│   ├── RegisterLink                 → 操作 #14：跳注册
│   └── ForgotLink                   → 操作 #15：跳忘记密码
└── (rootNode)                       → 操作 #1/16：screenEnter / screenExit（系统触发，但属于本屏的"生命周期操作"）
```

**特殊"非用户主动"操作**：
- #1 screenEnter：系统触发，但承载关键逻辑（session 检查 / 锁定恢复）
- #16 screenExit：系统触发，但承载副作用清理（cancel fetch / stopTimer）

⚠️ operations 表里**仍然要记录 #1/#16**，因为：
1. screen-meta-interaction §2 要求"穷举"
2. events 任务会基于本表挂 screenEnter/screenExit 事件
3. 反馈层级也要核对（screenEnter 的 session 检查不应有过路视觉态——这是本表的决策结果）

### 1. 用户操作穷举（7 列表）

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 (L0/L1) | 进行中 (L2/L3) | 成功反馈 | 失败反馈 | 边界处理 |
|---|------|---------|---------|---------|-------|---------|---------|---------|
| 1 | 进屏门禁检查 | screenEnter（系统）| — | —（无视觉过路态）| — | 留在本屏（idle）| —（不会失败）| `session.status==='active'` 立即 `nav.go 01-home` 跳走；若 `lockedUntil > now()` 启动 lockedCountdown 定时器 |
| 2 | 输入手机号 | `change` PhoneInput（受控 bind，非 event）| — | 字符显示 / maxLength=11 自动截断 (L0) | — | 同步写 `view.form.phone` | —（输入本身不会失败） | iOS 短信验证码预填会一次性填满 11 位 |
| 3 | 失焦校验手机号 | `blur` PhoneInput | view.form.phone 非空 | — | — | `view.errors.phone=''`（清错） | 红字行内提示 "请输入正确的手机号" + aria-live (L1) | 用户清空再 blur → 不报错；空 phone 不触发 |
| 4 | 切换到验证码模式 | `click` CodeModeBtn | view.loginMode!=='code' | 按钮 active 视觉切换 (L0；design 阶段写 visualState) | — | `state.set view.loginMode='code'` + 清 credential + 清 credential error；CredentialLabel 文字切"验证码"；GetCodeBtn 显示 / EyeIcon 隐藏 | — | 切换不清 phone（用户已输入的电话保留） |
| 5 | 切换到密码模式 | `click` PasswordModeBtn | view.loginMode!=='password' | 按钮 active 视觉切换 (L0) | — | `state.set view.loginMode='password'` + 清 credential + 清 credential error；CredentialLabel 文字切"密码"；GetCodeBtn 隐藏 / EyeIcon 显示 | — | 同 #4，phone 保留 |
| 6 | 输入凭证 | `change` CredentialInput（受控 bind） | — | 字符显示；密码模式按 `view.passwordVisible` 决定 type=password/text (L0) | — | 同步写 `view.form.credential` | — | 验证码模式 maxLength=6 数字；密码模式 maxLength=20 |
| 7 | 失焦校验凭证 | `blur` CredentialInput | view.form.credential 非空 | — | — | `view.errors.credential=''`（清错） | 红字行内提示 (L1)：code 模式 "请输入 6 位数字验证码"；password 模式 "密码需 6-20 位且包含字母+数字" + aria-live | 空 credential 不触发；切模式后旧错误已被 #4/#5 清掉 |
| 8 | 获取验证码 | `click` GetCodeBtn | view.loginMode==='code' && phone 合法 && view.codeCountdown===0 && network online | 按钮 scale(0.97) (L0)；按钮文字切"发送中…" + disabled (L2) | — | Toast "验证码已发送" + `state.set view.codeCountdown=60` + `ui.startTimer codeCD 60s`；按钮文字切"重新获取 (Ns)" + disabled | Toast 错误（按 errorHandling 表分支：LIMIT_EXCEEDED / NETWORK / 5xx）；按钮恢复"获取验证码" | 按钮在倒计时期间始终 disabled；screenExit 时 stopTimer codeCD；同号 60s 内点击被 condition 拒绝 |
| 9 | 切换密码显隐 | `click` PasswordToggleEye | view.loginMode==='password' | 眼睛图标切换 (L0) | — | `state.toggle view.passwordVisible`；CredentialInput type 切 text/password | —（无副作用）| 切换不清空已输入密码；切换不影响 focus |
| 10 | 勾选/取消协议 | `change` PolicyCheckbox（受控 bind） | — | checkbox 视觉切换 (L0) | — | 同步写 `view.form.policy`；勾选后 SubmitBtn 由"未勾"灰色 → 可点 | — | 已勾后取消 → SubmitBtn 立刻 disabled |
| 11 | 点开《用户服务协议》| `click` PolicyText 内"《用户服务协议》"片段 | — | 文字色 hover 变化 (L0；design 阶段实施) | — | `ui.openUrl ds-policy-text.termsUrl openInNewTab=true` | — | 不阻塞主流程（新窗/新标签打开）；移动端走系统浏览器 |
| 12 | 点开《隐私协议》| `click` PolicyText 内"《隐私协议》"片段 | — | 同 #11 | — | `ui.openUrl ds-policy-text.privacyUrl openInNewTab=true` | — | 同 #11 |
| 13 | 提交登录 | `click` SubmitBtn | formValid && policy=true && !submitting && network online && (!lockedUntil \|\| lockedUntil<now()) | 按钮 scale(0.97) + shadow 降级 (L0)；触觉 `custom hapticFeedback medium` | 按钮 spinner + 文字"登录中…" + 全表单 disabled (L2/L3 之间——见决策段) | 按钮 ✓ 0.5s（visualState success）+ 写 `globalView.session` + 消费 `nav.authRedirectTo`（无则 `nav.go 01-home`） | 按钮恢复 + 表单 shake (`ui.animate shake 300ms`) + 按 `$last.error.code` 分支：CREDENTIAL→Toast+focus credential+failureCount++（≥5→进 locked）；LIMIT_EXCEEDED→Toast；LOCKED→直接进 locked；NETWORK/5xx→Toast | 800ms 防抖 + `view.submitting` 守卫 + `condition.when` 检查；screenExit 自动 `effect.cancel ds-login` |
| 14 | 跳转注册 | `click` RegisterLink | — | 文字色 hover 变化 (L0) | — | `nav.go 00-register` | — | 注册屏占位本期不实现；点击不阻塞 |
| 15 | 跳转忘记密码 | `click` ForgotLink | — | 文字色 hover 变化 (L0) | — | `nav.go 00-forgot-password` | — | 忘记密码屏占位本期不实现 |
| 16 | 离屏副作用清理 | screenExit（系统）| — | — | — | `effect.cancel ds-login` + `effect.cancel ds-send-code` + `ui.stopTimer codeCD` + `ui.stopTimer lockedCountdown` | —（无失败概念） | 多次进出不泄漏定时器；fetch 取消是幂等的 |

合计 **16 条操作**（14 条用户主动 + 2 条系统生命周期）。

### 2. 反馈层级匹配核对

| # | 操作 | 选用层级 | 是否合理 | 理由 |
|---|------|---------|---------|------|
| 1 | 进屏门禁 | 无 | ✅ | 同步本地判断，引入过路态反而闪烁 |
| 2 | 输入手机号 | L0 | ✅ | 微反馈——字符显示 |
| 3 | 失焦校验手机号 | L1 | ✅ | 局部行内 error 文字 |
| 4-5 | 模式切换 | L0 | ✅ | 配置切换无异步——视觉切换即可 |
| 6 | 输入凭证 | L0 | ✅ | 同 #2 |
| 7 | 失焦校验凭证 | L1 | ✅ | 同 #3 |
| 8 | 获取验证码 | L0+L2 | ✅ | 按钮按下 L0 + 异步 fetch L2（按钮内 spinner，非全屏遮罩） |
| 9 | 切换密码显隐 | L0 | ✅ | 微反馈 |
| 10 | 协议勾选 | L0 | ✅ | 微反馈 |
| 11-12 | 协议链接 | L0 | ✅ | 跳外链不阻塞 |
| 13 | 提交登录 | L0+L2/L3 决策 | ⚠️ 见下方 | 关键决策点 |
| 14-15 | 注册/忘记 | L0 | ✅ | 跳页不阻塞 |
| 16 | 离屏清理 | 无 | ✅ | 系统副作用 |

### 3. 候选与否决（关键决策记录）

#### 决策 D1：提交登录用 L2 还是 L3？（按钮内 spinner vs 全屏 LoadingOverlay）

- **候选 A（L3 全屏 LoadingOverlay 半透明遮罩）**：
  - 优势：彻底防误触
  - 劣势：登录是单按钮触发，按钮内 spinner + 全表单 disabled 已经能阻断重复点击；额外遮罩会让用户感觉"被卡住"，与"简约 + 校园温度"风格不符
- **候选 B（L2 按钮内 spinner + 表单 disabled）**：
  - 优势：反馈精准，视觉轻
  - 劣势：理论上键盘 enter 仍可能触发——但 condition 守卫 + submitting=true 已经拦
- **决策**：**B（L2，按钮内 spinner）**——风格契合 + 守卫已足够。
- statemachine.md 已经在 Effects → submitting 段写了同样的决策，本表保持一致。

#### 决策 D2：协议链接是否需要二次确认？

- **候选 A（弹"即将打开外部链接"二次确认）**：合规性更强
- **候选 B（直接跳）**：
  - 现行 App Store / Google Play 政策不要求强制二次确认
  - 文案区已显式"我已阅读并同意 + 链接"——用户主动点链接的预期就是查看
- **决策**：**B（直接跳）**——不增加无意义阻断。

#### 决策 D3：失焦校验是否对空字段也报错？

- **候选 A（空也报"必填"）**：阻塞用户在 idle → inputting 阶段瞎点别的地方
- **候选 B（空不触发，仅在提交时由 SubmitBtn 守卫拦）**：避免用户聚焦了又取消还要看红字
- **决策**：**B**——空字段不触发行内错；提交守卫已经覆盖必填。

#### 决策 D4：模式切换是否清空 phone？

- **候选 A（清空）**：完全重置
- **候选 B（保留）**：用户切换模式时电话号码意图通常不变
- **决策**：**B（保留 phone，仅清 credential 和 credential error）**——与产品 rules 表"用户感知一致性"匹配。

#### 决策 D5：获取验证码失败按钮要不要 shake？

- **候选 A（shake + Toast）**：强反馈
- **候选 B（仅 Toast）**：温和反馈
- **决策**：**B**——shake 留给登录提交（更关键的不可逆动作）；获取验证码失败用户大概率会再点，shake 反而烦。

#### 决策 D6：密码错累计 5 次进 locked，第 5 次失败时反馈用什么？

- **候选 A（先 Toast"账号或密码错误"，紧接着切 locked 视图）**：分两步反馈
- **候选 B（第 5 次直接切 locked，不再 Toast）**：减少打扰
- **候选 C（第 5 次 Toast"已锁定"+ 切 locked）**：连贯叙事
- **决策**：**C** —— 失败累加后判断 `failureCount===5`：
  - 4 次以内：Toast "账号或密码错误"
  - 第 5 次：Toast "尝试次数过多，账号已临时锁定 30 分钟" + `state.set view.lockedUntil = now() + 30*60*1000`
- 这条决策实际细节落到 events 任务的 logic.if/switch 链；本表 #13 onFailure 列只摘要"≥5→进 locked"。

### 4. operations 表覆盖核对（与状态机 transitions 对账）

statemachine.md 列了 21 条 transitions，逐条核对每条都有 operation 表里的某条触发：

| transition | 对应 operation | 说明 |
|---|---|---|
| (初始)→entry-checking | #1 | screenEnter |
| entry-checking→idle / nav.go | #1 | 在 #1 内分支 |
| idle→inputting (focus 输入) | #2 / #6 | bind 自动写入即视为 inputting |
| inputting→field-validating (blur) | #3 / #7 | blur 触发 |
| inputting→inputting (mode 切换) | #4 / #5 | click 模式按钮 |
| inputting→code-sending (click GetCode) | #8 | — |
| code-sending→code-countdown (onSuccess) | #8 onSuccess 列 | — |
| code-sending→inputting (onError) | #8 onFailure 列 | — |
| code-countdown→inputting (onComplete) | #8 boundary 列（间接）| timer 自然结束 |
| code-countdown→(离屏前) (screenExit) | #16 | — |
| inputting→submitting (click Submit) | #13 | — |
| submitting→success (onSuccess) | #13 onSuccess 列 | — |
| submitting→error (onError) | #13 onFailure 列 | — |
| submitting→inputting (screenExit) | #16 | effect.cancel |
| error→inputting (用户改输入) | #2/#6 自动转回 | bind 触发即可 |
| error→locked (failureCount≥5) | #13 onFailure 内决策 D6 | — |
| locked→idle (lockedUntil<now) | #1 内启动的 lockedCountdown 定时器 | screenEnter 时启动 |
| success→(离屏) | #13 onSuccess 内 nav.go | — |

✅ 21 条 transition 全部覆盖。

### 5. 与 product rules 的对账

| product rule | 涉及哪条 operation |
|---|---|
| 数据规则: 手机号正则 | #3 |
| 数据规则: 验证码 6 位数字 | #7（code 模式分支） |
| 数据规则: 密码 6-20 位字母+数字 | #7（password 模式分支） |
| 数据规则: loginMode 默认 'code' | stateInit（不属操作） |
| 数据规则: form.policy 默认 false 必勾才能提交 | #10 + #13 守卫 |
| 业务规则: 登录成功写 session 消费 authRedirectTo | #13 onSuccess |
| 业务规则: 进屏 session.status='active' 直跳 | #1 |
| 业务规则: 失败状态机 failureCount/lockedUntil | #13 onFailure 决策 D6 |
| 业务规则: 验证码倒计时 0/60/-1/screenExit 归 0 | #8 / #16 |
| 安全规则: 60s 冷却 + 当日 ≤10 次 | #8 condition + onFailure（LIMIT_EXCEEDED） |
| 安全规则: 密码错 ≥5 锁 30min | #13 决策 D6 |
| 安全规则: 协议必勾 | #10 + #13 守卫 |
| 安全规则: 离线阻断提交 | #13 condition |
| 边界 Case: 800ms 防抖 + submitting 守卫 | #13 boundary |
| 边界 Case: screenExit 取消 fetch + 停 timer | #16 |
| 边界 Case: PhoneInput maxLength=11 自动截断 | #2 boundary |

✅ 6 条 rules 全部映射到至少一条 operation。无遗漏。

---

## ★ 沉淀到 schema 的结论

本任务 1 个 MCP 调用：

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId:  "sc_27ee2293945046b69cc00",
  patch: {
    interaction: {
      operations: [ /* 16 条结构化对象，每条 7 列齐 */ ]
    }
  }
}
```

详细 16 条对象见下方 MCP 调用——本 md 表 §1 即落库内容来源（一一对应）。

> 决策 D1-D6 / 反馈层级核对 / transitions 对账 / rules 对账 全部留 md；schema 只存 7 列结构化数组。
