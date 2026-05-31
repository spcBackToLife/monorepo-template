> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：P-global-concerns
> 对应 schema 字段：project.meta.globalConcerns

# 全局态识别（5 类）

> 详细规范见 `schema-spec/global-concerns.md`。
>
> 跨屏共享、生命周期跨屏的状态，必须在产品阶段就识别清楚。判断标准：
> 1. 跨屏共享（多个屏读 / 写）
> 2. 生命周期跨屏（不随屏切换重置）

## 推理过程

### 1. 会话 / 认证（session）

**是否需要**：[✅ / ❌] [理由]
**字段构成**：[status / token / user / role / permissions / loginExpiry / ...]
**生命周期**：[何时建立、何时清空、何时过期]
**对应 globalOverlay**：[如 global-session-expired]
**对哪些屏的影响**：[哪些屏读它、哪些屏写它]

### 2. 环境 / 网络（network）

**是否需要**：[✅ / ❌] [理由]
**字段构成**：[networkStatus / appVersion / featureFlags / deviceInfo / locale / ...]
**生命周期**：...
**对应 globalOverlay**：[如 global-offline-banner]
**对哪些屏的影响**：...

### 3. 全局 UI 偏好（preferences）

**是否需要**：[✅ / ❌] [理由]
**字段构成**：[themeVariant / fontSize / language / a11y / colorScheme / ...]
**生命周期**：[持久化到本地]
**对哪些屏的影响**：...

### 4. 跨屏导航上下文（nav）

**是否需要**：[✅ / ❌] [理由]
**字段构成**：[lastVisitedScreen / referralSource / pendingDeepLink / authRedirectTo / ...]
**生命周期**：...
**对哪些屏的影响**：...

### 5. 全局兜底层 UI（fallback）

**是否需要**：[✅ / ❌] [理由]
**包含哪些 overlay**：
- [ ] OfflineBanner（network.status === 'offline'）
- [ ] SessionExpiredModal（session.status === 'expired'）
- [ ] GlobalErrorBoundary（errorBoundary.crashed）
- [ ] NetworkRetryToast / AppUpdatePrompt / ...

## 跨屏读写矩阵（可选）

| 全局态 | 写它的屏 | 读它的屏 |
|--------|---------|---------|
| session | 00-login（写）/ 00-logout（清空）| 01-home / 10-profile-self / ... |
| network | 系统监听 | 所有屏 |
| ... | | |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_project
{
  projectId,
  patch: {
    globalConcerns: {
      session:     { summary: "..." },
      network:     { summary: "..." },
      preferences: { summary: "..." },
      navigation:  { summary: "..." },
      fallback:    { summary: "..." }
    }
  }
}
```

> 5 类必须齐声（即使某类只是写 "本期不需要 + 理由"），否则触发 R-PRODUCT-04。
