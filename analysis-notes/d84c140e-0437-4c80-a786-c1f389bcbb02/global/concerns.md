> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：P-global-concerns
> 对应 schema 字段：project.meta.globalConcerns

# 全局态识别（5 类）— 校园社交登录页

> 本项目作用域虽仅"登录页 00-login"单屏，但**全局态识别仍按完整产品骨架来**——理由：
> 1. 登录页本身就是 session 的"写入屏"，session 必须建好
> 2. 后续项目接力时（注册/找回/主屏），globalConcerns 会被复用，本期不挖出来后续等于补 schema
> 3. R-PRODUCT-04 红线要求 5 类必齐声（即使某类是"本期不需要 + 理由"也要写）

## 推理过程

### 1. 会话 / 认证（session）

**是否需要**：✅ **必需**
**字段构成**（先识别，完整子结构留给 interaction 完整化）：
- `status` ∈ { `anonymous` | `active` | `expired` }
- `token` ∈ { `string` | `null` }（JWT）
- `user` ∈ { `User` | `null` }（id / phone / nickname / avatar）
- `expiresAt` ∈ { `timestamp` | `null` }

**生命周期**：跨屏。登录页（00-login）写入；token 过期自动转 `expired`；用户主动登出清空。
**对应 globalOverlay**：`global-session-expired`（其他屏读到 status=expired 时弹）
**对哪些屏的影响**：
- 写它的屏：00-login（登录成功 → status=active + token + user）
- 读它的屏：所有需要登录态的后续屏（M2~M4 占位屏，本期不实现）

### 2. 环境 / 网络（network）

**是否需要**：✅ **必需**
**字段构成**：
- `status` ∈ { `online` | `offline` }
- `retryCount` ∈ `number`

**生命周期**：系统全局监听 `navigator.connection` / online/offline 事件；启动时假设 online。
**对应 globalOverlay**：`global-offline-banner`（status=offline 时显示，提示性非阻断）
**对哪些屏的影响**：
- 登录页 00-login 在 offline 时阻断提交（避免无意义 fetch）
- 其他所有屏同样受影响

### 3. 全局 UI 偏好（preferences）

**是否需要**：⚠️ **占位即可**（本期登录页不做主题切换，但 theme-generator 阶段需要 themeVariant 字段）
**字段构成**：
- `theme` ∈ { `light` | `dark` }（本期默认 `light`，theme-generator 决定是否加 dark 变体）
- `fontSize` ∈ { `sm` | `md` | `lg` }（默认 `md`）
- `lang` ∈ `string`（默认 `zh-CN`）

**生命周期**：持久化到本地（localStorage）
**对哪些屏的影响**：登录页本身只读（应用主题）；后续设置屏写。

### 4. 跨屏导航上下文（nav）

**是否需要**：⚠️ **轻量占位**
**字段构成**：
- `authRedirectTo` ∈ { `screenId` | `null` }——其他屏要求登录、跳来登录页时记录"登录成功要跳回哪"
- `lastVisited` ∈ { `screenId` | `null` }
- `pendingDeepLink` ∈ { `string` | `null` }

**生命周期**：跨屏；登录成功消费 `authRedirectTo` 后清空。
**对哪些屏的影响**：
- 登录页 00-login 读 `authRedirectTo` 决定登录后跳哪（默认跳 `01-home`）
- 后续项目（M4 主屏）会写 `lastVisited`

### 5. 全局兜底层 UI（fallback）

**是否需要**：✅ **必需**（提供项目级 overlay 骨架）
**包含哪些 overlay**：
- ✅ `global-offline-banner`（`network.status === 'offline'`，提示性，登录页有意义——阻断提交时给用户兜底解释）
- ✅ `global-session-expired`（`session.status === 'expired'`，阻断 modal——登录页自身不会触发，但作为项目级骨架留好，后续屏复用）
- ❌ `global-app-update`（本期不做版本检测，跳过）
- ❌ `global-error-boundary`（属于框架级兜底，不在产品阶段建骨架，由 design-executor 评估）
- ❌ `global-maintenance`（503 兜底，本期不做）

## 跨屏读写矩阵

| 全局态 | 写它的屏 | 读它的屏 |
|--------|---------|---------|
| session | 00-login（登录成功写入）| 所有需要登录态的后续屏（M2~M4 占位）|
| network | 系统监听 | 所有屏（00-login 提交守卫读 status；OfflineBanner 读 status）|
| preferences | （本期无写入屏）| 所有屏（决定主题应用）|
| nav.authRedirectTo | 后续项目的"要登录"屏写入 | 00-login 读取决定登录后跳哪 |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_project
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  patch: {
    globalConcerns: {
      session:     { summary: "登录页写入；status ∈ {anonymous|active|expired}；含 token/user/expiresAt；过期触发 global-session-expired" },
      network:     { summary: "系统监听 online/offline；status=offline 触发 global-offline-banner 并阻断登录提交" },
      preferences: { summary: "本期占位：theme=light / fontSize=md / lang=zh-CN；theme-generator 阶段决定 dark 变体" },
      navigation:  { summary: "authRedirectTo 让后续要登录屏跳来登录页时记录目的地；登录成功消费后跳回，否则默认跳 01-home" },
      fallback:    { summary: "项目级兜底层：global-offline-banner（提示性）+ global-session-expired（阻断 modal），后续 app-update/error-boundary 按需补" }
    }
  }
}
```
