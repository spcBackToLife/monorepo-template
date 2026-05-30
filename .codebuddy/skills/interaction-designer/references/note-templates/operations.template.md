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
