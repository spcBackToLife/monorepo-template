# design-planner schema-spec/

本目录是"写 schema 时的字段精确清单"——告诉 AI **写什么字段、写到哪、必填哪些、红线是什么**。methodology 告诉 AI 怎么想；schema-spec 告诉 AI 怎么写。

> ★ = 高频；★★ = v3 升级。

| 文件 | 内容 | 强制加载时机 |
|------|------|-------------|
| `screen-meta-design.md` ★★ | screen.meta.design 完整字段（summary/palette/layers/componentBudgets）+ screen.backgroundColor + **v3 §6 briefing / §7 visualConcept / §8 visualStrategy** | `D-X-emotion` / `D-X-hierarchy` / `D-X-budget` / `D-X-meta` / `D-X-briefing` / `D-X-concept` / `D-X-strategy` / `D-audit` |
| `node-styles.md` ★ | node.styles 一次到位规范 + token 引用规则 + 完整样式维度清单 | `D-X-styles` / `D-system-baseline` / `D-token-coverage` / `D-global-overlay-styles` |
| `visual-states.md` ★ | VisualState 完整字段（styles/styleOverrides/childrenStates/childrenVisibility/disabledEvents/activeWhen/transition）| `D-X-states` / `D-global-overlay-states` |
| `node-meta-design.md` | node.meta.design 完整字段（含 v3 `kind: 'decoration' / 'visual-container' / 'material-frame'`）| `D-X-meta` / `D-X-materials` |
| `material-spec.md` ★★ | MaterialSpec 接口完整 10 节 + **v3 §12 design 自跑 painter manifest**（materialProjectId / applyMaterialDesign / 自审截图） | `D-X-materials` / `D-global-overlay-materials` |
| `decoration-nodes.md` | 装饰节点追加规则（4 类）+ position:absolute 强制 | `D-X-decorations` |
| `global-overlay-design.md` | 项目级 globalOverlays 视觉规格 | 任意 `D-global-overlay-*` |
| `derivative-view-styles.md` | 7 类衍生视图节点样式规格要点 | `D-X-coverage` / 涉及衍生视图的 `D-X-styles` |
| `forbidden-fields-design.md` ★★ | **v3 重写**：放开/收紧二元表（design 放开 6 创作权 + 收紧业务字段）+ 自检 mental check | `D-X-integrity` / 任何时刻发现想写非法字段 |

## 加载策略

- 每次落 schema 前必读对应文件（避免拼写错 / 误写非法字段）
- 可以从已加载的内存中复用上一屏的同类知识，但**字段表每次重读**（防止漂移）
- `forbidden-fields-design.md` 有"自检 mental check"段落，第一次落 schema 时建议把它读进上下文
- v3 新放开字段（briefing/visualConcept/visualStrategy/materialProjectId）需要 B 类代码改造（B5）落地后才真正生效，详见根目录 `B类代码改造补丁文档-2026-05-31.md`
