> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T5-icon-state
> 对应 schema 字段：project.themeConfig.{iconSpec,stateSpec}

# T5：iconSpec + stateSpec — <项目名>

## 1. iconSpec 推导

> 详细方法见 `methodology/05-icon-state-spec.md` §一。

### 1.1 风格映射查表

aesthetics = `<...>` → 命中行：

| 维度 | 取值 |
|------|:----:|
| style | <outline/solid/duotone/glyph> |
| strokeWidth | <1.5/2.0/2.5> |
| linecap | <round/butt/square> |
| linejoin | <round/miter/bevel> |
| cornerRadius | <0/1/2> |
| complexity | <simple/medium/detailed> |
| geometric | <true/false> |

### 1.2 colors 推导

| 项 | 取值 | 理由 |
|----|------|------|
| default | $token:textSecondary | 标准 |
| active | $token:primary | 标准 |
| inactive | $token:textTertiary | 标准 |
| secondary | $token:primaryLight | duotone 第二层（如非 duotone 仍保留备用）|

[如果是 luxury 或 colorful 等特殊情况，写明 default 用了 primary 等]

### 1.3 sizing 推导

- containerRatio：`<0.5~0.6>` → 理由（complexity 越高比例越大）
- minPadding：`<4/6/8>` → 理由（按一般使用尺寸档）

### 1.4 variants 推导

| 状态 | opacity | 其他 |
|------|:------:|------|
| inactive | 0.5 | color: textTertiary |
| active | 1.0 | strokeWidth +0.3（outline 风格）|
| hover | 0.85 | - |
| disabled | 0.3 | grayscale: <true/false> |

## 2. stateSpec 推导

> 详细方法见 `methodology/05-icon-state-spec.md` §二。

### 2.1 风格映射查表

aesthetics = `<...>` → 命中行：

| 维度 | 取值 |
|------|:----:|
| hover.scale | <1.0/1.02/1.03/1.05> |
| hover.lightnessChange | <"+4%"/"+6%"/"+8%"> |
| hover.shadowChange | <up/same/glow> |
| pressed.scale | 0.98（通用）|
| pressed.lightnessChange | "-8%"（通用）|
| focus.ringWidth | <2px/3px> |
| focus.ringColor | $token:primary |
| focus.ringOpacity | <0.4/0.5> |
| focus.ringOffset | 2px |
| disabled.opacity | <0.3/0.4/0.5> |
| disabled.grayscale | <true/false> |

### 2.2 决策备注

[特殊情况说明，如 brutalist 不缩放、luxury 加 glow shadow 等]

## 3. 替代方案与否决

[考虑过的其他规格组合 + 否决理由]

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP 调两次：先 iconSpec 再 stateSpec（都是深合并）

// 1) theme/set_theme_icon_spec
{
  projectId: "<projectId>",
  iconSpec: {
    style: "outline",
    stroke: { width: 1.5, linecap: "round", linejoin: "round", cornerRadius: 0 },
    colors: {
      default:   "$token:textSecondary",
      active:    "$token:primary",
      inactive:  "$token:textTertiary",
      secondary: "$token:primaryLight"
    },
    sizing: { containerRatio: 0.55, minPadding: 6, strokeCompensation: true },
    variants: {
      inactive: { opacity: 0.6, color: "$token:textTertiary" },
      active:   { opacity: 1.0, strokeWidth: 1.8, color: "$token:primary" },
      hover:    { opacity: 0.85 },
      disabled: { opacity: 0.35, grayscale: true }
    },
    consistency: { targetComplexity: "simple", uniformStrokeWidth: true, geometricOnly: true }
  }
}

// 2) theme/set_theme_state_spec
{
  projectId: "<projectId>",
  stateSpec: {
    hover:    { backgroundLightnessShift: 6,  shadowLevel: "up",   scale: 1.02, transition: "$token:transition-fast" },
    active:   { backgroundLightnessShift: -8, shadowLevel: "down", scale: 0.98, transition: "$token:transition-fast" },
    focus:    { ringColor: "$token:primary", ringWidth: "2px", ringOffset: "2px", animated: false },
    disabled: { opacity: 0.4, removeShadow: true, cursor: "not-allowed", grayscale: true },
    loading:  { opacity: 0.8, spinnerColor: "$token:primary", skeleton: false }
  }
}
```