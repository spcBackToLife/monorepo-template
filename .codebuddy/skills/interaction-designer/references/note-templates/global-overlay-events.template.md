> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-global-overlay-events
> 对应 schema 字段：project.globalOverlays[*].rootNode 内交互节点的 events

# Step I-global-overlay-events — 全局 overlays 节点补 events

> 详细规范见 `schema-spec/overlays.md` §3。
>
> product 阶段已建好 globalOverlays 节点骨架（global-offline-banner / global-session-expired / global-error-boundary 等）。interaction 阶段补 **events 动态行为**。

## 推理过程

### 1. globalOverlays 清单（从 product 阶段沉淀的 overlays.md 读出）

| overlay id | 类型 | 何时显（触发条件）| 内部交互节点 |
|-----------|------|----------------|-----------|
| global-session-expired | modal | `globalView.session.status === 'expired'` | reloginBtn |
| global-offline-banner | banner | `globalView.network.status === 'offline'` | retryNetworkBtn / dismissBtn |
| global-error-boundary | full-screen | `globalView.errorBoundary.crashed === true` | reloadBtn / reportBtn |

### 2. 每个 overlay 的 events 设计

#### global-session-expired - reloginBtn

```jsonc
{
  trigger: "click",
  description: "session 过期时跳登录页并保留来源",
  actions: [
    { type: "state.set", path: "globalView.nav.authRedirectTo",
      value: "{{state.view.currentScreenId}}" },
    { type: "nav.go", targetScreenId: "00-login" },
    { type: "state.set", path: "globalView.session",
      value: { status: "anonymous", token: null, user: null, expiresAt: null, refreshToken: null, lastActivityAt: null } }
  ]
}
```

#### global-offline-banner - retryNetworkBtn

```jsonc
{
  trigger: "click",
  description: "用户主动重试网络",
  actions: [
    { type: "state.set", path: "globalView.network.retryCount",
      value: "{{globalView.network.retryCount + 1}}" },
    { type: "custom", handler: "platform.checkNetwork" }
    // 离线检测交给宿主，重新上线后宿主写 globalView.network.status='online'
  ]
}
```

#### global-error-boundary - reloadBtn

```jsonc
{
  trigger: "click",
  description: "重新加载应用 / 当前屏",
  actions: [
    { type: "state.set", path: "globalView.errorBoundary",
      value: { crashed: false, error: null, errorCount: 0 } },
    { type: "custom", handler: "platform.reload" }
  ]
}
```

### 3. 候选方案与否决

- 候选 A：reloginBtn 直接清空整个 session（包括 user 子字段）→ 否决：未来"重登后用户不变"场景应保留 user，但当前为安全起见全清
- 候选 B：retryNetworkBtn 的 retry 逻辑写在屏内 → 否决：跨屏共用，应在 globalOverlay 处统一
- ...

---

## ★ 沉淀到 schema 的结论

⚠️ globalOverlays 当前没有专属 op 链路。**实际操作方式**：

1. 通过 `meta/set_project` 直接 patch globalOverlays 字段（覆盖式）
2. 或者：识别到内部按钮节点的 nodeId 后，用 `event/add` 添加 events

```jsonc
// 方案 1（推荐，整体替换 overlay）：
meta/set_project {
  projectId,
  patch: {
    globalOverlays: [
      ...其他 overlay,
      {
        id: "global-session-expired",
        type: "modal",
        showWhen: "{{ globalView.session.status === 'expired' }}",
        rootNode: {
          ...原 product 写好的骨架,
          children: [
            ...,
            {
              id: "reloginBtn",
              type: "button",
              name: "ReloginButton",
              props: { textContent: "重新登录" },
              styles: {},
              events: [{
                trigger: "click",
                description: "session 过期时跳登录页并保留来源",
                actions: [
                  { type: "state.set", path: "globalView.nav.authRedirectTo",
                    value: "{{state.view.currentScreenId}}" },
                  { type: "nav.go", targetScreenId: "00-login" },
                  { type: "state.set", path: "globalView.session",
                    value: { status: "anonymous", token: null, user: null, expiresAt: null, refreshToken: null, lastActivityAt: null } }
                ]
              }],
              children: [], states: [], activeState: "default", locked: false, visible: true
            }
          ]
        }
      }
    ]
  }
}

// 方案 2（如 globalOverlay 内节点 ID 已知）：
event/add {
  projectId, nodeId: "<reloginBtn-id>",
  trigger: "click",
  description: "...",
  actions: [...]
}
```

> 落地时若发现 op 不支持 globalOverlay 节点的直接事件操作，**退回汇报，不要硬绕**。
