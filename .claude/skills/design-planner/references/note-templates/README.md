# design-planner note-templates/

每个 plan 任务都有对应的 md 模板——告诉 AI **md 该填什么子段**。methodology 告诉怎么想；schema-spec 告诉怎么写 schema；note-templates 告诉 md 怎么排版。

> ★ = 高频；★★ = v3 新增。

## v3 8-Phase 模板（6 份新增）

| 模板 | 对应任务 / Phase | 路径模板 |
|------|------------------|---------|
| `briefing.template.md` ★★ | `D-X-briefing` / Phase A 取景 | `analysis-notes/<projectId>/design/<screenId>/briefing.md` |
| `concept.template.md` ★★ | `D-X-concept` / Phase B 视觉概念 | `analysis-notes/<projectId>/design/<screenId>/concept.md` |
| `strategy.template.md` ★★ | `D-X-strategy` / Phase C 视觉策略 5 维 | `analysis-notes/<projectId>/design/<screenId>/strategy.md` |
| `craft-task.template.md` ★★ | `D-X-craft-<N>` / Phase E 自创任务 | `analysis-notes/<projectId>/design/<screenId>/craft-<N>.md` |
| `review.template.md` ★★ | `D-X-self-review` / Phase F 自审 | `analysis-notes/<projectId>/design/<screenId>/self-review.md` |
| `handover.template.md` ★★ | `D-handover` / Phase H 移交 | `analysis-notes/<projectId>/design/system/handover.md` |

## v2 屏级保留模板

| 模板 | 对应任务 | 路径模板 |
|------|---------|---------|
| `emotion.template.md` | `D-X-emotion` | `analysis-notes/<projectId>/design/<screenId>/emotion.md` |
| `hierarchy.template.md` | `D-X-hierarchy` | `analysis-notes/<projectId>/design/<screenId>/hierarchy.md` |
| `budget.template.md` ★ | `D-X-budget` | `analysis-notes/<projectId>/design/<screenId>/budget.md` |
| `decorations.template.md` | `D-X-decorations` | `analysis-notes/<projectId>/design/<screenId>/decorations.md` |
| `styles.template.md` ★ | `D-X-styles` | `analysis-notes/<projectId>/design/<screenId>/styles.md` |
| `states.template.md` ★ | `D-X-states` | `analysis-notes/<projectId>/design/<screenId>/states.md` |
| `materials.template.md` | `D-X-materials` | `analysis-notes/<projectId>/design/<screenId>/materials.md` |
| `meta.template.md` | `D-X-meta` | `analysis-notes/<projectId>/design/<screenId>/meta.md` |
| `tree-redlines.template.md` | `D-X-tree-redlines` | `analysis-notes/<projectId>/design/<screenId>/tree-redlines.md` |
| `coverage.template.md` ★ | `D-X-coverage` | `analysis-notes/<projectId>/design/<screenId>/coverage.md` |

## 项目级模板

| 模板 | 对应任务 | 路径模板 |
|------|---------|---------|
| `system-baseline.template.md` | `D-system-baseline` | `analysis-notes/<projectId>/design/system/baseline.md` |
| `templates.template.md` | `D-templates` | `analysis-notes/<projectId>/design/system/templates.md` |
| `audit.template.md` ★ | `D-audit` | `analysis-notes/<projectId>/design/system/audit.md` |
| `token-coverage.template.md` | `D-token-coverage` | `analysis-notes/<projectId>/design/system/token-coverage.md` |
| `global-overlay-styles.template.md` | `D-global-overlay-styles` | `analysis-notes/<projectId>/design/global/overlay-styles.md` |
| `global-overlay-states.template.md` | `D-global-overlay-states` | `analysis-notes/<projectId>/design/global/overlay-states.md` |
| `global-overlay-materials.template.md` | `D-global-overlay-materials` | `analysis-notes/<projectId>/design/global/overlay-materials.md` |
| `global-overlay-audit.template.md` | `D-global-overlay-audit` | `analysis-notes/<projectId>/design/global/overlay-audit.md` |

## 每份 md 通用结构

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<X>-<task>
> 对应 schema 字段：<相对路径>

## 1. 推理过程
[本任务的 md 主体——schema 装不下的过程信息]

## ★ 沉淀到 schema 的结论
[与本任务 MCP 调用 1:1 对应的字段值 + jsonc 代码块]
```

## 加载策略

- 第一次执行某类任务 → 必须 read 对应模板
- 写完 md 前回查模板，确认每个子段都填了
- 模板只是骨架，**不为了形式裁剪推理深度**

## v3 8-Phase 流程提示

`briefing → concept → strategy → 自创 craft 任务 → 每个 craft 一份 craft-<N>.md → self-review.md → handover.md`

完整跑一遍样板见 `../examples/login-design-v3.md`。
