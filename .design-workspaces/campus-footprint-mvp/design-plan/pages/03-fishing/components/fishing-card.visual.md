# FishingCard — 组件视觉分析

> 层级: L2 组件深钻 | 上级: 03-fishing/visual.md | 页面给我的预算: 权重8, 主角-结果

---

## 1. 情感定位

| 维度 | 回答 |
|------|------|
| 用户此刻的心理状态 | 刚撒完网等了2秒，极度好奇"捞到了谁" — 惊喜揭示瞬间 |
| 目标感受 | **惊喜、好奇、决策** — 像拆盲盒，看到后快速判断要不要打招呼 |
| 情绪曲线 | 期待(浮出中) → 惊喜(看到头像/标签) → 决策(打招呼/跳过) |
| 与主题风格的关系 | 从"深海"中浮出的"宝物" — 毛玻璃+发光边缘暗示"来自水下" |
| 页面给我的视觉预算 | 角色:主角-结果, 权重:8/10, 允许:毛玻璃+阴影+浮入动效+操作按钮glow, 装饰密度:中 |

### 品牌感要素

- 卡片从水面浮出的独特揭示方式 — 不是普通列表加载
- 毛玻璃+发光边缘 = "深海中打捞上来的水晶瓶"
- 操作方式(左滑跳过/右滑喜欢)呼应"捞"的手势隐喻

---

## 2. 视觉层级(组件内部)

```
[底层] ─── 毛玻璃卡片背景 + 微弱发光边缘
    ↑
[信息层] ─── 头像+昵称+签名+标签+距离
    ↑
[操作层] ─── 打招呼按钮 + 感兴趣按钮 + 跳过提示
```

| 层级 | 包含什么 | 视觉表现 |
|------|---------|---------|
| 底层 | 圆角矩形容器 | 毛玻璃(blur:16px)+Layer1 at 85%+1px border rgba(255,255,255,0.08)+shadow-lg |
| 信息层 | 用户信息布局 | 高对比文字/真实头像/标签色块 |
| 操作层 | 2个按钮+跳过文字 | 打招呼:primary小按钮, 感兴趣:ghost按钮 |

---

## 3. 视觉手段清单

### 3.1 色彩

| 色彩手段 | 具体描述 | 位置 | 感受 | Token |
|---------|---------|------|------|-------|
| 毛玻璃底 | rgba(20,20,32,0.85) | 卡片整体 | 水下玻璃感 | Layer1 at 85% |
| 标签底色 | primary at 10% | 兴趣标签 | 品牌色点缀 | primary at 10% |
| 距离文字 | text-tertiary | 底部 | 次要信息 | text-tertiary |

### 3.2 光影

| 光影手段 | 描述 | 对象 | 感受 | 参数 |
|---------|------|------|------|------|
| 浮出阴影 | 底部大阴影 | 卡片整体 | "从水中浮起" | 0 8px 32px rgba(0,0,0,0.6) |
| 边缘微光 | 顶部1px高亮 | 卡片顶边 | "水面光线折射" | border-top: 1px solid rgba(255,255,255,0.12) |

### 3.3 装饰

无额外装饰 — 卡片作为信息载体,内容本身(头像/标签)即是视觉。预算内的"中密度"通过光影+动效而非额外图形实现。

### 3.4 图标

| 图标 | 位置 | 功能 | 尺寸 |
|------|------|------|------|
| 院系图标 | 院系行左侧 | 识别学院 | 16×16 |
| 距离图标 | 距离行左侧 | 表达空间关系 | 16×16 |

(这些使用通用emoji替代即可: 🎓📍 — 不需要专门素材,信息密度场景emoji更自然)

### 3.5 动效

| 动效 | 触发 | 效果 | 参数 |
|------|------|------|------|
| 浮入 | 首次出现 | translateY(80→0)+scale(0.9→1)+opacity(0→1) | 400ms spring |
| 左滑跳过 | swipe left | translateX(0→-120%)+rotate(-5deg)+opacity→0 | 200ms ease-in |
| 右滑感兴趣 | swipe right | translateX(0→120%)+rotate(5deg)+opacity→0 | 200ms ease-in |
| 下一张浮入 | 前张滑出后 | translateY(40→0)+opacity(0→1) | 300ms ease-out, delay:100ms |

---

## 4. 实现分类

| # | 视觉元素 | 分类 | 理由 |
|---|---------|:-:|------|
| 1 | 毛玻璃卡片 | CSS | backdrop-filter+background |
| 2 | 浮出阴影 | CSS | box-shadow |
| 3 | 边缘微光 | CSS | border-top |
| 4 | 浮入动效 | CSS动效 | transform+opacity |
| 5 | 滑动动效 | CSS动效 | transform+opacity |
| 6 | 标签底色 | CSS | background-color |

**结论**: 本组件全部用CSS实现,无需素材。理由: 卡片是信息载体,视觉重心在内容(头像/文字/标签)而非装饰图形。

---

## 5. 素材需求清单

无。本组件的视觉效果全部通过CSS光影+动效+毛玻璃实现。

**论证**: 
1. 毛玻璃+阴影 = CSS `backdrop-filter` + `box-shadow` 
2. 边缘高光 = CSS `border-top`
3. 浮入/滑动动效 = CSS `transform` + `opacity` + `transition`
4. 所有图标使用emoji(🎓📍) — 信息密集的卡片中emoji比图标更轻量自然

---

## 6. 样式规格

| 元素 | CSS属性 | 值 | 为什么 |
|------|---------|------|--------|
| 卡片容器 | width | 320px (85% of 375) | 两侧留白,不贴边 |
| 卡片容器 | padding | 20px | space-5 内间距 |
| 卡片容器 | border-radius | 16px | radius-lg |
| 卡片容器 | background | rgba(20,20,32,0.85) | Layer1毛玻璃 |
| 卡片容器 | backdrop-filter | blur(16px) saturate(1.1) | 玻璃感 |
| 卡片容器 | border | 1px solid rgba(255,255,255,0.08) | 微弱边框 |
| 卡片容器 | border-top | 1px solid rgba(255,255,255,0.12) | 顶部高光 |
| 卡片容器 | box-shadow | 0 8px 32px rgba(0,0,0,0.6) | shadow-lg |
| 头像 | width/height | 48×48 | 适合卡片内展示 |
| 头像 | border-radius | 999px | 圆形 |
| 昵称 | font | body-lg, font-weight:600, text-primary | 主要信息 |
| 签名 | font | body-sm, text-secondary | 次要个性 |
| 标签 | background | rgba(79,140,255,0.1) | primary at 10% |
| 标签 | padding | 4px 8px | space-1 / space-2 |
| 标签 | border-radius | 4px | radius-xs |
| 标签 | font | body-sm, text-secondary | 可读 |
| 距离 | font | caption, text-tertiary | 最弱信息 |
| 打招呼按钮 | 样式 | GlowButton variant:primary size:sm | 主操作 |
| 感兴趣按钮 | 样式 | GlowButton variant:ghost size:sm | 次要操作 |

---

## 7. 风格一致性检查

| 检查项 | 回答 |
|--------|------|
| 色彩来自Token？ | ✅ Layer1/primary/text-*/rgba透明度规则 |
| 与页面visual.md一致？ | ✅ 使用页面定义的毛玻璃参数+shadow-lg |
| 光效一致？ | ✅ 无独立glow(按钮glow来自GlowButton通用组件) |
| 动效引用全局？ | ✅ 400ms spring / 200ms ease-in / 300ms ease-out |
| 预算内？ | ✅ 权重8通过光影+动效实现,无额外装饰(中密度=靠信息内容) |
