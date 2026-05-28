# form-card · 登录表单卡 · 视觉设计分析

> **层级**: L2 组件深钻
> **页面统筹来源**: `design-plan/pages/00-login/visual.md#2.4`
> **页面给的预算**: 角色=配角-交互 | 权重=6/10 | 允许手段=白色卡片+阴影+输入框聚焦动效 | 装饰上限=极少

---

## 1. 情感与氛围目标

### 1.1 情感定位

| 维度 | 回答 |
|------|------|
| 用户此刻心理 | 准备输入凭证，需要专注但不紧张 |
| 目标感受 | **简洁、可信、流畅** — 白色干净的表单让人放心输入 |
| 情绪曲线 | 看到（清晰的字段引导）→ 输入（顺畅无阻碍）→ 提交（确信按钮可点） |
| 与主题的关系 | 白色表面 + 粉色边框/焦点 = 治愈感渗透到功能性组件 |
| 页面给的视觉预算 | 配角-交互，权重 6，白色卡片+阴影+focus动效，装饰极少 |

### 1.2 品牌感要素

- 输入框的粉色 focus border（品牌色渗透到微交互）
- 大圆角卡片（有机柔软感 vs 方正表单的冰冷）
- Label 上浮动效（流畅现代交互，品牌"年轻"印象）

---

## 2. 视觉层级设计

### 2.1 空间深度（组件内部）

```
[底层] ─── 白色卡片背景 #FFFFFF + shadow-sm
    ↑
[内容层] ─── 输入框组 + 标签 + 验证码获取按钮
    ↑
[焦点层] ─── 当前聚焦输入框的 border + ring (最突出)
```

### 2.2 视觉权重（组件内部）

| 元素 | 权重(1-10) | 实现手段 | 为什么 |
|------|:----------:|---------|--------|
| 当前聚焦的输入框 | 7 | 主色 border 2px + ring | 引导用户当前操作位置 |
| send-code-btn | 6 | 主色文字 + hover 底色 | 获取验证码是关键操作 |
| 手机号输入框 | 5 | 第一个字段，label 引导 | 流程起点 |
| 密码/验证码框 | 4 | 默认态，等待 focus | 次要字段 |
| mode-toggle | 3 | 小型胶囊在卡片外顶部 | 功能切换，不抢焦点 |

---

## 3. 视觉手段清单

### 3.1 色彩运用

| 色彩手段 | 描述 | 位置 | 感受 | Token |
|---------|------|------|------|-------|
| 白色卡片底 | `#FFFFFF` | form-card 整体 | 干净可信 | surface |
| 淡粉边框 | `#FFE0E8` 1px | 输入框默认 | 柔和界定 | border |
| 主色聚焦 | `#FF6F91` 2px | 输入框 focus | 品牌色反馈 | borderFocus |
| 主色文字 | `#FF6F91` | 获取验证码按钮 | 可操作提示 | primary |
| 错误红 | `#ED5A5A` 2px border | 校验失败输入框 | 清晰错误标识 | error |

### 3.2 光影效果

| 光影 | 描述 | 对象 | 参数 |
|------|------|------|------|
| 卡片浮起 | 粉色调轻阴影 | form-card 容器 | shadow-sm |
| focus ring | 主色扩散光环 | 聚焦输入框 | `0 0 0 3px rgba(255,111,145,0.1)` |
| error ring | 红色扩散光环 | 错误输入框 | `0 0 0 3px rgba(237,90,90,0.1)` |

### 3.3 装饰元素

无。预算为"装饰极少"，form-card 作为功能组件不自带装饰。

### 3.4 图标与图形

| 图标 | 位置 | 功能 | 尺寸 |
|------|------|------|------|
| I-01 eye-open | password-input 右侧内联 | 显示密码 | 20×20 |
| I-02 eye-closed | password-input 右侧内联 | 隐藏密码 | 20×20 |

### 3.5 动效设计

| 动效 | 触发 | 效果 | 参数 |
|------|------|------|------|
| label 上浮 | input focus | placeholder 上移 -8px + scale 0.85 + 变为 caption 色 | 200ms ease-out |
| label 下落 | input blur (空值) | 回到 placeholder 位置 | 200ms ease-out |
| mode 切换 | mode-toggle click | 当前 input 组 opacity 1→0 + 新组 0→1 | 200ms ease-out |
| error shake | error:credential | form-card X轴 ±4px ×3 | 300ms |
| send-code-btn 倒计时 | click→发送成功 | 文字"获取验证码"→"60s"倒计时 | 即时替换，无过渡 |

---

## 4. 实现分类

| # | 视觉元素 | 分类 | 输出 | 理由 |
|---|---------|:----:|------|------|
| 1 | 白色卡片 + 阴影 + 圆角 | CSS | form-card 样式 | background+shadow+radius |
| 2 | 输入框 border/focus/error | CSS | input 样式 | border+shadow states |
| 3 | label 上浮动效 | CSS | transition + transform | 标准 CSS 动画 |
| 4 | mode 切换淡入淡出 | CSS | opacity transition | 简单淡入淡出 |
| 5 | error shake | CSS | @keyframes | 简单位移循环 |
| 6 | eye icons (I-01/I-02) | 素材 | materials/ | outline icon 需 canvas |

---

## 5. 素材需求清单

（继承页面级清单中绑定到 form-card 的素材）

| 素材ID | 名称 | 设计意图 | 尺寸 | 色彩 |
|--------|------|---------|------|------|
| I-01 | eye-open | 密码可见状态图标 | 20×20 | textSecondary |
| I-02 | eye-closed | 密码隐藏状态图标 | 20×20 | textSecondary |

---

## 6. 样式规格清单

| 元素 | CSS属性 | 值 | Token | 为什么 |
|------|---------|------|-------|--------|
| form-card 容器 | background | `#FFFFFF` | surface | 白色干净底 |
| form-card 容器 | border-radius | 16px | radius-lg | 大圆角柔和 |
| form-card 容器 | padding | 24px | spacing-lg | 宽松呼吸 |
| form-card 容器 | box-shadow | token | shadow-sm | 轻浮起 |
| 输入框 | height | 48px | — | 触摸友好 |
| 输入框 | padding | 12px 16px | sm+md | 内容舒适 |
| 输入框 | border | 1px solid #FFE0E8 | border | 淡粉默认 |
| 输入框 | border-radius | 12px | radius-md | 友好 |
| 输入框 | font-size | 16px | body-lg | 移动端不缩放 |
| 输入框 | color | textPrimary | textPrimary | 输入文字 |
| 输入框 focus | border | 2px solid #FF6F91 | borderFocus | 主色反馈 |
| 输入框 focus | box-shadow | `0 0 0 3px rgba(255,111,145,0.1)` | — | 柔和光环 |
| 输入框 error | border | 2px solid #ED5A5A | error | 错误标识 |
| 输入框 error | box-shadow | `0 0 0 3px rgba(237,90,90,0.1)` | — | 错误光环 |
| label(浮动) | font-size | 12px | caption | 缩小态 |
| label(浮动) | color | textSecondary | textSecondary | 非焦点色 |
| label(浮动) | transform | translateY(-8px) scale(0.85) | — | 上浮位置 |
| send-code-btn | color | #FF6F91 | primary | 可操作 |
| send-code-btn | font-weight | 500 | — | 略加粗引导 |
| send-code-btn | font-size | 14px | body | 正文级 |
| send-code-btn disabled | color | textTertiary | textTertiary | 倒计时灰 |
| 字段间距 | margin-bottom | 12px | — | 紧凑但可区分 |
| eye-icon btn | width/height | 44×44px (touch) | — | 最小触摸区 |
| eye-icon btn | padding | 12px | — | 图标居中(20+12×2=44) |

---

## 7. 与全局风格一致性检查

| 检查项 | 回答 |
|--------|------|
| 色彩全部来自 Token？ | ✅ 是 |
| 装饰符合预算（极少）？ | ✅ 是：无自带装饰 |
| 图标风格统一？ | ✅ 是：outline 2px round |
| 动效引用全局？ | ✅ 是：200ms ease-out / 300ms |
| 不超出页面给的权重？ | ✅ 是：权重 6，仅用白色+阴影+focus 动效 |
