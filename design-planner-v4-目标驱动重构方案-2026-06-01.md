# design-planner v4 — 目标驱动重构方案

> 写作日期：2026-06-01
> 触发：校园社交登录页（`d84c140e-0437-4c80-a786-c1f389bcbb02`）跑完 v3 设计流水线，70+ md 落库、字段对账全过、phase=verified——但**视觉成品是纯蓝 SaaS 登录页**，产品要的"校园温度"在像素层面零体现。
> 取代：`视觉SaaS化-第一性诊断与事前预防-2026-06-01.md`（事前预防方向正确，但根因定位偏了——这份是修订版）
> 范围：`.claude/skills/design-planner/` 的 SKILL.md / methodology / note-templates / schema-spec 全套重构 + 配套 schema 字段 + MCP 改造
>
> ⚠️ 本文不再讨论"AI 没视觉感知"——上一份诊断把责任推给了 AI 视觉缺陷，错。**真正的根因是 design-planner 把"设计任务"拆成了"按字段类别填表"，专业设计师的"目标驱动"工作流被流程仪式吃掉了。**

---

## 0. TL;DR — 30 秒看懂

```
当前 design-planner v3 流程：
  emotion (字段) → concept (字段) → strategy (字段)
  → 自创 craft 任务（实际成了 fix-issue 任务）
  → styles 任务一次给 33 节点写样式
  → states 任务一次给 33 节点写状态
  → materials 任务给所有需要素材的节点写 spec
  → self-review 5 维评分

设计师真实工作流：
  分析产品定位 → 分析页面价值 → 提炼设计目标（≥3 个具体目标）
  → 每个目标拆"涉及哪些元素 + 各元素需要做什么样式/结构/装饰/素材改动"
  → 每个目标作为一个独立 craft 任务执行（多元素协同改动）
  → 整屏对账 vs 目标判据

差距：
  当前流程没有"设计目标 → 元素 → 改动"的契约链
  → emotion / concept / strategy 是抽象推理孤岛
  → styles 是按节点遍历填字段
  → 推理与落档之间断裂 → 像素层面必然向 prior 收敛 = SaaS

修复：
  把"设计目标"做成 SKILL 的一等公民
  让"styles / states / materials / decorations"沦为 craft 任务的子手段
  craft 任务=为达成某目标做多元素全维度协同改动
```

---

## 1. 第一性诊断：当前 skill 错在哪

### 1.1 任务结构按"字段类别"拆，不按"设计目标"拆

当前 `design-planner/SKILL.md` Phase 1 给出的屏级任务清单：

```
D-X-briefing       → 写 briefing.md + 屏级 meta.briefing
D-X-concept        → 写 concept.md + 屏级 meta.visualConcept
D-X-strategy       → 写 strategy.md + 屏级 meta.visualStrategy
D-X-task-planning  → 自创 craft 任务（≥3 个）
D-X-emotion        → 写 emotion.md
D-X-hierarchy      → 写 hierarchy.md
D-X-budget         → 写 budget.md
D-X-decorations    → 加装饰节点
D-X-styles         → 一次给所有节点写 styles    ← 按字段类别拆
D-X-states         → 一次给所有节点写 visualStates ← 按字段类别拆
D-X-materials      → 一次给需要素材的节点写 spec ← 按字段类别拆
D-X-self-review    → 整屏 5 维评分
D-X-meta / tree-redlines / coverage / integrity
```

**第一性问题**：

`styles` / `states` / `materials` / `decorations` 是 schema 的**字段类别**，不是设计的**任务类别**。专业设计师不会先把所有元素的"颜色"全画完、再把所有元素的"状态"全画完——而是抓一个目标（如"让 CTA 成为视觉主角"），把这个目标涉及的几个元素的颜色/字号/状态/装饰**一起调整到位**，然后看下一个目标。

按字段类别拆任务的后果：

| 字段类别任务 | AI 实际怎么做 | 失能 |
|---|---|---|
| `D-X-styles`（一次写 33 节点）| 按节点列表遍历填表 | 没人问"这个节点的样式是为达成什么目标？" |
| `D-X-states`（一次写 33 节点状态）| 按节点列表遍历填 | 没人问"这个状态切换在视觉上服务于什么？" |
| `D-X-materials`（一次写所有需素材节点）| 按节点列表遍历填 | 没人问"这个素材是为传递什么视觉信号？" |
| `D-X-decorations`（一次加装饰节点）| 按 budget 给的装饰名单加 | 没人问"这装饰服务于哪个设计目标？" |

→ 4 类填字段任务的合集 = "schema 全部字段非空"，但**没有一个任务的目标是"完成某个产品价值传递"**。

### 1.2 推理产物（emotion/concept/strategy）与落档（styles/states/materials）之间没有契约链

读该项目实际产物：

```
concept.md 写 moodBoard = ["晨光教室窗格","木桌笔记本","操场跑道弧线","公告板便签"]
strategy.md 写 装饰系统 = soft-glow，密度 = 节制，rejectedSystems = [illustration]
styles.md 给 33 个节点的 styles 全量
materials.md 给 4 个 materialSpec
```

**第一性问题**：

concept.md 里的 4 个 moodBoard 词从未在 styles.md / materials.md / decorations.md 里被引用。strategy.md 否决 illustration，但同一文档的 moodBoard 4 个具象场景需要 illustration 才能被翻译——内部矛盾在文字层就形成了。

**这不是"AI 没把推理翻译到 schema"——这是 SKILL 的产物结构本身就让推理与落档不可能形成契约**：

- emotion / concept / strategy 落到 `screen.meta.design.{emotion, visualConcept, visualStrategy}`
- styles 落到 `node.styles`
- 两者之间**没有"目标 ID"作为外键**——meta.visualConcept 不知道哪些 node.styles 是它的实现产物，反过来也不知道某个 node 的 styles 是为了实现 visualConcept 的哪一句

→ AI 写 styles 时不可能从 visualConcept 反查"这条样式服务的是哪个设计目标"——因为这种连接在 schema 里根本不存在。

### 1.3 craft 任务异化为"fix-issue 任务"，不是"achieve-goal 任务"

理论上 `D-X-task-planning` 是该 skill 唯一支持目标驱动的口子（"基于 strategy 自创 craft 任务"）。但该项目实际产出的 5 个 craft：

```
1. craft-brandlogo            → 修 BrandLogo 占位虚线
2. craft-decoration-rebalance → 修装饰透明度
3. craft-tab-indicator        → 修 ModeToggle 缺指示线
4. craft-checkbox             → 修 native checkbox 黑块
5. craft-typography-refresh   → 修字重过粗
```

**全部是 "ISSUE-N → fix" 形式的修补任务**，没有一个是"为达成校园温度做 X / 为让 CTA 成为主角做 Y"形式。

**第一性问题**：

SKILL.md §4.X 的 `D-X-task-planning` 任务说明里没有要求"craft 任务必须挂在某个具体设计目标下"。AI 看到任务描述"基于 strategy 自创 craft 任务"，自然把它理解为"哪里有问题就 craft"——因为修 issue 是 SKILL 的高频奖励信号（self-review / known-issues / coverage 任务都鼓励"找问题→修问题"）。

→ "自创任务权"沦为"自创修补任务"，永远不会"自创为达成产品价值的整体性视觉任务"。

### 1.4 装饰 / 素材是"可选附件"，从未挂在"目标"下

methodology/06-decoration.md：装饰密度档位 = 极少 / 节制 / 中等 / 丰富，登录页归"极少 0-1 / 节制 1-2"。

methodology/04-decoration-categories.md：装饰元素 7 大类。

但 SKILL 没有问过："**为了达成 goal-X，装饰应该服务什么作用？**"——装饰被框成"屏级一次配额"（节制 1-2 个），不是"按目标拆分的视觉手段预算"。

后果：当 AI 拿到"节制 1-2 个装饰"的预算约束 + "soft-glow 单一族"的策略约束 + "minimal+flat" 的主题约束，**唯一一致解就是"加 1 个透明度 12% 的角落光斑"**——技术上满足配额，视觉上接近不存在。

### 1.5 用户的 7 个反问 → 当前 skill 失能逐条对账

| 用户反问 | 当前 skill 是否支持 | 失能定位 |
|---|---|---|
| AI 知道什么时候该用素材装饰，用什么颜色？ | ❌ | 装饰/素材任务独立于"设计目标"——AI 只能按预算配额加,不知道"为何要加""装饰要承载什么信号" |
| AI 知道每个元素如何契合主题、丰富视觉呈现产品？ | ❌ | styles 任务是 33 节点遍历——节点不知道"它的样式服务于哪个产品价值" |
| AI 知道每个元素的视觉权重让整体页面和谐？ | ⚠️ | budget.md 算了 weight 但没把权重挂在某个目标下；权重金字塔与"goal 重要度"无关联 |
| AI 知道为某交互视觉效果需多少元素协作？ | ❌ | 缺"协同视觉"作为一等任务概念；methodology/09 提到了但没流程支撑 |
| AI 知道基于设计目的新建任务,针对元素做素材调整(不是 css 调试)？ | ❌ | 自创任务退化成 fix-issue；从未基于"达成某产品价值"自创任务 |
| AI 知道系统结合产品+主题分析出视觉任务,逐个调整元素样式？ | ❌ | "系统性"在 SKILL 里被理解为"覆盖完所有 33 节点 styles"，不是"系统性达成 N 个产品价值" |
| AI 知道结合系统思考设计装饰元素和整体布局？(这阶段可调元素布局) | ⚠️ | 创作权 4「布局调整权」是有的（element/wrap/move），但 §5.4 边界说明把它框成"修补结构性 issue"——不是"为达成视觉目标系统性重组布局" |

→ **6 个 ❌ + 2 个 ⚠️**——当前 skill 在用户预期的"专业设计师"维度上系统性失能。

### 1.6 第一性结论

不是 AI 看不见图，不是流水线接力错，不是 token 选错。

是 **design-planner 的任务结构、产物结构、契约结构都按"schema 字段类别"组织，与"设计目标驱动"的设计师工作流根本错位**。

修复方向不是"再加红线 / 再加自审 / 再加机器对账"——是把**设计目标**做成 SKILL 的一等公民、所有其他产物（styles / states / materials / decorations）沦为目标的实现手段。

---

## 2. 真正的设计师工作流（基于第一性 + 行业实践）

### 2.1 专业设计师的真实工作流（11 步）

| 步 | 阶段 | 产物 | 关键问题 |
|---|---|---|---|
| 1 | Brief 阅读 | 笔记 | 产品给谁? 解决什么? 与竞品差异? |
| 2 | 灵感与参考 | mood board / 参考截图 | 这个调性应该长什么样? |
| 3 | **定义设计目标** ★ | 目标清单 | 这屏要传递哪些视觉信号? 如何衡量达成? |
| 4 | Wireframe | 信息结构 | 信息怎么排,用户视线怎么走? |
| 5 | **视觉权重金字塔** | 权重表 | 谁是主角 / 谁是配角 / 谁退后? |
| 6 | 风格探索 | 调色 / 字体 / 形状基调 | 从 token 出发选哪条路? |
| 7 | **主角先做** ★ | 主角节点完整视觉 | CTA / Hero / 关键卡片定调 |
| 8 | **配角配合** | 周围节点视觉 | 配角衬托主角,不抢戏 |
| 9 | **装饰服务氛围** ★ | 装饰节点 / 素材 | 装饰承载什么情感? 不是凑数 |
| 10 | **状态全维度** | 各 visualState | 每态视觉差异是否服务于反馈目的? |
| 11 | **对照目标 review** | 截图 vs 目标 | 每个目标在像素层面达成了吗? |

★ 标注的就是**当前 skill 缺失或弱化的环节**。

### 2.2 当前 skill 产物 vs 设计师真实产物

| 设计师真实产物 | 当前 skill 对应产物 | 差距 |
|---|---|---|
| 产品/页面定位笔记 | briefing.md | ✓ 有,但与下游脱节 |
| mood board / 参考截图 | concept.md（仅文字 mood word）| ❌ 没有真实参考图 |
| **设计目标清单（≥3 个）** | ❌ 不存在 | 这是 SKILL 最大缺口 |
| Wireframe / 信息结构 | tree-redlines.md | ⚠️ 关注的是结构合规,不是信息层级服务于目标 |
| 视觉权重金字塔 | budget.md | ⚠️ 算了 weight 但与目标无关联 |
| 调色 / 字体 / 形状 | strategy.md（5 维）| ⚠️ 抽象 5 维,不与目标耦合 |
| **主角节点完整视觉** | styles 任务一次性 batch | ❌ 主角和配角同时做,失去主从关系 |
| **目标驱动的装饰** | decorations 任务 + materials 任务 | ❌ 装饰 / 素材独立任务,不挂目标 |
| **状态服务于反馈目的** | states 任务一次写 48 个 visualState | ❌ 按节点遍历,不问"这态的视觉差异服务什么?" |
| **对照目标 review** | self-review 5 维评分 | ❌ 5 维抽象评分,不对照"具体目标判据" |

→ 设计师工作流的**目标层、主角先行层、对账层**这 3 个关键环节在当前 skill 中要么不存在,要么被字段类别遍历压平。

---

## 3. design-planner v4 — 8 Phase 目标驱动流程

### 3.1 总览

```
Phase 0  入场门禁                  ← 不变
Phase A  三层定位分析              ← 升级:产品 → 页面 → 用户三层
Phase B  设计目标提取（核心新增）   ← ★ 列出 ≥3 个具体可视判据的设计目标
Phase C  目标 → 元素拆解（核心新增）← ★ 每个目标拆"涉及哪些元素 + 全维度改动"
Phase D  跨目标统筹                ← 升级:权重金字塔 / 装饰系统 / 60-30-10 都从目标推导
Phase E  任务派发                  ← 升级:每个 craft 任务 = 1 个目标的执行
Phase F  craft 任务落库            ← 升级:每任务对一组元素做全维度改动 + 截图对账目标判据
Phase G  整屏对账与移交            ← 升级:对账以 designGoals 为准
```

**关键变化（一句话）**：

- 不再有 `D-X-styles` / `D-X-states` / `D-X-materials` / `D-X-decorations` 4 类按字段独立任务
- 取而代之是 `D-X-goal-1-craft` / `D-X-goal-2-craft` / ... 按目标拆的复合任务
- 每个 goal-craft 任务**一次性**改动相关元素的 styles + states + materials + 装饰节点 + 布局
- 所有 goal-craft 完成后,跑兜底任务 `D-X-coverage-fallback` 给未被任何 goal 覆盖的节点补默认 styles

### 3.2 Phase 0：入场门禁（不变）

保留 v3 现有五查：targetUser / globalConcerns / theme.customized / 屏 phase / integrity。

新增一查：
- **⑥ 检查上游产物是否包含足够"产品价值"信号**：`project.meta.styleDirection` / `targetUser` / `coreScenarios` 是否含"为什么用户来"+"用户期待感受"。任一缺位 → 退回 product-analyst 补。否则 design 阶段无法基于产品价值提炼设计目标。

### 3.3 Phase A：三层定位分析（升级版）

**产物**：`design/<screenId>/positioning.md` + `screen.meta.design.positioning`

#### 三层

```
Layer 1 - 产品定位（来自 project.meta）
  - 这个产品给谁？解决什么核心问题？
  - 视觉差异化机会在哪？（列 ≥2 个竞品视觉特征作对照）
  - 用户对它的视觉期待 = 什么调性？

Layer 2 - 页面定位（来自 screen.meta + interaction）
  - 这屏在用户旅程的哪一步？从哪来,到哪去？
  - 这屏对用户的核心收益（≤30 字）
  - 这屏对产品的核心目标（≤30 字）

Layer 3 - 用户场景（来自 product.coreScenarios）
  - 用户来时的心理状态、情绪、紧迫度
  - 用户离开此屏的心理状态期望
  - 这屏的"视觉时机"——0.5 秒看到什么 / 5 秒理解什么 / 30 秒决策什么
```

#### 强制推理段

- **竞品视觉对照**：≥2 个真实存在的竞品产品的视觉特征对照（什么色 / 什么装饰密度 / 什么字号节奏 / 什么形状基调）。**禁止凭印象**——若上游 `targetUser.dailyApps` 字段未列举 daily 使用产品,本阶段先发 UpstreamChallenge 让 product-analyst 补。
- **视觉差异化机会**：基于竞品对照,本产品在视觉上能站什么位？（不是"和大家一样安全"——是"和大家有什么差异"）

### 3.4 Phase B：设计目标提取（★ 核心新增）

**产物**：`design/<screenId>/design-goals.md` + `screen.meta.design.designGoals[]`

#### 设计目标的结构

```jsonc
designGoals: [
  {
    id: "G1",
    statement: "让校园用户进登录页 0.5 秒感受到清晨教室般的温度，降低注册防备",
    whyMatters: "用户带'略防备'情绪进入；视觉先安抚=注册转化的前置条件",
    impactMode: "mood-conveyance",     // mood-conveyance / cta-clarity / trust-signal / hierarchy / state-feedback / brand-recognition / decoration-storytelling
    successCriteria: [
      "首屏视线落在屏底+BrandLogo，色彩温度感优先于工具感",
      "无任何冷峻 SaaS 信号（纯白底 / 直角 / 灰阶过多）",
      "≥2 个具象校园场景元素被视觉感知（色斑/插画/纹理任选）"
    ],
    priority: "P0",
    measureMethod: "snapshot 看图 + 与 visualReferences 色彩气质相似度 ≥ 0.6"
  },
  {
    id: "G2",
    statement: "让 SubmitBtn 成为首屏唯一主角，用户视线第二跳必落于此",
    whyMatters: "登录是过路屏，CTA 不抢眼=用户停留过长=放弃率上升",
    impactMode: "cta-clarity",
    successCriteria: [
      "SubmitBtn 视觉权重 ≥ 8（满分 10），周围节点 ≤ 4",
      "SubmitBtn 与 GetCodeBtn 字色对比明显，不混淆主次",
      "SubmitBtn 在 default / hover / pressed / loading / disabled 5 态视觉差异 ≥ 显著"
    ],
    priority: "P0"
  },
  {
    id: "G3",
    statement: "让协议勾选不像被强制，而像主动同意",
    whyMatters: "合规红线但易引起反感；视觉降焦虑=合规转化率",
    impactMode: "state-feedback",
    successCriteria: [
      "checkbox 视觉为'圆润主色对勾'非'灰冷方框'",
      "未勾 → 勾选切换有'被点亮'微动效",
      "错误态文案非红色暴击，而是邻近色"
    ],
    priority: "P1"
  }
  // ... ≥3 个,≤7 个
]
```

#### 数量与质量约束

- **数量**：≥3 个,≤7 个。少于 3 个 = 抽不出有效目标；多于 7 个 = 没抓住主要矛盾,目标稀释
- **每个目标必须包含 5 字段**：`statement` / `whyMatters` / `impactMode` / `successCriteria[]` / `priority`
- **statement 强制具象**：含动词（让 / 降低 / 提升）+ 主体（用户 / 元素）+ 视觉机制（色 / 形 / 状态切换 / 装饰）
- **successCriteria 强制可视判据**：禁止"主题契合度高"这种抽象描述；必须"首屏 0.5 秒看到 X"或"与 Y 元素的对比 ≥ Z"

#### 反例（禁止写成这样）

```
❌ G1: 让登录页有校园温度
   理由: statement 抽象,无动词无主体,successCriteria 不可视

❌ G2: 让用户感觉舒服
   理由: "舒服"无可视判据

❌ G3: 让 UI 看起来现代化
   理由: "现代化"是设计 prior 表达,非产品价值
```

#### 正例（强制照抄结构）

```
✅ G1: 让用户进登录页 0.5 秒感受到清晨教室般的温度，降低注册防备
   动词=感受到; 主体=用户; 视觉机制=色温+具象场景; 判据=首屏视线+色彩气质相似度
```

### 3.5 Phase C：目标 → 元素拆解（★ 核心新增）

**产物**：每目标 1 份 `design/<screenId>/goals/G<N>.md` + `screen.meta.design.goalElementMap`

#### 每个目标的拆解结构

```jsonc
// design-goals.md 末尾或独立 G1.md 文件
{
  goalId: "G1",

  // === 1. 涉及元素扫描 ===
  involvedElements: [
    { nodeId: "screen", nodeType: "screen", role: "主体" },         // 屏底 = 大面积色温载体
    { nodeId: "BrandLogo", nodeType: "img", role: "主角" },         // Logo = 品牌温度第一信号
    { nodeId: "BgBlobTopRight", nodeType: "div", role: "装饰" },    // 装饰 = 强化氛围
    { nodeId: "BgBlobBottomLeft", nodeType: "div", role: "装饰" },  // 新增装饰
    { nodeId: "FormCard", nodeType: "div", role: "邻居" }           // 邻居 = 不能与温度调性冲突
  ],

  // === 2. 元素改动清单（按维度,不按节点）===
  changes: {
    styles: [
      // 屏底从 #FCFCFD（与白几乎一样）→ 改为 hsl(38, 30%, 96%)（米白偏暖）+ 给 FormCard 阴影偏暖
      { nodeId: "screen", patch: { backgroundColor: "$token:colors.warmCanvas" /* 新 token */ } },
      { nodeId: "FormCard", patch: { boxShadow: "$token:shadows.warmSoft" /* 新 token */ } }
    ],
    structure: [
      // 加 BgBlobBottomLeft 装饰节点
      { action: "element/add", parent: "screen", node: { name: "BgBlobBottomLeft", type: "div", styles: {...} } }
    ],
    materials: [
      // BrandLogo 调用 material-painter 画字标 C（非占位虚线）
      { nodeId: "BrandLogo", brief: { goal: "G1 校园温度", concept: "暖白米/大圆角柔和", tokens: ["primary", "primaryLight"], size: "120x120", failureCase: "v1 1.5px 边框看不见" } }
    ],
    visualStates: [
      // 本目标不涉及 visualState（mood 是默认态体验）
    ],
    layout: [
      // 调 BrandLogo 上方 padding 从 spacing.lg → spacing.2xl,给 logo 视觉呼吸
      { nodeId: "Root", patch: { paddingTop: "$token:spacing.2xl" } }
    ]
  },

  // === 3. 视觉权重分配（仅本 goal 内）===
  weightAllocation: {
    BrandLogo: 7,       // goal 内主角
    screen: 5,          // 主体载体
    BgBlobTopRight: 3,  // 装饰
    BgBlobBottomLeft: 3,
    FormCard: 4         // 邻居,不抢戏
  },

  // === 4. 协同关系（依据 methodology/09-coordinated-visual.md）===
  coordination: {
    主体: "screen",                // 大面积色温载体
    主角: "BrandLogo",             // 第一视觉锚点
    邻居: ["FormCard"],            // 配合,不抢戏
    父容器: "Root",                // 提供视觉呼吸（上方留白）
    装饰: ["BgBlobTopRight", "BgBlobBottomLeft"]  // 强化氛围
  },

  // === 5. 达成判据 ===
  measure: {
    snapshotCheck: "首屏（safe-area 内）视线热点应落在 BrandLogo + 屏底偏暖区",
    refSimilarity: "若 visualReferences 已挂,色彩气质相似度 ≥ 0.6",
    forbiddenSignals: [
      "屏底 #FFFFFF 或与之差 ≤ 1pt",   // 温度感的直接反例
      "纯灰阶占比 > 40%",
      "任何直角元素出现"
    ]
  }
}
```

#### 关键约束

- **每个目标必涉及 ≥2 个元素**——单元素的目标说明拆得不够；视觉是协同的
- **每个目标的 changes 必须涵盖 ≥2 个维度**（styles / structure / materials / visualStates / layout）——单维度的目标实质上是字段调整,不是设计目标
- **goalElementMap 落库**：service 端记录"哪些元素被哪些目标涉及"，用于 Phase F 跨目标冲突检测

#### 跨目标冲突检测（service 端机器对账）

```
冲突 1: 同一元素被 ≥2 个目标涉及但 changes 矛盾
  → 抛出 R-GOAL-CONFLICT-01
  → AI 必须在 Phase D 跨目标统筹时解决

冲突 2: 元素权重在不同目标里差异 ≥ 4
  → 抛出 R-GOAL-CONFLICT-02
  → AI 必须在 Phase D 取最高权重 / 重新分配
```

### 3.6 Phase D：跨目标统筹（升级版）

**产物**：`design/<screenId>/cross-goal-strategy.md` + `screen.meta.design.visualStrategy`（升级版）

#### 强制流程

```
Step 1: 元素 × 目标 矩阵
  纵轴: 屏内所有节点
  横轴: 所有目标 G1/G2/.../GN
  单元: 该元素在该目标里的权重 + 角色（主体/主角/配角/邻居/装饰/未涉及）

Step 2: 元素权重终值（取多目标里最高权重）
  → 形成全屏视觉权重金字塔（top 1-2 主角 / 配角 3-5 / 辅助 ≥5 / 装饰）

Step 3: 装饰系统单一族选定
  → 来自所有目标 changes.materials + changes.structure 的装饰需求统计
  → 取频次最高且与 theme.intent 不冲突的装饰族（soft-glow/geometric-line/illustration/texture/organic-curve）
  → 频次 < 总目标数 * 50% → 装饰系统不足以承载,UpstreamChallenge 让 theme 调 decoration token

Step 4: 60-30-10 调色比例（按目标累积）
  → 60% 来自 G1（mood-conveyance）的色温载体
  → 30% 来自 G2（cta-clarity）的功能色
  → 10% 来自其他目标的强调色
  → 与 theme.tokens 引用名映射

Step 5: 形状语言 / 字号节奏 / 律动节奏（按 theme + goal 偏好累积）
  → 形状: 圆角档位（G1 偏柔/G2 偏锐 → 取折中或主从分层）
  → 字号: 主角字号梯度从 G2 推 / 文案字号从 G3 推
  → 律动: 间距档位 from theme + 各目标的留白需求
```

#### 关键变化

- 旧 strategy.md 5 维（色/字/形/饰/律）**与目标无关联**——抽象艺术家自言自语
- 新 cross-goal-strategy.md 5 维**全部从目标推导**——每个维度的取值有溯源依据

### 3.7 Phase E：任务派发（升级版）

**产物**：`design/<screenId>/task-planning.md` + `meta/add_plan_tasks` 挂任务

#### 任务清单结构（严格按目标派发）

```jsonc
// 每个目标 1 个 craft 任务
{ id: "D-X-G1-craft", title: "G1 craft: 校园温度氛围（屏底/Logo/装饰多元素协同）",
  stage: "design", status: "pending",
  expectedArtifacts: [
    { kind: "goalSuccessCriteriaMet", goalId: "G1", screenId: "X" }
    // service 端跑 snapshot + 对账 G1.successCriteria 每条
  ]
}

{ id: "D-X-G2-craft", title: "G2 craft: SubmitBtn 主角化（CTA + 周围节点视觉权重再分配 + 5 态视觉差异）",
  stage: "design", status: "pending",
  expectedArtifacts: [
    { kind: "goalSuccessCriteriaMet", goalId: "G2", screenId: "X" }
  ]
}

{ id: "D-X-G3-craft", title: "G3 craft: 协议勾选降焦虑（checkbox/text/error 协同）",
  ...
}

// 兜底覆盖任务（覆盖未被任何 goal 涉及的节点）
{ id: "D-X-coverage-fallback", title: "覆盖兜底: 未被 goal 涉及的节点写默认 styles + 必要 visualState",
  stage: "design", status: "pending",
  expectedArtifacts: [
    { kind: "uncoveredNodesMinimalStyles", screenId: "X" }
    // 所有未在 goalElementMap 的节点必须有最小 styles + 交互节点必须有 focus/disabled
  ]
}

// 整屏自审（基于所有 goal 累积对账）
{ id: "D-X-self-review-by-goals", title: "整屏自审: 逐 goal 截图对账 + 跨 goal 协调度",
  stage: "design", status: "pending",
  expectedArtifacts: [
    { kind: "allGoalsCriteriaMet", screenId: "X" }
  ]
}
```

#### 关键变化对比

| 旧 v3 任务 | 新 v4 任务 |
|---|---|
| `D-X-styles` 一次性写所有节点样式 | ❌ 删除 — 拆到各 goal-craft 中 |
| `D-X-states` 一次性写所有 visualState | ❌ 删除 — 拆到各 goal-craft 中 |
| `D-X-materials` 一次写所有素材 spec | ❌ 删除 — 拆到各 goal-craft 中 |
| `D-X-decorations` 一次加所有装饰 | ❌ 删除 — 拆到各 goal-craft 中 |
| `D-X-craft-*` 修补型 craft（5 个修 issue 的）| ✅ 保留但**重定义为目标驱动**: G1-craft / G2-craft / ... |
| 缺位 | ✅ 新增 `D-X-coverage-fallback` 兜底未涉及节点 |
| 缺位 | ✅ 新增 `D-X-self-review-by-goals` 按目标对账 |

### 3.8 Phase F：craft 任务落库（升级版）

**每个 goal-craft 任务的执行流**：

```
Step 1: read goal G<N>.md 拿到 involvedElements / changes / coordination / measure
Step 2: read screen_schema 拿到涉及节点的当前状态
Step 3: 写 craft md：
  - 重述本目标 + successCriteria
  - 列每个涉及元素的当前状态 vs 目标状态
  - 改动方案（多元素协同改动的具体清单）
  - 预期视觉效果描述
Step 4: 落库（按 changes 维度分批调 MCP）：
  Step 4.1 layout 改动 → element/add / wrap / move
  Step 4.2 structure 改动 → 装饰节点 element/add
  Step 4.3 styles 改动 → style/update / batch_update（仅本目标涉及节点）
  Step 4.4 visualState 改动 → visual_state/add / update
  Step 4.5 materials 改动 → 调 material-painter（brief 仅给目标+概念,不给施工）
                             + applyMaterialDesign 写 materialProjectId
Step 5: 截图（generate_snapshots）
Step 6: 对账 successCriteria 每一条：
  - 任一不达 → 改动 + Step 5 重做（最多 3 轮）
  - 全达 → 标 done
Step 7: meta/update_plan_task done + expectedArtifacts 自动机器对账
  service 端跑 goalSuccessCriteriaMet 校验
```

#### 关键约束

- **每个 craft 任务一次性改动多个元素的多个维度**——这正是设计师的工作模式
- **不允许"先做 styles 再做 states 再做 materials"**——这是 v3 字段类别拆分的复活,禁止
- **截图对账强制**——goalSuccessCriteriaMet 不达 ≥3 轮 → 自动挂 UpstreamChallenge

### 3.9 Phase G：整屏对账与移交（升级版）

```
Step 1: 跑 D-X-coverage-fallback 任务,补未涉及节点
Step 2: 跑 D-X-self-review-by-goals 任务
   - 逐 goal 截图（generate_snapshots mode=frame）
   - 对照每个 goal.successCriteria 打分（每条 0/1）
   - 任一 goal 整体得分 < 80% → 重回该 goal-craft 任务
Step 3: 跨屏 audit（D-audit）
Step 4: handover.md（含每 goal 的截图证据 + successCriteria 对账表）
Step 5: 标屏 phase=designed,通知 design-executor
```

---

## 4. design-planner v4 SKILL.md 主体（草案）

> 严格遵守 skill-creator 规范：imperative form / 第三人称 / progressive disclosure（< 5k words）。
> 完整 SKILL.md 写入 `.claude/skills/design-planner/SKILL.md`,详细方法论拆到 `references/methodology/`。

```markdown
---
name: design-planner
description: Visual / UI design skill — Schema-First v2 pipeline stage 4 (v4 goal-driven). Triggers when interaction-designer has finished and a project's screens are at phase=interaction-defined. Transforms product rules + interaction specs into precise visual design via 8-Phase goal-driven workflow: Phase A 三层定位 → Phase B 提炼 ≥3 个具体可视判据的设计目标 → Phase C 每目标拆"涉及元素 + 多维度改动" → Phase D 跨目标统筹 → Phase E 按目标派发 craft 任务（取代旧的 styles/states/materials/decorations 字段类别任务）→ Phase F 每个 craft 任务一次性改动多元素多维度 + 截图对账目标判据 → Phase G 整屏对账以 designGoals 为准。每个设计决策回答"为达成哪个目标 / 涉及哪些元素 / 怎么协同改动 / 如何衡量达成"。
---

# design-planner — 资深 UI/视觉设计师（流水线第 4 棒,v4 目标驱动）

## 1. 角色定位

资深企业级 UI/视觉设计师。**目标驱动的视觉创作者,不是字段填写员**。

工作方式按真实设计师流程：先理解产品要传递什么 → 提炼具体设计目标 → 每个目标拆解"涉及哪些元素 + 各元素需要做哪些样式/结构/装饰/素材协同改动" → 多元素一起改动到位 → 截图对照目标判据。

**v4 核心信念**：

- **设计目标是一等公民**——所有 styles / states / materials / decorations / 布局都是某个目标的实现手段
- **多元素协同 > 单元素遍历**——视觉效果是若干元素一起协作出来的,不是按节点列表挨个填
- **目标判据是机器可对账的**——每个目标自带 ≥3 条 successCriteria,截图后逐条核对

**v4 与 v3 的本质差异**：

| 维度 | v3 | v4 |
|---|---|---|
| 任务粒度 | 按字段类别（styles 任务/states 任务/materials 任务）| 按设计目标（G1-craft/G2-craft/...）|
| 推理产物 | emotion/concept/strategy 抽象 5 维孤岛 | positioning + designGoals + goalElementMap 串联 |
| craft 含义 | "fix-issue 修补任务" | "achieve-goal 协同任务" |
| 装饰 / 素材角色 | 屏级独立任务,可跳过 | 必挂在某个 goal 下,不挂不存在 |
| 自审契约 | 5 维抽象评分 AI 自填 | 逐 goal 截图对账 successCriteria |

## 2. 流水线位置

```
product-analyst       rules / 节点骨架 / dataSources
       ↓
theme-generator       Token / decoration / iconSpec
       ↓
interaction-designer  events / state.view / dataSources.mock / 衍生视图
       ↓
[design-planner v4]   ← 这里
       ↓
design-executor       QA 摄影师（截图核对 + 终验）
```

下游 executor 退化为 QA 摄影师,所以本阶段必须把素材也画完（自调 material-painter）。

## 3. 8 Phase 工作流（核心）

### Phase 0 — 入场门禁

read_file: STAGE-CONTRACT §0.1.7 + §4 / methodology/00-design-thinking.md / methodology/01-positioning.md

执行：
1. query/list_projects → 找到 projectId
2. query/project_info → 入场六查（v4 新增 ⑥）：
   ① project.meta.targetUser / coreScenarios / styleDirection / modules / navigation
   ② project.meta.globalConcerns 5 类齐
   ③ project.theme.customized=true 且 theme/validate 0 error
   ④ 所有屏 phase ≥ "interaction-defined"
   ⑤ query/integrity 0 个 R-EVENTS-* / R-PHASE-* / R-PLAN-* 错误
   ⑥ ★ v4 新增 — project.meta.targetUser.dailyApps / styleDirection 含足够"产品价值"信号；缺位退回 product-analyst
3. theme/get → 拉 ThemeConfig 完整快照
4. query/list_screens → 过滤 phase=interaction-defined
5. query/list_open_challenges { targetStage: 'design' } → 有 open 跳 §11
6. query/next_pending_task → 拿任务

### Phase A — 三层定位分析

**任务 ID**：`D-X-positioning`
**产物**：design/<screenId>/positioning.md + screen.meta.design.positioning
**必读**：methodology/01-positioning.md / note-templates/positioning.template.md

执行：
1. 读 product/theme/interaction
2. 写 positioning.md 三层（产品定位 / 页面定位 / 用户场景）
3. 强制段：≥2 个真实竞品视觉对照（若 targetUser.dailyApps 缺位 → 发 UpstreamChallenge）
4. 落 screen.meta.design.positioning

### Phase B — 设计目标提取（★ 核心）

**任务 ID**：`D-X-design-goals`
**产物**：design/<screenId>/design-goals.md + screen.meta.design.designGoals[]
**必读**：methodology/02-goal-extraction.md / note-templates/design-goals.template.md

执行：
1. 基于 positioning + theme + interaction → 提炼设计目标
2. 数量：≥3,≤7
3. 每个目标 5 字段：statement / whyMatters / impactMode / successCriteria[] / priority
4. statement 强制具象（含动词+主体+视觉机制）
5. successCriteria 强制可视判据
6. 落 screen.meta.design.designGoals[]
7. expectedArtifacts: { kind: 'arrayMin', path: 'meta.design.designGoals', min: 3 }
                   + { kind: 'eachItem', path: 'meta.design.designGoals',
                       check: { kind: 'hasKeys', path: '$', keys: ['id','statement','whyMatters','impactMode','successCriteria','priority'] } }

### Phase C — 目标 → 元素拆解（★ 核心）

**任务 ID**：每目标 1 个 `D-X-G<N>-decompose`
**产物**：design/<screenId>/goals/G<N>.md + screen.meta.design.goalElementMap
**必读**：methodology/03-goal-decomposition.md / methodology/04-multi-element-coordination.md

执行（对每个目标 G<N>）：
1. 读 query/screen_schema 拿全屏节点
2. 列 involvedElements（≥2 个）+ 每元素的角色（主体/主角/配角/邻居/装饰）
3. 列 changes（styles + structure + materials + visualStates + layout，至少涵盖 2 维度）
4. 列 weightAllocation（本 goal 内各元素权重）
5. 列 coordination 关系（4 角色：主体/邻居/父容器/装饰）
6. 列 measure（snapshotCheck + refSimilarity + forbiddenSignals）
7. 落 screen.meta.design.goalElementMap

### Phase D — 跨目标统筹

**任务 ID**：`D-X-cross-goal-strategy`
**产物**：design/<screenId>/cross-goal-strategy.md + screen.meta.design.visualStrategy
**必读**：methodology/05-cross-goal-audit.md / methodology/06-decoration-system.md

执行：
1. 元素 × 目标 矩阵
2. 元素权重终值（取最高）
3. 装饰系统单一族选定（按目标频次）
4. 60-30-10 比例从目标累积
5. 形状/字号/律动从 theme + 目标偏好累积
6. 落 screen.meta.design.visualStrategy

### Phase E — 任务派发

**任务 ID**：`D-X-task-planning`
**产物**：design/<screenId>/task-planning.md + meta/add_plan_tasks 挂 N 个 goal-craft 任务

执行：
1. 对每个 G<N> 挂一个 `D-X-G<N>-craft` 任务，expectedArtifacts: { kind: 'goalSuccessCriteriaMet', goalId: 'G<N>' }
2. 挂 1 个兜底任务 `D-X-coverage-fallback`
3. 挂 1 个整屏对账任务 `D-X-self-review-by-goals`

### Phase F — craft 任务落库

**任务 ID**：`D-X-G<N>-craft`
**产物**：design/<screenId>/craft-G<N>.md + 多元素 schema 落库
**必读**：methodology/07-craft-execution.md / methodology/08-coordinated-render.md / pitfalls/composite-patterns.md

执行（对每个 goal-craft）：
1. read G<N>.md 拿目标定义
2. read screen_schema 拿涉及节点当前状态
3. 写 craft md（重述目标 + 当前 vs 目标 + 改动方案 + 预期效果）
4. 落库（按维度分批,但同一任务内执行）：
   4.1 layout / structure → element/add / wrap / move
   4.2 styles → style/update（仅本目标涉及节点）
   4.3 visualStates → visual_state/add / update
   4.4 materials → material-painter brief（仅目标+概念,禁施工图）+ applyMaterialDesign
5. generate_snapshots
6. 对账 successCriteria 逐条
7. 任一不达 → Step 4 重做（≤3 轮）
8. 全达 → meta/update_plan_task done

### Phase G — 整屏对账与移交

**任务 ID**：`D-X-coverage-fallback` / `D-X-self-review-by-goals` / `D-handover`

执行：
1. coverage-fallback：补未涉及节点的最小 styles + 交互节点 focus/disabled
2. self-review-by-goals：逐 goal 截图对账 + 跨 goal 协调度
3. 跨屏 audit
4. handover.md
5. phase=designed → 通知 executor

## 4. 红线（v4 重写）

### 4.1 任务结构红线

- ❌ 创建任何按字段类别的任务（D-X-styles / D-X-states / D-X-materials / D-X-decorations）→ 立即拒
- ❌ goal 数量 < 3 或 > 7 → R-GOAL-COUNT 拒
- ❌ goal.successCriteria 含抽象描述（"主题契合"/"现代化"/"舒服"）→ R-GOAL-CRITERIA 拒
- ❌ goal.involvedElements < 2 → R-GOAL-DECOMPOSE 拒
- ❌ goal.changes 单维度 → R-GOAL-DIMENSION 拒

### 4.2 落库红线

- ❌ craft 任务先做 styles 再做 states（按维度顺序执行）→ 等同复活 v3 字段类别任务,拒
- ❌ craft 任务跳过 generate_snapshots → 拒
- ❌ goalSuccessCriteriaMet 不达 ≥3 轮仍标 done → R-CHALLENGE 自动挂 UpstreamChallenge
- ❌ goal 涉及元素被 craft 完全没改 → R-GOAL-COVERAGE 拒

### 4.3 素材 brief 红线（继承 v3.1）

material-painter brief 只能给目标+概念+约束，禁止 pathData/坐标/strokeWidth/hex 色值/构图层数。详见 §5.5。

## 5. 入场 / 出场门禁

| 时机 | 检查 |
|---|---|
| 入场 | □ project.meta 六查（v4 新增 ⑥）<br>□ theme.customized=true<br>□ 所有屏 phase ≥ interaction-defined<br>□ integrity 0 错误 |
| 出场 | □ 每屏 designGoals ≥3 + 全 successCriteria 已对账<br>□ 每屏 goalElementMap 完整<br>□ 每个 goal 都有对应 craft 任务 done<br>□ goalSuccessCriteriaMet 全过<br>□ coverage-fallback 已 done<br>□ phase=designed |

## 6. 单页项目特例

仍走 8 Phase。项目级任务（baseline/templates/audit）按需,task-planning 中说明跳过理由。

## 7. UpstreamChallenge

继承 v3 协议（见 §11）。新增触发场景：
- targetUser.dailyApps 缺位无法做 Phase A 竞品对照 → 退回 product-analyst
- theme 装饰系统不足以承载多目标需求 → 退回 theme-generator 调 decoration token

## 8. references/ 索引

详见 references/README.md。v4 重组：

```
methodology/
  00-design-thinking.md           ← 总纲（重写: 目标驱动心智）
  01-positioning.md               ← 三层定位方法
  02-goal-extraction.md           ★ 新增: 设计目标提取方法
  03-goal-decomposition.md        ★ 新增: 目标 → 元素拆解方法
  04-multi-element-coordination.md ★ 新增: 多元素协同视觉
  05-cross-goal-audit.md          ★ 新增: 跨目标统筹
  06-decoration-system.md         ← 升级: 装饰系统从 goal 推导
  07-craft-execution.md           ★ 新增: craft 任务执行流
  08-coordinated-render.md        ★ 新增: 多元素一次性落库
  09-self-review-by-goals.md      ← 升级: 按 goal 对账,非 5 维抽象
  10-material-brief.md            ← 继承 v3.1（painter brief 边界）
  11-layout-adjustment.md         ← 继承 v3
  12-state-visual-mapping.md      ← 继承 v3

note-templates/
  positioning.template.md         ★ 新增
  design-goals.template.md        ★ 新增
  goal-N.template.md              ★ 新增
  cross-goal-strategy.template.md ★ 新增
  craft-by-goal.template.md       ★ 新增（取代旧 craft-task）
  self-review-by-goals.template.md ★ 新增
  coverage-fallback.template.md   ★ 新增
  handover.template.md            ← 升级: 含 goal 对账证据
  （删除）emotion / concept / strategy / styles / states / materials / decorations / budget 8 个旧模板

schema-spec/
  screen-meta-design.md           ← 升级: 含 designGoals + goalElementMap 字段
  node-styles.md                  ← 继承
  visual-states.md                ← 继承
  material-spec.md                ← 继承
  forbidden-fields-design.md      ← 继承
  goal-success-criteria.md        ★ 新增: successCriteria 接口
```

## 9. 每轮回复格式

```
🎯 任务: D-X-G<N>-craft [目标 X craft]
🎨 服务目标: G<N> [statement]
🔧 改动: [styles X 节点 / structure Y 节点 / materials 调 painter Z 次 / visualStates W 处]
📷 自审: [successCriteria 5 条 / 通过 4 条 / 重做迭代 1 轮]
✅ 已落库: [craft md 路径]
📊 本屏进度: [完成 X/Y goals]
➡️ 下个任务: [next_pending_task 返回]
```
```

> SKILL.md 主体到此为止。本节剩余规范（自主推进 / 单页特例 / 续接 / UpstreamChallenge / 详细 references 索引）见完整 SKILL.md 文件。

---

## 5. 配套改造清单

### 5.1 新增 / 重写 methodology

| 文件 | 类型 | 关键内容 |
|---|---|---|
| `00-design-thinking.md` | **重写** | 8 Phase 总览;目标驱动 vs 字段驱动对比;创作者心智 |
| `01-positioning.md` | **新增** | 三层定位（产品/页面/用户场景）的提取方法,含竞品对照模板 |
| `02-goal-extraction.md` | **新增** | 从 positioning 提炼设计目标的 5 步法,impactMode 7 分类,statement 模板,successCriteria 写法（正例/反例对照）|
| `03-goal-decomposition.md` | **新增** | 目标 → 元素拆解的 6 步法,涉及元素扫描,changes 5 维度,weightAllocation 算法 |
| `04-multi-element-coordination.md` | **新增** | 多元素协同视觉的 4 角色（主体/邻居/父容器/装饰）,7 种典型协同模式（CTA 主角化/Mood 氛围化/Trust 守门/Urgency 警示/Delight 惊喜/Form 清晰化/Brand 品牌识别）|
| `05-cross-goal-audit.md` | **新增** | 元素 × 目标矩阵法,权重终值算法,装饰族选定,60-30-10 累积,冲突检测红线 |
| `06-decoration-system.md` | **升级** | 装饰族不再屏级独立,而是从 goal 频次累积推导 |
| `07-craft-execution.md` | **新增** | craft 任务的 7 步执行流,多维度一次性落库,3 轮迭代上限 |
| `08-coordinated-render.md` | **新增** | 多元素一次性 MCP 落库的批操作模式,style/batch_update 仅限目标涉及节点 |
| `09-self-review-by-goals.md` | **升级** | 按 goal 对账（每条 successCriteria 截图核对,0/1 计分,80% 阈值）取代 5 维抽象评分 |
| `10-material-brief.md` | **继承** v3.1 | painter brief 边界（goal+concept+约束,禁施工图）|
| `11-layout-adjustment.md` | **升级** | 布局调整必须服务于某个 goal,孤立调整禁止 |
| `12-state-visual-mapping.md` | **升级** | 业务态视觉差异必须服务于某个 goal.successCriteria,纯填字段禁止 |

### 5.2 新增 schema 字段

```typescript
// features/design-schema/src/types/screen-meta.ts

interface ScreenMetaDesign {
  // ... 旧字段保留: summary / palette / layers / componentBudgets

  // ★ v4 新增
  positioning: {
    product: {
      coreValue: string;
      differentiation: string;
      visualExpectation: string;
      competitorVisualReferences: Array<{
        product: string;
        visualTraits: string[];
      }>;
    };
    page: {
      role: string;
      userBenefit: string;       // ≤30 字
      productGoal: string;       // ≤30 字
      visualTiming: {
        zeroPointFiveSec: string; // 0.5 秒看到什么
        fiveSec: string;          // 5 秒理解什么
        thirtySec: string;        // 30 秒决策什么
      };
    };
    userScenario: {
      psychOnEnter: string;
      emotion: string;
      urgency: 'low' | 'medium' | 'high';
      psychOnExit: string;
    };
  };

  designGoals: Array<{
    id: string;                   // G1, G2, ...
    statement: string;            // 含动词+主体+视觉机制
    whyMatters: string;
    impactMode: 'mood-conveyance' | 'cta-clarity' | 'trust-signal' | 'hierarchy' | 'state-feedback' | 'brand-recognition' | 'decoration-storytelling';
    successCriteria: string[];   // ≥3 条可视判据
    priority: 'P0' | 'P1' | 'P2';
    measureMethod?: string;
  }>;

  goalElementMap: Array<{
    goalId: string;
    involvedElements: Array<{
      nodeId: string;
      role: '主体' | '主角' | '配角' | '邻居' | '装饰' | '父容器';
      weightInGoal: number;       // 0-10
    }>;
    changes: {
      styles?: Array<{ nodeId: string; patch: Record<string, string> }>;
      structure?: Array<{ action: 'element/add' | 'element/wrap' | 'element/move'; ... }>;
      materials?: Array<{ nodeId: string; brief: MaterialBrief }>;
      visualStates?: Array<{ nodeId: string; states: VisualStateSpec[] }>;
      layout?: Array<{ nodeId: string; patch: Record<string, string> }>;
    };
    coordination: {
      主体: string;
      主角: string;
      邻居?: string[];
      父容器?: string;
      装饰?: string[];
    };
    measure: {
      snapshotCheck: string;
      refSimilarity?: number;
      forbiddenSignals: string[];
    };
  }>;

  visualStrategy: {
    weightPyramid: Array<{ nodeId: string; finalWeight: number; sources: string[] }>;
    decorationSystem: {
      family: 'soft-glow' | 'geometric-line' | 'illustration' | 'texture' | 'organic-curve';
      derivedFromGoals: string[];
    };
    colorRatio: {
      sixty: { token: string; sourceGoal: string };
      thirty: { token: string; sourceGoal: string };
      ten: { token: string; sourceGoal: string };
    };
    shapeLanguage: { ... };
    typographyScale: { ... };
    rhythmTimings: { ... };
  };
}
```

### 5.3 新增 MCP action / expectedArtifacts kind

```typescript
// apps/design-mcp/src/actions/

// 新增 expectedArtifacts kind
type ExpectedArtifact =
  | { kind: 'goalSuccessCriteriaMet'; goalId: string; screenId: string; minScoreRatio?: number }
  | { kind: 'allGoalsCriteriaMet'; screenId: string; minScoreRatio?: number }
  | { kind: 'uncoveredNodesMinimalStyles'; screenId: string }
  | { kind: 'goalElementMapValid'; screenId: string }       // 元素 × 目标 矩阵冲突检测
  | { kind: 'arrayMin'; ...; min: 3 }                        // designGoals 至少 3 条
  | { kind: 'eachItem'; check: { kind: 'hasKeys'; keys: ['id','statement','whyMatters','impactMode','successCriteria','priority'] } };

// 新增 service 端校验
function validateGoalSuccessCriteriaMet(goalId, screenId): ValidationResult {
  // 1. read screen.meta.design.designGoals.find(g => g.id === goalId)
  // 2. read screen.meta.design.goalElementMap.find(m => m.goalId === goalId)
  // 3. 跑 generate_snapshots viewport=mobile/desktop
  // 4. 对每条 successCriteria 跑判据：
  //    - "首屏视线落在 X" → OCR / saliency map
  //    - "色彩气质相似度 ≥ 0.6" → 调用 visual-diff/image-color-extract
  //    - "无 Y 信号" → 直方图 + token 引用检查
  //    - "权重 ≥ N" → measureWeightFromSnapshot
  // 5. 计算 score = passed / total ≥ minScoreRatio (default 0.8)
}
```

### 5.4 旧 references 迁移与裁剪

| 旧文件 | v4 处理 |
|---|---|
| methodology/01-briefing.md | 合并到 01-positioning.md |
| methodology/02-visual-budget.md | 合并到 04-multi-element-coordination.md（权重不再独立任务）|
| methodology/02-visual-concept.md | 合并到 02-goal-extraction.md（mood 是 goal 的一部分）|
| methodology/03-color.md | 合并到 05-cross-goal-audit.md（60-30-10 从 goal 累积）|
| methodology/04-typography.md | 同上 |
| methodology/05-shape.md | 同上 |
| methodology/06-decoration.md | 升级为 06-decoration-system.md |
| methodology/06-visualstates-completeness.md | 合并到 12-state-visual-mapping.md |
| methodology/07-rhythm.md | 合并到 05-cross-goal-audit.md |
| methodology/13-self-review-rubric.md | **删除**——5 维抽象评分被 09-self-review-by-goals.md 取代 |
| note-templates/ 旧 8 个模板 | **删除**（emotion/concept/strategy/styles/states/materials/decorations/budget）|
| examples/login-design-v3.md | 重写为 examples/login-design-v4.md（按 8 Phase 走样板）|

### 5.5 现有项目迁移策略

对已经在 v3 流程下完成的项目（如 `d84c140e-0437-4c80-a786-c1f389bcbb02`）：

```
Step 1: 启动 design-planner v4 时检测 screen.meta.design.designGoals 是否存在
Step 2: 不存在 → 调 meta/migrate_v3_to_v4 自动迁移：
  - 从 v3 visualConcept.soulSentence + emotionCore → 推 1 个 mood-conveyance goal
  - 从 v3 budget 主角节点（weight ≥ 8）→ 推 1 个 cta-clarity goal
  - 从 v3 任何 visualState 提到的"焦虑/防备/防错"→ 推 1 个 trust-signal goal
  - 提示用户："已自动迁移 N 个 goal,请审阅是否完整"
Step 3: 用户确认 / 补充 → 进入 v4 Phase D（跨目标统筹）
Step 4: 整屏重跑 self-review-by-goals
Step 5: 不达的 goal → 重新跑对应 craft 任务
```

不迁移的话,v3 已落档项目仍可按 v3 流程维护,但出场审计从此跑 v4 的 goalSuccessCriteriaMet——不达就降为 phase=designed-pending-v4-audit。

---

## 6. 7 大用户问题的对账验证

| 用户原问 | v3 是否支持 | v4 如何支持 |
|---|:-:|---|
| AI 知道什么时候该用素材装饰,用什么颜色？ | ❌ | Phase C 拆解时 changes.materials / structure 必须挂在某 goal 下;goal.coordination 指明装饰角色;颜色从 goal 的 70/30/10 累积推导 |
| AI 知道每个元素如何契合主题、丰富视觉呈现产品？ | ❌ | Phase C goalElementMap 把每个被涉及节点的"为何要改"+"改成什么"+"服务于哪个产品价值"全部记录;Phase F craft 任务每次只改某 goal 涉及节点,不会"无目的地把全屏 33 节点遍历一遍" |
| AI 知道每个元素的视觉权重让整体页面和谐？ | ⚠️ | Phase C 每 goal 内的 weightAllocation + Phase D 跨目标取最高权重 → 形成 visualStrategy.weightPyramid;权重金字塔与 goal 重要度直接关联（P0 goal 的元素权重优先采纳） |
| AI 知道为某交互视觉效果需多少元素协作？ | ❌ | methodology/04-multi-element-coordination.md 给出 7 种典型协同模式;Phase C goalElementMap.coordination 显式列出主体/主角/邻居/父容器/装饰 4 角色;<2 元素的 goal 会被 R-GOAL-DECOMPOSE 拒 |
| AI 知道基于设计目的新建任务,针对元素做素材调整(不是 css 调试)？ | ❌ | Phase E 任务派发只有"goal-craft"形式;每 craft 必涵盖 ≥2 维度（styles / structure / materials / visualStates / layout）;单维度 goal 会被 R-GOAL-DIMENSION 拒,自然杜绝"只调 css" |
| AI 知道系统结合产品+主题分析出视觉任务,逐个调整元素样式？ | ❌ | Phase A→B→C 链路把"产品定位 → 设计目标 → 元素拆解"做成强契约;每个 craft 任务回到对应 goal,自然系统化 |
| AI 知道结合系统思考设计装饰元素和整体布局？(可调元素布局) | ⚠️ | Phase C changes.structure / changes.layout 是 goal 拆解的一等维度;methodology/11-layout-adjustment.md 升级版要求"布局调整必须服务某 goal,孤立调整禁止";v4 不再把布局调整框成"修补 issue" |

→ **6 个 ❌ 全部转为 ✓,2 个 ⚠️ 转为 ✓**——v4 在用户预期的 7 大维度上系统性满足。

---

## 7. 落地实施优先级

### P0（必须做,否则 v4 不可用）

| 项 | 工作量 | 依赖 |
|---|---|---|
| 重写 SKILL.md 主体（按 §4 草案）| 中 | 无 |
| 新增 5 份 methodology（02/03/04/05/07/08）| 大 | 无 |
| 新增 6 份 note-templates | 中 | methodology |
| schema 增字段（designGoals + goalElementMap + visualStrategy 升级）| 中 | features/design-schema |
| MCP 增 expectedArtifacts kinds（goalSuccessCriteriaMet 等）| 中 | apps/design-mcp |

### P1（让 v4 真正达标）

| 项 | 工作量 | 依赖 |
|---|---|---|
| 修复 generate_snapshots 服务（v3 已知 bug）| 中 | apps/design-mcp |
| 实现 visual-diff/image-color-extract 模块 | 大 | apps/design-mcp + 新依赖 |
| 实现 saliency map / OCR 用于 successCriteria 视线判据 | 大 | apps/design-mcp + multimodal LLM |
| examples/login-design-v4.md 全样板 | 中 | P0 全做完 |

### P2（机制健康度）

| 项 | 工作量 | 依赖 |
|---|---|---|
| meta/migrate_v3_to_v4 自动迁移 | 中 | schema 字段确定后 |
| 跨阶段预审契约（theme→design 出场预审）| 大 | 重构涉及 4 个 SKILL |
| capabilities.json 渲染层契约 | 中 | features/design-engine |

---

## 8. 与之前 3 份诊断的关系

| 文档 | 处理 |
|---|---|
| `视觉简陋根因分析-2026-05-31.md` | 作废（事后修字段思路）|
| `视觉简陋诊断报告-2026-06-01.md` | 作废（同上）|
| `视觉SaaS化-第一性诊断与事前预防-2026-06-01.md` | **方向对、根因偏**——把责任推给"AI 没视觉感知 + targetUser 缺视觉文化基因"。本文修订：根因是 SKILL 的任务结构错位。先前文档的 8 重构（visualReferences / visualVernacular / 跨阶段预审）作为 P1/P2 仍有效,但优先级让位于 P0（重写 SKILL 任务结构）|
| 本文（design-planner-v4-目标驱动重构方案-2026-06-01）| 取代上述全部诊断,作为 design-planner skill 升级的唯一权威 |

---

## 9. 一句话总结

**当前 design-planner 把"设计任务"按 schema 字段类别拆,导致专业设计师的"目标驱动"工作流在流程中没有承载体——AI 写出的 md 看起来专业,落档却向 prior 收敛。修复方法不是加机器对账或视觉锚点,是把"设计目标"做成 SKILL 的一等公民,让所有 styles / states / materials / decorations / 布局都沦为某个目标的实现手段。**

---

## 10. 下一步

如果方向认可,建议执行顺序：

1. **先评审本方案**——任何不符合用户预期的拆解（如 8 Phase 的某 Phase 是否冗余,goal 数量上限是否合适,impactMode 7 分类是否够用）当面拍板再实施
2. **P0 改造启动**：先改 SKILL.md + 加 5 份新 methodology + schema 增字段（不改 MCP）→ 在 `d84c140e-...-c1f389bcbb02` 项目跑 v4 重做 → 看视觉是否真不一样
3. **若 P0 跑通**：再启动 P1（generate_snapshots 修复 + visual-diff 模块）让机器对账成立
4. **P2 推迟**：跨阶段预审、capabilities 契约这种重构性工作在 v4 跑稳后再考虑

— end —
