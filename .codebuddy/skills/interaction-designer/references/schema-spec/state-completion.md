# State 完整化规范（屏级 stateInit + 项目级 globalStateInit）

## §1. 屏级 stateInit.view 派生态完整化（任务 `I-X-state-vars`）

product 阶段已经声明了关键 view 占位（loginMode / form / submitting 等）；interaction 阶段补**所有运行时派生态**：

```jsonc
screen.stateInit.view = {
  // === product 阶段已声明的（保留，不重写）===
  loginMode:  { name, label, defaultValue: "code", enum: [...] },
  form:       { name, label, defaultValue: { phone, credential, policy } },
  submitting: { name, label, defaultValue: false },

  // === interaction 阶段补的派生态 ===
  errors: {
    name: "errors",
    label: "字段错误",
    defaultValue: { phone: "", credential: "", policy: "", login: "" }
  },
  canSubmit: {
    name: "canSubmit",
    label: "可提交",
    defaultValue: false
    // 注：在 events 里通过 state.set 维护，非自动派生
  },
  showPassword: {
    name: "showPassword",
    label: "密码可见",
    defaultValue: false
  },
  failureCount: {
    name: "failureCount",
    label: "失败次数",
    defaultValue: 0
  },
  lockedUntil: {
    name: "lockedUntil",
    label: "锁定截止 ts",
    defaultValue: null
  },
  codeCountdown: {
    name: "codeCountdown",
    label: "验证码倒计时秒",
    defaultValue: 0
  }
}
```

**MCP**：每个变量一次 `state/view_add { projectId, screenId, variable: { name, label, defaultValue, enum? } }`。

## §2. 屏级 stateInit.data 增补

product 阶段为每个 dataSource 留了 data 占位。interaction 阶段一般保持，**仅在确实需要中间态时补**：

```jsonc
screen.stateInit.data = {
  // ...product 阶段已写
  lockMeta: null            // 锁定相关元数据（如远端返回 lockedUntil）
}
```

**MCP**：`state/data_set_init { projectId, screenId, key, value }`。

## §3. 项目级 globalStateInit.view 子结构完整化（任务 `I-global-state-fill`）

product 阶段为 5 大全局态留了占位（session / network / preferences / nav / errorBoundary）。interaction 阶段补**完整子结构**：

```jsonc
project.globalStateInit.view = {
  session: {
    name: "session",
    label: "会话信息",
    defaultValue: {
      status:        "anonymous",   // anonymous | authenticated | expired | refreshing
      token:         null,
      refreshToken:  null,
      user:          null,
      expiresAt:     null,
      lastActivityAt: null
    }
  },
  network: {
    name: "network",
    label: "网络状态",
    defaultValue: {
      status:       "online",       // online | offline | slow
      retryCount:   0,
      lastOnlineAt: null
    }
  },
  preferences: {
    name: "preferences",
    label: "用户偏好",
    defaultValue: {
      themeVariant: "default",      // default | dark
      fontSize:     "md",
      lang:         "zh-CN",
      a11y:         { highContrast: false, reduceMotion: false }
    }
  },
  nav: {
    name: "nav",
    label: "导航上下文",
    defaultValue: {
      lastVisitedScreenId: null,
      pendingDeepLink:     null,
      authRedirectTo:      null
    }
  },
  errorBoundary: {
    name: "errorBoundary",
    label: "全局错误兜底",
    defaultValue: {
      crashed:    false,
      error:      null,
      errorCount: 0
    }
  }
}
```

**MCP**：每个变量一次 `state/global_view_update { projectId, name, patch: { defaultValue: {...} } }`（product 阶段已 add 了占位）。
如果 product 没 add → 用 `state/global_view_add`。

**红线 R-GLOBAL-STATE-01**：session / network 等必要变量缺子结构（仅 product 占位 null）。

## §4. defaultValue 设计原则

| 变量 | 默认值原则 |
|------|----------|
| boolean 类（submitting / showPassword / refreshing）| `false` |
| 字符串错误（errors.phone）| `""`（空字符串，不是 null —— 避免 `!!view.errors.phone` 时把 null 当 falsy 但模板仍渲染）|
| 数字（failureCount / codeCountdown）| `0` |
| 时间戳（lockedUntil）| `null` |
| 枚举（loginMode）| 列表第一个值 |
| 嵌套对象（form / errors / session）| 完整子结构（每个子字段都有默认）|

**禁止**：
- defaultValue: undefined（运行时不可预测）
- 嵌套对象默认 null 然后 events 里再赋值（破坏 typeDef 一致性）

## 红线汇总

| 红线 | 触发 |
|------|-----|
| R-GLOBAL-STATE-01 | 全局态必要变量缺子结构 |
| R-VIEW-INIT-01 | screen.stateInit.view 中存在变量 defaultValue: undefined |

## 入参 / 出参

```
查：state/list { projectId, screenId? }
写：state/view_add（新增）/ state/view_update（已有改 defaultValue）
写：state/global_view_add / state/global_view_update（项目级）
写：state/data_set_init / state/data_remove_init（屏级 data）
```
