# Schema-First 阶段共建契约 STAGE-CONTRACT.md

> 版本：v2.6 · 2026-05-31（新增 §0.1.11 NetworkPolicy 平台一等公民：超时 / 重试统一抽象）
> 目的：为五个角色（product-analyst / theme-generator / interaction-designer / design-planner / design-executor）建立**深度对等于旧 SKILL.md 的角色定位 + 工作内容 + schema 写入契约**。
> 来源：完整回顾 git 历史中的旧 SKILL.md（392/374/252 行）+ 旧 `.design-workspaces/campus-geo-social/` 实战产物（28 屏 / 12 模块 / 每节点 8 层 JSON）
> 适用：作为五个 SKILL.md 重写的契约依据。
> 改造进度：v2.0 product-analyst / v2.1 theme-generator / v2.2 expectedArtifacts 任务级机器对账 / v2.3 UpstreamChallenge 跨阶段回流协议 / v2.4 R-EVENTS-01 退役 + anyNodeHasEvents / v2.5 翻译契约 DAM + nodeHasEvent + minimal-debug styles / **v2.6 NetworkPolicy 网络层平台一等公民**（解决 endpoint.timeout/retry 长期"约定但 schema 缺字段"的洞）。

---

## 0. 总体架构

### 0.1 不可违反的原则

1. **Schema 是唯一契约源**——所有可执行 spec（结构/样式/事件/状态/规则结论）只通过 MCP 写到 schema；下游拿契约只读 schema
2. **md 是过程留痕，与 schema 平级、分工不同**——见 §0.1.7
3. **五个角色共建一棵 schema 树**——每个角色在前一角色产物上**加层**，永不重组、永不删除上游
4. **每节点 NodeMeta 三层**（product / interaction / design）+ 一等字段（structure/styles/events/state/materials）是阶段分工的物理载体
5. **每个角色都有完整的专业方法论**——不是流程口号，是企业级专业分工
6. **每个阶段都按 plan 任务驱动**——逐项分析、逐项落库、跨会话续接
7. **入场门禁强制**——上游不达标，本阶段不准开始

#### 0.1.7 md 过程文档与 schema 的分工（任务级双产出）

**核心定位**：

| 维度 | md（过程）| schema（结果）|
|------|----------|---------------|
| 内容 | 推理 / 候选方案穷举 / 多角度验证 / 否决理由 / 完整故事或异常树 | 最终契约结论（rules / nodes / dataSources / typeDef / events / styles / ...）|
| 谁读 | 人类审阅；下游 AI 想理解动机时；新会话续接想理解前因 | 下游 AI 拿契约执行时|
| 颗粒度 | **每个最小 plan 任务一份 md** | 每个字段一处|
| 关系 | md 与 schema 平级，**不是 schema 的派生产物**，也不是 schema 的输入信息源 | 同左 |
| 漂移防护 | md 末尾必须含「→ 沉淀到 schema 的结论」段落，与本任务实际 MCP 调用 1:1 对应 | 同左 |

**强制顺序（每个 plan 最小任务）**：

```
1. 拿任务 T（next_pending_task）
2. update_plan_task { taskId: T, status: 'doing' }
3. ★ 写 md：项目根 analysis-notes/<projectId>/.../<task>.md
   - 前半：推理过程（穷举 / 树 / 验证表 / 替代方案 / 否决理由）
   - 后半：「→ 沉淀到 schema 的结论」（即将通过 MCP 落到的字段值）
4. ★ MCP 落 schema：把「沉淀」段落 1:1 翻译成 MCP 调用
5. update_plan_task { taskId: T, status: 'done', notes: 'md: <相对路径>' }
   ★ service 端会跑 task.expectedArtifacts 校验（见 §0.1.8）；不通过则被拒，
     回到第 4 步把 schema 补全再重试。
6. 给用户简短回复
```

**红线**：

- ❌ 跳过 md 直接落 schema → 任务不算 done
- ❌ 写完 md 不落 schema → 任务不算 done（md 不是终点，schema 才是契约）
- ❌ md 内容 ≤ schema（仅复述结论无推理）→ 失败：md 必须含 schema 装不下的过程信息
- ❌ md 与 schema 结论不一致 → 任务回退；md 是 schema 的论证依据，不能矛盾
- ❌ 下游用 md 内容当契约决策依据 → 必须退回上游补 schema；md 只能做"动机参考"

**文件组织（项目根，进 git）**：

```
analysis-notes/<projectId>/
├── 00-overview.md                    # 项目级总览（P-modules / P-mvp / P-arch / P-decisions）
├── modules/<M>/
│   ├── A-stories.md                  # 任务 <M>-stories
│   ├── B-flows.md                    # 任务 <M>-flows
│   ├── C-rules.md                    # 任务 <M>-rules
│   ├── D-data.md                     # 任务 <M>-data
│   └── README.md                     # 模块索引（指向各任务 md + 关键决策汇总）
├── screens/<screenId>/
│   ├── skeleton.md                   # P-X-skeleton：节点骨架取舍论证
│   ├── state-shape.md                # P-X-state-shape：state/dataSource 选择推理
│   └── coverage.md                   # P-X-coverage：三轴覆盖核对结果
├── interaction/<screenId>/...        # interaction-designer 阶段产出（后续推广）
├── design/<screenId>/...             # design-planner 阶段产出（后续推广）
└── decisions/<Dx>-<语义>.md          # 关键决策完整论证（对应 constraints.decisions[Dx]）
```

**md 顶部声明（统一头部）**：

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<taskId>
> 对应 schema 字段：<相对路径，如 screen.meta.product.rules>
```

**本次落地范围**：product-analyst（已完成）+ theme-generator（已完成 2026-05-30）；其余 3 个角色（interaction/design/executor）按相同约定后续推广。

#### 0.1.8 expectedArtifacts —— 任务级机器对账（v2.2 新增 ★）

**问题背景**：v2.0/v2.1 双产出机制下出现过"任务 done × md 写完 × schema 字段空"的假完成（如 product 阶段 `P-global-overlays` 标 done 但 `globalOverlays=null`）。根因不是 AI 偷懒，是**plan 任务的"完成判定"被设计成了 AI 主观自报**——既没有机器对账，也没有兜底校验。

**解决方案**：让每个 plan 任务自带"产物指纹"声明（`expectedArtifacts`），`update_plan_task { status:'done' }` 时 service 端强制校验产物路径，校验不过直接拒绝写入。

**核心契约**：

```ts
// features/design-schema/src/types/meta.ts
interface PlanTask {
  // ... 原有字段
  expectedArtifacts?: ArtifactCheck[];   // 任务标 done 时由机器对账
}

type ArtifactCheck =
  | { kind: 'nonEmpty';        path: string }                                 // path 非空
  | { kind: 'arrayMin';        path: string; min: number }                    // 数组 ≥ min
  | { kind: 'hasKeys';         path: string; keys: string[] }                 // 对象含全部 keys（值非空）
  | { kind: 'eachItem';        path: string; check: ArtifactCheck }           // 数组每项满足
  | { kind: 'anyNodeHasEvents'; path: string; min?: number }                  // 子树内 ≥ min 个节点有"真 event"（events[i].actions 非空）
  | { kind: 'nodeHasEvent';    nodeId: string; trigger?: EventTrigger;        // 翻译契约精确指纹（v2.5 ★，DAM 配套）
                               min?: number; path?: string };
```

> **`anyNodeHasEvents`（v2.4 ★）**：递归扫描从 `path` 起的节点子树（含自身、children、repeat.template），统计满足 `events[i].actions.length > 0` 的节点数。`min` 默认 1。
>
> 这是「该屏/该子树有没有真交互」的**结构判断**，取代旧的 R-EVENTS-01 自然语言启发式。任何合法 EventTrigger（含 blur/focus/hover/scrollReachBottom 等）配齐 actions 都算"真交互"——不再有硬编码白名单。

> **`nodeHasEvent`（v2.5 ★，配套 §0.1.10 DAM）**：在 `path`（默认 `rootNode`）起的子树深度优先查找 `id===nodeId` 的节点，要求：
> - actions 非空的 event 数 ≥ `min`（默认 1）
> - 若指定 `trigger`，至少 1 个匹配 trigger 的 event 有非空 actions
>
> 这是「上游决策声明的精确节点 + 触发器真有对应 actions」的精确指纹，配合 §0.1.10 翻译契约段使用——上游 md 列每条决策的目标 nodeId + trigger，下游 events 落库任务直接抄进 expectedArtifacts，service 端逐条对账，杜绝"决策写了但翻译漏了"。

**path 取值根**（相对，由 task 所在 scope 决定）：

| 任务挂在 | path 相对根 |
|---------|------------|
| `project.meta.plan` | `DesignProject` 整体 |
| `screen.meta.plan` | 该 `Screen` 整体 |

`path` 语法：dot/bracket，如 `globalOverlays` / `meta.globalConcerns.session` / `screens[0].rootNode.children` / `screens[*].rootNode.children`（`[*]` 是通配）。

**强制行为**：

- `update_plan_task { status: 'done' }` 时：service 跑 `verifyArtifacts(root, task.expectedArtifacts)` → 全过才允许 done
- 失败 → MCP 调用返回 `success: false` + 详细原因（哪个 path 缺什么），AI 必须真把 schema 写到位再标 done
- 任务无需做 → 改 `status: 'skipped'` + `notes` 写否决理由（skipped 不校验）
- `query/integrity`：兜底规则 R-PLAN-01 检查所有已 done 任务的产物是否仍满足（防 schema 后续被改坏）

**示例（product-analyst P-global-overlays）**：

```jsonc
meta/add_plan_tasks {
  scope: "project",
  tasks: [{
    id: "P-global-overlays",
    title: "globalOverlays 兜底层骨架",
    stage: "product",
    status: "pending",
    expectedArtifacts: [
      { kind: "arrayMin", path: "globalOverlays", min: 1 },
      { kind: "eachItem", path: "globalOverlays",
        check: { kind: "hasKeys", path: "$",
                 keys: ["id", "type", "showWhen", "rootNode"] } }
    ]
  }]
}
```

→ AI 把 `globalOverlays` 写到位才能标 done；忘写或字段不全直接被拒。

**与原"漂移防护"的关系**：

| 防护层 | 形式 | 生效时机 |
|-------|------|---------|
| md 末尾「→ 沉淀到 schema 的结论」段 | 文本约定（人类可读，AI 自律）| 写 md 时 |
| **expectedArtifacts** ★ | **机器声明 + service 强制**（不可绕过）| update_plan_task done 时 |
| query/integrity R-PLAN-01 | 全项目兜底校验 | 任意时刻 |

新机制**取代了** v2.1 里"R-PRODUCT-04 / R-PRODUCT-05 等由 integrity 检查"那批"假红线"——所有具体产物对账都由 expectedArtifacts 内建，不再让 SKILL.md 列具体 R-XX 编号（避免"声明 vs 履约"再次脱节）。

**红线**：

- ❌ 任务 add 时未声明 expectedArtifacts → 允许（兼容旧任务），但失去机器对账保护，强烈建议补
- ❌ 任务 done 时 service 报 `expectedArtifacts 未满足` → 必须改 status 或补 schema
- ❌ 用 patch={status:'done'} 同时塞假数据绕过 → 校验对的是真实 schema 真值，绕不过
- ❌ 把不该做的任务硬标 done → 改 skipped + 写否决理由是合法路径


#### 0.1.9 UpstreamChallenge —— 跨阶段回流协议（v2.3 新增 ★）

**问题背景**：v2.0~v2.2 下游 SKILL（interaction/design/executor）发现上游产物的某个具体决策不利于本阶段最佳实现时（如 interaction 想 wrap product 已建的三个节点为一个业务态容器），旧规则只给"⛔ 退回上游"硬终止——既无协议、又无留痕、又无续做路径。下游被迫做次优实现，或用户介入手动切技能，摩擦极大。

**解决方案**：把"挑战上游"变成 schema 上的一等公民产物。下游写 challenge md 触发 `meta.raiseUpstreamChallenge`，service 端原子完成"add P-revise-* 任务 + block raisedBy"；上游 SKILL 通过 Phase 0 门禁扫到 open challenge 后接管处理，写 decision md 触发 `meta.resolveUpstreamChallenge`，service 端原子完成"标 revise 任务 done/skipped + unblock raisedBy + 重对账受影响 expectedArtifacts"。

**核心契约**：

```ts
// features/design-schema/src/types/meta.ts
interface UpstreamChallengeRef {
  challengeId: string;            // 约定 C-<阶段简写>-<screenId 简写>-<NN>，如 "C-INT-00-login-001"
  challengeMd: string;            // analysis-notes/<projectId>/challenges/<challengeId>.md
  decisionMd?: string;            // resolve 时 service 写入
  phase: 'open' | 'accepted' | 'rejected' | 'resolved';
  raisedBy: string;               // 触发任务 ID
  raisedByScope: 'project' | 'screen';
  raisedByScreenId?: string;
  targetStage: 'product' | 'theme' | 'interaction' | 'design';
  targetTaskIds: Array<{ taskId: string; scope: 'project' | 'screen'; screenId?: string }>;
  decision?: { accepted: boolean; rationale: string; appliedAt: string };
}

interface PlanTask {
  // ... 原有字段
  upstreamChallenge?: UpstreamChallengeRef;
}
```

**5 步工作流**：

```
1. 下游 SKILL 推进任务 T_down 时发现冲突
2. 下游写 challenge md（强模板见 .codebuddy/skills/common/references/challenge.template.md，
   ≥3 候选方案 + 影响面声明 + 推荐理由）
3. 调 meta.raiseUpstreamChallenge → service 原子地：
   a. 在 project.meta.plan 末尾追加 stage='product' 的 P-revise-<challengeId> 任务（含 ref）
   b. T_down 置 status='blocked' + blockedReason + 写 ref
4. 用户切到 targetStage 对应 SKILL 接管，或上游 SKILL Phase 0 门禁扫到 open challenge 自驱接管
5. 上游 SKILL：
   a. read challenge md
   b. 写 decision md（accepted / partially / rejected + 完整论证 + 给下游的实现指南）
   c. accepted → 用本阶段允许的 MCP 改 schema + 同步上游 task notes
   d. 调 meta.resolveUpstreamChallenge → service 原子地：
      i. 标 P-revise-* 任务 done（accepted）/ skipped（rejected）
      ii. unblock T_down → status='pending'（保留 challenge ref 用于追溯）
      iii. accepted 时重跑受影响 targetTaskIds 的 expectedArtifacts（R-CHALLENGE-03）
6. 下游 SKILL 重新激活，next_pending_task 拿到 T_down，read decision md 后续做
```

**关键 op**：

| op | 调用方 | 作用 |
|----|-------|-----|
| `meta.raiseUpstreamChallenge` | 下游 SKILL | 原子触发挑战；自动 add P-revise-* + block raisedBy |
| `meta.resolveUpstreamChallenge` | 上游 SKILL | 原子关闭挑战；unblock raisedBy + 重对账受影响产物 |
| `query.list_open_challenges` | 上游 SKILL | Phase 0 门禁第 ⑤ 项扫描；过滤 targetStage |
| `query.blocked_tasks` | 任意 SKILL | 新会话续接排查"卡住的任务"用 |

**红线**：

- ❌ **R-CHALLENGE-01**：raise 时 challengeMd 缺失 / 不以 .md 结尾 → service 拒
- ❌ **R-CHALLENGE-02**：resolve 时 decisionMd 缺失 / rationale < 10 字符 → service 拒
- ❌ **R-CHALLENGE-03**：accepted resolve 时受影响 targetTaskIds 的 expectedArtifacts 重对账失败 → service 拒；上游必须先把受影响产物补回再 resolve
- ❌ **R-CHALLENGE-04**：同一 raisedBy 当前已有 open / accepted 状态的 challenge → service 拒；先 resolve 再发新挑战
- ❌ **R-CHALLENGE-05**：raisedBy 任务 status 当前已是 blocked → service 拒；先 unblock

**何时该挑战上游**（必须满足之一）：

1. 想做的实现触发上游 forbidden 红线（且红线动机不是为了挡这个具体场景）
2. 上游产物的某个决策与本阶段同一节点/字段的最佳实现存在不可调和分歧

**不满足** → 按现有红线走（自己绕过去 / 用次优实现 / 留 md 备注），不要滥用挑战。

**与现有 forbidden / expectedArtifacts 机制的关系**：

| 防护层 | 守什么 |
|-------|--------|
| `forbidden-fields-<阶段>.md` | 静态边界（"哪些字段你不能写"）|
| `expectedArtifacts` | 任务级动态对账（"你声明 done 之后，schema 真有产物吗"）|
| **`UpstreamChallenge`** ★ | 跨阶段协商（"你越界写不了，但发现真有问题怎么办"）|

三层互补：forbidden 兜界、expectedArtifacts 兜履约、UpstreamChallenge 兜分歧。

详细方案：`UPSTREAM-FEEDBACK-PROPOSAL.md`。


#### 0.1.10 翻译契约（Decision-to-Artifact Mapping，DAM）—— v2.5 新增 ★

**问题背景**：v2.0~v2.4 流程下出现过这种"事前漏译"：

- `errors.md` 决策 D-E4 写"校验时机 onBlur+onSubmit 双档"
- `events.md` 落库时只写了 onBlur 校验，**onSubmit 校验漏译**
- `expectedArtifacts: anyNodeHasEvents` 看不出来这种语义级遗漏（屏内有 events 就过）
- checker 也看不出来（不检查 md 的决策有没有翻译完）
- 用户预览时点 SubmitBtn 输入非法直接静默，反映到 UI 才发现"事前怎么漏的"

**根因**：上游分析 md（`statemachine / operations / loading / errors / boundaries / state-vars / datasources`）的"决策 → schema 产物"映射只活在 AI 脑子里，写完 md 就丢失，下游 `events / state-vars / datasources` 等落库任务执行时**没有显式 todo 清单**可逐条勾选，自然会漏。

**解决方案**：把"决策 → 产物"映射变成 md 的**强制结构化段落** + service 端机器对账。

#### 1. 上游分析 md 强制 ★ 翻译契约 段

每份分析 md（statemachine / operations / loading / errors / boundaries / state-vars / datasources / 7 类衍生视图 / overlays）末尾**强制**写一段：

```markdown
## ★ 翻译契约（Decision-to-Artifact Mapping）

> 本任务的所有决策中，**有 schema 产物**的部分按下表 1:1 映射。
> 下游落库任务执行时把所有上游分析 md 的"翻译契约"段拼起来形成 todo 清单，逐条勾掉。

| 决策 ID | 决策内容（一句话）| 应翻译为 schema 产物 | 落库任务 | nodeId（如适用）| 期望指纹 |
|---------|------------------|---------------------|---------|-----------------|---------|
| D-E4 | 校验时机 onBlur+onSubmit 双档 | (1) PhoneInput.blur 校验 actions<br>(2) CredentialInput.blur 校验 actions<br>(3) **SubmitBtn.click 前置校验 actions** | `I-X-events` | `nd_083c...`<br>`nd_989c...`<br>`nd_5a15...` | `nodeHasEvent { trigger:'blur' }`<br>`nodeHasEvent { trigger:'blur' }`<br>`nodeHasEvent { trigger:'click' }` |
| D-B1 | ds-login networkPolicy.timeout=15000ms（v2.6 ★）| ds-login.endpoint.networkPolicy={timeout:15000} | `I-X-datasources` | — | `nonEmpty path: dataSources[id=ds-login].endpoint.networkPolicy.timeout` |
| D-E5 | 不做 onChange debounce | （无 schema 产物，决策记录即足）| — | — | — |

字段说明：
- **决策 ID**：md 内决策段落的 ID（如 `D-E4`），便于追溯
- **决策内容**：一句话总结
- **应翻译为 schema 产物**：精确到节点 + 字段；多产物各写一行
- **落库任务**：归属哪个 `I-X-*` 任务执行（events / state-vars / datasources / view-* / overlays / meta 之一）
- **nodeId**：如果产物落到具体节点，写节点真实 ID；多个用 `<br>` 分隔
- **期望指纹**：建议的 ArtifactCheck 指纹（kind + 关键参数），下游落库时直接抄入 plan 任务 expectedArtifacts

**没有 schema 产物的决策**（如"反向论证否决"、"次要 UX 取舍"）也要列出来——以"无 schema 产物"标注，证明 AI 没漏想这条。

#### 2. 落库任务（events / state-vars / datasources / view-* / overlays）执行流改造

落库类任务（events / state-vars / datasources / 7 类 view-* / overlays / global-overlay-events）md 头部**强制**先写一段：

```markdown
## ☐ 翻译清单 todo（从上游分析 md 汇总）

> 启动时把所有上游分析 md 的"翻译契约"段汇总到这里，每条 [ ] 必须落 schema 后改 [x]，
> 全部勾完才能定稿本 md 并标本任务 done。

来源：
- `statemachine.md` 翻译契约段：3 条
- `operations.md` 翻译契约段：12 条
- `errors.md` 翻译契约段：8 条
- `boundaries.md` 翻译契约段：5 条
- `state-vars.md` 翻译契约段：6 条（已落库——本任务不重复执行，仅核对）

合计 34 条产物。逐条落：

- [ ] D-E4(1) PhoneInput.blur 校验 actions → `nodeHasEvent { nodeId: nd_083c..., trigger: 'blur' }`
- [ ] D-E4(2) CredentialInput.blur 校验 actions
- [ ] D-E4(3) **SubmitBtn.click 前置校验 actions** ★ ← 历史漏译复盘
- [ ] D-EV1 ModeToggle click 切 loginMode
- [ ] ...
- [x] D-B1 ds-login.endpoint.networkPolicy.timeout=15000  （由 datasources 任务已落，本任务跳过）
```

**强制规则**：
- 落库任务的 md 中必须含此 todo 清单
- 每条产物对应一段"actions 链翻译过程"或"产物字段值"的细节推理
- 全部 [x] 后写 ★ 沉淀到 schema 的结论 段
- 任务标 done 时把所有有 nodeId 的 [x] 项的指纹塞进 expectedArtifacts，service 端机器对账

#### 3. 配套 ArtifactCheck 类型（v2.5 新增）

```ts
type ArtifactCheck =
  // ... 原有 5 种
  | {
      kind: 'nodeHasEvent';
      nodeId: string;          // 节点真实 ID（schema 已生成）
      trigger?: EventTrigger;  // 可选：限定 trigger
      min?: number;            // 默认 1
      path?: string;           // 默认 'rootNode'，子树搜索起点
      message?: string;
    };
```

实现见 `features/design-schema/src/integrity/verify-artifact.ts` 的 `checkNodeHasEvent`：
- 在 path 起的节点子树深度优先查 `id===nodeId` 的节点
- actions 非空的 event 数 ≥ min；若指定 trigger 则要求该 trigger 至少 1 个有非空 actions
- 失败返回精确路径 + nodeId 让 AI 立即定位

#### 4. 派生展示节点的 minimal-debug styles（配套）

为了让"翻译契约 → 产物 → 用户能预览到"形成完整闭环，**interaction 阶段对纯展示派生节点（如 PhoneError / CredentialError / 各 InlineFieldError）允许写一组最小调试 styles 白名单**：`color / fontSize / marginTop / minHeight / padding`。

理由：interaction 阶段验证决策有没有翻译落地的最直接方式就是预览看到红字。一直等到 design 阶段才有视觉，会让 interaction 期间的"翻译契约 todo 已勾完"和"用户实际能看到错误"脱节。design 阶段会用主题 token 覆盖这组 minimal-debug styles，不会冲突。

详见 `forbidden-fields-interaction.md` §派生展示节点 minimal-debug styles 白名单。

#### 5. 影响面

- `interaction-designer/references/note-templates/*.template.md` 的 5 个分析模板 + 2 个准产物模板（state-vars/datasources）末尾全部加 ★ 翻译契约段
- `events.template.md` 头部强制 ☐ 翻译清单 todo
- `interaction-designer/SKILL.md` 任务流程改造（events 任务前**必须**先 read 所有上游 md 的翻译契约段）
- `forbidden-fields-interaction.md` 加 minimal-debug styles 白名单

#### 6. 防止 DAM 段本身造假的兜底

DAM 段本身也是 AI 写的——会不会"决策列了但翻译契约段没列产物"？

兜底机制：
- 落库任务（events 等）的 md 头部 todo 清单**必须从所有上游 md 自动汇总**：缺一条就显式写"上游 md 此决策没列翻译契约 → 退回上游补"
- 这是 AI 的诚实义务，service 端不强制（因为 md 是过程文档不进 schema）；但 AI 在做 events 落库时若发现某个上游决策没列翻译契约，**必须当作上游缺陷退回**

#### 7. 与 anyNodeHasEvents / R-EVENTS-02 的关系

| 防护层 | 守什么 | 谁在用 |
|-------|--------|------|
| `anyNodeHasEvents` | 屏 / 子树**至少有一个**真交互 | events 任务粗粒度兜底 |
| `nodeHasEvent` ★ | 上游决策声明的**精确节点 + 触发器**真有对应 actions | events 任务的翻译契约逐条对账 |
| R-EVENTS-02 | 任意 event 写了 trigger 但 actions=[] | checker 全节点扫描兜底 |

三层互补：粗→精→零空壳。

#### 0.1.11 NetworkPolicy —— 网络层平台一等公民（v2.6 新增 ★）

**问题背景**：v2.5 之前，boundaries.md 里"ds-login timeout=15000ms"这样的边界写了很多，但 schema 的 `ApiEndpoint` 类型**根本没有 timeout 字段** —— 写入直接被 zod strip。Mock 场景靠 `delay + isTimeout` 模拟"超时态"，HTTP 真接口靠浏览器默认超时（通常 5min+）兜底。事实链：
- AI 落 datasources 任务时多次发现工具不支持 → 标"D-DS6 暂不动" 草草跳过
- v2.5 复盘把它列为"事前漏译"，但根因不是 AI 漏译——**是平台少了一等字段**
- 错误码也乱：mock 已用 'TIMEOUT'，但 events 模板/AI 写的全是 NETWORK_ERROR

**解决方案**：把"超时 / 重试 / 取消"统一抽象为 `ApiEndpoint.networkPolicy` 子结构，五层闭环：

| 层 | 改动 |
|----|------|
| Layer 1: schema types | `features/design-schema/src/types/dataSource.ts` 新增 `NetworkPolicy` + `ErrorCode` 类型；`ApiEndpoint.networkPolicy?` 字段 |
| Layer 2: validator | `features/design-schema/src/validators/data.ts` 加 `NetworkPolicySchema` + `ErrorCodeSchema`；`ApiEndpointSchema.networkPolicy` 接入 |
| Layer 3: ops type | `features/design-operations/src/types/operations/data-source.ts` 新增 `DataSourceSetNetworkPolicyOp` + 联合类型；`features/design-operations/src/operations/data-source.ts` 新增 `executeSetNetworkPolicy` 实现 |
| Layer 4: runtime | `features/design-engine/src/state/EffectExecutor.ts`：`run()` 按 policy 安装 setTimeout(controller.abort, timeout)；超时后 status='error' + code='TIMEOUT'；retryCount + retryDelay 实现指数退避；区分 abort reason（timeout vs cancel）保证 cancel→idle 不变 |
| Layer 5: MCP 工具 | `apps/design-mcp/src/tools/domain/data-source.ts` `EndpointSchema.networkPolicy` 接入 + 新增 `set_network_policy` action（粒度细于 set_endpoint，避免误重置 method/path/body）|
| Layer 6: 编辑器 UI | `apps/design_front/.../ApiEditor.tsx` 新增 `NetworkPolicySection` 面板（timeout/retryCount/retryDelay/retryOn 多选）|

**错误码标准化（同步 v2.6）**：
- `TIMEOUT`（v2.6 ★ 新拆）：链路慢 → 用户该重试
- `NETWORK_ERROR`：物理断网 / DNS / connection refused → 用户该开网络
- `SERVER_ERROR`：5xx → 服务方问题
- 业务错码（CREDENTIAL/LOCKED/LIMIT_EXCEEDED 等）：保留原 code（4xx 数字或 responseBody.code 字符串），与 retry / Network 错误彻底解耦
- HttpDriver 5xx 自动归一化为 SERVER_ERROR；4xx 保留原数字 code 给 logic.switch 消费业务错

**重要边界（写入 mock-scenarios.md §4.5）**：
- ❌ 写入业务错码到 retryOn → 重复扣费 / 多次写错误计数
- ❌ retryCount × timeout 总等待 > 60s → 用户已离开
- ✅ undefined 沿用平台默认（无超时无重试），保持向后兼容

**influx 扫描结果**（影响面）：
- 受影响测试：`features/design-engine/src/state/__tests__/effectExecutor.test.ts`（statusCode 5xx 测试期望从 500 数字改为 'SERVER_ERROR' 字符串；新增 4 个 NetworkPolicy 测试）
- 新增 SKILL 文档：`mock-scenarios.md §4.5`、`datasources.template.md DS-3 翻译契约`、`boundaries.template.md "请求超时" 行`、`errors.template.md 错误类表 + TIMEOUT 翻译契约行`
- 后续阶段（design-planner / design-executor）**无需感知**——networkPolicy 是 interaction 层契约，不读写 styles / visualState。

### 0.2 五个角色的链路与产出

```
┌──────────────────────────────────────────────────────────────────────┐
│  product-analyst                                                       │
│  「产品经理」                                                           │
│  - 输出：业务规则 / 信息架构 / 模块拆分 / 完整节点骨架 / 数据接口         │
│  - 写入：project.meta + screen.meta.product + 每节点 meta.product       │
│         + 每节点结构（用准确 primitive） + dataSources 占位             │
│         + stateInit.view 占位                                           │
│  - 完成后触发 theme-generator                                           │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│  theme-generator                                                       │
│  「视觉系统科学家」                                                     │
│  - 输出：完整 Design Token（colors/typography/spacing/radii/shadows）   │
│         + decorationRules + iconSpec + stateSpec                       │
│  - 写入：project.theme                                                  │
│  - 用色彩科学（HSL 色轮 / APCA / modular scale）推导，不靠感觉           │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│  interaction-designer                                                  │
│  「交互设计师」                                                         │
│  - 输出：状态机 / 操作清单 / 加载策略 / 错误处理 / 边界 Case            │
│         + 每节点 events.actions / state.view 完整化 / dataSource 完整化 │
│         + 运行时衍生节点（toast/overlay/spinner）                       │
│  - 写入：screen.meta.interaction + 每节点 meta.interaction              │
│         + 每节点 events + bind + stateInit + dataSources + 衍生节点     │
│  - 5 层反馈链 + 6 类错误 + 7 类边界 Case 全覆盖                          │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│  design-planner                                                        │
│  「UI/视觉设计师」                                                      │
│  - 输出：视觉先行分析（情感/层级/手段/装饰/素材） + 视觉统筹分层         │
│         + 组件视觉预算分配 + Atomic 组件分层 + 装饰节点                 │
│         + 全量样式 + visualStates 完备 + 素材规格                       │
│  - 写入：screen.meta.design + 每节点 meta.design                        │
│         + 每节点 styles + visualStates + 装饰节点 + materialSpec        │
│  - 三层统筹（项目 → 屏幕 → 组件）+ 视觉预算约束                          │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│  design-executor                                                       │
│  「实施 + QA」                                                          │
│  - 输出：素材实际绘制（PNG） + 应用到节点 + 截图核对 + 终验              │
│  - 写入：每节点 materials 槽位 + meta.status.phase=verified             │
│  - 不做任何设计决策——所有规格读 materialSpec 照做                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 1. 角色：product-analyst（产品经理）

### 1.1 视角与定位

**你是资深产品经理。你不是抄需求的，你是把模糊想法转化成可实施 spec 的人。**

每一个需求来到你这里，你都必须像 PM 一样思考：
- 用户是谁、想解决什么、心智模型是什么
- 这个产品所在领域有哪些隐含模块（你必须主动挖掘，用户不会全告诉你）
- MVP 边界在哪里、什么放 P0 什么放 P1
- 每个模块的用户故事 / 流程 / 业务规则 / 数据接口完整画出来
- 每屏在产品流中扮演什么角色 / 上游和下游是什么

### 1.2 核心方法论（一定要保留的旧版精华）

#### A. 产品定位四要素

| 要素 | 说明 |
|------|------|
| 一句话定位 | 用一句话讲清楚是什么 |
| 核心价值 | 不可被替代的差异化 |
| 目标用户 | Primary / Secondary 分层（年龄/职业/场景/痛点） |
| 使用场景 | 高频场景 → 中频 → 低频，每个场景的设备/网络/情绪 |

#### B. 领域识别框架（主动挖掘隐含模块）

| 产品类型 | 必有模块（用户没说也得有） |
|---------|---------------------------|
| 社交类 | 用户体系 / 内容创建 / 内容消费 / 关系链 / 互动反馈 / 通知 / 隐私安全 / 举报投诉 |
| 工具类 | 主功能 / 历史记录 / 收藏夹 / 设置 / 帮助引导 / 数据同步 |
| 电商类 | 商品 / 购物车 / 订单 / 支付 / 物流 / 售后 / 评价 / 优惠券 / 用户中心 |
| 内容类 | 内容入口 / 推荐 / 搜索 / 详情 / 收藏 / 历史 / 分类 / 创作工具 |

→ 在你的领域里没列到模块的，你要主动问 / 主动假设并标注。

#### C. MVP 分级 P0/P1/P2/P3

```
P0：MVP 必须，没它不成产品
P1：基础体验，没它产品很难用
P2：增长体验，没它不影响核心使用
P3：未来规划，明确不在本期
```

#### D. 五步分析法（每个模块必做）

| Step | 内容 | 关键 |
|------|------|------|
| A. 用户故事 | "作为 X，我希望 Y，以便 Z" | 穷举核心 / 扩展 / 异常三类故事 |
| B. 核心流程 | 主线 Happy Path + 异常分支树 | 每节点问"失败 / 空数据 / 权限不足 怎么办" |
| C. 业务规则 ★ | **数据 / 业务 / 安全 / 边界 四类** | **不允许空——产品的灵魂在规则里** |
| D. 数据模型 | 实体（字段）+ 接口（method/path/body） | 给 dataSources 占位声明输入 |
| E. 信息架构 | 屏幕清单 + 跳转关系 | 决定项目有多少屏 + navigation.flows |

#### E. 业务规则四类（不可缺一）

```
数据规则：字段长度/格式/枚举/必填/默认值
业务规则：流程约束/状态转换/权限/计费
安全规则：防滥用/合规/隐私/审核/限流
边界 Case：网络断/服务挂/数据空/并发冲突/重复提交
```

#### F. 业务对象状态机识别 ★（不可省）

每个模块涉及的"有状态业务对象"（订单/任务/审批/工单/账户/会话/作品）必须**显式列出状态机**，因为它会直接驱动下游 interaction 阶段建衍生视图节点。

```
对每个业务对象 O：
  - 字段名（如 order.status / task.state）
  - 全部枚举值（pending_payment / shipping / completed / cancelled / refunding ...）
  - 每个状态的"用户看到什么 UI 主题"（一句话即可）
  - 状态间合法转换（哪些状态可以转到哪些）
  - 谁触发转换（用户 / 系统 / 时间）
```

落到 `screen.meta.product.rules` 中以独立一条规则形式：

```
"业务规则: 订单状态机 order.status ∈ {pending_payment, awaiting_shipment, shipping, completed, cancelled, refunding}，
 每个状态对应一个独立视图分支"
```

#### G. 数据源运行时态识别（不可省）

每个 API 数据源都隐含 4 个运行时态：`idle / pending / success(empty?) / error`。**product 阶段必须告知**下游"本屏哪些数据源需要：骨架 / 空态 / 错误态"。

落到 `screen.meta.product.rules` 或 `dataSources[*].description`：

```
"数据规则: ds-feed 为列表型，首屏 cold-start 需骨架屏，空列表需引导发现页"
"边界: ds-login 网络断时显示离线 banner + 重试"
```

#### H. 全局态识别（不可省）★ 项目级

跨屏共享、生命周期跨屏的状态，必须在产品阶段就识别清楚，落到项目级。判断标准：
1. **跨屏共享**——多个屏读/写
2. **生命周期跨屏**——不随屏切换重置

按 5 大类穷举：

| 类别 | 例子 | 落点 |
|------|------|------|
| **会话/认证** | session / token / user / role / permissions / loginExpiry | `project.globalStateInit.view.session` 等 |
| **环境/网络** | networkStatus(online/offline) / appVersion / featureFlags / deviceInfo / locale | `project.globalStateInit.view.network` 等 |
| **全局 UI 偏好** | themeVariant / fontSize / language / a11y / colorScheme | `project.globalStateInit.view.preferences` |
| **跨屏导航上下文** | lastVisitedScreen / referralSource / pendingDeepLink / authRedirectTo | `project.globalStateInit.view.nav` |
| **全局兜底层 UI** | OfflineBanner / SessionExpiredModal / GlobalErrorBoundary / NetworkRetryToast / AppUpdatePrompt | `project.globalOverlays[]`（项目级覆盖层）|

每个识别到的全局态写到 `project.meta.globalConcerns`（叙事） + `project.globalStateInit.view` 占位 + `project.globalOverlays` 节点骨架（如需）。

#### I. 全局覆盖层（globalOverlays）骨架建设

类似 `screen.overlays`，但跨所有屏渲染——叠在屏内容 + 屏 overlays 之上。例子：

```jsonc
project.globalOverlays = [
  {
    id: "global-offline-banner",
    name: "全局离线条",
    type: "custom",
    showWhen: "{{ globalView.network.status === 'offline' }}",   // 自动显隐
    rootNode: {
      id: "offlineBannerRoot",
      type: "div",
      name: "OfflineBanner",
      styles: {}, props: {}, children: [
        { id: "...icon...",     type: "div", name: "WifiOffIcon", ... },
        { id: "...text...",     type: "div", name: "OfflineText", props: { textContent: "网络已断开，部分功能受限" } },
        { id: "...retry-btn...", type: "button", name: "RetryButton", props: { textContent: "重试" } }
      ],
      states: [], events: [], activeState: "default", locked: false, visible: true,
      meta: { product: { summary: "网络断开时全局提示" } }
    },
    backdrop: undefined  // 不需要蒙层
  },
  {
    id: "global-session-expired",
    name: "登录过期 Modal",
    type: "modal",
    showWhen: "{{ globalView.session.status === 'expired' }}",
    rootNode: { ... },
    backdrop: { color: "rgba(0,0,0,0.5)", dismissible: false }
  },
  {
    id: "global-app-update",
    name: "App 升级提示",
    type: "modal",
    showWhen: "{{ globalView.env.hasNewVersion && !globalView.preferences.updateDismissed }}",
    rootNode: { ... }
  },
  {
    id: "global-error-boundary",
    name: "全局错误兜底",
    type: "custom",
    showWhen: "{{ globalView.errorBoundary.crashed }}",
    rootNode: { ... }
  }
]
```

**与屏级 overlays 的区分**：
- 屏级 (`screen.overlays`)：仅本屏需要，随屏切换重置（如登录页的锁定 Sheet）
- 项目级 (`project.globalOverlays`)：跨屏共享（如全局离线 banner / session 过期）

**红线**：判断不准时倾向"项目级"——重复定义在屏级会失去同步。

### 1.3 必须建完整节点骨架（关键差异 vs 旧版）

旧版用 md 写"节点结构"，新版**必须**在分析每屏时**直接在 schema 建出所有业务节点**。理由：
- 你已经知道这屏长啥样了——五步法已经穷举出所有元素
- 后续 interaction 阶段挂事件需要节点已就绪
- design 阶段做视觉统筹需要节点骨架已就绪

#### 建什么 / 不建什么

| 类型 | 是否建 |
|------|:-----:|
| 区域容器（HeaderArea / FormCard / FooterLinks） | ✅ 建 |
| 业务原子节点（PhoneInput / SubmitBtn / ModeToggle / BrandLogo） | ✅ 建 |
| 业务复合组件（FormField = label + input + error） | ✅ 建（含内部叶子） |
| 装饰元素（背景光晕 / 角落装饰 / 分割线纹理） | ❌ 不建（留给 design） |
| 运行时显隐节点（LoadingOverlay / ErrorToast / SuccessSheet） | ❌ 不建（留给 interaction） |

#### Primitive 选择

每个节点用**准确的 HTML primitive**：
- 按钮 → `button`
- 输入框 → `input` / `textarea`
- 图片 → `img`
- 容器 / 文本 → `div`

#### 命名规范

PascalCase + 语义化：`HeaderArea` / `SubmitBtn` / `BrandLogo`（不是 `div1` / `btn`）

### 1.4 stateInit + dataSources 占位声明

每屏在建骨架同时声明：

#### state.view 占位

```jsonc
stateInit.view: {
  // 此屏要管理什么 UI 临时态——只声明 key + 默认值，不写完整定义
  loginMode: { defaultValue: "code", enum: ["code", "password"], label: "登录方式" },
  form:      { defaultValue: { phone: "", credential: "", policy: false } },
  submitting:{ defaultValue: false }
  // 完整化（如 errors 子结构）留给 interaction 阶段
}
```

#### dataSources 占位

```jsonc
dataSources: [
  {
    id: "ds-login", type: "api", name: "登录接口",
    endpoint: { method: "POST", path: "/api/auth/login" },
    meta: { summary: "提交手机号+凭证返回 token 和 user" }
    // mock 场景、auto-fetch 留给 interaction 阶段
  }
]
```

### 1.5 写入 schema 的字段清单（精细到字段名）

#### A. 项目级（DesignProject）

```jsonc
project.meta.targetUser:      { summary: "...Primary/Secondary 用户分层..." }
project.meta.coreScenarios:   [ { id: "S1", summary: "...场景描述..." }, ... ]
project.meta.styleDirection:  { summary: "...风格大方向，喂给 theme-generator..." }
project.meta.constraints.decisions: [ { id: "D1", summary: "...关键决策..." }, ... ]
project.meta.modules:         {
  M1: { name: "用户认证", priority: "P0", summary: "..." },
  M2: { name: "...", priority: "P1", summary: "..." },
  ...
}
project.meta.navigation:      {
  tabBar: ["home", "discover", "me"],
  flows:  [ { from, to, trigger, transition: "fade|push|modal" }, ... ]
}
project.meta.plan:            PlanTask[]    // 项目级任务清单
project.meta.globalConcerns:  {              // ★ 全局态识别叙事（5 类）
  session:     { summary: "用户认证 + 角色 + 权限 + token 生命周期" },
  network:     { summary: "在线/离线 + 重连策略" },
  preferences: { summary: "主题变体 / 字号 / 语言 / a11y" },
  navigation:  { summary: "lastVisited / deepLink / authRedirect" },
  fallback:    { summary: "全局错误兜底 / session 过期 / 版本升级" }
}
project.globalStateInit.view: Record<string, ViewVariableDef>  // ★ 跨屏共享变量占位
// 例：{
//   session:     { name, label: "会话信息", defaultValue: null },
//   network:     { name, label: "网络状态", defaultValue: { status: "online", retryCount: 0 } },
//   preferences: { name, label: "用户偏好", defaultValue: { theme: "light", fontSize: "md", lang: "zh-CN" } },
//   nav:         { name, label: "导航上下文", defaultValue: { lastVisited: null, pendingDeepLink: null } }
// }
project.globalOverlays:       OverlayNode[]  // ★ 项目级覆盖层骨架（跨屏渲染）
                                              // 见 §1.2 I 完整结构
project.screens:              Screen[]       // 通过 screen/add 创建
```

#### B. 屏幕级（Screen）

```jsonc
screen.id, name:              通过 screen/add 创建
screen.backgroundColor:       可选——product 阶段先不写（design 阶段写 token 引用）
screen.rootNode:              一棵完整业务骨架（见 §1.3）
                              ⚠️ 装饰 / 运行时显隐节点不在本阶段建
screen.meta.product.summary:   该屏一句话定位
screen.meta.product.fromModules: ["M1"]  哪些模块汇聚到本屏
screen.meta.product.rules:    [
  "数据规则: ...",
  "业务规则: ...",
  "安全规则: ...",
  "边界 Case: ..."
]   ★ 必须 ≥ 4 类，违反 → R-PRODUCT-01
screen.meta.product.ref:      可选 (本期一般为空)
screen.meta.plan:             PlanTask[]   屏级任务清单
screen.meta.status.phase:     "analyzed"   阶段完成时打
```

#### C. 屏级 dataSources（API 接口占位声明）★

```jsonc
screen.dataSources: [
  // ===== API 类型 =====
  {
    id: "ds-login",                          // 唯一 ID（kebab-case + ds- 前缀）
    type: "api",
    name: "登录接口",
    description: "提交手机号+凭证返回 token 和 user",
    endpoint: {
      method: "POST",                        // GET | POST | PUT | PATCH | DELETE
      path: "/api/auth/login",               // 可含 {{state.x}} 表达式
      headers: { "Content-Type": "application/json" },
      query: { /* GET 用 */ },
      body: {                                // POST 占位（具体 expression 由 interaction 阶段补）
        phone: "<placeholder>",
        credential: "<placeholder>",
        mode: "<placeholder>"
      },
      responseSchema: {                      // ⭐ 重要：声明响应结构（codegen 用）
        type: "object",
        properties: {
          token: { type: "string" },
          user: { type: "object", properties: { id, nickname, avatar, phone } },
          expiresIn: { type: "number" }
        }
      }
    },
    // ⭐ typeDef ★ 给 codegen 生成 TypeScript 类型（PascalCase 名）
    typeDef: {
      responseName: "LoginResponse",
      responseShape: "object",
      responseFields: [
        { name: "token",     type: "string",        description: "JWT 凭证" },
        { name: "user",      type: "User",          description: "用户信息" },
        { name: "expiresIn", type: "number",        description: "过期秒数" }
      ],
      paramsName: "LoginParams",
      paramsFields: [
        { name: "phone",      type: "string" },
        { name: "credential", type: "string" },
        { name: "mode",       type: "'code' | 'password'" }
      ]
    }
    // ⛔ mock 不在本阶段写——留给 interaction 阶段
    // ⛔ defaultParams / autoFetchOnEnter 不在本阶段写——留给 interaction
  },

  // ===== Static 类型（常量数据）=====
  {
    id: "ds-policy-text",
    type: "static",
    name: "隐私协议文案",
    description: "登录页底部协议链接的文案集",
    initial: {                                // 启动注入到 state.data.policyText
      privacyTitle: "《隐私协议》",
      termsTitle: "《用户服务协议》"
    }
  }
]
```

**红线**：
- product 阶段把每个识别到的 API 都写成 `dataSources` 条目，**至少含 endpoint.method/path/body + typeDef**
- typeDef 是产品阶段就该明确的"接口契约"（字段名/类型/含义）——不能拖到 interaction 才补
- mock 场景 / autoFetchOnEnter / defaultParams 留给 interaction（因为它们是运行时策略，不是契约）

#### D. 屏级 stateInit（state 占位声明）

```jsonc
screen.stateInit = {
  // ===== view 命名空间：UI 临时态（输入值/tab/弹窗显隐/loading 等） =====
  view: {
    loginMode: {
      name: "loginMode",
      label: "登录方式",
      defaultValue: "code",
      enum: [
        { value: "code",     label: "验证码免密" },
        { value: "password", label: "密码登录" }
      ],
      // ⛔ previewValue 不在本阶段写（design 阶段才补编辑期预览值）
    },
    form: {
      name: "form",
      label: "表单数据",
      defaultValue: { phone: "", credential: "", policy: false }
    },
    submitting: {
      name: "submitting",
      label: "提交中",
      defaultValue: false
    }
    // ⛔ errors / canSubmit / failureCount 等运行时派生态留给 interaction 完整化
  },

  // ===== data 命名空间：业务数据（API 响应 / 启动注入） =====
  // ⭐ 产品阶段为每个 API 数据源声明一个 data key 占位
  data: {
    // 通常被 effect.fetch 的 onSuccess 写入，本阶段写空值/默认结构
    user:    null,
    session: null
  },
  // ⭐ dataTypes ★ 给 codegen 生成 useState<T> 类型
  dataTypes: {
    user:    { typeName: "User",         isArray: false },
    session: { typeName: "Session",      isArray: false }
  }
}
```

**红线**：
- 每个 API 数据源都对应一个 `data` 占位 + `dataTypes` 类型注解
- dataTypes 必须用 PascalCase 类型名（与 dataSources.typeDef.responseName 一致）
- view 变量只声明"已知的产品决策态"（如登录方式 / 表单结构），不预测交互细节

#### E. 节点级（ComponentNode 树）

```jsonc
node = {
  id, type (准确 primitive: button/input/img/div/...), name (PascalCase),
  label: "中文显示名（可选）",
  styles: {},               // ⛔ 留空，design 阶段全量写
  props: {                  // ⭐ 文本节点的 textContent 在这里
    textContent: "登录",     // 已确定的文案（不变文案直接写；动态文案留给 interaction）
    placeholder: "请输入手机号",
    type: "tel"             // input 的 type
    // ... 其他 HTML 属性
  },
  children: [],
  states: [],               // ⛔ 留空，design 阶段写
  events: [],               // ⛔ 留空，interaction 阶段写
  activeState: "default",
  locked: false,
  visible: true,

  // ⛔ 以下都留空，下游阶段写：
  // visibleWhen: undefined,    interaction（动态显隐）
  // bind: undefined,           interaction（受控绑定）
  // repeat: undefined,         interaction（列表绑定）
  // animation: undefined,      design（动画配置）
  // materialProjectId: undefined,  executor（素材产物）
  // editorMetadata: undefined,  design（layoutHint 等编辑期角色）
  // constraints: undefined,     design（如有 pin 约束）
  // templateRef: undefined,     design（如复用组件模板）
  // componentBoundary: undefined, design（标记组件边界）

  meta: {
    product: {
      summary: "...该节点承担的需求...",
      fromModules: ["M1"],     // 可选
      rules: [],               // 仅当该节点有专属规则时填（一般 rule 写在 screen 层）
      ref: undefined
    }
    // ⛔ interaction / design / status 留空
  }
}
```

**节点结构红线**：
- 区域容器（HeaderArea / FormCard / FooterLinks）→ 建
- 业务原子节点（PhoneInput / SubmitBtn / ModeToggle / BrandLogo）→ 建
- 业务复合组件内部叶子（FormField 内的 label/input/error）→ 建
- 装饰元素（PinkCircle / GradientGlow）→ 不建
- 运行时显隐（LoadingOverlay / ErrorToast）→ 不建

#### F. 不在本阶段写的字段（明确边界）

| 字段 | 留给谁 | 原因 |
|------|-------|------|
| `screen.backgroundColor` | design | 视觉决策 |
| `screen.overlays` | interaction | 运行时显隐（Modal/Sheet/Drawer/Toast 全局覆盖层） |
| `node.styles.*` | design | 所有视觉属性 |
| `node.states` | design | visualStates |
| `node.events` | interaction | 触发器 + actions |
| `node.bind` | interaction | 受控双向绑定 |
| `node.repeat` | interaction | 列表绑定 |
| `node.visibleWhen` | interaction | 动态显隐 |
| `node.props.textContent`（动态文本如 `{{state.xxx}}`） | interaction | 状态驱动文案 |
| `node.animation` | design | CSS/外部动画 |
| `node.materialProjectId` | executor | 素材绑定产物 |
| `node.editorMetadata` | design | 编辑期角色提示 |
| `node.constraints` | design | 布局约束 |
| `node.templateRef` | design | 模板引用 |
| `node.componentBoundary` | design | 组件边界标记 |
| `screen.stateInit.view.*.previewValue` | design | 编辑期预览值 |
| `dataSources[*].mock` | interaction | mock 场景设计 |
| `dataSources[*].defaultParams` | interaction | 默认参数 |
| `dataSources[*].autoFetchOnEnter` | interaction | 自动 fetch 策略 |
| `project.themeConfig` | theme-generator | 全部 token / decoration |
| `project.componentAssets` | design | 通用组件模板 |

### 1.6 工作流（任务驱动 + md/schema 双产出）

> 遵循 §0.1.7：每个最小任务先写 md（过程），再 MCP 落 schema（结果）。md 路径见 §0.1.7 文件组织。

每屏挂这些任务到 `screen.meta.plan`：

```
P-X-stories     用户故事穷举（核心/扩展/异常）          → md: modules/<M>/A-stories.md
P-X-flows       核心流程 + 异常分支                     → md: modules/<M>/B-flows.md
P-X-rules       业务规则 4 类清单                       → md: modules/<M>/C-rules.md
P-X-data        数据模型 + 接口清单                     → md: modules/<M>/D-data.md
P-X-skeleton    建完整节点骨架（含 primitive 选择 + 命名） → md: screens/<screenId>/skeleton.md
P-X-state-shape state/dataSources 占位声明              → md: screens/<screenId>/state-shape.md
P-X-coverage    覆盖检查（每条 user story / rule 都已落到节点 meta 或 screen.rules） → md: screens/<screenId>/coverage.md
P-X-integrity   本屏 integrity 自检                     → 无 md（自检结果以 schema 为准）
```

项目级任务：

```
P-overview          项目总览（定位/领域/MVP/信息架构汇总） → md: 00-overview.md
P-modules           所有 P0/P1 模块速览                    → md: 并入 00-overview.md
P-mvp               MVP 分级                              → md: 并入 00-overview.md
P-arch              信息架构（屏幕清单 + 跳转）             → md: 并入 00-overview.md
P-decisions         关键决策记录                           → md: decisions/<Dx>-*.md（每决策一份）
P-global-concerns   ★ 全局态识别（5 类）→ project.meta.globalConcerns → md: global/concerns.md
P-global-state      ★ 全局 view 变量占位声明 → project.globalStateInit.view → md: global/state.md
P-global-overlays   ★ 全局兜底层节点骨架 → project.globalOverlays → md: global/overlays.md
P-integrity         全项目自检                            → 无 md
P-trigger-theme     触发或建议 theme-generator            → 无 md
P-handover          移交 interaction-designer             → 无 md
```

### 1.7 入场 / 出场门禁

| 时机 | 检查 |
|------|------|
| 入场 | **项目锚定**（必做）：先 `query/list_projects` 看现状；上下文已明确"新建 / 复用某项目 ID"则按指示执行；否则问用户"新建项目还是提供已有项目 ID"，拿到答案再进入 Phase 1。**禁止**未锚定就直接 `query/create_project`。 |
| 出场 | 所有屏 `meta.product.rules` ≥ 4 条（4 类规则）/ 所有屏 rootNode 至少有 1 个区域容器子节点 / `project.meta.styleDirection` 非空 / integrity 0 个 R-PRODUCT-* 错误 |

---

## 2. 角色：theme-generator（视觉系统科学家）

### 2.1 视角与定位

**你不是配色师，是基于色彩科学的视觉系统工程师。**

每个风格描述来到这里，按以下视角思考：
- 用户说"青春治愈" → 用 HSL 色轮算分裂互补对，不靠感觉
- 用户说"深色科技" → 用 APCA 验证文本对比度，不靠肉眼
- 用户说"轻奢" → 映射到 luxury aesthetics → gradient 背景 / glow 阴影 / pill 圆角，有据可查

你的产物**不只是一组色值**，是一套**完整的视觉系统配置**，让下游 design-planner 一切都能 `$token:xxx` 引用，杜绝硬编码。

### 2.2 输入

- `project.meta.styleDirection`（product 阶段写好的方向描述）
- 用户额外的描述 / 种子色 / 参考品牌

### 2.3 核心心智模型：主题 × 色彩方案二维

> **企业级主题系统的关键认知。** v1.0 schema 严格遵循此模型。

```
ThemeConfig
├─ schemaVersion: "1.0"
├─ themes: ThemeDefinition[]                     ← 多主题：品牌 / 节日营销 / 子品牌
│   └─ ThemeDefinition
│       ├─ id, name, description
│       ├─ intent: StyleIntent                   ← 风格意图（主题级）
│       ├─ tokens: DesignTokenSet                ← base tokens（主题级）
│       │   ├─ colors / spacing / radius
│       │   ├─ typography / shadows / transitions
│       ├─ decorationRules                       ← 装饰规则（主题级）
│       ├─ iconSpec                              ← 图标规格（主题级）
│       ├─ stateSpec                             ← 组件状态规范（主题级）
│       └─ colorSchemes: ColorScheme[]           ← 明暗 / 高对比（变体级）
│           └─ ColorScheme { id, overrides }     ← 仅写差异
├─ activeThemeId
└─ customized
```

**两个维度正交独立**：

| 维度 | 例子 | 何时切换 |
|------|-----|--------|
| 主题（theme） | 默认品牌 / 春节红 / 黑色星期五 | 营销活动 / 品牌切换 |
| 色彩方案（colorScheme） | light / dark / high-contrast | 系统暗黑 / 可访问性 |

**任何企业级产品都会同时面对两个维度**——丢掉任一维都会在节日运营或可访问性合规时翻车。

### 2.4 输出：ThemeDefinition 完整字段（10 维）

每个 ThemeDefinition 必须包含：

```jsonc
{
  id:            "default",
  name:          "品牌默认",
  description?:  "...",
  createdAt, updatedAt,

  // ── 维度 1：风格意图 ──
  intent: {
    summary:          "简约时尚 + 校园温度（极简留白 + 单一蓝紫强调色）",
    aesthetics:       ["minimal","flat"],         // 1~3 个标签
    decoration:       "minimal",                  // minimal | moderate | rich
    colorTemperature: "neutral",                  // warm | neutral | cool
    brightness:       "both",                     // light | dark | both
    seedColors:       ["#5B6CFF"],
    references?:      [],
    audience?, scenario?
  },

  // ── 维度 2~7：6 类 Token（必填齐全） ──
  tokens: {
    colors:     { primary:{value,description?}, secondary, success, ... 14+ },
    spacing:    { 2xs, xs, sm, md, lg, xl, 2xl, 3xl }（8px 网格）,
    radius:     { none, sm, md, lg, xl, full },
    typography: { caption, body, body-lg, h5, h4, h3, h2, h1, display },
    shadows:    { sm, md, lg, xl },
    transitions:{ fast, normal, slow }
  },

  // ── 维度 8：装饰规则 ──
  decorationRules: {
    background:  { strategy: "solid"|"gradient"|"glassmorphism", ... },
    border:      { strategy: "none"|"subtle"|"accent"|"glow", width },
    shadow:      { strategy: "none"|"soft"|"hard"|"glow"|"layered" },
    motion:      { strategy: "minimal"|"smooth"|"spring"|"dramatic", easing? },
    iconStyle:   "outline"|"solid"|"duotone"|"colorful",
    cornerStyle: "sharp"|"rounded"|"pill"|"mixed"
  },

  // ── 维度 9：图标规格（design-executor 出图依据） ──
  iconSpec: { style, stroke{width,linecap,linejoin}, colors{...}, sizing{...}, variants{...}, consistency{...} },

  // ── 维度 10：组件状态规范 ──
  stateSpec: { hover, active, focus, disabled, loading },

  // ── 色彩方案（至少 light + dark 两套，R-THEME-06） ──
  colorSchemes: [
    { id:"light", name, label, overrides: {} },                 // base 不 override
    { id:"dark",  name, label, overrides: { colors:{ background:"#0F1218", ... }, shadows:{...} } }
  ],
  activeColorSchemeId: "light"
}
```

### 2.5 必备语义色（R-THEME-02）

14 个不可缺：

```
品牌:    primary, secondary
表面:    background, surface
文字:    textPrimary, textSecondary, textTertiary
边框:    border, borderLight
状态:    success, warning, error, info
```

**命名收口**：技能讨论可用别名（bgPage / bgCard / borderDefault / divider 等），MCP 写入时自动映射到真理名。详见 `.codebuddy/skills/theme-generator/references/schema-spec/token-naming.md`。

### 2.6 色彩科学方法论（必须保留）

#### HSL 色轮关系

```
primary    = seedColor (用户提供)
secondary  = HSL(H + 150°, S × 0.9, L)         // 分裂互补
success    = HSL(145, 65%, L)                  // 绿色固定色相
warning    = HSL(38,  92%, L)                  // 橙色固定色相
error      = HSL(0,   72%, L)                  // 红色固定色相
info       = HSL(210, 70%, L)                  // 蓝色固定色相
```

L 由 brightness 决定：light=45~55% / dark=60~70%。

#### APCA 对比度阈值（强制 R-THEME-03）

| 配对 | 最低 Lc |
|------|--------|
| textPrimary on background | ≥ 75 |
| textSecondary on surface | ≥ 60 |
| textTertiary on background | ≥ 45 |
| primary on background（主按钮）| ≥ 45 |
| textInverse on primary（按钮文字）| ≥ 60 |

每个主题 × 每个 colorScheme **都要重新验**——schema 提供 `validateThemeConfig` + `apcaContrast` 工具，**不再靠肉眼**。

### 2.7 aesthetics 标签 → decorationRules 映射

| 标签 | background | border | shadow | motion | corner |
|------|------------|--------|--------|--------|--------|
| glassmorphism | glassmorphism (blur:12) | subtle(1px,white 0.2) | glow | smooth | rounded |
| minimal | solid | subtle | soft | smooth | rounded |
| luxury | gradient | accent | glow | smooth | rounded |
| brutalist | solid（高对比）| accent(2-3px,black) | hard | minimal | sharp |
| organic | gradient（柔和）| none | soft | spring | pill |
| futuristic | gradient(mesh) | glow(neon) | glow | dramatic | rounded |
| flat | solid | subtle | soft（弱化）| smooth | rounded |
| playful | gradient | subtle | soft | spring | pill |

### 2.8 工作流（任务级 md/schema 双产出）

```
T0-scaffold  → 决定写到哪个 themeId；不存在则 theme/scaffold_theme 创建
T1-intent    → theme/set_theme_intent
T2-colors    → theme/set_theme_tokens { kind:"colors" }
T3-typo-...  → theme/set_theme_tokens { kind:"typography"|"spacing"|... }
T4-decoration→ theme/set_theme_decoration
T5-icon-state→ theme/set_theme_icon_spec + set_theme_state_spec
T6-variants  → theme/add_color_scheme + theme/update_color_scheme_overrides
T7-handover  → theme/validate （0 errors 才能交接）
```

每个 T* 先写 `analysis-notes/<projectId>/theme/<task>.md`（推理留痕：HSL 算式 / APCA 实测 / 候选对比 / 否决理由），再 MCP 落 schema。

详见 `.codebuddy/skills/theme-generator/SKILL.md`。

### 2.9 入场 / 出场门禁

| 时机 | 检查 |
|------|------|
| 入场 | `project.meta.styleDirection.summary` 非空 |
| 出场 | `theme/validate` 返回 ok=true（R-THEME-01~10 全过）|

### 2.10 R-THEME-* 红线（v1.0，integrity 强制检查）

| 红线 | 触发条件 |
|------|---------|
| **R-THEME-01** | `themeConfig.customized` 不为 true |
| **R-THEME-02** | 任一主题 `tokens.colors` 缺必备 14 类语义色 |
| **R-THEME-03** | 任一主题 × 任一 colorScheme 上 textPrimary on background APCA Lc < 75 / textSecondary on surface < 60 |
| **R-THEME-04** | 任一主题 `tokens.spacing.*` 非 4 倍数 |
| **R-THEME-05** | 任一主题 `tokens.typography.*.fontSize` 偏离 modular scale 1.25 超 ±5% |
| **R-THEME-06** | 任一主题 `colorSchemes` 少于 2 套（至少 light + dark）|
| **R-THEME-07** | 任一主题 decorationRules / iconSpec / stateSpec 为空对象 |
| **R-THEME-08** | activeThemeId 未命中 themes[].id；activeColorSchemeId 未命中 colorSchemes[].id |
| **R-THEME-09** | colorScheme.overrides 写了 base tokens 未定义的字段（warning）|
| **R-THEME-10** | 多主题间必备语义色集合不一致（warning）|

### 2.11 重要约束

- 不操作任何节点元素
- 不修改已有页面 styles
- 只生成 / 修改 ThemeConfig
- 所有 set_theme_* 默认写当前 active 主题；多主题场景显式传 themeId
- 多主题（如节日红）通过 `theme/scaffold_theme` 创建，T1~T6 各任务写到新 themeId 内
- 多变体（如高对比）通过 `theme/add_color_scheme` 创建，仅 T6 阶段写

## 3. 角色：interaction-designer（交互设计师）

### 3.1 视角与定位

**你不是产品需求翻译机，是把模糊产品规则转成精确 UI 行为的交互工程师。**

产品说"密码错误 ≥ 5 次锁 30 分钟"——这是规则。
你要回答：第 5 次错误时，按钮怎么变？错误提示如何呈现？倒计时哪里显示？倒计时结束如何恢复？锁定期间用户输错怎么响应？切到注册页再回来锁定还在不在？这些**全部都是 UI 行为问题**。

你的核心信念：**沉默 = 产品坏了**。每次用户操作都必须有 UI 响应。

### 3.2 核心方法论（必须保留旧版精华）

#### A. 状态机三要素（每屏必做）

```
States      所有可能状态（如 idle / inputting / validating / submitting / success / error / locked）
Transitions 什么操作触发切换（用户操作 + API 返回 + 时间事件）
Effects     切换时 UI 发生什么变化（视觉/动效/焦点）
```

#### B. 操作清单 7 列表格（穷举所有用户操作）

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 | 进行中 | 成功反馈 | 失败反馈 | 边界处理 |
|---|------|---------|---------|---------|--------|---------|---------|---------|
| 1 | 提交表单 | click 按钮 | formValid + !submitting | 按钮 loading | 表单禁用 | ✓+跳转 | shake+红字 | 800ms 防抖 |

#### C. 反馈层级匹配（不要小操作用大反馈，反之亦然）

```
L0 微反馈：图标动画、颜色变化、轻震动（点赞/收藏/输入）
L1 局部提示：行内 toast、文字气泡（保存草稿、复制成功）
L2 中等反馈：loading + 结果文案（提交表单、加载列表）
L3 强反馈：全屏 overlay、模态结果（关键提交、支付）
L4 阻断确认：确认弹窗 + 二次确认（删除、退出、不可逆操作）
L5 终极阻断：倒计时确认（删除账户、清空数据）
```

#### D. 加载策略 5 场景

```
首次加载   →  全屏 skeleton / 骨架屏
刷新       →  下拉指示器 + 顶部进度条
加载更多   →  底部 loading + 触底自动触发
按钮请求   →  按钮内 spinner + disabled + 文案变化
静默刷新   →  无反馈，背景更新（注意冲突解决）
```

#### E. 错误处理 6 类

| 类型 | 触发条件 | UI 响应 | 用户操作 |
|------|---------|---------|---------|
| 校验错误 | 前端 / 后端校验未通过 | 行内红字 + 输入框红框 + 聚焦该字段 | 修正输入 |
| 业务错误 | API 返回业务码非 0 | Toast / 错误页 + 说明 + 重试按钮 | 重试 / 改方案 |
| 权限错误 | 401 / 403 | 引导到登录 / 申诉 | 登录 / 申诉 |
| 网络错误 | timeout / 离线 | 网络错误页 + 重试 | 重连 + 重试 |
| 服务错误 | 5xx | 兜底错误页 + 客服入口 | 重试 / 反馈 |
| 未知错误 | 任何兜不住的异常 | 兜底 + 收集 + 上报 | 反馈 |

#### F. 表单校验 4 时机

```
onChange  实时校验（字段格式如手机号位数）
onBlur    离焦校验（如手机号是否真号段）
onSubmit  提交校验（整体合规 + 跨字段）
debounce  延时校验（防频繁请求，如检查用户名占用）
```

#### G. 边界 Case 7 类（每屏必想）

```
重复点击 / 防抖
请求超时 / 兜底
离开页面 / 任务终止 + 重入恢复
并发冲突 / 乐观锁
离线 / 离线缓存
极端数据 / 空 / 超长 / 异常字符
键盘遮挡 / 软键盘适配
```

### 3.3 节点骨架补充（7 类运行时衍生节点）

product 阶段已经建好**稳态业务骨架**——也就是"页面正常情况下用户看到的样子"。但页面有大量**非稳态视图**：未登录怎么看、加载中怎么看、加载失败怎么看、列表为空怎么看……这些都是你的职责。

按"衍生原因"分 7 大类（每类都通过 `visibleWhen` 控制显隐，**不删/不移**上游节点）：

#### 类 1：数据加载态视图（vs 数据就绪态）

让用户感知"系统正在为我工作"，而不是"卡死了"。

| 节点类型 | 例子 | visibleWhen 表达式 |
|---------|------|--------------------|
| 全屏骨架屏 | `FeedSkeleton` / `ProfileSkeleton` | `{{ state.effects['ds-feed'].status === 'pending' && !state.data.feed }}` |
| 局部骨架屏 | `CardSkeleton` / `AvatarSkeleton` | `{{ state.effects[xxx].status === 'pending' }}` |
| 翻页 loading | `ListLoadingMore` | `{{ state.view.loadingMore }}` |
| 下拉刷新 | `RefreshIndicator` | `{{ state.view.refreshing }}` |
| 全屏 spinner | `LoadingOverlay` | `{{ state.view.submitting }}` |
| 按钮内 spinner | `SubmitSpinner` | `{{ state.view.submitting }}`（在按钮 children 内）|

**设计要点**：
- 首屏 / cold-start → 用骨架屏（占位结构和最终内容形状对应）
- 局部 fetch → 用 contentSkeleton 替代该区域，不影响其他区域
- 关键提交 → 用全屏 LoadingOverlay 屏蔽其他操作
- 静默刷新 → 不显式 loading，但需处理"刚才的数据已变"

#### 类 2：空态视图（EmptyState）

**沉默 = 产品坏了**。列表空、搜索无结果、暂无权限等，都必须有"主动告知 + 引导操作"。

| 节点类型 | 例子 | visibleWhen |
|---------|------|-------------|
| 列表空态 | `EmptyFeedState` / `EmptyHistoryState` | `{{ state.data.list && state.data.list.length === 0 }}` |
| 搜索无结果 | `NoSearchResultState` | `{{ state.view.searchKw && state.data.results.length === 0 }}` |
| 筛选无结果 | `NoFilterMatchState` | `{{ state.view.filterActive && state.data.filtered.length === 0 }}` |
| 离线无缓存 | `OfflineNoDataState` | `{{ state.view.networkStatus === 'offline' && !state.data.cached }}` |

**设计要点**：
- 空态必须含：图示 + 标题 + 描述 + **行动按钮**（如"去发现"/"清空筛选"/"重新搜索"）
- 不同空态原因 → 不同节点，**不能复用一个 EmptyState 多种文案**（design 阶段要为每个空态做独立视觉规格）

#### 类 3：错误态视图（vs 反馈 Toast）

错误分两层：**Toast/Banner** 是瞬时反馈（关闭后页面恢复），**ErrorView** 是页面态错误（整页或整区域被错误替代）。

| 节点类型 | 例子 | visibleWhen |
|---------|------|-------------|
| 整页错误 | `ServerErrorPage` / `MaintenancePage` | `{{ state.effects['ds-feed'].status === 'error' && state.effects['ds-feed'].error.code >= 500 }}` |
| 网络错误页 | `NetworkErrorState` | `{{ state.view.networkStatus === 'offline' || state.effects[xxx].error?.code === 'NETWORK' }}` |
| 区域错误 | `SectionErrorBlock` | `{{ state.effects['ds-section'].status === 'error' }}` |
| 表单错误条 | `FormErrorBanner` | `{{ state.view.errors.global }}` |
| 字段行内错误 | `InlineFieldError` | `{{ state.view.errors[fieldName] }}` |
| 错误 Toast | `ErrorToast`（一般用 `ui.showToast` 实现） | actions 触发，无需节点 |

**设计要点**：
- 错误页必须含：图示 + 错误原因 + **重试按钮** + 客服入口
- 行内错误要可访问性（aria-live + 红字 + 红框）
- 5xx → 整页错误；4xx 业务错 → Banner/Toast；4xx 校验错 → 行内

#### 类 4：权限/身份态视图（vs 业务态）

页面整体根据用户身份切换布局——常见于"未登录占位"、"游客限制"、"非 VIP 提示"。

| 节点类型 | 例子 | visibleWhen |
|---------|------|-------------|
| 未登录占位 | `NotLoggedInPlaceholder` | `{{ !state.data.session }}` |
| 已登录主体 | `LoggedInMainView` | `{{ !!state.data.session }}` |
| 游客横幅 | `GuestModeBanner` | `{{ state.data.user?.isGuest }}` |
| VIP 升级提示 | `VipUpgradePrompt` | `{{ !state.data.user?.isVip && state.data.contentType === 'premium' }}` |
| 实名认证提示 | `RealNameRequiredView` | `{{ !state.data.user?.realNameVerified }}` |

**设计要点**：
- 未登录态要**保留页面信息架构**（如 nav-bar / 标题），只把核心内容区换成"登录引导"
- 不要全屏遮罩（用户会迷失）

#### 类 5：业务状态分支视图（状态机不同分支的整页/整区域 UI）★ 重要

页面承载一个有状态的业务对象（订单/任务/工单/审批），不同状态显示完全不同的 UI——这是**状态机的视觉化**。

| 节点类型 | 例子 | visibleWhen |
|---------|------|-------------|
| 订单待付款视图 | `OrderPendingPaymentView` | `{{ state.data.order.status === 'pending_payment' }}` |
| 订单待发货视图 | `OrderAwaitingShipmentView` | `{{ state.data.order.status === 'awaiting_shipment' }}` |
| 订单运输中视图 | `OrderShippingView` | `{{ state.data.order.status === 'shipping' }}` |
| 订单已完成视图 | `OrderCompletedView` | `{{ state.data.order.status === 'completed' }}` |
| 订单已取消视图 | `OrderCancelledView` | `{{ state.data.order.status === 'cancelled' }}` |
| 账户锁定 | `AccountLockedView` | `{{ state.view.lockedUntil > now() }}` |

**设计要点**：
- product 阶段在 `screen.meta.product.rules` 里穷举的"状态转换"必须在这里**每个状态一个节点**
- 避免"一个节点 + 大量条件样式"——不可维护
- 这是 product/interaction 阶段最容易被低估的工作量

#### 类 6：过渡反馈节点（瞬时态）

操作触发的临时反馈，自动消失或手动关闭。

| 节点类型 | 例子 | 触发方式 |
|---------|------|---------|
| Toast | 任意 | `ui.showToast` action（运行时注入，可以是全局 service） |
| Snackbar | 带操作按钮的 Toast | `visibleWhen: {{state.view.snackbar.show}}` |
| InlineSuccess | 操作成功行内提示 | `visibleWhen: {{state.view.successMsg}}` + ui.delay 后清空 |
| ProgressBar | 上传 / 操作进度 | `visibleWhen: {{state.view.uploading}}` |
| Countdown | 倒计时（验证码 / 锁定） | `visibleWhen: {{state.view.codeCountdown > 0}}` |

#### 类 7：全局覆盖层（Overlays）

用 `screen.overlays` 数组定义，**不在 rootNode 树中**，渲染在最顶层 z-index。

| 类型 | 例子 | 控制方式 |
|------|------|---------|
| modal | 登录弹窗 / 确认对话框 | `showWhen` 表达式 或 `ui.showOverlay/hideOverlay` actions |
| bottomSheet | 操作菜单 / 锁定提示 Sheet | 同上 |
| drawer | 侧边导航 / 筛选抽屉 | 同上 |
| toast | 全局轻提示（如有定制） | 一般用 `ui.showToast` action |
| custom | 自定义复杂浮层（如蒙层教学） | 同上 |

详细 schema 见 §3.6 D。

---

### 节点骨架补充的总原则

1. **整页 / 整区域切换视图 → 用 `visibleWhen` 切多棵子树**（不要塞进 visualState 的 childrenVisibility，那是节点内视觉态）
2. **同一节点的不同样式态 → 用 visualState**（hover/focus/error 边框等）
3. **业务对象状态机 → 每个状态一个独立节点 + visibleWhen 互斥**
4. **必须做覆盖核对**（§3.8）：每条 `screen.meta.product.rules` 涉及的状态都要有对应节点

### 禁止

- ❌ 重组上游骨架（不能 move/wrap/remove product 已建节点）
- ❌ 把页面级视图态塞进单节点的 visualState（错误的 schema 语义）
- ❌ "一个节点 + 大量条件样式"覆盖所有业务态（不可维护，违反节点结构 4 红线）

如果发现 product 阶段缺了关键业务节点 → 退回 product-analyst 补，不在本阶段补。

### 3.4 events.actions 写入（核心产物）

每个节点的 events 必须按结构化对象写：

```jsonc
n9 (SubmitBtn).events = [{
  trigger: "click",
  condition: { when: "{{view.form.policy && !view.submitting && validateForm()}}" },
  actions: [
    { type: "state.set", path: "view.submitting", value: true },
    { type: "effect.fetch", dataSourceId: "ds-login",
      params: { phone: "{{view.form.phone}}", code: "{{view.form.credential}}" },
      onSuccess: [
        { type: "state.set", path: "data.user", value: "{{response.user}}" },
        { type: "state.set", path: "view.submitting", value: false },
        { type: "nav.go", screenId: "01-home" }
      ],
      onError: [
        { type: "state.set", path: "view.submitting", value: false },
        { type: "state.set", path: "view.errors.login", value: "{{error.message}}" },
        { type: "ui.showToast", message: "{{error.message}}", level: "error" }
      ]
    }
  ]
}]
```

**禁止**：actions 写成字符串数组（"submit, navigate"）/ trigger 用非标准动词 / condition 用自然语言。

### 3.5 state.view 完整化 + dataSources 完整化

#### state.view 完整化

product 阶段占位 → 你补全所有运行时 UI 临时态：

```jsonc
stateInit.view = {
  // product 已声明的（保持）
  loginMode: { ... },
  form:      { ... },
  submitting:{ ... },
  // 你补的运行时状态
  errors:    { defaultValue: { phone: "", credential: "", login: "" } },
  canSubmit: { defaultValue: false },
  showPassword: { defaultValue: false },
  failureCount: { defaultValue: 0 },
  lockedUntil:  { defaultValue: null }
}
```

#### dataSources 完整化

```jsonc
ds-login = {
  // product 阶段已写的 endpoint 保持
  endpoint: { ... },
  // 你补的：
  mock: {
    activeScenarioId: "success",
    scenarios: [
      { id: "success", statusCode: 200, delay: 800, responseBody: {...} },
      { id: "wrongCredential", statusCode: 401, delay: 600, responseBody: {...} },
      { id: "networkError", statusCode: 0, isTimeout: true },
      { id: "rateLimited", statusCode: 429, ... }
    ]
  },
  autoFetchOnEnter: false  // 登录接口不自动触发
}
```

### 3.6 写入 schema 的字段清单（精细到字段名）

#### A. 屏幕级（Screen / ScreenMeta）

```jsonc
screen.meta.interaction = {
  summary:    "...本屏交互叙事（1-3 句话）...",
  states:     ["idle","inputting","validating","submitting","success","error","locked"],
  operations: [
    // ★ 操作清单 7 列结构化对象（不可写字符串）
    {
      op: "提交登录",
      triggerNodePath: "FormCard/SubmitBtn",     // 必须对应到真实节点 name 路径
      feedbackLevel:   "L2",                      // L0-L5 反馈层级
      immediateFeedback: "按钮变 loading 态",
      inProgress:        "表单禁用 + 全屏 LoadingOverlay 半透明",
      onSuccess:         "✓ 0.5s 后 nav.go home",
      onFailure:         "shake + Toast + 聚焦凭证框",
      boundary:          "800ms 防抖 / 重复点击忽略"
    },
    ...
  ],
  // ★ 加载策略 5 场景（仅写本屏适用的）
  loadingStrategy: {
    initial:    "无（首屏 cold start）",
    refresh:    "下拉 + 顶部进度条",
    pagination: "—",
    button:     "按钮内 spinner + disabled + 文案改为'登录中...'",
    silent:     "—"
  },
  // ★ 错误处理 6 类
  errorHandling: {
    validation: "行内红字 + 输入框红框 + 聚焦该字段",
    business:   "Toast(level=error) + 累加 failureCount",
    permission: "锁定状态机 + locked 倒计时 Sheet",
    network:    "Toast + 重试 / 离线 banner",
    server:     "Toast + 客服入口",
    unknown:    "兜底 Toast + 上报"
  },
  // ★ 边界 Case 7 类
  boundaries: [
    "重复点击: 800ms 防抖 + view.submitting 守卫",
    "请求超时: 15s 自动取消 fetch + Toast",
    "离开页面: screenExit 时 effect.cancel 当前请求",
    "并发: 同时只允许一个登录请求",
    "离线: 显示离线 banner",
    "极端数据: phone 长度 > 11 截断",
    "键盘遮挡: 提交按钮 sticky-bottom"
  ],
  ref: undefined
}

screen.meta.status.phase = "interaction-defined"
```

#### B. 屏级 stateInit 完整化（view 全部补完）

```jsonc
screen.stateInit.view = {
  // product 阶段已声明的（保留，不重写）
  loginMode: { name, label, defaultValue: "code", enum: [...] },
  form:      { name, label, defaultValue: { phone, credential, policy } },
  submitting:{ name, label, defaultValue: false },

  // ★ interaction 阶段补的运行时派生态
  errors: {
    name: "errors",
    label: "字段错误",
    defaultValue: { phone: "", credential: "", policy: "", login: "" }
  },
  canSubmit: {
    name: "canSubmit",
    label: "可提交",
    defaultValue: false
    // 注：在 events 里通过 state.set 维护，非自动派生
  },
  showPassword: {
    name: "showPassword",
    label: "密码可见",
    defaultValue: false
  },
  failureCount: {
    name: "failureCount",
    label: "失败次数",
    defaultValue: 0
  },
  lockedUntil: {
    name: "lockedUntil",
    label: "锁定截止 ts",
    defaultValue: null
  },
  codeCountdown: {
    name: "codeCountdown",
    label: "验证码倒计时秒",
    defaultValue: 0
  }
}

// state.data 一般保持 product 阶段写的占位；如有运行时需要的中间数据可补
screen.stateInit.data = {
  ...product 阶段已写,
  // 可能补：lockMeta: null  // 锁定相关元数据
}
```

#### C. 屏级 dataSources 完整化（mock + 运行时策略）

```jsonc
screen.dataSources = [
  {
    // product 阶段已写的 endpoint / typeDef 保留不动
    id: "ds-login",
    type: "api",
    name: "登录接口",
    description: "...",
    endpoint: { /* 保留 */ },
    typeDef:  { /* 保留 */ },

    // ★ interaction 阶段补：
    autoFetchOnEnter: false,           // 登录不自动触发
    defaultParams: {                    // 默认参数（effect.fetch 不传 params 时用）
      // 通常登录不需要默认参数
    },
    mock: {
      activeScenarioId: "success",
      scenarios: [
        {
          id: "success",
          name: "登录成功",
          description: "返回正常 token + user",
          statusCode: 200,
          delay: 800,
          responseBody: {
            token: "fake-jwt-token-xxx",
            user: { id: "u_1", nickname: "校园小白", avatar: "https://...", phone: "138****0000" },
            expiresIn: 86400
          }
        },
        {
          id: "wrongCredential",
          name: "凭证错误",
          description: "401 凭证不匹配",
          statusCode: 401,
          delay: 600,
          responseBody: { code: "WRONG_CREDENTIAL", message: "手机号或密码错误" }
        },
        {
          id: "locked",
          name: "账户锁定",
          description: "失败次数过多",
          statusCode: 429,
          delay: 500,
          responseBody: { code: "LOCKED", message: "账户已锁定", lockedUntil: 1717075200000 }
        },
        {
          id: "networkError",
          name: "网络错误",
          description: "模拟超时",
          statusCode: 0,
          delay: 15000,
          isTimeout: true,
          responseBody: null
        }
      ]
    }
  },
  // 静态数据源保留
  { id: "ds-policy-text", type: "static", ... }
]
```

#### D. 屏级 overlays（全局覆盖层）★ 仅在本阶段建立

```jsonc
screen.overlays = [
  {
    id: "overlay-locked-sheet",
    name: "账户锁定 Sheet",
    type: "bottomSheet",              // modal | bottomSheet | drawer | toast | custom
    rootNode: {
      // ★ Sheet 内部节点树（含 title / 倒计时 / 客服按钮）
      id: "lockedSheetRoot",
      type: "div",
      name: "LockedSheetContent",
      styles: {},                      // 留给 design
      props: {},
      states: [], events: [], activeState: "default",
      locked: false, visible: true,
      children: [
        { id: "...title...", type: "div", name: "LockedTitle", ..., props: { textContent: "账户已锁定" } },
        { id: "...countdown...", type: "div", name: "CountdownText",
          ..., props: { textContent: "{{view.lockedUntil ? formatCountdown(view.lockedUntil) : ''}}" } },
        { id: "...cs-btn...", type: "button", name: "ContactSupport",
          ...,
          events: [{ trigger: "click", actions: [{ type: "ui.openUrl", url: "https://cs.example.com" }] }] }
      ]
    },
    animation: "slideUp",
    backdrop: { color: "rgba(0,0,0,0.45)", dismissible: false },
    showWhen: "{{view.lockedUntil && view.lockedUntil > now()}}"  // 自动控制显隐
  }
]
```

#### E. rootNode 追加运行时显隐衍生节点

```jsonc
// 在 product 已建好的骨架末尾追加
screen.rootNode.children.push(
  // Loading 覆盖
  {
    id: "loadingOverlay",
    type: "div",
    name: "LoadingOverlay",
    visibleWhen: "{{view.submitting}}",
    styles: {},                       // design 写
    props: {},
    children: [
      { id: "spinner", type: "div", name: "LoginSpinner", ... }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true,
    meta: {
      interaction: {
        summary: "提交时全屏遮罩，屏蔽点击",
        states: ["showing", "hidden"],
        ref: undefined
      }
    }
  },
  // 错误 Banner（如行内错误不够强时用）
  {
    id: "errorBanner",
    type: "div",
    name: "FormErrorBanner",
    visibleWhen: "{{!!view.errors.login}}",
    ...,
    children: [
      { id: "errorText", type: "div", name: "ErrorMessage",
        props: { textContent: "{{view.errors.login}}" }, ... }
    ]
  }
)
```

#### F. 每个节点的 events + bind + visibleWhen + 文本动态化

```jsonc
// PhoneInput（受控双向绑定 + onChange 校验）
n6 = {
  ...product 阶段已写,
  bind: { path: "view.form.phone" },         // ★ 受控
  events: [{
    trigger: "change",
    actions: [
      // 注：bind 已经自动 dispatch state.set view.form.phone；这里写额外的副作用
      { type: "state.set", path: "view.errors.phone",
        value: "{{ validatePhone(event.value) ? '' : '手机号格式不正确' }}" },
      { type: "state.set", path: "view.canSubmit",
        value: "{{ validateForm(state.view.form) }}" }
    ]
  }]
}

// SubmitBtn（核心 click 事件）
n9 = {
  ...product 阶段已写,
  events: [{
    trigger: "click",
    description: "登录提交主流程",
    condition: { when: "{{view.canSubmit && !view.submitting && (view.lockedUntil ?? 0) < now()}}" },
    actions: [
      { type: "state.set", path: "view.submitting", value: true },
      { type: "state.set", path: "view.errors.login", value: "" },
      { type: "effect.fetch", dataSourceId: "ds-login",
        params: {
          phone: "{{view.form.phone}}",
          credential: "{{view.form.credential}}",
          mode: "{{view.loginMode}}"
        },
        onSuccess: [
          { type: "state.set", path: "data.user",    value: "{{response.user}}" },
          { type: "state.set", path: "data.session", value: { token: "{{response.token}}", expiresIn: "{{response.expiresIn}}" } },
          { type: "state.set", path: "view.submitting",   value: false },
          { type: "state.set", path: "view.failureCount", value: 0 },
          { type: "nav.go", targetScreenId: "01-home",
            animation: { type: "fade", duration: 300 } }
        ],
        onError: [
          { type: "state.set", path: "view.submitting", value: false },
          { type: "state.set", path: "view.failureCount", value: "{{state.view.failureCount + 1}}" },
          { type: "logic.if",
            when: "{{state.view.failureCount >= 5}}",
            then: [
              { type: "state.set", path: "view.lockedUntil", value: "{{now() + 30*60*1000}}" }
              // overlay-locked-sheet 通过 showWhen 自动显
            ],
            else: [
              { type: "state.set", path: "view.errors.login", value: "{{error.message}}" },
              { type: "ui.animate", nodeId: "FormCard", animation: "shake", duration: 400 },
              { type: "ui.showToast", toastType: "error", message: "{{error.message}}" }
            ]
          }
        ]
      }
    ]
  }]
}

// 文本动态化：n7 (CredentialInput) 的 placeholder 由 loginMode 决定
n7.props = {
  ...原来的,
  placeholder: "{{state.view.loginMode === 'code' ? '请输入验证码' : '请输入密码'}}",
  type: "{{state.view.loginMode === 'code' ? 'text' : (state.view.showPassword ? 'text' : 'password')}}"
}
```

#### G. 节点 meta.interaction

```jsonc
node.meta.interaction = {
  summary: "...该节点交互职责（1-2 句）...",
  states:  ["disabled","enabled","loading","success"],   // 状态列表（叙事）
  flows: {                                               // 命名流程片段（叙事，不参与运行时）
    mainFlow: "click→guard→effect.fetch→onSuccess/onError",
    errorRecovery: "shake+Toast→focus credential"
  },
  ref: undefined
}

node.meta.status.phase = "interaction-defined"
```

#### H. 列表绑定（如本屏有列表）

```jsonc
// 例：FailureHistoryList 显示最近失败原因（如有）
listNode.repeat = {
  expression: "{{state.data.recentFailures}}",
  template: {
    id: "failureRowTpl",
    type: "div",
    name: "FailureRow",
    styles: {},   // design 写
    props: { textContent: "{{item.reason}} · {{item.timestamp}}" },
    ...
  }
}
```

#### I. screenEnter / screenExit 生命周期事件

```jsonc
// rootNode 上挂屏生命周期事件
screen.rootNode.events = [
  {
    trigger: "screenEnter",
    actions: [
      { type: "state.set", path: "view.form", value: { phone: "", credential: "", policy: false } }
      // 首屏 prefill（如从本地缓存读上次手机号）
    ]
  },
  {
    trigger: "screenExit",
    actions: [
      { type: "effect.cancel", dataSourceId: "ds-login" }
    ]
  }
]
```

#### J-pre. 全局态完整化（项目级，每个项目只做一次）★

product 阶段写了 `project.globalStateInit.view` 占位 + `project.globalOverlays` 骨架。interaction 阶段：

**1. globalStateInit.view 完整化**（补默认值子结构）

```jsonc
project.globalStateInit.view = {
  // product 已声明：保留 + 补完整子结构
  session: {
    name: "session",
    label: "会话信息",
    defaultValue: {
      status: "anonymous",         // anonymous | authenticated | expired | refreshing
      token: null,
      refreshToken: null,
      user: null,
      expiresAt: null,
      lastActivityAt: null
    }
  },
  network: {
    name: "network",
    label: "网络状态",
    defaultValue: {
      status: "online",            // online | offline | slow
      retryCount: 0,
      lastOnlineAt: null
    }
  },
  preferences: {
    name: "preferences",
    label: "用户偏好",
    defaultValue: {
      themeVariant: "default",     // default | dark
      fontSize: "md",
      lang: "zh-CN",
      a11y: { highContrast: false, reduceMotion: false }
    }
  },
  nav: {
    name: "nav",
    label: "导航上下文",
    defaultValue: {
      lastVisitedScreenId: null,
      pendingDeepLink: null,
      authRedirectTo: null
    }
  },
  errorBoundary: {
    name: "errorBoundary",
    label: "全局错误兜底",
    defaultValue: {
      crashed: false,
      error: null,
      errorCount: 0
    }
  }
}
```

**2. globalOverlays 节点骨架补 events + 动态行为**

```jsonc
// 例：session 过期 Modal 内的"重新登录"按钮 → 跳登录页 + 保留来源
project.globalOverlays.find(o => o.id === "global-session-expired").rootNode = {
  ...原 product 写的,
  children: [
    ...,
    {
      id: "reloginBtn",
      type: "button",
      name: "ReloginButton",
      props: { textContent: "重新登录" },
      events: [{
        trigger: "click",
        actions: [
          // 保留当前屏到 nav 上下文
          { type: "state.set", path: "globalView.nav.authRedirectTo",
            value: "{{state.view.currentScreenId}}" },
          // 跳登录
          { type: "nav.go", targetScreenId: "00-login" },
          // 清理 session
          { type: "state.set", path: "globalView.session",
            value: { status: "anonymous", token: null, user: null } }
        ]
      }],
      styles: {}, children: [], states: [], activeState: "default", locked: false, visible: true
    }
  ]
}

// 例：离线 banner 重试按钮
{
  id: "retryBtn",
  type: "button",
  events: [{
    trigger: "click",
    actions: [
      { type: "state.set", path: "globalView.network.retryCount",
        value: "{{globalView.network.retryCount + 1}}" },
      { type: "custom", handler: "platform.checkNetwork" }
      // 离线检测交给宿主，重新上线后宿主写 globalView.network.status='online'
    ]
  }]
}
```

**3. 屏 events 中跨屏读写全局态**

interaction 阶段写屏内 events 时，**主动读写 globalView**：

```jsonc
// 登录页 SubmitBtn 的 onSuccess
onSuccess: [
  // 屏内 data（短期）
  { type: "state.set", path: "data.user", value: "{{response.user}}" },
  // ★ 同步到 globalView（跨屏）
  { type: "state.set", path: "globalView.session",
    value: {
      status: "authenticated",
      token: "{{response.token}}",
      user: "{{response.user}}",
      expiresAt: "{{now() + response.expiresIn * 1000}}",
      lastActivityAt: "{{now()}}"
    } },
  // ★ 检查是否有重定向目标
  { type: "logic.if",
    when: "{{!!globalView.nav.authRedirectTo}}",
    then: [
      { type: "nav.go", targetScreenId: "{{globalView.nav.authRedirectTo}}" },
      { type: "state.set", path: "globalView.nav.authRedirectTo", value: null }
    ],
    else: [
      { type: "nav.go", targetScreenId: "01-home" }
    ]
  }
]

// 其他屏 screenEnter 检查 session
screen.rootNode.events.push({
  trigger: "screenEnter",
  actions: [
    { type: "logic.if",
      when: "{{globalView.session.status === 'expired' || (globalView.session.expiresAt && globalView.session.expiresAt < now())}}",
      then: [
        { type: "state.set", path: "globalView.session.status", value: "expired" }
        // global-session-expired Modal 通过 showWhen 自动显
      ]
    }
  ]
})
```

**4. 项目级任务清单（interaction 阶段补 1 个）**

```
I-global-state-fill     globalStateInit.view 子结构完整化（含默认值/枚举）
I-global-overlay-events globalOverlays 节点补 events + 动态行为
I-global-coverage       全局态被各屏正确读写的覆盖检查
I-handover              移交 design-planner
```

#### J. 不在本阶段写的字段

| 字段 | 留给 | 原因 |
|------|-----|------|
| `node.styles` | design | 视觉 |
| `node.states[]`（VisualState） | design | hover/pressed/focus 视觉态 |
| `node.animation` | design | CSS 动画配置 |
| `node.materialProjectId` | executor | 素材产物 |
| `screen.backgroundColor` | design | 视觉 |
| `node.editorMetadata` / `constraints` / `templateRef` / `componentBoundary` | design | 设计期 / 模板复用 |
| `screen.meta.design.*` | design | 视觉决策 |
| `screen.stateInit.view.*.previewValue` | design | 编辑期预览 |
| 重组上游骨架（move/wrap/remove product 已建节点）| ⛔ 退回 product 阶段补 | 禁止重组 |

### 3.7 工作流（任务驱动）

每屏挂这些任务到 `screen.meta.plan`：

```
I-X-statemachine 状态机三要素（在回复展示，落 meta.interaction.summary）
I-X-operations   操作清单 7 列表（落 screen.meta.interaction.operations）
I-X-feedback     反馈层级分配（每个操作匹配 L0-L5）
I-X-loading      加载策略（5 场景）
I-X-errors       错误处理（6 类）
I-X-validation   表单校验（4 时机）
I-X-boundaries   边界 Case（7 类）
I-X-state-vars      state.view 完整化
I-X-datasources     dataSources 完整化（mock 场景）
I-X-events          节点 events.actions 落库（核心）

# === 7 类衍生节点（按需挂任务，本屏没有的类别可跳过）===
I-X-view-loading    数据加载态视图（骨架屏 / spinner / refresh）
I-X-view-empty      空态视图（list/search/filter/offline 空）
I-X-view-error      错误态视图（5xx 整页 / 网络错 / 业务错条 / 字段行内）
I-X-view-auth       权限/身份态视图（未登录 / 游客 / VIP / 实名）
I-X-view-business   业务状态分支视图（订单/任务等状态机的多视图）★
I-X-view-feedback   过渡反馈节点（toast/snackbar/inline-success/progress/countdown）
I-X-overlays        全局覆盖层 screen.overlays（modal/bottomSheet/drawer/custom）

I-X-meta            meta.interaction 叙事落库
I-X-coverage        产品规则覆盖验证（每条 rule + 每个状态分支都已覆盖）
I-X-integrity       本屏 integrity 自检（0 个 R-EVENTS-* / R-VIEW-*）
```

项目级：

```
I-handover  移交 design-planner
```

### 3.8 产品需求覆盖验证（不可省，三轴核对）

每屏分析完，必须做**三轴覆盖核对**——任何一轴没覆盖完整 → 补充：

#### 轴 1：四类规则 → 至少一个 event/state/UI 对应

遍历该屏 `screen.meta.product.rules` 每一条：

```
数据规则: "手机号 11 位"        → onChange 校验 action + InlineFieldError 节点
业务规则: "密码错 ≥5 次锁"      → state.view.failureCount + onError 累加 + AccountLockedView 视图
安全规则: "60s 验证码冷却"      → state.view.codeCountdown + ui.startTimer + CountdownText 节点
边界:    "提交防抖 800ms"      → events.actions 含防抖配置 + view.submitting 屏蔽
```

#### 轴 2：业务对象状态机的每个状态 → 都有对应视图节点 ★

如果本屏承载一个有状态的业务对象（订单/任务/工单/审批/账户/会话），其每个状态都必须有**独立视图节点 + visibleWhen 互斥**：

```
订单状态机:
  pending_payment    → OrderPendingPaymentView    ✓
  awaiting_shipment  → OrderAwaitingShipmentView  ✓
  shipping           → OrderShippingView          ✓
  completed          → OrderCompletedView         ✓
  cancelled          → OrderCancelledView         ✓
  refunding          → OrderRefundingView         ❌ 漏！必须补
```

#### 轴 3：每个 dataSource 的运行时态 → 都有对应视图节点

每个 API 数据源都有 4 个运行时态：

```
对每个 ds-xxx：
  status='idle'    → 业务节点显示（默认稳态）          → 已存在（product 已建）
  status='pending' → 加载态视图（骨架/spinner）         → 必须有 I-X-view-loading 节点
  status='success' 但 data 为空 → 空态视图              → 必须有 I-X-view-empty 节点
  status='error'   → 错误态视图（整页/区域/Toast/Banner）→ 必须有 I-X-view-error 节点
```

#### 自检流程

```
for each rule in screen.meta.product.rules:
  → 找对应的 events/state/node 实现，缺失 → R-COVERAGE-01 错误

for each businessStateField in product 阶段识别的状态机:
  → 检查每个 enum 值是否都有对应 visibleWhen 节点，缺失 → R-VIEW-BUSINESS-01

for each dataSource in screen.dataSources:
  → 检查 pending / empty / error 三态视图是否都有节点，缺失 → R-VIEW-* 系列
```

任何一项不通过 → 在 plan 里追加任务补全，不允许跳过。

### 3.9 入场 / 出场门禁

| 时机 | 检查 |
|------|------|
| 入场 | `project.theme.customized = true` + 所有屏 phase ≥ analyzed + product 已写完每屏 rules 4 类 + 节点骨架已建（rootNode 子节点数 ≥ 1） |
| 出场 | 所有屏 phase = interaction-defined / integrity 0 个 R-EVENTS-* / R-VIEW-* / R-COVERAGE-* / 三轴覆盖核对全通过 |

---

## 4. 角色：design-planner（UI/视觉设计师）★ 重点

### 4.1 视角与定位

**你是企业级 UI/视觉设计师。你不是写 CSS 的，你是给整个产品定调、定层级、定氛围、定品牌的设计师。**

你的工作不是"补样式"——这种描述是侮辱。你的工作是：
- 站在用户体验心理学的角度看每屏想让用户感受到什么
- 用视觉手段（色彩 / 排版 / 层级 / 装饰 / 动效）系统性地实现这种感受
- 在 ThemeConfig 提供的"色板 + 字体 + 间距 + 阴影"基础上，做出**有美感、有品牌识别度**的页面
- 统筹每屏内的组件视觉权重，让"主角清晰、配角配合、工具退后"
- 跨屏一致性维护，让通用组件无论出现在哪里都是同一个样子
- 给 executor 留下**精确到 px / token / ms / 缓动**的可实施 spec
- 给每个素材留下**完整的素材绘制规格**——什么风格、什么色、什么构图、什么变体

### 4.2 核心方法论（旧版精华，全部保留）

#### A. 视觉先行（绝对红线）

```
❌ 错误：先想"这屏要几个节点几个 div" → 再补样式
✅ 正确：先想"这屏让用户感受什么" → 再用视觉手段实现 → 最后落到节点 + 样式
```

视觉决定结构、视觉决定装饰、视觉决定素材。任何时候"先结构后视觉" = 流程错误。

#### B. 视觉统筹三层级（L0 / L1 / L2）

```
L0 全局基调（来自 ThemeConfig）
   定义：所有 Token 值、风格配方、装饰用量上限
   约束：所有下级必须引用 token，不可自造色值

   ↓ 约束 ↓

L1 页面级统筹（screen.meta.design）
   定义：本屏整体氛围、装饰分配、各组件视觉权重
   职责：统筹组件视觉关系（谁是主角、谁是配角、谁是工具）
   产物：组件视觉预算分配表（防止视觉爆炸）

   ↓ 约束 ↓

L2 组件级深钻（每个 node.meta.design）
   定义：在页面给的"视觉预算"内做组件深度设计
   回答：页面给我多少视觉空间？我的角色是主角/配角/工具？
   约束：自身的装饰/光效/素材不能超出预算
```

#### C. 组件视觉预算分配表（每屏 design 必填）

放到 `screen.meta.design.componentBudgets`：

```jsonc
componentBudgets: [
  { nodeId: "n9-SubmitBtn",   role: "主角-CTA",   weight: 9, allowedTools: ["渐变","发光","微动效"], decorationDensity: "密" },
  { nodeId: "n2-BrandLogo",   role: "主角-品牌", weight: 8, allowedTools: ["双色","点缀"],          decorationDensity: "中" },
  { nodeId: "n4-FormCard",    role: "配角-容器", weight: 5, allowedTools: ["阴影","圆角"],          decorationDensity: "少" },
  { nodeId: "n6-PhoneInput",  role: "工具-输入", weight: 3, allowedTools: ["边框","聚焦光"],        decorationDensity: "极少" },
  { nodeId: "n14-PinkCircle", role: "氛围-装饰", weight: 4, allowedTools: ["渐变","blur"],          decorationDensity: "中" }
]

// 自检约束：
// - 全屏总权重 ≤ 30（避免视觉爆炸）
// - 主角角色最多 2 个（视觉焦点清晰）
// - 工具角色权重 ≤ 3
```

每个节点在写自己 `meta.design` 时，**必须**先看自己在 budget 表中的权重和角色。超预算 → 削减自身。

#### D. Atomic Design 组件分层

```
Atom（基础原子）
  input / button / link / checkbox / radio / icon-btn / tag / badge
  → 规格统一来自 ThemeConfig（已确定）
  → 不需要为每个实例独立深钻
  → 直接 styles + visualStates，复杂度低

Molecule（业务分子）
  form-field（label+input+error） / search-bar / mode-toggle / phone-input-with-code
  → 业务组合，第一次出现需要独立深钻设计意图
  → 用 asset/save_as_template 复用

Organism（业务有机体）
  form-card / app-bar / nav-tab-bar / hero-section / empty-state / permission-card
  → 大业务组件，必须独立深钻视觉规格
  → 用 asset/save_as_template 复用
```

#### E. 视觉先行 7 步思考框架（每屏必做）

| Step | 思考 | 落到哪 |
|------|------|--------|
| 1. 情感与氛围 | 用户此刻心理状态 / 目标感受 / 情绪曲线 / 与主题的关系 | screen.meta.design.summary |
| 2. 视觉层级 | 前景 / 中景 / 背景 / 遮罩 4 层 + 各层 z-index 规划 + 主次配 | screen.meta.design.layers |
| 3. 视觉手段 | 色彩 / 排版 / 阴影 / 渐变 / 动效 / 装饰 的具体选择 | 体现在 styles |
| 4. 装饰决策 | 7 大类装饰中选哪些（见下表） + 用量 | 装饰节点 + materialSpec |
| 5. 素材需求 | 需要哪些图标 / 装饰素材 / 插画 / 品牌素材 | materialSpec 写到对应节点 |
| 6. 视觉权重预算 | 每个组件视觉权重 + 角色 + 允许手段 | screen.meta.design.componentBudgets |
| 7. 主题契合 | 所有色 / 字号 / 间距 / 圆角 / 阴影 是否引用 token | 自检 `$token:` 使用率 |

#### F-pre. 衍生视图节点的视觉规格（不可省）★

interaction 阶段建的 7 类衍生视图节点**每一类都需要独立的视觉规格**——不允许只设计"稳态主视图"。这些节点在产品中出现频率甚至高于稳态（一个 app 90% 时间用户都在切换不同视图态）。

| 衍生视图类型 | 视觉规格必须包含 | 常见视觉手段 |
|------------|----------------|-------------|
| **骨架屏 / Loading 视图** | 占位结构形状与最终内容**严格一致** / shimmer 动画 / 不抢戏色调 | 浅灰色块 + shimmer 渐变 + token:colors.gray100~300 |
| **空态视图** | 居中插图 / 标题 / 描述 / **行动按钮** / 留白舒适 | 有机插图（kind=illustration） + token 文字色 + secondary 按钮 |
| **错误态视图** | 错误图示 / 原因清晰 / **重试按钮** / 客服入口 | 错误色点缀（不刺眼）+ 重试 primary 按钮 + 文字描述 |
| **权限态视图** | 引导插图 / 解释文案 / **登录/升级 CTA** | 与稳态共用 nav-bar，仅核心区替换 |
| **业务状态分支视图** | 每个状态独立 layout / 状态标识 badge / 对应 action 按钮 | 状态色 / 时间线 / 进度条 |
| **过渡反馈** | Toast 样式统一（success/error/warning/info 4 套） / 出入动画 | 圆角 + 阴影 + 状态色背景 |
| **全局覆盖层 overlays** | Modal / Sheet / Drawer 三套统一规格 / 出入动画 / backdrop | 圆角顶部 / drag-bar / safe-area 适配 |

**必须做**：
- 每个衍生视图节点在 `meta.design.summary` 写清楚视觉意图
- 每个需要素材的（如空态插图 / 错误图示）必须 `materialSpec` 完整
- 跨屏的"同类衍生视图"要统一规格（所有屏的骨架屏配色一致 / 所有屏的空态插图风格一致）
- 衍生视图节点的视觉权重通常 ≤ 5（不抢稳态焦点），但**空态行动按钮可以达到 8**（引导很重要）

**红线**：
- ❌ 衍生视图节点没 styles 或没 meta.design → R-VIEW-DESIGN-01
- ❌ 把所有错误态用一个 Toast 替代（页面级错误必须有整页视图）
- ❌ 空态用"暂无数据"四个字 + 灰色文字（违反产品力红线）

#### F. 装饰元素 7 大类（决策框架）

按主题风格匹配选择：

| 类别 | 子类 | 适合的产品风格 |
|------|------|---------------|
| 几何类 | 直线/网格/三角/矩形/多边形/菱形 | 科技 / 商务 / 极简 |
| 有机类 | 圆/光斑/波浪/气泡/云朵/花瓣 | 社交 / 健康 / 儿童 / 生活 |
| 光效类 | 渐变光晕/光线/镜面/霓虹/极光/星芒 | 科技 / 暗色 / 现代 / 庆典 |
| 纹理类 | 噪点/纸纹/点阵/条纹 | 复古 / 艺术 / 手作 |
| 符号类 | 星星/十字/箭头/心形/音符 | 会员 / 社交 / 音乐 |
| 数学科学类 | 贝塞尔/螺旋/坐标系/分子/轨道 | 科学 / 教育 / 数据 |
| 裁剪溢出类 | 截断矩形/半圆/斜切/溢出圆环/blob | 企业 / 现代 / SaaS |

#### G. 节点结构树 4 红线（执行红线）

任何节点写入 schema 时必须满足：

1. **组件内联展开**：业务组件实例化时，第一层子节点结构必须可见（不能只写一个 [组件:Card] 占位）
2. **每个非基准状态必须有对应节点**：如 visualStates 里有 `error` 态，节点树中要有对应错误提示节点
3. **每个节点必须有完整样式**（width/height/padding/font/color/bg/border 等关键属性都写齐）
4. **叶子节点必须有内容**：文字节点写出文案（含 `{{state.xxx}}` 表达式）/ 图标节点标注 materialSpec / 图片节点指明 src 来源

#### H. visualStates 完备性矩阵

每个交互节点必须按"组件类型 + variant × state"维度覆盖：

```
Button: variant ∈ {primary, secondary, tertiary, danger}
        state   ∈ {default, hover, pressed, focus, disabled, loading}
        → 6 个状态全覆盖（缺一就 R-VISUALSTATE-01）

Input:  variant ∈ {default, success, error, warning}
        state   ∈ {default, hover, focus, disabled, readonly}

Card:   state ∈ {default, hover, selected, disabled}
```

### 4.3 装饰节点追加（仅允许此处补结构）

product / interaction 阶段建好了所有"业务+交互"节点。你**只能追加这 4 类装饰节点**：

| 类型 | 例子 | renderHint |
|------|------|-----------|
| 背景氛围 | PinkCircleDeco / GradientGlow / MintLeafSplash | css-gradient 或 png |
| 角落溢出 | TopLeftBlob / CornerStripe | css 或 png |
| 分割装饰 | DividerLine / OrnamentSeparator | css 或 svg |
| 品牌点缀 | BrandPattern / Watermark | png |

**禁止重组业务骨架**——不允许把上游已建的 FormCard 移到别处。如果发现上游骨架真的有问题 → 退回上游修。

### 4.4 全量样式落库（一次到位）

每个节点的 styles 必须**一次写完**所有视觉相关属性，不留任务子集。例子：

```jsonc
n9 (SubmitBtn).styles = {
  // 尺寸
  width: "100%",
  height: "48px",

  // 颜色（全部 token）
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",

  // 字体
  fontSize: "$token:typography.fontSize.body",
  fontWeight: "$token:typography.fontWeight.semibold",
  lineHeight: "$token:typography.lineHeight.tight",

  // 形状
  borderRadius: "$token:radii.full",  // 药丸形
  border: "none",

  // 阴影
  boxShadow: "$token:shadows.sm",

  // 布局
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "$token:spacing.xs",

  // 间距
  marginTop: "$token:spacing.lg",

  // 动效
  transition: "all $token:durations.medium $token:easings.spring",
  cursor: "pointer"
}
```

**红线**：任何硬编码值（`#FF6F91` / `16px` / `300ms`）→ R-STRUCTURE-02 错误。

### 4.5 visualStates 完整态

```jsonc
n9 (SubmitBtn).visualStates = {
  hover: {
    styles: {
      backgroundColor: "$token:colors.primaryHover",
      boxShadow: "$token:shadows.md",
      transform: "translateY(-1px)"
    }
  },
  pressed: {
    styles: {
      backgroundColor: "$token:colors.primaryActive",
      boxShadow: "$token:shadows.xs",
      transform: "translateY(0)"
    }
  },
  focus: {
    styles: {
      boxShadow: "0 0 0 3px $token:colors.primaryLight"
    }
  },
  disabled: {
    styles: {
      backgroundColor: "$token:colors.gray400",
      boxShadow: "none",
      cursor: "not-allowed",
      opacity: 0.6
    }
  },
  loading: {
    styles: {
      backgroundColor: "$token:colors.primary",
      cursor: "wait",
      opacity: 0.9
    },
    childStateMap: {
      "<spinner-node-id>": "spinning"
    }
  }
}
```

### 4.6 素材规格 materialSpec（关键产物）

每个需要素材的节点在 `meta.design.materialSpec` 写**完整规格**——参考旧 `materials/B-01-brand-logo.md` 的 6 节模板：

```typescript
interface MaterialSpec {
  /** 1. 基本信息 */
  kind: 'brand' | 'icon' | 'decoration' | 'illustration' | 'background';
  referenceFrame: { width: number; height: number };
  background: string;  // transparent / token

  /** 2. 风格分析（4 维度，与 design-system aesthetics 一致） */
  styleAnalysis: {
    simpleToRich: string;        // 简洁 vs 丰富（"简洁偏中"）
    geometricToOrganic: string;  // 几何 vs 有机
    flatTo3D: string;            // 平面 vs 立体
    orderlyToCasual: string;     // 规整 vs 随意
  };

  /** 3. 色彩策略（必须全部 token 引用） */
  colorStrategy: {
    [role: string]: { value: string; role: string };
    // 例: primary: { value: "$token:colors.primary", role: "主体气泡" }
  };

  /** 4. 线条特征（描边类素材必填） */
  lineStyle?: {
    width: string;
    cap: 'butt' | 'round' | 'square';
    join: 'miter' | 'round' | 'bevel';
  };

  /** 5. 构图方案 */
  composition: string;  // 一段自然语言，描述构图概念
  safeZone?: string;     // 安全区描述（如"四周 6px padding"）

  /** 6. 图层结构（自上而下，给 material-painter 直接照画） */
  layers: Array<{
    name: string;           // "主体" / "内部图形" / "装饰"
    shape: string;          // "水滴气泡轮廓"
    fill?: string;
    stroke?: string;
    position?: string;
    size?: string;
  }>;

  /** 7. 变体（如有多 variant） */
  variants?: Array<{
    name: string;        // "dark" / "small" / "active"
    scenario: string;
    diff: string;
  }>;

  /** 8. 应用效果 */
  appliedStyles?: Record<string, string>;  // 应用到节点上的额外样式（如 margin）

  /** 9. 质量核对清单 */
  qualityChecklist: string[];

  /** 10. 渲染提示（决定 executor 怎么处理） */
  renderHint: 'png' | 'svg' | 'css-gradient' | 'css-only';
  // png: 调 material-painter 画 + 上传 + 应用到 backgroundImage/src
  // svg: 内联 SVG（小图标）
  // css-gradient: design 已在 styles 写背景，executor 跳过
  // css-only: 全 CSS 实现，executor 跳过

  notes?: string;
}
```

**红线**：colorStrategy 出现硬编码 hex → R-MATERIAL-02 错误。

### 4.7 跨屏一致性 audit（关键责任）

设计完所有屏后，**跨屏 audit**：

```
1. 通用组件类型（按钮 / 输入框 / 卡片 / 导航）在不同屏是否被统一对待
   - 同样的 Button 在登录页和注册页样式一致吗？
   - FormCard 在多个屏 padding/radius 一样吗？
   - 错误提示文字色统一吗？

2. 视觉密度跨屏均衡
   - 不会出现"登录页极度装饰、首页极度简洁"的撕裂

3. 主题契合
   - 所有色都来自 token？没有自创色值？

4. 通用组件抽模板
   - 高频复用组件 → asset/save_as_template
   - 后续屏 asset/instantiate 复用，自动一致

5. ★ 全局 overlays 视觉规格统一
   - OfflineBanner / SessionExpiredModal / GlobalErrorBoundary 等
   - 这些"出现在任何屏之上"的覆盖层视觉风格必须高度统一
   - 因为它们经常和不同屏内容并存，风格不统一会撕裂体验
```

### 4.7b 项目级全局 overlays 视觉规格 ★

interaction 阶段把 `project.globalOverlays` 节点骨架建好了，design 阶段要给每个 overlay 完整的视觉规格：

```jsonc
project.globalOverlays.forEach(o => {
  // 1. 整体 styles 一次到位
  o.rootNode.styles = { /* 完整 token 引用 */ };

  // 2. 内部所有节点 styles 全量
  // 3. visualStates 完整态（如 Modal 内按钮 hover/pressed/disabled）
  // 4. 每个需要素材的节点写 materialSpec

  // 5. meta.design 叙事
  o.rootNode.meta.design = {
    summary: "...",
    rationale: "...",
    visualSpec: {
      weight: "Heavy",            // overlay 通常是高权重
      role: "氛围-反馈" 或 "主角-阻断"
    }
  };
});
```

**规格要点**：
- 全局 overlays 视觉权重计入项目级总预算（写到 `project.meta.designSystem.globalOverlayBudget`）
- 全局 overlays 的设计稿要单独跟用户对齐（毕竟跨屏出现）
- 出入动画统一（如所有 modal 都 fade+scaleIn / 所有 banner 都 slideDown）

**项目级 design 任务**（在 §4.9 项目级任务中补）：

```
D-global-overlay-styles    全局 overlays 节点全量样式
D-global-overlay-states    全局 overlays visualStates
D-global-overlay-materials 全局 overlays 内的素材规格
D-global-overlay-audit     全局 overlays 跨屏并存的视觉协调性
```

### 4.8 写入 schema 的字段清单（精细到字段名）

#### A. 项目级（ThemeConfig 由 theme-generator 写，design 只读 + 引用；不修改 themeConfig）

```jsonc
// 不写 project.themeConfig 本身——那是 theme-generator 的事
// design-planner 只能读 theme/get，所有 styles 必须 $token: 引用

project.componentAssets:    ComponentTemplate[]   // ★ 通用业务组件抽模板
                                                  // 通过 asset/save_as_template 添加
                                                  // 跨屏复用：asset/instantiate
```

#### B. 屏幕级（Screen / ScreenMeta）

```jsonc
screen.backgroundColor:    "$token:colors.bgPage"    // 屏背景（统一引用 token）

screen.meta.design = {
  summary: "暖白底 + 顶部粉色渐变氛围 + 角落装饰 + 居中品牌 + 表单卡 + 药丸 CTA",
  palette: [
    "colors.primary",        // 草莓粉 - CTA / 品牌
    "colors.secondary",      // 薄荷绿 - 装饰点缀
    "colors.accent",         // 奶油黄 - 解锁光效
    "colors.bgPage",         // 暖白底
    "colors.bgCard",
    "colors.textPrimary"
  ],
  layers: [
    { name: "前景",  zIndex: 3, elements: ["LoadingOverlay","ErrorToast"] },
    { name: "中景",  zIndex: 2, elements: ["FormCard","FooterLinks"] },
    { name: "中景",  zIndex: 1, elements: ["HeaderArea","BrandLogo","BrandSlogan"] },
    { name: "背景",  zIndex: 0, elements: ["PageBackground","PinkCircleDeco","MintLeafDeco"] }
  ],
  componentBudgets: [
    { nodeId: "SubmitBtn",      role: "主角-CTA",   weight: 9, allowedTools: ["渐变","发光","spring 动效"], decorationDensity: "密" },
    { nodeId: "BrandLogo",      role: "主角-品牌", weight: 8, allowedTools: ["双色","小点缀"],         decorationDensity: "中" },
    { nodeId: "FormCard",       role: "配角-容器", weight: 5, allowedTools: ["阴影","圆角"],            decorationDensity: "少" },
    { nodeId: "PhoneInput",     role: "工具-输入", weight: 3, allowedTools: ["边框","聚焦光"],         decorationDensity: "极少" },
    { nodeId: "ModeToggle",     role: "工具-切换", weight: 4, allowedTools: ["药丸背景","spring 滑动"], decorationDensity: "少" },
    { nodeId: "PinkCircleDeco", role: "氛围-装饰", weight: 4, allowedTools: ["渐变","blur"],            decorationDensity: "中" },
    { nodeId: "MintLeafDeco",   role: "氛围-装饰", weight: 3, allowedTools: ["有机形"],                 decorationDensity: "少" },
    { nodeId: "RegisterLink",   role: "工具-导航", weight: 2, allowedTools: ["文字色"],                 decorationDensity: "极少" },
    { nodeId: "ForgotLink",     role: "工具-导航", weight: 2, allowedTools: ["文字色"],                 decorationDensity: "极少" }
  ],
  // ⚠️ 自检：总权重 40——超过 30 上限 → R-BUDGET-01；需削减或合并
  ref: undefined
}

screen.meta.status.phase = "designed"
```

#### C. rootNode 追加装饰节点（仅本阶段允许追加结构）

```jsonc
// 在已有骨架末尾追加装饰节点（z-index 由 styles 控制）
screen.rootNode.children.push(
  {
    id: "pinkCircleDeco",
    type: "div",
    name: "PinkCircleDeco",
    label: "粉色光晕装饰",
    styles: {
      position: "absolute",
      top: "-40px",
      right: "-60px",
      width: "180px",
      height: "180px",
      borderRadius: "$token:radii.full",
      background: "radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)",
      zIndex: 0,
      pointerEvents: "none"
    },
    props: {},
    children: [],
    states: [],
    events: [],
    activeState: "default",
    locked: false,
    visible: true,
    meta: {
      design: {
        summary: "右上角粉色光晕，营造温暖氛围",
        rationale: "对照视觉预算 weight=4 / 氛围-装饰 / 允许渐变+blur",
        visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
        materialSpec: {
          kind: "decoration",
          renderHint: "css-gradient",          // ★ CSS 实现，executor 跳过
          referenceFrame: { width: 180, height: 180 },
          background: "transparent",
          composition: "径向渐变圆，中心 primaryLight 50% 到边缘 0%",
          notes: "renderHint=css-gradient 时上面的 styles 已表达全部，无需画 PNG"
        }
      }
    }
  },
  {
    id: "mintLeafDeco",
    type: "div",
    name: "MintLeafDeco",
    label: "薄荷叶装饰",
    styles: {
      position: "absolute",
      bottom: "10%",
      left: "-20px",
      width: "120px",
      height: "120px",
      backgroundImage: "<待 executor 写入 PNG URL>",   // ★ executor 阶段填
      backgroundSize: "contain",
      backgroundRepeat: "no-repeat",
      zIndex: 0,
      pointerEvents: "none"
    },
    ...,
    meta: {
      design: {
        summary: "左下角薄荷叶有机装饰",
        rationale: "弥补构图右上角粉色重，左下需要平衡",
        visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
        materialSpec: {
          kind: "decoration",
          renderHint: "png",                    // ★ 需 executor 画
          referenceFrame: { width: 120, height: 120 },
          background: "transparent",
          styleAnalysis: { /* 见 §4.6 */ },
          colorStrategy: {
            primary: { value: "$token:colors.secondary", role: "叶片主色" }
          },
          composition: "三片相互交叠的薄荷叶，自然倾斜，自由形态",
          layers: [
            { name: "底层叶", shape: "椭圆+尖端", fill: "$token:colors.secondary", position: "左下" },
            { name: "中层叶", shape: "椭圆+尖端", fill: "$token:colors.secondaryLight", position: "中" },
            { name: "顶层叶", shape: "椭圆+尖端", fill: "$token:colors.secondary", position: "右上" }
          ],
          qualityChecklist: [
            "120×120 参考框内",
            "三叶清晰可辨",
            "透明通道正确",
            "色与 token 一致"
          ]
        }
      }
    }
  }
)
```

#### D. 每个节点的全量 styles（一次到位 + 全部 $token:）

```jsonc
// 区域容器
n1 (HeaderArea).styles = {
  width: "100%",
  paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.xl)",
  paddingBottom: "$token:spacing.xl",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "linear-gradient(180deg, #FFE6EC 0%, $token:colors.bgPage 100%)",
  position: "relative"
}

// 业务原子节点
n9 (SubmitBtn).styles = {
  // 尺寸
  width: "100%",
  height: "48px",
  // 色
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",
  // 字
  fontSize: "$token:typography.fontSize.body",
  fontWeight: "$token:typography.fontWeight.semibold",
  lineHeight: "$token:typography.lineHeight.tight",
  letterSpacing: "0.02em",
  // 形
  borderRadius: "$token:radii.full",
  border: "none",
  // 影
  boxShadow: "$token:shadows.sm",
  // 局
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "$token:spacing.xs",
  // 距
  marginTop: "$token:spacing.lg",
  // 动
  transition: "all $token:durations.medium $token:easings.spring",
  cursor: "pointer",
  // 不可选
  userSelect: "none"
}

n6 (PhoneInput).styles = {
  width: "100%",
  height: "44px",
  padding: "$token:spacing.sm $token:spacing.md",
  border: "1px solid $token:colors.borderDefault",
  borderRadius: "$token:radii.md",
  fontSize: "$token:typography.fontSize.body",
  color: "$token:colors.textPrimary",
  backgroundColor: "$token:colors.bgCard",
  transition: "border-color $token:durations.fast $token:easings.ease",
  outline: "none"
}
```

**红线**：硬编码值（`#FF6F91` / `16px` / `300ms`）→ R-STRUCTURE-02 错误。例外：`safe-area-inset-*` 系列、`0` / `auto` / `transparent` / `none` 这些 CSS 关键字。

#### E. 每个节点的 visualStates 完整态（VisualState 完整字段）

```jsonc
n9 (SubmitBtn).states = [
  {
    name: "default",
    styles: {},                          // default 不需要重复，留空
    transition: { duration: 200, easing: "spring" }
  },
  {
    name: "hover",
    styles: {
      backgroundColor: "$token:colors.primaryHover",
      boxShadow: "$token:shadows.md",
      transform: "translateY(-1px)"
    },
    transition: { duration: 150, easing: "ease-out" }
  },
  {
    name: "pressed",
    styles: {
      backgroundColor: "$token:colors.primaryActive",
      boxShadow: "$token:shadows.xs",
      transform: "translateY(0)"
    },
    transition: { duration: 80, easing: "ease-in" }
  },
  {
    name: "focus",
    styles: {
      boxShadow: "0 0 0 3px $token:colors.primaryLight"
    },
    transition: { duration: 150, easing: "ease-out" }
  },
  {
    name: "disabled",
    styles: {
      backgroundColor: "$token:colors.gray400",
      boxShadow: "none",
      cursor: "not-allowed",
      opacity: 0.6
    },
    disabledEvents: ["click"]            // ★ 此态禁用 click 事件
  },
  {
    name: "loading",
    styles: {
      cursor: "wait",
      opacity: 0.9
    },
    childrenVisibility: {                // ★ 显示 Spinner 子节点
      "submitSpinner": true,
      "submitText":    false
    },
    disabledEvents: ["click"]
  },
  // ★ 自动激活（loginMode 切换时按钮文案变）
  {
    name: "code-mode",
    activeWhen: "{{state.view.loginMode === 'code'}}",
    styles: {}                            // 文案差异由 props.textContent 表达式驱动
  }
]

// Input 完整态
n6 (PhoneInput).states = [
  { name: "default", styles: {} },
  { name: "hover",   styles: { borderColor: "$token:colors.borderStrong" } },
  { name: "focus",   styles: {
      borderColor: "$token:colors.primary",
      boxShadow: "0 0 0 3px $token:colors.primaryLight"
    } },
  { name: "error",
    activeWhen: "{{!!state.view.errors.phone}}",  // 自动激活
    styles: {
      borderColor: "$token:colors.error",
      backgroundColor: "rgba(237,90,90,0.05)"
    } },
  { name: "disabled", styles: { opacity: 0.5, cursor: "not-allowed" },
    disabledEvents: ["change","focus"] }
]
```

#### F. childrenStates / childrenVisibility（父态联动子态）

```jsonc
// 例：FormCard 在 loading 态时所有子输入框都置 disabled
n4 (FormCard).states = [
  ...,
  {
    name: "loading",
    activeWhen: "{{state.view.submitting}}",
    styles: { opacity: 0.7, pointerEvents: "none" },
    childrenStates: {
      "phoneInput":      "disabled",
      "credentialInput": "disabled",
      "modeToggle":      "disabled",
      "submitBtn":       "loading"
    }
  }
]
```

#### G. 节点级 meta.design

```jsonc
n9 (SubmitBtn).meta.design = {
  summary:   "主 CTA 按钮：药丸 / 草莓粉 / 白字 / spring hover 抬升 / 6 态完备",
  rationale: "登录页核心 CTA，视觉权重最高。圆角 full 呼应 organic 主题。spring 动效呼应 playful aesthetics。",
  ref:       undefined,
  visualSpec: {
    weight: "Heaviest",      // 与 budget 表中 weight=9 对齐
    zIndex: 2,
    role: "主角-CTA"
  }
  // materialSpec 仅当需要素材时填（按钮本身不需要）
}

n2 (BrandLogo).meta.design = {
  summary: "品牌锚点 / 第一视觉焦点",
  rationale: "粉色地图气泡 + 白色连接弧 + 薄荷绿小点，传达地理+社交",
  visualSpec: { weight: "Heavy", zIndex: 1, role: "主角-品牌" },
  materialSpec: {                          // ★ 需要素材，完整规格
    kind: "brand",
    renderHint: "png",
    referenceFrame: { width: 64, height: 64 },
    background: "transparent",
    styleAnalysis: {
      simpleToRich: "简洁偏中",
      geometricToOrganic: "有机为主",
      flatTo3D: "平面",
      orderlyToCasual: "略随意 playful"
    },
    colorStrategy: {
      primary:   { value: "$token:colors.primary",   role: "主体气泡" },
      secondary: { value: "$token:colors.secondary", role: "右上装饰点" },
      neutral:   { value: "#FFFFFF",                  role: "内部白色弧线" }
    },
    lineStyle: { width: "2.5-3px", cap: "round", join: "round" },
    composition: "粉色地图气泡（底部尖角圆润，居中，40×48px）+ 内部两段白色相连弧（120°，20×16px，居中偏上）+ 右上角薄荷绿小实心圆点（8px）",
    safeZone: "四周 6px padding",
    layers: [
      { name: "主体",    shape: "水滴气泡",       fill: "$token:colors.primary", stroke: "none", position: "居中",     size: "40×48" },
      { name: "内部图形", shape: "两段相连圆弧", fill: "none",                   stroke: "#FFFFFF 3px round", position: "居中偏上", size: "20×16" },
      { name: "装饰",    shape: "实心圆",        fill: "$token:colors.secondary", stroke: "none", position: "右上角外沿", size: "8" }
    ],
    qualityChecklist: [
      "64×64 参考框内居中",
      "气泡造型清晰可辨",
      "内部连接符号该尺寸下可读",
      "透明通道正确",
      "色彩与 token 一致"
    ]
  }
}
```

#### H. props.textContent 与表达式（静态文案 vs 动态）

```jsonc
// 静态文案（不变）—— 直接写字符串
n9 (SubmitBtn) children: [
  { id: "submitText", type: "span", name: "SubmitText", props: { textContent: "登录" }, ... }
]

// 动态文案 —— 写表达式（如按钮在不同 state 变文字）
// 方案 1：props.textContent 用表达式
n9.children[0].props.textContent = "{{state.view.submitting ? '登录中...' : '登录'}}"

// 方案 2：visualState 切换 children visibility 显隐两个静态 span
//   loading 态 → SubmitText hidden, LoadingText shown
//   （已在 §E 的 loading 态用 childrenVisibility 表达）
// design 阶段二选一：表达式简单，visualState 灵活
```

#### I. visibleWhen / animation / editorMetadata

```jsonc
// 编辑期布局提示（不参与渲染契约，但帮助编辑画布）
screen.rootNode.editorMetadata = { role: "scroll-container" }
n10 (FooterLinks).editorMetadata = { role: "sticky-bottom" }

// 自定义动画（如 success 反馈）
n9 (SubmitBtn).animation = {
  css: {
    name: "success-bounce",
    duration: "400ms",
    timingFunction: "spring",
    iterationCount: 1,
    fillMode: "forwards",
    keyframes: [
      { offset: 0,   styles: { transform: "scale(1)" } },
      { offset: 0.5, styles: { transform: "scale(1.05)" } },
      { offset: 1,   styles: { transform: "scale(1)" } }
    ]
  }
}
```

#### J. 通用组件抽模板

```jsonc
// 第一个屏完成 PhoneInput 设计后立刻抽模板：
// asset/save_as_template:
//   - rootNodeId = PhoneInput 的 id
//   - templateName = "PhoneInput"
//   - kind = "molecule"
//   - propDefinitions = [
//       { name: "value",    type: "string" },
//       { name: "onChange", type: "event"  },
//       { name: "error",    type: "string" }
//     ]
// 后续屏 asset/instantiate 复用 → 自动一致

project.componentAssets.push({
  id: "tpl_phoneInput",
  name: "PhoneInput",
  kind: "molecule",
  rootNode: { /* 完整子树 */ },
  propDefinitions: [ /* ... */ ]
})
```

#### K. 不在本阶段写的字段

| 字段 | 留给 | 原因 |
|------|-----|------|
| `node.events` | ⛔ interaction 已写（不动） | — |
| `node.bind` | ⛔ interaction 已写 | — |
| `node.repeat` | ⛔ interaction 已写 | — |
| `node.props.textContent`（仅动态表达式部分）| ⛔ interaction 已写 | 静态文案 design 可写 |
| `screen.dataSources` | ⛔ interaction 已写 | — |
| `screen.stateInit.view/data` | ⛔ interaction 已写 | 但可补 `previewValue` |
| `screen.overlays` | ⛔ interaction 已建 overlay 节点 | design 可补 overlay 内节点的 styles |
| `node.materialProjectId` | ⛔ executor 写 | 素材上传产物 |
| `project.themeConfig` | ⛔ theme-generator 写 | design 只读 + 引用 |
| 重组上游骨架（move/remove）| ⛔ 退回上游 | 禁止重组 |

#### L. 编辑期预览值（design 可补）

```jsonc
// 让设计师切到不同状态查看 UI 效果
screen.stateInit.view.loginMode.previewValue = "password"
screen.stateInit.view.submitting.previewValue = false
screen.stateInit.view.errors.previewValue     = { phone: "手机号格式不正确" }
// 不进运行时，仅服务编辑画布
```

### 4.9 工作流（任务驱动）

每屏的任务（细化到企业级 UI 工作量）：

```
D-X-emotion        Step 1 情感与氛围分析
D-X-hierarchy      Step 2 视觉层级（4 层 + z-index）
D-X-budget         Step 6 组件视觉预算分配表
D-X-decorations    Step 4 装饰决策（7 大类匹配 + 节点追加）
D-X-styles         Step 3 全量样式落库（每节点）
D-X-states         visualStates 完整态（按 variant × state 矩阵）
D-X-materials      Step 5 素材规格 materialSpec（每需要素材的节点）
D-X-meta           节点和屏的 meta.design 叙事
D-X-tree-redlines  节点结构 4 红线核对
D-X-coverage       本屏每个交互节点的 visualStates 覆盖完整
D-X-integrity      本屏 integrity 自检（0 个 R-STRUCTURE-*/R-MATERIAL-*）
```

项目级：

```
D-system-baseline  基于 theme 建立设计系统基线（Atom 规格统一审核）
D-templates        通用业务组件抽模板（save_as_template）
D-audit            跨屏一致性 audit
D-token-coverage   $token: 引用率核查（≥ 95%）
D-handover         移交 design-executor
```

### 4.10 入场 / 出场门禁

| 时机 | 检查 |
|------|------|
| 入场 | `project.theme.customized = true` + 所有屏 phase = interaction-defined + integrity 0 个 R-EVENTS-* |
| 出场 | 所有屏 phase = designed + 每节点 styles 已写 + visualStates 矩阵完整 + 需要素材节点 materialSpec 完整 + integrity 0 个 R-STRUCTURE-*/R-MATERIAL-*/R-VISUALSTATE-* + 跨屏一致性 audit 通过 |

---

## 5. 角色：design-executor（实施 + QA）

### 5.1 视角与定位

**你是工程实施 + QA。你不做任何设计决策。**

design-planner 把所有规格都写到 schema 了：styles 全量 / visualStates 全量 / materialSpec 全量。你的工作是：
1. 照 materialSpec 画素材 + 应用到节点
2. 截图核对，看真实渲染和 design 意图是否一致
3. integrity 终验，标 phase = verified
4. 交付

如果发现 schema 里规格不全 → **退回上游**，不在本阶段补。

### 5.2 核心工作流（旧版精华保留）

```
逐节点遍历 → 读节点 + 读 materialSpec → 调子技能 → 验证 → 回写 status
```

**红线**：
- ❌ 不从 summary 推断规格（summary 是摘要不是精确值）
- ❌ 不跳过 materialSpec 任何字段
- ❌ 不一次性处理 10+ 节点才验证（小步快跑）
- ❌ 不修 styles / events / 结构（那是上游的事）

### 5.3 素材绘制流程（按 renderHint 分流）

```
对每个有 materialSpec 的节点：
  if (renderHint === 'png'):
    1. canvas/create 创建素材工程
    2. 把 materialSpec 翻译成 canvas 操作（fill/stroke/composition 都已写好）
    3. canvas/export_and_apply { nodeId } → 自动上传 PNG + 应用到 backgroundImage/src
    4. 截图节点核对（symbol 清晰度 / 色彩准确度 / 与参考框对齐）
    5. 不通过 → 调整 canvas 重画 → 再核对
  elif (renderHint === 'svg'):
    1. 按 layers 写内联 SVG 字符串
    2. 节点 props 写 svg 内容
  else (css-gradient / css-only):
    1. design-planner 已在 styles 写好，跳过
    2. 直接进截图核对
```

### 5.4 截图核对（视觉验证）

每屏 / 每个素材节点完成后：

```
1. generate_snapshots 截图
2. 对照 screen.meta.design.summary + 各节点 meta.design.summary 检查
   - 整体氛围对吗？
   - 主角 CTA 视觉权重突出吗？
   - 装饰节点过度抢戏吗？
   - 与 design.palette 配色一致吗？
3. 不一致：
   - 是 styles 错？退回 design-planner
   - 是 materialSpec 不够精确？退回 design-planner 补
   - 是 executor 画素材出错？重画
4. 一致 → meta.status.phase = verified
```

### 5.5 写入 schema 的字段清单（精细到字段名）

#### A. 节点级（仅这些是 executor 的产物）

```jsonc
// 1. 素材应用结果（仅 renderHint=png 的节点）
node.styles.backgroundImage:  "url('https://cdn.example.com/materials/abc-123.png')"
// 或对 <img> 节点：
node.props.src:               "https://cdn.example.com/materials/abc-123.png"

// 同时确保配套的 backgroundSize/Position/Repeat（design 已经写好，executor 校验）
node.styles.backgroundSize:    "contain"     // 已存在则保留
node.styles.backgroundPosition:"center"
node.styles.backgroundRepeat:  "no-repeat"

// 2. 素材关联（用于后续编辑器右键"设计素材..." + 重画）
node.materialProjectId:        "mat_xyz"     // canvas 工程 ID

// 3. 完成度终态
node.meta.status = {
  phase: "verified",
  ready: {
    structure:    true,
    styles:       true,
    events:       true,
    visualStates: true,
    materials:    true     // executor 这一项变 true
  },
  notes: "已应用素材 mat_xyz, snapshot 通过核对"
}
```

#### B. 屏幕级

```jsonc
screen.meta.status.phase = "verified"
screen.meta.status.ready = { structure: true, styles: true, events: true, visualStates: true, materials: true }
```

#### C. 项目级（最终状态）

```jsonc
project.meta.plan 中相关任务全部 status=done
// 不写 project.meta 其他任何字段
```

#### D. 严格只能写这些字段（其余一律不动）

| 字段 | 来源 | executor 是否可写 |
|------|------|:-----------------:|
| `node.styles.backgroundImage` / `props.src` | 素材应用 | ✅ |
| `node.styles.backgroundSize/Position/Repeat` | 素材应用配套 | ✅（仅当 design 漏写时补 contain/center/no-repeat 默认值，并 notes 记录） |
| `node.materialProjectId` | 素材工程绑定 | ✅ |
| `node.meta.status.{phase, ready, notes}` | 完成度标记 | ✅ |
| `screen.meta.status.*` | 屏终态 | ✅ |
| **以上之外任何字段** | — | ❌ 退回上游 |

**禁止**：
- ❌ 改 styles 任何非素材属性（color/font/padding/...）
- ❌ 改 events / bind / repeat / visibleWhen
- ❌ 改节点 type / name / 结构
- ❌ 改 materialSpec（如发现 spec 有问题 → 退回 design-planner）
- ❌ 改 ThemeConfig

#### E. 截图核对的产物（仅作核对，不写 schema）

```
generate_snapshots → 拿到 PNG URL
→ 与 screen.meta.design.summary 比对（视觉氛围 / 主角突出 / 装饰平衡 / palette 准确）
→ 与每节点 meta.design.summary 比对（关键节点是否符合设计意图）
→ 不一致 → 找出原因（PNG 不达 spec / design 不够精确 / executor 操作问题）
        ↓
   退回对应阶段（design / executor 自己重画）
→ 一致 → 标 phase=verified
```

截图本身不写回 schema（避免每次截图都污染 schema）；其结论只通过 `meta.status.notes` 体现。

### 5.6 工作流（任务驱动）

每屏任务：

```
E-X-mat-<nodeName>    每个 renderHint=png 的素材节点一个任务
E-X-svg-<nodeName>    每个 renderHint=svg 的节点（如有）
E-X-snapshot          本屏完整截图核对
E-X-verified          本屏 phase 标记 + integrity 自检
```

项目级：

```
E-global-mat-<overlay-node>   ★ 项目级 globalOverlays 内的每个素材节点
E-global-snapshot             ★ 全局 overlays 在不同屏上的截图核对
E-integrity                   全项目 integrity 终验
E-snapshots                   全屏完整截图集
E-cross-screen                跨屏一致性核对
E-handover                    交付用户验收
```

### 5.7 入场 / 出场门禁

| 时机 | 检查 |
|------|------|
| 入场 | 所有屏 phase = designed + integrity 0 error + 所有需要素材节点 materialSpec 完整 |
| 出场 | 所有屏 + 节点 phase = verified + 全项目 integrity 0 error + 所有 png 素材已应用 + 截图核对通过 |

---

## 6. ThemeConfig 与下游的契约

### 6.1 token 引用契约

design-planner 写 styles **必须**用 `$token:xxx` 引用：

```jsonc
// ✅
backgroundColor: "$token:colors.primary"

// ❌ R-STRUCTURE-02
backgroundColor: "#FF6F91"
```

materialSpec.colorStrategy 也必须用 token：

```jsonc
// ✅
{ value: "$token:colors.primary", role: "主体气泡" }

// ❌ R-MATERIAL-02
{ value: "#FF6F91", role: "主体气泡" }
```

executor 在画 png 素材前，`theme/get` 解析 token 拿真实色值给 material-painter。

### 6.2 主题变更影响

用户中途改主题：
1. theme-generator 重新生成 tokens（colors 全变）
2. 所有 styles 的 `$token:` 引用自动指向新值——styles 不需要改
3. 所有 materialSpec.colorStrategy 也不需要改
4. **PNG 素材需要重画**——executor 找出所有 png 节点重跑

### 6.3 介入时机

```
product-analyst 完成（project.meta.styleDirection 已写）
    ↓
theme-generator 触发（用户主动调用 / product 阶段最后任务自动触发）
    ↓
interaction-designer（入场检查 theme.customized=true）
    ↓
design-planner（入场再次确认 theme，开始用 token）
    ↓
design-executor
```

---

## 7. integrity 校验规则（全集）

> **重要说明（v2.2）**：integrity checker 实际只实现了下表中**带 ✓ 实现**标记的规则。其余以 ⚠️ 标记的"产物完整性"类规则**不再追加到 checker**——它们的本意（"该有的产物到底有没有"）由 §0.1.8 的 expectedArtifacts 机制在**任务级**保证，比 integrity 全局扫描更精准、更早暴露。
>
> 选择 expectedArtifacts 而非 checker 规则的理由：
> 1. 产物归属一目了然（由具体任务声明），便于定位补救方
> 2. 任务标 done 时即时拦截，不需要等到全项目自检
> 3. 加新红线零代码改动（任务模板里加一条 ArtifactCheck 即可）
>
> 节点级运行时一致性（events/styles/visualStates 真假对账）仍由 checker 兜底——它们不属于"任务产物"而是"运行时契约"。
>
> **v2.4 重构（★）**：删除 R-EVENTS-01 + 整个 `INTERACTIVE_TRIGGERS` 硬编码白名单。原因：
> 1. 旧实现用 `meta.interaction.summary` 关键词正则（`/click|tap|blur|focus|输入.../`）启发式猜节点是否声明了交互意图——summary 是 AI 写给人看的自然语言，关键词撞库本质上不可能精确（描述邻居事件的派生显示、描述显示逻辑都会误中），持续误报。
> 2. 启发式触发后又用 `INTERACTIVE_TRIGGERS = {click,doubleClick,longPress,change,submit}` 5 个 trigger 的白名单去筛真事件——而 EventTrigger 类型有 15 个合法值（含 blur/focus/hover 等用户交互），白名单与类型脱节，输入框 onBlur 校验、滚动到底加载等正常交互全被误判为"没做交互"。
> 3. R-EVENTS-01 当初要解决的"声明 vs 产物不一致"已被两个更可靠的机制接管：
>    - **`anyNodeHasEvents` expectedArtifacts**：屏 / 子树级"有没有真交互"，结构判断零误报
>    - **R-EVENTS-02（去白名单后）**：单节点 event 写了 trigger 但 actions=[] 的空壳事件，纯结构判断
>    - **R-EVENTS-03（v2.4 落实）**：effect.fetch 缺 onSuccess/onError 的沉默失败，纯结构判断
> 4. AI 在交互阶段做"输入框 blur 校验 + 行内错误派生显示"是教科书级的标准设计，不应被任何 checker 拦下。

| 规则 | 实现 | 触发条件 | 修复方 |
|------|:---:|---------|--------|
| ~~R-EVENTS-01~~ | ❌ 已删除（v2.4） | 旧：summary 启发式猜交互意图 → 误报严重；改由 plan 任务的 `anyNodeHasEvents` expectedArtifacts 守屏/子树级"有没有真交互" | — |
| R-EVENTS-02 | ✓ | 任意 event（含 blur/focus/screenEnter/...）`actions=[]` 空壳事件 | interaction |
| R-EVENTS-03 | ✓（v2.4 落实） | effect.fetch 既无 onSuccess 也无 onError —— 用户失败时无任何反馈 | interaction |
| R-STATUS-01 | ✓ | ready.events=true 但 events[] 中无任何 actions 非空的事件（去白名单后基于纯结构判断） | interaction |
| R-STATUS-02 | ✓ | ready.styles=true 但 styles 空（假完成） | design |
| R-STATUS-03 | ✓ | ready.visualStates=true 但 visualStates 空 | design |
| R-PHASE-01 | ✓ | phase=verified 但 ready 仍有 false | executor |
| **R-PLAN-01** ★ | ✓ | 已 done 的任务其 expectedArtifacts 不再满足（§0.1.8 兜底） | 触发产物缺失的阶段 |
| R-THEME-01 ~ R-THEME-10 | ✓ | 主题红线（见 theme 包 validation.ts） | theme |
| R-STRUCTURE-01 | ⚠️ 移交 | 屏 phase ≥ interaction-defined 但 rootNode 子节点 ≤ 1 → 改用 product 阶段 `<M>-skeleton` 任务的 expectedArtifacts: `arrayMin path:rootNode.children min:1` | product |
| R-PRODUCT-01 | ⚠️ 移交 | rules 少于 4 条 → 改用 `<M>-rules` 任务 expectedArtifacts: `arrayMin path:meta.product.rules min:4` | product |
| R-PRODUCT-02 | ⚠️ 移交 | 节点 meta.product.summary 缺失 → 改用 `<M>-skeleton` 任务 expectedArtifacts | product |
| R-PRODUCT-03 | ⚠️ 移交 | 业务状态机字段未在 rules 显式枚举 → 改用 `<M>-rules` expectedArtifacts | product |
| R-PRODUCT-04 | ⚠️ 移交 | 缺 globalConcerns 5 类 → 改用 `P-global-concerns` expectedArtifacts: `hasKeys path:meta.globalConcerns keys:[session,network,preferences,navigation,fallback]` | product |
| R-PRODUCT-05 | ⚠️ 移交 | 缺 session/network 占位 → 改用 `P-global-state` expectedArtifacts | product |
| R-COVERAGE-01 | ⚠️ 移交 | rules 没对应任何 event/state/UI → 改用 `<M>-coverage` 与 `I-X-coverage` 任务 | product/interaction |
| R-STRUCTURE-02 | 待实现 | 节点 styles 用了硬编码颜色（非 $token:） | design |
| R-MATERIAL-01 / R-MATERIAL-02 | 待实现 | 素材规格红线 | design |
| R-VISUALSTATE-01 | 待实现 | 交互节点缺必要状态 | design |
| R-BUDGET-01 / R-BUDGET-02 | 待实现 | 视觉预算红线 | design |
| R-VIEW-LOADING-01 / R-VIEW-EMPTY-01 / R-VIEW-ERROR-01 / R-VIEW-BUSINESS-01 / R-VIEW-AUTH-01 | ⚠️ 移交 | 7 类衍生视图缺失 → 改用对应 `I-X-view-*` 任务 expectedArtifacts | interaction |
| R-VIEW-DESIGN-01 | 待实现 | 衍生视图缺 styles/meta.design | design |
| R-GLOBAL-STATE-01 | ⚠️ 移交 | globalStateInit 子结构不完整 → 改用 `I-global-state-fill` expectedArtifacts | interaction |
| R-GLOBAL-OVERLAY-01 | ⚠️ 移交 | globalOverlays showWhen 缺失 → 改用 `P-global-overlays` expectedArtifacts: `eachItem path:globalOverlays check:hasKeys $:[id,type,showWhen,rootNode]` | product/interaction |
| R-GLOBAL-OVERLAY-02 | 待实现 | overlay rootNode 缺 styles/design | design |
| R-GLOBAL-USAGE-01 | ⚠️ 移交 | 登录 onSuccess 未写 globalView.session → 改用 `I-X-events` expectedArtifacts | interaction |
| R-TOKEN-COVERAGE | 待实现 | $token: 引用率 < 95% | design |

---

## 8. schema 扩展（实施前必做）

### 8.1 NodeMeta.design 扩展

```typescript
design?: {
  summary?: string;
  rationale?: string;
  ref?: string;
  /** 视觉规格（权重 / 层级） */
  visualSpec?: {
    weight?: 'Lightest' | 'Light' | 'Medium' | 'Heavy' | 'Heaviest';
    zIndex?: number;
    role?: '主角-CTA' | '主角-内容' | '主角-品牌' | '配角-信息' | '配角-容器' | '工具-导航' | '工具-输入' | '氛围-装饰';
  };
  /** 素材规格 */
  materialSpec?: MaterialSpec;
};
```

### 8.2 ScreenMeta.design 扩展

```typescript
design?: {
  summary?: string;
  palette?: string[];           // 用到的 token 名（如 colors.primary）
  layers?: Array<{              // 视觉层级
    name: '前景' | '中景' | '背景' | '遮罩';
    zIndex: number;
    elements: string[];          // nodeIds
  }>;
  componentBudgets?: Array<{    // 视觉预算分配表
    nodeId: string;
    role: string;
    weight: number;             // 1-10
    allowedTools: string[];
    decorationDensity: '极少' | '少' | '中' | '密';
  }>;
  ref?: string;
};
```

### 8.3 ScreenMeta.interaction 扩展

```typescript
interaction?: {
  summary?: string;
  states?: string[];
  operations?: Array<{
    op: string;
    triggerNodePath: string;
    feedbackLevel?: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
    immediateFeedback?: string;
    inProgress?: string;
    onSuccess?: string;
    onFailure?: string;
    boundary?: string;
  }>;
  loadingStrategy?: {
    initial?: string;
    refresh?: string;
    pagination?: string;
    button?: string;
    silent?: string;
  };
  errorHandling?: Record<'validation' | 'business' | 'permission' | 'network' | 'server' | 'unknown', string>;
  boundaries?: string[];
  ref?: string;
};
```

### 8.4 MaterialSpec 接口（新增）

见 §4.6。

### 8.5 DesignProject.globalOverlays（v2.2 已落地 ✅）

**状态**：v2.2 已落地（`features/design-schema/src/types/project.ts` + `features/design-operations/src/operations/project.ts`）。

```typescript
export interface DesignProject {
  // ... 已有字段
  /**
   * 项目级全局覆盖层。渲染在所有屏内容 + 屏级 overlays 之上，跨屏共享。
   * 由 showWhen 表达式自动控制显隐（读 globalView）。
   * 例：OfflineBanner / SessionExpiredModal / GlobalErrorBoundary / AppUpdatePrompt。
   *
   * 写入 op：`project.setGlobalOverlays`（整体替换）。
   * 严禁通过 `meta.setProject` 写入——v2.2 起 service 端会显式拒绝。
   */
  globalOverlays?: OverlayNode[];
}
```

**渲染契约**：渲染器需要新增一层"globalOverlays 层"，z-index 高于屏级 overlays。当前 schema 已有 `OverlayNode` 类型（屏级用），可直接复用。

**MCP 入口**：`meta/set_global_overlays { projectId, overlays: OverlayNode[] | null }`（设计上 action 名归在 `meta` 工具下是为了和 globalConcerns 等"全局态相关"的工具就近——后续可考虑独立 `project` 工具）。

**与屏级 overlays 的区别**：
- 屏级（`Screen.overlays`）：仅本屏渲染，随屏切换被销毁
- 项目级（`DesignProject.globalOverlays`）：所有屏共享渲染、持续存在
- 两者用 `OverlayNode` 同一类型，区别只在挂载位置

### 8.6 ProjectMeta.globalConcerns（v2.2 已落地 ✅）

**状态**：v2.2 已落地（`features/design-schema/src/types/meta.ts`）。写入走 `meta/set_project { patch: { globalConcerns: {...} } }`（B 类信息，正常 meta 路径）。

```typescript
export interface ProjectMeta {
  // ... 已有字段
  /**
   * 全局态识别叙事（B 类信息，渲染不读）。
   * 由 product-analyst 识别填写，作为后续 globalStateInit/globalOverlays 设计依据。
   */
  globalConcerns?: {
    session?:     { summary: string; ref?: string };
    network?:     { summary: string; ref?: string };
    preferences?: { summary: string; ref?: string };
    navigation?:  { summary: string; ref?: string };
    fallback?:    { summary: string; ref?: string };
  };
}
```

### 8.7 globalView 表达式上下文（新增）

`ExpressionContext` 已有 `state.view` / `state.data`；现在新增 `globalView`：

```typescript
export interface ExpressionContext {
  state: ScreenState;            // 屏级（旧）
  globalView?: Record<string, unknown>;  // ★ 项目级全局 view（从 globalStateInit.view 默认值起步，runtime 跨屏持续）
  item?: unknown;
  index?: number;
  parent?: unknown;
  $last?: EffectStatus;
  $: BuiltinFunctions;
}
```

**Action 路径约定**：
- `state.set { path: "view.xxx" }` —— 屏级 view（旧）
- `state.set { path: "data.xxx" }` —— 屏级 data（旧）
- `state.set { path: "globalView.xxx" }` —— ★ 项目级 view（新）

运行时 `EffectExecutor` / 表达式求值器需要识别 `globalView.xxx` 前缀，路由到全局 store。

---

## 9. 实施顺序

```
1. STAGE-CONTRACT.md（本文档）通过用户检查 ★ 现在
2. 扩展 schema 类型：
   - NodeMeta.design.{visualSpec, materialSpec}
   - ScreenMeta.design.{layers, componentBudgets}
   - ScreenMeta.interaction.{operations.*, loadingStrategy, errorHandling, boundaries}
   - 新增 MaterialSpec 接口
3. 扩展 integrity 校验器（新增 R-STRUCTURE-*/R-MATERIAL-*/R-VISUALSTATE-*/R-BUDGET-*/R-THEME-*/R-PRODUCT-*/R-COVERAGE-*/R-TOKEN-COVERAGE）
4. 重写五个 SKILL.md（按本契约 §1-§5 一一对应）
5. 端到端验证（登录页 demo）
```

---

## 10. 不在本契约范围内（明确边界）

- 服务端能力（API 实现 / 数据库）—— 不属于 UI 设计
- 真实数据接入 —— design 阶段只到 dataSources 配置 + mock 场景；真实接入留给 codegen
- 跨项目复用 / 设计系统库管理 —— 后续独立技能
- 多语言 / 深度 a11y 优化 —— 后续独立技能
- 工程师代码生成 —— 后续独立技能

---

## 附录 A：登录页完整 schema 演进示例

参见单独的 `LOGIN-DEMO-WALKTHROUGH.md`（待写，作为参考实例）。

## 附录 B：旧 .design-workspaces 产物精华引用

- 产品分析：`product-analysis/modules/M2-fishing-net.md`（320 行模块深度示范）
- 交互设计：`interaction-design/pages/02-fishing-cast.md`（含节点骨架段）
- 视觉分析：`design-plan/pages/00-login/visual.md`（220 行视觉先行示范）
- 素材规格：`design-plan/pages/00-login/materials/B-01-brand-logo.md`（6 节模板示范）
- 设计系统：`design-plan/design-system.md`（317 行设计系统示范）

---

> 本文档需要用户检查通过后才动手改 schema 类型 + SKILL.md。
> 维护者：@pikun · v2.0 / 2026-05-30
