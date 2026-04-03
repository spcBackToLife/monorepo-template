# W5–W8 总索引（自主规划 · 按依赖执行）

> **原则**：不依赖口头排期；每个波次有独立 `editor-wN-issues.md`，实现一项勾一项。  
> **依赖链**：W5（交互+预览 MVP）→ W6（体验增强）→ W7（协作+性能）→ W8+（远期能力）。

| 波次 | Issue 文件 | 主题 | 硬依赖 |
|------|------------|------|--------|
| W5 | [editor-w5-issues.md](./editor-w5-issues.md) | 09 交互 MVP + 10 预览 MVP | W4 |
| W6 | [editor-w6-issues.md](./editor-w6-issues.md) | 04/05/06/07/09/10 Phase3–4 增强 | W5 |
| W7 | [editor-w7-issues.md](./editor-w7-issues.md) | 11 协作 MVP + 01 Phase3 性能 | W6 |
| W8+ | [editor-w8-issues.md](./editor-w8-issues.md) | Phase5–7 远期（素材设计器、多人、AI 等） | W7 |

**横切**（各波并行补）：`useKeyboardShortcuts` 与总纲 §七 对齐；右键菜单统一；MCP 与 operations 全集对齐；README 自检回填。

**维护**：改 `design-engine` 后 `pnpm --filter @globallink/design-engine build`。
