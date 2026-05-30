# 风格意图提取（7 维度）

T1-intent 任务的核心方法论。把用户自然语言风格描述转成结构化的 7 维度信息，喂给后续色彩/装饰推导。

## 7 维度速查

| 维度 | 取值 | 示例提取 |
|------|------|---------|
| `summary` | 一句话风格定性（≤30 字）| "青春治愈+学院温暖（草莓粉/薄荷绿/奶油黄）" |
| `aesthetics` | 风格标签数组（多选，可叠加）| `["organic","playful"]` |
| `decoration` | 装饰密度 | `minimal` / `moderate` / `rich` |
| `colorTemperature` | 色温 | `warm` / `neutral` / `cool` |
| `brightness` | 明暗倾向 | `light` / `dark` / `both` |
| `seedColors` | 种子色（hex 数组）| `["#FF6F91"]` |
| `references` | 参考品牌（数组，可空）| `["Notion","Linear"]` 或 `[]` |

## aesthetics 8 类标签全集

> 每个标签都对应一组 decorationRules（详见 `04-decoration-rules.md`）。可叠加 1~3 个。

| 标签 | 关键词触发 | 视觉特征 |
|------|----------|---------|
| `glassmorphism` | 玻璃 / 毛玻璃 / 透明感 / 苹果风 / iOS | 半透明背景 + backdrop-filter blur + 细边 |
| `minimal` | 极简 / 性冷淡 / 北欧 / Notion / 纯净 | 大量留白 + 单色 + 弱装饰 |
| `luxury` | 轻奢 / 高端 / 奢华 / 金色 / 香槟 | 深底 + 金色点缀 + glow + gradient |
| `brutalist` | 粗野 / 重金属 / 朋克 / 高对比 | 黑白主导 + 厚边框 + sharp 圆角 |
| `organic` | 自然 / 治愈 / 柔和 / 圆润 / 童趣 | 圆角偏 pill + gradient 柔和 + spring 动效 |
| `futuristic` | 科技 / 赛博 / 未来 / 霓虹 / 黑客 | 暗底 + neon glow + mesh gradient |
| `flat` | 扁平 / Material / 标准 / 通用 | 纯色块 + 弱阴影 + 中等圆角 |
| `playful` | 活泼 / 萌 / 可爱 / 童趣 / 儿童 | 多彩 + 大圆角 + 弹簧动效 + 表情符号亲和 |

## 关键词 → 维度映射（提取参考）

```
"科技/未来/赛博"     → futuristic + cool + dark + decoration:rich
"治愈/温暖/校园"     → organic + playful + warm + light + decoration:moderate
"轻奢/高端/商务"     → luxury + neutral + dark + decoration:rich
"极简/Notion/性冷淡" → minimal + neutral + light + decoration:minimal
"儿童/萌/可爱"       → playful + warm + light + decoration:rich
"专业/医疗/金融"     → flat / minimal + cool + light + decoration:minimal
```

## seedColor 推导（用户没给颜色时）

```
没给色但说了关键词：
- "电光蓝/科技蓝/赛博"     → #4A6CF7 / #00D4FF
- "薄荷/治愈/学院"         → #00C896（薄荷主） + #FF6F91（草莓辅）
- "金色/奢华/香槟"         → #D4A55A
- "深空/暗黑/黑客"         → primary 取低亮度色
- "粉色/少女/童趣"         → #FF6F91 / #FFC1CC
- "森林/自然/绿野"         → #2E8B57

没给色也没说关键词：
- 默认用 #4A6CF7（中性蓝紫，最广覆盖）
- 在 md 中明确标注"用户未给色，AI 默认推断"
```

## brightness 决策（影响后续 T6-variants）

```
brightness=light  → base 主题用亮色，dark 仅作可访问性兜底
brightness=dark   → base 主题用暗色，light 仅作可访问性兜底
brightness=both   → 同时输出 light + dark 两套等权变体
```

**默认值**：用户没说 → `both`（最稳）。

## 反例：禁止的提取方式

❌ 把"现代化/高效"硬塞进 aesthetics → 这些不是风格标签，是空洞形容词，需追问或忽略
❌ aesthetics 给 5 个以上 → 风格不聚焦，下游装饰冲突
❌ seedColors 给一组色板（如完整 5 色）→ 那是 T2 的产物，T1 只取 1~2 个种子

## 沉淀到 schema

```jsonc
// MCP: theme/set_intent
theme/set_intent {
  projectId,
  intent: {
    summary:          "<≤30 字一句话定性>",
    aesthetics:       ["organic","playful"],   // 1~3 个
    decoration:       "moderate",
    colorTemperature: "warm",
    brightness:       "light",
    seedColors:       ["#FF6F91"],              // 1~2 个种子色
    references:       []                        // 用户给了就填，没给空数组
  }
}
```

完整字段映射见 `../schema-spec/theme-config.md` §1。
