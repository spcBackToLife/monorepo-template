# UPSTREAM-FEEDBACK-PROPOSAL.md — 流水线回流机制设计方案

> 版本：v0.1（草案 / 待评审）
> 日期：2026-05-30
> 维护者：@pikun
> 适用：Schema-First v2.x 流水线五角色（product-analyst / theme-generator / interaction-designer / design-planner / design-executor）
> 当前状态：📋 设计提案，尚未实施

---

## 0. TL;DR（一句话）

**让"下游发现上游问题"从单向硬终止（"⛔ 退回上游 → 用户手动切技能 → 重启上下文"）变成有协议的双向反馈环（下游写 challenge → 上游接管 revise → 自动回到下游续做）**——同时不破坏 Schema-First 的"五角色共建一棵 schema、永不重组上游"红线。

---

## 1. 问题定义（第一性原理）

### 1.1 现象

在 `interaction-designer` 推进 `00-login` 屏 `I-M1-view-business` 任务（业务状态分支视图）时遇到具体卡点：

- 任务要求：账号锁定状态机的 `unlocked / locked` 两枚举值各建独立子树（boundaries.md D-B9 锁定决策："NormalFormView / LockedView 双子树 visibleWhen 互斥"）
- 最干净的实现：用 `element/wrap` 把 product 阶段已建的 `HeaderArea + FormCard + FooterLinks` 包成一个 `NormalFormView` 容器，再加 `LockedView` 兄弟节点
- 但触发了**红线**——`forbidden-fields-interaction.md` §"重组上游骨架"：「移动 / 删除 / 包裹 product 阶段已建的业务骨架节点 ❌」「如发现真有问题，退回 product-analyst 修」

下游被迫做次优选择（给已有节点散挂 `visibleWhen` 而非干净 wrap），或用户介入手动切技能。

### 1.2 现有机制的本质

仓库现状全文搜 `退回上游 / 退回 product-analyst / 退回 design-planner` 共 **11 处**——全部是**单向硬终止**：

| 触发方 | 红线动作 | 当前后续 |
|-------|---------|--------|
| interaction 发现 product 节点结构不利交互 | ⛔ 退回 product-analyst | （口头交接，无协议）|
| interaction 发现 dataSource.endpoint 错 | ⛔ 退回 product-analyst | 同上 |
| design-planner 发现 schema 规格不全 | ⛔ 退回上游 | 同上 |
| executor 发现 styles 错 / materialSpec 不准 | ⛔ 退回 design-planner | 同上 |

**没有任何一条规定**：
- 怎么留痕（challenge 的格式 / 位置）
- 上游怎么接管（哪个任务承接 / 怎么重新激活 SKILL）
- 改完上游 schema 后下游怎么续做（重新跑 integrity？重新挂 plan task？）
- 已 done 任务的 expectedArtifacts 被改坏怎么办（R-PLAN-01 对账如何兜底）

### 1.3 现有机制为什么这样设计（合理动机）

不是设计者拍脑袋——三条根本性约束：

1. **防漂移**：让下游随便改上游产物 → 上游 plan 任务的 expectedArtifacts 失效 → 假完成 → 责任不清
2. **Schema-First 定位**：schema 是契约源，下游"脑补 + 改"会让契约信任崩塌
3. **角色专业分工**：产品决策 / 交互决策 / 视觉决策本就是不同专业语言，混着改产品质量低

**所以"硬退回"的动机是对的，错在没给"硬退回之后"配套协议。**

### 1.4 第一性问题

> 下游 AI 在做交互/视觉/执行专业判断时，发现上游产物的某个具体决策不利于本阶段的最佳实现——既不是上游"漏写"（那是 expectedArtifacts 兜底的事），也不是下游"越界"（那是 forbidden-fields 兜底的事），而是**两个专业视角之间的真实分歧**——这种分歧应该如何在系统内被表达、协商、消化？

可拆分为 4 个子问题：

| Q | 问题 | 当前是否有答案 |
|---|------|:------------:|
| Q1 | **怎么留痕**：下游凭什么说"上游决策不优"？要哪些证据才不算"任性挑事"？ | ❌ |
| Q2 | **谁有权改**：下游能不能直接改上游 schema？如果不能，怎么把控制权交给上游 SKILL？ | ❌ |
| Q3 | **怎么续做**：上游改完 schema 后，下游已 done 任务受影响要不要重做？plan 怎么承接？ | ❌ |
| Q4 | **怎么对账**：改 schema 是否会让某些 expectedArtifacts 失效（R-PLAN-01）？怎么兜底？ | ⚠️ 部分（R-PLAN-01 能检测，但没有"修复路径"）|

---

## 2. 设计原则

### 2.1 不可妥协的红线

任何方案必须保留：

- **R1：Schema 仍是唯一契约源**——不允许 md 提升为契约；challenge 是"动机"，schema 改动才是"结果"
- **R2：单一所有者写**——product 字段只允许 product-analyst 改，interaction 字段只允许 interaction-designer 改（不允许下游绕过去自己 wrap 上游节点）
- **R3：留痕可追**——任何跨阶段改动必须在 plan 上留任务、在 md 上留推理；不允许"灰色操作"
- **R4：不破坏 expectedArtifacts**——上游产物被改后必须重新对账；下游已 done 任务受影响要在 plan 上承接

### 2.2 期望特性

- **F1：低摩擦**——下游发现问题到上游开始改，最多 1 次 SKILL 切换 + 1 次任务声明
- **F2：闭环可恢复**——任意时刻新会话进来都能从 schema 看出"这里在协商中"+"协商内容"+"协商进度"
- **F3：避免雪崩**——一次 challenge 影响范围被显式声明，避免下游全屏 plan 都要重做

---

## 3. 方案设计：UpstreamChallenge 协议

### 3.1 核心概念

引入 `UpstreamChallenge`——一个一等公民的 plan 任务变体，跨阶段的"质疑—接管—消化"协议载体。

```ts
// features/design-schema/src/types/meta.ts（拟新增）
interface PlanTask {
  // ... 原有字段
  upstreamChallenge?: UpstreamChallengeRef;
}

interface UpstreamChallengeRef {
  // 这个任务是哪个 challenge md 触发的
  challengeId: string;            // 如 "C-INT-00-login-001"
  challengeMd: string;            // md 相对路径（analysis-notes/<projectId>/challenges/<challengeId>.md）

  // 协商生命周期
  phase: 'open' | 'accepted' | 'rejected' | 'resolved';

  // 关系链（双向引用）
  raisedBy: string;               // 触发本 challenge 的下游任务 ID（如 "I-M1-view-business"）
  targetStage: 'product' | 'theme' | 'interaction';   // 要回流到哪个上游阶段
  targetTaskIds: string[];        // 受影响的上游 plan 任务 ID（如 ["M1-skeleton"]）
  resumeTaskId?: string;          // accepted 后下游续做的任务 ID（通常 = raisedBy）

  // 决策记录
  decision?: {
    by: 'product-analyst' | 'user';
    accepted: boolean;
    rationale: string;
    appliedAt: number;            // ts
  };
}
```

### 3.2 工作流（5 步）

```
┌─────────────────────────────────────────────────────────────────────┐
│ 下游 AI（如 interaction-designer）                                    │
│ 推进任务 T_down 时发现：上游某个结构/字段决策不利于本阶段最佳实现       │
└──────────────────────┬───────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 1：写 challenge md                                              │
│  路径：analysis-notes/<projectId>/challenges/<challengeId>.md         │
│  内容（强模板）：                                                      │
│    1. 现状（上游产物 + 节点 ID + 字段值）                              │
│    2. 问题（为什么不利于本阶段，需举两类证据）：                       │
│       a. 红线证据（违反哪条 forbidden-fields 才能干净实现？）          │
│       b. 替代方案对比（at least 3 候选，含"维持现状"作为对照）         │
│    3. 影响面声明（targetTaskIds：受影响的上游已 done 任务列表）         │
│    4. 推荐方案 + 理由（不只说"我要改"，要说"为什么这是产品级最优"）     │
│    5. 回流后下游怎么续做（resumeTaskId + 是否影响下游已 done 任务）    │
└──────────────────────┬───────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 2：声明 challenge 任务                                          │
│  meta/raise_upstream_challenge {                                     │
│    projectId, scope: 'project',                                      │
│    challenge: {                                                      │
│      challengeId, challengeMd, phase: 'open',                        │
│      raisedBy: T_down.id, targetStage: 'product',                    │
│      targetTaskIds: ['M1-skeleton'],                                 │
│      resumeTaskId: T_down.id                                         │
│    }                                                                 │
│  }                                                                   │
│  → service 端做的事：                                                 │
│    1. 在 project.meta.plan 末尾追加一条 challenge task：              │
│       { id: 'P-revise-from-<challengeId>', stage: 'product',         │
│         status: 'pending', upstreamChallenge: <ref>, ... }           │
│    2. 把 raisedBy 任务（T_down）状态改为 'blocked'：                  │
│       blockedReason: 'upstream-challenge: <challengeId>'              │
│    3. 不允许同一 raisedBy 任务有 2 个 open challenge（防滥用）        │
│  → 简短回复用户：「我提了一个回流挑战 X，等 product-analyst 接管」     │
└──────────────────────┬───────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 3：用户切到上游 SKILL 或上游 SKILL 自驱动接管                    │
│  product-analyst Phase 0 入场门禁新增一项：                           │
│    "扫 project.meta.plan 是否有 phase='open' 的 challenge task"       │
│  → 有 → 自动跳到 challenge 处理流程（优先级最高）                      │
│  → 无 → 走原有 next_pending_task 逻辑                                 │
└──────────────────────┬───────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 4：上游 SKILL 处理 challenge                                    │
│  4a. read challenge md → 理解下游的诉求与候选方案                     │
│  4b. 写 decision md：analysis-notes/<projectId>/challenges/           │
│        <challengeId>-decision.md                                      │
│      - 接受 / 部分接受 / 拒绝 + 完整论证                              │
│      - 如部分接受：给出折中方案                                        │
│      - 如拒绝：给下游一个等效且不破红线的实现指南                       │
│  4c. 接受 → 用 product 阶段允许的 MCP 改 schema                       │
│      （element/wrap / move / remove / meta/set_node ...）             │
│      ★ 同时同步对应受影响 product task 的 notes（追加补丁说明）        │
│  4d. 拒绝 → 不动 schema                                               │
│  4e. meta/resolve_upstream_challenge {                                │
│        challengeId, decision: { accepted: true|false, rationale }     │
│      }                                                                │
│      → service 端做的事：                                              │
│        1. challenge task.status = 'done'                              │
│        2. challenge.phase = 'accepted' | 'rejected'                   │
│        3. 重跑 R-PLAN-01：所有受影响的上游已 done 任务 expectedArtifacts │
│           重新对账，不通过则要求当场补回                                │
│        4. 把 raisedBy 任务（T_down）从 blocked 改回 pending            │
│        5. 提示用户："challenge 已处理，可切回 interaction-designer"     │
└──────────────────────┬───────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 5：下游续做                                                      │
│  interaction-designer 重新激活：                                      │
│  - next_pending_task 拿到 T_down（status 已恢复 pending）             │
│  - 读 challenge md 末尾 + decision md → 理解上游怎么改的              │
│  - 接受 → 按新结构落 schema 续做（可能需要更新本任务 md 的"沉淀"段）   │
│  - 拒绝 → 按 decision md 给的等效实现指南落 schema                    │
│  - 标 done                                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 工作流的 ASCII 简图

```
[interaction]                        [product]
T_down doing                          (idle)
  │
  │ 发现冲突
  ▼
write challenge md   ──────raise─────▶  P-revise-XXX created
T_down → blocked                          │
                                          │ user 或 SKILL
                                          │ 切换接管
                                          ▼
                                       read challenge md
                                       write decision md
                                       改 schema（如接受）
                                       resolve challenge
                                       │
T_down → pending  ◀──────unblock──────┘
  │
  │ 续做
  ▼
落 schema → done
```

### 3.4 文件组织

```
analysis-notes/<projectId>/
├── ...（既有结构）
└── challenges/                                    ★ 新增
    ├── README.md                                  # challenge 索引（自动生成）
    ├── C-INT-00-login-001.md                      # 下游写的 challenge
    ├── C-INT-00-login-001-decision.md             # 上游写的 decision
    └── C-EXEC-02-feed-003.md
```

**challenge md 强模板**（`.codebuddy/skills/common/references/challenge.template.md`）：

```markdown
> 这是一份【跨阶段回流挑战】，挑战上游的某个具体决策。
> 触发任务：<下游任务 ID>
> 目标阶段：<上游阶段>
> 受影响上游任务：<id1, id2, ...>
> 协商状态：open / accepted / rejected / resolved

# C-<阶段简写>-<screenId>-<NN>: <一句话标题>

## 1. 现状（上游产物快照）
- 节点 / 字段：<schema 路径 + 当前值>
- 来自上游决策：<引用上游 md 路径 + 决策 ID（如 D6 / D-B9）>

## 2. 问题
### 2.1 红线证据
- 想要的实现：<具体 MCP 调用 / 节点结构>
- 触发哪条 forbidden 红线：<引用 forbidden-fields-* §X>
- 不绕红线的代价：<次优实现的描述 + 维护性/可读性损失>

### 2.2 候选方案 ≥3（含"维持现状"对照）
| 方案 | 改动面 | 优势 | 劣势 |
|-----|-------|-----|-----|
| A. 维持现状（不挑战）| 0 | 上游不动 | 下游次优实现 X / Y |
| B. <推荐> | <具体 MCP 列表> | ... | ... |
| C. <折中> | ... | ... | ... |

## 3. 影响面声明
- 受影响的上游已 done 任务（targetTaskIds）：[...]
- 受影响的下游已 done 任务（如有）：[...]
- expectedArtifacts 是否会被破坏：<是/否，破哪条>

## 4. 推荐方案 + 产品级理由
- 推荐：方案 B
- 理由（不能只说"交互更顺"，要从用户体验/性能/可维护性多角度论证）：
  1. ...
  2. ...

## 5. 回流后下游续做计划
- resumeTaskId：<下游任务 ID>
- 续做需要的额外步骤：[改本任务 md / 重新落某些 MCP / ...]
- 是否影响下游已 done 任务的 md：<是/否>
```

**decision md 强模板**：

```markdown
> 这是一份【对挑战的官方决策】，由上游 SKILL 出。
> 对应挑战：<challengeId>
> 决策状态：accepted / partially-accepted / rejected

# D-<challengeId>: <一句话决策>

## 1. 决策
accepted / partially / rejected

## 2. 理由（产品视角）
...

## 3. 实施
### 3.1 改了哪些 schema
- MCP 调用清单
- 同步更新的上游任务 notes（哪个任务 + 补丁说明）

### 3.2 expectedArtifacts 影响
- 受影响清单
- 是否需要补声明

## 4. 给下游的实现指南（accepted 写新结构怎么用；rejected 写等效不改路径）
...
```

### 3.5 Service 端契约（5 个新 op + 1 个新红线）

#### 新增 MCP op

| op | 作用 | 调用方 |
|----|-----|--------|
| `meta/raise_upstream_challenge` | 触发 challenge：自动追加 `P-revise-*` 任务 + blocked raisedBy | 下游 SKILL |
| `meta/resolve_upstream_challenge` | 关闭 challenge：unblock raisedBy + 重跑受影响 expectedArtifacts | 上游 SKILL |
| `meta/list_open_challenges` | 列所有 open / accepted-pending challenge（用于上游 SKILL Phase 0 扫描）| 上游 SKILL |
| `query/blocked_tasks` | 返回所有 status='blocked' 任务 + blockedReason | 任意 SKILL（新会话续接时）|

#### 新增红线

```
R-CHALLENGE-01：raise_upstream_challenge 时，challenge md 必须存在且含强模板的 5 段
R-CHALLENGE-02：resolve_upstream_challenge 时，decision md 必须存在
R-CHALLENGE-03：accepted 时若改了上游 schema，受影响 targetTaskIds 的 expectedArtifacts 必须当场重新通过；不通过 service 拒绝 resolve
R-CHALLENGE-04：同一 raisedBy 任务最多挂 1 个 open challenge（防滥用）
R-CHALLENGE-05：resolve 后若 raisedBy 任务的产物指纹要变（如新增节点），下游续做时需要更新本任务的 md/expectedArtifacts，否则 done 时被拒
```

### 3.6 SKILL.md 改动清单

#### 各下游 SKILL 新增"§X 上游回流"章节

模板（在 SKILL.md 红线章节之后插入）：

```markdown
## §X 发现上游问题：UpstreamChallenge 协议

### X.1 何时挑战上游

不是任何"我觉得不顺"都能挑战。必须满足两个之一：

1. **想做的实现触发上游 forbidden 红线**（且红线动机不是为了挡这个具体场景）
2. **上游产物的某个决策与本阶段同一节点/字段的最佳实现存在不可调和分歧**

不满足 → 按现有红线走（自己绕过去 / 用次优实现 / 留 md 备注）

### X.2 挑战流程（5 步）

详见 `STAGE-CONTRACT.md §0.1.9`。简版：

1. 写 challenge md（强模板见 `common/references/challenge.template.md`）
2. `meta/raise_upstream_challenge` → 自动 block 当前任务 + 在 project plan 追加 P-revise-* 任务
3. 提示用户切到上游 SKILL 或等上游 SKILL 自驱接管
4. 上游处理完后，本 SKILL 重新激活，从 blocked 任务续做
5. 续做时必读 challenge md + decision md，按新结构落 schema

### X.3 红线

- ❌ 不写 challenge md 直接改上游 schema → service 拒（forbidden-fields）
- ❌ challenge md 不含 ≥3 候选方案（含"维持现状"对照）→ service 拒（R-CHALLENGE-01）
- ❌ 一个任务同时挂 2 个 open challenge → service 拒（R-CHALLENGE-04）
- ❌ 不读 decision md 就续做 → 容易和上游决策错位
```

#### 各上游 SKILL（product-analyst / theme-generator / interaction-designer）新增"§Y 接管 challenge"章节

```markdown
## §Y 接管下游回流挑战

### Y.1 Phase 0 入场门禁新增一步

```
... 既有门禁四查 ...
⑤ meta/list_open_challenges { targetStage: <本 SKILL 阶段> }
   有 → 优先级最高，跳到 Y.2 处理流程
   无 → 走原 next_pending_task
```

### Y.2 处理流程

1. 读 challenge md
2. 写 decision md（接受 / 部分接受 / 拒绝 + 完整论证）
3. 接受 → 改 schema（用本 SKILL 阶段允许的 MCP）+ 同步对应已 done task 的 notes
4. `meta/resolve_upstream_challenge { challengeId, decision }`
5. 提示用户切回原下游 SKILL（或下游 SKILL 自驱续做）
```

---

## 4. 对真实场景的验证

回到本次卡点：`I-M1-view-business` 想 wrap `HeaderArea + FormCard + FooterLinks` 为 `NormalFormView`。

### 走新协议会发生什么

```
1. interaction-designer 写 C-INT-00-login-001.md：
   - 现状：Root.children = [HeaderArea, FormCard, FooterLinks]
   - 问题：D-B9 锁定决策要双子树，element/wrap 触发 forbidden 红线
   - 候选 A：散挂 visibleWhen（次优，HeaderArea 始终可见 + FormCard/FooterLinks 各挂同一表达式）
   - 候选 B（推荐）：wrap 三节点为 NormalFormView 容器
   - 候选 C：维持现状 + 用 LockedView 全屏 overlay 遮盖（违 statemachine §4 候选 B 否决）
   - 推荐 B 理由：① schema 单一职责（一棵子树 = 一个业务态）② design 阶段视觉规格更易统一
     ③ 减少同表达式的重复引用（DRY）

2. meta/raise_upstream_challenge：
   - 自动追加任务 P-revise-NormalFormView-wrap，stage=product
   - I-M1-view-business 状态 → blocked

3. user 切 product-analyst 或 product-analyst 自动接管：
   - read challenge md → 写 decision md（接受 + 实施 element/wrap）
   - element/wrap [HeaderArea, FormCard, FooterLinks] → NormalFormView
   - 同步 M1-skeleton notes 追加补丁
   - resolve challenge
   - I-M1-view-business 解除 blocked

4. interaction-designer 续做：
   - 在 NormalFormView 上挂 visibleWhen（unlocked 表达式）
   - 新建 LockedView 兄弟节点（locked 表达式）
   - 落 schema → done
```

**对比当前流程**：减少 1 次次优实现 + 完整留痕 + 上下游所有改动均落在 plan/md 上、可审计。

---

## 5. 实施路线图

### M1：协议落地（1-2 天）

- [ ] STAGE-CONTRACT.md 新增 §0.1.9 UpstreamChallenge 章节（含 ts 类型 + 5 步流程）
- [ ] features/design-schema 新增 `UpstreamChallengeRef` 类型
- [ ] features/design-operations 新增 4 个 op：raise / resolve / list / blocked-query
- [ ] apps/design-mcp 暴露上述 op
- [ ] 新增 R-CHALLENGE-01~05 红线到 integrity checker

### M2：模板与文档（0.5 天）

- [ ] `.codebuddy/skills/common/references/challenge.template.md`
- [ ] `.codebuddy/skills/common/references/decision.template.md`
- [ ] `analysis-notes/<projectId>/challenges/README.md` 自动生成脚本（可选）

### M3：5 个 SKILL.md 改造（1 天）

- [ ] interaction-designer/SKILL.md 新增 §X 挑战流程
- [ ] design-planner/SKILL.md 同上
- [ ] design-executor/SKILL.md 同上
- [ ] product-analyst/SKILL.md 新增 §Y 接管流程 + Phase 0 门禁第 ⑤ 项
- [ ] theme-generator/SKILL.md 同上

### M4：本案试点（0.5 天）

- [ ] 用 `I-M1-view-business` 跑全流程一遍，验证可行性
- [ ] 沉淀 1 个完整 challenge + decision 案例到 examples/

### M5：兼容老红线文案（必做）

把仓库 11 处"⛔ 退回 product-analyst"改写成：

```
如发现真有问题：
  - 优先走 UpstreamChallenge 协议（写 challenge md + raise）
  - 仅"非冲突的真错误"（如 dataSource.endpoint typo）走旧式口头退回
```

---

## 6. 反向论证：为什么不直接放开"下游可改上游"？

### 候选 X：取消 forbidden 红线，下游自由改上游

**否决理由**：

1. **角色专业边界会塌**——交互工程师改不出好的产品决策（视角不同）
2. **plan 任务责任不清**——上游 done 的任务被下游悄悄改坏，整个 expectedArtifacts 机制信任崩
3. **多人协作崩**——人类产品经理回来看 schema，发现自己 done 的任务结构变了但没记录，无法理解
4. **md 与 schema 漂移**——上游 md 写"这里是 ABC 三节点"，schema 变成"NormalFormView wrap ABC"，md 失同步

### 候选 Y：让下游"提建议但不能动"，上游用户驱动来改

**当前现状就是 Y**——已经被验证摩擦太大、留痕不足、不可恢复。

### 候选 Z：当前方案（带协议的回流）

**优势**：

- 保留 R1（schema 单一契约）/R2（单一所有者写）/R3（留痕）/R4（机器对账）
- 把"用户口头切技能"变成"系统协议自驱"
- challenge / decision md 让多人协作可审计
- 与 expectedArtifacts 机制互补（R-CHALLENGE-03 强制 accepted 后重对账）

---

## 7. 开放问题（待评审）

1. **Q：跨多阶段回流怎么办**？比如 design-executor 发现 product 错了（绕过 design-planner）
   - 当前方案：targetStage 字段允许跳级，但接管的上游 SKILL 改完后必须 cascade 通知中间阶段（design-planner）"上游变了你看看要不要跟"
   - 待细化：是否要中间阶段的 follow-up challenge 机制？

2. **Q：challenge 被拒绝后下游怎么办**？
   - 当前方案：decision md 必须给"等效不改路径"实现指南；下游按指南落 schema 标 done
   - 风险：上游可能给不出好指南（因为他不熟悉下游的具体约束）
   - 缓解：可以挂 status='blocked' + blockedReason 让用户介入

3. **Q：上游 SKILL 是否可以"主动重构"已 done 的产物**（非被动响应 challenge）？
   - 当前方案：暂不开放——上游主动改要写 self-revise.md 走类似流程，但没有外部触发
   - 倾向：M5 之后再讨论

4. **Q：要不要给"快速通道"豁免简单 typo 修复**？
   - 候选：单字段 / 单 nodeId 的 patch（如改 props.textContent typo），允许跳过 challenge 直接走 P-fix-* 简化任务
   - 倾向：M2 后讨论；先把全协议跑通

---

## 8. 与 Karpathy 行为准则对齐

- ✅ **§1 Think Before Coding**：本方案先在 md 写完整推理 + 候选 X/Y/Z 对比 + 否决理由，再讨论实施
- ✅ **§2 Simplicity First**：复用现有 plan task / md / expectedArtifacts 三件套；只新增 1 个类型 + 4 个 op + 5 条红线
- ✅ **§3 Surgical Changes**：5 个 SKILL.md 各加一节，不改既有章节；旧"退回上游"文案改写为兼容写法
- ✅ **§4 Goal-Driven Execution**：M1~M5 路线图每步验收明确（"X 写完 + 实测试点跑通"）

---

## 9. 决策点（需用户确认）

在开始 M1 前，请确认以下决策：

1. **协议命名**：`UpstreamChallenge`（推荐）/ `UpstreamFeedback` / `Kickback` / 其他？
2. **强模板深度**：challenge md 强制要求 ≥3 候选方案——是否过严？是否允许 2 候选？
3. **自动接管 vs 用户驱动**：上游 SKILL Phase 0 自动扫 open challenge 还是需要用户主动调用？
4. **跨阶段跳级**：是否允许 executor 直接 challenge product（绕过 design）？还是必须逐级回流？
5. **试点选择**：先在 `I-M1-view-business` 实战验证，还是先做协议落地再试点？

---

> 待评审 → 评审通过 → 进 M1 实施 → STAGE-CONTRACT v2.3 发布
