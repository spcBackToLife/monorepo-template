# 模板：D-global-overlay-audit（全局 overlays 跨屏并存视觉协调）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/global/overlay-audit.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-global-overlay-audit
> 对应 schema 字段：核对类，发现问题立刻修

## 1. 跨 overlay 统一规格对照

### 出入动画
| overlay | enter | exit | duration | easing | 是否符合规格 |
|---------|-------|------|----------|--------|:-----------:|
| global-offline-banner | slideDown+fade | fade+slideUp | 200ms | ease-out | ✅ |
| global-session-expired | fade+scaleIn | fade+scaleOut | 300ms | ease-out | ✅ |
| global-app-update | fade+scaleIn | fade+scaleOut | 300ms | ease-out | ✅ |
| global-error-boundary | fade+scaleIn | fade+scaleOut | 300ms ✅ | ease-out | ✅ |

### backdrop
| overlay | color | dismissible | 是否符合规格 |
|---------|-------|:-----------:|:-----------:|
| global-offline-banner | none | N/A | ✅ |
| global-session-expired | rgba(0,0,0,0.5) | false | ✅ |
| global-app-update | rgba(0,0,0,0.5) | true | ✅ |
| global-error-boundary | rgba(0,0,0,0.5) | false | ✅（已修） |

### safe-area 适配
| overlay | safe-area-top | safe-area-bottom | 是否符合 |
|---------|:-------------:|:----------------:|:-------:|
| global-offline-banner | ✅ | N/A | ✅ |
| global-session-expired | N/A | N/A | ✅ |
| global-app-update | N/A | N/A | ✅ |
| global-error-boundary | N/A | N/A | ✅ |

### 内部按钮风格统一
| overlay | 内 CTA 按钮 | size | bg | 是否与全局 atom 一致 |
|---------|------------|------|----|:--------------------:|
| global-session-expired | 重新登录 | 100%×48 | primary | ✅ |
| global-app-update | 立即更新 | 100%×48 | primary | ✅ |
| global-app-update | 稍后 | 100%×40 | secondary | ⚠️ height 40 与全局 48 不一 |
| global-error-boundary | 重启 | 100%×48 | primary | ✅ |

→ "稍后"按钮 40px 是有意为之（次要操作弱化）→ 在 md 论证保留

### 内部素材风格统一
| overlay | 素材 | kind | 风格 4 维度 | 是否一致 |
|---------|------|------|------------|:-------:|
| global-offline-banner | WifiOffIcon | icon | 简洁/几何/平面/规整 | ✅（icon 与其他 illustration 风格不同是合理）|
| global-session-expired | LockIcon | illustration | 中/有机/微立体/略随意 | ✅ |
| global-app-update | UpdateIllustration | illustration | 中/有机/微立体/略随意 | ✅ |
| global-error-boundary | ErrorIllustration | illustration | 中/有机/微立体/略随意 | ✅ |

## 2. 跨屏并存场景核查

模拟用户在不同屏看到 overlay 的场景：

### 场景 1：登录页 + offline-banner 并存
- 登录页主调温暖（暖白底 + 粉色装饰）
- offline-banner 用橙色 warning → 与温暖主调协调 ✅
- banner 在最顶部不抢登录卡焦点 ✅

### 场景 2：首页 + session-expired Modal 并存
- 首页 list 内容 + 顶部 nav-bar
- Modal 出现时 backdrop 0.5 暗化首页 → 焦点转移 Modal ✅
- Modal 圆角 + 阴影与首页卡片风格一致 ✅

### 场景 3：error-boundary 在任意屏触发
- 全屏遮罩 → 用户完全聚焦错误 ✅
- 重启按钮明显 → 用户有出路 ✅

[更多场景...]

## 3. 视觉权重核查

```
project.meta.designSystem.globalOverlayBudget = {
  totalWeight: 18,
  byOverlay: {
    "global-offline-banner": 3,
    "global-session-expired": 6,
    "global-app-update": 4,
    "global-error-boundary": 5
  }
}
```

跨屏并存场景下，这些权重叠加在屏的总权重上。最坏情况：
- 03-home (28) + offline-banner (3) + session-expired Modal (6) = 37
- → 极端但可接受（Modal 出现时本来就压制屏内容）

## 4. 不一致项 + 修复

### 修复历史（如有）
- ErrorBoundary backdrop 0.7 → 0.5（已在 D-audit 阶段修）
- ErrorBoundary 出入 250ms → 300ms（已在 D-audit 阶段修）

### 本任务发现的新问题
- [ ] 无
- [ ] ___________

## 5. ★ 沉淀到 schema 的结论

```jsonc
// 修复操作 MCP 调用清单（如有）
[...]

// audit 结论写入 project meta
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      globalOverlayAuditPassed: true,
      auditedAt: "<ISO>",
      notes: "全部 4 overlay 出入动画 / backdrop / safe-area / 内部按钮 / 素材风格统一通过"
    }
  }
}
```

⚠️ **后续任务约束**：
- 本任务通过 = 全局 overlays 设计完成，可移交 executor
- executor 阶段按 renderHint 实施 overlay 内素材
```
