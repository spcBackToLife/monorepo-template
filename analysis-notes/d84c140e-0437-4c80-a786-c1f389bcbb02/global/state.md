> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：P-global-state
> 对应 schema 字段：project.globalStateInit.view

# 全局 view 变量占位声明 — 校园社交登录页

> 基于 `global/concerns.md` 识别到的 5 类全局态，本任务**只声明占位 + 默认值**——子结构完整化（如 session 的 status/token/user 字段、effect 联动）留给 interaction 阶段。

## 推理过程

### session

- **defaultValue**：`null`
- **理由**：启动时未登录态用 null 是最简洁表达；interaction 阶段会改为 `{ status: 'anonymous', token: null, user: null }` 完整结构（取决于 effect 阶段如何写）。本期占位用 null 即可。
- **后续完整化方向**：
  - login 成功写入 `{ status: 'active', token, user, expiresAt }`
  - token 过期自动转 `{ status: 'expired', ... }`

### network

- **defaultValue**：`{ status: "online", retryCount: 0 }`
- **理由**：启动时假设在线（系统监听后修正）。retryCount 用于"重连退避"策略。
- **后续完整化方向**：
  - 后续可能加 `lastOnlineAt` / `quality` 等字段

### preferences

- **defaultValue**：`{ theme: "light", fontSize: "md", lang: "zh-CN" }`
- **理由**：浅色优先（与"简约时尚"风格相符）；中等字号；中文。theme-generator 阶段决定是否加 dark token，届时 `theme` 字段开始有 toggle 价值。
- **后续完整化方向**：
  - 持久化到 localStorage（interaction 用 effect 写入）
  - a11y 字段（reduceMotion / highContrast）按需扩展

### nav

- **defaultValue**：`{ lastVisited: null, pendingDeepLink: null, authRedirectTo: null }`
- **理由**：启动时无历史；3 个字段都是"消费型"——读完即清。
- **后续完整化方向**：
  - 后续屏写入 `authRedirectTo` 让 00-login 登录后跳回；本项目 00-login 读取该字段消费

## 默认值取值的依据汇总

| 变量 | 默认值 | 依据 |
|------|-------|------|
| `session` | `null` | 启动时未登录态 |
| `network` | `{ status: "online", retryCount: 0 }` | 启动假设在线，由系统监听更新 |
| `preferences` | `{ theme: "light", fontSize: "md", lang: "zh-CN" }` | 浅色 + 中等字号 + 中文，符合"简约时尚 + 校园温度" |
| `nav` | `{ lastVisited: null, pendingDeepLink: null, authRedirectTo: null }` | 启动时无任何历史 |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: state/global_view_add（每个变量一次）

state/global_view_add {
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  variable: { name: "session", label: "会话信息", defaultValue: null }
}

state/global_view_add {
  projectId,
  variable: { name: "network", label: "网络状态",
              defaultValue: { status: "online", retryCount: 0 } }
}

state/global_view_add {
  projectId,
  variable: { name: "preferences", label: "用户偏好",
              defaultValue: { theme: "light", fontSize: "md", lang: "zh-CN" } }
}

state/global_view_add {
  projectId,
  variable: { name: "nav", label: "导航上下文",
              defaultValue: { lastVisited: null, pendingDeepLink: null, authRedirectTo: null } }
}
```

> 红线 R-PRODUCT-05：`session` / `network` 占位至少要有，否则失败。本任务两者都已声明。
