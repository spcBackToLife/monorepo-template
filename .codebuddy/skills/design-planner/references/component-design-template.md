# 通用组件深度设计模板

每个跨页面复用的通用组件产出独立文件，包含以下 8 个章节。

---

## 1. 组件定位

### 核心职责

(一句话描述这个组件做什么)

### 使用场景汇总

| 页面 | 位置 | 使用方式(props) | 视觉效果 |
|------|------|----------------|---------|
| 登录页 | 底部主CTA | {variant:"primary", size:"lg", label:"登录", fullWidth:true} | 渐变发光全宽 |
| (收集自各页面Phase 2第5章) | | | |

### 为什么抽象为组件

- 出现次数: ≥N次跨M个页面
- 状态复杂度: X种视觉状态需统一管理
- 变体需求: Y种外观变体但行为一致
- (其他理由)

---

## 2. 结构设计

### 内部层次

```
[component-root]
├── [icon-left] (条件: props.icon && props.iconPosition==='left')
├── [label-text] (条件: !props.loading)
├── [loading-spinner] (条件: props.loading)
└── [icon-right] (条件: props.icon && props.iconPosition==='right')
```

### 子元素职责

| 子元素 | 存在条件 | 职责 | 布局规则 |
|--------|---------|------|---------|
| icon-left | icon非空且position=left | 辅助说明按钮含义 | flex-shrink:0 |
| label-text | loading=false | 传达操作含义 | flex:1, 居中 |
| loading-spinner | loading=true | 反馈进行中状态 | 替代label位置 |

### 子元素内部属性（固定值，不由外部 Props 控制）

> ★ executor 实现时直接消费此表。这些属性是组件内部硬编码的，使用者不传。

| 子元素 | HTML tag | 固定属性 | 说明 |
|--------|---------|---------|------|
| (如 phone-input) | input | `type="tel"` `maxLength="11"` `placeholder="请输入手机号"` `inputMode="numeric"` | 手机号专用属性 |
| (如 code-input) | input | `type="text"` `maxLength="6"` `placeholder="6位验证码"` `inputMode="numeric"` `autoComplete="one-time-code"` | 验证码专用 |
| (如 password-input) | input | `type="password"` `placeholder="请输入密码"` `autoComplete="current-password"` | 密码专用 |
| (如 send-code-btn) | button | `type="button"` | 不触发表单提交 |
| (如 eye-toggle) | button | `type="button"` `aria-label="切换密码可见性"` | 无障碍标签 |

**填写规则**：
- 每个叶子节点必须列出其 HTML tag + 所有固定属性
- `placeholder` / `aria-label` 等文案在此处明确写死（executor 直接取用）
- 与外部 Props 绑定的值不写在此表（如 `value` 由 bind 控制）

### 与外部布局的关系

- 默认: inline-flex，宽度由内容撑开
- fullWidth=true: width:100%
- 在 flex 容器中: 默认不伸展，除非 fullWidth

---

## 3. API 设计

### Props 定义

| Prop | 类型 | 必填 | 默认值 | 说明 | 取值范围 |
|------|------|:----:|--------|------|---------|
| label | string | ✅ | — | 按钮文字 | 1-20字符 |
| variant | enum | ❌ | 'primary' | 视觉变体 | primary/secondary/ghost/gold |
| size | enum | ❌ | 'md' | 尺寸变体 | sm/md/lg |
| ... | | | | | |

### Events 定义

| 事件 | 触发条件 | 回调参数 |
|------|---------|---------|
| onClick | 非disabled且非loading时点击 | event |

### Props 约束关系

```
loading=true → disabled自动生效(不可点击)
disabled=true → hover/pressed状态不响应
variant='ghost' 时 glow阴影不显示
```

---

## 4. 尺寸变体

| Size | 高度 | padding-x | gap | 字号 | 字重 | 行高 | 圆角 | icon尺寸 | 最小宽度 |
|------|------|-----------|-----|------|------|------|------|---------|---------|
| sm | 36px | 16px | 6px | 13px | 500 | 18px | 999px | 16px | 64px |
| md | 44px | 24px | 8px | 15px | 500 | 22px | 999px | 20px | 88px |
| lg | 50px | 32px | 8px | 16px | 600 | 24px | 999px | 20px | 120px |

---

## 5. 视觉变体 × 状态矩阵

### [variant名] (如 primary)

**设计意图**: (为什么需要这个变体/适用场景)

| 状态 | 背景 | 文字色 | 边框 | 阴影 | icon色 | transform | opacity | cursor |
|------|------|--------|------|------|--------|-----------|---------|--------|
| default | (值) | (值) | (值) | (值) | (值) | none | 1 | pointer |
| hover | (值) | (值) | (值) | (值) | (值) | (值) | (值) | pointer |
| pressed | (值) | (值) | (值) | (值) | (值) | scale(0.97) | (值) | pointer |
| focused | (值) | (值) | (值) | (值) | (值) | none | (值) | pointer |
| disabled | (值) | (值) | (值) | none | (值) | none | 0.5 | not-allowed |
| loading | (值) | — | (值) | (值) | — | none | (值) | wait |

**每个状态的设计理由**:
- hover: (为什么这样变化 — 如"亮度+5%暗示可交互")
- pressed: (如"scale缩小+阴影收缩模拟物理按压")
- disabled: (如"去色+降透明度传达不可操作")
- ...

### [下一个variant]

(同样的完整矩阵...)

---

## 6. 状态转换动效

### 转换图

```
default ←→ hover (鼠标进入/离开)
default ←→ pressed (触摸开始/结束)
default ←→ focused (Tab聚焦/失焦)
any → disabled (prop变化)
any → loading (prop变化)
loading → default/success (异步完成)
```

### 转换参数

| 从 → 到 | 动画属性 | 时长 | 缓动 | 说明 |
|---------|---------|------|------|------|
| default → hover | background, box-shadow | 150ms | ease-default | 悬浮提示 |
| default → pressed | transform, box-shadow | 100ms | ease-in | 快速响应 |
| pressed → default | transform, box-shadow | 150ms | ease-out | 释放稍慢,有弹性 |
| any → loading | opacity(text→0,spinner→1) | 200ms | ease-default | 文字消失spinner出现 |
| any → disabled | opacity(整体) | 200ms | ease-default | 渐变禁用 |

### Loading Spinner 规格

| 属性 | 值 |
|------|------|
| 尺寸 | 与当前size的icon尺寸一致 |
| 颜色 | 与当前状态的文字色一致 |
| border-width | 2px |
| 动画 | rotate 1s linear infinite |
| 形状 | 270°弧 (不是完整圆) |

---

## 6.5 交互行为设计

组件承载的功能交互逻辑——点击/change/提交等触发的系统行为：

| 交互 | trigger | condition | 典型 actions | 说明 |
|------|---------|-----------|-------------|------|
| 点击 | click | !disabled && !loading | [nav.go(...)] 或 [effect.fetch(...)] 或 [state.set(...)] | 由使用方通过event绑定决定 |
| 值变化 | change | — | [state.set({field: value})] | 输入类组件 |
| 提交 | submit | formValid | [effect.fetch('DS-xxx', {body:...})] | 表单组件 |
| 聚焦/失焦 | focus/blur | — | [node.setVisualState('focused'/'default')] | 视觉状态切换 |

**组件自身管理的行为** (内部逻辑，不暴露给使用方):
- hover → 自动切换 visualState
- press → 自动 scale 反馈
- loading → 自动禁用交互 + 显示spinner

**组件暴露给使用方的事件接口** (由页面事件流绑定具体actions):
- onClick: 点击回调
- onChange: 值变化回调
- onSubmit: 提交回调

---

## 7. 素材索引（独立文件，存放在 `materials/` 下）

组件内需要的素材，每个为独立文件存放在同级 `materials/` 目录下。

### 素材索引表

| 素材ID | 名称 | 文件路径 | 用途 |
|--------|------|---------|------|
| I-xx | (名称) | `materials/I-xx-[name].md` | (在组件中的位置/作用) |

每个素材文件遵循 `references/material-design-template.md` 完整 6 节结构。

### 对素材的全局设计约束

- 图标统一线性风格(stroke)，active态可填充
- 线宽与组件size匹配
- 颜色继承组件状态的icon色（不固定在素材内）
- 所有图标需要 inactive/active 两个变体

---

## 8. 使用规范

### 最佳实践

```
✅ 推荐:
- 一个视图最多1个primary按钮(视觉焦点唯一)
- 主次搭配: primary(主操作) + ghost(取消/次要)
- fullWidth用于Sheet/Modal内的确认操作

❌ 反模式:
- 多个primary并列(视觉焦点混乱)
- sm+gold(太小看不出金色质感)
- loading时显示label(信息冗余)
```

### Token 引用清单

| 类别 | 引用的Token |
|------|-----------|
| 颜色 | primary, primary-gradient, gold-gradient, text-primary, text-secondary, text-disabled, Layer4 |
| 间距 | 16/24/32(px by size) |
| 圆角 | radius-full |
| 阴影 | glow-primary, glow-gold |
| 字体 | body-sm, body-md, 16px(lg) |
| 动效 | ease-default(150ms), ease-in(100ms), ease-out(150ms) |
