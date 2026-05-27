# GreetingSheet — 组件视觉分析

> 层级: L2 组件深钻 | 上级: 03-fishing/visual.md | 页面给我的预算: 权重5, 配角-操作

---

## 1. 情感定位

| 维度 | 回答 |
|------|------|
| 用户此刻的心理状态 | 已决定打招呼，需要快速选择/编写一条消息 — 轻度紧张+期待 |
| 目标感受 | **轻松、快捷、自信** — 模板降低心理负担,自定义满足表达欲 |
| 情绪曲线 | 选择(看模板) → 编辑(自定义) → 确认发送(信封飞出=满足) |
| 与主题风格的关系 | 毛玻璃Sheet(全局统一浮层风格),内容区简洁不干扰选择 |
| 页面给我的视觉预算 | 角色:配角-操作, 权重:5/10, 允许:毛玻璃+模板选中高亮, 装饰密度:少 |

### 品牌感要素

- 模板文案带有校园社交特色("同校的缘分~"/"约一局游戏？")
- 发送后的信封飞出动效 — 品牌化的发送反馈

---

## 2. 视觉层级(组件内部)

```
[底层] ─── 毛玻璃Sheet容器
    ↑
[信息层] ─── 标题("向xx打招呼") + 目标用户信息
    ↑
[选择层] ─── 模板列表 + 自定义输入框
    ↑
[操作层] ─── 发送按钮(CTA)
```

---

## 3. 视觉手段清单

### 3.1 色彩

| 色彩手段 | 描述 | 位置 | Token |
|---------|------|------|-------|
| Sheet底 | Layer3毛玻璃 | 整体容器 | Layer3 at 90% + blur:20px |
| 模板选中 | primary at 10% 底色 + primary border | 选中的模板项 | primary at 10% |
| 模板未选 | Layer2底色 | 未选中项 | Layer2 |
| 输入框 | Layer2 + 1px border | 自定义输入区 | Layer2 |

### 3.2 光影

| 光影手段 | 对象 | 参数 |
|---------|------|------|
| Sheet阴影 | 容器顶部 | 0 -4px 16px rgba(0,0,0,0.3) |

### 3.3 动效

| 动效 | 触发 | 效果 | 参数 |
|------|------|------|------|
| Sheet弹出 | 打开 | translateY(100%→0) | 300ms spring |
| Sheet收起 | 关闭/发送成功 | translateY(0→100%) | 200ms ease-in |
| 模板选中高亮 | tap模板 | background-color过渡 | 150ms ease-default |
| 发送按钮激活 | 内容非空 | opacity(0.5→1)+glow出现 | 200ms ease-default |

---

## 4. 实现分类

全部CSS实现。Sheet是标准功能面板,无需素材。

---

## 5. 素材需求清单

无。功能面板以文字交互为主,视觉通过毛玻璃+选中态高亮实现。

---

## 6. 样式规格

| 元素 | CSS属性 | 值 | 为什么 |
|------|---------|------|--------|
| Sheet容器 | background | rgba(37,37,64,0.9) | Layer3 at 90% |
| Sheet容器 | backdrop-filter | blur(20px) saturate(1.2) | 毛玻璃 |
| Sheet容器 | border-radius | 24px 24px 0 0 | radius-xl 顶部 |
| Sheet容器 | padding | 20px 20px 24px | Sheet标准间距 |
| 拖拽条 | width/height | 36×4px | 标准拖拽指示 |
| 拖拽条 | background | rgba(255,255,255,0.2) | 可见但不抢 |
| 拖拽条 | border-radius | 2px | 圆润 |
| 标题 | font | heading-md, text-primary | 清晰表达目的 |
| 模板项 | padding | 12px 16px | 可触摸舒适 |
| 模板项 | border-radius | 8px | radius-sm |
| 模板项 | background | #1C1C2E (Layer2) | 默认底色 |
| 模板项(选中) | background | rgba(79,140,255,0.1) | primary at 10% |
| 模板项(选中) | border | 1px solid rgba(79,140,255,0.4) | primary边框 |
| 模板项 | font | body-md, text-primary | 可读 |
| 模板间距 | gap | 8px | space-2 紧凑 |
| 自定义输入 | min-height | 80px | 多行空间 |
| 自定义输入 | background | Layer2 | 统一 |
| 自定义输入 | border | 1px solid rgba(255,255,255,0.06) | 微弱边框 |
| 自定义输入 | border-radius | 8px | radius-sm |
| 自定义输入 | font | body-md, text-primary | 输入文字 |
| 自定义placeholder | color | text-tertiary | 引导 |
| 发送按钮 | 样式 | GlowButton variant:primary size:lg fullWidth | 全宽主CTA |
| 发送按钮(禁用) | opacity | 0.5 | 内容为空时 |

---

## 7. 风格一致性检查

| 检查项 | 回答 |
|--------|------|
| 色彩来自Token？ | ✅ Layer2/3, primary at 10%, text-* |
| 与页面一致？ | ✅ 毛玻璃参数统一(blur:20px,saturate:1.2) |
| 预算内？ | ✅ 权重5, 仅毛玻璃+选中高亮,零装饰(功能为主) |
