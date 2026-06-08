> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T0-scaffold
> 对应 schema 字段：project.themeConfig.themes[].id / project.themeConfig.activeThemeId

# T0：主题脚手架 — <项目名>

## 1. 输入

- `project.meta.styleDirection.summary`（product 阶段已写）
- 当前 `theme/get { projectId }` 返回的 ThemeConfig

## 2. 决策：写到哪个 themeId？

回答以下三个问题：

| 问题 | 选择 |
|------|------|
| Q1 项目首次定制主题？ | A: 是 / B: 否（局部微调） |
| Q2 当前 active 主题（default）能装下用户的诉求？ | A: 能（→ 改 default） / B: 不能（→ 新建主题） |
| Q3 是否要做营销/节日切换？ | A: 否（→ 仅 default） / B: 是（→ 新建节日主题） |

### 决策矩阵

| Q1 | Q2 | Q3 | 决策 | themeId |
|----|----|----|------|--------|
| 是 | A | 否 | **改 default**（最常见）| `default` |
| 是 | B | 否 | 新建主题（用户风格强烈不同于默认）| 用户取名 |
| 是 | * | 是 | 同时改 default + 新建节日主题 | 两个 |
| 否 | * | 是 | 仅新建节日主题 | 用户取名 |
| 否 | * | 否 | 微调 default | `default` |

## 3. 命名约定

- themeId：`kebab-case`，语义化
  - 默认：`default`
  - 节日：`spring-festival`, `mid-autumn`, `christmas`
  - 营销：`black-friday`, `summer-sale`
  - 子品牌：`brand-x`, `brand-y`
- name：用户可见的展示名（中文 OK），如 "品牌默认 / 春节红 / 黑五狂欢"

## 4. 关键决策

- 决策 1：本次落到 themeId = `<...>`
- 决策 2：是否新建（true → 调 scaffold_theme；false → 默认写 active）
- 决策 3：activate（true → 立刻切到新主题）

---

## ★ 沉淀到 schema 的结论

### 情形 A：写 default 主题（最常见）

```
不调用 MCP。仅在 md 中记录决策："本次 T1~T6 都默认写 active=default 主题。"
（MCP 的所有 set_theme_* 不传 themeId 即写 active）
```

### 情形 B：新建主题（如节日红）

```jsonc
// MCP: theme/scaffold_theme
{
  projectId: "<projectId>",
  themeId:   "spring-festival",
  name:      "春节红",
  description: "节日营销主题，主色由蓝紫切换为中国红",
  copyFrom:  "default",            // 不传 = 用内置 DEFAULT；传了 = 复制现有主题骨架
  activate:  true                  // 立刻切到新主题，后续 T1~T6 写它
}
```

调用后 `customized=true` 自动置；后续所有 set_theme_* 写到新主题。

### 验证

```
theme/get  → 看 themes[] 是否包含新主题 / activeThemeId 是否符合预期
```
