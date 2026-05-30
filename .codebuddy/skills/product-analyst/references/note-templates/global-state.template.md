> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：P-global-state
> 对应 schema 字段：project.globalStateInit.view

# 全局 view 变量占位声明

> 详细规范见 `schema-spec/global-concerns.md` §3。
>
> 本任务**只声明占位**——子结构完整化（如 session 的 status/token/user 等字段）留给 interaction 阶段。

## 推理过程

基于 `global/concerns.md` 识别到的 5 类全局态，给每个识别为"需要"的全局态写占位：

### session
- defaultValue 设计：[null 还是 { status: "anonymous" }？理由]
- 后续完整化方向：[预告 interaction 阶段会补哪些子字段]

### network
- defaultValue 设计：[{ status: "online", retryCount: 0 } 还是别的？理由]
- 后续完整化方向：...

### preferences
- defaultValue 设计：[{ theme: "light", fontSize: "md", lang: "zh-CN" } 是否合理？]
- 后续完整化方向：...

### nav
- defaultValue 设计：[{ lastVisited: null, pendingDeepLink: null, authRedirectTo: null }]
- 后续完整化方向：...

## 默认值取值的依据

| 变量 | 默认值 | 依据 |
|------|-------|------|
| session | null | 启动时未登录态 |
| network | { status: "online", ... } | 启动时假设在线，由系统监听更新 |
| preferences | { theme: "light", ... } | 浅色优先，遵循系统偏好后续完整化 |
| nav | { lastVisited: null, ... } | 启动时无历史 |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: state/global_view_add（每个变量一次）
state/global_view_add {
  projectId,
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

> 必要的全局态占位（至少 session / network）缺失 → 触发 R-PRODUCT-05。
