> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-global-state-fill
> 对应 schema 字段：project.globalStateInit.view（5 类全局态子结构完整化）

# Step I-global-state-fill — 全局态子结构完整化

> 详细规范见 `schema-spec/state-completion.md` §3。
>
> product 阶段已声明占位（session / network / preferences / nav / errorBoundary 5 类），interaction 阶段补**完整子结构**。

## 推理过程

### 1. 5 类全局态子结构设计

#### session

```jsonc
defaultValue: {
  status: "anonymous",          // anonymous | authenticated | expired | refreshing
  token:        null,
  refreshToken: null,
  user:         null,
  expiresAt:    null,
  lastActivityAt: null
}
```

设计依据：
- `status` 用 enum 字符串，便于 condition.when 判断
- `expiresAt` 用 ts，便于 `< now()` 计算过期
- `lastActivityAt` 用于实现"无活动 30min 自动登出"

#### network

```jsonc
defaultValue: {
  status:        "online",      // online | offline | slow
  retryCount:    0,
  lastOnlineAt:  null
}
```

设计依据：
- `status` 用 enum，便于 banner showWhen
- `retryCount` 显示在重试按钮上（"已尝试 N 次"）

#### preferences

```jsonc
defaultValue: {
  themeVariant: "default",      // default | dark
  fontSize:     "md",           // sm | md | lg
  lang:         "zh-CN",
  a11y: {
    highContrast: false,
    reduceMotion: false
  }
}
```

设计依据：
- 跟随系统偏好；启动时由宿主写入

#### nav

```jsonc
defaultValue: {
  lastVisitedScreenId: null,
  pendingDeepLink:     null,
  authRedirectTo:      null
}
```

设计依据：
- `authRedirectTo`：未登录跳走时保留来源，登录后回跳
- `pendingDeepLink`：分享链接到达时存放，登录后跳转

#### errorBoundary

```jsonc
defaultValue: {
  crashed:    false,
  error:      null,
  errorCount: 0
}
```

设计依据：
- `crashed=true` 时 global-error-boundary overlay 自动显
- `errorCount` 累加，达到阈值自动上报

### 2. 候选方案与否决

- 候选 A：把 session.user 子字段全部展开（avatar / nickname / phone）→ 否决：登录后由 API 返回，不应在 defaultValue 写空字符串
- 候选 B：preferences 默认 dark → 否决：默认应跟随系统，且 default 中性
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// product 阶段已 add 占位，本阶段用 update 改 defaultValue
state/global_view_update {
  projectId, name: "session",
  patch: {
    defaultValue: {
      status: "anonymous", token: null, refreshToken: null,
      user: null, expiresAt: null, lastActivityAt: null
    }
  }
}

state/global_view_update {
  projectId, name: "network",
  patch: {
    defaultValue: { status: "online", retryCount: 0, lastOnlineAt: null }
  }
}

state/global_view_update {
  projectId, name: "preferences",
  patch: {
    defaultValue: {
      themeVariant: "default", fontSize: "md", lang: "zh-CN",
      a11y: { highContrast: false, reduceMotion: false }
    }
  }
}

state/global_view_update {
  projectId, name: "nav",
  patch: {
    defaultValue: { lastVisitedScreenId: null, pendingDeepLink: null, authRedirectTo: null }
  }
}

state/global_view_update {
  projectId, name: "errorBoundary",
  patch: {
    defaultValue: { crashed: false, error: null, errorCount: 0 }
  }
}
```

> 红线 R-GLOBAL-STATE-01：必要变量缺子结构会失败。
