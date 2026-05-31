> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T4-decoration
> 对应 schema 字段：project.themeConfig.decorationRules

# T4：装饰规则（aesthetics 映射）— <项目名>

## 1. 输入：T1 提取的 aesthetics 标签

- aesthetics：`["organic", "playful"]`
- decoration：`moderate`

## 2. 单标签映射查表

> 详细映射见 `methodology/04-decoration-rules.md` §二。

### organic

| 维度 | 取值 |
|------|------|
| background | gradient（柔和）|
| border | none |
| shadow | soft |
| motion | spring |
| cornerStyle | pill |
| iconStyle | organic |

### playful

| 维度 | 取值 |
|------|------|
| background | gradient |
| border | subtle |
| shadow | soft |
| motion | spring |
| cornerStyle | pill |
| iconStyle | organic |

## 3. 多标签叠加决策

> 详细规则见 `methodology/04-decoration-rules.md` §三。

| 维度 | organic | playful | 最终取值 | 理由 |
|------|--------|--------|---------|------|
| background | gradient（柔和）| gradient | **gradient（柔和）** | 两者一致 |
| border | none | subtle | **subtle** | playful 偏 subtle 兼容 |
| shadow | soft | soft | **soft** | 两者一致 |
| motion | spring | spring | **spring** | 两者一致 |
| cornerStyle | pill | pill | **pill** | 两者一致 |
| iconStyle | organic | organic | **organic** | 两者一致 |

## 4. decoration 密度调节

decoration = `moderate` → 按表格映射原值，不升不降。

[如果是 minimal/rich，写明每个维度被怎么调节]

## 5. 渐变细节（若 background = gradient）

- 角度：`135deg`（标准对角线）
- 起止色：
  - 起：`$token:primaryLight`（offset 0）
  - 止：`$token:bgCard`（offset 1）
- 强度：moderate → 渐变范围正常；rich → 起止对比加大

## 6. 替代方案与否决

[如果考虑过其他装饰组合但否决，列出来]

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/set_theme_decoration（深合并；写当前 active 主题）
{
  projectId: "<projectId>",
  decorationRules: {
    background: {
      strategy: "gradient",
      gradient: { direction: "135deg", type: "linear" }
    },
    border:      { strategy: "subtle", width: "1px" },
    shadow:      { strategy: "soft" },
    motion:      { strategy: "spring", easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    cornerStyle: "pill",
    iconStyle:   "outline"
  }
}
```

**回头一致性 check**：调用前后跑一遍 T3 的 radii 阶梯，确保和 cornerStyle 匹配（pill→大圆角阶梯）。