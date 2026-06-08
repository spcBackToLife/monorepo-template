# 05 — 跨目标统筹（Phase D）

> 必读时机：执行 `D-X-cross-goal-strategy` 任务时（所有 G<N>-decompose 完成后）。
> 输入：所有 designGoals + 所有 goalElementMap。
> 输出：`cross-goal-strategy.md` + `screen.meta.design.visualStrategy`。
>
> 任务目的：把分散在各 goal 里的元素权重 / 装饰 / 调色 / 形状 / 字号 / 律动需求**累积统筹**——形成一份整屏的视觉策略。这是 Phase F craft 落库时的全局参考依据。

---

## 1. 5 步统筹法

```
Step 1: 元素 × 目标 矩阵        把每元素被各 goal 涉及的权重列成表
Step 2: 元素权重终值            取最高权重 → 形成全屏权重金字塔
Step 3: 装饰系统单一族选定      按 goal 频次推导装饰族
Step 4: 60-30-10 调色累积        按 P0 goal 优先,累积色彩比例
Step 5: 形状 / 字号 / 律动累积   从 theme + 各 goal 偏好取折中
```

---

## 2. Step 1 — 元素 × 目标 矩阵

### 2.1 矩阵结构

纵轴：屏内所有节点
横轴：所有 designGoals
单元格：该元素在该 goal 内的角色 + 权重

### 2.2 矩阵示例（登录页）

| 元素 / Goal | G1 mood | G2 cta | G3 trust | G4 state | G5 brand |
|---|---|---|---|---|---|
| screen | 主体/5 | - | - | - | - |
| Root | 父容器/1 | - | - | - | - |
| HeaderArea | 配角/6 | - | - | - | 配角/5 |
| BrandLogo | 主角/7 | - | - | - | 主角/9 |
| BrandSlogan | - | - | - | - | 邻居/4 |
| FormCard | 邻居/4 | 父容器/4 | - | - | - |
| ModeToggle | - | - | - | 主体/6 | - |
| CodeModeBtn | - | 邻居/3 | - | 主角/7 | - |
| PasswordModeBtn | - | 邻居/3 | - | 邻居/3 | - |
| PhoneInput | - | - | - | - | - |
| CredentialInput | - | - | - | - | - |
| PolicyCheckbox | - | - | 主角/7 | - | - |
| PolicyText | - | 配角/4 | 邻居/3 | - | - |
| SubmitBtn | - | 主角/9 | - | - | - |
| GetCodeBtn | - | 邻居/3 | - | - | - |
| RegisterLink | - | 邻居/2 | - | - | - |
| ForgotLink | - | 邻居/2 | - | - | - |
| BgBlobTopRight | 装饰/3 | - | - | - | - |
| BgBlobBottomLeft | 装饰/3 | - | - | - | - |
| LockedView (group) | - | - | - | 主角/7 | - |

### 2.3 冲突检测

矩阵填好后,**强制检查**：

```
冲突 1: 同一元素被 ≥ 2 个 goal 涉及但角色矛盾
  例: SubmitBtn 在 G2 是主角(weight 9), 在 G1 也想做主角(weight 8)
  → R-GOAL-CONFLICT 拒
  → 回 Phase B / C 重做: 让一个 goal 让出主角位

冲突 2: 元素权重在不同 goal 里差异 ≥ 4
  例: BrandLogo 在 G1 weight=7, G5 weight=9
  → 接受（取最高 9）但 md 必须解释累积理由
  
冲突 3: 装饰族在不同 goal 里冲突
  例: G1 想 soft-glow, G7 想 illustration
  → R-GOAL-CONFLICT 拒
  → 回 Phase B 让一个 goal 让出装饰主导权 / 走 UpstreamChallenge 让 theme 升装饰族
```

---

## 3. Step 2 — 元素权重终值

### 3.1 取最高权重

每元素的最终权重 = max(各 goal 内权重)。

```
elementFinalWeight = {
  screen: 5,           // G1 only
  HeaderArea: 6,       // max(G1=6, G5=5)
  BrandLogo: 9,        // max(G1=7, G5=9)
  BrandSlogan: 4,      // G5 only
  FormCard: 4,         // max(G1=4, G2=4)
  ModeToggle: 6,       // G4 only
  CodeModeBtn: 7,      // max(G2=3, G4=7)
  PasswordModeBtn: 3,
  ...
  SubmitBtn: 9,        // G2 only
  GetCodeBtn: 3,
  RegisterLink: 2,
  ForgotLink: 2,
  PolicyCheckbox: 7,   // G3
  PolicyText: 4,       // max(G2=4, G3=3)
  BgBlobTopRight: 3,
  BgBlobBottomLeft: 3,
  LockedView (group): 7
}
```

### 3.2 全屏权重金字塔

```
主角层 (8-10):    BrandLogo(9), SubmitBtn(9)         共 2 个
配角层 (5-7):     CodeModeBtn(7), PolicyCheckbox(7),
                  LockedView(7), HeaderArea(6),
                  ModeToggle(6), screen(5)            共 6 个
工具层 (2-4):     FormCard(4), BrandSlogan(4),
                  PolicyText(4), GetCodeBtn(3),
                  PasswordModeBtn(3), BgBlob×2(3),
                  RegisterLink(2), ForgotLink(2)      共 9 个
氛围层 (0-1):     Root(1)                              共 1 个
```

### 3.3 金字塔约束（必须成立）

- **主角层 1-2 个**（多于 2 个 = 没主角）
- **配角层 3-6 个**
- **工具层 ≥ 5 个**（少于 5 = 缺细节）
- **主角与配角差 ≥ 2**（否则主角不突出）
- **总 weight ≤ 100**（避免每个元素都很重 = 都不重）

---

## 4. Step 3 — 装饰系统单一族选定

### 4.1 装饰族 5 选 1

```
soft-glow         光斑系（径向渐变 + blur,适合温度 / 治愈 / 校园）
geometric-line    几何线条系（直线 / 网格,适合科技 / 工具 / 数据）
illustration      插画系（具象插画,适合活力 / 玩乐 / 教育）
texture           纹理系（噪点 / 纸纹,适合复古 / 自然 / 高级感）
organic-curve     有机曲线系（自由曲线,适合艺术 / 个性 / 治愈）
```

### 4.2 选定规则

```
Step 1: 统计各 goal 涉及的装饰需求
  G1 mood-warmth: BgBlob (soft-glow)
  G7 decoration-storytelling: 校园元素 (illustration)
  ...
  
Step 2: 频次 + theme.intent 兼容度
  - theme.aesthetics: minimal+flat → soft-glow / geometric-line 兼容,illustration 冲突
  - theme.decoration: minimal → 密度上限"节制"(2-3 处)
  
Step 3: 选定单一族
  - 如果某族 ≥ 50% goal 需求 + 与 theme 兼容 → 选定
  - 否则 → 走 UpstreamChallenge 让 theme 调 decoration token
```

### 4.3 跨族冲突的 UpstreamChallenge

```
情况: 项目里 G1 mood-warmth 需 soft-glow + G7 storytelling 需 illustration
但 theme.aesthetics=minimal+flat 与 illustration 冲突

候选解决:
  A. 让 G7 退化为 soft-glow（损失 storytelling 强度）
  B. 让 G1 退化为 illustration（与 theme 冲突）
  C. UpstreamChallenge 让 theme 改 aesthetics 含 'organic-illustration'
  
推荐 C: theme 是为产品服务,不是反过来
```

详见 `methodology/06-decoration-system.md`。

---

## 5. Step 4 — 60-30-10 调色累积

### 5.1 累积规则

```
60% (主导色,大面积)：来自 mood-conveyance / brand-recognition goal 的色温载体
  典型: theme.colors.background 或派生暖 / 冷调

30% (次要色,中等面积)：来自 hierarchy / state-feedback goal 的容器色
  典型: theme.colors.surfaceElevated / surface

10% (强调色,小面积)：来自 cta-clarity / brand-recognition goal 的 accent
  典型: theme.colors.primary
```

### 5.2 累积示例

```
G1 mood-warmth:
  60% backgroundColor: 暖白米 → "$token:colors.background"

G5 brand-recognition:
  30% surfaceElevated: 卡片白 → "$token:colors.surfaceElevated"

G2 cta-clarity:
  10% primary: 蓝紫 → "$token:colors.primary"
  
其他 goal 的色彩需求:
  G3 trust-signal: warmRed (errorSoft) → 已在 theme 中,不占 60-30-10 主席
  G4 state-feedback: warning (locked icon) → 状态色,不占主席
```

### 5.3 强调色出现位置（10%）

```
accentUsage: [
  "SubmitBtn.bg",                            // G2 主角
  "ModeToggle 当前 active 字色 + indicator", // G4 状态可见
  "PolicyCheckVisual.checked 填充",          // G3 信任降焦虑
  "Input.focus 边色 + 光晕",                 // G3 信任反馈
  "Links (Register/Forgot)",                 // 邻居弱化
  "BgBlob 装饰 (alpha < 30%)"                // G1 装饰
]

约束: 强调色出现位置 ≤ 6 处（超量 = 强调失效）
```

---

## 6. Step 5 — 形状 / 字号 / 律动累积

### 6.1 形状语言

从 theme.cornerStyle + 各 goal 偏好取折中：

```
基调: 全屏统一柔和 / 直角 / 有机 / 几何（4 选 1）

圆角档位映射：
  card:           radius.lg (12)
  button-primary: radius.lg (12)
  button-secondary: radius.md (8)
  input:          radius.md (8)
  checkbox-visual: radius.sm (4)
  tab-indicator:  radius.full (9999)
  brand-logo:     radius.xl (16)
```

### 6.2 字号节奏

从 theme.typography + hierarchy goal 偏好累积：

```
本屏使用档位（克制·只用 5 档）:
  caption (12)  - 错误 / 链接
  body (14)     - label / 政策
  body-lg (16)  - 输入 / CTA
  h4 (20)       - 副标 / 锁定标题
  h2 (28)       - 主标题（如有）
```

### 6.3 律动节奏

```
间距档位:
  2xs (2) → xs (4) → sm (8) → md (16) → lg (24) → xl (32) → 2xl (48)

动效时长:
  fast (150ms)  - hover / focus / 链接
  normal (250ms) - 状态切换 / TabIndicator 滑动
  slow (400ms)  - 不用（登录页无长动画）

缓动:
  cubic-bezier(0.4, 0, 0.2, 1) - 默认
  ease-in (80ms) - pressed 反馈（手感快速）
  ease-out - 进入态
```

---

## 7. ★ 沉淀到 schema 的结论（必填）

```jsonc
// MCP: meta/set_screen
{
  projectId: "<projectId>",
  screenId: "<screenId>",
  patch: {
    design: {
      visualStrategy: {
        weightPyramid: [
          { nodeId: "BrandLogo", finalWeight: 9, sources: ["G1=7", "G5=9"], layer: "主角" },
          { nodeId: "SubmitBtn", finalWeight: 9, sources: ["G2=9"], layer: "主角" },
          { nodeId: "CodeModeBtn", finalWeight: 7, sources: ["G2=3", "G4=7"], layer: "配角" },
          // ...
        ],
        decorationSystem: {
          family: "soft-glow",
          density: "节制",
          derivedFromGoals: ["G1", "G7"],
          rationale: "G1 mood + G7 storytelling 频次最高且与 theme.minimal+flat 兼容"
        },
        colorRatio: {
          sixty: { token: "$token:colors.background", sourceGoal: "G1", role: "屏底暖白米" },
          thirty: { token: "$token:colors.surfaceElevated", sourceGoal: "G5", role: "FormCard 卡片白" },
          ten: { token: "$token:colors.primary", sourceGoal: "G2", role: "SubmitBtn 主用 + 散点" }
        },
        accentUsage: [
          "SubmitBtn.bg",
          "ModeToggle.active + TabIndicator",
          "PolicyCheckVisual.checked",
          "Input.focus",
          "Links (Register/Forgot)",
          "BgBlob (alpha < 30%)"
        ],
        shapeLanguage: {
          baseRadius: "soft",
          radiusMap: {
            card: "$token:radius.lg",
            button: "$token:radius.lg",
            input: "$token:radius.md",
            checkbox: "$token:radius.sm",
            indicator: "$token:radius.full",
            logo: "$token:radius.xl"
          }
        },
        typographyScale: {
          sizes: ["caption(12)", "body(14)", "body-lg(16)", "h4(20)", "h2(28)"],
          weights: { default: 400, label: 500, primary: 600 }
        },
        rhythmTimings: {
          spacing: ["2xs(2)", "xs(4)", "sm(8)", "md(16)", "lg(24)", "xl(32)", "2xl(48)"],
          motion: { fast: "150ms", normal: "250ms" },
          easing: "cubic-bezier(0.4, 0, 0.2, 1)"
        }
      }
    }
  }
}
```

---

## 8. 自检（任务 done 前）

- [ ] 元素 × 目标矩阵已构建（含全屏所有节点）
- [ ] 冲突检测跑过（双主角 / 装饰族冲突 / 权重差 ≥ 4 等）
- [ ] 全屏权重金字塔成立（主角 1-2 / 配角 3-6 / 工具 ≥ 5）
- [ ] 装饰系统单一族选定 + 与 theme 兼容
- [ ] 60-30-10 三色都来自具体 token 引用名 + 标 sourceGoal
- [ ] accentUsage ≤ 6 处
- [ ] 形状 / 字号 / 律动从 theme + goal 偏好累积出来,有溯源
- [ ] 末尾「★ 沉淀到 schema 的结论」与 MCP 调用 1:1

任一未通过 → md 不达,任务不能 done。

---

## 9. 一句话总结

> **跨目标统筹 = 把分散在 N 个 goal 的视觉需求累积成一份整屏策略。weightPyramid / decorationSystem / colorRatio 全部带溯源,后续 Phase F craft 落库时按本策略全屏一致执行。**
