# schema-spec：node.styles 全量样式规范

> 适用任务：`D-X-styles`、`D-system-baseline`、`D-token-coverage`、`D-global-overlay-styles`
> 这是 design 阶段的核心产物——styles 必须**一次到位 + 全 $token: 引用**。

## 1. 完整样式维度清单（一次到位）

每个节点的 styles **必须覆盖以下维度**（按需，不全量是错的；不需要的留空但不能"待补"）：

### 布局
```
display, flexDirection, alignItems, justifyContent, flexWrap, gap,
flex, flexGrow, flexShrink, flexBasis,
gridTemplate*, gridArea, gridGap (按需用 grid)
```

### 尺寸
```
width, height
minWidth, minHeight, maxWidth, maxHeight
aspectRatio
```

### 间距
```
padding, paddingTop/Right/Bottom/Left
margin, marginTop/Right/Bottom/Left
```

### 定位
```
position, top, right, bottom, left, zIndex
```

### 排版（文字节点必备）
```
fontFamily, fontSize, fontWeight, lineHeight, letterSpacing,
color, textAlign, textTransform, textDecoration,
whiteSpace, overflow, textOverflow
```

### 颜色
```
backgroundColor, color, borderColor
opacity
```

### 形状
```
borderRadius, borderRadiusTopLeft/... (按需)
border, borderWidth, borderStyle, borderColor
borderTop/Right/Bottom/Left (按需)
```

### 阴影
```
boxShadow (容器 / 卡片必备)
filter (如 drop-shadow)
backdropFilter (毛玻璃)
```

### 渐变 / 背景
```
background (复杂渐变)
backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat
```

### 过渡 / 动效（交互节点必备）
```
transition (不许"瞬间跳变")
transform (translateY / scale / rotate)
animation
```

### 其他
```
overflow, cursor, pointerEvents (装饰节点必填 none),
userSelect, willChange
```

## 2. $token: 引用规则

> 语法契约的**唯一真理之源** = `features/design-engine/src/styles/resolveTokens.ts`
> 测试锁定：`features/design-engine/src/styles/__tests__/resolveTokens.test.ts`
> ⚠️ 本节所有引用形式都已被单测覆盖；偏离必然渲染失败。

### 2.1 必须用 token —— 引用形式表

| 类别 | 推荐 dot 形式（与 ThemeConfig 嵌套一致） | 等价 dash 形式（短写） | 例 |
|------|-----------------------------------|------------------------|----|
| 颜色 | `$token:colors.<name>` | `$token:<name>` | `"$token:colors.primary"` |
| 间距 | `$token:spacing.<name>` | `$token:spacing-<name>` | `"$token:spacing.md"` |
| 圆角 | `$token:radius.<name>` | `$token:radius-<name>` | `"$token:radius.lg"` / `"$token:radius.full"` |
| 阴影 | `$token:shadows.<name>` | `$token:shadow-<name>` | `"$token:shadows.md"` |
| 动效（整段 transition 字符串）| `$token:transitions.<name>` 或 `$token:transitions.<name>.value` | `$token:transition-<name>` | `"$token:transitions.normal"` |
| 字号 | `$token:typography.<key>.fontSize` | `$token:font-<key>.fontSize` | `"$token:typography.body.fontSize"` |
| 字重 | `$token:typography.<key>.fontWeight` | `$token:font-<key>.fontWeight` | `"$token:typography.body.fontWeight"` |
| 行高 | `$token:typography.<key>.lineHeight` | `$token:font-<key>.lineHeight` | `"$token:typography.h2.lineHeight"` |
| 字族 | `$token:typography.<key>.fontFamily` | `$token:font-<key>.fontFamily` | `"$token:typography.body.fontFamily"` |
| 字距 | `$token:typography.<key>.letterSpacing` | `$token:font-<key>.letterSpacing` | `"$token:typography.h1.letterSpacing"` |

> **推荐 dot 写法**：与 ThemeConfig 嵌套结构一一对应，认知负担最小。dash 形式是历史等价语法，新代码请用 dot。

### 2.2 关键契约（理解了就不会写错）

#### 字体是"打包预设"，不是"独立维度"

ThemeConfig 中 `typography` 不是横切维度（fontSize/fontWeight/lineHeight 各自独立可选），而是一组**完整预设**：

```ts
typography: {
  body:    { fontSize: "14px", fontWeight: "400", lineHeight: "1.5", fontFamily: "system-ui" },
  body-lg: { fontSize: "16px", fontWeight: "400", lineHeight: "1.5", ... },
  h1:      { fontSize: "32px", fontWeight: "700", lineHeight: "1.25", ... },
  h2:      { fontSize: "24px", fontWeight: "600", lineHeight: "1.3",  ... },
  ...
}
```

设计时**先选预设**（如 body / h1 / button-label），再引子属性：

```jsonc
// ✅ 正确
fontSize:   "$token:typography.body.fontSize"      // 用 body 预设的 fontSize
fontWeight: "$token:typography.body.fontWeight"    // 用 body 预设的 fontWeight
lineHeight: "$token:typography.body.lineHeight"    // 用 body 预设的 lineHeight

// ❌ 错（schema 里根本没 typography.fontSize / typography.fontWeight 这一层）
fontSize:   "$token:typography.fontSize.body"
fontWeight: "$token:typography.fontWeight.semibold"
lineHeight: "$token:typography.lineHeight.tight"

// ❌ 也错（自由拆装：把 weight / lineHeight 当独立 token 引）
fontWeight: "$token:typography.semibold.fontWeight"  // semibold 不是 typography 预设的 key
lineHeight: "$token:typography.tight.lineHeight"     // tight 不是 typography 预设的 key
```

> 想要 "semibold 字重 + tight 行高 + body 字号" 这种自由组合？这是 **theme-generator 的责任**——
> 退回上游让它新增一个打包好的 typography 预设（如 `button` / `body-bold` / `h3-tight`），
> 然后引 `$token:typography.button.fontWeight` 等。
> design 阶段不能自由拆装 typography 子属性，只能 **选预设 + 引子属性**。

#### transition 是"整段字符串"，不是"时长 + 缓动"

ThemeConfig 中 `transitions.<key>.value` **已经包含完整的 `属性 时长 缓动` 字符串**：

```ts
transitions: {
  fast:   { value: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)", durationMs: 150 },
  normal: { value: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)", durationMs: 250 },
  slow:   { value: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)", durationMs: 400 },
}
```

`$token:transitions.fast` 直接展开为整段字符串，不需要再拼缓动：

```jsonc
// ✅ 正确（一个 token 顶完整 transition）
transition: "$token:transitions.fast"
transition: "$token:transitions.normal.value"          // 显式 .value 也合法（自动剥）

// ❌ 错（schema 没有 durations / easings 这两个 group）
transition: "all $token:durations.medium $token:easings.spring"
transition: "border-color $token:durations.fast $token:easings.ease"
```

> 真要"针对某个属性的 transition"（如只过渡 `background-color`）？
> 由 theme-generator 多打几条预设（如 `transitions.color-fast` `transitions.transform-spring`），
> 然后引用 `$token:transitions.color-fast`。

### 2.3 例外（不强制 token，但计入 100% 覆盖率）

- CSS 关键字：`auto` / `0` / `transparent` / `none` / `inherit` / `unset` / `initial`
- 数字 `0`（如 padding: 0）
- 安全区域：`env(safe-area-inset-*)` / `calc(env() + ...)`
- 派生展示节点 minimal-debug 兜底色（v2.5）：仅 `color: "#ef4444"` 等 7 属性（详见 forbidden-fields-design.md）
- 装饰节点的渐变百分比（如 `"radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)"` 中的 `0%` `70%`）
- `1px` / `2px`（边框宽度）

### 2.4 复合值组合

```jsonc
// 多 token 拼空格（间距、boxShadow 多层、border 简写等）
padding: "$token:spacing.sm $token:spacing.md"               // → "8px 16px"
boxShadow: "0 0 0 3px $token:colors.primaryLight"            // 单层 outline
boxShadow: "$token:shadows.sm, 0 0 16px $token:colors.primaryLight"  // 多层叠加
border: "1px solid $token:colors.borderLight"                // border 简写

// transition 是整段（推荐这种）
transition: "$token:transitions.normal"
```

### 2.5 ❌ 硬编码（R-STRUCTURE-02）

```jsonc
backgroundColor: "#FF6F91"                  // ❌ → "$token:colors.primary"
fontSize: "16px"                            // ❌ → "$token:typography.body-lg.fontSize"
borderRadius: "12px"                        // ❌ → "$token:radius.lg"
boxShadow: "0 4px 8px rgba(0,0,0,0.1)"      // ❌ → "$token:shadows.md"
transition: "all 200ms ease"                // ❌ → "$token:transitions.normal"
```

### 2.6 写时校验（事前治理）

MCP `style/update` / `style/batch_update` 入参在写入前调用 `validateStyles`：

- 含非法 `$token:` 形式 → 直接抛 ZodError 拒收（不会进 schema）
- 已知合法形式（dot / dash 双语法 + 复合值）→ 通过

详见 `apps/design-mcp/src/tools/helpers/validateStyles.ts` + 单测。
**意味着**：你写错了 SKILL 没拦的 group 名（如 `radii` / `durations` / `easings`）→ 写不进 schema → 立刻能在 MCP 报错里看到原因。

## 3. 标准样式示例

### 主按钮（Atom）
```jsonc
n9 (SubmitBtn).styles = {
  // 尺寸
  width: "100%",
  height: "48px",
  // 色
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",
  // 字（用 body 预设；如需更粗 → 退回 theme-generator 打 button 预设）
  fontSize: "$token:typography.body.fontSize",
  fontWeight: "$token:typography.body.fontWeight",
  lineHeight: "$token:typography.body.lineHeight",
  letterSpacing: "0.02em",
  // 形
  borderRadius: "$token:radius.full",
  border: "none",
  // 影
  boxShadow: "$token:shadows.sm",
  // 局
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "$token:spacing.xs",
  // 距
  marginTop: "$token:spacing.lg",
  // 动
  transition: "$token:transitions.normal",
  cursor: "pointer",
  // 不可选
  userSelect: "none"
}
```

### 输入框（Atom）
```jsonc
n6 (PhoneInput).styles = {
  width: "100%",
  height: "44px",
  padding: "$token:spacing.sm $token:spacing.md",
  border: "1px solid $token:colors.borderDefault",
  borderRadius: "$token:radius.md",
  fontSize: "$token:typography.body.fontSize",
  color: "$token:colors.textPrimary",
  backgroundColor: "$token:colors.bgCard",
  transition: "$token:transitions.fast",
  outline: "none"
}
```

### 容器卡片（Organism）
```jsonc
n4 (FormCard).styles = {
  width: "100%",
  padding: "$token:spacing.lg",
  backgroundColor: "$token:colors.bgCard",
  borderRadius: "$token:radius.lg",
  boxShadow: "$token:shadows.md",
  border: "1px solid $token:colors.borderLight",
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.md"
}
```

### 区域容器（带渐变背景）
```jsonc
n1 (HeaderArea).styles = {
  width: "100%",
  paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.xl)",
  paddingBottom: "$token:spacing.xl",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "linear-gradient(180deg, $token:colors.primaryLight 0%, $token:colors.bgPage 100%)",
  position: "relative"
}
```

### 装饰节点（CSS 渐变实现）
```jsonc
n14 (PinkCircleDeco).styles = {
  position: "absolute",
  top: "-40px",
  right: "-60px",
  width: "180px",
  height: "180px",
  borderRadius: "$token:radius.full",
  background: "radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)",
  zIndex: 0,
  pointerEvents: "none"
}
```

### 装饰节点（PNG 素材实现，executor 写入 src）
```jsonc
n15 (MintLeafDeco).styles = {
  position: "absolute",
  bottom: "10%",
  left: "-20px",
  width: "120px",
  height: "120px",
  backgroundImage: "<待 executor 写入 PNG URL>",     // ★ executor 阶段填
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  zIndex: 0,
  pointerEvents: "none"
}
```

## 4. 文字节点（叶子）

```jsonc
// 静态文案（不变）—— 用 h2 整套预设(已含 bold + tight)
n5 (FormTitle).styles = {
  fontSize: "$token:typography.h2.fontSize",
  fontWeight: "$token:typography.h2.fontWeight",
  lineHeight: "$token:typography.h2.lineHeight",
  color: "$token:colors.textPrimary",
  textAlign: "center",
  marginBottom: "$token:spacing.md"
}
n5.props = { textContent: "欢迎回来" }   // 静态文案 design 可写

// 动态文案（interaction 已写表达式，design 不动 props.textContent）
n11 (ButtonText).styles = {
  fontSize: "$token:typography.body.fontSize",
  fontWeight: "$token:typography.body.fontWeight",
  color: "$token:colors.textInverse"
}
// n11.props.textContent 由 interaction 阶段写为表达式，design 阶段不动
```

## 5. 红线（叶子节点）

- ❌ 文字叶子节点写 `flex: 1` → 撑坏布局；用 padding/margin 调整
- ❌ 文字叶子节点没 `color` / `fontSize` → 浏览器默认黑色 16px
- ❌ 装饰节点没 `pointerEvents: none` → 误拦截点击
- ❌ 装饰节点没 `position: absolute` → 占据布局空间

## 6. MCP 调用

```jsonc
style/update {
  projectId, nodeId,
  styles: { /* 全量 */ }
}

// 批量统一（D-audit 用）
style/batch_update {
  projectId,
  updates: [
    { nodeId: "...", styles: { ... } },
    ...
  ]
}

// 重置（删除某属性）
style/reset {
  projectId, nodeId,
  properties: ["backgroundColor", "boxShadow"]
}
```

## 7. 红线汇总

- ❌ "关键样式先写、留 executor 补 hover" → 视觉态在 visualState；styles 必须一次到位
- ❌ 硬编码颜色 / 字号 / 间距 / 阴影 / 时长 → R-STRUCTURE-02
- ❌ 自造 ThemeConfig 外色值 → 缺 token 就退回 theme-generator 补
- ❌ 文字叶子写 flex:1 → 撑坏布局
- ❌ 装饰节点不放 absolute / 不写 pointerEvents:none
- ❌ 节点 styles 维度不全（容器只写 bg 不写 padding/radius/shadow）
- ❌ transition 缺失 → 状态切换瞬间跳变
- ❌ 行内错误节点不走 minimal-debug → design 阶段必须用 token 化补完整
