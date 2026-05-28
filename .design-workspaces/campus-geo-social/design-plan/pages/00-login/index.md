# 00-login · 登录页 · 设计汇总

> **视觉来源**: `visual.md`
> **交互来源**: `interaction-design/pages/00-login.md`
> **产品来源**: `product-analysis/modules/M5-user-auth.md#b3-登录流程`

---

## 1. 页面定位

| 维度 | 描述 |
|------|------|
| 功能 | 手机号 + 密码/验证码双模态登录入口 |
| 用户旅程位置 | App 首个交互页面（splash/onboarding 后） |
| 情感目标 | 温暖、安全、年轻 |
| 视觉风格 | 青春治愈：暖白底+顶部粉色渐变+草莓粉CTA+角落装饰 |
| 信息密度 | 低（登录页聚焦单一任务） |

---

## 2. 结构层次设计

### 页面布局

```
┌─────────────────────────────┐ ← 状态栏 (safe area 59px)
│                             │
│      ┌──────────────┐       │ ← top-area: Logo 64×64 + Slogan
│      │    🌐 Logo    │       │    padding-top: 80px
│      │  "遇见同校的你" │       │
│      └──────────────┘       │
│                             │
│   ┌─── mode-toggle ───┐    │ ← 验证码 | 密码 切换
│   │  验证码  ●  密码   │    │
│   └────────────────────┘    │
│                             │
│  ┌─────────────────────────┐│ ← form-card: 白色卡片 radius-lg shadow-sm
│  │  手机号                  ││    padding: 24px
│  │  ┌───────────────────┐  ││
│  │  │ 请输入手机号       │  ││ ← phone-input: h48 radius-md
│  │  └───────────────────┘  ││
│  │  ┌────────────┐ [获取]  ││ ← code-input + send-code-btn (code-mode)
│  │  │ ● ● ● ● ● ● │       ││    OR
│  │  └────────────┘         ││ ← password-input + eye-toggle (password-mode)
│  │  ┌───────────────── 👁 ┐││
│  │  │ ********             ││
│  │  └─────────────────────┘││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│ ← submit-btn: h48 full radius primary bg
│  │         登 录            ││    width: 100%
│  └─────────────────────────┘│
│                             │
│      注册账号 | 忘记密码      │ ← footer: 文字链接
│                             │
│  ○ D-02 pink-circle (右上)  │ ← 装饰层 z-1
│  ○ D-03 mint-leaf (左下)    │
└─────────────────────────────┘
```

### 布局规格

| 区域 | 定位方式 | 关键尺寸 |
|------|---------|---------|
| 整体 | flex column center | width:393px, padding:0 16px |
| top-area | flex column center | pt:80px, pb:32px |
| mode-toggle | 居中 | mb:16px |
| form-card | 100% width | padding:24px, radius:16px |
| submit-btn | 100% width | h:48px, mt:24px |
| footer | flex row center | mt:24px |
| D-02 | absolute | top:-20px, right:-20px |
| D-03 | absolute | bottom:120px, left:-10px |

---

## 3. 组件清单

### 通用组件（引用）

| 组件 | 文档路径 | 本页使用 |
|------|---------|---------|
| form-card | `design-plan/components/form-card/` | 默认 code-mode，含 phone+code/password |

### 页面专属组件

| 组件 | 文档路径 | 用途 |
|------|---------|------|
| top-area | `pages/00-login/components/top-area/` | 品牌头部 Logo+Slogan |
| footer | `pages/00-login/components/footer/` | 底部注册+忘记密码链接 |

---

## 4. 素材清单

| 素材ID | 名称 | 类型 | 文档 | 绑定节点 | 优先级 |
|--------|------|------|------|---------|:------:|
| B-01 | brand-logo | Brand | `materials/B-01-brand-logo.md` | top-area/logo | P0 |
| I-01 | eye-open | Icon | `materials/I-01-eye-open.md` | form-card/password-input | P0 |
| I-02 | eye-closed | Icon | `materials/I-02-eye-closed.md` | form-card/password-input | P0 |
| I-04 | checkmark-success | Icon | `materials/I-04-checkmark-success.md` | submit-btn | P1 |
| D-02 | pink-circle | Decoration | `materials/D-02-pink-circle.md` | _page (右上角) | P2 |
| D-03 | mint-leaf | Decoration | `materials/D-03-mint-leaf.md` | _page (左下角) | P2 |

---

## 5. 状态完整矩阵

### 页面级状态

| 状态 | UI 表现 | 涉及节点 |
|------|---------|---------|
| idle:code-mode | 验证码表单组可见，密码组隐藏 | form-card, mode-toggle |
| idle:password-mode | 密码表单组可见，验证码组隐藏 | form-card, mode-toggle |
| code-sending | send-code-btn 显示倒计时 | send-code-btn |
| submitting | submit-btn spinner + 表单全禁用 | submit-btn, form-card |
| success | submit-btn → ✓ + 绿色背景 | submit-btn |
| error:credential | form shake + inline 红字 | form-card, error-msg |

### 输入框状态

| 状态 | border | shadow | label | 文字 |
|------|--------|--------|-------|------|
| default | 1px #FFE0E8 | none | placeholder位(textTertiary) | — |
| focus | 2px #FF6F91 | pink ring 3px | 上浮(textSecondary) | textPrimary |
| error | 2px #ED5A5A | red ring 3px | 上浮(error色) | textPrimary |
| disabled | 1px #F5EDE6 | none | 同default | textTertiary |

### submit-btn 状态

| 状态 | 背景 | 文字 | 阴影 | transform |
|------|------|------|------|-----------|
| disabled | #FF6F91 | #FFFFFF | — | — | opacity:0.45 |
| enabled | #FF6F91 | #FFFFFF "登录" | shadow-sm | — |
| hover | #FF89A4 | #FFFFFF | shadow-sm | scale(1.03) |
| pressed | #FB406F | #FFFFFF | none | scale(0.97) |
| loading | #FF6F91 | spinner 白色 | shadow-sm | — |
| success | #3FCC93 | ✓ icon 白色 | — | scale(1.05→1) |

---

## 6. 数据与交互设计

### 状态变量 (stateInit)

| 变量 | 类型 | 初始值 | 用途 |
|------|------|--------|------|
| view.loginMode | 'code' \| 'password' | 'code' | 当前登录模式 |
| view.phone | string | '' | 手机号 |
| view.code | string | '' | 验证码 |
| view.password | string | '' | 密码 |
| view.passwordVisible | boolean | false | 密码可见性 |
| view.codeSending | boolean | false | 验证码发送中 |
| view.countdown | number | 0 | 倒计时秒数 |
| view.submitState | 'idle'\|'submitting'\|'success'\|'error' | 'idle' | 提交状态 |
| view.errors | Record<string, string> | {} | 字段错误信息 |

### 事件清单

| # | 节点 | trigger | actions |
|---|------|---------|---------|
| 1 | mode-toggle | click | state.set({loginMode: toggle}) |
| 2 | phone-input | change | state.set({phone: value}), 清除 phone error |
| 3 | code-input | change | state.set({code: value}), 6位自动 submit |
| 4 | password-input | change | state.set({password: value}) |
| 5 | send-code-btn | click | effect.fetch(sendCode) → countdown 60s |
| 6 | submit-btn | click | effect.fetch(login) → success/error |
| 7 | footer/register-link | click | nav.go('00-register') |
| 8 | footer/forgot-link | click | nav.go('00-forgot-password') |

---

## 7. 节点结构树

```
00-login [page] ─── bg:linear-gradient(180deg,#FFE6EC 0%,#FFFAF6 40%), overflow:hidden, position:relative
├── decoration-layer [div] ─── position:absolute, inset:0, pointer-events:none, z:-1
│   ├── pink-circle [div] ─── position:absolute, top:-20px, right:-20px, w:80, h:80, bg:D-02
│   └── mint-leaf [div] ─── position:absolute, bottom:120px, left:-10px, w:60, h:40, bg:D-03, rotate:-15deg
├── [组件:top-area] ─── flex column center, pt:80px, pb:32px
│   ├── logo [img] ─── w:64, h:64, src:B-01, mb:16px
│   └── slogan [text] ─── "遇见同校的你", h3 22px/600, textPrimary, text-center
├── mode-toggle [div] ─── flex row, bg:#F5EDE6, radius:full, h:32, p:2px, mb:16px
│   ├── code-tab [div] ─── "验证码", body 14px, radius:full, {{active: bg:primary, color:white}}
│   └── password-tab [div] ─── "密码", body 14px, radius:full, {{active: bg:primary, color:white}}
├── [组件:form-card] ─── bg:surface, radius:lg(16), p:24px, shadow-sm, w:100%
│   ├── phone-input [input] ─── h:48, radius:md(12), border:1px #FFE0E8, font:body-lg, {{focus: border:2px primary, ring}}
│   ├── code-input-group [div] ─── {{visible: loginMode==='code'}}, flex row, gap:8px, mt:12px
│   │   ├── code-cells [div] ─── flex row gap:6px, 6个digit-cell各w:36 h:48 radius:md border center
│   │   └── send-code-btn [button] ─── color:primary, font:body/500, {{disabled: textTertiary, "60s"}}
│   ├── password-input-group [div] ─── {{visible: loginMode==='password'}}, position:relative, mt:12px
│   │   ├── password-field [input] ─── h:48, radius:md, border:1px #FFE0E8, type:password, pr:48px
│   │   └── eye-toggle [button] ─── position:absolute, right:0, top:0, w:48 h:48, center, src:I-01/I-02
│   └── error-msg [text] ─── {{visible: errors.length>0}}, caption 12px, color:error, mt:4px
├── submit-btn [button] ─── h:48, w:100%, bg:primary, color:textInverse, radius:full, font:h5, shadow-sm, mt:24px
│   └── {{loading: spinner 20px white}} {{success: ✓ icon I-04, bg:success}}
└── [组件:footer] ─── flex row center, gap:16px, mt:24px
    ├── register-link [text] ─── "注册账号", body 14px, color:primary
    ├── divider [text] ─── "|", textTertiary
    └── forgot-link [text] ─── "忘记密码", body 14px, color:primary
```

---

## 8. 引用契合度核对

| 通用组件 | 文档位置 | 本页面所需 | 是否覆盖 | 补充需求 |
|---------|---------|-----------|:--------:|---------|
| form-card | `components/form-card/` | code-mode + password-mode 双模态 | ✅ | 无 |

---

> **验证状态**: 待 write-node.ts 写入 design 层后跑 validate.ts
