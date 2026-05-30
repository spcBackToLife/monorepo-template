# 方法论 4：错误处理 6 类 + 表单校验 4 时机

> 适用任务：`I-X-errors`、`I-X-view-error`、`I-X-events`（onError 分支设计）

## 1. 错误 6 大分类

| 错误类 | 触发条件 | UI 模式 | 用户操作 |
|-------|---------|--------|---------|
| 校验错误 | 前端 / 后端校验未通过（4xx 校验码）| 行内红字 + 输入框红框 + 聚焦该字段 | 修正输入 |
| 业务错误 | API 返回业务码非 0 / 4xx 业务约束（如密码错）| Toast / 错误页 + 说明 + 重试按钮 / 关键字段聚焦 | 重试 / 改方案 |
| 权限错误 | 401 / 403 | 引导到登录 / 申诉 | 登录 / 申诉 |
| 网络错误 | timeout / 离线 | 网络错误页 + 重试 / 顶部网络条 | 重连 + 重试 |
| 服务错误 | 5xx | 兜底错误页 + 客服入口 | 重试 / 反馈 |
| 未知错误 | 任何兜不住的异常 | 兜底 Toast + 收集 + 上报 | 反馈 |

## 2. 错误的 2 层呈现

```
Toast / Banner（瞬时）        关闭后页面恢复，适合校验错 / 网络错 / 业务错
ErrorView 节点（页面态）      整页或整区域被错误替代，适合 5xx / 网络断
```

判断：

- 用户能否通过修正输入 / 重试按钮自行恢复 → Toast / Banner
- 系统层面错误，整屏不可用 → ErrorView 节点

## 3. 错误码 → UI 模式速查

| HTTP / 业务码 | 错误类 | UI 模式 |
|------|-------|--------|
| 4xx 校验失败（field-level）| 校验错 | 行内红字 + 红框 + focus 字段 |
| 4xx 业务码（如 WRONG_CREDENTIAL）| 业务错 | Toast(error) + 累加 failureCount + shake |
| 401 / 403 | 权限错 | 引导登录 / global-session-expired Modal |
| 429 / RATE_LIMITED | 业务错（限流子类）| Toast + 倒计时禁用 |
| timeout / status=0 | 网络错 | 顶部网络 banner + 重试 |
| 5xx | 服务错 | 整页 ErrorView / Toast + 客服入口 |
| 兜不住 | 未知错 | 兜底 Toast + 上报 |

## 4. 表单校验 4 时机

```
onChange  实时校验（适合长度限制 / 格式立即可判）
onBlur    离焦校验（适合手机号是否真号段、密码强度，最常用）
onSubmit  提交校验（整体合规 + 跨字段，必做）
debounce  延时校验（防频繁请求，适合用户名查重）
```

**选择策略**：

- **格式 / 长度** → onChange（用户立刻感知）
- **业务规则**（号段 / 强度）→ onBlur（不打扰输入过程）
- **整体合规** → onSubmit（必须有，兜底）
- **唯一性查重** → debounce（节流防抖）

## 5. 落到 schema

`screen.meta.interaction.errorHandling`（6 类对象）：

```jsonc
errorHandling: {
  validation: "行内红字 + 输入框红框 + 聚焦该字段",
  business:   "Toast(level=error) + 累加 failureCount + shake",
  permission: "锁定状态机 + locked 倒计时 Sheet（401 锁定）",
  network:    "顶部网络 banner + 重试按钮",
  server:     "Toast + 客服入口",
  unknown:    "兜底 Toast + 上报 platform.reportError"
}
```

每条错误必须对应到 events.actions 的 onError 分支或 logic.switch（详见 `schema-spec/interaction-events.md`）。

## 6. onError 分支模板（actions 链翻译）

```jsonc
events.actions:
{ type: "effect.fetch", dataSourceId: "ds-login",
  params: { ... },
  onSuccess: [ ... ],
  onError: [
    { type: "state.set", path: "view.submitting", value: false },

    { type: "logic.switch",
      value: "{{ $last.error.code }}",
      cases: [
        { when: "VALIDATION_FAILED", then: [
            { type: "state.set", path: "view.errors.phone", value: "{{ $last.error.detail }}" }
        ]},
        { when: "WRONG_CREDENTIAL", then: [
            { type: "state.set", path: "view.failureCount", value: "{{ state.view.failureCount + 1 }}" },
            { type: "ui.showToast", toastType: "error", message: "{{ $last.error.message }}" },
            { type: "ui.animate", nodeId: "FormCard", animation: "shake" }
        ]},
        { when: "RATE_LIMITED", then: [
            { type: "state.set", path: "view.codeCountdown", value: 60 }
        ]},
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
}
```

## 7. 红线

- ❌ effect.fetch 没写 onError → R-EVENTS-03
- ❌ 6 类错误某类完全没设计 → 用户某种错误"沉默"
- ❌ 校验错误用 Toast 而不是行内红字（违反可访问性）
- ❌ 5xx 用 Toast 短暂提示就消失（用户不知道整页不可用）
- ❌ onChange 校验业务规则（如号段查询，会狂打 API）
