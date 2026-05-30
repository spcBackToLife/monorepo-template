# interaction-designer methodology/

本目录是交互设计的"思维框架"——告诉 AI **怎么想问题**。schema-spec 告诉 AI **写什么字段**；note-templates 告诉 AI **md 怎么填**。三者分工明确。

| 文件 | 内容 | 强制加载时机 |
|------|------|-------------|
| `01-state-machine.md` | 状态机三要素（States / Transitions / Effects）| 任务 `I-X-statemachine` / `I-X-events` |
| `02-feedback-levels.md` | L0-L5 反馈层级 + 操作清单 7 列模板 | 任务 `I-X-operations` |
| `03-loading-strategy.md` | 5 场景加载策略 | 任务 `I-X-loading` |
| `04-error-handling.md` | 6 类错误 + 4 时机校验 | 任务 `I-X-errors` |
| `05-boundary-cases.md` | 7 类边界 Case | 任务 `I-X-boundaries` |
| `06-three-axis-coverage.md` | 三轴覆盖核对（rules / 业务状态机 / dataSource 三态）| 任务 `I-X-coverage` / `I-global-coverage` |
| `07-derivative-views.md` | 7 类衍生视图节点速查 | Phase 1 列任务清单；任意 `I-X-view-*` |

加载策略：
- 第一次执行某类任务 → 必须 read 对应文件
- 连续做多个同类任务（如 I-00-events → I-01-events） → 内存中已有可复用，但模板仍每屏重读以避免漂移
