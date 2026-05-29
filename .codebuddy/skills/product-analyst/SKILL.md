---
name: product-analyst
description: 专业的产品需求分析技能。当用户描述一个产品想法、需求或功能时触发。通过系统化的多维度分析（用户画像、竞品、业务流程、信息架构），**渐进式**地把分析成果直接写入 design-api 的 schema（meta 命名空间 + 屏幕骨架），不再产生平行 md/json。适用场景包括：用户说"帮我做一个xx应用"、"分析这个需求"、"我要做一个xx功能"等涉及产品规划和需求分析的请求。
---

# 产品需求分析 Skill (Schema-First)

将用户的产品想法转化为产品需求，并**渐进式**沉淀到 design-api schema 这个唯一事实源。

> 架构契约见 `SCHEMA-FIRST-REFACTOR.md`。本 SKILL 是 §5.2.1 的具体执行。

---

## 0. 核心原则

### 0.1 唯一事实源 = design-api schema

> **不写 `design-registry/*.json` 或 `product-analysis/*.md` 作为信息源。**
>
> 所有结论通过 MCP 写入 schema：
> - 项目级（产品定位 / 用户 / 场景 / 决策 / 模块 / 导航流转）→ `meta/set_project`
> - 屏幕骨架（每页一个 Screen）→ `screen/add`
> - 每屏的产品层叙事（summary / fromModules / rules）→ `meta/set_screen` 的 `product` 字段
>
> 后续任何阶段读取分析结果，**只读 schema**（`query/project_info` / `query/screen_schema`）。

### 0.2 渐进式落库（核心节奏）

> **不要憋到最后批量写**。schema 支持 deep-merge，每分析完一小块就立刻落库。

```
✅ 正确节奏（应用越大越是这种）：
   定方向（一句话） → meta/set_project 项目骨架 → 落库
   分析模块 A → meta/set_project deep-merge 加 modules.A → 落库
   规划登录页 → screen/add + meta/set_screen.product → 落库
   分析模块 B → meta/set_project deep-merge 加 modules.B → 落库
   规划首页 → screen/add + meta/set_screen.product → 落库
   ...
   每一步都"做即落"，schema 始终是当前最新分析的快照。

❌ 错误节奏：
   把所有模块分析完 → 把所有屏分析完 → 最后一次性 set_project + 批量 screen/add
   （应用一复杂这种模式就崩——上下文爆炸 / 中间断了无法续）
```

### 0.3 自主推进，不逐项征询

> 用户给方向 → AI 基于第一性原理直接做合理决策 → 落库 → 推进。
> **遇到真不确定（多个合理选项无法自决）才停下来问**；明显合理的决策直接做，做完顺嘴说一句"我假设了 X，理由是 Y，不合适随时改"即可。

```
❌ 错误：每个决策都列清单等用户勾选
   "登录方式做哪几种？✅ 方案 A ✅ 方案 B ❓ 方案 C"
   → 用户疲劳，AI 不像专业产品经理，像问答机器人

✅ 正确：直接做专业判断
   "本期做手机号免密+密码两种登录方式（覆盖了 90%+ 场景；第三方授权
    需多一步获取手机号，本期不做）。如有不同意见随时调。"
   → 落库继续推进
```

**真正需要问的边界**：用户没说且方案差异巨大、关乎产品定位的——例如"是 toC 还是 toB"、"是否做支付"。其余照专业判断推。

### 0.4 多角度验证（思考过程，非对话产物）

每个产品决策**心里**至少从 3 个角度验证：用户角度 / 商业角度 / 技术角度 / 竞品角度。验证的结论体现在落库的 summary / rationale 里，不需要把验证表完整列给用户看。

---

## 1. 工作流（渐进式）

> **没有"Phase 1 全分析 → Phase 2 全分析 → Phase 3 批量落库"。只有按需要分析的最小颗粒，分析完即落库。**

### 1.1 启动：建项目骨架（≤ 1 轮对话）

用户描述目标后，立刻：

1. 用一句话产品定位（自己判断，不问用户）
2. 用一句话风格方向（自己判断，参考用户暗示如"校园社交"→"青春治愈"）
3. `query/create_project { name, platform }` → 拿 projectId
4. `meta/set_project { patch: { targetUser, styleDirection } }` → 项目骨架已落库

回复用户：项目已建，接下来打算分析 X / Y / Z 这几块。

### 1.2 渐进分析（每轮对话一小块）

每轮对话**只**分析一个最小颗粒，分析完立刻 deep-merge 到 schema：

- **场景一颗粒**：识别一个核心场景 → `meta/set_project deep-merge { coreScenarios: [新场景] }`
- **模块一颗粒**：识别一个功能模块（用户体系 / 内容 / 社交...）→ `meta/set_project deep-merge { modules: { Mx: {...} } }`
- **决策一颗粒**：作出一个关键产品决策（如"投递必须好友"）→ `meta/set_project deep-merge { constraints: { decisions: [新决策] } }`
- **屏幕一颗粒**：规划一个页面 → `screen/add` + `meta/set_screen { product: { summary, fromModules, rules } }`
- **导航一颗粒**：补充一条页面流转 → `meta/set_project deep-merge { navigation: { flows: [新 flow] } }`

> **deep-merge 让多次分批写完全无副作用**：第一次 `coreScenarios: [S1]`，第二次 `coreScenarios: [S1, S2]`——后者是替换数组（数组按整体替换原则），所以追加场景时要把已有场景一起带上。**对象字段（如 modules）是真 deep-merge**，加新 module 不会覆盖旧的。

### 1.3 单页项目特例

如果用户只要一个页面（如本次"做个登录页试试"），就压缩流程：

```
1. 建项目（同 1.1）
2. 一次 set_project：把这一屏关联的 targetUser/styleDirection/单 module 写进去
3. 一次 screen/add + 一次 set_screen.product
4. query/integrity 自检
5. 通知用户下一阶段
```

**不需要 Phase 1/2/3 三段式仪式**——单页就是单页，直接做完。

### 1.4 复杂项目（数十屏）的节奏

```
轮 1：建项目 + 写顶层 meta（targetUser/styleDirection/coreScenarios 大轮廓）
轮 2-N：每轮按"模块 + 该模块对应的页面"打包推进
       → 模块写进 meta.modules
       → 该模块的页面 screen/add + meta/set_screen.product
       → 模块间导航 flow 增量 merge 进 meta.navigation
       做完一个模块就推进下一个，schema 一直是已落部分的真实快照
最终：query/integrity 自检 → 移交 interaction-designer
```

**关键**：复杂项目**绝不**让 AI 憋着先全部分析完。一是上下文会爆，二是用户中途加需求就要重来，三是用户其实想边看 schema 边给反馈。

### 1.5 每轮落库后的回复格式

每轮 MCP 落库后给用户的回复要简短：

```
✅ 已落库：[这一轮做了什么，简单一两行]
🤔 我做了这些假设：[关键假设，1-3 条]
➡️ 接下来打算：[下一轮做什么]
```

用户随时可以打断/调整方向。**不要等用户主动确认才推进**。

---

## 2. ProjectMeta / ScreenMeta 字段说明

### ProjectMeta 结构

```
{
  targetUser: { summary: "..." },                   // 目标用户描述
  coreScenarios: [{ id: "S1", summary: "..." }],    // 核心使用场景
  styleDirection: { summary: "..." },               // 风格方向
  constraints: {
    decisions: [{ id: "D1", summary: "..." }]       // 关键产品决策
  },
  modules: {
    M1: { name, priority: "P0|P1|P2", summary }     // 功能模块
  },
  navigation: {
    tabBar: ["screenId1", "screenId2", ...],        // 一级导航
    flows: [
      { from: "...", to: "...", trigger: "...", transition: "..." }
    ]
  }
}
```

### ScreenMeta.product 结构

```
{
  product: {
    summary: "...",                  // 该屏定位
    fromModules: ["M1", "M5"],       // 关联哪些模块
    rules: [                         // 业务规则（≥1 条）
      "...",
      "..."
    ]
  },
  status: { phase: "analyzed" }      // 阶段状态
}
```

### screenId 规范

`<二级前缀>-<功能英文短名>`：
- `00-splash` / `00-onboarding` / `00-login` / `00-register` / `00-forgot-password`
- `01-home-map` / `02-fishing-cast` / `06-conversation-list` / `10-profile-self`

前缀 `00` 是无 tab 状态前的入口流，`01-09` 是 tabBar 内屏，`10+` 是个人/设置流。

---

## 3. 自检与移交

### 3.1 整体自检（在用户说"分析得差不多了"或所有规划完成时跑一次）

```
query/integrity { projectId }
```

期望：
- ✅ 0 个 R-PHASE-01 错误（status.phase 一致）
- ✅ 0 个 R-STATUS-* 错误（这阶段还没写 events/styles，不应误判）
- ⚠️ R-EVENTS-01 不应出现；如果出现说明 product summary/rules 里写了"click→..."这种交互动词，应改为产品语言（"是什么 / 该遵循什么规则"，而不是"用户怎么操作"）

### 3.2 移交下一阶段

```
✅ product-analyst 阶段完成，schema 已含：
   - 项目元数据（targetUser / styleDirection / N 个 modules / N 条 navigation flow）
   - X 个屏幕骨架（每屏含 ScreenMeta.product）
   - 0 个节点（节点由后续阶段创建）

下一步：触发 interaction-designer 技能。
```

---

## 4. 必须 / 禁止

### 必须

- ✅ 每分析一小块**立刻** MCP 落库（deep-merge），不憋到最后
- ✅ 每屏 `product.rules[]` ≥ 1 条（即使"无特殊规则"也要明写"无特殊安全/数据约束"，强制思考）
- ✅ 每轮回复用 §1.5 格式（已落 / 假设 / 下一步）
- ✅ 关键阶段跑 `query/integrity` 自检
- ✅ 自主推进，遇到真模糊才问；问题集中（一次问完，不挤牙膏）

### 禁止

- ❌ 写 `design-registry/*.json` / `product-analysis/*.md` 作为信息源（在对话里展示 markdown 是 OK 的，那是对话内容不是文件）
- ❌ 调用 `create-node.ts` / `write-node.ts` / `stage-gate.ts` 等已废弃脚本
- ❌ 把每个决策都列清单让用户逐项勾选（你是产品经理，不是问卷调查员）
- ❌ 复杂项目憋着先全部分析完才落库
- ❌ summary / rules 写"click→xxx"交互动词（产品阶段只描述"是什么"和"业务规则"）
- ❌ 在 Phase 1/2/3 三段式仪式里浪费时间——只在确实需要时分阶段

---

## 5. 与下游技能的衔接

| 当前产出（schema） | 下游消费 | 消费方式 |
|------------------|---------|---------|
| `meta.targetUser` / `coreScenarios` / `constraints` | interaction-designer | `query/project_info` 读作业务上下文 |
| `meta.modules` | design-planner | 读取了解模块归属 |
| `meta.styleDirection` | theme-generator | 作为风格意图输入 `theme/set_intent` |
| `meta.navigation.flows` | interaction-designer | 翻译成 `nav.go` action |
| `screen.meta.product.rules` | interaction-designer | 翻译成 events.condition 表达式 |
| `screens[]` 骨架 | interaction-designer | 在每屏上 `state/view_add` + 建节点 + 加 events |

---

## 6. 新会话续接

```
1. query/list_projects → 看是否已有相关项目
2. 若有：query/project_info { projectId } → 读 meta + 屏幕列表，了解已沉淀到哪里
3. 找到第一个 phase ≠ "analyzed" 的屏 / 缺失的模块 → 从那里继续
```

schema 自身就是状态——不存在"上次分析到哪儿"的难题。

---

## 7. 详细参考（按需加载）

- `references/module-analysis-example.md` — 模块分析五步法完整示例
- `references/user-story-method.md` — 用户故事编写方法论
- `references/biz-logic-analysis.md` — 业务逻辑分析模板 + 边界 Case 清单
- `references/info-architecture.md` — 信息架构设计方法
- `../common/references/v2-actions-cheatsheet.md` — 看下游会怎么消费你的产物
- `SCHEMA-FIRST-REFACTOR.md` — 整体架构契约（根目录）
