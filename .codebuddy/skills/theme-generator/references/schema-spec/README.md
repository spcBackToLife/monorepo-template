# theme-generator schema-spec 索引

| 文件 | 内容 | 何时必读 |
|------|------|---------|
| `theme-config.md` ★ | ThemeConfig 完整字段清单（intent / tokens / decorationRules / iconSpec / stateSpec / themes）+ 红线（R-THEME-01~07）+ MCP action 速查 | 任意 T1~T7 落 schema 前必读 |
| `forbidden-fields.md` | 严禁本阶段写的字段（节点级 / 屏级 / 项目级非 themeConfig）| 任何时刻发现想写非法字段时必读 |

## 核心原则

1. **theme-generator 只写 `project.themeConfig`**——其他全部禁止
2. **每次落 schema 前查 theme-config.md** 对应小节确认字段拼写
3. **越界欲望出现 → 退到 SKILL.md §5.3** 看边界表，把需求转换为 themeConfig 字段（如"按钮 hover 颜色"→ stateSpec.hover.lightnessChange）
