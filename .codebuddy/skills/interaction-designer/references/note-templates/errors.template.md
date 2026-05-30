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
| 网络错误 | NETWORK_ERROR（断网/DNS/connection refused）| 顶部网络 banner（globalOverlays）+ 重试 | onError NETWORK_ERROR 分支 + globalView.network |
| 超时错误（v2.6 ★）| TIMEOUT（请求超过 networkPolicy.timeout）| Toast "请求超时，请检查网络后重试"；不计 failureCount | onError TIMEOUT 分支 + endpoint.networkPolicy 守 |
| 服务错误 | 5xx (SERVER_ERROR) | Toast + 客服入口 + custom reportError | onError SERVER_ERROR 分支 |
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

---

## ★ 翻译契约（Decision-to-Artifact Mapping）

> 上游分析 md 强制段落（v2.5 §0.1.10）。本任务的所有决策中，**有 schema 产物**的部分按下表 1:1 映射，下游 `I-X-events` 落库任务执行时把所有上游 md 的此段拼起来形成 todo 清单逐条勾。
> **所有决策都要列**——没 schema 产物的标"无 schema 产物"，证明没漏想。

| 决策 ID | 决策内容（一句话）| 应翻译为 schema 产物 | 落库任务 | nodeId | 期望指纹 |
|---------|------------------|---------------------|---------|--------|---------|
| D-E1 | 校验错不抢 focus | events 中 onBlur actions 不调用 ui.focus | `I-X-events` | PhoneInput / CredentialInput | （无标准指纹，靠 events md 自审）|
| D-E4 | 校验时机 onBlur+onSubmit 双档 | (1) PhoneInput.blur 校验<br>(2) CredentialInput.blur 校验<br>(3) **SubmitBtn.click 前置校验**（提交时强制重跑全字段校验，不合法时聚焦第一个错字段 + 不进 fetch） | `I-X-events` | (1) PhoneInput<br>(2) CredentialInput<br>(3) SubmitBtn | (1) `nodeHasEvent { trigger:'blur' }`<br>(2) `nodeHasEvent { trigger:'blur' }`<br>(3) `nodeHasEvent { trigger:'click' }` |
| D-E5 | 不做 onChange debounce 查重 | （无 schema 产物，决策记录即足）| — | — | — |
| D-E6（如有）| password 模式失败清密码 | SubmitBtn.onError CREDENTIAL 分支含 logic.if loginMode==='password' then state.set view.form.credential='' | `I-X-events` | SubmitBtn | （含在主指纹）|
| ⚠️ 网络错文案 | "网络异常，请检查后重试" Toast | events 中 onError NETWORK_ERROR 分支调 ui.showToast | `I-X-events` | SubmitBtn / GetCodeBtn | （含主指纹）|
| ⚠️ 超时错文案（v2.6 ★）| "请求超时，请检查网络后重试" Toast；onError TIMEOUT 分支不累加 failureCount（避免弱网误触发风控）| events onError TIMEOUT 分支 ui.showToast；与 NETWORK_ERROR 区分独立 case；endpoint.networkPolicy.timeout 决定阈值 | `I-X-events` + `I-X-datasources` | SubmitBtn / GetCodeBtn / endpoint.networkPolicy | （含主指纹 + `nonEmpty path: dataSources[*].endpoint.networkPolicy.timeout`）|
| ⚠️ 5xx 文案 | "服务繁忙" Toast + custom platform.reportError | events onError SERVER_ERROR 分支 | `I-X-events` | SubmitBtn / GetCodeBtn | （含主指纹）|
| ⚠️ unknown 兜底 | 兜底 Toast + custom platform.reportError | events onError default 分支 | `I-X-events` | SubmitBtn / GetCodeBtn | （含主指纹）|
| ⚠️ validation 反馈节点 | 行内红字派生节点（PhoneError / CredentialError）+ minimal-debug styles | (1) 节点存在 + textContent 接 errors.* + visibleWhen<br>(2) **minimal-debug styles**（color/fontSize/...） | `M1-skeleton`(已建)<br>+ `I-X-events`(挂表达式)<br>+ `I-X-events`(写 minimal-debug styles ☆) | PhoneError / CredentialError | `nonEmpty path: PhoneError.props.textContent` 等 |

字段说明见 `STAGE-CONTRACT.md §0.1.10`。

> ☆ minimal-debug styles 仅限 7 个属性白名单（color/fontSize/lineHeight/marginTop/marginBottom/minHeight/padding），节点须为 inline-error / inline-hint / inline-success / countdown-text / spinner / toast-text 之一。详见 `forbidden-fields-interaction.md §派生展示节点 minimal-debug styles 白名单`。
