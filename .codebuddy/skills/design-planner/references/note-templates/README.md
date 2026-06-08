# design-planner note-templates/

每个 plan 任务都有对应的 md 模板——告诉 AI **md 该填什么子段**。methodology 告诉怎么想;schema-spec 告诉怎么写 schema;note-templates 告诉 md 怎么排版。

---

## 屏级模板（8 Phase 主体）

| 模板 | 对应任务 / Phase | 路径模板 |
|---|---|---|
| `positioning.template.md` | `D-X-positioning` / Phase A 三层定位 | `analysis-notes/<projectId>/design/<screenId>/positioning.md` |
| `design-goals.template.md` | `D-X-design-goals` / Phase B 设计目标提取 | `analysis-notes/<projectId>/design/<screenId>/design-goals.md` |
| `goal-N.template.md` | `D-X-G<N>-decompose` / Phase C 目标→元素拆解 | `analysis-notes/<projectId>/design/<screenId>/goals/G<N>.md` |
| `cross-goal-strategy.template.md` | `D-X-cross-goal-strategy` / Phase D 跨目标统筹 | `analysis-notes/<projectId>/design/<screenId>/cross-goal-strategy.md` |
| `task-planning.template.md` | `D-X-task-planning` / Phase E 任务派发 | `analysis-notes/<projectId>/design/<screenId>/task-planning.md` |
| `craft-by-goal.template.md` | `D-X-G<N>-craft` / Phase F craft 任务 | `analysis-notes/<projectId>/design/<screenId>/craft-G<N>.md` |
| `coverage-fallback.template.md` | `D-X-coverage-fallback` / Phase G 兜底 | `analysis-notes/<projectId>/design/<screenId>/coverage-fallback.md` |
| `self-review-by-goals.template.md` | `D-X-self-review-by-goals` / Phase G 整屏对账 | `analysis-notes/<projectId>/design/<screenId>/self-review-by-goals.md` |

## 屏级收尾

| 模板 | 对应任务 | 路径模板 |
|---|---|---|
| `meta.template.md` | `D-X-meta` | `analysis-notes/<projectId>/design/<screenId>/meta.md` |
| `tree-redlines.template.md` | `D-X-tree-redlines` | `analysis-notes/<projectId>/design/<screenId>/tree-redlines.md` |
| `coverage.template.md` | `D-X-coverage` | `analysis-notes/<projectId>/design/<screenId>/coverage.md` |

## 项目级

| 模板 | 对应任务 | 路径模板 |
|---|---|---|
| `system-baseline.template.md` | `D-system-baseline` | `analysis-notes/<projectId>/design/system/baseline.md` |
| `templates.template.md` | `D-templates` | `analysis-notes/<projectId>/design/system/templates.md` |
| `audit.template.md` | `D-audit` | `analysis-notes/<projectId>/design/system/audit.md` |
| `token-coverage.template.md` | `D-token-coverage` | `analysis-notes/<projectId>/design/system/token-coverage.md` |
| `handover.template.md` | `D-handover` | `analysis-notes/<projectId>/design/system/handover.md` |

## 全局 overlay

| 模板 | 对应任务 | 路径模板 |
|---|---|---|
| `global-overlay-styles.template.md` | `D-global-overlay-styles` | `analysis-notes/<projectId>/design/global/overlay-styles.md` |
| `global-overlay-states.template.md` | `D-global-overlay-states` | `analysis-notes/<projectId>/design/global/overlay-states.md` |
| `global-overlay-materials.template.md` | `D-global-overlay-materials` | `analysis-notes/<projectId>/design/global/overlay-materials.md` |
| `global-overlay-audit.template.md` | `D-global-overlay-audit` | `analysis-notes/<projectId>/design/global/overlay-audit.md` |

---

## 每份 md 通用结构

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<X>-<task>
> 对应 schema 字段：<相对路径>
> 服务目标（craft 类必填）：<G<N> 的 statement>

## 1. 推理过程
[本任务的 md 主体——schema 装不下的过程信息]

## ★ 沉淀到 schema 的结论
[与本任务 MCP 调用 1:1 对应的字段值 + jsonc 代码块]
```

---

## 加载策略

- 第一次执行某类任务 → 必须 read 对应模板
- 写完 md 前回查模板,确认每个子段都填了
- 模板只是骨架,**不为了形式裁剪推理深度**

---

## 8 Phase 流程提示

```
positioning (Phase A)
   ↓
design-goals (Phase B,≥3 个目标)
   ↓
goals/G1.md / G2.md / ... (Phase C,每目标一份)
   ↓
cross-goal-strategy (Phase D)
   ↓
task-planning (Phase E,自创 N 个 D-X-G<N>-craft 任务)
   ↓
craft-G1.md / craft-G2.md / ... (Phase F,每目标一份 craft)
   ↓
coverage-fallback.md (Phase G 兜底)
   ↓
self-review-by-goals.md (Phase G 整屏对账)
   ↓
handover.md (Phase H 移交)
```

完整跑一遍样板见 `../examples/login-design.md`。
