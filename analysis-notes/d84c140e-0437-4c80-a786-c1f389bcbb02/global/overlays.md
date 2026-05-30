> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：P-global-overlays
> 对应 schema 字段：project.globalOverlays

# 全局兜底层骨架 — 校园社交登录页

## 推理过程

### 需要建几个 overlay

基于 `global/concerns.md` 的 fallback 类识别：

| overlay | 是否需要 | 触发条件 | 阻断性 | 本期建骨架？ |
|---------|:-------:|---------|:------:|:----------:|
| global-offline-banner | ✅ | network.status === 'offline' | ❌ 提示性 | ✅ 建（登录页阻断提交时需要） |
| global-session-expired | ✅ | session.status === 'expired' | ✅ 阻断（必须重登）| ✅ 建（项目级骨架，后续屏复用）|
| global-app-update | ❌ | 有新版本 | ❌ 可关闭 | 跳过（本期不做版本检测） |
| global-error-boundary | ❌ | 全局未捕获异常 | ✅ 阻断 | 跳过（属框架级兜底，design-executor 评估）|
| global-maintenance | ❌ | 后端 503 | ✅ 阻断 | 跳过（本期不需要）|

### 每个 overlay 的设计要点

#### 1. global-offline-banner（必建）

- **type**：`custom`（顶部 banner，不需 backdrop）
- **showWhen**：`{{ globalView.network.status === 'offline' }}`
- **节点结构**：
  - `WifiOffIcon`（图标占位 div）
  - `OfflineText`（"网络已断开，部分功能受限"）
  - `RetryButton`（按钮 "重试"，events 留 interaction）
- **events 留给 interaction**：retry 点击触发 network 重检（custom action）

#### 2. global-session-expired（必建）

- **type**：`modal`（阻断性）
- **showWhen**：`{{ globalView.session && globalView.session.status === 'expired' }}`
- **backdrop**：`{ color: "rgba(0,0,0,0.5)", dismissible: false }`
- **节点结构**：
  - `ExpiredTitle`（"登录已过期"）
  - `ExpiredDesc`（"请重新登录以继续使用"）
  - `ReLoginBtn`（按钮 "去登录"，events 留 interaction：跳 00-login + 写 nav.authRedirectTo）

> 注意：登录页本身（00-login）不会触发 session.status='expired'（它是写 session 的屏，自己不读）。这个 overlay 是为后续屏准备的项目级骨架；本期建好后零成本，后续不用补。

### 这一阶段的边界

| 字段 | 是否写 |
|------|:-----:|
| `id` / `name` / `type` / `showWhen` | ✅ |
| `rootNode` 节点骨架（含 product.summary）| ✅ |
| `backdrop`（基础配置）| ✅ |
| 节点 `styles` | ❌ design |
| 节点 `events` | ❌ interaction |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_project { patch: { globalOverlays: [...] } }
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  patch: {
    globalOverlays: [
      // 1. 离线 banner
      {
        id: "global-offline-banner",
        name: "全局离线条",
        type: "custom",
        showWhen: "{{ globalView.network.status === 'offline' }}",
        rootNode: {
          id: "offlineBannerRoot", type: "div", name: "OfflineBanner",
          styles: {}, props: {},
          children: [
            { id: "offlineIcon", type: "div", name: "WifiOffIcon",
              styles: {}, props: {}, children: [],
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "离线图标占位" } } },
            { id: "offlineText", type: "div", name: "OfflineText",
              styles: {}, props: { textContent: "网络已断开，部分功能受限" }, children: [],
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "离线提示文字" } } },
            { id: "offlineRetryBtn", type: "button", name: "RetryButton",
              styles: {}, props: { textContent: "重试" }, children: [],
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "点击重新检测网络（events 留给 interaction）" } } }
          ],
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "网络断开时全局提示，提示性非阻断" } }
        }
      },

      // 2. session 过期 modal
      {
        id: "global-session-expired",
        name: "登录过期 Modal",
        type: "modal",
        showWhen: "{{ globalView.session && globalView.session.status === 'expired' }}",
        backdrop: { color: "rgba(0,0,0,0.5)", dismissible: false },
        rootNode: {
          id: "sessionExpiredRoot", type: "div", name: "SessionExpiredModal",
          styles: {}, props: {},
          children: [
            { id: "sessionExpiredTitle", type: "div", name: "ExpiredTitle",
              props: { textContent: "登录已过期" }, children: [], styles: {},
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "标题" } } },
            { id: "sessionExpiredDesc", type: "div", name: "ExpiredDesc",
              props: { textContent: "请重新登录以继续使用" }, children: [], styles: {},
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "描述" } } },
            { id: "sessionReLoginBtn", type: "button", name: "ReLoginBtn",
              props: { textContent: "去登录" }, children: [], styles: {},
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "重登入口（events 留 interaction：跳 00-login + 写 nav.authRedirectTo）" } } }
          ],
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "session 过期时全屏拦截重登" } }
        }
      }
    ]
  }
}
```
