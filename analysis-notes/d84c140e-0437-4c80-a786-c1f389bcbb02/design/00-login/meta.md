> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-meta
> 对应 schema 字段：screen.meta.design.{summary, palette, layers, componentBudgets, ref} + 各重要节点 meta.design + screen.meta.status.phase=designed

# D-00-login-meta — meta.design 叙事落库

## 1. 屏级 meta.design 汇总（已分散落库，本任务做收尾整合 + palette 补充）

| 字段 | 来源任务 | 已写 |
|------|---------|:---:|
| summary | D-emotion | ✅ "暖白底 + 蓝紫单色强调 + 12px 圆角软化 + 卡片承载表单 + 极简装饰 + 留白呼吸" |
| layers | D-hierarchy | ✅ 4 层归类（前景空 / 中景高=FormCard+Footer+Locked / 中景低=HeaderArea+Brand / 背景=BgBlobTopRight） |
| componentBudgets | D-budget + D-decorations | ✅ 12 项 sum=30 主角=2 |
| palette | **本任务** | ⏳ 补 |
| ref | 可选 | — 不写 |

## 2. palette 补充（本屏用到的 token 名）

```jsonc
palette: [
  // 主色系
  "colors.primary",          // CTA / focus / 链接 / checkbox checked / loading 倒计时 / 锁定 forgot 链接边框
  "colors.primaryHover",     // 按钮 hover 提亮
  "colors.primaryActive",    // 按钮 pressed 加深
  "colors.primaryLight",     // BgBlobTopRight 光晕 / focus ring 光晕底 / GetCodeBtn hover bg / LockedForgotLink hover bg
  // 文字
  "colors.textPrimary",      // 输入框文字 / LockedTitle
  "colors.textSecondary",    // BrandSlogan / Field-label / FooterLinks / LockedHint / PolicyText
  "colors.textTertiary",     // PasswordToggleEye default / GetCodeBtn counting/disabled
  "colors.textInverse",      // SubmitBtn 反白
  // 背景 / 表面
  "colors.background",       // 屏底 #FCFCFD 暖白
  "colors.surfaceElevated",  // FormCard / LockedView / Input bg #FFFFFF
  "colors.surface",          // Input disabled bg
  // 边框
  "colors.border",           // Input default border
  "colors.borderLight",      // ModeToggle borderBottom
  "colors.gray100",          // PasswordToggleEye hover bg
  "colors.gray300",          // Input hover border
  "colors.gray400",          // SubmitBtn disabled bg
  // 状态色
  "colors.error",            // PhoneError / CredentialError / Input.error 状态
  "colors.warning",          // LockedIcon 容器圆 + 锁形描边
  // 排版
  "typography.body",         // 14px 主正文（labels / hint / footer）
  "typography.body-lg",      // 16px input + SubmitBtn
  "typography.caption",      // 12px error / footer / GetCodeBtn / PolicyText
  "typography.h4",           // 20px LockedTitle
  "typography.display",      // 48px LockedCountdown 倒计时大字
  // 间距 / 形 / 影 / 动
  "spacing.2xs",             // 2 - error 节点 marginTop
  "spacing.xs",              // 4 - 按钮内 gap / label-input 间距
  "spacing.sm",              // 8 - card 内字段间距 / FooterLinks 间距
  "spacing.md",              // 16 - FormCard 内 gap
  "spacing.lg",              // 24 - 屏 padding / Card padding / SubmitBtn padding
  "spacing.xl",              // 32 - HeaderArea→FormCard→FooterLinks 区段间距
  "spacing.2xl",             // 48 - safe-area 顶部 + LockedView 内 padding
  "radius.sm",               // 4 - GetCodeBtn / PasswordToggleEye / PolicyCheckbox
  "radius.md",               // 8 - Input
  "radius.lg",               // 12 - SubmitBtn / LockedForgotLink (决策 D-S1)
  "radius.xl",               // 16 - FormCard / LockedView / BrandLogo
  "radius.full",             // 9999 - BgBlobTopRight / SubmitSpinner
  "shadows.sm",              // FormCard / LockedView / SubmitBtn default
  "shadows.md",              // SubmitBtn hover
  "transitions.fast",        // Input / link / 普通 hover
  "transitions.normal"       // SubmitBtn 默认
]
```

palette 共 ~38 个 token 引用，覆盖本屏全部视觉决策来源。

## 3. 节点级 meta.design（关键 6 个节点的叙事）

按 visualSpec 高 weight 优先：

### 3.1 SubmitBtn (weight 8 主角-CTA)

```jsonc
meta.design = {
  summary: "登录页主 CTA 全宽蓝紫药丸按钮（48 高 + 12px 圆角 + 主色填充 + spring 过渡）",
  rationale: "对照 budget weight=8 主角-CTA + allowedTools=[主色填充/spring/focus 光晕/loading spinner] + emotion'可信简洁'。borderRadius=12（决策 D-S1）而非药丸 full——克制圆润，与 minimal+flat 1:1 对齐；不上外发光阴影（与 flat 冲突）；6 态完备（default/hover/pressed/focus/disabled/loading）+ disabledEvents 守卫防重复点击。loading 态用 childrenVisibility 显 SubmitSpinner（上游 condition 已守 submitting=true）。",
  visualSpec: { weight: "Strong", zIndex: 2, role: "主角-CTA" }
}
```

### 3.2 BrandLogo (weight 5 主角-品牌)

已在 D-materials 任务写完（含 materialSpec）。本任务补 visualSpec 一致性确认。

### 3.3 FormCard (weight 4 配角-容器)

```jsonc
meta.design = {
  summary: "白色卡片 16 圆角 + sm 弱阴影 + 24 padding 承载表单字段",
  rationale: "对照 budget weight=4 配角-容器 + allowedTools=[圆角/弱阴影]（v3 削减'边框'避免双重描边）。borderRadius=16 比 SubmitBtn 12 大一档强化'卡片'语义；shadows.sm 而非 md/lg 因 theme 是 minimal+flat soft 阴影策略；内部 gap=16 让字段呼吸不挤；zIndex=2 中景高承载主交互。",
  visualSpec: { weight: "Medium", zIndex: 2, role: "配角-容器" }
}
```

### 3.4 BgBlobTopRight (weight 2 氛围-装饰)

已在 D-decorations 任务完整写入。

### 3.5 LockedView (互斥分支 / 边界路径主容器)

```jsonc
meta.design = {
  summary: "锁定态独立卡片视图（48 上下 padding + 居中竖排 + LockedIcon/Title/倒计时/Hint/Forgot 出口）",
  rationale: "失败 ≥5 次后呈现的边界态视图，与 NormalFormView 互斥（visibleWhen 由 interaction 阶段写）。视觉密度比 NormalFormView 低（19 weight vs 30）——锁定态用户已挫败，过密信息会加重负面情绪。LockedIcon (weight 5) + LockedCountdown (weight 6) 形成 2 个主角焦点，引导用户从'我被锁了'→'还需等多久'→'去重置密码'的情绪通道。",
  visualSpec: { weight: "Medium", zIndex: 2, role: "配角-容器（边界态）" }
}
```

### 3.6 LockedCountdown (weight 6 主角-内容 / 边界路径)

```jsonc
meta.design = {
  summary: "锁定倒计时大字 display(48px) monospace primary 色等宽数字",
  rationale: "锁定态主角焦点之一——用户最关心'还要等多久'。fontSize=display 48px 视觉权重最高；monospace 等宽防数字跳动（30:00→29:59 时其他字符不偏移）；color=primary 而非 textPrimary——把'倒计时'与'品牌'连接（暗示'品牌还在等你回来'），化解锁定态的负面情绪。",
  visualSpec: { weight: "Strong", zIndex: 2, role: "主角-内容" }
}
```

## 4. 屏 meta.status.phase 推进

完成所有 styles + visualStates + materialSpec + meta.design 后，标 phase="designed"：

```jsonc
screen.meta.status = {
  phase: "designed",
  ready: {
    structure: true,      // product/interaction 已建，design 仅追加 1 个装饰节点
    styles: true,         // 33 业务节点 + 1 装饰节点全量 styles 落库
    events: true,         // interaction 阶段已写
    visualStates: true,   // 11 交互节点共 47 个 visualState 落库
    materials: true       // 4 个 materialSpec 落库 (BgBlob/Brand/LockedIcon/SubmitSpinner)
  }
}
```

## 5. ★ 沉淀到 schema 的结论

```jsonc
// MCP step 1: 屏级补 palette
meta/set_screen {
  projectId, screenId,
  patch: { design: { palette: [...§2 全部 token...] } }
}

// MCP step 2: SubmitBtn meta.design
meta/set_node {
  projectId, nodeId: "nd_5a15fd87f060436295b4f",
  patch: { design: { ...§3.1 } }
}
// step 3: FormCard
meta/set_node {
  projectId, nodeId: "nd_e60fb832933f4b86a6638",
  patch: { design: { ...§3.3 } }
}
// step 4: LockedView
meta/set_node {
  projectId, nodeId: "nd_aa8a0633ce354664a8d1a",
  patch: { design: { ...§3.5 } }
}
// step 5: LockedCountdown
meta/set_node {
  projectId, nodeId: "nd_e3c2865fa1b04412936ea",
  patch: { design: { ...§3.6 } }
}

// MCP step 6: 屏 phase
meta/set_screen {
  projectId, screenId,
  patch: { status: { phase: "designed", ready: { structure:true, styles:true, events:true, visualStates:true, materials:true } } }
}
```

**自检**：
- ✅ summary ≤ 60 字（D-emotion 已写 36 字）
- ✅ palette 用 token 名而非硬编码
- ✅ layers 4 层归类（已 D-hierarchy 写入）
- ✅ componentBudgets 总 weight 30 / 主角 2（已 D-budget 写入）
- ✅ 关键节点（SubmitBtn / FormCard / LockedView / LockedCountdown）有 visualSpec
- ✅ phase 推到 designed 时所有 ready 字段都 true（避免 R-PHASE-01）
