# schema-spec：screen.meta.design 字段精确清单

> 适用任务：全部 design Phase 任务（详见 SKILL.md §4.X 任务→必读文件映射）
>
> 包含目标驱动契约链的 4 个一等字段 positioning / designGoals / goalElementMap / visualStrategy（§A/§B/§C/§D）+ 标准 5 字段（§1-§5）+ node.meta.design.servingGoals 跨引用（§E）。

## 0. 字段总览

```jsonc
screen.backgroundColor: "..."                    // 屏背景

screen.meta.design = {
  // === 目标驱动契约链 ===
  positioning: { product, page, userScenario },   // §A Phase A 三层定位产物
  designGoals: [{...}],                           // §B Phase B 提取的 ≥3 个设计目标
  goalElementMap: [{...}],                        // §C Phase C 每目标涉及元素 + 5 维 changes
  visualStrategy: { ... },                        // §D Phase D 跨目标统筹（从 designGoals 累积推导）

  // === 标准字段 ===
  summary: "...",                                 // 一句话浓缩（§2）
  palette: ["..."],                               // 用到的 token 清单（§3）
  layers: [{ name, zIndex, elements }],          // 视觉层级 4 层（§4）
  componentBudgets: [{...}]                       // 视觉权重清单（§5,由 visualStrategy.weightPyramid 推导）
}
```

> §A/§B/§C/§D 是目标驱动契约链一等字段；§1-§5 是标准字段；§E 是 node.meta.design 的扩展跨引用。

---

## §A. screen.meta.design.positioning（Phase A 产物）

```jsonc
positioning: {
  product: {
    coreValue: string,              // 产品核心价值主张, ≤60 字
    differentiation: string,         // 视觉差异化机会陈述,含"比 X 更 Y"
    visualExpectation: string,       // 用户视觉期待调性, ≤30 字
    competitorVisualReferences: [    // 竞品视觉对照, ≥2 项
      {
        product: string,             // 竞品名称(来自 targetUser.dailyApps)
        visualTraits: string[]       // 视觉特征 ≥3 个
      }
    ]
  },
  page: {
    role: string,                    // 屏在用户旅程的位置
    userBenefit: string,             // 屏对用户的核心收益, ≤30 字
    productGoal: string,             // 屏对产品的核心目标, ≤30 字
    visualTiming: {
      zeroPointFiveSec: string,      // 0.5 秒看到什么
      fiveSec: string,               // 5 秒理解什么
      thirtySec: string              // 30 秒决策什么
    }
  },
  userScenario: {
    psychOnEnter: string,            // 进屏心理状态
    urgency: "low" | "medium" | "high",
    psychOnExit: string              // 离屏心理期望
  }
}
```

**MCP**：`meta/set_screen { projectId, screenId, patch: { design: { positioning: {...} } } }`

**约束**:
- 全部字段必填
- competitorVisualReferences ≥ 2 项,每项 visualTraits ≥ 3
- urgency ∈ 枚举
- userBenefit / productGoal ≤ 30 字

**红线**:
- ❌ competitorVisualReferences 为空 → 触发 UpstreamChallenge 退回 product-analyst 补 targetUser.dailyApps

---

## §B. screen.meta.design.designGoals[]（Phase B 产物）

```jsonc
designGoals: [
  {
    id: string,                      // "G1" / "G2" / ...
    statement: string,               // 含动词+主体+视觉机制+具体感觉+价值产出, ≤80 字
    whyMatters: string,              // 为何对产品有价值, ≤100 字
    impactMode:                      // 7 类枚举
      "mood-conveyance" |
      "cta-clarity" |
      "trust-signal" |
      "hierarchy" |
      "state-feedback" |
      "brand-recognition" |
      "decoration-storytelling",
    successCriteria: string[],       // ≥3 条具体可视判据
    priority: "P0" | "P1" | "P2",
    measureMethod?: string,          // 可选,如何客观测量
    forbiddenSignals?: string[]      // 推荐 ≥2 条反例
  }
]
```

**MCP**：`meta/set_screen { ... patch: { design: { designGoals: [...] } } }`

**约束**:
- 数量 ≥ 3 ≤ 7
- P0 数量 ≥ 1 ≤ 3
- 每个 goal 5 字段必填（id / statement / whyMatters / impactMode / successCriteria / priority）
- statement 含动词 + 主体 + 视觉机制
- successCriteria ≥ 3 条,全部可视判据（无"主题契合 / 现代化 / 舒服"等抽象描述）
- impactMode ∈ 7 枚举

**红线**:
- ❌ designGoals < 3 或 > 7 → R-GOAL-COUNT
- ❌ statement 不含动词+主体+视觉机制 → R-GOAL-STATEMENT
- ❌ successCriteria 含抽象描述 → R-GOAL-CRITERIA
- ❌ successCriteria < 3 条 → R-GOAL-CRITERIA

详细写法见 `methodology/02-goal-extraction.md` + `schema-spec/goal-success-criteria.md`。

---

## §C. screen.meta.design.goalElementMap[]（Phase C 产物）

```jsonc
goalElementMap: [
  {
    goalId: string,                  // 引用 designGoals[].id

    involvedElements: [              // ≥2 个
      {
        nodeId: string,
        role: "主体" | "主角" | "配角" | "邻居" | "父容器" | "装饰",
        weightInGoal: number         // 0-10
      }
    ],

    changes: {                       // ≥2 维度涵盖
      styles?: [{ nodeId, patch, rationale }],
      structure?: [{ action, parent?, targets?, node?, wrapper?, rationale }],
      materials?: [{ nodeId, brief }],
      visualStates?: [{ nodeId, states: [...] }],
      layout?: [{ nodeId, patch, rationale }]
    },

    coordination: {                  // 4 角色协同
      主体?: string,
      主角: string,                  // 必填,≥1 个主角
      邻居?: string[],
      父容器?: string,
      装饰?: string[]
    },

    measure: {
      snapshotCheck: string,         // 截图核对方法
      refSimilarity?: number,        // 0.0-1.0,可选
      forbiddenSignals: string[]     // ≥2 条反例
    }
  }
]
```

**MCP**：`meta/set_screen { ... patch: { design: { goalElementMap: [...] } } }`

**约束**:
- 每个 mapping 的 goalId 必须对应已存在的 designGoals 项
- involvedElements ≥ 2
- changes 至少涵盖 2 维度
- 主角 ≥ 1
- weightAllocation 总和 ≤ 25
- 装饰最高 weight ≤ 3

**红线**:
- ❌ involvedElements < 2 → R-GOAL-DECOMPOSE
- ❌ changes 单维度 → R-GOAL-DIMENSION
- ❌ 主角 = 0 → R-GOAL-DECOMPOSE
- ❌ 装饰节点未挂 servingGoals → R-ORPHAN-DECORATION

详细写法见 `methodology/03-goal-decomposition.md` + `methodology/04-multi-element-coordination.md`。

---

## §D. screen.meta.design.visualStrategy（Phase D 跨目标统筹）

```jsonc
visualStrategy: {
  // 全屏权重金字塔（从 goalElementMap 取最高权重）
  weightPyramid: [
    {
      nodeId: string,
      finalWeight: number,           // 0-10
      sources: string[],             // ["G1=7", "G5=9"]
      layer: "主角" | "配角" | "工具" | "氛围"
    }
  ],

  // 装饰系统单一族（从 goal 频次推导）
  decorationSystem: {
    family: "soft-glow" | "geometric-line" | "illustration" | "texture" | "organic-curve",
    density: "极少" | "节制" | "中等" | "丰富",
    derivedFromGoals: string[],      // ["G1", "G7"]
    rationale: string
  },

  // 60-30-10 调色累积（从 goal 推导）
  colorRatio: {
    sixty: { token: "$token:colors.X", sourceGoal: "G1", role: "..." },
    thirty: { token: "$token:colors.Y", sourceGoal: "G2", role: "..." },
    ten: { token: "$token:colors.Z", sourceGoal: "G2", role: "..." }
  },

  accentUsage: string[],             // 强调色出现位置清单, ≤6 处

  // 形状语言
  shapeLanguage: {
    baseRadius: "soft" | "sharp" | "organic" | "geometric",
    radiusMap: {
      [elementType: string]: string  // e.g. "card": "$token:radius.lg"
    }
  },

  // 字号节奏
  typographyScale: {
    sizes: string[],                 // 使用的档位 ≤5
    weights: { default: number, label: number, primary: number }
  },

  // 律动节奏
  rhythmTimings: {
    spacing: string[],               // 使用的间距档位
    motion: { fast: string, normal: string, slow?: string },
    easing: string                   // 默认缓动
  }
}
```

**约束**:
- weightPyramid 主角层 1-2 / 配角层 3-6 / 工具层 ≥5
- decorationSystem 单一族（family 单选）
- accentUsage ≤ 6 处
- 60-30-10 三色都来自 token 引用 + 标 sourceGoal

详细写法见 `methodology/05-cross-goal-audit.md`。

---

## §E. node.meta.design.servingGoals（跨引用字段）

每个节点的 meta.design 新增 `servingGoals: string[]` —— 标识该节点服务于哪些 designGoal。

```jsonc
node.meta.design = {
  // ... 标准字段 (summary, rationale, visualSpec, materialSpec, kind)
  servingGoals: ["G1", "G5"]   // ★ 引用 designGoals[].id
}
```

**约束**:
- 装饰节点（kind=decoration）必须 servingGoals 非空 → R-ORPHAN-DECORATION
- 视觉容器节点（kind=visual-container）必须 servingGoals 非空
- material-frame 节点（kind=material-frame）必须 servingGoals 非空
- 业务节点（无 kind）可空（由 Phase G 兜底覆盖）

详见 `schema-spec/node-meta-design.md`。

---



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
| screen.meta.design.visualStrategy | `meta/set_screen { patch: { design: { visualStrategy: {...} } } }` |
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
