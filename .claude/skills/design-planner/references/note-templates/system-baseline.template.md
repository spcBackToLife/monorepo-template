# 模板：D-system-baseline（设计系统基线）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/system/baseline.md`
> 项目级一次性任务——基于 theme 建立 Atom 规格统一基线。

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-system-baseline
> 对应 schema 字段：项目级，体现在每屏 D-X-styles 时引用统一规格

## 1. theme 拉取

```jsonc
theme/get { projectId } → ThemeConfig
```

记录关键 token：
- colors: primary / secondary / success / warning / error / info / textPrimary / textSecondary / bgPage / bgCard / borderDefault / borderLight / ...
- typography: caption / body / body-lg / h5 / h4 / h3 / h2 / h1 / display
- spacing: 2xs / xs / sm / md / lg / xl / 2xl / 3xl
- radii: none / sm / md / lg / xl / full
- shadows: sm / md / lg / xl
- durations: fast / normal / slow
- easings: ease / ease-out / ease-in / spring

## 2. 本项目用到的 Atom 类型清单

按下游屏的需求列：
- Button
- Input
- Link
- Tag
- Avatar
- Switch
- Checkbox
- Radio
- Icon-btn
- ...

## 3. 每种 Atom 的标准规格

### Button - primary（默认主按钮）
```jsonc
default: {
  width: "100%" | "auto",
  height: "48px",
  padding: "0 $token:spacing.lg",
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",
  fontSize: "$token:typography.body.fontSize",
  fontWeight: "$token:typography.body.fontWeight",  // 想要 semibold? 退回 theme-generator 打 "button" 预设
  borderRadius: "$token:radius.full",
  border: "none",
  boxShadow: "$token:shadows.sm",
  transition: "$token:transitions.normal",
  cursor: "pointer"
}

states:
  hover:    backgroundColor primaryHover + shadow:md + translateY(-1px)
  pressed:  backgroundColor primaryActive + shadow:xs + translateY(0)
  focus:    boxShadow 0 0 0 3px primaryLight
  disabled: backgroundColor gray400 + opacity 0.6 + cursor not-allowed
  loading:  childrenVisibility(spinner显, text隐)
```

### Button - secondary
```jsonc
default: {
  ...同 primary 但
  backgroundColor: "transparent",
  color: "$token:colors.primary",
  border: "1px solid $token:colors.primary"
}
states: ...类似
```

### Input - default
```jsonc
default: {
  width: "100%",
  height: "44px",
  padding: "$token:spacing.sm $token:spacing.md",
  border: "1px solid $token:colors.borderDefault",
  borderRadius: "$token:radius.md",
  fontSize: "$token:typography.body.fontSize",
  color: "$token:colors.textPrimary",
  backgroundColor: "$token:colors.bgCard",
  transition: "$token:transitions.fast",
  outline: "none"
}
states:
  hover:    borderColor borderStrong
  focus:    borderColor primary + boxShadow 0 0 0 3px primaryLight
  error:    borderColor error + bg rgba(error, 0.05)  (activeWhen)
  disabled: opacity 0.5 + cursor not-allowed
```

### Link - text
```jsonc
default: {
  color: "$token:colors.primary",
  textDecoration: "none",
  fontSize: "$token:typography.body.fontSize",
  cursor: "pointer",
  transition: "$token:transitions.fast"
}
states:
  hover:    color primaryHover + textDecoration underline
  disabled: color textTertiary + cursor not-allowed
```

[继续每种 Atom...]

## 4. 各屏 Atom 实例化要求

后续每屏 D-X-styles 任务**必须**引用本基线：
- 写按钮 → 引用本基线 Button-primary 规格
- 写输入框 → 引用本基线 Input-default
- 写链接 → 引用本基线 Link-text
- ...

如某屏需要特例（如某关键 CTA 比基线大）→ 在屏的 D-X-styles md 中**显式说明特例理由**。

## 5. 与 ThemeConfig 缺失项的处理

发现 theme 缺哪些 token？
- [ ] 无（全齐）
- [ ] 缺 ___________（如 colors.primaryActive, easings.spring）→ 退回 theme-generator 补

## 6. ★ 沉淀到 schema 的结论

本任务以 md 留痕为主，schema 直接产物有限：

```jsonc
// 可选：写入 project.meta.designSystem.baseline = {...}（B 类信息）
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      baseline: {
        Button: { /* 上面的规格摘要 */ },
        Input: { ... },
        ...
      },
      basedOnThemeId: "<active themeId>",
      writtenAt: "<ISO 时间>"
    }
  }
}
```

⚠️ **后续屏级任务约束**：
- D-X-styles 写按钮 / 输入框等 atom 节点时必须引用本基线
- D-templates 抽通用模板时基于本基线规格（避免漂移）
- D-audit 用本基线作"对照标准"判定跨屏一致性
```
