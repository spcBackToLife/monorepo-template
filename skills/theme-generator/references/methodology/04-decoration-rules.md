# 装饰规则（aesthetics → decorationRules 映射）

T4-decoration 任务的方法论。把 T1 提取的 aesthetics 标签映射到 6 类 decorationRules。

## decorationRules 6 类

```
background  策略 → 影响 bgCard / bgElevated 的渲染（纯色 / 渐变 / 玻璃）
border      策略 → 影响节点 border 的默认密度
shadow      策略 → 影响 shadows token 的形态（soft / hard / glow / none）
motion      策略 → 影响动效幅度（minimal / smooth / spring / dramatic）
cornerStyle 风格 → 决定 radii 阶梯（sharp / rounded / pill）
iconStyle   风格 → 影响 iconSpec.style 选择（geometric / organic）
```

## 8 类 aesthetics 完整映射表

| aesthetics | background | border | shadow | motion | cornerStyle | iconStyle |
|-----------|-----------|--------|--------|--------|------------|-----------|
| `glassmorphism` | `glassmorphism` (blur:12, op:0.1) | `subtle` (1px,white 0.2) | `glow` | `smooth` | `rounded` | `geometric` |
| `minimal` | `solid` | `none` 或 `subtle` | `soft` | `minimal` | `rounded` | `geometric` |
| `luxury` | `gradient` (135deg) | `accent` (1px,gold) | `glow` | `smooth` | `rounded` | `organic` |
| `brutalist` | `solid` (高对比) | `accent` (2-3px,black) | `hard` | `minimal` | `sharp` | `geometric` |
| `organic` | `gradient` (柔和) | `none` | `soft` | `spring` | `pill` | `organic` |
| `futuristic` | `gradient` (mesh) | `glow` (neon) | `glow` | `dramatic` | `rounded` | `geometric` |
| `flat` | `solid` | `subtle` | `none` | `smooth` | `rounded` | `geometric` |
| `playful` | `gradient` | `subtle` | `soft` | `spring` | `pill` | `organic` |

## 多标签叠加规则

T1 经常给出 `aesthetics: ["organic", "playful"]` 这样的组合。叠加规则：

```
1. 取标签中"装饰最强烈"的作主基调
   organic + playful → playful 主导（gradient + spring + pill）

2. 冲突时按优先级排序：
   brutalist > futuristic > luxury > glassmorphism > playful > organic > flat > minimal

3. 各维度独立取最优：
   background: 取 gradient/glassmorphism/solid 中能体现叠加美感的
   shadow:     冲突时取 glow > hard > soft > none
   corner:     pill > rounded > sharp（叠加越软越宽容）
   motion:     spring > dramatic > smooth > minimal

4. md 中必须写明"叠加决策推理"
```

### 叠加示例

```
aesthetics = ["organic","playful"]
→ background = gradient（柔和，两者都倾向）
→ border     = subtle（playful 偏 subtle，organic 偏 none，取 subtle 兼容）
→ shadow     = soft（两者都 soft）
→ motion     = spring（两者都 spring）★
→ cornerStyle = pill（两者都 pill）★
→ iconStyle  = organic（两者都 organic）★

最终：playful + organic → 圆滚滚 + 弹弹弹 + 柔色调
```

```
aesthetics = ["luxury","futuristic"]
→ background = gradient（两者都 gradient）★
→ border     = accent + glow（结合：luxury 金边 + futuristic neon）
→ shadow     = glow（两者都 glow）★
→ motion     = smooth → dramatic（futuristic 优先）
→ cornerStyle = rounded（两者都 rounded）
→ iconStyle  = geometric（futuristic 优先）

最终：黑底金线霓虹 + 大段动效 + 中等圆角
```

## 装饰密度（decoration）调节

T1 还会给 `decoration: minimal | moderate | rich`。它影响装饰强度的"用量"：

```
minimal:
  - background: 即使是 gradient 也用极弱（rgba 0.05~0.1 范围）
  - shadow:     全部降一档（md→sm，lg→md）
  - 不渲染 glow

moderate（默认）:
  - 按表格映射原值

rich:
  - background: gradient 加深（0.3~0.5）+ 可叠加 glow
  - shadow:     全部升一档
  - 可加额外装饰（光晕 / 粒子 / 网格）
```

## decorationRules 字段精确定义

```jsonc
decorationRules: {
  background: {
    strategy: "solid" | "gradient" | "glassmorphism",
    // 可选附属（gradient 用）
    gradientAngle: 135,
    gradientStops: [{ color: "$token:primary", offset: 0 }, { color: "$token:secondary", offset: 1 }],
    // 可选（glassmorphism 用）
    blur: 12,
    opacity: 0.1
  },
  border: {
    strategy: "none" | "subtle" | "accent" | "glow",
    width: "1px",
    color: "$token:borderDefault" | "$token:primary" | "..."
  },
  shadow: {
    strategy: "soft" | "hard" | "glow" | "none"
    // 实际值在 tokens.shadows 中根据 strategy 推导
  },
  motion: {
    strategy: "minimal" | "smooth" | "spring" | "dramatic"
    // 实际值在 tokens.durations + easings 中
  },
  cornerStyle: "sharp" | "rounded" | "pill",
  iconStyle:   "geometric" | "organic"
}
```

## 沉淀到 schema

```jsonc
// MCP: theme/set_decoration
theme/set_decoration {
  projectId,
  decorationRules: {
    background: { strategy: "gradient", gradientAngle: 135,
                   gradientStops: [
                     { color: "$token:primaryLight", offset: 0 },
                     { color: "$token:bgCard", offset: 1 }
                   ] },
    border:     { strategy: "subtle", width: "1px", color: "$token:borderDefault" },
    shadow:     { strategy: "soft" },
    motion:     { strategy: "spring" },
    cornerStyle: "pill",
    iconStyle:   "organic"
  }
}
```

完整字段映射见 `../schema-spec/theme-config.md` §3。
