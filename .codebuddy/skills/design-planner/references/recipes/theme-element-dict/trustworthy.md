# 主题→元素词典：trustworthy（信任主题）

> 适用 theme.intent：trustworthy / safe / reliable
>
> **核心**：克制 + 锚点 icon + 蓝色调 + 大留白。让用户感受"这是正经的工具，不会乱用我的信息"。
>
> 与 `recipes/visual-effects/trust.md` 配套使用。

---

## 1. 主题灵魂

- 色板偏冷蓝紫（不要橙红粉）
- 装饰极简或无（≤ 1 处极淡）
- 大留白 + 紧凑表单
- 字段必有锚点 icon（增强专业感）
- CTA 用纯色填充（不要渐变 / 不要 spring）

---

## 2. 元素表达词典

### 2.1 button (主 CTA)

```jsonc
{
  backgroundColor: "$token:colors.primary",          // 蓝紫纯色（不渐变）
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.lg",                  // 12（柔化"硬"感）
  height: "48px",                                    // 偏大（用户安心点）
  fontSize: "$token:typography.body-lg.fontSize",    // 16
  fontWeight: "600",
  letterSpacing: "0.02em",
  boxShadow: "$token:shadows.sm",                    // 弱阴影（不要 lg 浮夸）
  transition: "$token:transitions.normal.value"
}
// hover: backgroundColor primaryHover + boxShadow md（轻浮出，不要 translateY）
// pressed: backgroundColor primaryActive
// focus: 多重阴影（subtle 光晕 + 阴影）"0 0 0 3px primaryLight, $token:shadows.md"
// disabled: opacity 0.5
// loading: childrenVisibility spinner 显 / text 隐
```

### 2.2 input

```jsonc
{
  // 字段前缀必有 icon（在父节点内）
  border: "1.5px solid $token:colors.border",        // 1.5px 比标准粗（专业感）
  borderRadius: "$token:radius.md",
  padding: "0 $token:spacing.md 0 $token:spacing.2xl", // 左侧 spacing.2xl 给 icon
  height: "48px",
  backgroundColor: "$token:colors.surfaceElevated",
  caretColor: "$token:colors.primary"
  // focus: borderColor primary + boxShadow "0 0 0 3px primaryLight"（光晕）
  // error: borderColor error + 软 errorLight 背景
}

// 父级 PhoneFieldWrapper（position relative）：
//   PhoneIcon（absolute left=spacing.md, color=textTertiary，线条 SVG）
//   PhoneInput（占位 spacing.2xl 给 icon）
```

### 2.3 card / FormCard

```jsonc
{
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.xl",                  // 16（柔化）
  padding: "$token:spacing.lg",                      // 24（呼吸）
  boxShadow: "$token:shadows.sm",                    // 弱阴影（不要 md+ 浮夸）
  border: "none"                                     // 不要双重描边
}
```

### 2.4 checkbox（wrapper-label 模式 + 重点强调）

```jsonc
PolicyCheckVisual: {
  width: "18px",
  height: "18px",
  border: "1.5px solid $token:colors.border",        // 1.5px 粗边（专业）
  borderRadius: "$token:radius.sm",
  // checked: bg primary + 边色 primary + ::after 勾
  // focus: 3px primaryLight 光晕
  // error: borderColor error（必填未勾时高亮）
}
```

### 2.5 tab / segment（信任场景）

```jsonc
TabBtn.default: { color: "$token:colors.textSecondary", fontWeight: "500" }
TabBtn.active:  { color: "$token:colors.textPrimary", fontWeight: "700" }
TabIndicator:   { height: "2px", bg: "$token:colors.primary", borderRadius: "1px" }
```

### 2.6 错误提示

```jsonc
{
  color: "$token:colors.error",                      // 暖珊瑚红 #E16A6A（不要纯红）
  fontSize: "$token:typography.caption.fontSize",
  marginTop: "$token:spacing.2xs"
}
```

### 2.7 装饰

```
装饰系统：极简或 soft-glow（极淡）
密度：极少（0-1 处）
不允许：插画 / 多色光斑 / 大渐变
```

---

## 3. 字段前缀 icon 规范

| 字段 | icon |
|---|---|
| 手机号 | phone（线条）|
| 邮箱 | mail（线条）|
| 密码 | lock（线条，封闭锁）|
| 验证码 | message / shield-check |
| 身份证 | id-card |
| 银行卡 | card |

icon 风格：
- 线条（不要填充）
- 单色：textTertiary（弱化，不抢字段）
- 尺寸：18-20px
- 调 material-painter 画 SVG，applyMaterialDesign 到节点

---

## 4. 装饰节点（如需）

```jsonc
BgBlobTopRight: {
  styles: {
    backgroundColor: "$token:colors.primaryLight",
    backgroundImage: "radial-gradient(circle, currentColor, transparent 70%)",
    color: "$token:colors.primaryLight",
    opacity: "0.3",                                  // ★ 信任场景调到极淡
    width: "180px", height: "180px",
    top: "-40px", right: "-40px"
  }
}
```

---

## 5. 不要做的事（trustworthy anti-pattern）

- ❌ CTA 用渐变填充（暗示营销）
- ❌ 字段无前缀 icon（缺锚点）
- ❌ 装饰用插画 / 多色 / 大光斑
- ❌ 错误用纯红 #FF0000（情绪太冲）
- ❌ 字段 borderRadius < 6（太硬）
- ❌ button 高度 < 44（用户难点）
- ❌ 字距 letterSpacing > 0.05em（"广告字距"）
- ❌ 大字号 display > 28
- ❌ 大圆角 ≥ 24（太"温暖"，不像工具）

---

## 6. 自检（D-X-craft-* 时）

- [ ] 主 CTA 是纯色填充（无渐变）
- [ ] input 有前缀 icon
- [ ] 错误色是 warm error #E16A6A 类
- [ ] 装饰 ≤ 1 处 + opacity ≤ 0.4
- [ ] 字号 / 字重梯度克制（无 700+ 重字）
- [ ] focus 有光晕（不只 borderColor 变化）
