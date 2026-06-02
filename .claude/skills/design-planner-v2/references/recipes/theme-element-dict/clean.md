# 主题→元素词典：clean（清爽主题）

> 适用 theme.intent：clean / data-focused / utility
>
> **核心**：纯白 + 单色蓝 + 直角理性 + 信息密度高。常用于数据看板 / 工具类 app / 后台。
>
> 与 minimal 的区别：clean 信息密度更高 / 装饰更少（可全无）/ 字号更紧凑。

---

## 1. 主题灵魂

- 色板：纯白 / 浅灰 + 蓝（不要紫不要暖）
- 形状：直角理性（圆角 0-4px）
- 装饰：geometric-line 或全无
- 字号紧凑（梯度小）
- 等宽数字

---

## 2. 元素表达词典

### 2.1 button (主 CTA)

```jsonc
{
  backgroundColor: "$token:colors.primary",          // 纯蓝（如 #2563EB）
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.sm",                  // 4（微圆角）
  height: "40px",                                    // 紧凑
  fontSize: "$token:typography.body.fontSize",       // 14
  fontWeight: "500",
  padding: "0 $token:spacing.md",
  border: "none",
  boxShadow: "none",
  transition: "$token:transitions.fast.value"
}
// hover: backgroundColor primaryHover
// pressed: backgroundColor primaryActive
// focus: 1px outline primary + offset 1px
```

### 2.2 input

```jsonc
{
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.sm",                  // 4
  height: "40px",                                    // 紧凑
  padding: "0 $token:spacing.sm",
  fontSize: "$token:typography.body.fontSize",       // 14（注意：clean 工具型，桌面端 14 OK）
  backgroundColor: "$token:colors.surfaceElevated",
  fontFamily: "monospace"                            // 等宽（如填数据）
  // focus: borderColor primary + boxShadow "0 0 0 1px primary"（细线光晕）
}
```

### 2.3 card / Panel

```jsonc
{
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.sm",                  // 4 极微圆
  padding: "$token:spacing.md",                      // 16（紧凑）
  border: "1px solid $token:colors.borderLight",
  boxShadow: "none"                                  // 工具类不要阴影
}
```

### 2.4 checkbox

```jsonc
PolicyCheckVisual: {
  width: "16px",
  height: "16px",
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.sm",                  // 2（极微圆）
  // checked: bg primary + 勾
  // focus: 1px outline
}
```

### 2.5 tab

```jsonc
TabBtn.default: { color: "$token:colors.textSecondary", fontWeight: "500" }
TabBtn.active:  { color: "$token:colors.textPrimary", fontWeight: "500" }   // 不加粗
TabIndicator:   { height: "2px", bg: "$token:colors.primary", borderRadius: "0" }
```

### 2.6 表格 / List item

```jsonc
{
  borderBottom: "1px solid $token:colors.borderLight",
  padding: "$token:spacing.sm $token:spacing.md",
  fontSize: "$token:typography.body.fontSize",       // 14
  fontFamily: "monospace"                            // 数字等宽
}
// hover: backgroundColor gray100（极淡灰）
// selected: backgroundColor primaryLight
```

### 2.7 字号节奏

```
display 24 → h2 18 → h4 16 → body 14 → caption 12（紧凑）
字重：400 / 500（极克制，不用 600+）
fontFamily：标题 Sans，数字 Mono
```

### 2.8 装饰

```
装饰系统：geometric-line 或 0 装饰
密度：极少（0 处常见）
```

### 2.9 间距策略

```
紧凑：
  field 间 8
  区块间 16
  card padding 16
  screen padding 16-24
  table cell padding 8 16
```

---

## 3. 不要做的事（clean anti-pattern）

- ❌ 大圆角（≥ 8，太"温暖"）
- ❌ 强阴影 / 浮起 transform（数据工具不要装饰）
- ❌ spring 动效
- ❌ 多色装饰
- ❌ 字重 700
- ❌ 大字号（display > 28）
- ❌ 渐变 / 光斑
- ❌ 大留白（数据密度需要紧凑）

---

## 4. 自检

- [ ] 纯白 / 浅灰底 + 单色蓝强调
- [ ] 圆角梯度极小（卡 4 / 按钮 4 / input 4）
- [ ] 字号紧凑梯度（4 级以内）
- [ ] 等宽数字（如有数据）
- [ ] 装饰极少或无
- [ ] 紧凑间距
