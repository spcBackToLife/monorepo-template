# 7 类衍生视图节点 schema 规范

> 配合方法论 `methodology/07-derivative-views.md` 使用。本文给出每类视图的 **schema 落库写法**。

每类视图节点都有 3 个共同要素：

1. **位置**：在 `screen.rootNode.children` 末尾追加（不重组上游）
2. **visibleWhen**：互斥表达式（基于 state / globalView / state.effects）
3. **meta.interaction**：节点级叙事（summary + states + flows）

## §1. 加载态视图（任务 `I-X-view-loading`）

### 全屏 Skeleton

```jsonc
// element/insert_subtree
{
  parentId: "<screen.rootNode.id>",
  subtree: {
    id: "feedSkeleton",
    type: "div",
    name: "FeedSkeleton",
    visibleWhen: "{{ state.effects['ds-feed'].status === 'pending' && !state.data.feed }}",
    styles: {},                      // design 写
    props: {},
    children: [
      // 多个占位 SkeletonItem 节点（具体数量留 design 决定，本阶段建 3-5 个示意）
      { id: "skeletonItem-1", type: "div", name: "SkeletonItem", ... },
      { id: "skeletonItem-2", type: "div", name: "SkeletonItem", ... },
      { id: "skeletonItem-3", type: "div", name: "SkeletonItem", ... }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

// 节点 meta
meta/set_node {
  projectId, nodeId: "feedSkeleton",
  patch: {
    interaction: {
      summary: "ds-feed 首次加载占位骨架",
      states: ["showing","hidden"]
    }
  }
}
```

### LoadingOverlay（关键提交时全屏遮罩）

```jsonc
{
  id: "loadingOverlay",
  type: "div",
  name: "LoadingOverlay",
  visibleWhen: "{{ state.view.submitting }}",
  styles: {},
  children: [
    { id: "spinner", type: "div", name: "LoginSpinner", ... }
  ],
  ...
}
```

## §2. 空态视图（任务 `I-X-view-empty`）

```jsonc
{
  id: "emptyFeedState",
  type: "div",
  name: "EmptyFeedState",
  visibleWhen: "{{ state.effects['ds-feed'].status === 'success' && state.data.feed && state.data.feed.length === 0 }}",
  children: [
    // 必含：图示 + 标题 + 描述 + 行动按钮
    { id: "emptyIcon",  type: "div",    name: "EmptyIllustration", props: {} },
    { id: "emptyTitle", type: "div",    name: "EmptyTitle",        props: { textContent: "还没有内容" } },
    { id: "emptyDesc",  type: "div",    name: "EmptyDescription",  props: { textContent: "去发现你感兴趣的吧" } },
    { id: "emptyCta",   type: "button", name: "GoExploreButton",   props: { textContent: "去发现" },
      events: [{
        trigger: "click",
        description: "去发现页",
        actions: [{ type: "nav.go", targetScreenId: "03-explore" }]
      }]
    }
  ],
  ...
}
```

**红线 R-VIEW-EMPTY-CONTENT-01**：空态节点缺"图示 + 标题 + 描述 + 行动按钮"四要素。

## §3. 错误态视图（任务 `I-X-view-error`）

### 整页错误（5xx）

```jsonc
{
  id: "serverErrorPage",
  type: "div",
  name: "ServerErrorPage",
  visibleWhen: "{{ state.effects['ds-feed'].status === 'error' && state.effects['ds-feed'].error.code >= 500 }}",
  children: [
    { id: "errorIcon",  type: "div",    name: "ServerErrorIllustration" },
    { id: "errorTitle", type: "div",    props: { textContent: "服务器开小差了" } },
    { id: "errorDesc",  type: "div",    props: { textContent: "请稍后重试" } },
    { id: "retryBtn",   type: "button", name: "RetryButton",
      events: [{
        trigger: "click",
        description: "重新拉取 feed",
        actions: [{ type: "effect.fetch", dataSourceId: "ds-feed",
                    onSuccess: [], onError: [] }]
      }]
    },
    { id: "supportBtn", type: "button", name: "ContactSupport",
      events: [{
        trigger: "click",
        description: "联系客服",
        actions: [{ type: "ui.openUrl", url: "https://cs.example.com" }]
      }]
    }
  ],
  ...
}
```

### 字段行内错误（onChange / onBlur 校验）

```jsonc
{
  id: "phoneError",
  type: "div",
  name: "PhoneError",
  visibleWhen: "{{ !!state.view.errors.phone }}",
  props: { textContent: "{{state.view.errors.phone}}" },
  ...
}
```

## §4. 权限/身份态视图（任务 `I-X-view-auth`）

```jsonc
{
  id: "notLoggedInPlaceholder",
  type: "div",
  name: "NotLoggedInPlaceholder",
  visibleWhen: "{{ globalView.session.status === 'anonymous' || !globalView.session.user }}",
  children: [
    // 不要全屏遮罩；保留页面信息架构（nav-bar / 标题），仅核心内容区换"登录引导"
    { id: "loginIcon",   type: "div",    name: "LoginIllustration" },
    { id: "loginTitle",  type: "div",    props: { textContent: "登录后查看你的动态" } },
    { id: "loginCta",    type: "button", name: "GoLoginButton",
      events: [{
        trigger: "click",
        description: "去登录页（保留来源）",
        actions: [
          { type: "state.set", path: "globalView.nav.authRedirectTo",
            value: "{{state.view.currentScreenId}}" },
          { type: "nav.go", targetScreenId: "00-login" }
        ]
      }]
    }
  ],
  ...
}
```

## §5. 业务状态分支视图（任务 `I-X-view-business`）★ 重要

承载状态机的屏（订单 / 任务 / 工单 / 审批），**每个 enum 值一个独立节点**：

```jsonc
// 例：订单详情屏，order.status ∈ {pending_payment, awaiting_shipment, shipping, completed, cancelled, refunding}

screen.rootNode.children.push(
  {
    id: "orderPendingPaymentView",
    type: "div",
    name: "OrderPendingPaymentView",
    visibleWhen: "{{ state.data.order.status === 'pending_payment' }}",
    children: [
      // 待付款专属布局：倒计时 + 立即支付 CTA + 取消订单
    ],
    ...
  },
  {
    id: "orderAwaitingShipmentView",
    type: "div",
    name: "OrderAwaitingShipmentView",
    visibleWhen: "{{ state.data.order.status === 'awaiting_shipment' }}",
    children: [
      // 待发货布局：等待提示 + 物流追踪入口（disabled）+ 联系客服
    ],
    ...
  },
  // ...其他 4 个状态视图
)
```

**强制核对**（轴 2，详见 `methodology/06-three-axis-coverage.md`）：product rules 枚举的每个值都必须有对应节点（违 R-VIEW-BUSINESS-01）。

## §6. 过渡反馈节点（任务 `I-X-view-feedback`）

```jsonc
// Snackbar（带操作按钮的 Toast）
{
  id: "saveSnackbar",
  type: "div",
  name: "SaveSnackbar",
  visibleWhen: "{{ state.view.snackbar.show && state.view.snackbar.kind === 'save' }}",
  children: [
    { id: "snackbarMsg",   type: "div",    props: { textContent: "{{state.view.snackbar.message}}" } },
    { id: "snackbarUndo",  type: "button", props: { textContent: "撤销" },
      events: [{
        trigger: "click",
        description: "撤销保存",
        actions: [
          { type: "state.set", path: "data.draft", value: "{{state.view.snackbar.prevValue}}" },
          { type: "state.set", path: "view.snackbar", value: { show: false } }
        ]
      }]
    }
  ],
  ...
}

// Countdown（验证码倒计时按钮，作为 SubmitBtn 的兄弟节点或 children）
{
  id: "codeCountdown",
  type: "div",
  name: "CodeCountdownText",
  visibleWhen: "{{ state.view.codeCountdown > 0 }}",
  props: { textContent: "{{state.view.codeCountdown}}s 后可重发" },
  ...
}
```

Toast 一般用 `ui.showToast` action 直接发，**不需要建节点**。

## §7. 屏级 overlays（任务 `I-X-overlays`，详见 `overlays.md`）

参考 `overlays.md`。

---

## 节点骨架补充总原则

| 视图态切换 | 写法 |
|-----------|------|
| 整页 / 整区域切换视图 | `visibleWhen` 切多棵子树 |
| 同一节点的不同样式态 | `visualState`（design 阶段写）|
| 业务对象状态机 | 每个状态一个独立节点 + visibleWhen 互斥 |

## MCP 操作

```
element/insert_subtree { projectId, parentId, subtree }   // 推荐：一次插入完整子树
element/add            { projectId, parentId, name, label, tag, layoutHint? }   // 单节点
element/set_visible_when { projectId, nodeId, visibleWhen }
meta/set_node          { projectId, nodeId, patch: { interaction: {...} } }
```

## 红线汇总

| 红线 | 触发 |
|------|-----|
| R-VIEW-LOAD-01 | dataSource 缺 pending 视图（且适用）|
| R-VIEW-EMPTY-01 | 列表型 dataSource 缺 empty 视图 |
| R-VIEW-EMPTY-CONTENT-01 | empty 节点缺四要素（图示 / 标题 / 描述 / 行动按钮）|
| R-VIEW-ERROR-01 | dataSource 缺 error 视图 |
| R-VIEW-AUTH-01 | 需要登录的屏缺 auth 视图节点 |
| R-VIEW-BUSINESS-01 | 业务状态机有枚举值漏建视图 |
| R-VIEW-VISIBLE-01 | 衍生视图节点缺 visibleWhen 表达式 |
