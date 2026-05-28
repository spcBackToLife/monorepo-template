---
name: design-planner
description: 应用设计全流程规划技能。当用户要求设计一个完整的应用（或多页面功能模块）时触发。结合上游产品分析(PRD)和交互设计(交互规格)，采用「纵向深钻」方法——从设计系统出发，逐页面递归深入，每个页面是一个文件夹，所有组件（无论通用还是专属）和素材各自独立文档。做完一个页面再做下一个；最后跨页面 audit 确保通用组件契合一致 + 完整性验证。
---

# design-planner

**纵向深钻 + 独立文档式设计规划**：每个 _component.json 节点都对应一份独立 visual.md + .md，通用 vs 专属只决定文档放哪。

---

## 核心原则

1. **视觉先行（绝对红线）**: visual.md 必须先于结构文档（index.md / [name].md）完成。视觉驱动结构，不可反过来。
2. **组件也是 visual 先行**: 每个组件的 `[name].visual.md` 必须先于 `[name].md`。
3. **独立深钻，并行分析**: visual.md 完成后，index.md / 组件 / 素材可并行。
4. **逐页完成**: 一个页面文件夹 100% 闭环（含其引用的所有组件文档）才进入下一个。
5. **每个决策回答三个问题**: 是什么（精确值）/ 为什么（设计理由）/ 怎么做（MCP 路径）。
6. **所有 _component.json 都要独立深钻文档（红线）**: 历史上叫"区块/组件"，现在统一叫**组件**。无论通用还是页面专属，每个 `_component.json` 都必须有 `<name>.visual.md + <name>.md` 两份独立文档。"是不是组件"不决定要不要分析，只决定**文档放哪**。
7. **组件 ≠ 延后（红线）**: 通用组件**必须在它首次出现的页面深钻完成**。"通用"只意味着文档放在跨页面共享目录（`design-plan/components/`），**不是 Phase 3 再补**。首次页面 PLAN 全打勾 + validate 通过才算页面真正完成。

### ⚠️ 视觉先行依赖链（不可违反）

```
页面级:
  visual.md (★ 必须最先完成)
      ↓ 产出样式规格/素材需求/组件视觉预算
  index.md / materials/ / components/ (消费 visual 产出)

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
visual.md "样式规格清单" → 回写到组件 .md / index.md
visual.md "动效规格"     → 回写到状态转换
visual.md "全局一致性"   → 确保与 design-system.md 契合
```

### 并行策略

```
visual.md (必须先完成)
    ↓
以下三者可并行:
├── index.md (消费 visual.md 的样式规格)
├── components/ (各组件: visual.md → .md)
└── materials/*.md (各素材互不依赖)
最后: index.md 补充组件/素材索引表
```

---

## 组件模型（Atomic Design）

所有视觉单元统称为"组件"，按以下分层：

### 基础组件（Atom）

`input` / `button` / `link` / `dropdown` / `picker` / `checkbox` / `radio` / `switch` / `icon-btn` / `tag` / `badge` 等。

- 在 registry 里通常表现为**叶子节点**（如 `phone-input.json`），不是 `_component.json`
- 由 `design-plan/design-system.md` 统一定义规格（颜色/尺寸/状态变体/动效）
- **不为每个实例建独立文档**：叶子节点的 design 层只引用 design-system 规格 + 本地参数

### 业务组件（Molecule / Organism）

`form-card` / `app-bar` / `status-card` / `empty-state` / `permission-card` / `info-card` / `cluster-sheet` 等。

- 在 registry 里表现为 `_component.json`（组件根节点 + 内部叶子节点）
- **必须有独立文档**：`<name>.visual.md + <name>.md`
- 文档路径按"通用 vs 专属"区分（见下）

### 业务组件文档放哪？三步走（自然语言判定）

第一步 · 这是个明显的通用业务组件吗？
- 导航类：`app-bar` / `tab-bar` / `bottom-nav` / `top-bar` / `nav-bar` / `breadcrumb`
- 反馈类：`*-modal` / `*-sheet` / `*-dialog` / `*-toast` / `*-snackbar` / `*-loading` / `*-skeleton` / `empty-state` / `error-card` / `confirm-*`
- 容器类：`form-card` / `info-card` / `permission-card` 等明显业务通用容器
- → **是 → 通用组件 → `design-plan/components/<name>/`**

第二步 · 不是第一步，但 registry 里同名 `_component.json` 跨 ≥2 个页面出现？
- → **是 → 通用组件 → `design-plan/components/<name>/`**

第三步 · 都不是？
- → **页面专属组件 → `design-plan/pages/<id>/components/<name>/`**

**判断不准时：宁可错放到通用目录，也不要漏分析。** 后续页面引用通用组件时只是"引用核对"轻任务，不重写。

### 目录约定

```
design-plan/
├── design-system.md                      # 基础组件统管 + Token 体系
├── components/                            # 通用业务组件
│   ├── form-card/
│   │   ├── form-card.visual.md
│   │   └── form-card.md
│   ├── app-bar/
│   │   ├── app-bar.visual.md
│   │   └── app-bar.md
│   └── ...
└── pages/
    └── <page-id>/
        ├── visual.md                      # 页面级视觉分析
        ├── index.md                       # 页面汇总（含节点结构树）
        ├── materials/                     # 页面级素材
        │   └── <id>-<name>.md
        └── components/                    # 页面专属业务组件
            └── <name>/
                ├── <name>.visual.md
                └── <name>.md
```

---

## 触发条件

- 涉及 3+ 页面的设计请求
- 已有 PRD + 交互文档，需落地为 UI 设计
- 用户说"设计规划"、"设计一个 app"、"继续执行设计"、"UI 设计"

**不触发**: 单页调整→`page-builder` / 单素材→`material-painter` / 纯 Token→`theme-generator`

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

产物: `design-plan/PLAN.md` —— 包含每个页面的全部任务（视觉先行 / 组件深钻 / 素材 / 收尾）。

**plan-gen.ts 自动行为**：
- 扫描所有 `_component.json` → 跨页面同名 ≥2 次的组件，**只在首次出现页面**挂深钻任务；后续页面挂"引用核对"轻任务
- 任务文本附**跨页面统计**（出现在哪几页），辅助 AI 按 SKILL「三步走」判定路径
- 每个 `_component.json` 都生成"组件深钻"任务（无论通用还是专属），不再有"区块无任务"分支

**纪律**：
- 每完成一项必须把 `[ ]` 改成 `[x]`
- 一页未全打勾（含其引用的所有通用组件）绝不能进下一页
- PLAN.md 全打勾才算 Phase 2 完成

### Phase 1: 全局设计系统

建立视觉基础设施。详见 `references/design-system-template.md`。

**产出**: `design-plan/design-system.md`

包含：Token 体系（颜色/字号/间距/圆角/阴影/动效）+ **基础组件统管规格**（input/button/dropdown 等的全局规格）。

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
  │  → 缺组件目录的，create-node.ts 创建 <component>/_component.json
  └─ 重新跑 plan-gen.ts → PLAN.md 自动追加新任务（保留已打勾项）

Step C: 组件深钻（按 PLAN.md「组件深钻」段落顺序，逐项打勾）
  对每个 _component.json：
    ├─ 按 SKILL「三步走」判定文档路径（通用 / 专属）
    ├─ 先写 [name].visual.md → 再写 [name].md
    └─ write-node.ts --layer design 追加 design 层
       (visualRef 指向独立文档路径，不能指页面 visual.md 章节)
  对每个叶子元素：
    └─ write-node.ts --layer design（summary/ref；多状态需 visualStates）
  对引用核对任务（通用组件已在首次出现页面深钻）：
    └─ 核对 design-plan/components/<name>/ 是否覆盖本页面所需变体；缺则补 variant

Step D: 素材深钻（按 PLAN.md「素材」段落，逐项打勾）
  对每个素材：
    ├─ 写 design-plan/pages/<id>/materials/<ID>-<name>.md (6 节模板)
    └─ 在 PLAN.md 把对应行 [x]

Step E: 汇总收尾
  ├─ 写 design-plan/pages/<id>/index.md
  │  (引用前面已写的组件/素材，不再发明新东西)
  ├─ 跑 validate.ts --page <id> → 必须 0 ❌
  └─ PLAN.md 全部打勾
```

**关键变化**：index.md 是**最后**写的、是**汇总**的、是**只引用不发明**的。每个组件都有自己的独立文档，index.md 第 3 章不再承担"区块详细描述"（描述放到各组件 .md），改为"组件清单 + 节点结构树"。

#### index.md 8 个章节

| # | 章节 | 参考模板 |
|---|------|---------|
| 1 | 页面定位 | `references/page-design-template.md` |
| 2 | 结构层次设计 | 同上 |
| 3 | 组件清单（通用引用 + 页面专属索引） | 指向 components/ 或 pages/<id>/components/ |
| 4 | 素材清单（来自 visual.md 推导） | 指向 materials/ |
| 5 | 状态完整矩阵 | 同上 |
| 6 | 数据与交互设计 | 同上 |
| 7 | 节点结构树 | 同上 |
| 8 | 引用契合度核对（通用组件） | 列出本页面引用的通用组件 + 是否需要 variant 补充 |

#### ⭐ 节点结构树红线

节点树写作必须严格遵守 4 条红线，详见 `references/node-tree-redlines.md`：
- 红线 1: 组件必须内联展开第一层子节点
- 红线 2: 每个非基准状态必须有对应节点
- 红线 3: 每个节点行必须包含样式关键词
- 红线 4: 叶子节点必须有内容（文案/素材/src）

#### 组件文档

每个组件产出两个文件（**★ visual 必须先于结构，不可颠倒**）:

1. **先写** `[name].visual.md` — 遵循 `references/visual-analysis-template.md`（情感/层级/手段/分类/素材需求/样式规格）
2. **后写** `[name].md` — 遵循 `references/component-design-template.md`（消费 visual.md 的样式规格，写结构/状态矩阵/交互）

❌ 禁止先写 [name].md 再补 visual — 这会导致结构设计脱离视觉意图，样式靠猜测填写。

#### 素材文档

每个 `materials/[ID]-[name].md` 遵循 `references/material-design-template.md`（6 节: 意图 / 风格 / 构图 / 变体 / 应用 / 绘制）

### Phase 3: 通用组件跨页面 audit（不是新分析，是核对）

通用组件的独立文档已在 Phase 2 各页面深钻时随附完成。Phase 3 只做：

1. **跨页面契合度审查**：同一通用组件在不同引用页面是否被统一对待（颜色/尺寸/状态/动效一致）
2. **变体补全**：若某页面引用时发现需要额外 variant，补到组件文档（标注引用页面）
3. **❌ 不允许**：到这阶段才"开始"分析一个通用组件——那意味着 Phase 2 漏了，必须回 Phase 2 补

### Phase 4: 完整性验证（收尾门禁）

信息零丢失的最后防线。详见 `references/validation-checklist.md`。

#### 4.1 节点结构树红线人工检查（6 步）

1. **交互状态全覆盖**: 每个非基准状态 → 必须有对应 DOM 结构
2. **组件内联展开**: 所有 [组件:X] 必须展开第一层子节点
3. **节点→样式完整**: 每个节点 → 必须有对应样式规格
4. **素材+内容覆盖**: 叶子节点都有内容、所有素材标注都有对应 .md
5. **数据/事件完整**: 事件列表 / 状态变量 / 数据源三方一致
6. **组件独立文档存在性（★ 新增）**: 每个 `_component.json` 必须有对应：
   - `design-plan/components/<name>/<name>.visual.md` 和 `.md`（通用）
   - 或 `design-plan/pages/<id>/components/<name>/<name>.visual.md` 和 `.md`（专属）
   - 该节点的 `design.visualRef` 必须指向上述独立文档（不能指页面 visual.md 章节）

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
- 写入时机: 每完成一个组件 / 节点 / 素材的 md 后立即同步写入 + 在 PLAN.md 打勾
- 写入原则: 只追加本技能负责的层（design / logic / content / materials），不可修改上游的 product / interaction

### 组件根节点文件命名

历史上叫 `_block.json`（已废弃）。**现统一为 `_component.json`**。文件名仅是约定，不再有"区块"概念——所有 `_component.json` 都是组件根节点。

---

## 工作节奏

```
Phase 0 → stage-gate entry → plan-gen → 看 PLAN.md
Phase 1 → design-system.md（PLAN.md 第一项）
Phase 2 → 每页面: visual → 组件深钻（含通用组件首次深钻）→ 素材 → index.md → validate → PLAN 打勾
Phase 3 → 通用组件跨页面 audit（核对一致性）
Phase 4 → validate + stage-gate exit + PLAN 100% 打勾 → 移交 executor
```

## 跨会话继续

1. 读 `design-plan/PLAN.md` → 找第一个 `[ ]` 项 → 从这里继续
2. 验证：跑 `stage-gate --stage design --mode entry` 确认上游仍然 OK
3. 如果中断后 registry 有变（上游补漏）→ 重跑 `plan-gen`（保留打勾）→ 看 PLAN 新增任务

---

## 约束

### 视觉设计红线

- **视觉先行（页面+组件）**: visual.md 必须先于 index.md；组件 [name].visual.md 必须先于 [name].md。**先结构后视觉 = 流程错误，必须推倒重来**
- **每个组件必须有 visual.md**: 不可省略、不可合并、不可跳过直接写结构
- **每个 _component.json 都要独立文档**: 区块概念已废弃，所有 _component.json 都按组件处理
- **通用组件随首次页面同步完成**: 不可延后到 Phase 3
- **不可能无素材**: C 端 App 每页至少有图标/装饰之一。全 CSS 则必须逐条论证
- **层级统筹**: 页面 visual.md 含"组件视觉预算分配表"，组件 visual.md 回应预算
- **主题契合**: visual.md 第 7 节必须检查与 design-system.md 一致性，不可自造 Token 外色值

### 流程约束

- 独立文档: 每个页面/组件的视觉是独立 .md，每个素材也是独立 .md
- 并行优先: visual.md 后 index/组件/素材无依赖
- 逐页完成: 一个页面 100% 完成（含其引用的所有通用组件文档）才进下一个
- 模板一致: visual 用 visual-analysis-template，组件用 component-design-template，素材用 material-design-template

### 质量约束

- 状态完备: variant×state 每格有值
- 素材深度: 每个素材 6 节完整
- 颗粒度: 精确到 Token/px/ms/缓动
- 禁止 emoji 替代素材
- 每个决策有"为什么"

---

## references/（按需加载）

- `references/design-system-template.md` — 设计系统模板（含基础组件统管规格）
- `references/visual-analysis-template.md` — ★ 视觉设计分析模板
- `references/page-design-template.md` — 页面 index.md 模板
- `references/component-design-template.md` — 组件结构+交互模板
- `references/material-design-template.md` — 素材独立文档模板
- `references/decoration-elements-guide.md` — 装饰元素分类+选择逻辑
- `references/decoration-patterns.md` — 装饰 CSS 实现模式速查
- `references/node-tree-redlines.md` — 节点结构树 4 条红线（示例+正反对照）
- `references/validation-checklist.md` — Phase 4 完整性验证 6 步详细规则
- `references/registry-protocol.md` — Registry 读写命令速查+JSON 结构+产出目录
- `../common/references/stage-gate.md` — ★ 全链路阶段门禁规范（与 product-analyst / interaction-designer 共享）
