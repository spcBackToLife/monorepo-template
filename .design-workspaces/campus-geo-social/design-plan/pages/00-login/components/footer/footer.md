# footer · 底部链接 · 组件结构设计

> **视觉来源**: `footer.visual.md`
> **Registry**: `pages/00-login/footer/_component.json`

---

## 1. 组件定位

登录页底部辅助导航，提供"去注册"和"忘记密码"两个出口。页面专属组件。

---

## 2. 结构设计

```
[footer] ─── flex row center gap:16px
├── [register-link] ─── text "注册账号"，click→push 00-register
├── [divider] ─── text "|"
└── [forgot-link] ─── text "忘记密码"，click→push 00-forgot-password
```

### 子元素内部属性（固定值）

| 子元素 | HTML tag | 固定属性 | 说明 |
|--------|---------|---------|------|
| register-link | span | `textContent="注册账号"` `role="link"` `tabIndex="0"` | 文字链接，非 `<a>` 因为是 SPA 导航 |
| divider | span | `textContent="\|"` `aria-hidden="true"` | 纯视觉分隔符 |
| forgot-link | span | `textContent="忘记密码"` `role="link"` `tabIndex="0"` | 同上 |
| footer (root) | div | `role="navigation"` `aria-label="辅助导航"` | 导航语义容器 |

---

## 3. 状态

无状态切换。两个链接各有 default/active 视觉状态。

---

## 4. 样式规格

| 元素 | 属性 | 值 | Token |
|------|------|------|-------|
| 容器 | display | flex | — |
| 容器 | flex-direction | row | — |
| 容器 | justify-content | center | — |
| 容器 | align-items | center | — |
| 容器 | gap | 16px | spacing-md |
| 容器 | margin-top | 24px | spacing-lg |
| links | color | #FF6F91 | primary |
| links | font-size | 14px | body |
| links | font-weight | 400 | — |
| links :active | color | #FB406F | primaryActive |
| links :active | transform | scale(0.98) | — |
| divider | color | rgba(45,36,56,0.42) | textTertiary |
| divider | font-size | 14px | body |

---

## 5. 交互行为

| 交互 | trigger | actions |
|------|---------|---------|
| 点击注册 | click register-link | nav.go('00-register'), 携带当前手机号 |
| 点击忘记密码 | click forgot-link | nav.go('00-forgot-password'), 携带当前手机号 |
