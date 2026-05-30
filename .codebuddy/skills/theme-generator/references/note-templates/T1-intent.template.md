> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T1-intent
> 对应 schema 字段：project.themeConfig.intent

# T1：风格意图提取 — <项目名>

## 1. 用户原始描述

[把用户给的风格描述原话引用一下，便于追溯]
[如有多次对话，把所有相关风格描述拼起来]

## 2. 7 维度结构化提取

> 详细方法见 `methodology/01-intent-extraction.md`。

### 2.1 summary（一句话定性，≤30 字）

[一句话风格定性。例：青春治愈+学院温暖（草莓粉/薄荷绿/奶油黄）]

### 2.2 aesthetics（1~3 个标签）

| 标签 | 提取证据（用户原话哪里命中）|
|------|---------------------------|
| `xxx` | "用户说 ... 命中 xxx 标签的 yyy 关键词" |
| `xxx` | "..." |

### 2.3 decoration（装饰密度）

- 取值：`minimal` / `moderate` / `rich`
- 理由：[根据用户描述的"简洁/适中/丰富"映射]

### 2.4 colorTemperature（色温）

- 取值：`warm` / `neutral` / `cool`
- 理由：[根据 aesthetics 和用户提到的色彩词推断]

### 2.5 brightness（明暗倾向）

- 取值：`light` / `dark` / `both`
- 理由：[用户明确说了 / 默认 both 兜底]

### 2.6 seedColors（种子色，1~2 个）

| 色号 | 来源 | 理由 |
|------|------|------|
| `#XXXXXX` | 用户给/AI 推断 | [HSL 三元组 + 选这个色的依据] |

### 2.7 references（参考品牌）

- [用户给的列表，没给则空数组 + 注明 AI 默认推断]

## 3. 候选标签穷举与否决

> 即使最终只取 1~3 个 aesthetics 标签，也要在这里穷举考虑过的其他标签 + 否决理由。

| 候选标签 | 是否选用 | 理由 |
|---------|--------|------|
| glassmorphism | ❌ | 用户没提"透明/毛玻璃" |
| minimal | ✓ | "简洁干净" 命中 |
| luxury | ❌ | 用户偏 toC 校园场景，不需要奢华感 |
| ... | | |

## 4. 多角度验证

| 维度 | 结论 |
|------|------|
| 用户角度 | [目标用户群体看到这套风格的反应] |
| 品牌角度 | [是否能体现产品定位的差异化] |
| 技术角度 | [是否有实施风险，如 glassmorphism 在低端机型可能掉帧] |
| 竞品角度 | [对标产品用什么风格，区分度在哪] |

## 5. 关键决策与假设

[列出本任务做的关键判断，特别是"用户没明说但 AI 主动假设"的部分]

- 假设 1：用户没说明暗 → 默认取 `both`
- 假设 2：seedColor 在 #FF6F91 与 #FF8FA3 之间选了前者，因为 ...
- ...

## 6. 替代方案

[如果用户后续不满意，备选方向是什么]

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/set_theme_intent（写到当前 active 主题；多主题场景显式传 themeId）
{
  projectId: "<projectId>",
  summary:          "青春治愈+学院温暖（草莓粉/薄荷绿/奶油黄）",
  aesthetics:       ["organic", "playful"],
  decoration:       "moderate",
  colorTemperature: "warm",
  brightness:       "light",
  seedColors:       ["#FF6F91"],
  references:       []
}
```

**调用后 customized 自动置 true**。所有字段都是可选的，深合并不传不删。
