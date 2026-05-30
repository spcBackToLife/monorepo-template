> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-operations
> 对应 schema 字段：screen.meta.interaction.operations[]

# Step I-operations: <屏名> — 操作清单 7 列穷举

> 详细方法见 `methodology/02-feedback-levels.md`。

## 推理过程

### 1. 用户操作穷举（7 列表）

> 穷举该屏所有用户可执行的操作——包括看似"小"的操作（聚焦/切换/滑动）。每行 7 列必须填齐。

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 (L0/L1) | 进行中 (L2/L3) | 成功反馈 | 失败反馈 | 边界处理 |
|---|------|---------|---------|---------|-------|---------|---------|---------|
| 1 | 切换登录方式 | click `ModeToggle` | — | toggle 滑动 200ms (L0) | — | 表单切换 200ms 淡入淡出 | — | 保留已输入手机号 |
| 2 | 输入手机号 | input `PhoneInput` | — | label 上浮 / 实时校验 (L0) | — | 解锁登录按钮 | 红字"格式不对" (L1) | iOS 短信预填 |
| 3 | 输入凭证 | input `CredentialInput` | — | 字符显示 (L0) | — | 解锁登录按钮 | 红字 | 密码框默认 type=password |
| 4 | 提交登录 | click `SubmitBtn` | formValid && !submitting | 按钮 scale(0.97) (L0) | 按钮 spinner + 表单 disabled (L3) | ✓ + nav.go home | shake + Toast | 800ms 防抖 + 重复忽略 |
| 5 | 跳转注册 | click `RegisterLink` | — | 文字色变化 (L0) | — | nav.go register | — | — |
| 6 | 跳转找回密码 | click `ForgotLink` | — | 文字色变化 (L0) | — | 打开 ForgotModal | — | — |
| 7 | 切换密码可见 | click `EyeIcon`（密码模式）| view.loginMode==='password' | 图标切换 (L0) | — | 输入框 type 切换 | — | — |

### 2. 反馈层级匹配核对

| 操作 | 选用层级 | 理由 |
|------|---------|------|
| 切换 / 跳转 | L0 + 局部 | 微反馈即可 |
| 输入 | L0 + L1 | onChange 实时 + 错误行内 |
| 提交登录 | L0 + L3 | 关键提交，需要全屏遮罩防重复 |
| 删除账户 | L4 / L5 | 不可逆，需确认 |

### 3. 候选与否决

- 候选 A：把"切换登录方式"做 L3 级（全屏切换动画）→ 否决：操作量级不匹配，应 L0
- 候选 B：提交登录无防抖 → 否决：网络慢用户会狂点

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId, screenId,
  patch: {
    interaction: {
      operations: [
        {
          op: "切换登录方式",
          triggerNodePath: "FormCard/ModeToggle",
          feedbackLevel:    "L0",
          immediateFeedback: "toggle 滑块 200ms spring 滑动",
          inProgress:        "—",
          onSuccess:         "对应表单淡入淡出 200ms",
          onFailure:         "—",
          boundary:          "保留已输入手机号"
        },
        {
          op: "提交登录",
          triggerNodePath: "FormCard/SubmitBtn",
          feedbackLevel:    "L3",
          immediateFeedback: "按钮 scale(0.97) + shadow 降级",
          inProgress:        "按钮 spinner + 表单 disabled + 全屏 LoadingOverlay 半透明",
          onSuccess:         "✓ 0.5s 后 nav.go home",
          onFailure:         "shake + Toast + 聚焦凭证框",
          boundary:          "800ms 防抖 / 重复点击忽略"
        }
        // ...其他操作
      ]
    }
  }
}
```

---

## ★ 翻译契约（Decision-to-Artifact Mapping）

> 上游分析 md 强制段落（v2.5 §0.1.10）。**operations 7 列表的每一行都隐含一个"翻译契约"**：op 由具体节点的具体 trigger 触发，feedback / inProgress / success / failure / boundary 的实现都要落到 events.actions。

| 决策 ID | 决策内容（一句话）| 应翻译为 schema 产物 | 落库任务 | nodeId | 期望指纹 |
|---------|------------------|---------------------|---------|--------|---------|
| O-1 | 切换登录方式（click ModeToggle）| ModeToggle 子按钮 click → state.set loginMode + 清相关 errors | `I-X-events` | CodeModeBtn / PasswordModeBtn | `nodeHasEvent { trigger:'click' }` × 2 |
| O-2 | 输入手机号（input PhoneInput）| PhoneInput.bind=view.form.phone | `I-X-events` | PhoneInput | `nonEmpty path: bind` |
| O-3 | 失焦校验手机号（blur PhoneInput）| PhoneInput.blur 校验 actions | `I-X-events` | PhoneInput | `nodeHasEvent { trigger:'blur' }` |
| O-4 | 输入凭证 + 失焦校验 | CredentialInput.bind + .blur 校验 | `I-X-events` | CredentialInput | `nonEmpty path: bind` + `nodeHasEvent { trigger:'blur' }` |
| O-5 | 切密码可见 | PasswordToggleEye.click → state.toggle | `I-X-events` | PasswordToggleEye | `nodeHasEvent { trigger:'click' }` |
| O-6 | 获取验证码 | GetCodeBtn.click → effect.fetch ds-send-code + 60s 倒计时 | `I-X-events` | GetCodeBtn | `nodeHasEvent { trigger:'click' }` |
| O-7 | **提交登录（click SubmitBtn）** ★ | SubmitBtn.click → 前置校验 + ui.haptic + state.set submitting + effect.fetch ds-login + onSuccess 写 session+nav.go + onError 6-case 分支 | `I-X-events` | SubmitBtn | `nodeHasEvent { trigger:'click' }` |
| O-8 | 跳转注册 | RegisterLink.click → nav.go 00-register | `I-X-events` | RegisterLink | `nodeHasEvent { trigger:'click' }` |
| O-9 | 跳转忘记密码 | ForgotLink.click → nav.go 00-forgot-password | `I-X-events` | ForgotLink | `nodeHasEvent { trigger:'click' }` |
| O-10 | 进屏门禁 | Root.screenEnter → logic.if active 跳 home / 重启 lockedCountdown timer | `I-X-events` | Root | `nodeHasEvent { trigger:'screenEnter' }` |
| O-11 | 离屏副作用清理 | Root.screenExit → effect.cancel × 2 + ui.stopTimer × 2 | `I-X-events` | Root | `nodeHasEvent { trigger:'screenExit' }` |
| ⚠️ 协议链接点击 | （若文案要点击）PolicyText 子链接 click → ui.openUrl | `I-X-events` | PolicyText 子节点 | （含主指纹）|

> 备注：operations 含"系统生命周期"操作（如 #10/#11）不是用户主动触发，但同样产 events，必须列入。
>
> "📊 反馈层级 / 进行中态 / 成功失败反馈"列的具体 actions 在 events.template 里逐节点细写——本表只列**节点 + trigger 的存在性**，作为 events 任务的 todo 清单源。

字段说明见 `STAGE-CONTRACT.md §0.1.10`。
