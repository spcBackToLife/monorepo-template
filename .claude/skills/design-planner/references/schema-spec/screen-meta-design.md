# schema-spec：screen.meta.design 字段精确清单（v3 升级）

> 适用任务：`D-X-emotion`、`D-X-hierarchy`、`D-X-budget`、`D-X-meta`、`D-audit`、`D-X-briefing`、`D-X-concept`、`D-X-strategy`（v3 新增）
>
> **v3 ★ 新增 3 个字段**：briefing（§6）、visualConcept（§7）、visualStrategy（§8）

## 0. 字段总览

```jsonc
screen.backgroundColor: "..."                    // 屏背景

screen.meta.design = {
  summary: "...",                                 // 一句话浓缩（§2 现有）
  palette: ["..."],                               // 用到的 token 清单（§3 现有）
  layers: [{ name, zIndex, elements }],          // 视觉层级 4 层（§4 现有）
  componentBudgets: [{...}],                      // 视觉权重清单（§5 现有，详 02-visual-budget.md）

  // v3 ★ 新增
  briefing: { ... },                              // §6 D-X-briefing 任务产物
  visualConcept: { ... },                         // §7 D-X-concept 任务产物
  visualStrategy: { ... }                         // §8 D-X-strategy 任务产物
}
```

> §1-§5 同原 v2 design 字段；§6-§8 v3 新增创作型字段；§9-§12 系统/工具字段；§13 红线汇总。

## 1. screen.backgroundColor（A 类一等字段）

```jsonc
screen.backgroundColor: "$token:colors.bgPage"   // 屏背景，必须 token 引用
```

**MCP**：`screen/update { projectId, screenId, patch: { backgroundColor: "..." } }`

**红线**：
- ❌ 硬编码颜色（如 `"#FFFFFF"`）→ R-STRUCTURE-02
- ❌ 写到 rootNode.styles.backgroundColor 而不是 screen.backgroundColor → 不符合规范

## 2. screen.meta.design.summary

一句话浓缩本屏整体氛围 + 主要视觉手段：

```jsonc
screen.meta.design.summary = "暖白底 + 顶部粉色渐变氛围 + 角落装饰 + 居中品牌 + 表单卡 + 药丸 CTA"
```

**约束**：
- 必填
- ≤ 60 字
- 必须包含：色调 + 装饰类型 + 主要组件视觉特征
- 不能是"漂亮"、"现代"等空话

## 3. screen.meta.design.palette

本屏用到的 token 名（参考清单，不强制完整列出）：

```jsonc
palette: [
  "colors.primary",        // 草莓粉 - CTA / 品牌
  "colors.secondary",      // 薄荷绿 - 装饰点缀
  "colors.accent",         // 奶油黄 - 解锁光效
  "colors.bgPage",         // 暖白底
  "colors.bgCard",
  "colors.textPrimary"
]
```

**用途**：
- 设计师 / QA 快速看本屏色彩主调
- D-audit 阶段对照各屏 palette 判断色彩一致性

## 4. screen.meta.design.layers（视觉层级）

```jsonc
layers: [
  { name: "前景",  zIndex: 3, elements: ["LoadingOverlay","ErrorToast"] },
  { name: "中景",  zIndex: 2, elements: ["FormCard","FooterLinks"] },
  { name: "中景",  zIndex: 1, elements: ["HeaderArea","BrandLogo","BrandSlogan"] },
  { name: "背景",  zIndex: 0, elements: ["PageBackground","PinkCircleDeco","MintLeafDeco"] }
]
```

**字段**：
- `name`：`"前景"` | `"中景"` | `"背景"` | `"遮罩"` 之一（中文枚举）
- `zIndex`：与节点 styles.zIndex 对齐（数字）
- `elements`：节点 name 数组（不是 id，便于人读）

**约束**：
- 同 zIndex 可以多个 layer（如 z=2 可以分两个 "中景" 子层）
- 装饰节点必须放 z=0/1
- 遮罩 z ≥ 30

## 5. screen.meta.design.componentBudgets（视觉预算分配表）★

```jsonc
componentBudgets: [
  { nodeId: "n9-SubmitBtn",   role: "主角-CTA",   weight: 9, allowedTools: ["渐变","发光","spring 动效"], decorationDensity: "密" },
  { nodeId: "n2-BrandLogo",   role: "主角-品牌", weight: 8, allowedTools: ["双色","小点缀"],            decorationDensity: "中" },
  { nodeId: "n4-FormCard",    role: "配角-容器", weight: 5, allowedTools: ["阴影","圆角"],              decorationDensity: "少" },
  { nodeId: "n6-PhoneInput",  role: "工具-输入", weight: 3, allowedTools: ["边框","聚焦光"],             decorationDensity: "极少" },
  { nodeId: "n14-PinkCircle", role: "氛围-装饰", weight: 4, allowedTools: ["渐变","blur"],               decorationDensity: "中" }
]
```

**字段**：
- `nodeId`：节点真实 id
- `role`：枚举之一
  - `主角-CTA` / `主角-内容` / `主角-品牌`
  - `配角-信息` / `配角-容器`
  - `工具-导航` / `工具-输入`
  - `氛围-装饰`
- `weight`：1-10 数字
- `allowedTools`：允许的视觉手段数组（中文短语，如 "渐变" / "发光" / "spring 动效"）
- `decorationDensity`：`"极少"` | `"少"` | `"中"` | `"密"`

**约束（自检上限）**：
- `sum(weight) ≤ 30` → 否则 R-BUDGET-01
- 主角角色（CTA + 内容 + 品牌）总数 ≤ 2 → 否则 R-BUDGET-02
- 工具角色 weight ≤ 3
- 装饰角色总和 weight ≤ 8

详见 `methodology/02-visual-budget.md`。

## 6. screen.meta.design.briefing（D-X-briefing 任务产物）

```jsonc
screen.meta.design.briefing = {
  // 用户维度
  userIntent: "校园用户登录回到主页",                       // 用户想做什么
  userMood: "焦虑(怕被推销) → 期望简洁",                    // 情绪曲线
  screenRole: "招呼+工具",                                  // 招呼/转化/留存/安抚/引导/工具
  
  // 主题维度
  themeIntent: "warm-minimal",                              // 来自 theme.intent
  missingTokens: [],                                        // 缺哪些 token；非空则 UpstreamChallenge theme-generator
  
  // 交互维度
  stateViewFields: ["activeMode","policyAccepted","codeCountdown","submitting","submitAttempted"],
  skeletonGaps: [],                                         // 缺哪些业务节点；非空则 UpstreamChallenge interaction-designer
  
  // 上下文维度
  crossScreenComponents: ["SubmitBtn","FormCard","PrimaryButton(模板)"]
}
```

**约束**：
- 必填（任务 D-X-briefing 完成时写入）
- userIntent / userMood / screenRole 不能为"漂亮"等空话
- missingTokens / skeletonGaps 非空时不能进 D-X-concept

详见 `methodology/01-briefing.md` + `note-templates/briefing.template.md`。

---

## 7. screen.meta.design.visualConcept（D-X-concept 任务产物）

```jsonc
screen.meta.design.visualConcept = {
  soulSentence: "清新校园温度，不浮夸不冷漠",                // 灵魂句 10-25 字
  styleKeywords: ["暖白", "极简", "单色温度"],               // 风格关键词 3 个（色/形/饰各 1）
  moodBoard: [                                               // 生活场景词 3-5 个
    "晨光透过窗",
    "笔记本上的便签",
    "球场围栏的剪影",
    "学校公告板"
  ],
  candidatesEvaluated: 3,                                    // 评估了几个候选
  selectedCandidate: "A",                                    // 选了哪个
  rejectionReasons: [                                        // 否决理由（机器对账用）
    { candidate: "B", reason: "与产品「校园社交」气质冲突" },
    { candidate: "C", reason: "登录页活泼降低信任度" }
  ]
}
```

**约束**：
- 必填（任务 D-X-concept 完成时写入）
- candidatesEvaluated ≥ 2（必须有候选评估）
- soulSentence 不能空话；含一个情绪核心
- styleKeywords 互不冲突
- moodBoard 不用品牌名

详见 `methodology/02-visual-concept.md` + `note-templates/concept.template.md`。

---

## 8. screen.meta.design.visualStrategy（D-X-strategy 任务产物）

```jsonc
screen.meta.design.visualStrategy = {
  // 8.1 色彩策略
  color: {
    ratio: { background: 60, surfaceAndText: 30, accent: 10 },
    primary: "$token:colors.primary",
    background: "$token:colors.background",
    accentUsage: ["SubmitBtn.bg", "ModeToggle.active", "TabIndicator", "PolicyCheckVisual.checked", "PhoneInput.focus", "BgBlob"]
  },
  
  // 8.2 字号节奏
  typography: {
    sizeScale: ["caption(12)", "body(14)", "body-lg(16)", "h4(18)", "h2(22)", "display(28)"],
    weightScale: { body: 400, label: 500, btn: 600, active: 700 },
    lineHeight: { default: 1.5, btn: 1.2 }
  },
  
  // 8.3 形状语言
  shape: {
    baseRadius: "soft",                                      // soft | sharp | organic | geometric
    radiusMap: { card: "xl(16)", button: "lg(12)", input: "md(8)", small: "sm(4)" }
  },
  
  // 8.4 装饰系统
  decoration: {
    system: "soft-glow",                                     // 单一族（必选 1）：soft-glow | geometric-line | illustration | texture | organic-curve
    density: "节制",                                         // 极少 | 节制 | 中等 | 丰富
    instances: [
      { position: "右上溢出", role: "氛围-装饰", weight: 2 },
      { position: "FormCard 顶部渐变线（可选）", role: "氛围-装饰", weight: 1 }
    ],
    rejectedSystems: ["geometric-line", "illustration", "texture", "organic-curve"]
  },
  
  // 8.5 间距 + 动效律
  rhythm: {
    spacingScale: ["2xs(2)", "xs(4)", "sm(8)", "md(16)", "lg(24)", "xl(32)", "2xl(48)"],
    motionTimings: {
      hover: "150ms ease-out",
      pressed: "80ms ease-in",
      state: "200ms ease-out",
      modal: "300ms ease-in-out"
    }
  }
}
```

**约束**：
- 必填（任务 D-X-strategy 完成时写入）
- color.ratio 三段加和 = 100；accentUsage ≤ 6 处
- decoration.system 单选 1 个 + rejectedSystems 给出否决其他系统的理由
- shape.baseRadius 单选 1 个，全屏统一
- 所有 token 引用必须在 theme.tokens 池内

详见 `methodology/03-color.md` + `04-typography.md` + `05-shape.md` + `06-decoration.md` + `07-rhythm.md` + `note-templates/strategy.template.md`。

---

## 9. screen.meta.status.phase

完成时打：

```jsonc
screen.meta.status.phase = "designed"
```

**生命周期**：
- product 阶段：`"analyzed"`
- interaction 阶段：`"interaction-defined"`
- design 阶段（你）：`"designed"` ← 出场前打
- executor 阶段：`"verified"`

**红线**：
- ❌ 在 D-X-meta 任务还没做完就标 `"designed"` → R-PHASE-01
- ❌ 不写 phase 推进 → 后续 query/integrity 把屏当作还没做

## 10. screen.meta.design.ref（可选）

```jsonc
ref: "figma://file/xxx" | "https://..." | undefined
```

外部权威参考（如 Figma 链接），可选；无则省略。

## 11. screen.stateInit.view.*.previewValue（编辑期预览值，可补）

让设计师在编辑画布切到不同状态查看效果：

```jsonc
screen.stateInit.view.loginMode.previewValue = "password"
screen.stateInit.view.submitting.previewValue = false
screen.stateInit.view.errors.previewValue     = { phone: "手机号格式不正确" }
```

**注意**：
- 仅服务编辑画布，不进运行时
- design 阶段可补（`state/view_set_preview` MCP）
- 不补也不报错（属于体验增强项）

## 12. MCP 调用清单

| 字段 | MCP 工具 |
|------|---------|
| screen.backgroundColor | `screen/update` |
| screen.meta.design.{summary,palette,layers,componentBudgets,ref} | `meta/set_screen { patch: { design: {...} } }` |
| screen.meta.design.briefing（v3）| `meta/set_screen { patch: { design: { briefing: {...} } } }` |
| screen.meta.design.visualConcept（v3）| `meta/set_screen { patch: { design: { visualConcept: {...} } } }` |
| screen.meta.design.visualStrategy（v3）| `meta/set_screen { patch: { design: { visualStrategy: {...} } } }` |
| screen.meta.status.phase | `meta/set_screen { patch: { status: { phase: "designed" } } }` 或 `meta/set_node_status` |
| screen.stateInit.view.*.previewValue | `state/view_set_preview` |

---

## 13. 红线汇总

- ❌ summary 空话 / 不含视觉特征
- ❌ palette 用硬编码颜色而不是 token 名
- ❌ layers 4 层未归类完所有非装饰节点
- ❌ componentBudgets 总权重 > 30 不削减
- ❌ componentBudgets 主角 > 2 个
- ❌ phase 提前标 "designed" 但 ready 字段不齐
