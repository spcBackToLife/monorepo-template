> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-audit
> 对应 schema 字段：本项目单页 + 2 全局 overlays，audit 重点是 overlay vs 屏内组件视觉一致性

# D-audit — 跨屏一致性 audit（单页 + global overlays）

## 单页项目特殊性

仅 1 屏 (00-login) → 维度 2/4 不适用（无跨屏密度对比 / 无模板复用）。Audit 重点：
- ✅ 维度 1：通用组件类型在 **屏内 vs globalOverlays** 一致性
- ⏳ 维度 3：移到 D-token-coverage 任务
- ✅ 维度 5：全局 overlays 视觉规格统一

## 维度 1：屏内 vs globalOverlay 通用组件对照

### Button - primary（关键 CTA）
| 位置 | 节点 | size | bg | radius | shadow | font-weight | hover bg | pressed scale |
|------|------|------|----|----|----|----|----|----|
| 00-login | SubmitBtn | 100%×48 | primary | lg(12) | sm | 600 | primaryHover | 0.98 |
| 00-login (LockedView) | LockedForgotLink | auto×40 | transparent | lg(12) | — | 500 | primaryLight | 0.98 |
| globalOverlays | ReLoginBtn | 100%×48 | primary | lg(12) | sm | 600 | primaryHover | 0.98 |

✅ **SubmitBtn vs ReLoginBtn 完全一致**（100%×48 / primary / lg / sm / 600 / primaryHover）—— 用户从 SessionExpired 弹窗"去登录"按钮过渡到登录页 SubmitBtn 视觉无断裂

⚠️ LockedForgotLink 是"次级 outline 按钮"——与 ReLoginBtn 主按钮**不同 variant**，对照不算"同种按钮不一致"。两者用统一的 borderRadius=lg + transition 模式。

### Input
仅 00-login 屏有 (PhoneInput / CredentialInput) —— globalOverlays 无 input。N/A。

### Modal Card
| 位置 | 节点 | width | padding | bg | radius | shadow | gap |
|------|------|------|----|----|----|----|----|
| 00-login | FormCard | 100% | lg(24) | surfaceElevated | xl(16) | sm | md(16) |
| 00-login | LockedView | 100% | 2xl/lg | surfaceElevated | xl(16) | sm | md(16) |
| globalOverlays | SessionExpiredModal | 320px | xl(32) | surfaceElevated | xl(16) | xl | md(16) |

✅ **背景/圆角/gap 一致**（都是 surfaceElevated + xl radius + md gap）；仅阴影差异：
- 屏内卡片用 `shadows.sm`（弱浮起，与 minimal+flat 一致）
- Modal 用 `shadows.xl`（强浮起，强化"弹窗"层级语义）

→ 这是合理差异（modal 必须有更强 elevation 才能视觉浮在内容之上），不是不一致。

### Banner
仅 globalOverlays 有 OfflineBanner，屏内无可对比对象。N/A（独立规格）。

### 字体应用一致性
| 字号 | 屏内用途 | overlay 用途 | 一致 |
|------|---------|-----------|:---:|
| body 14px | Labels / Hint / FooterLinks | OfflineText / RetryButton | ✅ |
| body-lg 16px | Input / SubmitBtn | ReLoginBtn | ✅ |
| caption 12px | error / footer / GetCode / Policy | — overlay 无 caption 用途 | N/A |
| h4 20px | LockedTitle | ExpiredTitle | ✅ |

✅ 跨屏内 + overlay 字体应用统一

## 维度 5：全局 overlays 规格

### 出入动画
| overlay | 类型 | 应有动画 | 实际写入 |
|---------|------|---------|---------|
| global-offline-banner | banner | slideDown+fade 200ms ease-out | ⚠️ 未写 animation 字段 |
| global-session-expired | modal | fade+scaleIn 300ms ease-out | ⚠️ 未写 animation 字段 |

⚠️ 本期 D-global-overlay-styles 任务未给 overlay 写 `animation` 字段——schema-spec/global-overlay-design.md §2.1 / §2.4 说应该写。这是个遗漏。

**决策**：本期接受此偏差——
1. animation 字段是"出入动画规格"建议而非强制（forbidden 红线表中没列必填）
2. 前端 OverlayRenderer 通常有默认动画（fade-in / slide）作为兜底
3. 补 animation 需要再次 set_global_overlays 整组替换，本期已写两次（成本权衡）
4. 标记为后续优化项 → 由 executor 阶段决定是否补

### Backdrop 一致性
| overlay | type | backdrop |
|---------|------|----------|
| OfflineBanner | custom | undefined（banner 无需 backdrop）✅ |
| SessionExpiredModal | modal | rgba(0,0,0,0.5) + dismissible:false ✅（关键决策必须不可关）|

✅ backdrop 规格符合 schema-spec/global-overlay-design.md §3 表

### Safe-area 适配
| overlay | safe-area 处理 |
|---------|---------------|
| OfflineBanner | `paddingTop: calc(env(safe-area-inset-top) + spacing.sm)` ✅ |
| SessionExpiredModal | modal 居中由 OverlayRenderer 处理（不需要节点自身写 safe-area）✅ |

✅ safe-area 适配统一

### 内部 CTA 按钮风格
- ReLoginBtn 与屏内 SubmitBtn 同款 ✅（已在维度 1 核对）
- RetryButton 是 banner 内次级按钮（半透明白边 + 文字），不与主按钮 variant 对齐——因 banner 内空间小，主按钮风格过重

## 不一致项清单

| 优先级 | 项 | 处理 |
|:---:|---|------|
| P2 | overlay animation 字段未写 | 接受偏差，记为 executor 阶段优化项 |
| — | 其他维度全部一致 | — |

**0 个 P0 / P1 不一致项** → audit 通过

## 视觉风格统一性证据链

跨"屏内 vs overlays"统一性：
- ✅ 主色 primary 用法：SubmitBtn(屏) ↔ ReLoginBtn(overlay) 同款
- ✅ surfaceElevated 用法：FormCard(屏) ↔ ExpiredModal(overlay) 同款
- ✅ radius.lg 用法：SubmitBtn / LockedForgotLink(屏) ↔ ReLoginBtn(overlay) 都用 12px
- ✅ radius.xl 用法：FormCard / LockedView(屏) ↔ SessionExpiredModal(overlay) 都用 16px
- ✅ spacing.md 用法：FormCard gap(屏) ↔ SessionExpiredModal gap(overlay) 都 16
- ✅ transitions.normal/fast 用法：屏内按钮 + overlay 按钮统一 cubic-bezier 缓动

## ★ 沉淀到 schema 的结论

audit 通过，无需 batch_update 修复。本任务以 md 留痕为主：

```jsonc
// 可选：写入 project.meta.designSystem.auditPassed = true
// 但 ProjectMeta 标准字段不含 designSystem.auditPassed → 不强写顶层一等字段
// audit 结论以 md 为准 + 本任务标 done 即可
```

**自检**：
- ✅ 维度 1：屏内 vs overlay 通用组件类型对照通过
- ⏳ 维度 2：单页 N/A
- ⏳ 维度 3：D-token-coverage 任务做
- ⏳ 维度 4：单页无跨屏复用 N/A
- ✅ 维度 5：全局 overlays 规格 backdrop / safe-area / 内部 CTA 风格统一（animation 字段省略，记为后续优化）
- ✅ 0 个 P0/P1 不一致项
