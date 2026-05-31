# Schema 字段规范（按需加载）

精确到字段名的写入清单。SKILL.md 主体只列 MCP 工具与边界，具体字段映射查这里。

## 文件清单

| 文件 | 内容 |
|------|------|
| `project-meta.md` | 项目级（DesignProject / ProjectMeta）所有字段 + MCP 调用 |
| `screen-meta.md` | 屏幕级（Screen / ScreenMeta）所有字段 + MCP 调用 |
| `node-skeleton.md` | 节点骨架规范（建什么 / 不建什么、primitive 选择、命名） |
| `state-and-datasource.md` | stateInit + dataSources 占位声明详细规范（含 typeDef） |
| `global-concerns.md` | 5 类全局态识别 + globalStateInit + globalOverlays 完整样板 |
| `forbidden-fields.md` | 严禁本阶段写的字段（边界表，对应下游分工） |
