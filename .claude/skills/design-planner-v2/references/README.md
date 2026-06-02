# design-planner-v2 references — 阅读规则

执行任务前先按 `SKILL.md §4 任务→必读文件映射` 加载对应 `methodology/` / `schema-spec/` / `recipes/` / `pitfalls/` / `examples/` 文件。

## 唯一一条阅读规则

文中若提到「写 xx.md / 推理段 / 自审段 / sink to md / 写 craft md / 写 self-review md / note-templates」——一律读作下表的执行动作：

| 文中提到 | 你应该做的事 |
|---|---|
| 写 positioning.md / 推理段 | 在工作记忆里走完三层定位（产品 / 页面 / 用户场景）→ `meta/set_screen` 写 `meta.design.positioning` |
| 写 design-goals.md | 在工作记忆里把 ≥3 个目标的 5 字段（statement / whyMatters / impactMode / successCriteria / priority）想清楚 → `meta/set_screen` 写 `meta.design.designGoals` |
| 写 goals/G<N>.md | 在工作记忆里走完 G<N> 的 6 步拆解（涉及元素 / 5 维 changes / weightAllocation / coordination / measure）→ `meta/set_screen` 写 `meta.design.goalElementMap[G<N>]` |
| 写 cross-goal-strategy.md | 在工作记忆里走完元素×目标矩阵 + 权重金字塔 + 装饰族选定 + 60-30-10 累积 → `meta/set_screen` 写 `meta.design.visualStrategy` |
| 写 craft-G<N>.md 推理段 | 在工作记忆里把"当前态 vs 目标态 + 改动方案 + 预期截图效果"想清楚（SKILL.md §6 心智 5 问必答）|
| 写 craft-G<N>.md 自审段 | 截图 → 在工作记忆里逐条核对 successCriteria 像素级观察 + forbiddenSignals + 反 KPI 自检 → 通过后任务 `notes` 一句话留痕（≤200 字）|
| md 末尾 ★ 沉淀到 schema 的结论 | 直接调对应 MCP 写 schema —— 结构化字段就是结论本身 |
| analysis-notes/<projectId>/design/*.md 路径 | 不存在；禁止新写（R-WRITE-MD）|
| note-templates/<X>.template.md | 不存在；不读 |
| self-review-by-goals.md | 不存在；自审在工作记忆里跑 + 任务 `notes` 一句话留痕 |
| meta.md / handover.md | 不存在；meta 落 `screen.meta.design.summary` + 各节点 `meta.design.summary/rationale`；handover 是 D-handover 任务的 `notes` 一句话 |

## 唯一例外（仍写 md）

`UpstreamChallenge` 流程的 `challenge.template.md` / `decision.template.md` —— 跨阶段契约文档。详见 SKILL.md §10。

## 加载策略

- 第一次执行某类任务 → 必须 read 对应文件
- 入场启动 → 必读 `methodology/00-design-thinking.md`（总纲）
- 每个 Phase 任务 → 按 SKILL.md §4 任务→必读文件映射读对应文件
- 连续做多个同类任务 → 内存中已有可复用，但 schema-spec 每次落 schema 前重读
