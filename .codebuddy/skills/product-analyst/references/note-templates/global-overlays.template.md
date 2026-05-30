> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：P-global-overlays
> 对应 schema 字段：project.globalOverlays

# 全局兜底层骨架

> 详细规范见 `schema-spec/global-concerns.md` §4。
>
> 跨所有屏渲染，叠在屏内容 + 屏 overlays 之上。

## 推理过程

### 需要建几个 overlay

基于 `global/concerns.md` 的 fallback 类识别：

| overlay | 是否需要 | 触发条件 | 阻断性 |
|---------|:-------:|---------|:------:|
| global-offline-banner | ✅ | network.status === 'offline' | ❌ 提示性 |
| global-session-expired | ✅ | session.status === 'expired' | ✅ 阻断（必须重登）|
| global-app-update | [按需] | 有新版本 | ❌ 可关闭 |
| global-error-boundary | [按需] | 全局未捕获异常 | ✅ 阻断 |
| global-maintenance | [按需] | 后端返回 503 | ✅ 阻断 |

### 每个 overlay 的设计要点

#### 1. global-offline-banner

- **type**：custom（顶部 banner，不需 backdrop）
- **showWhen**：`{{ globalView.network.status === 'offline' }}`
- **节点结构**：
  - WifiOffIcon（图标）
  - OfflineText（文案 "网络已断开，部分功能受限"）
  - RetryButton（按钮 "重试"）
- **events 留给 interaction**：retry 点击触发 network 重检

#### 2. global-session-expired

- **type**：modal（阻断性）
- **showWhen**：`{{ globalView.session && globalView.session.status === 'expired' }}`
- **backdrop**：rgba(0,0,0,0.5) + dismissible: false
- **节点结构**：
  - ExpiredTitle（"登录已过期"）
  - ExpiredDesc（"请重新登录以继续使用"）
  - ReLoginBtn（按钮 "去登录"，events 跳登录页 + 写 nav.authRedirectTo）

#### 3. global-app-update（按需）

[同样格式：type / showWhen / 节点结构]

#### 4. global-error-boundary（按需）

[同样格式]

### 这一阶段的边界

| 字段 | 是否写 |
|------|:-----:|
| `id` / `name` / `type` / `showWhen` | ✅ |
| `rootNode` 节点骨架（含 product.summary）| ✅ |
| `backdrop`（基础配置）| ✅ |
| `animation` 基础值（slideUp / fadeIn）| 可写 |
| 节点 `styles` | ❌ design |
| 节点 `events` | ❌ interaction |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_project { patch: { globalOverlays: [...] } }
{
  projectId,
  patch: {
    globalOverlays: [
      {
        id: "global-offline-banner",
        name: "全局离线条",
        type: "custom",
        showWhen: "{{ globalView.network.status === 'offline' }}",
        rootNode: {
          id: "offlineBannerRoot",
          type: "div", name: "OfflineBanner",
          styles: {}, props: {},
          children: [
            { id: "offlineIcon", type: "div", name: "WifiOffIcon",
              styles: {}, props: {}, children: [],
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "离线图标" } } },
            { id: "offlineText", type: "div", name: "OfflineText",
              styles: {}, props: { textContent: "网络已断开，部分功能受限" },
              children: [],
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "离线提示文字" } } },
            { id: "offlineRetryBtn", type: "button", name: "RetryButton",
              styles: {}, props: { textContent: "重试" }, children: [],
              states: [], events: [], activeState: "default", locked: false, visible: true,
              meta: { product: { summary: "点击重新检测网络（events 留给 interaction）" } } }
          ],
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "网络断开时全局提示" } }
        }
      },
      {
        id: "global-session-expired",
        name: "登录过期 Modal",
        type: "modal",
        showWhen: "{{ globalView.session && globalView.session.status === 'expired' }}",
        backdrop: { color: "rgba(0,0,0,0.5)", dismissible: false },
        rootNode: {
          // 类同上面，含 ExpiredTitle / ExpiredDesc / ReLoginBtn
        }
      }
      // ... 其他按需添加
    ]
  }
}
```
