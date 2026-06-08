# interaction-designer note-templates/

每份模板对应一个 plan 任务。AI 写 md 前必须 read 对应模板，按骨架填——**模板只是骨架，不为了形式裁剪推理深度**。

## 屏级任务模板（17 份）

| 模板 | 对应任务 | 必要 / 按需 |
|------|---------|----------|
| `statemachine.template.md` | I-X-statemachine | 必要 |
| `operations.template.md` | I-X-operations | 必要 |
| `loading.template.md` | I-X-loading | 必要 |
| `errors.template.md` | I-X-errors | 必要 |
| `boundaries.template.md` | I-X-boundaries | 必要 |
| `state-vars.template.md` | I-X-state-vars | 必要 |
| `datasources.template.md` | I-X-datasources | 必要（如本屏有 api ds）|
| `events.template.md` ★ | I-X-events | 必要（核心，最长）|
| `view-loading.template.md` | I-X-view-loading | 按需（无加载场景可 skipped）|
| `view-empty.template.md` | I-X-view-empty | 按需（无列表型 ds 可 skipped）|
| `view-error.template.md` | I-X-view-error | 按需（无 api ds 可 skipped）|
| `view-auth.template.md` | I-X-view-auth | 按需（公开屏可 skipped）|
| `view-business.template.md` ★ | I-X-view-business | 按需（无业务对象状态机可 skipped）|
| `view-feedback.template.md` | I-X-view-feedback | 按需 |
| `overlays.template.md` | I-X-overlays | 按需 |
| `meta.template.md` | I-X-meta | 必要 |
| `coverage.template.md` ★ | I-X-coverage | 必要（三轴核对）|

> I-X-integrity 任务无 md（自检型任务，直接调 query/integrity）。

## 项目级任务模板（3 份）

| 模板 | 对应任务 |
|------|---------|
| `global-state-fill.template.md` | I-global-state-fill |
| `global-overlay-events.template.md` | I-global-overlay-events |
| `global-coverage.template.md` | I-global-coverage |

> I-handover 任务无 md（汇总通知型，直接给用户回复）。

## 共用统一头部（每份 md 强制）

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<taskId>
> 对应 schema 字段：<相对路径>
```

## 共用三段结构

每份 md 必须含三段：

1. **统一头部**
2. **推理过程**——schema 装不下的所有过程信息：候选方案 / 多角度验证 / 异常分支树 / 替代方案 / 否决理由 / 完整列表
3. **★ 沉淀到 schema 的结论**——与本任务 MCP 调用 1:1 对应的字段值 + jsonc 代码块

## 跳过任务的特例

衍生视图任务（`view-*`）允许 status='skipped'，但**必须**在 md 中写明否决理由。
跳过任务的 md 头部还是要写，沉淀段写：

```
⏭ 本屏无<某种>需求，本任务 skipped。
理由：[详细说明]
```
