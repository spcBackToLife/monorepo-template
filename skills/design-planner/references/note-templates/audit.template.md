# 模板：D-audit（跨屏一致性 audit）★

> 拷贝本骨架到 `analysis-notes/<projectId>/design/system/audit.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-audit
> 对应 schema 字段：核对类，发现问题立刻 batch_update 修

## 1. 维度 1：通用组件样式跨屏对照

### 按钮（Button）
| 屏 | 节点 | size | bg | radius | shadow | hover 行为 |
|----|------|------|----|--------|--------|------------|
| 00-login | SubmitBtn | 100%×48 | primary | full | sm | translateY(-1) + shadow:md |
| 01-register | RegisterBtn | 100%×48 | primary | full | sm | translateY(-1) + shadow:md ✅ |
| 02-forgot | ConfirmBtn | 100%×44 ❌ | primary | full | sm | translateY(-1) + shadow:md |
| 03-home | CreateBtn | auto×40 | primary | full | sm | translateY(-2) ❌ + shadow:md |

→ 不一致项：
- P0: 02-forgot 高度 44px ≠ 全局 48px
- P1: 03-home hover 抬升 -2px ≠ 全局 -1px

### 输入框（Input）
| 屏 | 节点 | h | borderColor | radius | focus 行为 |
|----|------|---|-------------|--------|-----------|
| ... |

### 卡片（Card）
| ... |

### 链接（Link）
| ... |

### Toast 4 套
| ... |

## 2. 维度 2：视觉密度均衡

| 屏 | 总权重 | 主角数 | 工具角色总 | 装饰总 |
|----|:------:|:------:|:----------:|:------:|
| 00-login | 30 | 2 | 11 | 3 |
| 01-register | 28 | 2 | 10 | 3 |
| 02-forgot | 22 | 1 | 8 | 2 |
| 03-home | 28 | 2 | 12 | 3 |
| 04-settings | 18 | 0 ⚠️ | 14 | 1 |

→ 04-settings 没有主角 → 太"工具型"（设置页特性，可接受）
→ 02-forgot 比 00-login 低 8 → 在 OK 范围（≤ 10 差距）
→ 整体均衡 ✅

## 3. 维度 3：Token 引用率（详见 D-token-coverage）

整体引用率：___%
各屏明细：
- 00-login: 98%
- 01-register: 97%
- ...

硬编码点列表：
- ___________

## 4. 维度 4：模板抽取覆盖

| Molecule/Organism | 跨屏出现 | 是否抽模板 | detached 比例 |
|-------------------|:--------:|:----------:|:-------------:|
| PhoneInput | 4 | ✅ | 0% |
| FormCard | 3 | ✅ | 0% |
| BrandLogo | 6 | ✅ | 17% (1/6) |
| ModeToggle | 2 | ✅ | 0% |
| EmptyState | 5（每个独立）| ❌（结构差异大）| N/A |

→ BrandLogo 在 00-login 屏被 detach，原因：登录页用的是大尺寸版 → 检查是否 propDefinitions 加 size variant 即可，避免 detach。

## 5. 维度 5：全局 overlays 视觉规格统一

| overlay | 类型 | 出入动画 | duration | easing | backdrop |
|---------|------|----------|----------|--------|----------|
| OfflineBanner | banner | slideDown+fade | 200ms | ease-out | none |
| SessionExpired | modal | fade+scaleIn | 300ms | ease-out | rgba(0,0,0,0.5) |
| AppUpdate | modal | fade+scaleIn | 300ms | ease-out | rgba(0,0,0,0.5) ✅ |
| ErrorBoundary | custom | fade | 250ms ❌ | ease-out | rgba(0,0,0,0.7) ❌ |

→ ErrorBoundary 时长和 backdrop 透明度漂了 → 必须统一到 fade+scaleIn 300ms + rgba(0,0,0,0.5)。

## 6. 不一致项清单（按优先级）

### P0（必须立刻修）
- 02-forgot ConfirmBtn 高度 44 → 48
- ErrorBoundary overlay 出入动画统一到 fade+scaleIn 300ms
- ErrorBoundary backdrop 透明度统一到 0.5

### P1（影响视觉但不阻塞）
- 03-home CreateBtn hover -2 → -1
- BrandLogo 模板加 size variant 避免登录页 detach

### P2（主观偏好）
- ___________

## 7. 修复操作记录

```jsonc
// 修复 1：批量统一按钮高度
style/batch_update {
  projectId,
  updates: [
    { nodeId: "<02-forgot ConfirmBtn id>", styles: { height: "48px" } }
  ]
}

// 修复 2：批量统一 hover 抬升
style/batch_update {
  projectId,
  updates: [
    { nodeId: "<03-home CreateBtn id>", states: [{ name: "hover", styles: { transform: "translateY(-1px)" } }] }
  ]
  // 注：visualState 不能用 batch_update style，要 visual_state/update
}

visual_state/update {
  projectId, nodeId: "<03-home CreateBtn>", name: "hover",
  patch: { styles: { transform: "translateY(-1px)" } }
}

// 修复 3：修 ErrorBoundary 出入动画
[meta/set_project 或 element/update 改 globalOverlays.find(...).rootNode.animation]

// 修复 4：扩展 BrandLogo 模板加 size variant
asset/update_template {
  projectId, templateId: "tpl_brandLogo",
  patch: {
    propDefinitions: [
      ...原 props,
      { name: "size", type: "'sm'|'md'|'lg'", default: "md" }
    ]
  }
}
// 然后把 00-login 的 detached 实例重新 attach
asset/sync_instance { projectId, instanceId: "<00-login BrandLogo id>" }
```

## 8. 修复后再核对

[再跑维度 1-5 → 全部 ✅]

## 9. ★ 沉淀到 schema 的结论

```jsonc
// 修复操作 MCP 调用清单（见 §7）

// audit 结论写入项目级 meta（B 类信息）
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      auditPassed: true,
      auditedAt: "<ISO 时间>",
      P0Fixed: 3,
      P1Fixed: 2,
      P2Pending: 1,
      notes: "ErrorBoundary 出入动画统一 / BrandLogo 模板扩展 size variant"
    }
  }
}
```

⚠️ **后续任务约束**：
- D-token-coverage：本任务通过后跑（确保不一致项不影响 token 引用率）
- D-handover：本任务 + token-coverage + integrity 全过 → 才能 handover
```
