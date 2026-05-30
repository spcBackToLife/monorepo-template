# Token 命名表（认知友好别名 ↔ schema 真理名）

> 真理之源：`features/design-schema/src/types/theme.ts` 的 `ColorTokenGroup` interface。
> 技能内部 md 推理时可用别名（更易懂），**落 schema 前 MCP `set_theme_tokens` 自动映射**到真理名。

## 1. 颜色 token

| 真理名（schema 写入）| 认知别名（md 讨论可用）| 用途 |
|----|----|----|
| **品牌色** | | |
| primary | — | 主色（品牌色）|
| primaryHover | — | 主色 hover 态 |
| primaryActive | — | 主色按下态 |
| primaryLight | — | 主色浅底（chip / tag 背景）|
| secondary | `accent` | 辅色 / 强调色 |
| secondaryHover | — | |
| secondaryActive | — | |
| **表面色** | | |
| background | `bgPage` | 页面底色 |
| surface | `bgCard` | 卡片表面 |
| surfaceElevated | `bgElevated` | 弹层 / Modal |
| overlay | — | 遮罩层 |
| **文字色** | | |
| textPrimary | — | 正文 |
| textSecondary | — | 辅助 |
| textTertiary | — | 占位符 |
| textInverse | — | 主色按钮上的反色文字 |
| **边框色** | | |
| border | `borderDefault` | 默认边框 |
| borderLight | `divider` | 分割线 |
| borderFocus | `borderStrong` | 聚焦边框 / 强对比 |
| **状态色** | | |
| success | — | 成功 |
| warning | — | 警告 |
| error | — | 错误 |
| info | — | 信息 |
| **中性灰阶（可选但推荐）** | | |
| gray100 ~ gray900 | — | 9 级灰阶 |

**14 个必备语义色（R-THEME-02）**：

```
primary, secondary, success, warning, error, info,
background, surface,
textPrimary, textSecondary, textTertiary,
border, borderLight
```

## 2. 字体 token

| 真理名 | 认知别名 | 用途 |
|----|----|----|
| caption | — | 12px 辅助文字 |
| body | — | 14px 正文 |
| **body-lg** | `bodyLg` | 16px 大正文 |
| h5 / h4 / h3 / h2 / h1 / display | — | 标题阶梯 |

注意：MCP 自动 `bodyLg → body-lg`。

## 3. 间距 / 圆角 / 阴影 / 动效

字段名无别名，直接用：

```
spacing:     2xs, xs, sm, md, lg, xl, 2xl, 3xl
radius:      none, sm, md, lg, xl, full
shadows:     sm, md, lg, xl
transitions: fast, normal, slow
```

## 4. 使用规则

- **写 md 推理过程**：可以用别名，比如「bgPage 用 #FCFCFD（亮色带极轻偏色）」
- **写 ★ 沉淀到 schema 段**：建议**直接用真理名**避免歧义
- **MCP set_theme_tokens 调用**：传别名 OK（自动映射），但 schema 内部存的就是真理名
- **resolveTokens 引用**：`$token:background` 而不是 `$token:bgPage`（引用必须用真理名）

## 5. 反例

❌ 在 schema 里写 `tokens.colors.bgPage = ...`——MCP 自动会映射，但如果直接走 PUT API 旁路就会出错。
❌ 在节点样式里写 `$token:bgPage`——resolveTokens 不会做别名映射，找不到 token 原样输出。
✅ 节点样式写 `$token:background`——稳。
