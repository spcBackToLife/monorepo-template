# interaction-designer schema-spec/

本目录是"写 schema 时的字段精确清单"——告诉 AI **写什么字段、写到哪、必填哪些、红线是什么**。methodology 告诉 AI 怎么想；schema-spec 告诉 AI 怎么写。

| 文件 | 内容 | 强制加载时机 |
|------|------|-------------|
| `screen-meta-interaction.md` | screen.meta.interaction 字段精确清单（summary / states / operations / loadingStrategy / errorHandling / boundaries）| `I-X-statemachine` / `I-X-operations` / `I-X-loading` / `I-X-errors` / `I-X-boundaries` / `I-X-meta` / `I-X-coverage` 落 schema 前 |
| `state-completion.md` | screen.stateInit.view 派生态 + globalStateInit.view 子结构 | `I-X-state-vars` / `I-global-state-fill` 落 schema 前 |
| `mock-scenarios.md` | dataSources 完整化（mock 场景 / autoFetchOnEnter / defaultParams）| `I-X-datasources` 落 schema 前 |
| `interaction-events.md` ★ | events.actions / bind / repeat / visibleWhen / 动态文案 完整规范 | `I-X-events` 落 schema 前 |
| `derivative-views.md` | 7 类衍生视图节点的 schema 写法（visibleWhen 表达式 + meta.interaction）| 任意 `I-X-view-*` 落 schema 前 |
| `overlays.md` | screen.overlays + project.globalOverlays 完整 schema | `I-X-overlays` / `I-global-overlay-events` 落 schema 前 |
| `forbidden-fields-interaction.md` | 严禁本阶段写的字段（边界表）| `I-X-events` / `I-X-integrity` / 任何时刻发现想写非法字段 |

加载策略：
- 每次落 schema 前必读对应文件（避免拼写错 / 误写非法字段）
- 可以从已加载的内存中复用上一屏的同类知识，但**字段表每次重读**（防止漂移）
