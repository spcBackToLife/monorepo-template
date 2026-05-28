# 校园地理社交 · 设计系统

> **版本**: v1.0 · 2026-05-28
> **主题**: 青春治愈风（D6 决策）
> **Token 来源**: `design-system/theme.json`（已写入设计编辑器项目）
> **受众**: 18-24 岁在校大学生 + 校友

---

## 1. 色彩系统

### 1.1 主色推导

| 角色 | 色值 | HSL 分解 | 选择理由 |
|------|------|---------|---------|
| Primary | `#FF6F91` | H346 S100% L72% | 草莓粉：温暖、年轻、有活力。与"校园社交"情感契合，不过于成熟也不幼稚 |
| Secondary | `#6FE2A8` | H146 S68% L66% | 薄荷绿：分裂互补色（346° → 146°，相距 160°），清新感平衡粉色的甜腻 |
| Accent | `#FFD777` | H43 S100% L73% | 奶油黄：暖调点缀，与粉色相邻但更活泼，用于装饰/胶囊高亮/任务 |
| Lavender | `#E8DFF5` | H264 S55% L92% | 极淡薰衣草：辅助装饰，用于胶囊/夜晚场景，增加梦幻治愈感 |

**主色关系分析**:
- Primary vs Secondary: 分裂互补（160°色相差），既有对比活力又不冲突
- 三色整体: 粉-绿-黄构成暖调三角，校园年轻感
- 面积约束: Primary ≤15%（CTA/强调）, Secondary ≤8%（成功/二级强调）, Accent ≤5%（装饰/点缀）

### 1.2 背景色层级

```
Layer 0 (页面底)  → #FFFAF6  (暖白奶油底，HSL 24° 100% 98.4%)
Layer 1 (卡片)    → #FFFFFF  (纯白表面，与底色 2.4% 亮度差)
Layer 2 (浮动)    → #FFFFFF  (同 Layer1，靠阴影区分层级)
Layer 3 (弹窗)    → #FFFFFF  (同 Layer1，靠阴影 + 蒙层区分)
```

| 层级 | 色值 | 区分方式 | 使用场景 |
|------|------|---------|---------|
| 页面底色 | `#FFFAF6` | 基底 | 所有页面背景 |
| 卡片表面 | `#FFFFFF` | 阴影 shadow-sm | 列表卡片/表单卡 |
| 悬浮面 | `#FFFFFF` | 阴影 shadow-lg | FAB/浮动按钮 |
| 弹窗面 | `#FFFFFF` | 阴影 shadow-xl + 蒙层 | Modal/Sheet |

**蒙层**: `rgba(45, 36, 56, 0.45)` — 深紫棕调，比纯黑蒙层更治愈柔和
**分割线**: `#F5EDE6` — 奶油浅色，不突兀

### 1.3 文字色层级

| Token | 色值 | APCA Lc (vs #FFFAF6) | 用途 | 频率 |
|-------|------|:---:|------|------|
| textPrimary | `rgba(45,36,56,0.92)` | ~90 | 标题/核心信息/正文 | 30% |
| textSecondary | `rgba(45,36,56,0.65)` | ~65 | 辅助文字/描述 | 40% |
| textTertiary | `rgba(45,36,56,0.42)` | ~45 | 占位符/时间戳 | 20% |
| textInverse | `#FFFFFF` | — | 按钮上/Badge上反色 | 10% |

**注意**: 文字底色为深紫棕 `#2D2438`（不是纯黑），通过透明度分层，使文字整体偏暖。

### 1.4 语义色

| 语义 | 色值 | 使用场景 | 浅底模式 |
|------|------|---------|---------|
| success | `#3FCC93` | 成功/通过/发送成功 | `rgba(63,204,147,0.1)` |
| error | `#ED5A5A` | 错误/校验失败/违规 | `rgba(237,90,90,0.1)` |
| warning | `#FFC74D` | 警告/即将过期/余额低 | `rgba(255,199,77,0.1)` |
| info | `#57A8F0` | 信息/帮助/引导 | `rgba(87,168,240,0.1)` |

### 1.5 渐变系统

本项目以纯色为主（`decorationRules.background.strategy = solid`），仅以下场景使用渐变：

| 名称 | CSS值 | 使用场景 |
|------|-------|---------|
| primary-soft | `linear-gradient(135deg, #FF6F91, #FF89A4)` | 主按钮 hover 微渐变（可选增强） |
| splash-bg | `linear-gradient(180deg, #FFE6EC 0%, #FFFAF6 100%)` | 启动页/登录页顶部氛围 |
| capsule-glow | `radial-gradient(circle, #FFD777 0%, transparent 70%)` | 胶囊解锁金色光效 |

### 1.6 透明度规则

| 透明度值 | 使用场景 | 应用 |
|---------|---------|------|
| 5% (0.05) | hover 背景色块 | 列表项/卡片 hover |
| 8-12% | 主色浅底 `primaryLight` #FFE6EC | 选中态/标签底色 |
| 20% | 装饰元素/失焦头像 | 背景装饰 |
| 45% | 蒙层 overlay | Modal 遮罩 |
| 65% | textSecondary 透明度 | 辅助文字 |

---

## 2. 间距系统

### 2.1 基数与 Scale

基数: **4px** — 选择理由: 移动端 4px grid 最灵活，所有间距都是 4 的倍数。

| Token | 值 | 典型使用场景 |
|-------|------|------------|
| 2xs | 2px | 极小（图标内描边间隙） |
| xs | 4px | 图标与文字间隙/标签内 padding |
| sm | 8px | 行内元素间距/紧凑列表内 |
| md | 16px | 页面水平边距/输入框间距/默认 gap |
| lg | 24px | 卡片内 padding/区块间距 |
| xl | 32px | 大区块分隔/页面节段 |
| 2xl | 48px | 极大留白/区域隔断 |
| 3xl | 64px | 顶部大空白/空状态 |

### 2.2 按组件类型的间距规范

| 组件/场景 | 内间距(padding) | 元素间距(gap) | 外间距(margin) | 理由 |
|----------|:--------------:|:-----------:|:-------------:|------|
| 页面容器 | `0 16px` | — | — | 两侧安全距 |
| 表单卡片 | `24px` | — | `0 0 16px 0` | 宽松呼吸感 |
| 输入框 | `12px 16px` | — | `0 0 12px 0` | 触摸友好 44px 高 |
| 按钮(lg) | `0 24px`，h=48px | `8px`(图标-文字) | — | 居中有呼吸 |
| 按钮(md) | `0 16px`，h=36px | `6px` | — | 紧凑辅助按钮 |
| 区块标题→内容 | — | `12px` | `24px`(上) | 标题-内容关联 |
| Modal/Sheet | `20px 20px 24px` | `16px` | — | 比卡片更宽松 |
| 底部按钮安全区 | `16px 16px 34px` | — | — | 含 SafeArea |

---

## 3. 圆角系统

| Token | 值 | 使用场景 | 视觉效果 |
|-------|------|---------|---------|
| none | 0 | 无圆角（少用） | 硬朗 |
| sm | 6px | 标签/小按钮/Badge | 轻微圆化 |
| md | 12px | 输入框/小卡片/辅助按钮 | 友好现代 |
| lg | 16px | 动态卡片/图片/表单卡 | 柔和有结构 |
| xl | 24px | 弹窗/底部抽屉顶部 | 明确浮层感 |
| 2xl | 32px | 特殊高亮卡片 | 极柔和 |
| full | 9999px | 头像/胶囊按钮/主按钮/Tab高亮 | 完全圆形/药丸形 |

**设计原则**: 重要性越高圆角越大（primary btn = full, input = md, card = lg）。呈现"有机柔软"的青春治愈感。

---

## 4. 字体系统

| Token | 大小 | 字重 | 行高 | 字间距 | 使用场景 |
|-------|------|------|------|--------|---------|
| display | 48px | 800 | 1.15 | — | 启动页/胶囊解锁（极少用） |
| h1 | 36px | 700 | 1.2 | — | 页面主标题 |
| h2 | 28px | 700 | 1.25 | — | 弹窗/区块标题 |
| h3 | 22px | 600 | 1.3 | — | 卡片标题 |
| h4 | 18px | 600 | 1.35 | — | 列表项主文 |
| h5 | 16px | 600 | 1.4 | — | 小标题/按钮文字 |
| body-lg | 16px | 400 | 1.5 | — | 动态正文/重要描述 |
| body | 14px | 400 | 1.5 | — | 默认正文 |
| caption | 12px | 400 | 1.4 | — | 辅助文字/时间/计数 |
| overline | 10px | 600 | 1.4 | 0.06em | 上标小字/标签/分组头 |

**字体族**: `Nunito, "PingFang SC", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`
- Nunito: 圆体英文，与青春治愈风契合
- PingFang SC: iOS 中文首选

---

## 5. 阴影系统

| Token | CSS值 | 使用场景 | 层级感 |
|-------|-------|---------|--------|
| sm | `0 2px 6px rgba(255,111,145,0.08), 0 1px 2px rgba(45,36,56,0.04)` | 卡片默认 | 轻微悬浮 |
| md | `0 4px 16px rgba(255,111,145,0.10), 0 2px 4px rgba(45,36,56,0.04)` | 下拉/Toast | 中层级 |
| lg | `0 8px 28px rgba(255,111,145,0.12), 0 4px 8px rgba(45,36,56,0.05)` | FAB/弹窗 | 高悬浮 |
| xl | `0 16px 48px rgba(255,111,145,0.14), 0 8px 16px rgba(45,36,56,0.06)` | 模态/抽屉 | 最高层 |

**特色**: 阴影带主色调粉色（`rgba(255,111,145,...)`），比灰色阴影更温暖治愈。双层阴影模式（主色大扩散 + 中性小聚焦）。

---

## 6. 动效系统

### 6.1 缓动函数

| 名称 | 值 | 使用场景 | 视觉感受 |
|------|------|---------|---------|
| spring | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 点击/切换/弹跳 | 有活力的微回弹 |
| smooth | `cubic-bezier(0.22, 1, 0.36, 1)` | 页面转场/无需弹跳 | 平滑减速 |
| ease-out | `ease-out` | 淡入淡出 | 自然消失 |

### 6.2 时长规范

| Token | 时长 | 使用场景 |
|-------|------|---------|
| fast | 200ms | 点击反馈/小切换/涟漪 |
| normal | 300ms | 按钮按下/卡片展开/Tab切换 |
| slow | 500ms | 页面出场（无回弹） |
| page | 350ms | 页面级 push/modalUp |

### 6.3 状态交互动效

| 状态 | 效果 | 参数 |
|------|------|------|
| hover | scale(1.03) + shadow升级 | fast 200ms spring |
| active/press | scale(0.97) + shadow降级 | fast 200ms spring |
| focus | border=primary + ring 2px offset 2px | animated |
| disabled | opacity 0.45 + 移除阴影 | — |
| loading | opacity 0.85 + spinner | — |

---

## 7. 图标系统

| 属性 | 规格 | 理由 |
|------|------|------|
| 风格 | Outline（线描） | 手绘+线描=青春治愈，轻盈不沉重 |
| 描边宽度 | 2px | 在 20-24px 容器中清晰可辨 |
| 端点 | round linecap + linejoin | 柔和不尖锐 |
| 内角圆化 | 2px cornerRadius | 与全局圆角体系呼应 |
| 容器比 | 0.55（图形占容器55%） | 留足内边距呼吸 |
| 默认色 | textSecondary `rgba(45,36,56,0.65)` | 不抢注意力 |
| 激活色 | primary `#FF6F91` | 高亮时用主色 |
| 禁用色 | textTertiary + opacity 0.4 | 明确弱化 |
| 尺寸系列 | 16/20/24/32px | 对应 caption/body/h4/h2 级 |

---

## 8. 基础组件统管规格

### 8.1 Button（按钮）

| 变体 | 背景 | 文字色 | 圆角 | 高度 | 字体 | 阴影 |
|------|------|--------|------|------|------|------|
| primary-lg | `#FF6F91` | `#FFFFFF` | full | 48px | h5 16px/600 | sm |
| primary-md | `#FF6F91` | `#FFFFFF` | full | 36px | body 14px/500 | none |
| secondary-lg | transparent, border 1px `#FF6F91` | `#FF6F91` | full | 48px | h5 16px/600 | none |
| ghost | transparent | `#FF6F91` | md | auto | body 14px/500 | none |
| text-link | transparent | `#FF6F91` | none | auto | body 14px/400 | none |

**状态矩阵**:

| 变体 | hover | active | disabled | loading |
|------|-------|--------|----------|---------|
| primary | bg→`#FF89A4` scale(1.03) | bg→`#FB406F` scale(0.97) | opacity 0.45 | spinner 替换文字 |
| secondary | bg→primaryLight | border→primaryActive | opacity 0.45 | spinner |
| ghost | bg→`rgba(255,111,145,0.05)` | bg→`rgba(255,111,145,0.1)` | opacity 0.45 | — |

### 8.2 Input（输入框）

| 属性 | 默认态 | focus 态 | error 态 | disabled 态 |
|------|--------|---------|---------|------------|
| 高度 | 48px | 48px | 48px | 48px |
| 背景 | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `rgba(45,36,56,0.03)` |
| 边框 | 1px `#FFE0E8`(淡粉) | 2px `#FF6F91`(primary) | 2px `#ED5A5A`(error) | 1px `#F5EDE6` |
| 圆角 | md (12px) | md | md | md |
| 文字 | textPrimary body-lg 16px | 同左 | 同左 | textTertiary |
| Placeholder | textTertiary | 上浮为 label (caption 12px) | 同 focus | textTertiary |
| 阴影 | none | `0 0 0 3px rgba(255,111,145,0.1)` | `0 0 0 3px rgba(237,90,90,0.1)` | none |

**Label 动效**: focus 时 placeholder 上浮到 top -8px，缩小 0.85 倍，200ms ease-out。

### 8.3 Link（文字链接）

| 属性 | 值 |
|------|------|
| 颜色 | primary `#FF6F91` |
| 字重 | 400（正文中）/ 500（独立） |
| 装饰 | none（默认），hover 时 underline |
| 按下 | `#FB406F` + scale(0.98) |

### 8.4 Tag / Badge

| 类型 | 背景 | 文字 | 圆角 | 高度 | 字体 |
|------|------|------|------|------|------|
| 标签 | `#FFE6EC`(primaryLight) | `#FF6F91` | full | 22px | caption 12px |
| 计数角标 | `#FF6F91` | `#FFFFFF` | full | 16px | overline 10px |
| 状态标签 | 语义色浅底 | 语义色 | sm 6px | 20px | caption 12px |

### 8.5 Switch（开关）

| 属性 | OFF | ON |
|------|-----|-----|
| 轨道色 | `#F5EDE6` | `#FF6F91` |
| 滑块 | `#FFFFFF` shadow-sm | `#FFFFFF` shadow-sm |
| 尺寸 | 轨道 48×28px，滑块 24px | 同左 |
| 动效 | thumb 滑动 + track 填充 200ms spring | — |

---

## 9. 间距使用决策表

| 元素关系 | 间距 | Token | 理由 |
|---------|------|-------|------|
| 页面顶部→第一内容 | 24-64px | lg~3xl | 视页面密度 |
| 表单字段之间 | 12px | md-4px | 紧凑但可区分 |
| 卡片之间 | 12-16px | 12~md | 卡片需呼吸 |
| 按钮→底部安全区 | 16px+SafeArea | md+34px | 避免误触 |
| 图标→文字 | 4-8px | xs~sm | 紧密关联 |
| 标题→正文 | 8px | sm | 标题领导正文 |
| 区块→区块 | 24-32px | lg~xl | 明确分隔 |

---

## 10. 装饰元素策略

| 规则 | 值 | 说明 |
|------|------|------|
| 装饰密度 | moderate | 有装饰但不喧宾夺主 |
| 背景策略 | solid | 不用复杂纹理，纯色 + 偶尔渐变 |
| 图标风格 | outline | 线描手绘感 |
| 圆角风格 | rounded | 大圆角有机感 |
| 装饰类型 | 几何装饰（圆/叶形）+ 手绘风 | 呼应青春治愈主题 |
| 装饰色 | 主色系低透明度变体 | 粉圆点/薄荷叶/奶油色块 |
| 装饰位置 | 页面角落/表单卡背后 | 不遮挡内容 |

---

## 11. 响应式约束

| 属性 | 规格 |
|------|------|
| 设计基准 | iPhone 15 Pro: 393×852px |
| 安全区顶部 | 59px (Dynamic Island) |
| 安全区底部 | 34px (Home Indicator) |
| 最大内容宽度 | 393px（无平板适配） |
| 底部 TabBar 高度 | 68px（含安全区） |
| 顶部导航高度 | 44px（不含状态栏） |
| 最小触摸区 | 44×44px |
| 键盘弹起 | 内容上推，CTA 按钮可见 |
