> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-strategy
> 对应 schema 字段：screen.meta.design.visualStrategy（v3 新增）
> 必读方法论：methodology/03-color.md + 04-typography.md + 05-shape.md + 06-decoration.md + 07-rhythm.md

---

# D-00-login-strategy — 视觉策略 (5 维)

## 0. 上游输入

| 来源 | 内容 |
|---|---|
| briefing.userMood | 好奇略防备 → 信任顺手 → 期待（克制温度风）|
| visualConcept.soulSentence | 像清晨教室的光，温暖但不打扰 |
| visualConcept.styleKeywords | 暖白米 / 大圆角柔和 / 单色光斑节制 |
| visualConcept.moodBoard | 晨光教室窗格 / 木桌笔记本 / 操场跑道 / 公告板便签 |
| theme.intent | minimal+flat / decoration=minimal / brightness=both / colorTemperature=neutral / seedColors=#5B6CFF |
| theme.tokens 全集 | 32 colors + 9 typography + 8 spacing + 6 radius + 4 shadows + 3 transitions（已 read） |

---

## 1. 色彩策略 (Color Strategy)

### 1.1 60-30-10 调色

| 占比 | token | 用途 | 实测面积 |
|:---:|---|---|---|
| **60** | `colors.background` (#FCFCFD 暖白米) | 整屏 backgroundColor + Root + 边距外的留白 | 屏外环 + 中间留白 ≈ 60% |
| **30** | `colors.surfaceElevated` (#FFFFFF) + `colors.textPrimary` (rgba(0,0,0,0.88)) + `colors.textSecondary` (0.80α) | FormCard 卡片底 + 主文字 + label / Tab inactive 文字 | FormCard + 输入区 + label ≈ 30% |
| **10** | `colors.primary` (#5B6CFF 蓝紫) + `colors.primaryLight` (#EBEDFA) | SubmitBtn 主用 + ModeToggle.active + TabIndicator + PolicyCheckVisual.checked + PhoneInput.focus + GetCodeBtn 字色 + RegisterLink/ForgotLink + 政策双链接 + BgBlobTopRight 装饰 | SubmitBtn 全宽×48 + 散点 ≤ 10% |

**60-30-10 实测分布**（ASCII 估算）：
```
┌─────── 60 暖白米 background (整片屏底) ───────┐
│                                              │
│   ┌── 30 surfaceElevated 卡片 ──────────┐   │
│   │  字段 label(textPrimary)              │   │
│   │  ┌── input(border + textPrimary) ─┐  │   │
│   │  │ 占位文字(textTertiary 0.45α)    │  │   │
│   │  └─────────────────────────────────┘  │   │
│   │                                        │   │
│   │  ┌── 10 SubmitBtn primary ──────────┐ │   │
│   │  │   登录 (textInverse #fff)        │ │   │
│   │  └──────────────────────────────────┘ │   │
│   └────────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────┘
```

### 1.2 强调色出现位置（10% 用法清单，≤ 6 处）

| 位置 | token | 视觉强度 |
|---|---|---|
| ① SubmitBtn.backgroundColor | primary | 主用，全宽×48 高 |
| ② ModeToggle 活动 tab 字色 + TabIndicator 底色 | primary | 中 |
| ③ PolicyCheckVisual.checked 填充 | primary | 弱（仅 16×16 小方块）|
| ④ PhoneInput / CredentialInput.focus 边色 + 光晕 | borderFocus（=primary）| 弱（仅聚焦时）|
| ⑤ 链接（RegisterLink / ForgotLink / 政策双链接 / GetCodeBtn 字）| primary | 弱（小字号）|
| ⑥ BgBlobTopRight 极淡光斑 | primaryLight @ alpha 0.6→transparent | 极弱（背景）|

**= 6 处**，正好不超量。

### 1.3 错误色 / 成功色 / 警告色 决策

| 语义 | token 决策 | 用途 |
|---|---|---|
| **error** | 维持 `colors.error` (#DD4747) ✅ | PhoneError / CredentialError / Toast error |
| warning | `colors.warning` (#FBBE2E) | LockedView 锁图标色 + LockedTitle |
| success | `colors.success` (#2DCC75) | 本屏不用 |

**ISSUE-6（错误色尖锐）决策**：

候选 A 维持 #DD4747（标准）/ 候选 B 字色加 alpha 0.85 软化 / 候选 C 走 UpstreamChallenge 加 errorSoft token。

✅ **选 A 维持** + 通过 **typography 弱化** 来缓和视觉冲击（caption 12px 字号 + 不加粗，加上紧靠输入框下方且只在 blur 后出现，不会暴力打回防备）。

**否决 B 否决 C 理由**：
- B：alpha 0.85 让红字看起来"褪色"，反而像系统 bug；color 是错误就是错误，软化色相比直接弱化字号字重更稳妥
- C：theme 阶段已稳定 + 增加 token 仅服务这一处微调成本不值；后续若多屏需要再 UpstreamChallenge

### 1.4 dark scheme 适配（v2 已配齐）

theme.colorSchemes.dark.overrides 已含 32 colors + 4 shadows，60-30-10 在 dark 下仍成立：
- 60% colors.background = #11131A（深黑底）
- 30% surfaceElevated #222633 + textPrimary 0.92α
- 10% primary #7B89FF（dark 下偏柔）

---

## 2. 字号节奏 (Typography Strategy)

### 2.1 字号梯度（克制·只用 5 档）

| token | px | 用途 | 节点 |
|---|:---:|---|---|
| `typography.h2.fontSize` | 28 | LockedTitle（"账号已被临时锁定"，错误态主语）| LockedTitle |
| `typography.h4.fontSize` | 20 | BrandSlogan「找到校园同好」（首屏品牌句）| BrandSlogan |
| `typography.body-lg.fontSize` | 16 | 输入框 fontSize（避免 iOS 自动缩放）+ SubmitBtn 字 + ModeToggle Tab | PhoneInput / CredentialInput / SubmitBtn / CodeModeBtn / PasswordModeBtn |
| `typography.body.fontSize` | 14 | label / 政策文案 / FooterLinks / GetCodeBtn 字 | PhoneLabel / CredentialLabel / PolicyText / RegisterLink / ForgotLink / GetCodeBtn |
| `typography.caption.fontSize` | 12 | error 提示 / LockedHint 副信息 | PhoneError / CredentialError / LockedHint |

**克制说明**：theme 给了 9 档（display 48 / h1 36 / h2 28 / h3 24 / h4 20 / h5 18 / body-lg 16 / body 14 / caption 12 / overline 10），登录页**只用 5 档**就够（28/20/16/14/12）——多档反而显得乱、不"清晨"。

display 48 / h1 36 / h3 24 / h5 18 / overline 10 留给主屏 / 详情页 / 营销页。

### 2.2 字重对比（克制·3 档）

| 用途 | weight | 节点 |
|---|:---:|---|
| 默认正文 / placeholder | 400 | input 内文字 / FooterLinks |
| label / Tab inactive / 弱按钮 | 500 | PhoneLabel / PasswordModeBtn (loginMode=code 时) |
| **主操作 / Tab active / 标题** | **600** | SubmitBtn / CodeModeBtn (loginMode=code 时) / BrandSlogan / LockedTitle |

**取消 700 字重**：v2 D-system-baseline 当时把 BrandSlogan 标到 700，但 700 在 16-20px 中文显示偏严苛，不"清晨"——**v3 一律降为 600**。

### 2.3 行高 / 字距

| 文本类 | lineHeight | letterSpacing |
|---|---|---|
| body / label | 1.5（theme 默认）| normal |
| button text | 1.2（紧凑）| 0.02em（增加压字感）|
| 标题 BrandSlogan / LockedTitle | 1.3 | normal（不刻意压字）|
| 等宽数字 LockedCountdown | 1.0 | 0 |

### 2.4 字体族

theme 默认 `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif` ✅ 维持。

LockedCountdown 数字用 `monospace`（特例，functional 等宽需求，已记 token-coverage.md 合理偏差）。

---

## 3. 形状语言 (Shape Strategy)

### 3.1 圆角梯度（统一柔和族）

| 元素 | radius token | px | 节点 |
|---|---|:---:|---|
| FormCard | `radius.lg` | 12 | FormCard（v2 已写）|
| SubmitBtn | `radius.lg` | 12 | SubmitBtn（v2 已写）|
| Input | `radius.md` | 8 | PhoneInput / CredentialInput |
| GetCodeBtn（次级按钮）| `radius.md` | 8 | GetCodeBtn |
| PolicyCheckVisual（v3 新增）| `radius.sm` | 4 | PolicyCheckVisual |
| TabIndicator（v3 新增）| `radius.full` | 9999 | TabIndicator（2px 高小线条用 full 端点圆滑）|
| BrandLogo（v3 PNG 240×240）| `radius.xl` | 16 | BrandLogo（圆角方框）|
| BgBlobTopRight | 圆形 | – | 径向渐变本身即圆 |

### 3.2 形状基调（统一柔和）

✅ 全屏统一**柔和圆角**（与「大圆角柔和」概念契合）
❌ 不混直角 + 圆角

**v2 已实施**，v3 增量：
- TabIndicator 用 radius.full（端点圆滑）
- PolicyCheckVisual 用 radius.sm（区分于 input md 圆角，避免视觉混淆为"输入框"）

### 3.3 v3 新增视觉容器节点（创作权 4 + 5）

| 节点 | 形状 | 父级 | 是否 design 阶段加 | 备注 |
|---|---|---|:---:|---|
| **TabIndicator** | 2px 高 + radius.full + 主色填充 | ModeToggle | ✅ design/element/add | 解决 ISSUE-5 |
| **PolicyCheckLabel**（label 包 input + visual + text）| 无视觉 | PolicyCheckLine 替换 | ✅ design/element/wrap | 解决 ISSUE-7 wrapper-label workaround |
| **PolicyCheckVisual** | 16×16 + radius.sm + 1.5px border + checked 时主色填充 + 8×8 白色对勾 | PolicyCheckLabel | ✅ design/element/add | 解决 ISSUE-7 |

均挂 `meta.design.kind = 'visual-container'`。

---

## 4. 装饰系统 (Decoration Strategy)

### 4.1 装饰系统单一族 = soft-glow（光斑系）

| 决策 | 内容 |
|---|---|
| 系统选定 | **soft-glow** |
| 密度 | **节制**（理论上限 1-2 处，本屏取 2 处）|
| 与 theme.decorationRules 一致 | ✅ minimal 极少（≤ 节制）|

### 4.2 装饰节点清单（v3 调整 v2）

| 节点 | 4 类 | renderHint | weight | 改动 |
|---|---|---|:---:|---|
| **BgBlobTopRight** | 角落溢出 | css-gradient | 2 | v2 已建；v3 调浓度（ISSUE-3）：从 `primaryLight → transparent 60%` → `primary @ 12% alpha → transparent 70%`，让光斑在 #FCFCFD 暖白米底也有可见度 |
| **BgBlobBottomLeft** ✨ v3 新增（可选）| 角落溢出 | css-gradient | 1 | 左下小光斑配重，让画面不偏头重；secondary `#A776FF` @ 8% alpha → transparent 60%（带一点紫加强校园温度） |

**总 weight 装饰= 3**，落在「节制」上限内。

### 4.3 否决其他装饰系统

| 系统 | 否决理由 |
|---|---|
| **geometric-line（几何线条）** | 直线网格太"理性"，与「清晨教室温度」概念冲突 → 直角线让画面变冷 |
| **illustration（插画）** | 插画太"重"，登录页不需要叙事；且违反 theme.decoration=minimal |
| **texture（纹理）** | 噪点/纸纹太"复杂"，与「极简」冲突；且 PNG 纹理增加首屏加载 |
| **organic-curve（有机曲线）** | 自由曲线太"艺术家"，与「工具入口」气质冲突；登录页不需要个性表达 |

### 4.4 BrandLogo 是品牌点缀类（独立于装饰系统）

`materialSpec.kind = 'brand'`，不算装饰节点（不入装饰系统单一族审计），但**视觉风格须与装饰系统协调**——v3 决策 BrandLogo PNG 用扁平字标"C"（不画细节图形 / 不加阴影），保持「极简 + 单色温度」气质。

---

## 5. 间距 + 动效律 (Rhythm Strategy)

### 5.1 间距梯度（呼吸型）

| token | px | 用途 |
|---|:---:|---|
| `spacing.2xs` | 2 | label-input 间距 / TabIndicator 距 ModeToggle bottom |
| `spacing.xs` | 4 | error 提示距 input |
| `spacing.sm` | 8 | label-Input 行内 / icon 与文字 |
| `spacing.md` | 16 | FormCard padding / 字段间垂直 / FormCard 内部组 |
| `spacing.lg` | 24 | screen padding 横 / FormCard 顶部 padding |
| `spacing.xl` | 32 | HeaderArea ↔ FormCard / FormCard ↔ FooterLinks |
| `spacing.2xl` | 48 | screen 顶部留白（safe-area + 视觉透气）|

### 5.2 律动节奏

```
2xs(2) → xs(4) → sm(8) → md(16) → lg(24) → xl(32) → 2xl(48)
       ×2     ×2      ×2      ×1.5     ×1.33     ×1.5
```

呼吸型梯度（接近 √2 倍率扩张），与「清晨呼吸感」概念吻合，避免"硬挤"。

### 5.3 动效律

| 切换类型 | duration | easing | 用途 |
|---|---|---|---|
| **hover 反馈** | `transitions.fast`(150ms) | cubic-bezier(0.4,0,0.2,1) | SubmitBtn / GetCodeBtn / 链接 hover |
| **pressed 反馈** | 80ms | ease-in（手感快速）| SubmitBtn / GetCodeBtn pressed scale 0.98 |
| **focus 反馈** | `transitions.fast`(150ms) | ease-out | input focus borderColor + ring 浮现 |
| **state 切换** | `transitions.normal`(250ms) | cubic-bezier(0.4,0,0.2,1) | loginMode 切换 → TabIndicator 滑动 / NormalFormView ↔ LockedView 切换淡入淡出 |
| **disabled 进入** | 200ms | ease-out | SubmitBtn disabled 时 grayscale + opacity 0.4 |
| **slow 不用** | 400ms | – | 登录页不需要长动画（走向 modal 只在退出时 nav.go，无内部 modal）|

### 5.4 关键动效 craft（v3 自创）

| 动效 | craft 任务（Phase D 自创）|
|---|---|
| TabIndicator 滑动 | D-00-login-craft-tab-indicator |
| SubmitBtn pressed scale 0.98 + hover 微 lift | D-00-login-craft-submit-feedback（待评估是否单独成任务）|
| BgBlobTopRight + BottomLeft 在 dark/light 下的 alpha 调试 | D-00-login-craft-decoration-rebalance |

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  "design": {
    "visualStrategy": {
      "color": {
        "ratio": { "background": 60, "surfaceAndText": 30, "accent": 10 },
        "primary": "$token:colors.primary",
        "background": "$token:colors.background",
        "accentUsage": [
          "SubmitBtn.bg",
          "ModeToggle.active + TabIndicator",
          "PolicyCheckVisual.checked",
          "Input.focus",
          "Links (Register/Forgot/Policy/GetCode)",
          "BgBlob (light alpha)"
        ],
        "errorDecision": {
          "selected": "维持 colors.error #DD4747",
          "softeningStrategy": "通过 caption 12px 字号 + 紧贴 input 下方布局 + 仅 blur 后出现 → 视觉冲击通过 typography/位置/时序软化，不软化色相",
          "rejected": ["alpha 0.85 软化（像 bug）", "UpstreamChallenge 加 errorSoft token（成本不值）"]
        }
      },
      "typography": {
        "sizeScale": ["caption(12)", "body(14)", "body-lg(16)", "h4(20)", "h2(28)"],
        "weightScale": { "default": 400, "label": 500, "primary": 600 },
        "weightDecision": "取消 700 字重（v2 BrandSlogan 700→600，避免严苛感）",
        "lineHeight": { "body": 1.5, "btn": 1.2, "title": 1.3, "monospaceCountdown": 1.0 },
        "letterSpacing": { "btn": "0.02em", "default": "normal" }
      },
      "shape": {
        "baseRadius": "soft",
        "radiusMap": {
          "card": "lg(12)",
          "button-primary": "lg(12)",
          "button-secondary": "md(8)",
          "input": "md(8)",
          "checkbox-visual": "sm(4)",
          "tab-indicator": "full(9999)",
          "brand-logo": "xl(16)"
        },
        "v3VisualContainers": [
          { "node": "TabIndicator", "shape": "2px 线条 + radius.full" },
          { "node": "PolicyCheckLabel", "shape": "label wrap (no visual)" },
          { "node": "PolicyCheckVisual", "shape": "16×16 + radius.sm + 1.5px border + checked 主色填充" }
        ]
      },
      "decoration": {
        "system": "soft-glow",
        "density": "节制",
        "instances": [
          {
            "node": "BgBlobTopRight",
            "position": "右上溢出",
            "renderHint": "css-gradient",
            "color": "primary @ 12% alpha → transparent 70%",
            "weight": 2,
            "v3Change": "v2 primaryLight 太弱，v3 提浓度到 primary @ 12% alpha"
          },
          {
            "node": "BgBlobBottomLeft",
            "position": "左下溢出",
            "renderHint": "css-gradient",
            "color": "secondary #A776FF @ 8% alpha → transparent 60%",
            "weight": 1,
            "v3New": "v3 新增配重光斑，加紫色暗示校园温度"
          }
        ],
        "rejectedSystems": ["geometric-line", "illustration", "texture", "organic-curve"]
      },
      "rhythm": {
        "spacingScale": ["2xs(2)", "xs(4)", "sm(8)", "md(16)", "lg(24)", "xl(32)", "2xl(48)"],
        "spacingPattern": "呼吸型 √2 倍率扩张",
        "motionTimings": {
          "hover": "150ms cubic-bezier(0.4,0,0.2,1)",
          "pressed": "80ms ease-in",
          "focus": "150ms ease-out",
          "state": "250ms cubic-bezier(0.4,0,0.2,1)",
          "disabled": "200ms ease-out"
        },
        "slowTransitionUsage": "本屏不用 transitions.slow(400ms)，登录页无长动画需求"
      },
      "v2Continuity": "继承 v2 D-system-baseline 圆角/间距/字号 token 引用，做 5 处增量：(1)取消 700 字重 (2)装饰浓度调整 (3)新增 TabIndicator+PolicyCheckLabel+PolicyCheckVisual 视觉容器 (4)新增 BgBlobBottomLeft 配重 (5)error 色软化策略改'位置+时序'非'色相'"
    }
  }
}
```

---

## 7. 自检

- [x] 5 维全部填齐（色 / 字 / 形 / 饰 / 律）
- [x] 装饰系统单选 1 个（soft-glow）+ 给出否决其他 4 系统理由
- [x] 60-30-10 调色比例明确，强调色出现位置 = 6 处（≤ 6 ✅）
- [x] 形状基调统一柔和（不混直角）
- [x] 间距 + 动效梯度全部对应 token，无硬编码
- [x] error 色决策含 ≥2 候选 + 选定理由
- [x] v3 新增 3 个视觉容器节点声明（TabIndicator / PolicyCheckLabel / PolicyCheckVisual）
- [x] v3 新增装饰节点声明（BgBlobBottomLeft）
- [x] 与 v2 的差异点列出（5 处增量）
- [x] 即将调 meta/set_screen 写入 visualStrategy

任一未通过 → 不能进 D-00-login-task-planning。
