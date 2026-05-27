# 捞人主页 — 视觉设计分析

> 层级: L1 页面统筹 | 上级: design-system.md | 页面类型: 游戏化/特殊玩法(装饰:5-8)

---

## 1. 情感与氛围目标

### 1.1 情感定位

| 维度 | 回答 |
|------|------|
| 用户此刻的心理状态 | 从首页地图Tab切换到捞人Tab — 带着「无聊但想认识新人」的好奇心，期待惊喜和未知 |
| 目标感受 | **神秘、期待、游戏化** — 像深夜在海边撒网，不知道会捞到什么 |
| 情绪曲线 | 好奇(看到水面) → 兴奋(点击撒网) → 紧张期待(等待冒泡) → 惊喜/失落(结果浮出/空网) → 满足(打招呼成功) |
| 与主题风格的关系 | 将「午夜发光」推向极致 — 深海夜色+水下荧光，是全App最具氛围感和品牌辨识度的页面 |

### 1.2 品牌感要素

- **深色水面背景** — 独特的"深海社交"隐喻，截图即可识别App
- **撒网按钮的发光涟漪** — 像水面上的月光倒影，品牌化的互动仪式
- **卡片从水面浮出** — 独特的结果揭示方式，不是普通列表而是"捞起"
- **色彩策略**: secondary紫(#7C5CFC)为本页面主色调 — 区别于首页的primary蓝，暗示神秘/社交/午夜

---

## 2. 视觉层级设计

### 2.1 空间深度

```
[最深层] ─── 深海渐变底色(Layer0→更深) — 深海环境
    ↑
[氛围层] ─── 水面波纹+底部光晕+微光点 — 海底荧光生物感
    ↑
[内容层] ─── 撒网按钮+次数指示器+模式切换 — 核心交互
    ↑
[结果层] ─── 用户卡片(浮出态) — 撒网结果
    ↑
[覆盖层] ─── 打招呼Sheet/商店弹窗/引导浮层
```

| 层级 | 包含什么 | 视觉表现 | 与其他层的关系 |
|------|---------|---------|-------------|
| 最深层 | 深色渐变(更深的Layer0变体) | #08081A→#0D0D14 纵向渐变 | 营造"深海"感，比首页更暗 |
| 氛围层 | 水面波纹动画+角落光晕+散落微光点 | secondary at 8-15%, 大面积模糊+动态 | 核心差异化层，给页面"活着"的感觉 |
| 内容层 | FAB撒网按钮+次数●+底部模式Tab | 高对比,发光,清晰 | 用户操作焦点 |
| 结果层 | 用户卡片(从水面浮出时) | 毛玻璃+shadow-md+完整信息 | 撒网后临时出现,视觉最高 |
| 覆盖层 | 打招呼Sheet/引导 | 毛玻璃+遮罩 | 临时最高层 |

### 2.2 视觉权重分配

| 元素 | 视觉权重(1-10) | 实现手段 | 为什么这个权重 |
|------|:-:|---------|-------------|
| 撒网FAB按钮 | 9 | 大尺寸(80px)+渐变+脉冲glow+涟漪动效 | 核心操作,全页面唯一CTA |
| 水面波纹动画 | 6 | CSS动画+透明度交替+大面积 | 建立隐喻但不抢按钮注意力 |
| 次数指示器 | 4 | 小圆点+primary色实心/空心 | 信息性但不是操作焦点 |
| 底部模式切换 | 5 | 胶囊Tab+选中态发光 | 次要操作区 |
| 导航栏 | 2 | 毛玻璃+图标 | 工具层 |
| 结果卡片(出现时) | 8 | 毛玻璃+弹入动效+shadow | 结果揭示瞬间是视觉高潮 |
| 角落光晕装饰 | 3 | 大面积模糊+低透明度 | 氛围不干扰 |

### 2.3 视觉流向

```
进入页面 → 视线被中央 [深色水面氛围] 包裹(沉浸感)
         → 被 [撒网FAB按钮] 的脉冲发光吸引到中心偏下
         → 按钮下方的 [次数指示器] 告知可操作性
         → 视线自然下移到 [底部模式切换]
         → 操作后注意到 [顶部导航栏] 的商店/历史入口
```

### 2.4 组件视觉预算分配

| 组件 | 页面中的角色 | 视觉权重(1-10) | 允许的视觉手段 | 装饰密度上限 |
|------|:-:|:-:|-------------|:-:|
| FishingCard(结果卡片) | 主角-结果 | 8 | 毛玻璃+阴影+浮入动效+操作按钮glow | 中(卡片内需承载信息) |
| GreetingSheet(打招呼) | 配角-操作 | 5 | 毛玻璃+模板选中高亮 | 少(功能表单) |
| NavBar | 工具-导航 | 2 | 毛玻璃(继承通用) | 极少 |
| FAB(撒网按钮) | 主角-CTA | 9 | 渐变+大glow+涟漪+scale动效 | 密(按钮本身是视觉核心) |
| ModeSelector(模式切换) | 配角-切换 | 5 | 胶囊容器+选中glow | 少 |

⚠️ 全页面视觉元素总权重: 9+8+5+5+2 = 29 (≤30 ✓)
⚠️ 主角组件: 2个(FAB + FishingCard) — 但不同时出现(FAB在idle态/Card在result态) ✓

---

## 3. 视觉手段清单

### 3.1 色彩运用

| 色彩手段 | 具体描述 | 面积/位置 | 营造的感受 | Token引用 |
|---------|---------|---------|-----------|----------|
| 深海渐变底 | 180deg, #08081A→#0D0D14 | 100%底色(比标准Layer0更深) | 深海夜色,"潜入水中" | Layer0变体(更深) |
| Secondary紫主导 | #7C5CFC at各透明度 | 光晕/按钮渐变/装饰 | 神秘/社交/午夜 | secondary |
| 按钮渐变 | 135deg, #7C5CFC→#4F8CFF | 撒网FAB | "深海中的发光水母" | secondary→primary |
| 模式切换选中 | secondary at 15% 底色 | 选中Tab | 当前模式标识 | secondary at 15% |
| 炸弹模式暖色 | accent-gradient at 10%背景偏暖 | 切到炸弹时全局微调 | 危险/爆炸感 | accent |
| 精准模式冷色 | primary at 10%背景偏蓝 | 切到精准时全局微调 | 精确/科技感 | primary |

### 3.2 光影效果

| 光影手段 | 描述 | 应用对象 | 营造的感受 | 参数 |
|---------|------|---------|-----------|------|
| FAB外发光(脉冲) | secondary色大面积扩散 | 撒网按钮 | "深海发光体,按我" | 0 0 40px rgba(124,92,252,0.4) |
| FAB涟漪扩散 | 从按钮向外扩散的圆环 | 按钮周围(idle循环) | 水面涟漪 | 3环,间隔扩散,opacity衰减 |
| 卡片浮出阴影 | 底部大阴影 | FishingCard | "从水中浮起" | 0 8px 32px rgba(0,0,0,0.6) |
| 角落深海光晕 | secondary大面积模糊 | 右上角+左下角 | 深海荧光 | blur:80px, 200×200px |
| 底部模式区域内阴影 | 顶部内阴影 | 模式切换容器 | 层级分隔/沉入水底感 | inset 0 2px 12px rgba(0,0,0,0.4) |

### 3.3 装饰元素

| 装饰 | 类型 | 位置 | 尺寸 | 色彩/透明度 | 动效 | 作用 | 与主题的关系 |
|------|:-:|------|------|:-:|------|------|:-:|
| 水面波纹(主装饰) | 有机/波浪 | 页面中上部(30-60%区域) | 全宽×120px | secondary at 6-10% | 水平缓慢移动2.5s infinite | 建立"水面"隐喻 | 深海表面 |
| 右上角光晕 | 光效/渐变 | 右上角溢出 | 200×200px | secondary at 12% | 静止 | 深度感+框架暗示 | 深海荧光 |
| 左下角光晕 | 光效/渐变 | 左下角溢出 | 160×160px | primary at 8% | 静止 | 对角平衡 | 荧光生物 |
| 微光点群(5个) | 有机/光斑 | 散布在水面区域 | 3-6px each | secondary at 8-12% | 呼吸闪烁3s infinite(各自相位不同) | 水中荧光生物 | 深海生物光 |
| 按钮涟漪环(3个) | 有机/圆环 | FAB按钮为中心向外 | 100→160→220px | secondary at 10%→5%→2% | 持续扩散2s infinite(错开0.6s) | 暗示"水面扰动"引导点击 | 水面涟漪 |
| 底部分隔弧线 | 裁剪/弧线 | 模式切换区顶部 | 全宽×16px弧度 | primary at 5% | 静止 | 自然分区(水面/水底) | 水面分界线 |

> **装饰用量**: 游戏化/特殊玩法页 → 允许5-8个装饰。实际6个(波纹+2光晕+微光群+涟漪环+弧线) ✓
> **主次**: 主装饰=水面波纹(60%视觉重量) + 次装饰=涟漪环(25%) + 微装饰=光晕+光点+弧线(15%)

### 3.4 质感与肌理

| 质感手段 | 应用区域 | 参数 | 营造的感受 |
|---------|---------|------|-----------|
| 毛玻璃 | NavBar / GreetingSheet / FishingCard | blur:20px, saturate:1.2, bg:rgba(13,13,20,0.8) | 层级分明+水下玻璃感 |
| 噪点纹理 | 全局底层叠加 | opacity:0.02, 全屏覆盖 | 水中微粒质感 |
| 模式切换区底色 | 底部Tab区域 | Layer1 + 1px border rgba(255,255,255,0.06) | 沉入底部的稳定感 |

### 3.5 图标与图形

| 图标/图形 | 在哪里 | 功能 | 风格要求 | 尺寸 |
|----------|--------|------|---------|------|
| 渔网图标(FAB内) | 撒网按钮中心 | 表达"撒网"操作 | 实色填充/网状形态/品牌化 | 32×32 |
| 炸弹图标 | 模式切换-炸弹Tab | 识别炸弹模式 | 实色填充/圆形炸弹+导火索/暖色 | 24×24 |
| 精准网图标 | 模式切换-精准Tab | 识别精准模式 | 线性1.5px/十字准星形态 | 24×24 |
| 商店图标 | NavBar右侧 | 进入道具商店 | 线性1.5px/购物袋形态 | 20×20 |
| 历史图标 | NavBar右侧 | 查看捞人历史 | 线性1.5px/时钟回旋形态 | 20×20 |

### 3.6 动效设计

| 动效 | 触发条件 | 视觉效果 | 营造的感受 | 参数 |
|------|---------|---------|-----------|------|
| 水面波纹循环 | idle持续 | 2-3层正弦波水平移动+垂直微浮动 | "水面活着" | 2.5s ease-in-out infinite, 各层速度不同 |
| FAB脉冲呼吸 | idle循环 | glow扩散/收缩+scale(1→1.05→1) | "深海发光体在呼吸" | 3s ease-in-out infinite |
| 涟漪扩散 | idle循环 | 3个圆环从FAB向外扩散+fade | 水面涟漪暗示"按我" | 2s ease-out infinite, stagger:0.6s |
| 撒网甩出 | tap撒网按钮 | 按钮scale(0.9)+网状图形从按钮向上甩出 | 动作感+力量 | 500ms ease-out |
| 水面冒泡 | 撒网等待中 | 多个小圆从底部升起+消失 | "水下有动静" | 1.5-2s, 随机位置, stagger |
| 卡片浮出 | 匹配结果到达 | translateY(100→0)+scale(0.9→1)+opacity(0→1) | 惊喜!"捞到了" | 400ms spring, stagger:200ms |
| 空网收回 | 匹配0人 | 网图形从上方收回+缩小消失 | "啥也没有" | 500ms ease-in |
| 卡片左滑跳过 | swipe left | translateX(0→-120%)+rotate(-5deg)+opacity→0 | 快速划走 | 200ms ease-in |
| 卡片右滑感兴趣 | swipe right | translateX(0→120%)+rotate(5deg)+opacity→0+❤️粒子 | 喜欢! | 200ms ease-in + 300ms粒子 |
| 打招呼信封飞出 | tap发送 | 小信封图形从按钮飞向屏幕右上角 | 消息发出去了 | 400ms ease-in |
| 模式切换 | tap模式Tab | 背景色渐变过渡+按钮内容crossfade | 氛围变化 | 300ms ease-default |

---

## 4. 实现分类

| # | 视觉元素 | 分类 | 输出目标 | 理由 |
|---|---------|:-:|---------|------|
| 1 | 深海渐变底色 | CSS | index.md | linear-gradient足够 |
| 2 | 水面波纹动画 | CSS动效 | index.md | SVG path + CSS animation可实现 |
| 3 | FAB按钮渐变+glow | CSS | index.md | gradient+box-shadow |
| 4 | FAB脉冲呼吸 | CSS动效 | index.md | scale+box-shadow animation |
| 5 | 涟漪扩散环 | CSS动效 | index.md | border-radius:50%+scale+opacity animation |
| 6 | 角落光晕(2个) | CSS | index.md | radial-gradient+blur足够(圆形简单) |
| 7 | 微光点群 | CSS | index.md | 小div+border-radius+opacity animation |
| 8 | 底部弧线分隔 | CSS | index.md | border-radius或clip-path |
| 9 | 毛玻璃 | CSS | index.md | backdrop-filter |
| 10 | **渔网图标(FAB)** | 素材 | materials/I-08 | 网状复杂形态,CSS画不出品牌感 |
| 11 | **炸弹图标** | 素材 | materials/I-09 | 多色+复杂形状(圆形+导火索+火花) |
| 12 | **精准网图标** | 素材 | materials/I-10 | 十字准星多笔画+品牌化 |
| 13 | 卡片浮出动效 | CSS动效 | index.md | transform+opacity animation |
| 14 | 撒网甩出动效 | CSS动效 | index.md(复杂但CSS可做) | path animation或transform序列 |
| 15 | 水面冒泡 | CSS动效 | index.md | 多div+translateY+opacity |
| 16 | 噪点纹理 | CSS | index.md | background-image:url(noise) at 2% |

---

## 5. 素材需求清单

| 素材ID | 名称 | 类型 | 设计意图 | 尺寸 | 色彩方向 | 状态变体数 | 优先级 |
|--------|------|------|---------|------|---------|:-:|:-:|
| I-08 | fishing-net | Icon | FAB按钮内撒网图标,表达核心操作"撒网捞人" | 32×32 | text-primary(#F2F2F7)填充 | 1 | P0 |
| I-09 | bomb | Icon | 模式切换Tab中炸弹道具标识,表达"爆炸式大量捞取" | 24×24 | accent-gradient(#FF6B6B→#FF8C5A) | 2(有库存/无库存) | P0 |
| I-10 | precision-target | Icon | 模式切换Tab中精准网标识,表达"精准定向捞取" | 24×24 | primary(#4F8CFF) | 2(有库存/无库存) | P0 |

**素材设计意图速写**:
- I-08: 简化渔网形态——一个半圆弧+内部网格线(3×3交叉),底部收口。用text-primary白色填充让它在深色按钮渐变上醒目。暗示"撒网"动作的形态感。
- I-09: 圆形炸弹+短导火索+火花。主体用accent渐变(红→橙)表达火爆感,在暗色底上极度抢眼。无库存态为text-tertiary灰色。
- I-10: 十字准星(外环+内环+4条短刻度线)。线性1.5px,primary色表达精准+科技感。无库存态为text-tertiary灰色。

---

## 6. 样式规格清单

| 元素 | 所在节点 | CSS属性 | 值 | 为什么 |
|------|---------|---------|------|--------|
| 页面底色 | root | background | linear-gradient(180deg, #08081A 0%, #0D0D14 100%) | 比首页更深=深海感 |
| 水面波纹区 | wave-container | height | 40vh | 占据中上部建立水面视觉 |
| 波纹线 | wave-line | stroke | rgba(124,92,252,0.08) | secondary极低透明度 |
| 波纹动画 | wave-line | animation | wave-move 2.5s ease-in-out infinite | 水面活着 |
| FAB按钮 | cast-btn | width/height | 80px / 80px | 大按钮=核心操作 |
| FAB按钮 | cast-btn | border-radius | 999px (radius-full) | 圆形 |
| FAB按钮 | cast-btn | background | linear-gradient(135deg, #7C5CFC, #4F8CFF) | secondary→primary品牌渐变 |
| FAB发光 | cast-btn | box-shadow | 0 0 40px rgba(124,92,252,0.4), 0 4px 16px rgba(0,0,0,0.4) | glow+elevation |
| FAB脉冲 | cast-btn | animation | pulse 3s ease-in-out infinite | 呼吸引导 |
| 涟漪环 | ripple-ring | border | 1.5px solid rgba(124,92,252,0.1) | 极淡边框=涟漪 |
| 涟漪环 | ripple-ring | animation | ripple-expand 2s ease-out infinite | 扩散+fade |
| 次数指示器 | count-dots | gap | 6px | 紧凑排列 |
| 次数点(可用) | dot-available | background | #4F8CFF (primary) | 可用=品牌色 |
| 次数点(已用) | dot-used | background | #252540 (Layer3) | 已用=暗淡 |
| 次数点尺寸 | dot | width/height | 8px | 小巧不抢 |
| 模式切换区 | mode-tabs | background | #141420 (Layer1) | 沉入底部 |
| 模式切换区 | mode-tabs | border-radius | 24px 24px 0 0 | 顶部大圆角 |
| 模式切换区 | mode-tabs | border-top | 1px solid rgba(255,255,255,0.06) | 微弱分隔 |
| 模式Tab(选中) | tab-active | background | rgba(124,92,252,0.15) | secondary 15%底色 |
| 模式Tab(选中) | tab-active | box-shadow | 0 0 8px rgba(124,92,252,0.2) | 微弱glow |
| 模式Tab | tab | padding | 12px 20px | 可触摸区域 |
| 模式Tab | tab | border-radius | 999px | 胶囊形 |
| 右上角光晕 | glow-tr | background | radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%) | 深海荧光 |
| 右上角光晕 | glow-tr | width/height | 200px / 200px | 大面积氛围 |
| 右上角光晕 | glow-tr | position | top:-60px, right:-60px | 角落溢出 |
| 右上角光晕 | glow-tr | filter | blur(40px) | 极柔和 |
| 左下角光晕 | glow-bl | background | radial-gradient(circle, rgba(79,140,255,0.08) 0%, transparent 70%) | primary色平衡 |
| 左下角光晕 | glow-bl | width/height | 160px / 160px | 比右上略小(主次) |
| 左下角光晕 | glow-bl | position | bottom:-40px, left:-40px | 角落溢出 |
| 微光点 | sparkle | width/height | 3-6px(随机) | 微小荧光 |
| 微光点 | sparkle | background | rgba(124,92,252,0.1) | 极淡 |
| 微光点 | sparkle | border-radius | 50% | 圆形 |
| 微光点 | sparkle | animation | twinkle 3s ease-in-out infinite | 闪烁 |
| NavBar | navbar | backdrop-filter | blur(20px) saturate(1.2) | 毛玻璃 |
| NavBar | navbar | background | rgba(8,8,26,0.75) | 比标准更深配合深海底 |
| 结果卡片 | fishing-card | background | rgba(20,20,32,0.85) | Layer1半透明 |
| 结果卡片 | fishing-card | backdrop-filter | blur(16px) saturate(1.1) | 毛玻璃 |
| 结果卡片 | fishing-card | border-radius | 16px (radius-lg) | 大卡片圆角 |
| 结果卡片 | fishing-card | border | 1px solid rgba(255,255,255,0.08) | 微弱边框 |
| 结果卡片 | fishing-card | box-shadow | 0 8px 32px rgba(0,0,0,0.6) | shadow-lg浮出感 |

---

## 7. 与全局风格的一致性检查

| 检查项 | 回答 |
|--------|------|
| 色彩全部来自Token？ | ✅ primary/secondary/accent/Layer0~3/text-*/渐变系统。唯一新值#08081A是Layer0的更深变体(同色相,亮度-2%),用于深海感 |
| 装饰符合配方？ | ✅ 科技暗色+活力霓虹配方。使用光晕(secondary)+有机曲线(波纹)+光斑(微光点) = 3种跨类组合(≤3 ✓) |
| 光效与其他页面一致？ | ✅ glow-secondary参数与design-system一致(16-40px扩散,30-40%透明度) |
| 图标风格统一？ | ✅ I-10准星=线性1.5px/round端点。I-08/I-09=实色填充(FAB内/强调标识)符合激活态规范 |
| 动效时长/缓动引用全局？ | ✅ 300ms/400ms/500ms + ease-default/ease-out/spring 全部在动效系统范围内 |
| 装饰用量符合决策树？ | ✅ 游戏化/特殊玩法→5-8个。实际6个。主次分明(波纹60%+涟漪25%+其余15%) |

---

> 本文档完成后:
> - 素材需求(I-08~I-10) → 指导 materials/ 创建
> - 样式规格 → 回写 index.md 区块样式
> - 动效规格 → 回写 index.md 状态转换
> - 组件预算(FishingCard:8, GreetingSheet:5) → 指导组件 visual.md
