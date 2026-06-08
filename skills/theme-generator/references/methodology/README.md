# theme-generator 方法论索引

| 文件 | 内容 | 对应任务 |
|------|------|---------|
| `01-intent-extraction.md` | 7 维度风格意图提取 + aesthetics 8 类 + 关键词映射 | T1-intent |
| `02-color-science.md` ★ | HSL 色轮 + APCA 对比度 + 表面/文字色推导 | T2-colors |
| `03-typography-spacing.md` | modular scale 1.25 / 8px 网格 / 圆角 / 阴影 / 动效 | T3-typo-spacing |
| `04-decoration-rules.md` | aesthetics → 6 类 decorationRules 映射 + 多标签叠加 | T4-decoration |
| `05-icon-state-spec.md` | iconSpec + stateSpec 推导（含风格映射）| T5-icon-state |
| `06-variant-derivation.md` | base + dark/light 变体的 token override 推导 | T6-variants |

## 方法论交叉引用

- T2-colors 是核心，所有 token 派生从 seedColor 出发；不通过 APCA 验证不能落库
- T4-decoration 决定 T3 的 cornerStyle / shadow strategy（如 cornerStyle=pill 决定 radii 阶梯走 pill 列）
- T5-icon-state 引用 T4 的 iconStyle / aesthetics
- T6-variants 是 T2/T3 的派生（仅写 override 差异）

## 写 md 与查 spec 的边界

- 方法论文件（本目录）讲"为什么 / 怎么算"——写 md 推理段时引用
- schema-spec 文件讲"字段名 / 取值范围 / MCP"——落 schema 前必查（每次都要查，避免拼写错）
