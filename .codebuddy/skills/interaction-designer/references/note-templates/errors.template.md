> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-errors
> 对应 schema 字段：screen.meta.interaction.errorHandling

# Step I-errors: <屏名> — 错误处理 6 类 + 表单校验 4 时机

> 详细方法见 `methodology/04-error-handling.md`。

## 推理过程

### 1. 6 类错误适用性判断

| 错误类 | 本屏触发场景 | UI 模式 | 实现锚点 |
|-------|------------|--------|---------|
| 校验错误 | 手机号 / 密码 / 协议未勾 | 行内红字 + 红框 + focus | onChange/onBlur action + InlineFieldError 节点 |
| 业务错误 | 凭证错误 / 锁定 / 限流 | Toast(error) + 累加 failureCount + shake | onError logic.switch + view.failureCount |
| 权限错误 | 401（本屏一般无）| —（登录页本身就是登录入口）| — |
| 网络错误 | timeout / status=0 | 顶部网络 banner（globalOverlays）+ 重试 | onError 网络分支 + globalView.network |
| 服务错误 | 5xx | Toast + 客服入口 | onError 服务分支 |
| 未知错误 | 兜不住 | 兜底 Toast + 上报 | onError default 分支 + custom action |

### 2. 表单校验 4 时机分配

| 字段 | 时机 | 校验内容 | 触发方式 |
|------|------|---------|---------|
| phone | onChange | 长度 11 / 中国号段 | event.change → state.set view.errors.phone |
| credential（密码模式）| onBlur | 长度 6-20 + 含字母+数字 | event.blur |
| credential（验证码模式）| onChange | 6 位数字 | event.change |
| policy | onSubmit | 必勾 | event.click 时检查 |
| 整体表单 | onSubmit | 跨字段一致性 | condition.when |

### 3. onError actions 链翻译（核心）

```jsonc
onError: [
  { type: "state.set", path: "view.submitting", value: false },
  { type: "logic.switch",
    value: "{{ $last.error.code }}",
    cases: [
      { when: "VALIDATION_FAILED", then: [...] },
      { when: "WRONG_CREDENTIAL", then: [
          { type: "state.set", path: "view.failureCount", value: "{{state.view.failureCount + 1}}" },
          { type: "ui.showToast", toastType: "error", message: "{{$last.error.message}}" },
          { type: "ui.animate", nodeId: "FormCard", animation: "shake" }
      ]},
      { when: "RATE_LIMITED", then: [...] },
      { when: "NETWORK_ERROR", then: [
          { type: "state.set", path: "globalView.network.status", value: "offline" }
      ]}
    ],
    default: [
      { type: "ui.showToast", toastType: "error", message: "出了点问题，请稍后重试" },
      { type: "custom", handler: "platform.reportError" }
    ]
  }
]
```

### 4. 候选方案与否决

- 候选 A：校验错用 Toast → 否决：用户看不清是哪个字段出错
- 候选 B：5xx 用 Toast 短暂提示 → 否决：用户不知道整页不可用，应整页 ErrorView
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId, screenId,
  patch: {
    interaction: {
      errorHandling: {
        validation: "行内红字 + 输入框红框 + 聚焦该字段（InlineFieldError 节点）",
        business:   "Toast(level=error) + 累加 view.failureCount + shake；≥5 触发 locked",
        permission: "—（本屏即登录入口）",
        network:    "顶部网络 banner（globalOverlays.global-offline-banner）+ 重试",
        server:     "Toast + 客服入口",
        unknown:    "兜底 Toast + custom platform.reportError"
      }
    }
  }
}
```

> 详细 actions 链在 `I-X-events` 任务中翻译并落库。
