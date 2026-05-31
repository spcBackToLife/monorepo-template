# Overlays 规范（屏级 + 项目级）

## §1. 概念区分

| 类型 | 位置 | 适用场景 | 任务 |
|------|------|---------|-----|
| `screen.overlays[]` | 屏级，**不在 rootNode 树中** | 屏内 modal / sheet / drawer（如登录页"忘记密码 modal"）| `I-X-overlays` |
| `project.globalOverlays[]` | 项目级，跨屏共用 | 全局兜底（offline-banner / session-expired Modal / error-boundary）| `I-global-overlay-events`（events 补全）|
| 节点 + visibleWhen | 在 rootNode 树中 | 衍生视图节点（loading / empty / error / 业务状态视图）| 7 类视图任务 |

**简单规则**：
- 同时和某屏内容并存的覆盖层 / 屏离开就消失 → screen.overlays
- 任何屏都可能见到 → project.globalOverlays
- 是页面的一部分（占位 / 业务态切换）→ visibleWhen 节点

## §2. 屏级 overlays 完整 schema（任务 `I-X-overlays`）

```jsonc
screen.overlays = [
  {
    id: "overlay-locked-sheet",
    name: "账户锁定 Sheet",
    type: "bottomSheet",                    // modal | bottomSheet | drawer | toast | custom
    rootNode: {
      // ★ Sheet 内部节点树
      id: "lockedSheetRoot",
      type: "div",
      name: "LockedSheetContent",
      styles: {},                          // 留给 design
      props: {},
      states: [], events: [], activeState: "default", locked: false, visible: true,
      children: [
        { id: "lockedTitle",     type: "div",    name: "LockedTitle",
          props: { textContent: "账户已锁定" } },
        { id: "lockedCountdown", type: "div",    name: "CountdownText",
          props: { textContent: "{{view.lockedUntil ? formatCountdown(view.lockedUntil) : ''}}" } },
        { id: "contactSupport",  type: "button", name: "ContactSupport",
          props: { textContent: "联系客服" },
          events: [{
            trigger: "click",
            description: "打开客服链接",
            actions: [{ type: "ui.openUrl", url: "https://cs.example.com" }]
          }]
        }
      ]
    },
    animation: "slideUp",
    backdrop:  { color: "rgba(0,0,0,0.45)", dismissible: false },
    showWhen:  "{{view.lockedUntil && view.lockedUntil > now()}}"  // 自动控制显隐
  }
]
```

### showWhen vs ui.showOverlay/hideOverlay

两种打开 / 关闭方式：

**A. showWhen（推荐，状态驱动）**

```jsonc
// 在 events 中改对应 view 变量即可自动显
{ type: "state.set", path: "view.lockedUntil", value: "{{now()+30*60*1000}}" }
```

**B. ui.showOverlay / hideOverlay（命令式）**

```jsonc
{ type: "ui.showOverlay", overlayId: "overlay-locked-sheet" }
{ type: "ui.hideOverlay", overlayId: "overlay-locked-sheet" }
```

**红线**：
- 同一个 overlay 同时混用 showWhen + ui.showOverlay → 不可预测
- 优先 showWhen（声明式，state 即真相）

### MCP 操作

⚠️ schema 类型层有 `Screen.overlays[]` 字段，但当前 op 链路待完善。**当前阶段实操方式**：

1. **优先方案**：用 `visibleWhen` 节点替代屏级 overlay（建一个 fixed 定位 + 蒙层的 div 节点挂到 rootNode）

```
state/view_add { variable: { name: "forgotModalOpen", defaultValue: false } }

element/insert_subtree {
  parentId: <rootNode>,
  subtree: { name: "ForgotPasswordModal", type: "div", ... children: [...] }
}

element/set_visible_when { nodeId: <modalId>, visibleWhen: "{{ state.view.forgotModalOpen }}" }

// 触发开/关
打开按钮 event: actions: [{ type: 'state.set', path: 'view.forgotModalOpen', value: true }]
关闭按钮 event: actions: [{ type: 'state.set', path: 'view.forgotModalOpen', value: false }]
```

2. **后备方案**（待 op 实装后）：直接写 screen.overlays。

## §3. 项目级 globalOverlays 补 events（任务 `I-global-overlay-events`）

product 阶段已建好 globalOverlays 节点骨架（global-offline-banner / global-session-expired / global-error-boundary 等）。interaction 阶段补 **events 动态行为**：

```jsonc
// 例：session 过期 Modal 内的"重新登录"按钮 → 跳登录页 + 保留来源
project.globalOverlays.find(o => o.id === "global-session-expired").rootNode = {
  ...原 product 写的,
  children: [
    ...,
    {
      id: "reloginBtn",
      type: "button",
      name: "ReloginButton",
      props: { textContent: "重新登录" },
      events: [{
        trigger: "click",
        description: "session 过期时跳登录页并保留来源",
        actions: [
          { type: "state.set", path: "globalView.nav.authRedirectTo",
            value: "{{state.view.currentScreenId}}" },
          { type: "nav.go", targetScreenId: "00-login" },
          { type: "state.set", path: "globalView.session",
            value: { status: "anonymous", token: null, user: null } }
        ]
      }],
      styles: {}, children: [], states: [], activeState: "default", locked: false, visible: true
    }
  ]
}

// 例：离线 banner 重试按钮
{
  id: "retryNetworkBtn",
  type: "button",
  events: [{
    trigger: "click",
    description: "用户主动重试网络",
    actions: [
      { type: "state.set", path: "globalView.network.retryCount",
        value: "{{globalView.network.retryCount + 1}}" },
      { type: "custom", handler: "platform.checkNetwork" }
      // 离线检测交给宿主，重新上线后宿主写 globalView.network.status='online'
    ]
  }]
}
```

⚠️ globalOverlays 的 MCP 操作目前没有专属 op，**通过 `meta/set_project` patch globalOverlays 字段**或对节点用 element/event 等通用工具操作（视实际 API 而定，落地时若发现无法操作 → 退回退回汇报）。

## 红线汇总

| 红线 | 触发 |
|------|-----|
| R-OVERLAY-CONFLICT-01 | 同 overlay 同时用 showWhen + ui.showOverlay |
| R-GLOBAL-OVERLAY-01 | globalOverlays 节点存在但内部按钮缺 events |
| R-GLOBAL-OVERLAY-02 | global-session-expired / global-offline-banner / global-error-boundary 三类核心 overlay 缺 events |
