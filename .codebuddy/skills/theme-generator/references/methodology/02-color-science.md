# 色彩科学（HSL 色轮 + APCA 对比度）★

T2-colors 任务的核心方法论。**色板必须用算式推导**，不靠"挑几个好看的"。每条决策都要在 md 里给出 HSL 算式 + APCA 实测数值。

## 一、必备 token 全集（17 个，缺一不可）

```
语义色（7）：primary / secondary / accent / success / warning / error / info
表面色（3）：bgPage / bgCard / bgElevated
文字色（4）：textPrimary / textSecondary / textTertiary / textInverse
状态色（3）：primaryHover / primaryActive / primaryLight
边界色（4）：borderDefault / borderStrong / divider / overlay
中性灰（10）：gray100 ~ gray900 + gray50（可选）
```

**红线 R-THEME-02**：缺任意 7 类语义色 + bgPage/bgCard + textPrimary/textSecondary/textTertiary + borderDefault + divider 任一个 → 失败。

## 二、HSL 色轮关系（推导 secondary / accent）

```
primary    = seedColor (用户给的或 T1 推断的)
secondary  = HSL(H + 150°, S × 0.9, L)        // 分裂互补，最和谐
accent     = HSL(H + 30°,  S,       L + 5%)   // 类似色，更活泼
success    = HSL(145, 65%, 适应明度)            // 绿色系固定色相
warning    = HSL(38,  92%, 适应明度)            // 橙色系固定色相
error      = HSL(0,   72%, 适应明度)            // 红色系固定色相
info       = HSL(210, 70%, 适应明度)            // 蓝色系固定色相
```

**适应明度规则**：
- brightness=light：success/warning/error/info 的 L 取 45%~55%
- brightness=dark：success/warning/error/info 的 L 取 60%~70%（暗底上需提亮）

### HSL 推导示例

```
seedColor = #FF6F91 → HSL(345, 100%, 72%)

primary   = #FF6F91 (HSL 345,100%,72%)
secondary = HSL(345+150=495mod360=135, 100%×0.9=90%, 72%) = #6FFFAA → APCA 验证后微调
accent    = HSL(345+30=375mod360=15,  100%,         77%)         = #FFB077

success   = HSL(145, 65%, 50%) = #2DCC75
warning   = HSL(38,  92%, 56%) = #FBBE2E
error     = HSL(0,   72%, 51%) = #DD4747
info      = HSL(210, 70%, 53%) = #2D7DD2
```

**md 必须给出**：每个推导色的 HSL 三元组 + 转 hex 后的值。

## 三、表面色 / 文字色推导

### 暗色模式

```
bgPage          = HSL(primaryH, 25%, 8%)         // 主背景，最深
bgCard          = HSL(primaryH, 20%, 12%)        // 卡片，比 bg 高一层
bgElevated      = HSL(primaryH, 18%, 16%)        // 弹层 / Modal，再高一层

textPrimary     = HSL(0, 0%, 97%)                // 近白
textSecondary   = HSL(primaryH, 10%, 65%)        // 灰白带轻微色相
textTertiary    = HSL(primaryH, 8%,  45%)
textInverse     = HSL(primaryH, 25%, 8%)         // 白底上的反色文字 = bgPage

borderDefault   = HSL(primaryH, 15%, 22%)
borderStrong    = HSL(primaryH, 18%, 32%)
divider         = HSL(primaryH, 12%, 18%)
overlay         = rgba(0, 0, 0, 0.6)             // Modal 遮罩
```

### 亮色模式

```
bgPage          = #FFFFFF (或 HSL(primaryH, 5%, 99%) 带极轻色相)
bgCard          = HSL(primaryH, 5%, 97%)
bgElevated      = #FFFFFF                        // Modal 弹起更白

textPrimary     = rgba(0, 0, 0, 0.88)
textSecondary   = rgba(0, 0, 0, 0.65)
textTertiary    = rgba(0, 0, 0, 0.45)
textInverse     = #FFFFFF                        // 深色按钮上的白字

borderDefault   = HSL(primaryH, 10%, 88%)
borderStrong    = HSL(primaryH, 15%, 75%)
divider         = HSL(primaryH, 8%,  92%)
overlay         = rgba(0, 0, 0, 0.45)
```

## 四、APCA 对比度验证（强制门禁，R-THEME-03）

> APCA = Accessible Perceptual Contrast Algorithm，比传统 WCAG 更精准。
> Lc 值越大对比度越高（取值 0~106）。

### 必查阈值表

| 配对 | 最低 Lc | 推荐 Lc |
|------|--------|--------|
| textPrimary on bgPage | ≥ 75 | ≥ 90 |
| textPrimary on bgCard | ≥ 75 | ≥ 90 |
| textSecondary on bgPage | ≥ 60 | ≥ 75 |
| textSecondary on bgCard | ≥ 60 | ≥ 75 |
| textTertiary on bgPage | ≥ 45 | ≥ 60 |
| primary on bgPage（按钮主色）| ≥ 45 | ≥ 60 |
| textInverse on primary（按钮文字）| ≥ 60 | ≥ 75 |
| error on bgCard（错误提示）| ≥ 45 | ≥ 60 |

### 不达标怎么办

```
1. 先尝试调整文字色明度（保持色相不变）：
   - 暗底 → textPrimary L↑（97 → 98 → 99）
   - 亮底 → textPrimary 透明度↑（0.88 → 0.92 → 0.95）

2. 如果文字色已极限（白/黑）仍不够 → 调整背景色明度：
   - bgPage 暗模式 L 8% → 6% → 4%（更深以提对比）
   - bgPage 亮模式 → 保持纯白

3. 若主色按钮 primary on bgPage 不够 → 调整 primary 的明度：
   - 暗模式：primary L 应 ≥ 60%
   - 亮模式：primary L 应 ≤ 55%

4. 极端情况（品牌色刚好卡线）→ 在 md 中明确标注"按品牌色保留 + 大文字/图标使用降阈值"
```

### md 中必须给出 APCA 实测表

```markdown
| 配对 | fg | bg | Lc | 阈值 | 通过 |
|------|----|----|-----|------|------|
| textPrimary on bgPage   | rgba(0,0,0,.88) | #FFF    | 91 | ≥75 | ✓ |
| textSecondary on bgPage | rgba(0,0,0,.65) | #FFF    | 67 | ≥60 | ✓ |
| primary on bgPage       | #FF6F91         | #FFF    | 48 | ≥45 | ✓ |
| textInverse on primary  | #FFF            | #FF6F91 | 62 | ≥60 | ✓ |
```

## 五、状态色推导（primaryHover / primaryActive / primaryLight）

```
primaryHover  = HSL(H, S, L + 6%)        // 亮一点（亮模式）/ HSL(H, S, L - 6%)（暗模式）
primaryActive = HSL(H, S, L - 8%)        // 暗一点（按下感）
primaryLight  = HSL(H, S × 0.5, 95%)     // 浅底（用作 chip / tag 背景）
                亮模式：primaryLight 取 L 92%~96%
                暗模式：primaryLight 取 L 18%~22%（带主色相的深底）
```

## 六、中性灰阶（gray100~gray900）

```
基色：gray500 = HSL(primaryH, 5%, 50%)（带极轻主色相）

按 10% 间隔生成：
gray100 = L 95% / gray200 = L 85% / gray300 = L 75% / gray400 = L 60%
gray500 = L 50% / gray600 = L 40% / gray700 = L 30% / gray800 = L 20% / gray900 = L 10%

亮模式：用 100~500 做边框/分割线/次要文字
暗模式：用 500~900 做表面层级
```

## 七、禁止做法

❌ 仅给 hex 不给 HSL → md 推导过程缺失，下游无从理解
❌ APCA 不达标硬塞色板 → 直接触发 R-THEME-03 出场失败
❌ 同色系堆叠（如 primary 蓝 + accent 蓝 + info 蓝）→ 缺辨识度，违反 HSL 互补关系
❌ secondary 凭感觉选色不走 H+150° → 失去和谐保证
❌ success 用品牌色（如 primary=绿则 success 也用 primary）→ 状态色必须语义独立

## 沉淀到 schema

```jsonc
// MCP: theme/update（首次写完整框架）或 theme/update_tokens（增量补色）
theme/update_tokens {
  projectId,
  tokens: {
    colors: {
      primary, secondary, accent, success, warning, error, info,
      bgPage, bgCard, bgElevated,
      textPrimary, textSecondary, textTertiary, textInverse,
      primaryHover, primaryActive, primaryLight,
      borderDefault, borderStrong, divider, overlay,
      gray100, gray200, ..., gray900
    }
  }
}
```

完整字段清单见 `../schema-spec/theme-config.md` §2.colors。
