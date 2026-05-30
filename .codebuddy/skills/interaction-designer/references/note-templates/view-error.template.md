> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-view-error
> 对应 schema 字段：rootNode.children 追加错误态节点 + visibleWhen + meta.interaction

# Step I-view-error: <屏名> — 错误态视图

> 详细方法见 `methodology/07-derivative-views.md` 类 3 + `methodology/04-error-handling.md`。
> 详细 schema 见 `schema-spec/derivative-views.md` §3。

## 推理过程

### 1. 适用性判定（错误的两层呈现）

> 错误分**瞬时反馈**（Toast/Banner，关闭后页面恢复）和**页面态**（ErrorView，整页/整区域被替代）。

| 错误场景 | 呈现方式 | 节点 name | visibleWhen / 触发 |
|---------|---------|----------|-------------------|
| 5xx 整页错 | 整页错误 | ServerErrorPage | `{{ state.effects['ds-feed'].status === 'error' && state.effects['ds-feed'].error.code >= 500 }}` |
| 网络断 | 整页 / banner | NetworkErrorState 或 globalOverlays.global-offline-banner | `{{ globalView.network.status === 'offline' \|\| state.effects[xxx].error?.code === 'NETWORK' }}` |
| 业务错（4xx）| Toast | —（用 ui.showToast action）| 在 events.onError 触发 |
| 字段校验错 | 行内 | InlineFieldError（每字段一个）| `{{ !!state.view.errors.<fieldName> }}` |
| 区域加载错 | 区域错误 | SectionErrorBlock | `{{ state.effects['ds-section'].status === 'error' }}` |

### 2. 错误页必含要素

| 要素 | 内容 |
|------|-----|
| 错误图示 | ServerErrorIllustration 子节点 |
| 错误原因 | "服务器开小差了" |
| 重试按钮 | event click → effect.fetch 重新请求 |
| 客服入口 | event click → ui.openUrl |

### 3. 候选方案与否决

- 候选 A：所有错误用 Toast → 否决：5xx 整页不可用，Toast 短暂提示后用户卡死
- 候选 B：业务错也用整页 → 否决：用户失去当前操作上下文

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) 整页错误
element/insert_subtree {
  projectId, parentId: <screen.rootNode.id>,
  subtree: {
    id: "serverErrorPage", type: "div", name: "ServerErrorPage",
    visibleWhen: "{{ state.effects['ds-feed'].status === 'error' && state.effects['ds-feed'].error.code >= 500 }}",
    styles: {}, props: {},
    children: [
      { id: "serverErrorIcon",  type: "div",    name: "ServerErrorIllustration",
        styles: {}, props: {}, children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "serverErrorTitle", type: "div",    name: "ErrorTitle",
        styles: {}, props: { textContent: "服务器开小差了" }, children: [],
        states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "retryBtn",         type: "button", name: "RetryButton",
        styles: {}, props: { textContent: "重试" },
        events: [{
          trigger: "click",
          description: "重新拉取 feed",
          actions: [{ type: "effect.fetch", dataSourceId: "ds-feed",
                      onSuccess: [], onError: [] }]
        }],
        children: [], states: [], activeState: "default", locked: false, visible: true },
      { id: "supportBtn",       type: "button", name: "ContactSupport",
        styles: {}, props: { textContent: "联系客服" },
        events: [{
          trigger: "click",
          description: "打开客服链接",
          actions: [{ type: "ui.openUrl", url: "https://cs.example.com" }]
        }],
        children: [], states: [], activeState: "default", locked: false, visible: true }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

// 2) 字段行内错误（如登录页 phone 错）
element/insert_subtree {
  projectId, parentId: "<PhoneInput-parent-id>",
  subtree: {
    id: "phoneError", type: "div", name: "PhoneError",
    visibleWhen: "{{ !!state.view.errors.phone }}",
    styles: {}, props: { textContent: "{{state.view.errors.phone}}" },
    children: [], states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

// 3) meta
meta/set_node { projectId, nodeId: "serverErrorPage", patch: { interaction: { summary: "5xx 整页错误兜底", states: ["showing","hidden"] } } }
meta/set_node { projectId, nodeId: "phoneError", patch: { interaction: { summary: "手机号字段行内错误提示", states: ["showing","hidden"] } } }
```

> 如本屏完全无 api dataSource，本任务可 skipped。
