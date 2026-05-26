---
name: theme-generator
description: 根据用户的风格描述，运用色彩科学（HSL 色轮关系、APCA 对比度、modular scale）生成完整的 Design Token 配置。当用户要求"制定主题风格"、"生成设计规范"、"设置项目配色"、"换一套主题"时触发。
---

# 主题风格生成 Skill（theme-generator）

根据用户的自然语言风格描述，科学地计算并生成一套完整的项目 Design Token 配置。

## 触发场景

- 用户说"制定一套主题风格"
- 用户说"项目配色改成暗色科技风"
- 用户说"生成设计规范/Token"
- 用户说"参考 Linear 的风格"
- 用户说"主色换成紫色"（局部修改也可触发）

---

## 工作流

### Phase 1: 理解意图

1. 从用户描述中提取结构化信息：
   - `summary`: 一句话概括风格
   - `aesthetics`: 风格标签（glassmorphism/gradient/luxury/minimal...）
   - `decoration`: 装饰密度（minimal/moderate/rich）
   - `colorTemperature`: 色温（warm/neutral/cool）
   - `brightness`: 明暗（light/dark/both）
   - `seedColors`: 用户提供的种子色（如果有）
   - `references`: 参考品牌（如果有）

2. 如果信息不完整，合理假设并在输出中注明。

### Phase 2: 色彩计算

**从种子色出发，用色彩科学推导完整色板。**

#### 2.1 确定种子色

- 用户明确给了颜色 → 直接使用
- 用户给了方向（如"电光蓝"、"翡翠绿"）→ 选择代表性 hex
- 用户没给 → 根据 aesthetics 标签和 references 推断合理主色

#### 2.2 推导语义色板（HSL 色轮）

```
primary     = seedColor
secondary   = HSL(H + 150°, S × 0.9, L)         // 分裂互补
success     = HSL(145, 65%, 适配亮度)             // 绿色系固定
warning     = HSL(38, 92%, 适配亮度)              // 橙色系固定
error       = HSL(0, 72%, 适配亮度)               // 红色系固定
info        = HSL(210, 70%, 适配亮度)             // 蓝色系
```

#### 2.3 推导表面色/文字色

**暗色模式：**
```
background      = HSL(primaryH, 25%, 8%)
surface         = HSL(primaryH, 20%, 12%)
surfaceElevated = HSL(primaryH, 18%, 16%)
textPrimary     = HSL(0, 0%, 97%)
textSecondary   = HSL(primaryH, 10%, 65%)
textTertiary    = HSL(primaryH, 8%, 45%)
```

**亮色模式：**
```
background      = #ffffff
surface         = #ffffff 或 HSL(primaryH, 5%, 97%)
surfaceElevated = #ffffff
textPrimary     = rgba(0, 0, 0, 0.88)
textSecondary   = rgba(0, 0, 0, 0.65)
textTertiary    = rgba(0, 0, 0, 0.45)
```

#### 2.4 APCA 对比度验证

每组 text/background 配对必须满足：
- textPrimary on background: Lc ≥ 75（推荐 ≥ 90）
- textSecondary on surface: Lc ≥ 60
- primary on background: Lc ≥ 45（大文字/图标可降至 30）

如果不满足 → 调整明度直到满足。

#### 2.5 状态色推导

```
primaryHover  = 亮度 +6%
primaryActive = 亮度 -8%
primaryLight  = 暗色模式下 亮度 20% / 亮色模式下 亮度 95%
```

### Phase 3: 间距/字体/圆角/阴影计算

#### 3.1 间距（8px 网格）

```
2xs = 2px, xs = 4px, sm = 8px, md = 16px, lg = 24px, xl = 32px, 2xl = 48px, 3xl = 64px
```

#### 3.2 字体（modular scale 1.25 — major third）

```
base = 14px
caption = 12px (base / 1.17)
body = 14px
body-lg = 16px (base × 1.14)
h5 = 18px (base × 1.25^1)
h4 = 20px (base × 1.25^1.5)
h3 = 24px (base × 1.25^2.3)
h2 = 28px (base × 1.25^2.8)
h1 = 36px (base × 1.25^3.5)
display = 48px (base × 1.25^4.5)
```

行高规则：字号越大行高越紧
- display/h1: 1.1-1.2
- h2-h4: 1.2-1.3
- h5/body-lg: 1.4
- body: 1.5
- caption: 1.4

#### 3.3 圆角

根据 `decorationRules.cornerStyle`：
- sharp: none=0, sm=2, md=4, lg=6, xl=8, full=9999
- rounded: none=0, sm=4, md=8, lg=12, xl=16, full=9999
- pill: none=0, sm=8, md=16, lg=24, xl=32, full=9999

#### 3.4 阴影

**亮色模式：**
```
sm: 0 2px 4px rgba(0,0,0,0.06)
md: 0 4px 12px rgba(0,0,0,0.08)
lg: 0 8px 24px rgba(0,0,0,0.12)
xl: 0 12px 48px rgba(0,0,0,0.16)
```

**暗色模式（加深）：**
```
sm: 0 2px 4px rgba(0,0,0,0.3)
md: 0 4px 12px rgba(0,0,0,0.4)
lg: 0 8px 24px rgba(0,0,0,0.5)
xl: 0 12px 48px rgba(0,0,0,0.6)
```

**发光风格（glow，用于 luxury/futuristic）：**
```
sm: 0 0 8px rgba(primaryR, primaryG, primaryB, 0.15)
md: 0 0 16px rgba(primaryR, primaryG, primaryB, 0.2)
lg: 0 0 32px rgba(primaryR, primaryG, primaryB, 0.25)
```

### Phase 4: 装饰规则推导

根据 aesthetics 标签自动推导 `decorationRules`：

| 标签 | background | border | shadow | motion | corner |
|------|-----------|--------|--------|--------|--------|
| glassmorphism | glassmorphism(blur:12,op:0.1) | subtle(1px,white 0.2) | glow | smooth | rounded |
| minimal | solid | none 或 subtle | soft | minimal | rounded |
| luxury | gradient(135deg) | accent(1px,gold) | glow | smooth | rounded |
| brutalist | solid(高对比) | accent(2-3px,black) | hard | minimal | sharp |
| organic | gradient(柔和) | none | soft | spring | pill |
| futuristic | gradient(mesh) | glow(neon) | glow | dramatic | rounded |
| flat | solid | subtle | none | smooth | rounded |

### Phase 5: 组件状态规范推导

根据整体风格设定 `stateSpec`：

| 风格 | hover scale | hover lightness | shadow change | focus ring |
|------|------------|-----------------|---------------|-----------|
| minimal | 1.0 | +6% | same | 2px primary |
| luxury | 1.02 | +4% | up + glow | 2px primary |
| brutalist | 1.0 | +0%(换色) | same | 3px black |
| playful | 1.05 | +8% | up | 2px primary + animated |

### Phase 5b: 图标规格推导（IconSpec）

根据 aesthetics 标签和装饰密度推导 `iconSpec`：

| 风格 | style | strokeWidth | linecap | linejoin | cornerRadius | complexity | geometric |
|------|-------|-------------|---------|----------|-------------|-----------|-----------|
| minimal/flat | outline | 1.5 | round | round | 0 | simple | true |
| glassmorphism | outline | 1.5 | round | round | 1 | medium | false |
| luxury | solid | — | — | — | — | medium | false |
| futuristic | outline | 1.5 | butt | miter | 0 | medium | true |
| organic/hand-drawn | outline | 2.0 | round | round | 2 | detailed | false |
| brutalist | glyph | 2.5 | square | miter | 0 | simple | true |
| playful | duotone | 1.5 | round | round | 1 | medium | false |
| corporate | outline | 1.5 | round | round | 0 | simple | true |

**颜色推导**：
```
colors.default   = $token:textSecondary（大多数风格）
colors.active    = $token:primary
colors.inactive  = $token:textTertiary
colors.secondary = $token:primaryLight（duotone 模式的填充层）

特殊情况：
- luxury → colors.default 可用 $token:primary（金色图标）
- futuristic → colors.default 可用 primary 的低透明度版本
- colorful → palette 取 [primary, secondary, success, warning, info]
```

**尺寸推导**：
```
containerRatio:
  - simple 图标 → 0.50（留更多呼吸空间）
  - medium 图标 → 0.55
  - detailed 图标 → 0.60（需要更多绘制空间）

minPadding:
  - 小图标(≤24px) → 4px
  - 中图标(24~48px) → 6px
  - 大图标(>48px) → 8px
```

**状态变体推导**：
```
inactive: { opacity: 0.5~0.6, color: textTertiary }
active:   { opacity: 1.0, strokeWidth: +0.3(outline), color: primary }
hover:    { opacity: 0.8~0.9 }
disabled: { opacity: 0.3, grayscale: brightness==='dark' ? false : true }
```

### Phase 6: 输出

调用 MCP 工具 `theme/update`，传入完整的 ThemeConfig JSON：

```
theme/update {
  projectId: "<当前项目 ID>",
  themeConfig: {
    intent: { ... },
    tokens: { colors: {...}, spacing: {...}, radius: {...}, typography: {...}, shadows: {...}, transitions: {...} },
    themes: [{ id: "default", ... }, { id: "dark", ... }],
    activeThemeId: "default",
    decorationRules: { ... },
    iconSpec: { style, stroke: {...}, colors: {...}, sizing: {...}, variants: {...}, consistency: {...} },
    stateSpec: { ... }
  }
}
```

---

## 关键约束

1. **颜色必须科学**：不靠感觉选色，用 HSL 色轮关系推导
2. **对比度必须达标**：APCA Lc ≥ 60 for text on background
3. **间距必须基于网格**：所有值是 4px 的倍数
4. **字体必须有比例**：不随意选字号，用 modular scale
5. **输出必须完整**：10 个维度全部覆盖，不留空
6. **两套主题**：至少生成 base + 一个暗色/亮色变体（根据用户 brightness 选择）

---

## 输入不足时的处理

| 缺失信息 | 默认策略 |
|---------|---------|
| 没给颜色 | 根据关键词推断（"科技"→蓝紫，"自然"→绿，"轻奢"→金） |
| 没给明暗 | 默认 both（生成 light + dark 两套） |
| 没给装饰密度 | 默认 moderate |
| 没给字体 | 使用系统字体栈 `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| 没给间距网格 | 默认 8px |

---

## 不做的事情

- ❌ 不直接操作页面元素（那是 design-from-reference 的职责）
- ❌ 不生成组件（那是资产系统的职责）
- ❌ 不修改已有页面的样式（生成 Token 后由用户/AI 在设计时引用）
- ✅ 只负责生成/修改 ThemeConfig 配置
