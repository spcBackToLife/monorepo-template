# 全局态识别 + globalStateInit + globalOverlays（项目级 ★ 不可省）

跨屏共享、生命周期跨屏的状态，必须在产品阶段就识别清楚，落到项目级。判断标准：
1. **跨屏共享**——多个屏读 / 写
2. **生命周期跨屏**——不随屏切换重置

## §1. 5 大类全局态穷举

| 类别 | 例子 | schema 落点 |
|------|------|------------|
| **会话 / 认证** | session / token / user / role / permissions / loginExpiry | `globalStateInit.view.session` |
| **环境 / 网络** | networkStatus(online/offline) / appVersion / featureFlags / deviceInfo / locale | `globalStateInit.view.network` |
| **全局 UI 偏好** | themeVariant / fontSize / language / a11y / colorScheme | `globalStateInit.view.preferences` |
| **跨屏导航上下文** | lastVisitedScreen / referralSource / pendingDeepLink / authRedirectTo | `globalStateInit.view.nav` |
| **全局兜底层 UI** | OfflineBanner / SessionExpiredModal / GlobalErrorBoundary / NetworkRetryToast / AppUpdatePrompt | `globalOverlays[]` |

每个识别到的全局态写到三处：
- **叙事**：`project.meta.globalConcerns.<类别>.summary`
- **占位**：`project.globalStateInit.view.<key>` 默认值（含子结构）
- **节点骨架**（如需 UI）：`project.globalOverlays[]`

## §2. globalConcerns（叙事，meta/set_project）

```jsonc
meta/set_project {
  projectId,
  patch: {
    globalConcerns: {
      session:     { summary: "用户认证 + 角色 + 权限 + token 生命周期" },
      network:     { summary: "在线 / 离线 + 重连策略" },
      preferences: { summary: "主题变体 / 字号 / 语言 / a11y" },
      navigation:  { summary: "lastVisited / deepLink / authRedirect" },
      fallback:    { summary: "全局错误兜底 / session 过期 / 版本升级" }
    }
  }
}
```

**红线 R-PRODUCT-04**：5 类全局态未识别（globalConcerns 缺失）→ 失败。

## §3. globalStateInit.view（占位声明）

```jsonc
// MCP: state/global_view_add（每个变量一次）
state/global_view_add {
  projectId,
  variable: {
    name: "session",
    label: "会话信息",
    defaultValue: null    // 完整子结构（status/token/user 等）留给 interaction 完整化
  }
}

state/global_view_add {
  projectId,
  variable: {
    name: "network",
    label: "网络状态",
    defaultValue: { status: "online", retryCount: 0 }
  }
}

state/global_view_add {
  projectId,
  variable: {
    name: "preferences",
    label: "用户偏好",
    defaultValue: { theme: "light", fontSize: "md", lang: "zh-CN" }
  }
}

state/global_view_add {
  projectId,
  variable: {
    name: "nav",
    label: "导航上下文",
    defaultValue: { lastVisited: null, pendingDeepLink: null, authRedirectTo: null }
  }
}
```

**红线 R-PRODUCT-05**：必要的全局态占位缺失（如 `session` / `network`）→ 失败。

## §4. globalOverlays（项目级覆盖层骨架）

类似 `screen.overlays`，但跨所有屏渲染——叠在屏内容 + 屏 overlays 之上。

### 4.1 与屏级 overlays 的区分

| 类型 | 定位 | 例子 |
|------|------|------|
| **屏级**（`screen.overlays`） | 仅本屏需要，随屏切换重置 | 登录页的锁定 Sheet |
| **项目级**（`project.globalOverlays`） | 跨屏共享 | 全局离线 banner / session 过期 modal |

**红线**：判断不准时倾向"项目级"——重复定义在屏级会失去同步。

### 4.2 写入 op（v2.2 ★ 必读）

`globalOverlays` 是 **A 类一等字段**（渲染契约会读，与 `meta.*` B 类信息严格分离）。

```jsonc
// ✅ 正确：用专门的 project.setGlobalOverlays op
//        MCP: meta/set_global_overlays
meta/set_global_overlays {
  projectId,
  overlays: [ /* 整组覆盖层；见 4.3 样板 */ ]
}

// ❌ 错误：会被 service 端拒绝（v2.2 起）
meta/set_project { patch: { globalOverlays: [...] } }
//   → 报错："meta.setProject 不能写入顶层一等字段..."
```

历史遗留：v2.2 之前的项目可能在 `meta.globalOverlays` 有"幽灵数据"。一次性迁移：
1. 用 `meta/set_global_overlays` 把数据写到顶层
2. 用 `meta/set_project { patch: { globalOverlays: null } }` 清掉 meta 里的同名字段（v2.2 service 对 null 值放行用于迁移）

### 4.3 完整骨架样板

```jsonc
// MCP: meta/set_global_overlays { projectId, overlays: [...] }
project.globalOverlays = [
  // 1. 离线 banner
  {
    id: "global-offline-banner",
    name: "全局离线条",
    type: "custom",
    showWhen: "{{ globalView.network.status === 'offline' }}",
    rootNode: {
      id: "offlineBannerRoot",
      type: "div",
      name: "OfflineBanner",
      styles: {}, props: {},
      children: [
        { id: "offlineIcon", type: "div", name: "WifiOffIcon",
          styles: {}, props: {}, children: [],
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "离线图标" } } },
        { id: "offlineText", type: "div", name: "OfflineText",
          styles: {},
          props: { textContent: "网络已断开，部分功能受限" },
          children: [],
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "离线提示文字" } } },
        { id: "offlineRetryBtn", type: "button", name: "RetryButton",
          styles: {},
          props: { textContent: "重试" },
          children: [],
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "点击重新检测网络（events 留给 interaction）" } } }
      ],
      states: [], events: [], activeState: "default", locked: false, visible: true,
      meta: { product: { summary: "网络断开时全局提示" } }
    }
    // backdrop 不需要（banner 不阻断操作）
  },

  // 2. session 过期 modal
  {
    id: "global-session-expired",
    name: "登录过期 Modal",
    type: "modal",
    showWhen: "{{ globalView.session && globalView.session.status === 'expired' }}",
    rootNode: {
      id: "sessionExpiredRoot",
      type: "div", name: "SessionExpiredModal",
      styles: {}, props: {},
      children: [
        { id: "...title...",   type: "div", name: "ExpiredTitle",
          props: { textContent: "登录已过期" }, children: [], styles: {},
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "标题" } } },
        { id: "...desc...",    type: "div", name: "ExpiredDesc",
          props: { textContent: "请重新登录以继续使用" }, children: [], styles: {},
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "描述" } } },
        { id: "...relogin...", type: "button", name: "ReLoginBtn",
          props: { textContent: "去登录" }, children: [], styles: {},
          states: [], events: [], activeState: "default", locked: false, visible: true,
          meta: { product: { summary: "重登入口（events: 跳登录页 + 写 nav.authRedirectTo 留来源）" } } }
      ],
      states: [], events: [], activeState: "default", locked: false, visible: true,
      meta: { product: { summary: "session 过期时全屏拦截" } }
    },
    backdrop: { color: "rgba(0,0,0,0.5)", dismissible: false }
  },

  // 3. App 升级提示（按需）
  {
    id: "global-app-update",
    name: "App 升级提示",
    type: "modal",
    showWhen: "{{ globalView.network.hasNewVersion && !globalView.preferences.updateDismissed }}",
    rootNode: { /* 类似上面，含 title / desc / 立即升级 / 稍后再说 */ }
  },

  // 4. 全局错误兜底（按需）
  {
    id: "global-error-boundary",
    name: "全局错误兜底",
    type: "custom",
    showWhen: "{{ globalView.errorBoundary && globalView.errorBoundary.crashed }}",
    rootNode: { /* ... */ }
  }
]
```

### 4.3 这一阶段的边界

| 字段 | 是否写 |
|------|:-----:|
| `id` / `name` / `type` / `showWhen` | ✅ |
| `rootNode` 节点骨架（含 product.summary）| ✅ |
| `backdrop`（蒙层配置）| ✅（基础）|
| 节点 `styles` | ❌ design |
| 节点 `events` / `bind` | ❌ interaction |
| `animation`（slideUp / fadeIn / 等）| 可写基础值，design 完整化 |

## §5. 全局态如何被识别（推理留痕示例）

写 md（`global/concerns.md`）时，必须按 5 大类逐项分析：

```markdown
### 会话 / 认证（session）

**是否需要**：✅ 是（产品有登录功能）
**字段构成**：status (active/expired/anonymous) / token / user / role
**生命周期**：跨屏；登录后保持，过期或主动登出清空
**对应 globalOverlay**：global-session-expired（status=expired 时弹）

### 环境 / 网络（network）

**是否需要**：✅ 是（toC 移动端必备）
**字段构成**：status (online/offline) / retryCount
**对应 globalOverlay**：global-offline-banner（status=offline 时显示）

...（其余 3 类同样判断）
```

## 红线汇总

| 红线 | 触发条件 |
|------|---------|
| **R-PRODUCT-04** | 项目缺 `meta.globalConcerns`（5 类未识别）|
| **R-PRODUCT-05** | 缺必要的 `globalStateInit.view.session/network` 等 |
