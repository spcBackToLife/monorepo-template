> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T6-variants
> 对应 schema 字段：project.themeConfig.themes[default].colorSchemes[]

# T6：色彩方案变体（light + dark）— 校园社交-登录页

## 1. 模型确认

V1.0 模型下「色彩方案（colorSchemes）」与「主题（themes）」**正交**：
- **themes[]**：完整风格切换（品牌默认 / 春节红 / 子品牌 X）
- **themes[i].colorSchemes[]**：同主题内的明暗 / 可访问性变体

本项目当前只 1 个主题 `default`，下设 2 套色彩方案：`light` / `dark`。
本任务**只补 dark overrides 的真实值**，light 保持 `overrides: {}`（继承 base）。

## 2. brightness 决策回顾

T1：`brightness: "both"` —— 学生群体暗黑模式占有率高（iOS 自动跟随、B站/网易云夜间党），必须等权出 light + dark。
T6 限定：dark **不是 light 的反色**，而是按 dark UI 设计原理重新派生：
- 暗底不是纯黑 `#000`（视觉刺眼、与 OLED 烧屏关联弱化）
- 主色在暗底上提亮（避免发灰）
- 阴影是「真黑」深 alpha（不是 light 的 0.06，是 0.40+）
- 文字色用 rgba(255,255,255,X) 而不是 #fff（保留透明梯度）

## 3. HSL 推导（与 T2 base 同源 233° 蓝紫色相）

### 3.1 表面色（核心：233° 蓝紫底气）

| Token | 推导 | HSL | Hex |
|-------|------|-----|-----|
| background | H=233°, S=12%, L=8% | (233, 12%, 8%) | **#11131A** |
| surface | H=233°, S=12%, L=12% | (233, 12%, 12%) | **#191C26** |
| surfaceElevated | H=233°, S=12%, L=16% | (233, 12%, 16%) | **#222633** |

**为什么不用纯黑**：纯黑 #000 + 蓝紫主色 #7B89FF 在 OLED 屏上产生「色边」（color fringing），且与 light 风格的"温度"基调不一致。带 8% 蓝紫底气的 `#11131A` 既符合 minimal 极简（仍是看上去的"深黑"），又延续校园温度。

### 3.2 主色（暗底提亮 + 微降饱和）

| Token | light | dark 推导 | dark Hex |
|-------|-------|-----------|----------|
| primary | #5B6CFF (233,100,68) | H, S×0.92, L+4 → (233, 92%, 72%) | **#7B89FF** |
| primaryHover | #7B89FF | dark base 再 +6L → **#9AA5FF** |
| primaryActive | #3346FF | dark base 同色（按下回到 light 的 base） → **#5B6CFF** |
| primaryLight | #EBEDFA | (233, 25%, 16%) 反转：极深 + 一点蓝紫 → **#1F2333** |

> dark 上的 primaryLight 不能复用 light 的浅紫 #EBEDFA（白上看刚好，黑上变成"亮窗"刺眼）。改为深紫底色，作为「primary 弱化背景容器」用途仍然成立。

### 3.3 灰阶反转

base 灰阶（gray100 浅 → gray900 深）在 dark 下要反转：
| Token | light | dark |
|-------|-------|------|
| gray100 | #F1F2F4 浅灰 | #1A1D26 深灰（带 233°）|
| gray500 | #787E8B 中灰 | #787E8B 不变（中灰 OK）|
| gray900 | #181A1F 接近黑 | #F1F2F4 接近白 |

### 3.4 语义色（暗底统一提亮 ~6L）

| Token | light | dark | 理由 |
|-------|-------|------|------|
| success | #2DCC75 | #5DE095 | 在 #11131A 上 APCA ≥ 60 |
| warning | #FBBE2E | #FFD466 | 暗底上更易识别 |
| error | #DD4747 | #FF6B6B | 同上 |
| info | #2D7DD2 | #5DA8E8 | 同上 |

### 3.5 文字色（rgba 透明 + 反色）

| Token | light | dark | 备注 |
|-------|-------|------|------|
| textPrimary | rgba(0,0,0,0.88) | rgba(255,255,255,0.92) | dark 上 92% 更柔（白底则 88% 已合适）|
| textSecondary | rgba(0,0,0,0.65) | rgba(255,255,255,0.65) | 透明度一致 |
| textTertiary | rgba(0,0,0,0.45) | rgba(255,255,255,0.45) | 同上 |
| textInverse | #FFFFFF | #11131A | 用于按钮反色文字（dark 模式上 primary 按钮里仍要可见底色）|

### 3.6 阴影（真黑 + 更深 alpha）

| Token | light | dark |
|-------|-------|------|
| sm | 0 1px 3px rgba(0,0,0,0.04) | 0 2px 4px rgba(0,0,0,**0.40**) |
| md | 0 4px 12px rgba(0,0,0,0.06) | 0 4px 12px rgba(0,0,0,**0.50**) |
| lg | 0 8px 24px rgba(0,0,0,0.10) | 0 8px 24px rgba(0,0,0,**0.60**) |
| xl | 0 12px 48px rgba(0,0,0,0.14) | 0 12px 48px rgba(0,0,0,**0.70**) |

dark 下阴影 alpha 跳跃式增高（dark 上需要"真黑沉降"才能感知阴影；light 的 0.04 透明度在 dark 上完全看不见）。

## 4. APCA 重验（dark scheme 独立验）

按方法论 ≥75 (textPrimary on bg) / ≥60 (textSecondary on surface) / ≥45 (button text on filled button)：

| 测试 | fg | bg | Lc 估算 | 通过门槛 |
|------|-----|-----|--------|---------|
| textPrimary on bg | rgba(255,255,255,0.92) | #11131A | ≈ **89** | ≥75 ✓ |
| textSecondary on surface | rgba(255,255,255,0.65) | #191C26 | ≈ **68** | ≥60 ✓ |
| textTertiary on bg | rgba(255,255,255,0.45) | #11131A | ≈ **47** | ≥45 ✓ |
| textInverse on primary | #11131A | #7B89FF | ≈ **62** | ≥45 ✓ |
| error on bg | #FF6B6B | #11131A | ≈ **56** | ≥45 ✓ |
| primary on surface | #7B89FF | #191C26 | ≈ **58** | ≥45 ✓ |

**全部通过**。R-THEME-03 dark scheme 合规。

## 5. 关键设计决策

- ✅ **不用纯黑**：#11131A 带蓝紫底气，延续 light 的 233° 色相
- ✅ **primary 提亮 4L**：#5B6CFF → #7B89FF，避免暗底发灰
- ✅ **阴影 alpha 跳涨**：light 0.04~0.14 → dark 0.40~0.70（看得见才有用）
- ✅ **灰阶反转 + 中灰守恒**：gray500 #787E8B 在两套方案下都成立
- ✅ **light overrides 留空**：表示 light = base，避免重复字段
- ✅ **不引入新 token**：dark 只是 overrides，不新增 keys

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/update_color_scheme_overrides（kind=colors，dark）
// 32 个 color override + 4 个 shadow override
// 完成后 themes[default].colorSchemes 有 light(空 overrides) + dark(完整 32+4 overrides)
```
