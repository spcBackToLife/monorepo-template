# md 模板集 — product-analyst 任务级双产出骨架

每个 plan 任务对应一个模板。AI 照填，**不要为了形式裁剪推理深度**——模板只是骨架，推理过程必须真实展开（候选穷举、否决理由、多角度验证等）。

## 核心约束（所有模板共有）

1. 必须以**统一头部**开头
2. 必须以**「★ 沉淀到 schema 的结论」**段落结尾（与 MCP 调用 1:1 对应）
3. 「推理过程」段必须包含 schema 装不下的内容（穷举 / 树 / 验证表 / 否决理由）

## 统一头部

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<taskId>
> 对应 schema 字段：<相对路径>
```

## 文件清单

| 模板 | 适用任务 | 落点 |
|------|---------|------|
| `00-overview.template.md` | `P-overview` | `analysis-notes/<projectId>/00-overview.md` |
| `decision.template.md` | `P-decisions` 每决策一份 | `analysis-notes/<projectId>/decisions/<Dx>-*.md` |
| `global-concerns.template.md` | `P-global-concerns` | `analysis-notes/<projectId>/global/concerns.md` |
| `global-state.template.md` | `P-global-state` | `analysis-notes/<projectId>/global/state.md` |
| `global-overlays.template.md` | `P-global-overlays` | `analysis-notes/<projectId>/global/overlays.md` |
| `A-stories.template.md` | `<M>-stories` | `analysis-notes/<projectId>/modules/<M>/A-stories.md` |
| `B-flows.template.md` | `<M>-flows` | `analysis-notes/<projectId>/modules/<M>/B-flows.md` |
| `C-rules.template.md` ★ | `<M>-rules` | `analysis-notes/<projectId>/modules/<M>/C-rules.md` |
| `D-data.template.md` | `<M>-data` | `analysis-notes/<projectId>/modules/<M>/D-data.md` |
| `E-skeleton.template.md` | `<M>-skeleton` | `analysis-notes/<projectId>/screens/<screenId>/skeleton.md` |
| `F-state-shape.template.md` | `<M>-state-shape` | `analysis-notes/<projectId>/screens/<screenId>/state-shape.md` |
| `G-coverage.template.md` | `<M>-coverage` | `analysis-notes/<projectId>/screens/<screenId>/coverage.md` |
| `module-readme.template.md` | 模块汇总 | `analysis-notes/<projectId>/modules/<M>/README.md` |
