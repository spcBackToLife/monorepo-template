# 足迹地图（主页）— 视觉设计分析

> 层级: L1 页面统筹 | 上级: design-system.md | 页面类型: 地图/Feed(内容丰富型)

---

## 1. 情感与氛围目标

### 1.1 情感定位

| 维度 | 回答 |
|------|------|
| 用户此刻的心理状态 | 刚打开App/从其他Tab切换来，带着「看看附近有什么有趣的」的探索好奇心 |
| 目标感受 | **沉浸、活跃、有温度** — 像走进一个正在举办夜间派对的校园广场 |
| 情绪曲线 | 好奇(进入) → 发现(看到气泡) → 惊喜(点开有趣内容) → 行动(发布/互动) |
| 与主题风格的关系 | 最强体现「午夜校园发光派对」— 暗色地图底+荧光气泡=核心品牌视觉 |

### 1.2 品牌感要素

- **荧光气泡漂浮在暗色地图上** — 即使截图出去也能立刻认出"那个校园社交App"
- 地图不是冷冰冰的导航工具，而是一个「活着的、会呼吸发光的社交场域」
- 本页是App打开后的第一印象页面，品牌视觉语言的最核心载体

---

## 2. 视觉层级设计

### 2.1 空间深度

```
[最深层] ─── 暗色地图底 (Layer0 #0D0D14 + 简化地图线条)
    ↑         地图道路/建筑用 Layer1/Layer2 色区分，极低对比度
[氛围层] ─── 角落渐变光晕 (primary 12%, 左下角大圆模糊)
    ↑         营造「午夜天空」的深邃感
[内容层] ─── 动态气泡 (高饱和发光圆形，视觉焦点)
    ↑         用户头像/预览卡片也在此层
[强调层] ─── FAB发布按钮 (primary-gradient + glow + 呼吸动效)
    ↑         全页面最强视觉权重，引导发布
[覆盖层] ─── 预览卡片Sheet / NavBar毛玻璃
              临时覆盖，模糊+暗化下层
```

### 2.2 视觉权重分配

| 元素 | 视觉权重(1-10) | 实现手段 | 为什么 |
|------|:-:|---------|--------|
| FAB发布按钮 | 9 | 渐变+glow+呼吸动效+大尺寸(56px) | 核心CTA，引导用户创造内容 |
| 动态气泡(未读) | 7 | 高饱和色+微浮动+内阴影 | 内容发现的入口 |
| 定向动态气泡 | 8 | 金色+脉冲动效+闪烁 | 特殊气泡需要比普通更引人注目 |
| 预览卡片 | 6 | 毛玻璃底+阴影+层级 | 信息承载但不抢地图体验 |
| NavBar | 2 | 毛玻璃半透明 | 导航工具，隐于背景 |
| 地图底图 | 1 | 极低对比度暗色线条 | 空间参考但绝不抢注意力 |

### 2.3 视觉流向

```
进入页面 → 视线首先落在 [地图中心附近的荧光气泡群]
         → 被 [最近/未读气泡的浮动动效] 吸引
         → 扫视附近还有什么气泡 [由近到远扩散注意力]
         → 如果想发布 → 视线被右下角 [FAB呼吸glow] 引导
         → 如果想探索 → 点击气泡 → 视线转向底部弹出的 [预览卡片]
```

### 2.4 组件视觉预算分配

| 组件 | 页面中的角色 | 视觉权重(1-10) | 允许的视觉手段 | 装饰密度上限 |
|------|:-:|:-:|-------------|:-:|
| GlowButton(FAB) | 主角-CTA | 9 | 渐变+glow+呼吸动效 | 密(按钮本身就是焦点) |
| MapBubble | 主角-内容 | 7 | 纯色/渐变填充+外glow+浮动 | 中(多个共存不能太花) |
| PreviewCard | 配角-信息 | 5 | 毛玻璃+阴影+圆角 | 少(信息载体不抢注意力) |
| NavBar | 工具-导航 | 2 | 毛玻璃 | 极少(隐于背景) |
| TabBar | 工具-导航 | 2 | 毛玻璃+选中glow | 极少 |

⚠️ 全页面视觉元素总权重: 9+7+5+2+2 = 25 (≤30 ✓)
⚠️ 主角组件2个: FAB + MapBubble (≤2 ✓)

---

## 3. 视觉手段清单

### 3.1 色彩运用

| 色彩手段 | 具体描述 | 面积/位置 | 营造的感受 | Token引用 |
|---------|---------|---------|-----------|----------|
| 暗色地图底 | Layer0 #0D0D14 全屏 | 100%底色 | 深邃午夜感 | Layer0 |
| 气泡蓝 | Primary #4F8CFF 实心圆 | 单个气泡16-24px | 科技感+可发现性 | primary |
| 定向金 | Gold #FFB830 实心圆 | 同上+脉冲扩大 | 珍贵/特殊/惊喜 | gold |
| FAB渐变 | primary-gradient 135° | 56px圆形按钮 | 核心行动引导 | primary-gradient |
| 角落氛围 | Primary 12%大圆模糊 | 左下角,r≈120px | 空间深度+不空洞 | primary at 12% |

### 3.2 光影效果

| 光影手段 | 具体描述 | 应用对象 | 营造的感受 | 参数 |
|---------|---------|---------|-----------|------|
| FAB外发光 | primary色扩散阴影 | GlowButton | "夜空中最亮的星" | 0 0 20px rgba(79,140,255,0.4) |
| 气泡外发光 | 同色微弱扩散 | MapBubble | "地面上的光点" | 0 0 8px rgba(79,140,255,0.3) |
| 金色气泡glow | gold色扩散 | 定向动态气泡 | "珍贵的宝物" | 0 0 12px rgba(255,184,48,0.4) |
| 预览卡片阴影 | 下方深色阴影 | PreviewCard | 浮层悬浮感 | 0 8px 24px rgba(0,0,0,0.5) |
| NavBar下阴影 | 极微弱底部阴影 | NavBar | 与内容层分离 | 0 1px 0 rgba(255,255,255,0.06) |

### 3.3 装饰元素

| 装饰 | 类型 | 位置 | 尺寸 | 色彩/透明度 | 动效 | 作用 | 与主题的关系 |
|------|:-:|------|------|:-:|------|------|:-:|
| 角落光晕 | 光效/渐变光晕 | 左下角溢出 | r≈120px | primary at 12% | 静止 | 空间深度+填充角落空白 | "午夜天空一角的远光" |
| 微光点 | 光效/光斑 | 地图空白区散布 | 3-5px | primary at 8% | 缓慢明灭(3s) | 地图"活着"的呼吸感 | "星光点点" |

> **装饰用量**: 地图/Feed类页面装饰上限2-3个。这里2个(角落光晕+微光点)，内容(气泡)本身承担了大部分视觉丰富度。

### 3.4 质感与肌理

| 质感手段 | 应用区域 | 参数 | 营造的感受 |
|---------|---------|------|-----------|
| 毛玻璃 | NavBar/TabBar/PreviewCard | blur:20px, saturate:1.2, bg:rgba(13,13,20,0.75) | 层级分明+通透的现代感 |
| 地图简化纹理 | 全屏地图底 | 道路线rgba(255,255,255,0.06), 建筑rgba(255,255,255,0.03) | 空间参考但不喧宾夺主 |

### 3.5 图标与图形

| 图标/图形 | 在哪里 | 功能 | 风格要求 | 尺寸 |
|----------|--------|------|---------|------|
| 定位回位 | 右下FAB上方 | 回到当前位置 | 线性1.5px/圆角端点/指南针变体 | 20×20 |
| 视图切换 | 右上角 | 地图⟷列表切换 | 线性1.5px/网格↔地图形态 | 20×20 |
| 发布加号 | FAB内部 | 触发发布页 | 粗线2px/居中十字 | 24×24 |
| 气泡内数字 | 聚合气泡中心 | 显示动态数量 | caption字体/白色/居中 | 动态 |

### 3.6 动效设计

| 动效 | 触发条件 | 视觉效果 | 营造的感受 | 参数 |
|------|---------|---------|-----------|------|
| FAB呼吸 | idle循环 | glow扩散(20→24px→20px) + opacity(0.4→0.5→0.4) | "按我按我"的引导 | 3s ease-in-out infinite |
| 气泡浮动 | idle循环 | translateY(±2px) | 地图是"活着的" | 2.5s ease-in-out infinite |
| 定向气泡脉冲 | idle循环 | scale(1→1.1→1) + glow扩散 | 特殊/珍贵/注意 | 2s ease-in-out infinite |
| 气泡出现 | 数据加载/新发现 | scale(0→1.05→1) + opacity(0→1) | 从地面"冒出来" | 400ms spring |
| 预览卡片弹出 | 点击气泡 | translateY(100%→0) + opacity | 信息浮出 | 300ms ease-out |
| 气泡聚焦 | 点击气泡 | scale(1→1.2) + glow增强 | 选中确认 | 200ms ease-out |
| 微光点明灭 | idle循环 | opacity(0.08→0.15→0.08) | 星空闪烁 | 3s ease-in-out infinite, stagger |

---

## 4. 实现分类

### 4.1 分类规则

```
CSS能精美实现 → 样式规格（index.md）
  ✓ 纯色/渐变背景, box-shadow(含glow), 圆角, 毛玻璃, 简单transform动画
  
需要Canvas绘制 → 素材文档（materials/）
  ✓ 多笔画图标(定位/视图切换/加号), 不规则形状

需要动效编排 → 动效规格（index.md状态转换）
  ✓ 气泡出现序列(stagger), 预览卡片展开
```

### 4.2 逐项分类结果

| # | 视觉元素 | 分类 | 输出目标 | 理由 |
|---|---------|:-:|---------|------|
| 1 | FAB渐变背景+glow | CSS | index.md 区块样式 | linear-gradient + box-shadow 完美实现 |
| 2 | FAB呼吸动效 | CSS动效 | index.md 状态转换 | animation: glow-pulse infinite |
| 3 | 气泡蓝色圆形+glow | CSS | index.md 区块样式 | border-radius:50% + background + box-shadow |
| 4 | 气泡浮动动效 | CSS动效 | index.md 状态转换 | animation: float infinite |
| 5 | 角落渐变光晕 | CSS | index.md 区块样式 | radial-gradient + position:absolute |
| 6 | NavBar毛玻璃 | CSS | index.md 区块样式 | backdrop-filter: blur(20px) |
| 7 | 定位回位图标 | 素材 | materials/I-01 | 多笔画指南针形状,CSS无法实现 |
| 8 | 视图切换图标 | 素材 | materials/I-02 | 网格/地图两种形态,需要精确路径 |
| 9 | 发布加号图标 | CSS | index.md 区块样式 | 十字线可用伪元素/border实现,但为系列统一建议素材 |
| 10 | 发布加号图标(修正) | 素材 | materials/I-03 | 与系列图标统一风格,用canvas绘制保证一致性 |
| 11 | 微光点装饰 | CSS | index.md 区块样式 | 小圆div + opacity动画即可 |
| 12 | 预览卡片弹出动效 | CSS动效 | index.md 状态转换 | transform + opacity transition |
| 13 | 地图气泡聚合数字 | CSS | index.md 区块样式 | 纯文字+居中布局 |

---

## 5. 素材需求清单

| 素材ID | 名称 | 类型 | 设计意图 | 尺寸 | 色彩方向 | 状态变体数 | 优先级 |
|--------|------|------|---------|------|---------|:-:|:-:|
| I-01 | locate-pulse | Icon | 「回到我的位置」操作识别 | 20×20 | text-secondary / primary(按下) | 2 | P0 |
| I-02 | view-toggle | Icon | 地图⟷列表视图切换识别 | 20×20 | text-secondary | 2(地图态/列表态) | P0 |
| I-03 | publish-plus | Icon | FAB中心的发布加号,品牌统一 | 24×24 | text-primary(白) | 1 | P0 |
| I-04 | bubble-arrow | Icon | 预览卡片「查看详情」箭头 | 16×16 | primary | 1 | P1 |
| I-05 | empty-footprint | Illustration | 空状态「这里还没人留下足迹」引导情绪 | 120×120 | primary+secondary低饱和 | 1 | P1 |

**素材设计意图速写**:
- I-01: 简化指南针/定位针，线性1.5px，idle态text-secondary，按下态primary，暗示「找到自己」
- I-02: 两种形态：网格(4个小方块排列)表示列表 / 菱形+曲线表示地图；线性1.5px
- I-03: 居中粗十字(2px)，端点round，与系列图标统一但稍粗以匹配56px FAB的视觉重量
- I-04: 右指箭头，chevron形态，线性1.5px，primary色暗示可交互
- I-05: 简化人形轮廓+足迹虚线路径+一个发光定位pin，传达「等你来留下第一个印记」

---

## 6. 样式规格清单

| 元素 | 所在节点 | CSS属性 | 值 | 为什么 |
|------|---------|---------|------|--------|
| 页面底色 | root | background | #0D0D14 | Layer0，地图暗色基底 |
| FAB按钮背景 | fab-btn | background | linear-gradient(135deg, #4F8CFF, #7C5CFC) | 品牌主渐变,最强CTA |
| FAB发光 | fab-btn | box-shadow | 0 0 20px rgba(79,140,255,0.4) | glow-primary引导注意力 |
| FAB尺寸 | fab-btn | width/height | 56px / 56px | 舒适触摸+足够视觉重量 |
| FAB圆角 | fab-btn | border-radius | 999px | 完全圆形 |
| 气泡底色 | bubble | background | #4F8CFF | primary纯色,暗底上醒目 |
| 气泡发光 | bubble | box-shadow | 0 0 8px rgba(79,140,255,0.3) | 微glow暗示"发光物" |
| 气泡尺寸 | bubble | width/height | 40px / 40px (标准) | 地图上可辨识但不遮挡 |
| 气泡圆角 | bubble | border-radius | 999px | 完全圆形 |
| 定向气泡色 | bubble.targeted | background | #FFB830 | gold标识特殊 |
| 定向气泡glow | bubble.targeted | box-shadow | 0 0 12px rgba(255,184,48,0.4) | 金色glow强调珍贵 |
| NavBar毛玻璃 | nav-bar | backdrop-filter | blur(20px) saturate(1.2) | 通透层级感 |
| NavBar背景 | nav-bar | background | rgba(13,13,20,0.75) | 毛玻璃底色 |
| NavBar边框 | nav-bar | border-bottom | 1px solid rgba(255,255,255,0.06) | 极微弱分隔 |
| 角落光晕 | ambient-glow | background | radial-gradient(circle at 20% 80%, rgba(79,140,255,0.12), transparent 70%) | 左下角深邃氛围 |
| 角落光晕定位 | ambient-glow | position/inset | absolute, 0 | 全屏覆盖 |
| 预览卡片底 | preview-card | background | rgba(20,20,32,0.85) | Layer1+毛玻璃 |
| 预览卡片模糊 | preview-card | backdrop-filter | blur(20px) saturate(1.2) | 毛玻璃效果 |
| 预览卡片圆角 | preview-card | border-radius | 24px 24px 0 0 | 顶部大圆角=Sheet |
| 预览卡片阴影 | preview-card | box-shadow | 0 -8px 32px rgba(0,0,0,0.5) | 向上投影的悬浮感 |
| 微光点 | light-dot | background | rgba(79,140,255,0.1) | 星光点缀 |
| 微光点尺寸 | light-dot | width/height | 4px / 4px | 极小点缀 |
| 微光点圆角 | light-dot | border-radius | 999px | 圆形 |

---

## 7. 与全局风格的一致性检查

| 检查项 | 回答 |
|--------|------|
| 使用的色彩是否全部来自 design-system.md Token？ | ✅ 是，全部引用Token(primary/gold/Layer0/Layer1等) |
| 装饰元素是否符合全局装饰配方(科技暗色风)？ | ✅ 是，渐变光晕(主)+微光点(次)，完全匹配配方 |
| 光效风格是否与其他页面一致(glow系列)？ | ✅ 是，使用glow-primary/glow-gold标准参数 |
| 图标风格是否统一(线性1.5px/圆角端点)？ | ✅ 是，所有图标遵循统一线性规范 |
| 动效时长/缓动是否引用全局动效系统？ | ✅ 是，所有动效使用标准ease/spring/时长 |
| 装饰用量是否符合页面类型决策树？ | ✅ 地图/Feed类页面2个装饰(≤3上限) |

---

> 本文档完成后:
> - 素材需求清单(5个) → 指导 `materials/I-01~I-05.md` 创建
> - 样式规格清单 → 回写到 `index.md` 区块详细设计
> - 动效规格(3.6节) → 回写到 `index.md` 状态转换
> - 组件视觉预算(2.4节) → 指导各组件 visual.md 写作
