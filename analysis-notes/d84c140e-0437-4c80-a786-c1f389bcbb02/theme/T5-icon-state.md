> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T5-icon-state
> 对应 schema 字段：project.themeConfig.{iconSpec,stateSpec}

# T5：iconSpec + stateSpec — 校园社交-登录页

## 1. iconSpec 推导

> 详细方法见 `methodology/05-icon-state-spec.md` §一。

### 1.1 风格映射查表

aesthetics = `["minimal", "flat"]` → 两者**所有 iconSpec 维度完全一致**（查表 §一）：

| 维度 | minimal | flat | 最终 | 理由 |
|------|---------|------|------|------|
| style | outline | outline | **outline** | 一致 |
| strokeWidth | 1.5 | 1.5 | **1.5** | 一致；用户原话"极细几何装饰"硬性命中 |
| linecap | round | round | **round** | 一致；柔化线条端点避免锐利感 |
| linejoin | round | round | **round** | 一致 |
| cornerRadius | 0 | 0 | **0** | 一致；保持几何纯净 |
| complexity | simple | simple | **simple** | 一致；登录页只需基础图标（眼睛/勾选/wifi-off 等）|
| geometric | true | true | **true** | 一致；用户"极细几何装饰"硬性锁死 |

### 1.2 colors 推导

| 项 | 取值 | 理由 |
|----|------|------|
| default | `$token:textSecondary` | 标准（次要内容色）|
| active | `$token:primary` | 标准（选中态用品牌色 #5B6CFF）|
| inactive | `$token:textTertiary` | 标准 |
| secondary | `$token:primaryLight` | duotone 第二层备用（本项目 style=outline 不用 duotone，但保留字段）|

**登录页具体图标 color 应用举例**：
- PasswordToggleEye（眼睛）默认 `textSecondary`，hover/聚焦 `primary`
- PolicyCheckbox 勾选 active 用 `primary`，未勾 `textTertiary`
- OfflineBanner 的 WifiOffIcon 用 `error` 直接覆盖（globalOverlay 强提示）

### 1.3 sizing 推导

- **containerRatio = 0.55**：complexity=simple 推荐 0.50，但移动端 44pt 触控热区内图标若太小（0.50×24=12px）会失焦点；取 0.55 中庸
- **minPadding = 6**：登录页图标尺寸主要在 24~32px（中图标），按方法论 6px

### 1.4 variants 推导

| 状态 | opacity | 其他 | 决策理由 |
|------|:------:|------|---------|
| inactive | 0.6 | color: `$token:textTertiary` | 取范围 0.5~0.6 中较高值；登录页图标少，不必降太透明 |
| active | 1.0 | strokeWidth: **1.8**（+0.3）| outline 风格 active 加粗 strokeWidth 是方法论标配 |
| hover | 0.85 | — | 标准；登录页桌面端 hover 反馈（移动端无）|
| disabled | 0.35 | grayscale: **true** | 亮模式下去色（去蓝紫品牌色），保证 disabled 一眼可识 |

## 2. stateSpec 推导

> 详细方法见 `methodology/05-icon-state-spec.md` §二。

### 2.1 风格映射查表

aesthetics = `[minimal, flat]` 两者 stateSpec 有差异，按 §三叠加规则取**冲突时各维度独立最优**：

| 维度 | minimal | flat | 最终 | 理由 |
|------|---------|------|------|------|
| hover.scale | 1.0 | 1.02 | **1.02** | flat 优先；纯 1.0 缺反馈，1.02（放大 2%）刚刚好不浮夸 |
| hover.lightnessChange | +6% | +6% | **"+6%"** | 一致；按钮 hover 时主色亮一档 |
| hover.shadowChange | same | up | **up** | flat 优先；表单卡片 hover 微浮起增加层次（配 T3 soft 弱化阴影）|
| pressed.scale | 0.98（通用）| 0.98（通用）| **0.98** | 物理直觉，不需要风格化 |
| pressed.lightnessChange | "-8%"（通用）| "-8%"（通用）| **"-8%"** | 通用 |
| focus.ringWidth | 2px | 2px | **"2px"** | 一致 |
| focus.ringColor | primary | primary | **`$token:primary`** | 一致；登录页 focus ring 用品牌蓝紫 |
| focus.ringOpacity | 0.4 | 0.4 | **0.4** | 表内默认 |
| focus.ringOffset | 2px | 2px | **"2px"** | 表内默认 |
| disabled.opacity | 0.4 | 0.4 | **0.4** | 通用 |
| disabled.grayscale | true | true | **true** | 亮模式默认去色 |

### 2.2 登录页关键场景应用预演（给下游 design-planner 参考，本任务只写规范）

- **SubmitBtn（登录主 CTA）**：
  - hover：scale 1.02 + bg lightness +6%（#5B6CFF → 接近 #7B89FF primaryHover）+ shadow 升一档
  - pressed：scale 0.98 + bg lightness -8%（接近 #3346FF primaryActive）
  - focus：2px primary ring + 0.4 opacity + 2px offset → ring 颜色 `rgba(91,108,255,0.4)`
  - disabled（policy 未勾 / 表单未填）：opacity 0.4 + grayscale → 灰化 CTA 一眼可识

- **PhoneInput / CredentialInput**：
  - focus：focus.ring（2px primary 0.4） → 输入框聚焦时品牌蓝紫光环，强心理锚定
  - hover（桌面端）：边框 lightness +6%

- **PasswordToggleEye / PolicyCheckbox**：
  - 用 iconSpec.variants 控制 hover/active/disabled

### 2.3 决策备注

- **hover.scale 取 1.02 而非 1.05**：
  - 1.05 偏 playful（方法论查表 playful 才用 1.05）
  - 1.02 既保持反馈又符合 minimal+flat 克制
- **disabled grayscale=true**：
  - 用户群有"研究生应届"对设计敏感人群，disabled 必须一眼可识
  - 亮模式下 grayscale 不会有"颜色不和谐"问题

## 3. 替代方案与否决

| 替代方案 | 否决理由 |
|---------|---------|
| iconSpec.style=solid | 用户"极细几何装饰" → outline 锁死；solid 显得"重" |
| iconSpec.style=duotone | playful 风格才用；本项目 minimal+flat 不需要双层色 |
| iconSpec.complexity=medium | 登录页只用 ≤5 个基础图标，simple 足够 |
| stateSpec.hover.scale=1.05 | playful 才用；本项目避免可爱化 |
| stateSpec.focus.ringOpacity=0.5 | 0.5 偏强；登录页 focus 是日常高频触发，0.4 更克制 |
| stateSpec.disabled.opacity=0.3 | 暗模式才用 0.3；亮模式 0.4 标准 |
| stateSpec.disabled.grayscale=false | 不去色会保留 primary 蓝紫，与 enabled 状态难分；强制 true |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/update（iconSpec/stateSpec 是 ThemeConfig 根级字段）
// 需要先 theme/get 拿完整 ThemeConfig 再 merge 写回，避免清空已落 token
// 实操：仅传 iconSpec + stateSpec 两个根字段 + customized=true，
//      MCP 实现端深合并

{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  iconSpec: {
    style: "outline",
    strokeWidth: 1.5,
    linecap: "round",
    linejoin: "round",
    cornerRadius: 0,
    complexity: "simple",
    geometric: true,
    colors: {
      default:   "$token:textSecondary",
      active:    "$token:primary",
      inactive:  "$token:textTertiary",
      secondary: "$token:primaryLight"
    },
    sizing: { containerRatio: 0.55, minPadding: 6 },
    variants: {
      inactive: { opacity: 0.6, color: "$token:textTertiary" },
      active:   { opacity: 1.0, strokeWidth: 1.8, color: "$token:primary" },
      hover:    { opacity: 0.85 },
      disabled: { opacity: 0.35, grayscale: true }
    }
  },
  stateSpec: {
    hover:    { scale: 1.02, lightnessChange: "+6%", shadowChange: "up" },
    pressed:  { scale: 0.98, lightnessChange: "-8%" },
    focus:    { ringWidth: "2px", ringColor: "$token:primary", ringOpacity: 0.4, ringOffset: "2px" },
    disabled: { opacity: 0.4, grayscale: true }
  }
}
```
