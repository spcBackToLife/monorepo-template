# theme-generator note-templates 索引

每个 plan 任务一份 md 模板。写 md 前必须 read_file 对应模板，按骨架填——不允许凭印象写。

| 模板 | 对应任务 | 关键过程段（schema 装不下的）|
|------|---------|------------------------|
| `T1-intent.template.md` | T1-intent | 候选 aesthetics 标签穷举 + 否决理由 + seedColor 选择推理 |
| `T2-colors.template.md` ★ | T2-colors | HSL 推导算式表 + APCA 实测表 + 候选色板对比 |
| `T3-typo-spacing.template.md` | T3-typo-spacing | modular scale 偏离率表 + 8px 网格校验 + shadow 配方理由 |
| `T4-decoration.template.md` | T4-decoration | 多 aesthetics 标签叠加决策表 |
| `T5-icon-state.template.md` | T5-icon-state | iconSpec + stateSpec 风格映射推理 |
| `T6-variants.template.md` ★ | T6-variants | dark 变体推导逐字段表 + dark 独立 APCA 实测表 |
| `T7-handover.template.md` | T7-handover | 出场门禁全检 + 移交说明 |

## 通用约束

1. **顶部三行声明强制**（任务 / schema 字段路径）
2. **末尾「★ 沉淀到 schema 的结论」段强制**——必须含 jsonc 代码块，与 MCP 调用 1:1 对应
3. **推理段不允许"留空 / 等待补充"**——这是过程留痕，需有据可查
4. **HSL 算式 / APCA 数值不允许"略"**——精确到三元组与 Lc 整数
