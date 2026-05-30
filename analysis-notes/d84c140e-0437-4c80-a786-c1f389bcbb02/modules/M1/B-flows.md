> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：M1-flows
> 对应 schema 字段：screen.meta.product.summary（在 stories 浓缩基础上追加流程主线）

# Step B: 用户认证-登录（M1）— 核心流程 + 异常分支

## 推理过程

### 主线流程（Happy Path）

#### 验证码免密路径（默认）

```
[Step 1: 进入 00-login]
   │ 自动检查 globalView.session.status；若已 active → 直接 nav.go 01-home（不停留）
   ▼
[Step 2: 输入手机号]
   │ 用户输入 11 位手机号 → 受控绑定 view.form.phone
   │ 失焦时本地校验：合法 → 清 phoneError；不合法 → 设置 phoneError
   ▼
[Step 3: 选择登录方式（默认 'code'）]
   │ ModeToggle 互斥；当前 view.loginMode === 'code'
   ▼
[Step 4: 点击"获取验证码"]
   │ 守卫: phone 合法 + view.codeCountdown === 0 + network online
   │ effect.fetch ds-send-code
   │   onSuccess: Toast"已发送" + 启动 ui.startTimer(60s) → view.codeCountdown 60→0
   │   onError:   Toast"请稍后重试"
   ▼
[Step 5: 输入验证码]
   │ CredentialInput 受控绑定 view.form.credential
   │ 6 位输完触发 change 事件 → 自动提交（E2 扩展，由 interaction 决定是否做）
   ▼
[Step 6: 勾选协议]
   │ PolicyCheckbox 绑定 view.form.policy
   ▼
[Step 7: 点击"登录"]
   │ 守卫: phone 合法 + credential 6位 + policy=true + view.submitting=false + network online
   │ 800ms 防抖 + view.submitting=true
   │ effect.fetch ds-login (mode='code')
   │   onSuccess: 写 globalView.session={status:active,token,user,expiresAt} + view.submitting=false
   │             → 消费 nav.authRedirectTo（若有）否则 nav.go 01-home (fade)
   │   onError:   按 error.code 分支
   ▼
[Step 8: 跳转 01-home（占位）]
```

#### 密码登录路径（切换 view.loginMode='password'）

与上面不同的步骤：
- Step 4 不需要"获取验证码"
- Step 5 输入框变为密码（type=password，显示/隐藏切换 view.passwordVisible）
- Step 7 effect.fetch ds-login (mode='password')

### 异常分支树

对每一步问 4 问（API 错 / 数据空 / 权限不足 / 网络断）：

```
异常分支：
├── Step 1: 已 active session    → 不停留，直接 nav.go 01-home（避免重复登录）
├── Step 1: nav.authRedirectTo 有值 → 记住，登录成功后跳回该屏（不是 01-home）
│
├── Step 2: 手机号格式不对（非 1[3-9]\d{9}）→ 行内 phoneError + 登录按钮 disabled
├── Step 2: 输入超过 11 位        → 截断到 11 位
│
├── Step 4: 60s 内重复点击发送   → 按钮 disabled + 显示倒计时（X3）
├── Step 4: 当日已发 ≥ 10 次     → 后端返回 LIMIT_EXCEEDED → Toast"今日发送已达上限，请明日再试"
├── Step 4: 短信通道发送失败     → Toast"请稍后重试"，不消耗当日额度（X4）
│
├── Step 5 (验证码): 6 位输入超时（>5min）→ 后端校验时返回 EXPIRED → Toast"验证码已失效，请重新获取"
├── Step 5 (密码): 长度不足 6 位 → 行内 credentialError + 登录按钮 disabled
│
├── Step 6: 协议未勾选            → 登录按钮 disabled（X2）
│
├── Step 7: 凭证错误（401 / CREDENTIAL）→ Toast"账号或密码错误" + view.failureCount++
│                                         → 累计 ≥ 5 → Toast"账号已锁定 30 分钟" + 写 view.lockedUntil
├── Step 7: 账号已锁定（LOCKED）  → Toast"账号已锁定，剩余 N 分钟"（不消耗 failureCount）
├── Step 7: 网络中断 (network=offline) → Toast"网络已断开" + 表单数据保留 + 不发起 fetch（X6）
├── Step 7: 服务端 5xx           → Toast"服务暂时不可用，请稍后重试"（X7）
├── Step 7: 重复点击              → 800ms 防抖 + view.submitting 守卫忽略（X8）
│
├── Step 8: 跳转目标不可达        → fallback 到 01-home（默认）
└── 通用: screenExit 触发        → effect.cancel ds-login + ui.stopTimer codeCD（X9）
```

### 流程图（状态机）

```
view.submitState 状态机（非显式枚举字段，由 view.submitting + effects.dsLogin.status 派生）：

[idle]
  │ 用户点击"登录"且通过守卫
  ▼
[submitting] ───── onError(CREDENTIAL) ──→ [error] ──→ 用户重试 ──→ [submitting]
  │                                          │
  │                                          └─ failureCount ≥5 → [locked] ─ now > lockedUntil → [idle]
  │
  └─ onSuccess ─→ [success] ─→ nav.go 01-home

view.codeCountdown 状态机（验证码倒计时）：

[0 (idle)] ── 点击发送 + onSuccess ──→ [60] ─ tick 1s ──→ [...] ─→ [0 (idle)]
                                          │
                                          └─ screenExit ── stopTimer → [0]
```

## 关键时机点

| 时机 | 应触发 | 落在哪 |
|------|-------|-------|
| `screenEnter`（进入 00-login）| 检查 globalView.session.status；若 active → 立即 nav.go 01-home；读取 nav.authRedirectTo 备用 | 屏 rootNode 的 `screenEnter` event（interaction 写）|
| `screenExit`（离开 00-login）| effect.cancel ds-login + ui.stopTimer codeCD | 屏 rootNode 的 `screenExit` event（interaction 写）|
| `network.status` 变 offline | 阻断 SubmitBtn（守卫 condition.when 加 `network.status==='online'`）| SubmitBtn click event 的 condition |
| `view.lockedUntil` 时间到 | 自动转回 idle（前端 setInterval 比对 now，本期由 interaction 实现）| 屏定时检查 |

## 检查清单核对

- [x] 所有用户角色覆盖（仅"未登录用户"一种）
- [x] 主线流程清晰（验证码 / 密码两条路径都画了）
- [x] 所有异常分支都有处理策略（共 14 条异常）
- [x] 数据校验规则明确（前端 regex + 后端 422）
- [x] 状态流转图（submitState + codeCountdown 两个状态机）
- [x] 权限矩阵 N/A（登录页前置无权限角色）
- [x] 并发场景（防抖 + submitting 守卫）
- [x] 性能 N/A（单屏单次提交，无列表性能问题）
- [x] 安全风险（防刷规则在 M6 + Step C rules 中）
- [x] 与其他模块的依赖标注（依赖 M5 协议 + M6 防刷；session 写入触发 M2~M4）

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen（在 stories 的 summary 基础上追加流程主线浓缩）
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId: "sc_27ee2293945046b69cc00",
  patch: {
    product: {
      summary: "校园社交 App 登录入口：手机号 + 验证码免密 / 密码两种方式互斥切换；协议必勾才能提交；含 60s 验证码冷却、密码错 5 次锁 30min 的安全策略；登录成功跳主屏，提供注册账号 / 忘记密码两个出口。主线: 进入屏(若已 active 直跳主屏) → 输入手机号(失焦校验) → 选模式(code/password) → 输凭证 → 勾协议 → 提交(800ms 防抖+submitting 守卫) → onSuccess 写 session+消费 authRedirectTo 跳转 / onError 按 code 分支(CREDENTIAL/LOCKED/LIMIT_EXCEEDED/5xx)；screenExit 取消 fetch+停止倒计时"
    }
  }
}
```

> 异常处理细节会在下一任务 M1-rules 落到 `rules[]`——本任务只追加主线浓缩到 summary。
