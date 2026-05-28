# 校园地理社交 · 全局设计系统

> **范围**：本文档是 design-planner 阶段 **L0 全局基调**，所有 `pages/**/visual.md` 与 `components/**/visual.md` 必须 100% 引用本文 Token，不可自造色值/字号/动效。
> **数据源**：`.design-workspaces/campus-geo-social/design-system/theme.json`（已 PUT 到设计编辑器项目 `34315fbd-a5a2-499f-81e4-2fcf84cf56f9`）。
> **主题决策**：D6 青春治愈风 · 草莓粉 + 薄荷绿 + 奶油黄 · 有机弹性 spring 微动效 · 手绘 outline 图标。
> **版本**：v1.0 · 2026-05-28

---

## 0. 整体风格 DNA（一句话定义）

> **"温暖的奶油底色上，跳动着草莓粉与薄荷绿的青春气息——大圆角、轻阴影、弹性动效，让 18-24 岁的校园用户一打开就觉得'这是为我做的'。"**

### 0.1 风格四维度

| 维度 | 定位 | 与主流校园社交的差异 |
|------|------|----|
| **色温** | 暖（奶油白 + 粉系） | 不走冷蓝白企业感，走"被太阳晒过"的温暖感 |
| **形态** | 有机圆润（12-32px 圆角为主） | 不走方正几何，避免冷峻；圆角传达柔软包容 |
| **装饰密度** | 中（moderate） | 不走极简纯白，也不走花哨堆砌；每个装饰服务一个目的 |
| **动效感** | 弹性（spring 占主导） | 不走 ease-out 平直，spring 的微回弹传达"活的、好玩的" |

### 0.2 用户感知优先级

```
温暖 > 友好 > 活泼 > 精致 > 高效
（情绪体验优先，效率退居其后；这是 C 端社交，不是工具 App）
```

---

## 1. 色彩系统

### 1.1 主色推导

| 角色 | 色值 | HSL 分解 | 选择理由 |
|------|------|---------|-------------------------------|
| Primary | `#FF6F91` | hsl(346, 100%, 72%) | 草莓粉——18-24 岁女性用户主导审美的"安全治愈色"；HSL 饱和度 100% + 亮度 72% 兼顾活力与不刺眼；男性用户也能接受（不偏向"芭比粉"） |
| Secondary | `#6FE2A8` | hsl(146, 65%, 66%) | 薄荷绿——与主色 H 距 160°，**分裂互补**而非直接互补（避免红绿对撞），传达"清新校园" |
| Accent | `#FFD777` | hsl(43, 100%, 73%) | 奶油黄——三色和谐三角形配色，承担"奖励/任务/胶囊"等惊喜场景的点缀 |
| 特殊色 lavender | `#E8DFF5` | hsl(265, 50%, 92%) | 极淡薰衣草——胶囊/夜晚场景装饰；超低饱和保证不抢戏 |

**主色关系分析**：
- Primary × Secondary：**分裂互补**（split-complementary），既有对比又比直接互补柔和 30%，适合长时间浏览
- Primary × Accent：**和谐三角**（triadic），三色任意两两都协调
- 使用面积铁律：**Primary ≤ 15% · Secondary ≤ 8% · Accent ≤ 5% · 装饰色 ≤ 10%**（合计 ≤ 38%，剩余 62%+ 是中性色和背景，保证清爽）

### 1.2 背景色层级（5 层叠加）

```
Layer 0 (页面底)    #FFFAF6  奶油白           ← 默认页面背景
   ↓ (亮度 +1.5%)
Layer 1 (卡片)      #FFFFFF  纯白             ← form-card / 列表卡片
   ↓ (无亮度差，靠 border 区分)
Layer 2 (输入框)    #FFFFFF  纯白 + 淡粉 border ← input 内底色
   ↓ (轻微抬升)
Layer 3 (Sheet)     #FFFFFF  + shadow-lg      ← 底部抽屉 / 弹窗
   ↓
Layer 4 (Modal)     #FFFFFF  + shadow-xl + 蒙层 ← 强确认 / 锁定提示
```

| Layer | Token | 色值 | 用途 | 与下层关系 |
|-------|-------|------|------|-----------|
| L0 | `background` | `#FFFAF6` | 页面底色（暖白） | — |
| L1 | `surface` | `#FFFFFF` | 卡片/列表表面 | 与 L0 差 1.5% 亮度，靠 shadow-sm 加强 |
| L2 | — | `#FFFFFF` | 输入框内 | 与 L1 同色，靠 `border:1px borderLight` 区分 |
| L3 | `surfaceElevated` | `#FFFFFF` | Sheet/抽屉 | 与 L2 同色，靠 shadow-md/lg + radius-xl 区分 |
| L4 | `surfaceElevated` + overlay | `#FFFFFF` + `rgba(45,36,56,0.45)` | Modal | 蒙层吃掉所有下层，纯独立空间 |

**毛玻璃层**：本主题**默认不使用毛玻璃**（与"温暖奶油"质感不符）。仅在地图浮层（M1）等需要"透出地图"的极少数场景使用：
```css
background: rgba(255, 250, 246, 0.85);
backdrop-filter: blur(20px) saturate(1.5);
border: 1px solid rgba(255, 224, 232, 0.6);
```

**蒙层**：`rgba(45, 36, 56, 0.45)` —— 注意是带紫调的深色而不是纯黑，与治愈风一致。

### 1.3 文字色层级（基于 APCA 对比度）

| Token | 色值 | APCA Lc (vs L0 #FFFAF6) | 用途 | 使用频率 |
|-------|------|:---:|------|---------|
| `textPrimary` | `rgba(45, 36, 56, 0.92)` | Lc ~90 | 标题/正文核心 | 25% |
| `textSecondary` | `rgba(45, 36, 56, 0.65)` | Lc ~65 | 描述/副标题/列表副文 | 40% |
| `textTertiary` | `rgba(45, 36, 56, 0.42)` | Lc ~45 | placeholder/timestamp/角标 | 25% |
| `textInverse` | `#FFFFFF` | — | 按钮上的反色文字 | 10% |

**为什么用 RGBA 透明度而不是纯色值**？  
透明度让文字在不同 Layer 上（白卡片 vs 奶油背景）自动微调，比硬编码 3 套色值更优雅，且 dark mode 下只需翻转底色不需要重定义文字。

### 1.4 语义色

| 语义 | Token | 色值 | 配对浅底（透明 12%） | 适用场景 |
|------|-------|------|--------|---------|
| success | `success` | `#3FCC93` | `rgba(63, 204, 147, 0.12)` | 登录成功/认证通过/支付成功 |
| error | `error` | `#ED5A5A` | `rgba(237, 90, 90, 0.12)` | 验证码错/密码错/网络失败 |
| warning | `warning` | `#FFC74D` | `rgba(255, 199, 77, 0.12)` | 即将过期/低余额/弱密码提示 |
| info | `info` | `#57A8F0` | `rgba(87, 168, 240, 0.12)` | 公告/帮助/中性提示 |

**设计准则**：
- success ≠ primary（不要用主色表示成功，避免"任何操作都成功了"的视觉麻木）
- error 选 `#ED5A5A` 而不是 `#FF3B30`：柔和红，不会让用户感到"被吼"，符合治愈风
- warning 与 accent 同源（都是奶油黄系），整体色温保持温暖一致

### 1.5 渐变系统

| 名称 | CSS 值 | 应用场景 | 方向理由 |
|------|--------|---------|---------|
| `primary-gradient` | `linear-gradient(135deg, #FF6F91 0%, #FFB1A6 100%)` | 主 CTA（登录/发布/确认） | 135° 左上→右下，符合视线自然流向；终点用偏珊瑚色避免单调 |
| `success-gradient` | `linear-gradient(135deg, #6FE2A8 0%, #A3F0D0 100%)` | 成功反馈背景（短暂） | 同方向保持一致 |
| `warm-glow-gradient` | `radial-gradient(circle at 50% 0%, rgba(255,215,119,0.18) 0%, transparent 60%)` | 装饰：从顶部洒下的温暖光晕 | 模拟"阳光从上方照下"，营造场景感 |

**禁用**：
- ❌ 不要做 primary→secondary（红→绿）的渐变，色相跨度太大会显得廉价
- ❌ 文字渐变（`gradientHeading: false` 已在 decorationRules 定义）
- ❌ 多色（3+ 色）渐变

### 1.6 透明度规则

| 透明度 | 使用场景 | 视觉效果 |
|---------|---------|---------|
| 4-6% | 极淡背景区分（hover/卡片底色变体） | 几乎看不见，仅暗示分组 |
| 10-12% | 选中态背景 / 浅底语义色 | 明确可感知 |
| 20-25% | 装饰光晕 / 氛围色块 | 存在但不抢戏 |
| 40-50% | 蒙层 / 已读态 / 禁用文字 | 明显弱化 |
| 75-85% | 毛玻璃底（少用） | 半遮挡保留下方上下文 |

---

## 2. 间距系统

### 2.1 基数与 Scale（8px 基数 + 2px 衍生）

| Token | 值 | 典型使用场景 |
|-------|------|------------|
| `2xs` | 2px | 图标内描边补偿 / 边框宽度 |
| `xs` | 4px | 图标-文字间隙 / 角标内 padding |
| `sm` | 8px | 紧凑列表 / 行内元素间距 |
| `md` | 16px | **页面横边距（铁律）** / 组间距 |
| `lg` | 24px | 卡片内边距 / 大组间隔 |
| `xl` | 32px | 区块间距 / 表单标题→第一项 |
| `2xl` | 48px | 页面节段（如 Logo → 表单） |
| `3xl` | 64px | 空状态顶部留白 |

**选 8px 基数的理由**：iOS Apple HIG 推荐值 + Android Material 的 4dp/8dp 双基；2px 衍生让 icon padding 等微距灵活。

### 2.2 按组件类型的间距规范

| 组件 | padding | gap | margin | 理由 |
|------|:--------------:|:-----------:|:-------------:|------|
| 页面容器 | `0 16px` | — | — | 移动端 393px 宽，左右 16px 是触摸热区+视觉呼吸的平衡 |
| 卡片(form-card) | `24px 20px` | `16px` | `0 16px` | 比页面 padding 稍内缩，避免"卡片贴边"的廉价感 |
| 列表项 | `12px 16px` | `8px`(内部) | `0` | 触摸目标 ≥44px 高度（12+18+12+ 内容 = 50+） |
| 输入框 | `0 16px` | — | `0 0 16px 0` | 高度 48px，左右 16px 是字体 14px 的 ~1× 留白 |
| 按钮 lg | `0 24px` | `8px`(图标↔文字) | — | 高度 50px，符合 Fitts 定律的"易点"区间 |
| 按钮 md | `0 20px` | `8px` | — | 高度 44px = iOS HIG 最小触摸目标 |
| Sheet | `24px 20px 32px` | `16px` | — | 底部多 8px 给安全区+视觉舒适 |
| Modal | `32px 24px 24px` | `20px` | `auto` | 标题区域更宽松，加强"重要"暗示 |

---

## 3. 圆角系统

| Token | 值 | 使用场景 | 为什么这个值 |
|-------|------|---------|------------|
| `none` | 0 | 全屏图片/视频 | 边到边的沉浸感 |
| `sm` | 6px | 小标签 / 输入框聚焦 ring | 轻微圆化保持方正辨识 |
| `md` | **12px** | **输入框 / 小卡片（最常用）** | 友好但不过度圆润，与字号 14-16px 比例协调 |
| `lg` | 16px | 动态卡片 / 图片 | 暗示"独立内容单元" |
| `xl` | 24px | 弹窗 / 底部抽屉顶部 | 明确的"浮层"信号 |
| `2xl` | 32px | 特殊高亮卡片（胶囊解锁） | 大圆角 = 仪式感 |
| `full` | 9999px | 头像 / 胶囊按钮 / 主 CTA / Tab 高亮 | **本主题主 CTA 使用 full 圆角**（关键风格特征） |

**风格红线**：
- 主按钮（submit-btn 类）一律 `radius-full`（高度 50px → 25px 圆角），这是青春治愈风的核心视觉特征
- 输入框统一 `radius-md = 12px`，与按钮的 full 形成方圆对比
- 任何区域**禁止直角**（除全屏图片），即使是 1px 描边的小元素也至少 `radius-sm`

---

## 4. 字体系统

### 4.1 字体族

```
font-family: Nunito, "PingFang SC", -apple-system, BlinkMacSystemFont,
             "Helvetica Neue", sans-serif;
```

**选 Nunito 的理由**：
- 西文圆体（终端字形圆润），与"治愈圆角"主题视觉一致
- 开源免费（Google Fonts），可商用
- 字重覆盖 200-900，9 档够用
- 中文回退 PingFang SC（iOS）+ 系统默认（Android Roboto-CN）

### 4.2 字号 Scale

| Token | 大小 | 字重 | 行高 | 字间距 | 使用场景 | 配色 |
|-------|------|------|------|--------|---------|-----------|
| `display` | 48px | 800 | 1.15 | 0 | 启动页/胶囊解锁/特殊大标题 | primary |
| `h1` | 36px | 700 | 1.2 | 0 | 页面主标题（如登录页"欢迎回来"） | textPrimary |
| `h2` | 28px | 700 | 1.25 | 0 | 弹窗标题/区块大标题 | textPrimary |
| `h3` | 22px | 600 | 1.3 | 0 | 卡片主标题 | textPrimary |
| `h4` | 18px | 600 | 1.35 | 0 | 列表项主文 | textPrimary |
| `h5` | 16px | 600 | 1.4 | 0 | 小标题/标签 | textPrimary |
| `body-lg` | 16px | 400 | 1.5 | 0 | 重要正文 | textPrimary |
| `body` | **14px** | 400 | 1.5 | 0 | **默认正文** | textPrimary/Secondary |
| `caption` | 12px | 400 | 1.4 | 0 | 时间/位置/计数 | textTertiary |
| `overline` | 10px | 600 | 1.4 | 0.06em | 上标小字（标签头） | textTertiary |

**字号使用铁律**：
- 单页面字号档位 **≤ 5 档**（避免视觉层次混乱）
- 表单页推荐组合：h1 + h5 + body + caption（4 档）
- 主按钮文字固定 `h5` 即 16px 600（不用 body 14px，避免按钮显单薄）

---

## 5. 阴影系统

### 5.1 标准阴影

| Token | CSS 值 | 使用场景 | 层级感 |
|-------|-------|---------|--------|
| `sm` | `0 2px 6px rgba(255,111,145,0.08), 0 1px 2px rgba(45,36,56,0.04)` | 卡片悬浮一点点 | 轻微 |
| `md` | `0 4px 16px rgba(255,111,145,0.10), 0 2px 4px rgba(45,36,56,0.04)` | Toast/下拉 | 明确悬浮 |
| `lg` | `0 8px 28px rgba(255,111,145,0.12), 0 4px 8px rgba(45,36,56,0.05)` | 浮动按钮/弹窗 | 高层级 |
| `xl` | `0 16px 48px rgba(255,111,145,0.14), 0 8px 16px rgba(45,36,56,0.06)` | Modal/底部抽屉 | 最高层 |

**关键设计决策**：**所有阴影带主色微调（带粉色味）**，而不是纯灰色阴影。理由：
- 纯灰阴影（rgba(0,0,0,X)）显得"工业感、企业感"，与治愈风冲突
- 带 8-14% 透明度的主色，让阴影"呼吸感"更强，整体氛围更暖
- 第二层阴影用深紫棕（textPrimary 同源）做基础深度，避免纯彩色阴影过于飘

### 5.2 发光变体（仅用于强 CTA 或激活态）

| 名称 | 值 | 场景 |
|------|------|------|
| `glow-primary` | `0 0 20px rgba(255, 111, 145, 0.35)` | 主 CTA hover / 选中 Tab |
| `glow-success` | `0 0 16px rgba(63, 204, 147, 0.30)` | 登录成功瞬间反馈 |

**用量约束**：单屏 ≤ 1 个发光元素，否则丧失"高亮"语义。

---

## 6. 动效系统

### 6.1 缓动函数

| 名称 | 值 | 使用场景 | 视觉感受 |
|------|------|---------|---------|
| `transitions.fast` | `200ms cubic-bezier(0.34, 1.56, 0.64, 1)` | 点击/小切换 | spring 微回弹，活力 |
| `transitions.normal` | `300ms cubic-bezier(0.34, 1.56, 0.64, 1)` | 按钮按下/卡片展开 | 正常弹性，有"弹一下"的质感 |
| `transitions.slow` | `500ms cubic-bezier(0.22, 1, 0.36, 1)` | 缓慢出场 | 平滑出场无回弹，避免拖沓感 |
| `transitions.page` | `transform 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease-out` | 页面 push/modalUp | 现代 iOS 风 |

**spring 选 `cubic-bezier(0.34, 1.56, 0.64, 1)` 的理由**：
- 终点超调（最大值 1.56）模拟物理回弹
- 比标准 spring (1.275) 更明显，符合"年轻活泼"的主题
- 不会过度 bouncy（业内称 wobble），保持优雅

### 6.2 时长规范

| 时长 | 使用场景 | 为什么 |
|------|---------|--------|
| 100-150ms | 触觉反馈/即时点击 | 必须 < 200ms 才不会"感觉延迟" |
| 200ms | 按钮 press/hover/微变化 | spring 回弹需要时间展开 |
| 300ms | 卡片展开/Tab 切换/按钮按下完整 | 用户能清晰看到变化路径 |
| 350-500ms | 页面转场/Sheet 弹出 | 切换感强但不拖 |
| 600-800ms | 状态机切换的复合动效 | 多步序列（如 spinner→checkmark→fade） |
| 2-3s | 循环动画（呼吸/进度等待） | 慢循环避免视觉疲劳 |

### 6.3 标准动画模式

| 模式 | 触发 | 效果 | 参数 |
|------|------|------|------|
| 按压反馈 | press | `scale(0.97)` + shadow 收缩 | 200ms spring |
| 进入弹跳 | 首次出现 | `scale(0.92→1.02→1)` | 400ms spring |
| 错误 shake | 校验失败 | `translateX(0→-4→4→-4→4→0)` | 400ms ease-out |
| 成功 checkmark | submit success | SVG path stroke-dashoffset 0→length | 300ms ease-out |
| 倒计时数字翻转 | 60s 倒计时 | translateY(0→-100%) + opacity | 200ms ease-out（每 1s 触发） |
| 输入框 label 上浮 | focus 或 value 非空 | `translateY(-22px) scale(0.85)` | 200ms ease-out |

---

## 7. 装饰系统

### 7.1 装饰策略（与 decorationRules 对齐）

| 类型 | 策略 | 说明 |
|------|-----|------|
| 背景 | `solid`（纯色） | 不做大面积渐变背景，保持奶油底色干净 |
| 边框 | `subtle`（细微 1px borderLight） | 避免重描边的"廉价表单"感 |
| 阴影 | `soft`（柔和带主色） | 见 §5.1 |
| 动效 | `spring`（弹性） | 见 §6.1 |
| 图标 | `outline`（描边） | 见 §7.2 |
| 圆角 | `rounded`（圆润） | 见 §3 |
| 文字 | `gradientHeading: false`, `accentUnderline: false` | 不做花哨文字效果 |

### 7.2 图标规范（iconSpec）

| 属性 | 值 | 说明 |
|------|------|------|
| 风格 | outline（线性） | 手绘感 outline，与圆角主题一致 |
| 线宽 | 2.0px | 在 24×24 容器内清晰可辨 |
| 线条端点 | round | 圆头端点，强化柔和感 |
| 拐角 | round（半径 2px） | 内拐圆角，避免尖锐 |
| 默认色 | `textSecondary` | rgba(45,36,56,0.65) |
| 激活色 | `primary` | #FF6F91 |
| 失活色 | `textTertiary` | rgba(45,36,56,0.42) |
| 容器比例 | 0.55 | 图标占容器 55%（24px 容器 → 13.2px 图标） |
| 描边补偿 | 启用 | 视觉权重一致性 |

**激活态变化**：
- opacity: 0.5 → 1.0
- strokeWidth: 2.0 → 2.3（轻微加粗）
- color: textTertiary → primary

### 7.3 装饰元素分类（页面级装饰预算）

按 `decoration-elements-guide.md` 6 大类，本主题各类使用准则：

| 类型 | 使用强度 | 典型场景 |
|------|---------|---------|
| **光效** | 弱（仅顶部温暖光晕，rgba 18%） | 登录页/启动页顶部 |
| **有机形** | 中（粉色/绿色色块装饰） | 空状态/onboarding |
| **几何** | 极少 | 不用棱角分明几何（与圆角主题冲突） |
| **纹理** | 不用 | 噪点/格纹与温暖治愈感冲突 |
| **符号** | 中（emoji-style 手绘图标） | 任务/胶囊/成就 |
| **裁剪** | 弱 | 仅卡片圆角，不做斜切等"利落"裁剪 |

**单屏装饰用量上限**：
- 装饰元素总视觉权重 ≤ 12（满分 30）
- 主装饰（光晕）≤ 1 个
- 辅装饰（小图形）≤ 3 个

---

## 8. 组件状态规范（stateSpec）

| 状态 | 视觉变化 | 说明 |
|------|---------|------|
| `hover` | 亮度 +5%, shadow ↑1 级, scale(1.03), 200ms spring | 桌面端鼠标悬浮 |
| `active`(pressed) | 亮度 -5%, shadow ↓1 级, scale(0.97), 200ms spring | 触摸按下 |
| `focus` | 2px primary ring, 2px offset, 带动画 | 键盘 Tab 聚焦或输入框激活 |
| `disabled` | opacity 0.45, 无阴影, cursor:not-allowed, 不变灰度（保持彩色） | 不可操作 |
| `loading` | opacity 0.85, primary spinner, 可选骨架屏 | 异步进行中 |

**关键决策**：disabled 状态**保留彩色**而不是灰度化（grayscale: false），理由：
- 治愈风的核心是色彩，灰度化会让按钮看起来"死了"
- 仅靠降透明度 + 文字提示，用户依然能感知"这是个按钮，只是暂时不能点"

---

## 9. 自定义 Token（custom）

| Token | 值 | 用途 |
|-------|------|------|
| `bottomTabHeight` | 68px | 底部 4-Tab 高度（含 iPhone 安全区） |
| `topNavHeight` | 44px | 顶部导航栏高度（不含状态栏） |
| `fabSize` | 56px | 首页发布浮动按钮直径 |
| `avatarMd` | 40px | 列表/会话头像 |
| `avatarLg` | 64px | 个人主页/卡片大头像 |

---

## 10. Dark Mode 预留（V1.0 不开放）

主要 override：
- `background`: #1F1318（暗紫棕底，保持紫色调）
- `surface`: #2A1B22
- `textPrimary`: rgba(255, 250, 246, 0.92)（反色）
- 阴影改为纯黑 35-65% 透明度（暗色环境下主色阴影看不出，纯黑更清晰）
- `primaryLight`: #4A1F2C（暗化）
- 其余色保持不变（primary/secondary/accent 在 dark 上也漂亮）

V1.0 不开放给用户，仅作为后续迭代基线。

---

## 11. 一致性自检清单（每个 visual.md 必须对照）

- [ ] 全部色值来自本文 Token（无自造 hex/rgba）
- [ ] 字号在 10 档 scale 内（无自造 px 值）
- [ ] 间距是 2/4/8/16/24/32/48/64 之一
- [ ] 圆角是 0/6/12/16/24/32/9999 之一
- [ ] 动效缓动 = `cubic-bezier(0.34, 1.56, 0.64, 1)`（spring）或 `cubic-bezier(0.22, 1, 0.36, 1)`（slow）
- [ ] 图标统一 outline 2px round
- [ ] 主 CTA 圆角 = `radius-full`
- [ ] 阴影含主色微调（无纯灰阴影）
- [ ] 单页装饰权重总和 ≤ 12
- [ ] disabled 不灰度化（保留彩色 + 0.45 透明度）

---

## 附录 A：本文档与 theme.json 的对应关系

| 本文章节 | theme.json 字段 |
|---------|----------------|
| §0 风格 DNA | `intent` |
| §1 色彩 | `tokens.colors` |
| §2 间距 | `tokens.spacing` |
| §3 圆角 | `tokens.radius` |
| §4 字体 | `tokens.typography` |
| §5 阴影 | `tokens.shadows` |
| §6 动效 | `tokens.transitions` |
| §7.1 装饰 | `decorationRules` |
| §7.2 图标 | `iconSpec` |
| §8 状态 | `stateSpec` |
| §9 自定义 | `tokens.custom` |
| §10 Dark | `colorSchemes[1]` |

**契约**：design-plan/**/visual.md 引用 Token 时**只用本文名称**（如 `$token:primary`），不用直接 hex。executor 在搭建时由 MCP 自动从项目 ThemeConfig 解析为真实色值。
