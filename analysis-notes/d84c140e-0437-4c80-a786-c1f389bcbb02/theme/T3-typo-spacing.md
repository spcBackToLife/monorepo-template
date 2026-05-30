> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T3-typo-spacing
> 对应 schema 字段：project.themeConfig.tokens.{typography,spacing,radii,shadows,durations,easings}

# T3：字体 / 间距 / 圆角 / 阴影 / 动效 — 校园社交-登录页

## 1. 字体

> 方法见 `methodology/03-typography-spacing.md` §二。

### 1.1 字体栈

- **主字体栈**：`-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
  - 理由：移动端中文项目，苹方/微软雅黑 fallback 必备；不引入 Web 字体（登录页性能优先，避免首屏字体闪烁 FOUT）
- **等宽字体栈**：`ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`
  - 用于：手机号 11 位输入预览 / 验证码倒计时 "60s" 数字 / 验证码输入

**否决方案**：
- ❌ Inter（example 用的）→ 本项目中文为主，Inter 是西文专精，中文字面会回落到系统字体，不如直接 PingFang SC 一致性更好
- ❌ Web 字体（如思源黑体）→ 登录首屏 50KB+ 加载阻塞，违反"简约时尚"中"快"的隐含期待

### 1.2 字号阶梯（Modular Scale 1.25，R-THEME-05）

| 名称 | 值 | scale 算式 | 偏离率 | 登录页用途 |
|------|:--:|-----------|:------:|------------|
| caption | 12 | base/1.17 | 0% | 错误提示 / 协议小字 |
| body | 14 | base | - | 标签 / 链接 |
| bodyLg | 16 | base × 1.14 | 0% | 输入框文字 / 主按钮文字 |
| h5 | 18 | base × 1.25^1 = 17.5 | +2.9% | — |
| h4 | 20 | base × 1.25^1.5 ≈ 19.6 | +2.0% | — |
| h3 | 24 | base × 1.25^2.3 | 0% | 品牌标语 |
| h2 | 28 | base × 1.25^2.8 | 0% | — |
| h1 | 36 | base × 1.25^3.5 | 0% | — |
| display | 48 | base × 1.25^4.5 | 0% | 品牌强调字（用户原话"大字号品牌强调字"）|

**全部偏离率 ≤ ±5%（R-THEME-05）✓**

### 1.3 字重

| 名称 | 值 | 登录页用途 |
|------|:--:|------------|
| regular | 400 | 输入框默认 / 协议正文 / 链接 |
| medium | 500 | 输入框 label / 错误提示加重 |
| semibold | 600 | 登录主 CTA 按钮 / 模式切换按钮 |
| bold | 700 | display / 品牌强调字 |

**为什么主按钮选 semibold(600) 不选 bold(700)**：bold 在 PingFang SC 字面偏粗有"重口味"感，与 minimal 不符；600 兼顾点击重要性与克制。

### 1.4 行高

| 名称 | 值 | 用于哪些字号 |
|------|:--:|------------|
| tight | 1.2 | display(48) / 品牌强调字 |
| normal | 1.5 | body(14) / bodyLg(16) / 多数场景 |
| relaxed | 1.7 | 协议长文案行内（如果换行）|

## 2. 间距（8px 网格，R-THEME-04）

| 名称 | 值（px）| 8 倍数 | 登录页用途示例 |
|------|:--:|:----:|---------------|
| 2xs | 2 | ✓ (0.25) | input focus ring offset |
| xs | 4 | ✓ (0.5) | icon-text 间距 / 错误提示与输入框间隙 |
| sm | 8 | ✓ | 按钮内边距 / 标签与输入框间距 |
| md | 16 | ✓ | 输入框内边距 / 表单字段间垂直间距 |
| lg | 24 | ✓ | 表单卡片内边距 / 主按钮上下间距 |
| xl | 32 | ✓ | 屏幕主区块间距（HeaderArea / FormCard / FooterLinks）|
| 2xl | 48 | ✓ | 顶部品牌区上下留白 |
| 3xl | 64 | ✓ | 极端留白（落地式 Hero）|

**全部 4 倍数 ✓ → R-THEME-04 通过**

## 3. 圆角（cornerStyle = rounded）

> cornerStyle 决策属 T4，但因 T3 必须落 radii token，**本任务先按 minimal+flat 推断采用 `rounded`**，T4 验证。
>
> 用户 styleDirection 原话「**圆角输入框**」→ 排除 sharp；排斥"卡通插画" → 排除 pill 过度圆润；**rounded 命中**。

| 名称 | 值（px）| 登录页用途 |
|------|:--:|------------|
| none | 0 | — |
| sm | 4 | 错误提示框 / 小标签 |
| md | 8 | 输入框（用户"圆角输入框"主用）|
| lg | 12 | 登录主 CTA 按钮 |
| xl | 16 | 表单卡片（如未来加边框）|
| full | 9999 | 品牌 Logo 圆形容器 / 头像 |

## 4. 阴影（shadow strategy = soft，弱化版）

> 决策同 §3，T4 验证。minimal+flat 通常取 none，但**登录页表单卡片需要"卡片感"建立信任**——决策保留 soft 但**用最弱档**。

| 名称 | 值 | 用途 |
|------|---|------|
| sm | `0 1px 3px rgba(0,0,0,0.04)` | 卡片基础阴影（比标准 soft 减半）|
| md | `0 4px 12px rgba(0,0,0,0.06)` | hover/focus 状态轻浮起 |
| lg | `0 8px 24px rgba(0,0,0,0.10)` | 模态弹层 |
| xl | `0 12px 48px rgba(0,0,0,0.14)` | 全屏遮罩弹起元素 |

### 配方调整理由

- **不取 none**：登录页 FormCard 在白底（bgPage=#FCFCFD）上无阴影会"漂浮无依"，用户输手机号时缺乏聚焦感
- **不取标准 soft**（0.06/0.08/0.12/0.16）：会显得"质感太重"，违反 minimal 克制原则
- **取 0.04/0.06/0.10/0.14 弱化版**：在 minimal 与"卡片可见性"之间折中——肉眼隐约可见但绝不喧宾夺主
- **不取 glow（蓝紫光晕）**：用户"避开浓郁渐变"，glow 走极端会显得 futuristic

## 5. 动效

### 5.1 durations（毫秒）

| 名称 | 值（ms）| 登录页用途 |
|------|:------:|------------|
| instant | 100 | hover / focus 微反馈 |
| fast | 200 | 按钮按下 / 模式切换 Tab |
| medium | 300 | 错误提示淡入 / 协议弹窗 |
| slow | 500 | 屏切换（登录成功→主屏 fade）|

### 5.2 easings

| 名称 | 值 | 登录页主用 |
|------|---|----------|
| ease | cubic-bezier(0.4, 0, 0.2, 1) | 通用过渡 |
| easeIn | cubic-bezier(0.4, 0, 1, 1) | 进入退场（少用）|
| easeOut | cubic-bezier(0, 0, 0.2, 1) | **错误提示淡入 / 按钮按下回弹** ✓ |
| easeInOut | cubic-bezier(0.4, 0, 0.6, 1) | Tab 切换 |
| spring | cubic-bezier(0.34, 1.56, 0.64, 1) | 备用（本项目 minimal 不用，避免"萌"感）|

### 5.3 风格偏好备注

> 给 design-planner / interaction-designer 参考。

- **minimal + flat 主用 ease / easeOut**，duration 偏 instant/fast
- **spring 留空但不删**——某些品牌 Logo 进场动画或可少量使用，由 design 阶段判断；登录页主流程**禁用 spring**（避免可爱感）
- **不使用浮夸长动效**（slow 500ms 限定屏切换场景）

## 6. 关键假设与决策汇总

- **假设 1**（字体）：移动端中文项目 → PingFang SC 作主体，不引 Web 字体，登录页性能优先
- **假设 2**（display 用途）：用户"大字号品牌强调字"对应 display(48px) → 给 BrandLogo 区域用，design 阶段不得用更大字号
- **假设 3**（cornerStyle）：T4 尚未做，先按 minimal+flat 推断 rounded；用户"圆角输入框"原话锁死 → 非 sharp 非 pill
- **假设 4**（shadow 弱化）：登录页表单卡片需要 soft 阴影（信任感），但 minimal 风格用弱化版（0.04 起步而非 0.06）
- **假设 5**（spring 保留但不用）：spring 留在 token 里供未来扩展，但本项目登录页禁用，避免可爱化

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/update_tokens（typography/spacing/radii/shadows/durations/easings 全部深合并）
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  tokens: {
    typography: {
      fontFamily:     "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
      fontFamilyMono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
      fontSize: {
        caption: 12, body: 14, bodyLg: 16,
        h5: 18, h4: 20, h3: 24, h2: 28, h1: 36, display: 48
      },
      fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 }
    },
    spacing: { "2xs": 2, "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32, "2xl": 48, "3xl": 64 },
    radii:   { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    shadows: {
      sm: "0 1px 3px rgba(0,0,0,0.04)",
      md: "0 4px 12px rgba(0,0,0,0.06)",
      lg: "0 8px 24px rgba(0,0,0,0.10)",
      xl: "0 12px 48px rgba(0,0,0,0.14)"
    },
    durations: { instant: 100, fast: 200, medium: 300, slow: 500 },
    easings: {
      ease:      "cubic-bezier(0.4, 0, 0.2, 1)",
      easeIn:    "cubic-bezier(0.4, 0, 1, 1)",
      easeOut:   "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.6, 1)",
      spring:    "cubic-bezier(0.34, 1.56, 0.64, 1)"
    }
  }
}
```
