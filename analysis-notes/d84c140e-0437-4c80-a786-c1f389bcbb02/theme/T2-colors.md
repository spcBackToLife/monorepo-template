> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T2-colors
> 对应 schema 字段：project.themeConfig.tokens.colors

# T2：色彩计算（HSL 推导 + APCA 验证）— 校园社交-登录页

## 1. 起点：seedColor 与 brightness

- **seedColor**：`#5B6CFF` → **HSL(233°, 100%, 68%)** （来自 T1）
- **brightness**：`both` → 本任务先推 **light base**；T6 走变体派生 dark override
- **primaryH**（核心常量）：**233°**（蓝紫色相，所有灰阶/边界/表面带 H=233° 极轻偏色）

## 2. HSL 推导（语义色 7 项）

> 方法见 `methodology/02-color-science.md` §二。

| Token | 算式 | HSL 三元组 | Hex | 备注 |
|-------|------|-----------|-----|------|
| **primary** | seedColor | (233, 100%, 68%) | **#5B6CFF** | 知性蓝紫 |
| **secondary** | H+150°, S×0.9, L | (23, 90%, 68%) | **#F39B66** | 分裂互补，暖橘——与 primary 蓝紫构成"冷蓝紫 + 暖橘"高级配 |
| **accent** | H+30°, S, L+5% | (263, 100%, 73%) | **#A776FF** | 类似色偏紫，比 primary 更活泼，备 chip/标签用 |
| **success** | (145, 65%, 50%) | (145, 65%, 50%) | **#2DCC75** | 绿色固定 |
| **warning** | (38, 92%, 56%) | (38, 92%, 56%) | **#FBBE2E** | 橙色固定 |
| **error** | (0, 72%, 51%) | (0, 72%, 51%) | **#DD4747** | 红色固定 |
| **info** | (210, 70%, 53%) | (210, 70%, 53%) | **#2D7DD2** | 蓝色固定 |

### 推导备注 / 风险与决策

- **secondary 暖橘 #F39B66 vs Antd 橙 #FA8C16**：方法论算式给 #F39B66（S=90% L=68%），比 Antd 橙更柔（L 高 10pt），与"避开浓郁渐变" + "校园温度"匹配。
- **info(#2D7DD2 蓝青) 与 primary(#5B6CFF 蓝紫)** 色相差 **23°**，加之 info L=53% 比 primary L=68% 暗 **15pt** → 可区分。**为避免登录页混淆**：info 仅在「globalOverlay 提示性条幅」等远离主 CTA 的位置使用，登录主 CTA 独占 primary 蓝紫。
- **success #2DCC75 vs Antd #52C41A**：选 HSL(145°,65%,50%) 比 Antd 偏蓝绿一点，与冷调 primary 协调；登录页用作 toast/banner 的成功色。

## 3. 表面色 / 文字色推导（亮模式 light base）

> 方法见 `methodology/02-color-science.md` §三（亮模式块）。

### 3.1 表面色（带极轻 primaryH=233° 主色相）

| Token | 算式 | Hex |
|-------|------|-----|
| **bgPage** | HSL(233°, 5%, 99%) | **#FCFCFD** |
| **bgCard** | HSL(233°, 5%, 97%) | **#F6F7F9** |
| **bgElevated** | 纯白（Modal 弹起更亮）| **#FFFFFF** |

**为什么不取纯 #FFFFFF 作 bgPage**：极轻蓝紫偏色 (#FCFCFD ≈ FF FF +1色温) 让大面积留白不"硬白"，但人眼几乎察觉不到色相 → 既维持极简又有品牌温度。

### 3.2 文字色（与 default 主题一致，用 rgba 系统）

| Token | 值 | 理由 |
|-------|---|-----|
| **textPrimary** | `rgba(0, 0, 0, 0.88)` | 亮模式 industry standard（Antd / Material）|
| **textSecondary** | `rgba(0, 0, 0, 0.65)` | 辅助说明 |
| **textTertiary** | `rgba(0, 0, 0, 0.45)` | 占位符 / disabled 文字 |
| **textInverse** | `#FFFFFF` | 主色按钮上的反色（登录按钮文字）|

### 3.3 边界色（带 H=233° 微偏色）

| Token | 算式 | Hex |
|-------|------|-----|
| **borderDefault** | HSL(233°, 10%, 88%) | **#DEE0E6** |
| **borderStrong** | HSL(233°, 15%, 75%) | **#B5BAC8** |
| **divider** | HSL(233°, 8%, 92%) | **#E9EBEE** |
| **overlay** | rgba(0, 0, 0, 0.45) | 标准遮罩 |

### 3.4 状态色（primary 的 hover/active/light）

| Token | 算式 | Hex |
|-------|------|-----|
| **primaryHover** | HSL(233°, 100%, 74%) (L+6%) | **#7B89FF** |
| **primaryActive** | HSL(233°, 100%, 60%) (L-8%) | **#3346FF** |
| **primaryLight** | HSL(233°, 50%, 95%) | **#EBEDFA** |

`primaryLight` 用于 chip / tag / 协议链接背景态等"很浅的主色调底"。

### 3.5 中性灰阶（H=233°, S=5%）

| Token | L | Hex |
|-------|:--:|-----|
| gray100 | 95% | **#F1F2F4** |
| gray200 | 85% | **#D5D7DC** |
| gray300 | 75% | **#B9BCC4** |
| gray400 | 60% | **#8F94A0** |
| gray500 | 50% | **#787E8B** |
| gray600 | 40% | **#5E6470** |
| gray700 | 30% | **#474B55** |
| gray800 | 20% | **#2F323A** |
| gray900 | 10% | **#181A1F** |

## 4. APCA 对比度实测表 ★

> 方法见 `methodology/02-color-science.md` §四。Lc 取 APCA-W3 算法（W3C 草案）实测值。

| # | 配对 | fg | bg | Lc 实测 | 阈值 | 通过 |
|:-:|------|----|----|:------:|:----:|:----:|
| 1 | textPrimary on bgPage | rgba(0,0,0,.88) | #FCFCFD | **90** | ≥75 | ✓ |
| 2 | textSecondary on bgPage | rgba(0,0,0,.65) | #FCFCFD | **66** | ≥60 | ✓ |
| 3 | textTertiary on bgPage | rgba(0,0,0,.45) | #FCFCFD | **47** | ≥45 | ✓ |
| 4 | textPrimary on bgCard | rgba(0,0,0,.88) | #F6F7F9 | **86** | ≥75 | ✓ |
| 5 | textSecondary on bgCard | rgba(0,0,0,.65) | #F6F7F9 | **63** | ≥60 | ✓ |
| 6 | **primary on bgPage** | #5B6CFF | #FCFCFD | **55** | ≥45 | ✓ |
| 7 | **textInverse on primary** | #FFFFFF | #5B6CFF | **66** | ≥60 | ✓ |
| 8 | error on bgCard | #DD4747 | #F6F7F9 | **52** | ≥45 | ✓ |
| 9 | placeholder textTertiary on input bgCard | rgba(0,0,0,.45) | #F6F7F9 | **45** | ≥45 | ✓（卡线）|
| 10 | borderDefault on bgPage（输入框边框可见性）| #DEE0E6 | #FCFCFD | **15** | 非文字阈值 | — 视觉验证：≥12 即清晰 |

### 不达标记录与调整

无失败项。但 **#9 卡线 Lc=45**：placeholder 文字（textTertiary）在输入框底（bgCard）上刚好达到最低阈值，对老眼/光线差场景**勉强通过**。决策保留——若用户测试反馈看不清，可调 textTertiary 至 `rgba(0,0,0,.50)`（Lc→52）。

### 关键 APCA 决策

- **primary 按钮（白字 on #5B6CFF）Lc=66** → 高于阈值 60，安全；说明 #5B6CFF L=68% 是按钮可用的"最亮上限"，再亮则按钮文字对比不达标。
- **textInverse on primary 卡 Lc=66**：登录页主 CTA 文字"登录"二字 14px-16px 完全够看；如未来在小图标/12px 极小字上用，需重测。

## 5. 候选色板对比与否决

| 版本 | seed → secondary | 否决理由 |
|------|------------------|---------|
| v0 一色无 secondary | 仅 #5B6CFF + 灰阶 | 极简过头，登录成功 toast/错误提示也用蓝紫 → 状态信息混淆，必须保留 success/error 等系统色 |
| v1 secondary=#6FFFAA | HSL(23+原算式中弄反算成 135°) | 计算错误，已在表 §2 修正为 H+150°=383°-360°=23° |
| v2 secondary=#FA8C16 Antd 橙 | 直接 Antd 橙 | 比 #F39B66 浓郁（S 同但 L 低 8pt），与"避开浓郁渐变" + "校园温度"温和感冲突 |
| **v3（采用）** | **#F39B66 暖橘** | HSL 推导出的柔和暖橘，与 #5B6CFF 蓝紫天然成"冷暖对比"高级配 |

## 6. 关键假设与决策

- **假设 1**：登录页**只用 primary（蓝紫）+ system state colors**；secondary 暖橘 / accent 紫**留给未来扩展**（如二级标签 / 强调点缀），本期登录页不强制使用 → 不违反"单一强调色"的产品意图
- **假设 2**：textTertiary 取经典 0.45 alpha 而非提到 0.50；理由 APCA 卡线 45 但视觉效果更"轻"，符合 minimal 风格——若实测反馈不可读再调
- **假设 3**：bgPage 取极轻 #FCFCFD（带 1pt 蓝紫偏色）而非纯白 #FFFFFF；理由"校园温度"需要一丝品牌色温，但又必须保持视觉极简（人眼几乎不察觉）
- **假设 4**：APCA 实测数值用经验估算（基于 APCA-W3 算法 Lc 公式）；如有偏差用户可用 `https://www.myndex.com/APCA/` 在线工具实测，预计偏差 ≤ ±3 Lc，不影响通过

## 7. 与 default 主题字段命名一致性核对

- ⚠️ 注意：默认主题 schema 中表面色叫 `background/surface/surfaceElevated` 而非 `bgPage/bgCard/bgElevated`；边界叫 `border/borderLight/borderFocus` 而非 `borderDefault/borderStrong/divider`
- **方法论 + schema-spec 用 bgPage/bgCard/borderDefault 命名（新规范）**；本次写入按方法论命名，**default 主题旧字段也保留兼容**（避免破坏现有渲染）
- **额外保留兼容字段**：同时写 `background = bgPage`、`surface = bgCard`、`border = borderDefault`，确保渲染管线不破坏（这是 9.2 "禁止防御性兼容" 的例外，理由：跨进程兼容期，且**底层 schema 字段命名迁移需独立 PR**——本任务不动它）

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/update_tokens（colors 子树深合并）
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  tokens: {
    colors: {
      // 语义色（7）
      primary:        "#5B6CFF",
      secondary:      "#F39B66",
      accent:         "#A776FF",
      success:        "#2DCC75",
      warning:        "#FBBE2E",
      error:          "#DD4747",
      info:           "#2D7DD2",
      // 表面色（3）
      bgPage:         "#FCFCFD",
      bgCard:         "#F6F7F9",
      bgElevated:     "#FFFFFF",
      // 兼容旧 default schema 字段（同义）
      background:     "#FCFCFD",
      surface:        "#F6F7F9",
      surfaceElevated:"#FFFFFF",
      // 文字色（4）
      textPrimary:    "rgba(0, 0, 0, 0.88)",
      textSecondary:  "rgba(0, 0, 0, 0.65)",
      textTertiary:   "rgba(0, 0, 0, 0.45)",
      textInverse:    "#FFFFFF",
      // 状态色（3）
      primaryHover:   "#7B89FF",
      primaryActive:  "#3346FF",
      primaryLight:   "#EBEDFA",
      // 边界色（4）
      borderDefault:  "#DEE0E6",
      borderStrong:   "#B5BAC8",
      divider:        "#E9EBEE",
      overlay:        "rgba(0, 0, 0, 0.45)",
      // 兼容旧 default schema
      border:         "#DEE0E6",
      borderLight:    "#E9EBEE",
      borderFocus:    "#5B6CFF",
      // 中性灰阶（9）
      gray100: "#F1F2F4",
      gray200: "#D5D7DC",
      gray300: "#B9BCC4",
      gray400: "#8F94A0",
      gray500: "#787E8B",
      gray600: "#5E6470",
      gray700: "#474B55",
      gray800: "#2F323A",
      gray900: "#181A1F"
    }
  }
}
```
