# top-area · 品牌头部 · 视觉设计分析

> **层级**: L2 组件深钻
> **页面预算**: 角色=主角-品牌 | 权重=7/10 | 允许手段=Logo素材+大字号标题+顶部渐变映衬 | 装饰上限=少

---

## 1. 情感与氛围目标

| 维度 | 回答 |
|------|------|
| 用户此刻心理 | 刚进入 App，第一眼看到的区域 |
| 目标感受 | **品牌认知、温暖归属、年轻活力** |
| 情绪曲线 | 看到 Logo（认出品牌）→ 读到 Slogan（感到被欢迎）|
| 页面给的视觉预算 | 主角-品牌，权重 7，Logo素材+大字号+渐变映衬 |

---

## 2. 视觉层级设计

| 元素 | 权重(1-10) | 手段 |
|------|:----------:|------|
| Logo (B-01) | 8 | 64×64px 品牌图形 + 主色调 |
| Slogan 文字 | 5 | h3 22px/600 + textPrimary |
| 渐变背景映衬 | 2 | 来自页面底层，非组件自有 |

---

## 3. 样式规格

| 元素 | CSS属性 | 值 | 为什么 |
|------|---------|------|--------|
| top-area 容器 | display | flex, column, align-center | 居中品牌 |
| top-area 容器 | padding-top | 80px (含安全区 59px + 21px 间距) | 避开 Dynamic Island |
| top-area 容器 | padding-bottom | 32px (xl) | 与表单卡间距 |
| logo | width/height | 64×64px | 品牌标识尺寸 |
| logo | margin-bottom | 16px (md) | logo→slogan 间距 |
| slogan | font-size | 22px | h3 |
| slogan | font-weight | 600 | h3 |
| slogan | color | textPrimary | 正文强调 |
| slogan | text-align | center | 居中 |

---

## 4. 素材索引

| 素材ID | 名称 | 用途 | 尺寸 |
|--------|------|------|------|
| B-01 | brand-logo | 品牌 Logo 图形 | 64×64px |

---

## 5. 与全局一致性

| 检查项 | 回答 |
|--------|------|
| 色彩 Token？ | ✅ textPrimary |
| 不超出预算？ | ✅ 仅 Logo + 文字，无额外装饰 |
| 字体 Token？ | ✅ h3 22px/600 |
