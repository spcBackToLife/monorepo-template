# 装饰风格落地模式速查

本文档将 ThemeConfig.decorationRules 中的抽象策略，转化为具体的 CSS 实现代码。
设计时必须参考此文档，确保装饰规则真正落地到每个元素。

---

## 1. 背景策略 (background.strategy)

### glassmorphism（毛玻璃）
```css
/* 适用：卡片、弹窗、底栏、浮层 */
background: rgba(18, 18, 30, var(--bg-opacity, 0.8));
backdrop-filter: blur(var(--blur, 16px));
-webkit-backdrop-filter: blur(var(--blur, 16px));
border: 1px solid rgba(255, 255, 255, var(--border-opacity, 0.08));
```

### gradient（渐变底）
```css
/* 适用：页面背景、Hero 区域、按钮 */
background: linear-gradient(var(--direction, 135deg), var(--color1), var(--color2));
```

### solid + ornaments（纯色 + 装饰物）
```css
/* 页面背景层 */
.page-bg {
  background: #0a0a14;
  position: relative;
  overflow: hidden;
}
/* 渐变光球装饰（伪元素） */
.page-bg::before {
  content: '';
  position: absolute;
  top: -20%; left: -10%;
  width: 40%; height: 40%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(102,126,234,0.15), transparent 70%);
  pointer-events: none;
}
/* 噪点纹理叠层 */
.page-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('data:image/svg+xml,...'); /* grain noise */
  opacity: 0.03;
  pointer-events: none;
}
```

---

## 2. 边框策略 (border.strategy)

### glow（发光边框）
```css
/* 常态 */
border: 1px solid rgba(102, 126, 234, 0.2);
/* hover */
border-color: rgba(102, 126, 234, 0.4);
box-shadow: 0 0 8px rgba(102, 126, 234, 0.1);
/* focus */
border-color: #667eea;
box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
```

### subtle（微妙边框）
```css
border: 1px solid rgba(255, 255, 255, 0.06);
```

### accent（强调边框）
```css
border: 1px solid var(--primary);
```

---

## 3. 阴影策略 (shadow.strategy)

### glow（发光阴影 — 科技/前卫风格专用）
```css
/* 微光 */
box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1), 0 1px 3px rgba(0, 0, 0, 0.3);
/* 柔光 */
box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15), 0 2px 6px rgba(0, 0, 0, 0.4);
/* 强光 */
box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2), 0 4px 12px rgba(0, 0, 0, 0.5);
```

### soft（柔和阴影 — 通用）
```css
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
```

---

## 4. 按钮设计模式

### Primary Button（渐变 + 发光）
```css
background: linear-gradient(135deg, #667eea, #764ba2);
color: #f0f0f8;
border: none;
border-radius: 12px;
box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
```
```css
/* hover */
transform: scale(1.02);
box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
```
```css
/* active */
transform: scale(0.97);
box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
```

### Secondary Button（边框 + 发光）
```css
background: transparent;
color: #667eea;
border: 1px solid rgba(102, 126, 234, 0.3);
border-radius: 12px;
```

### Ghost Button（无边框）
```css
background: transparent;
color: #a8a8c8;
border: 1px solid rgba(255, 255, 255, 0.06);
```

---

## 5. 卡片设计模式

### Glass Card（毛玻璃卡片）
```css
background: rgba(18, 18, 30, 0.8);
backdrop-filter: blur(16px);
border: 1px solid rgba(102, 126, 234, 0.1);
border-radius: 16px;
padding: 16px;
```

### Surface Card（表面色卡片）
```css
background: #12121e;
border: 1px solid rgba(102, 126, 234, 0.1);
border-radius: 16px;
padding: 16px;
```

---

## 6. 输入框设计模式

```css
/* default */
background: #12121e;
border: 1px solid rgba(102, 126, 234, 0.2);
border-radius: 12px;
color: #f0f0f8;
padding: 0 16px;
height: 48px;

/* placeholder */
color: #6b6b85;

/* focus */
border-color: #667eea;
box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);

/* error */
border-color: #f87171;
box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.15);
```

---

## 7. 渐变文字（gradientHeading = true）

```css
background: linear-gradient(135deg, #667eea, #764ba2);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

---

## 8. 页面背景装饰组合

```
┌──────────────────────────────────────┐
│  🔵 渐变光球 (top-left, 40%, 15%op) │
│       ╲                              │
│         ╲ 内容区域                    │
│                                      │
│                        🟣 光球 (btm) │
│  ░░░░░░░░░░░░ 噪点纹理 (全屏, 3%op)  │
└──────────────────────────────────────┘
```

**实现**：用 2-3 个绝对定位伪元素/背景节点叠在页面底层。

---

## 9. 底栏（BottomTabBar）特殊处理

```css
/* 毛玻璃底栏 */
background: rgba(10, 10, 20, 0.9);
backdrop-filter: blur(20px);
border-top: 1px solid rgba(255, 255, 255, 0.06);
padding: 12px 8px 28px; /* 28px for safe area */

/* 中间凸起按钮 */
.center-tab {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.35);
  margin-top: -8px; /* 凸起效果 */
}

/* 激活态文字 */
.tab-label.active {
  color: #667eea;
  font-weight: 600;
}
.tab-label.inactive {
  color: #6b6b85;
}
```
