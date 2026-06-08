# UpstreamChallenge —— 跨阶段回流挑战

> 本文件适用任务：发起 challenge 时 / 接管 open challenge 时。
> 协议依据：`../../STAGE-CONTRACT.md` §0.1.9。
> ⚠️ challenge / decision md 是**跨阶段契约文档**，不在 R-WRITE-MD 禁止范围内。

---

## 1. 何时挑战上游

必须满足两个之一：

1. 想做的实现触发上游 forbidden 红线（且红线动机不是为了挡这个具体场景）
2. 上游产物的某个决策与本阶段目标的最佳实现存在不可调和分歧

不满足 → 按现有红线走（自己绕过去 / 用次优实现 / 对话上下文备注理由）。

---

## 2. 典型触发场景

| 场景 | 退回的上游 SKILL |
|---|---|
| targetUser.dailyApps 缺位无法做 Phase A 竞品对照 | product-analyst |
| theme 装饰族不足以承载多目标需求（如 G1 需 illustration / G2 需 geometric-line，theme 仅给 minimal）| theme-generator 调 decoration token |
| interaction 没建对应衍生视图节点（如 EmptyState）| interaction-designer |
| successCriteria 跑 ≥3 轮 craft 仍不达 | 视情况：theme / interaction / 本阶段 Phase B/D |

---

## 3. 发起 challenge 5 步流程

```
1. 推进任务 T_down 时发现冲突 → 不立即落 schema
2. 写 challenge md（强模板见 ../common/references/challenge.template.md）
3. 调 meta/raise_upstream_challenge → service 自动 add P-revise-* 任务 + block T_down
4. 提示用户："已发起回流挑战 X，需要切到 <上游 SKILL> 接管处理"
5. 等用户切回时（T_down 已 unblocked）：
   - read challenge md + decision md
   - 按 decision md §4 给的实现指南落 schema 续做 → 标 done
```

---

## 4. 接管 open challenge 流程（design-planner 接到 targetStage='design' 的 challenge 时）

当 Phase 0 第 ⑤ 步 `query/list_open_challenges { projectId, targetStage: 'design' }` 返回 phase=`open` 的 challenge 时：

```
1. 优先级最高——立刻接管，不走 next_pending_task
2. read_file ../common/references/challenge.template.md + decision.template.md
3. read_file challenge md → 理解下游诉求 + 候选方案
4. 写 decision md 到 analysis-notes/<projectId>/challenges/<challengeId>-decision.md
   - §1 决策（accepted / partially / rejected）
   - §2 多角度视觉理由（含 designGoals 视角：本决策对哪些 goal 有何影响）
   - §3 实施清单（accepted: 改 schema 的 MCP 调用清单）
   - §4 给下游的实现指南
5. accepted 时改 schema：用本阶段允许的 MCP（style/* / visual_state/* / element/add 装饰节点 / meta/set_node 等）
   - 改完后**同步**对应受影响 design task 的 notes 加补丁说明
6. 调 meta/resolve_upstream_challenge { projectId, challengeId, accepted, rationale, decisionMd }
7. 简短回复用户："challenge 已 accepted/rejected，下游可以续做"
```

---

## 5. 红线

| 红线 | 触发条件 |
|---|---|
| **R-CHALLENGE-02** | 不写 decision md 直接 resolve / rationale 空话或 < 10 字符 |
| **R-CHALLENGE-03** | accepted 时没真改 schema |
| **R-CHALLENGE-04** | 接管 challenge 期间又开新 challenge |
