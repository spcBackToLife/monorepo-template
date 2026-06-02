# 登录页完整样板（examples）

> 这是一份**虚拟样板**——以校园社交登录页为例,演示 8 Phase 完整流程。
> 数据是模拟的;真实项目跑时数值会按 positioning + theme + interaction 推导。
>
> 用途：当流程不熟时,参考这份看每个 Phase 该产出什么。
> 重点：注意各 Phase 之间的**契约链**——positioning → designGoals → goalElementMap → visualStrategy → craft tasks → self-review。
>
> ⚠️ 样板中展示的 md 文件路径（如 `craft-G1.md` / `self-review-by-goals.md`）是说明用的载体——按 `../README.md` 阅读规则，把这些"md 内容"读作工作记忆里的思考过程，结论直接落 schema 字段。契约链、5 字段、5 维 changes、successCriteria、3 轮迭代等核心方法照抄。

---

## Phase 0 — 入场门禁

```
1. query/list_projects → projectId = "campus-social-demo"
2. query/project_info → 入场六查全过
3. theme/get → ThemeConfig: aesthetics=[minimal,flat], decoration=minimal,
                seedColor=#5B6CFF, intent="校园温度+极简"
4. query/list_screens → 1 屏 phase=interaction-defined: "00-login"
5. query/list_open_challenges { targetStage: 'design' } → 0 个
6. query/next_pending_task → D-00-login-positioning (Phase A 入口)
```

---

## Phase A — positioning.md（D-00-login-positioning）

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-positioning
> 对应 schema 字段：screen.meta.design.positioning

# D-00-login-positioning — 三层定位

## 1. Layer 1 — 产品定位

| 项 | 内容 |
|---|---|
| 核心价值主张 | 给 95-00 后大学生的校园社交,日常感强,不油腻 |
| 视觉差异化机会 | 比即刻更克制(不靠多色+表情包),比小红书更工具感(不靠插画+多图);差异化 = 暖白米 + 蓝紫单色 + 单一温度装饰族 |
| 用户视觉期待 | 简约时尚 + 校园温度 |

### 1.1 竞品视觉对照

| 竞品 | 视觉特征 |
|---|---|
| 即刻 | 白底 + 黄黑配色 / 圆角卡片 + 大字 / 标签云 + 表情包文化 |
| 小红书 | 米白底 + 多色点缀 / 插画装饰 + 手写体 / 瀑布流 + 高饱和图 |
| Soul | 深紫底 + 渐变 + 大插画 / 个性化突出 |

### 1.2 视觉差异化陈述

本产品在校园社交品类里走"清晨教室温度风"——比即刻更克制(不靠多色),比小红书更工具感(不靠插画),差异化点 = 暖白米 + 蓝紫单色 + 单一温度装饰族。

## 2. Layer 2 — 页面定位

| 项 | 内容 |
|---|---|
| 屏在用户旅程的位置 | 入口屏(从 App 启动 / 分享拉起 / session 过期来) → 跳到主屏 |
| 用户核心收益 | 5 步进主屏 + 安心隐私 |
| 产品核心目标 | 降低注册流失 + 建立第一印象 |

### 2.1 visualTiming 三档

| 时机 | 用户应看到 / 理解 / 决策 |
|---|---|
| 0.5 秒 | BrandLogo 在屏顶 + 屏底偏暖,无视觉噪音,"这是个轻量入口屏" |
| 5 秒 | 看清主操作 = 输入手机号 + 验证码登录,辅助操作 = 切密码登录/注册/忘记密码 |
| 30 秒 | 决策按下 SubmitBtn → 0.5s 见 spinner → 进主屏 |

## 3. Layer 3 — 用户场景

| 项 | 内容 |
|---|---|
| 进屏心理状态 | 好奇 + 略防备 + 急迫想跳过 |
| 紧迫度 | medium |
| 离屏心理期望 | 已加入校园圈层的预感 |

## 4. ★ 沉淀到 schema 的结论

(MCP: meta/set_screen + design.positioning,内容如上)
```

---

## Phase B — design-goals.md（D-00-login-design-goals）

提炼 5 个 designGoal：

```jsonc
designGoals: [
  {
    id: "G1",
    statement: "让用户进登录页 0.5 秒感受到清晨教室般的温度,降低注册防备",
    whyMatters: "用户带'略防备'情绪进入;视觉先安抚 = 注册转化的前置条件",
    impactMode: "mood-conveyance",
    successCriteria: [
      "首屏视线热点(saliency map)落在 BrandLogo + 屏底偏暖区,而非 SubmitBtn 主色块",
      "屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt",
      "出现 ≥ 2 个具象校园元素表征(色斑/插画/纹理)",
      "无任何冷峻 SaaS 信号(纯白底/直角元素/灰阶占比 > 40%)"
    ],
    priority: "P0",
    forbiddenSignals: [
      "屏底 #FFFFFF 或与之差 ≤ 1pt",
      "灰阶占比 > 40%",
      "出现任何直角元素(border-radius < 4px)",
      "装饰元素 alpha < 20%"
    ]
  },
  {
    id: "G2",
    statement: "让 SubmitBtn 成为首屏唯一主角,用户视线第二跳必落于此",
    whyMatters: "登录是过路屏,CTA 不抢眼=用户停留过长=放弃率上升",
    impactMode: "cta-clarity",
    successCriteria: [
      "SubmitBtn 与最近邻居(GetCodeBtn)视觉权重差 ≥ 4",
      "SubmitBtn 字号 ≥ 16px,周围至少 16px 留白",
      "SubmitBtn 在 default/hover/pressed/loading/disabled 5 态视觉差异均 ≥ 显著",
      "SubmitBtn 主色填充,占 FormCard 宽度 100%"
    ],
    priority: "P0",
    forbiddenSignals: [
      "SubmitBtn 与邻居权重差 < 2",
      "SubmitBtn 在 disabled 态仍显示主色填充"
    ]
  },
  {
    id: "G3",
    statement: "让协议勾选不像被强制,而像主动同意,降低注册流失",
    whyMatters: "合规红线但易引起反感;视觉降焦虑 = 合规转化率",
    impactMode: "trust-signal",
    successCriteria: [
      "Checkbox 视觉为'圆润主色对勾'非'灰冷方框/黑色 native'",
      "未勾→勾选切换有'被点亮'微动效(≥ 200ms transition)",
      "错误态文案非纯红(#DD0000)暴击,而是邻近色或字号弱化"
    ],
    priority: "P1"
  },
  {
    id: "G4",
    statement: "让模式切换(验证码/密码)和锁定态可见性 ≥ 显著",
    whyMatters: "状态切换不可见 = 用户操作迷失",
    impactMode: "state-feedback",
    successCriteria: [
      "loginMode 切换前后截图像素差 ≥ 3% (TabIndicator 移动可见)",
      "lockedUntil 触发后 LockedView 与 NormalView 像素差 ≥ 50%",
      "倒计时数字字号 ≥ 32px,等宽字体,不会因数字变化产生 layout shift"
    ],
    priority: "P1"
  },
  {
    id: "G5",
    statement: "让 BrandLogo 真画(非占位),传递校园清新品牌识别度",
    whyMatters: "登录页是品牌门面,Logo 占位虚线 = 品牌零识别度",
    impactMode: "brand-recognition",
    successCriteria: [
      "BrandLogo materialProjectId 非空(真画了)",
      "BrandLogo 占首屏面积 ≥ 5%",
      "主色(#5B6CFF) 应用 4-6 处"
    ],
    priority: "P0"
  }
]
```

---

## Phase C — goals/G1.md（D-00-login-G1-decompose,演示一份）

G1 mood-conveyance 拆解：

```jsonc
{
  goalId: "G1",
  involvedElements: [
    { nodeId: "screen", role: "主体", weightInGoal: 5 },
    { nodeId: "Root", role: "父容器", weightInGoal: 1 },
    { nodeId: "HeaderArea", role: "配角", weightInGoal: 6 },
    { nodeId: "BrandLogo", role: "主角", weightInGoal: 7 },
    { nodeId: "FormCard", role: "邻居", weightInGoal: 4 },
    { nodeId: "BgBlobTopRight", role: "装饰", weightInGoal: 3 },
    { nodeId: "BgBlobBottomLeft", role: "装饰", weightInGoal: 3 }   // 新建
  ],
  changes: {
    styles: [
      { nodeId: "screen", patch: { backgroundColor: "$token:colors.background" }, rationale: "服务 G1: 屏底暖白米偏色,RGB 距 #FFFFFF ≥ 5pt" },
      { nodeId: "FormCard", patch: { boxShadow: "$token:shadows.warmSoft" }, rationale: "服务 G1: 卡片阴影偏暖与屏底协调" },
      { nodeId: "Root", patch: { paddingTop: "$token:spacing.2xl" }, rationale: "服务 G1: BrandLogo 上方留白加大,给品牌呼吸" }
    ],
    structure: [
      {
        action: "element/add",
        parent: "screen",
        node: {
          name: "BgBlobBottomLeft",
          type: "div",
          styles: {
            position: "absolute",
            bottom: "-60px", left: "-60px",
            width: "240px", height: "240px",
            backgroundImage: "radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)",
            opacity: "0.25",   // ≥ 0.20 阈值
            zIndex: 0,
            pointerEvents: "none"
          },
          meta: {
            design: {
              kind: "decoration",
              servingGoals: ["G1"],
              summary: "服务 G1 校园温度的左下角光斑装饰"
            }
          }
        },
        rationale: "对角配重 + 强化温度氛围"
      }
    ],
    materials: [
      // BrandLogo 的 brief 在 craft-G5 中,因为主要服务 brand-recognition
      // 此处 G1 不直接画素材,但可以指向校园场景元素的可能性
    ],
    visualStates: [],   // mood 是默认态体验,不涉及 visualState
    layout: [
      // Root padding 已在 styles
    ]
  },
  coordination: {
    主体: "screen",
    主角: "BrandLogo",
    邻居: ["FormCard"],
    父容器: "Root",
    装饰: ["BgBlobTopRight", "BgBlobBottomLeft"]
  },
  measure: {
    snapshotCheck: "Bash 调 screenshot-screen.mjs + Read 截图,人工核对 4 条 successCriteria 逐条",
    refSimilarity: 0.6,
    forbiddenSignals: [
      "屏底 #FFFFFF 或与之差 ≤ 1pt",
      "灰阶占比 > 40%",
      "出现任何直角元素 (border-radius < 4px)",
      "装饰元素 alpha < 20%"
    ]
  }
}
```

(其他 G2-G5 的 goal-N.md 类似结构,此处省略)

---

## Phase D — cross-goal-strategy.md（D-00-login-cross-goal-strategy）

### 元素 × 目标矩阵（部分）

| 元素 / Goal | G1 | G2 | G3 | G4 | G5 |
|---|---|---|---|---|---|
| screen | 主体/5 | - | - | - | - |
| BrandLogo | 主角/7 | - | - | - | 主角/9 |
| SubmitBtn | - | 主角/9 | - | - | - |
| PolicyCheckbox | - | - | 主角/7 | - | - |
| ModeToggle | - | - | - | 主体/6 | - |
| LockedView | - | - | - | 主角/7 | - |

### 元素权重终值（取最高）

| 元素 | finalWeight | layer |
|---|---|---|
| BrandLogo | 9 | 主角 |
| SubmitBtn | 9 | 主角 |
| PolicyCheckbox | 7 | 配角 |
| ModeToggle | 6 | 配角 |
| LockedView | 7 | 配角 |
| screen | 5 | 配角 |
| FormCard | 4 | 工具 |
| BgBlob×2 | 3 | 氛围 |
| Root | 1 | 氛围 |

→ 主角 2 个 / 配角 4 个 / 工具 5 个 / 氛围 3 个 ✅ 金字塔成立

### 装饰系统

```jsonc
decorationSystem: {
  family: "soft-glow",
  density: "节制",
  derivedFromGoals: ["G1"],
  rationale: "G1 是唯一明显需装饰的 goal,soft-glow 与 theme.minimal+flat 兼容"
}
```

### 60-30-10

```jsonc
colorRatio: {
  sixty: { token: "$token:colors.background", sourceGoal: "G1", role: "屏底暖白米" },
  thirty: { token: "$token:colors.surfaceElevated", sourceGoal: "G2", role: "FormCard 卡片白" },
  ten: { token: "$token:colors.primary", sourceGoal: "G2", role: "SubmitBtn + 散点" }
}
```

### accentUsage（≤ 6 处）

```
1. SubmitBtn.bg
2. ModeToggle.active + TabIndicator
3. PolicyCheckVisual.checked
4. Input.focus
5. Links (Register/Forgot)
6. BgBlob (alpha 0.25)
```

---

## Phase E — task-planning.md（D-00-login-task-planning）

派发 5 个 craft + 1 兜底 + 1 整屏对账：

```jsonc
meta/add_plan_tasks {
  tasks: [
    { id: "D-00-login-G1-craft", title: "G1 craft: 校园温度氛围", expectedArtifacts: [{ kind: "goalSuccessCriteriaMet", goalId: "G1" }] },
    { id: "D-00-login-G2-craft", title: "G2 craft: SubmitBtn 主角化", expectedArtifacts: [...] },
    { id: "D-00-login-G3-craft", title: "G3 craft: 协议勾选降焦虑", expectedArtifacts: [...] },
    { id: "D-00-login-G4-craft", title: "G4 craft: 模式+锁定态可见性", expectedArtifacts: [...] },
    { id: "D-00-login-G5-craft", title: "G5 craft: BrandLogo 真画", expectedArtifacts: [...] },
    { id: "D-00-login-coverage-fallback", title: "兜底", expectedArtifacts: [{ kind: "uncoveredNodesMinimalStyles" }] },
    { id: "D-00-login-self-review-by-goals", title: "整屏对账", expectedArtifacts: [{ kind: "allGoalsCriteriaMet", minScoreRatio: 0.8 }] }
  ]
}
```

执行顺序: G1 → G5 → G2 → G4 → G3 → coverage-fallback → self-review-by-goals。

---

## Phase F — craft-G1.md（D-00-login-G1-craft 演示）

### §1 重述目标

服务 G1 mood-conveyance: 让用户进登录页 0.5 秒感受到清晨教室般的温度。

### §2 改动方案（多元素协同,一次性落库）

```
Step 4.1 layout / structure:
  - element/add BgBlobBottomLeft (装饰,服务 G1)

Step 4.2 styles:
  - style/batch_update {
      updates: [
        { nodeId: "screen", styles: { backgroundColor: "$token:colors.background" } },
        { nodeId: "FormCard", styles: { boxShadow: "$token:shadows.warmSoft" } },
        { nodeId: "Root", styles: { paddingTop: "$token:spacing.2xl" } },
        { nodeId: "HeaderArea", styles: { gap: "$token:spacing.md", marginBottom: "$token:spacing.xl" } },
        { nodeId: "BgBlobTopRight", styles: { opacity: "0.25" } }   // 从 0.12 提到 0.25
      ]
    }

Step 4.3 visualStates: (无)

Step 4.4 materials: (G1 不画素材,留给 G5)
```

### §3 截图自审

```bash
SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs campus-social-demo 00-login 2>/dev/null | tail -1)
```

Read 截图后逐条核对：

```
Criteria 1: 首屏视线热点落在 BrandLogo + 屏底偏暖区
  ✅ pass — 屏顶 BrandLogo 居中清晰(尺寸 120x120),屏底从顶到底有可见米黄偏色

Criteria 2: 屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt
  ✅ pass — 取屏底 (375, 600) 像素 RGB ≈ (252, 250, 246),距 #FFFFFF 各通道 3/5/9,距离 11pt > 5pt

Criteria 3: 出现 ≥ 2 个具象校园元素表征
  ❌ fail — 0 个具象校园元素(BgBlob 是抽象色斑,Logo 是字标"C")
  改动候选: 改 BgBlobTopRight 为"教室窗格"线条形装饰 / 在 BrandLogo 内嵌"书本"小图

Criteria 4: 无冷峻 SaaS 信号
  ✅ pass — 屏底偏暖,所有元素圆角 ≥ 4px,灰阶占比 ≈ 25%

forbiddenSignals 全检:
  ✅ no triggers
```

### §4 重做（轮次 2）

回 Step 4 改 BgBlobTopRight + BgBlobBottomLeft 装饰,加入"教室窗格"风格的 line 元素 → 重新截图 → 再核对。

(2 轮通过示例,此处省略)

---

## Phase G — coverage-fallback.md + self-review-by-goals.md

coverage-fallback 给 PhoneInput / CredentialInput / 各 Label / 链接 / FooterLinks 等未涉及节点写最小 styles + 必备 visualStates。

self-review-by-goals 跑整屏截图,逐 goal 重新核对：

```
G1: 4/4 ✅
G2: 4/4 ✅
G3: 3/3 ✅
G4: 3/3 ✅
G5: 3/3 ✅

总: 17/17 = 100% ≥ 80% 阈值
P0 全过 ✅

跨 goal 协调度:
  weightPyramid 实测 vs 声明: 偏差 ≤ 2 ✅
  decorationSystem 单一族(soft-glow): ✅
  colorRatio 60% / 30% / 10%: 实测 58% / 31% / 11% ✅
  accentUsage 6 处 ≤ 6: ✅

→ 整屏通过 → phase=designed → 通知 design-executor
```

---

## Phase H — handover.md

```markdown
# D-handover — 移交 design-executor

## 完成度
- 所有屏 phase=designed: ✅
- 5 个 designGoal 全过 successCriteria: ✅
- coverage-fallback 完成: ✅
- $token: 引用率: 96.5% ≥ 95% ✅
- 跨屏 audit: 单页项目跳过

## 截图证据
- /Users/.../.tica-tmps/snapshots/campus-social-demo-2026-06-01T15-30-00.png

## 已知 trade-off
- 无

## 移交清单（给 executor）
- 5 屏全部 phase=designed
- 所有 designGoals/goalElementMap/visualStrategy 落库完整
- 所有装饰节点挂 servingGoals
- BrandLogo materialProjectId 非空(已画)

→ executor 跑 E-X-snapshot + E-snapshots + E-cross-screen-snapshot 验证。
```

---

## 一句话总结

> 关键不是"再加方法论",而是"让方法论彼此形成强契约链"——positioning → designGoals(可视判据) → goalElementMap(涉及元素) → craft tasks(多元素一次性改动) → 截图对账。每一步都有产物指纹,每一步都向前一步问责。
