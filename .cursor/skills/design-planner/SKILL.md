---
name: design-planner
description: 应用设计全流程规划技能。当用户要求设计一个完整的应用（或多页面功能模块）时触发。结合上游产品分析(PRD)和交互设计(交互规格)，采用「纵向深钻」方法——从设计系统出发，逐页面递归深入，每个页面是一个文件夹，页面主体/组件/素材各自独立文档可并行分析。做完一个页面再做下一个；然后通用组件深钻；最后完整性验证确保交互状态全覆盖、组件内联展开、样式规格无遗漏。
---

# design-planner

**纵向深钻 + 独立文档式设计规划**：每个页面是一个文件夹，组件和素材各自独立文档（遵循完整模板），可并行深钻分析。

---

## 核心原则

1. **视觉先行（绝对红线）**: 无论页面还是组件，visual.md 必须先于结构文档(index.md / [name].md)完成。视觉驱动结构，不可反过来。
2. **组件也是 visual 先行**: 每个组件的 `[name].visual.md` 必须先于 `[name].md`。组件结构设计消费视觉规格，不可跳过视觉分析直接写结构。
3. **独立深钻，并行分析**: visual.md 完成后，index.md/组件/素材可并行
4. **逐页完成**: 一个页面文件夹100%闭环才进入下一个
5. **每个决策回答三个问题**: 是什么(精确值) / 为什么(设计理由) / 怎么做(MCP路径)

### ⚠️ 视觉先行依赖链（不可违反）

```
页面级:
  visual.md (★ 必须最先完成)
      ↓ 产出样式规格/素材需求/组件视觉预算
  index.md / materials/ / components/ (消费visual产出)

组件级（同理！）:
  [name].visual.md (★ 必须先于结构文档)
      ↓ 产出组件内样式规格/素材需求
  [name].md (消费 visual 的样式规格，写结构/状态矩阵/交互)

❌ 严禁: 先写 [name].md 的结构/功能设计 → 再补 visual.md
✅ 正确: 先写 [name].visual.md 的视觉分析 → 再写 [name].md 消费视觉规格
```

### 数据流向

```
visual.md "素材需求清单" → 驱动 materials/*.md 创建
visual.md "样式规格清单" → 回写到 index.md 区块样式
visual.md "动效规格" → 回写到 index.md 状态转换
visual.md "全局一致性" → 确保与 design-system.md 契合
```

### 并行策略

```
visual.md (必须先完成)
    ↓
以下三者可并行:
├── index.md (消费 visual.md 的样式规格)
├── components/ (各组件: visual.md → .md)
└── materials/*.md (各素材互不依赖)
最后: index.md 补充素材索引表
```

---

## 触发条件

- 涉及 3+ 页面的设计请求
- 已有 PRD + 交互文档，需落地为 UI 设计
- 用户说"设计规划"、"设计一个 app"、"继续执行设计"、"UI 设计"

**不触发**: 单页调整→`page-builder` / 单素材→`material-painter` / 纯Token→`theme-generator`

---

## 工作流

### Phase 0: 上游门禁 + 上下文收集 + 主题门禁 + 任务清单

```bash
SCRIPTS=".cursor/skills/common/scripts"
REGISTRY=".design-workspaces/<task>/design-registry"
WORKSPACE=".design-workspaces/<task>"
```

#### 0.1 上游门禁（★ 必须通过才能开始设计）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage design --mode entry
```

退出码 0/2 才能继续。退出码 1（有 ❌）的常见原因：

| 报错 | 修复路径 |
|------|---------|
| 某页缺 interaction 层 | 回 interaction-designer 补该页交互分析 |
| `pages/<id>/: 没有任何子节点文件` | 回 interaction-designer 跑 Step 3.b 补节点骨架 |
| `operations[N] 是字符串` | 回 interaction-designer 改写 _page.json |
| `operation 引用的节点文件不存在` | 回 interaction-designer 跑 create-node |

**绝不允许"将就着先开始"**：上游缺的字段会让本阶段任务清单不完整，最终结果必然潦草。

#### 0.2 读取上游详情 + 主题门禁

1. 读取上游 md: `product-analysis/PRD.md` + `interaction-design/overview.md` + `interaction-design/pages/*.md`
2. `theme/check` → customized=false 则先触发 `theme-generator`
3. `theme/get` → 读取 ThemeConfig

#### 0.3 生成节点级任务清单 PLAN.md（★ 本阶段的真理之源）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/plan-gen.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage design
```

产物: `design-plan/PLAN.md` —— 包含每个页面的全部任务（视觉先行 / 节点级深钻 / 素材 / 收尾）。

**纪律**：
- 每完成一项必须把 `[ ]` 改成 `[x]`
- 一页未全打勾绝不能进下一页
- PLAN.md 全打勾才算 Phase 2 完成

可选辅助：`task-gen --for planner` 输出"待补 design 层"的节点列表（更细粒度）。

### Phase 1: 全局设计系统

建立视觉基础设施。详见 `references/design-system-template.md`。

**产出**: `design-plan/design-system.md`

### Phase 2: 逐页面递归深钻（核心阶段，PLAN.md 驱动）

每个页面按 PLAN.md 的 5 段顺序执行，**每一步完成立即在 PLAN.md 打勾**：

```
Step A: 视觉先行
  ├─ 写 design-plan/pages/<id>/visual.md (遵循 references/visual-analysis-template.md)
  └─ 产出: 素材需求清单 / 样式规格清单 / 组件视觉预算
  → PLAN [ ] visual.md 打勾

Step B: 推导素材清单 → 写 _materials.json + 节点缺口补全
  ├─ 从 visual.md「素材需求清单」反推，create-node.ts 写入 pages/<id>/_materials.json
  ├─ 检查 visual.md 中识别的组件 vs registry 节点目录
  │  → 缺组件目录的，create-node.ts 创建 <component>/_block.json
  └─ 重新跑 plan-gen.ts → PLAN.md 自动追加新任务（保留已打勾项）

Step C: 节点级深钻（按 PLAN.md「节点级深钻」段落顺序，逐项打勾）
  对每个节点（区块/组件/元素）：
    ├─ 区块或组件 → 先写 [name].visual.md → 再写 [name].md
    │           → write-node.ts --layer design 追加 design 层
    ├─ 叶子元素 → 直接 write-node.ts --layer design 追加 design 层
    │           (含 summary / ref / visualRef；多状态需 visualStates)
    └─ 在 PLAN.md 把对应行 [x]

Step D: 素材深钻（按 PLAN.md「素材」段落，逐项打勾）
  对每个素材：
    ├─ 写 design-plan/pages/<id>/materials/<ID>-<name>.md (6 节模板)
    └─ 在 PLAN.md 把对应行 [x]

Step E: 汇总收尾
  ├─ 写 design-plan/pages/<id>/index.md
  │  (引用前面已写的节点/组件/素材，不再发明新东西)
  ├─ 跑 validate.ts --page <id> → 必须 0 ❌
  └─ PLAN.md 全部打勾
```

**关键变化**：index.md 是**最后**写的、是**汇总**的、是**只引用不发明**的。这样杜绝"index.md 里冒出一个组件但 registry 里没节点 / components/ 下没 .md"的腐败现象。

#### index.md 8个章节

| # | 章节 | 参考模板 |
|---|------|---------|
| 1 | 页面定位 | `references/page-design-template.md` |
| 2 | 结构层次设计 | 同上 |
| 3 | 区块详细设计(样式来自visual.md) | 同上 |
| 4 | 组件清单(通用引用 + 页面级索引) | 指向 components/ |
| 5 | 素材清单(来自visual.md推导) | 指向 materials/ |
| 6 | 状态完整矩阵 | 同上 |
| 7 | 数据与交互设计 | 同上 第8章 |
| 8 | 节点结构树 | 同上 第9章 |

#### ⭐ 节点结构树红线

节点树写作必须严格遵守 4 条红线，详见 `references/node-tree-redlines.md`：
- 红线1: 组件必须内联展开第一层子节点
- 红线2: 每个非基准状态必须有对应节点
- 红线3: 每个节点行必须包含样式关键词
- 红线4: 叶子节点必须有内容(文案/素材/src)

#### 组件文档

每个组件产出两个文件（**★ visual 必须先于结构，不可颠倒**）:
1. **先写** `[name].visual.md` — 遵循 `references/visual-analysis-template.md`（情感/层级/手段/分类/素材需求/样式规格）
2. **后写** `[name].md` — 遵循 `references/component-design-template.md`（消费 visual.md 的样式规格，写结构/状态矩阵/交互）

❌ 禁止先写 [name].md 再补 visual — 这会导致结构设计脱离视觉意图，样式靠猜测填写。

#### 素材文档

每个 `materials/[ID]-[name].md` 遵循 `references/material-design-template.md`（6节: 意图/风格/构图/变体/应用/绘制）

### Phase 3: 通用组件深度设计

跨 2+ 页面复用的组件，逐个深度设计。各组件可并行。

每个组件产出: `components/[NN]-[name]/` (index.md + visual.md + materials/)

格式见 `references/component-design-template.md`（9章）。

### Phase 4: 完整性验证（收尾门禁）

信息零丢失的最后防线。详见 `references/validation-checklist.md`。

#### 4.1 节点结构树红线人工检查

5 个验证步骤:
1. **交互状态全覆盖**: §6 每个非基准状态 → §8 必须有对应 DOM 结构
2. **组件内联展开**: 所有 [组件:X] 必须展开第一层子节点
3. **节点→样式完整**: §8 每个节点 → §3 必须有对应样式规格
4. **素材+内容覆盖**: 叶子节点都有内容、所有素材标注都有对应 .md
5. **数据/事件完整**: 事件列表/状态变量/数据源三方一致

#### 4.2 收尾门禁（★ 必须 0 ❌ 才能移交 executor）

```bash
# 节点级一致性
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/validate.ts \
  --registry $REGISTRY

# 阶段级完整性
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage design --mode exit

# PLAN.md 必须 100% 打勾
grep -c "\[ \]" $WORKSPACE/design-plan/PLAN.md
# 期望: 0
```

任一未通过 → 回到 Phase 2 补写。三项全通过 → 移交 design-executor。

---

## Design Registry 读写

详见 `references/registry-protocol.md`。核心要点:

- 脚本: `.cursor/skills/common/scripts/` (create-node / write-node / validate / task-gen / **stage-gate** / **plan-gen**)
- 调用前缀: `npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/<script>.ts ...`
- 写入时机: 每完成一个节点/组件/素材的 md 后立即同步写入 + 在 PLAN.md 打勾
- 写入原则: 只追加本技能负责的层(design/logic/content/materials)，不可修改上游的 product/interaction

---

## 工作节奏

```
Phase 0 → stage-gate entry → plan-gen → 看 PLAN.md
Phase 1 → design-system.md（PLAN.md 第一项）
Phase 2 → 每页面: visual → 节点级深钻 → 素材 → index.md → validate.ts → PLAN 打勾
Phase 3 → 通用组件深钻
Phase 4 → validate + stage-gate exit + PLAN 100% 打勾 → 移交 executor
```

## 跨会话继续

1. 读 `design-plan/PLAN.md` → 找第一个 `[ ]` 项 → 从这里继续
2. 验证：跑 `stage-gate --stage design --mode entry` 确认上游仍然 OK
3. 如果中断后 registry 有变（上游补漏） → 重跑 `plan-gen`（保留打勾）→ 看 PLAN 新增任务

---

## 约束

### 视觉设计红线

- **视觉先行（页面+组件）**: visual.md 必须先于 index.md；组件 [name].visual.md 必须先于 [name].md。**先结构后视觉 = 流程错误，必须推倒重来**
- **每个组件必须有 visual.md**: 不可省略、不可合并、不可跳过直接写结构
- **不可能无素材**: C端App每页至少有图标/装饰之一。全CSS则必须逐条论证
- **层级统筹**: 页面 visual.md 含"组件视觉预算分配表"，组件 visual.md 回应预算
- **主题契合**: visual.md 第7节必须检查与 design-system.md 一致性，不可自造Token外色值

### 流程约束

- 独立文档: 每个页面/组件的视觉是独立 .md，每个素材也是独立 .md
- 并行优先: visual.md 后 index/组件/素材无依赖
- 逐页完成: 一个页面100%完成才进下一个
- 模板一致: visual用visual-analysis-template，组件用component-design-template，素材用material-design-template

### 质量约束

- 状态完备: variant×state 每格有值
- 素材深度: 每个素材6节完整
- 颗粒度: 精确到 Token/px/ms/缓动
- 禁止 emoji 替代素材
- 每个决策有"为什么"

---

## references/（按需加载）

- `references/design-system-template.md` — 设计系统模板
- `references/visual-analysis-template.md` — ★ 视觉设计分析模板
- `references/page-design-template.md` — 页面 index.md 模板
- `references/component-design-template.md` — 组件结构+交互模板
- `references/material-design-template.md` — 素材独立文档模板
- `references/decoration-elements-guide.md` — 装饰元素分类+选择逻辑
- `references/decoration-patterns.md` — 装饰 CSS 实现模式速查
- `references/node-tree-redlines.md` — 节点结构树 4 条红线（示例+正反对照）
- `references/validation-checklist.md` — Phase 4 完整性验证 5 步详细规则
- `references/registry-protocol.md` — Registry 读写命令速查+JSON结构+产出目录
- `../common/references/stage-gate.md` — ★ 全链路阶段门禁规范（与 product-analyst / interaction-designer 共享）
