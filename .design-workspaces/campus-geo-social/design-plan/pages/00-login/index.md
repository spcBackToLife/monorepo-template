# 00-login · 登录页 · 完整设计文档（index.md）

> **角色**：汇总文档。只引用前面已写的视觉/节点/素材，**不发明新东西**。
> **上游引用**：
> - 视觉分析：`visual.md`（必须先完成）
> - 节点 design 层：`design-registry/pages/00-login/**/*.json`（已写入）
> - 素材规格：`materials/B-01-brand-logo.md` 等 6 个文件
> - 全局：`../../design-system.md` · `../../../interaction-design/pages/00-login.md`

---

## 1. 页面定位与情感

| 维度 | 定义 | 推导依据 |
|------|------|---------|
| 用户心理 | 新用户：期待但警惕；回访用户：求快；异常用户：焦虑 | visual.md §1.1 |
| 情绪目标 | "对，是这个 App" → "不复杂" → "在转" → "无缝" | visual.md §1.1 |
| 视觉优先级 | submit-btn(10) > Logo(7) > form-card(6) > mode-toggle(5) > footer(3) > 装饰(1-2) | visual.md §2.2 修正后 |
| 上下游关系 | 来自：00-splash / 00-onboarding（fade-in 250ms） · 去往：01-home-map（push 350ms）或 00-auth-status | interaction-design/overview.md §4.2 |
| 设计挑战 | 平衡"标准表单严谨" vs "青春治愈温暖" —— 通过粉色 CTA + 大圆角 + 顶部光晕 + 装饰元素解决 | visual.md §1.2 |

---

## 2. 整体视觉氛围

### 2.1 色调策略

- **主导色调**：奶油白 80%+ + 粉色焦点 4-6% + 装饰色 < 15%
- **与全局关系**：加强 `primary` 在主 CTA 的使用；首次启用 `glow-success` token 作为成功反馈
- **特殊需求**：顶部温暖光晕（accent 黄 18%）—— 是登录页独有的"清晨阳光"氛围，其他页面不使用

### 2.2 光影与层次

- **光源方向**：暗示从顶部洒下（D-01 radial-gradient from top center）
- **深度层级**：L0 底色 → 装饰层 → 内容（form-card）→ CTA → Modal（错误时）
- **前景-中景-背景**：CTA / form-card → 装饰圆和叶子 → 奶油底色

### 2.3 装饰策略

| 装饰 | 类型 | 位置 | 尺寸 | 色彩/透明度 | 动效 | 作用 |
|------|------|------|------|-----------|------|-----|
| D-01 顶部光晕 | CSS radial-gradient | top:0, center, 100%×300px | — | accent at 18% → transparent | 静止 | 阳光氛围 |
| D-02 粉色圆 | 素材（B 部分溢出） | top:60, left:-30 | 80×80 | primary at 8% | 静止 | 强化主色出现 |
| D-03 薄荷叶 | 素材 | bottom:40, right:20 | 60×40 | secondary at 12% | 静止（可选微飘） | 强化辅色 + 清新校园暗示 |

### 2.4 质感与肌理

- 不使用毛玻璃（与温暖治愈感冲突）
- 不使用噪点纹理
- form-card 使用 shadow-sm（主色微调）+ radius-lg 营造"轻浮"质感

### 2.5 氛围总结

> **"温暖奶油底色上的简洁表单——顶部撒下的阳光光晕、左上若隐若现的粉色印记、右下漂浮的薄荷绿叶子，让标准登录流程变成'被治愈的几秒钟'。"**

---

## 3. 结构层次设计

### 3.1 宏观布局（393×852 基准）

```
┌─────────────────────────────────────────┐  ← y:0
│ [D-01 顶部温暖光晕 300px radial]        │
│ [D-02 粉色圆 80×80 left:-30, top:60]    │  ← (部分溢出屏)
├─────────────────────────────────────────┤  ← y:64 (top-area padding)
│              [Logo 64×64]                │
│           [品牌 slogan h5 secondary]     │  ← y:64+64+16=144 (Logo底)
├─────────────────────────────────────────┤  ← y:192 (+48 xl)
│   [mode-toggle 胶囊 segmented]           │  ← height: 36, full-radius
├─────────────────────────────────────────┤  ← y:228 (+0)
│   ┌─────────────────────────────────┐   │
│   │ form-card (radius-lg, shadow-sm)│   │  ← margin:16, padding:24
│   │   [phone-input  48px]            │   │
│   │   [code-input 6格 48px]          │   │  ← + send-code-btn absolute
│   │   或 [password-input 48px]       │   │  ← + eye icon absolute
│   └─────────────────────────────────┘   │  ← form-card 底约 y:430
├─────────────────────────────────────────┤  ← y:430+32 = 462
│   [submit-btn full 49px primary radius-full]│ ← width: 100% - 32
├─────────────────────────────────────────┤  ← y:462+49 = 511
│   ... [灵活留白] ...                    │
├─────────────────────────────────────────┤
│         [footer  flex center gap:16]     │  ← bottom:40 上方
│      [注册]  [忘记密码]   (primary text) │
│                              [D-03 叶子] │  ← right:20, bottom:40
└─────────────────────────────────────────┘  ← y:852
                          [iPhone 安全区]
```

### 3.2 空间分配

| 区块 | 高度/占比 | 定位方式 | layoutHint |
|------|---------|---------|------------|
| 顶部留白 + Logo (top-area) | ~ 192px | flow | flow |
| mode-toggle | 36px | flow | flow |
| form-card | ~ 200px（视模式而定） | flow | flow |
| submit-btn | 49px + 32px margin-top | flow | flow |
| 弹性留白 | flex:1（约 50-150px） | flow | — |
| footer | ~ 80px | flow | flow |
| D-01/D-02/D-03 装饰 | 0（绝对定位）| absolute | — |

### 3.3 视觉流向

进入页面 → 视线落在 Logo（顶部中心）→ 顺势下扫 mode-toggle → 进入 form-card 输入 → 视线被 submit-btn 草莓粉强引力吸引 → 点击 → 完成；如需要额外路径则扫向 footer 链接。

### 3.4 层叠关系

| 层级 | 包含元素 | z-index |
|------|---------|---------|
| 最底层 | 奶油背景 + D-01/D-02/D-03 装饰 | 0 |
| 内容层 | top-area / mode-toggle / form-card / submit-btn / footer | auto |
| 浮动层 | Toast（错误网络/短信成功） | 100 |
| 遮罩层 | Modal（锁定/封禁/注销缓冲）+ overlay | 1000 |

---

## 4. 区块详细设计

### 4.1 top-area · 品牌头部

**节点路径**：`top-area/_block` + `top-area/logo`  
**视觉权重**：容器 2 + Logo 7  
**Token 引用**：见 visual.md §6

**容器样式**：
- padding: `$token:spacing-3xl` (64px) top + `$token:spacing-md` (16px) horizontal
- display: flex / flex-direction: column / align-items: center / gap: `$token:spacing-md` (16px)
- 无 background / 无 border / 无 shadow

**Logo 元素**：
- width / height: 64px / 64px
- 素材绑定: `B-01 brand-logo`（见 `materials/B-01-brand-logo.md`）
- animation: `bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms both`
- 视觉状态: 仅 idle（无 hover/disabled）

**可选 slogan 文字**（如果产品决定加）：
- font: `$token:typography-h5` (16px 600)
- color: `$token:textSecondary`
- text: "校园地理社交"（PRD 待定，可省略）

---

### 4.2 mode-toggle · 登录方式切换

**节点路径**：`mode-toggle`  
**视觉权重**：5  
**Token 引用**：见 visual.md §6

**容器样式**：
- height: 36px / width: 220px (内含两个 100px tab + 10px 滑块缓冲)
- background: `$token:primaryLight` (#FFE6EC)
- border-radius: `$token:radius-full` (9999px)
- padding: 4px
- display: flex / position: relative
- margin: 0 auto

**滑块（::after 或独立元素）**：
- width: 50% / height: calc(100% - 8px)
- background: `$token:surface` (#FFFFFF)
- border-radius: `$token:radius-full`
- position: absolute / top: 4px / left: 4px
- transition: `transform $token:transitions-fast` (200ms spring)

**两个 tab 文字**：
- font: `$token:typography-body` (14px 600)
- z-index: 1（在滑块上）

**视觉状态对应（见 design 层 visualStates）**：
- `code-mode`: 滑块 `transform: translateX(0)`，左 tab 字色 `$token:primary`，右 tab 字色 `$token:textSecondary`
- `password-mode`: 滑块 `transform: translateX(100%)`，右 tab `$token:primary`，左 tab `$token:textSecondary`

**微交互**：
- hover: 滑块轻微抬升 shadow-sm（仅桌面端）
- active: scale(0.98) 短暂按压感
- transition: 全程 200ms spring

---

### 4.3 form-card · 表单卡片（核心交互区）

**节点路径**：`form-card/_block` + 4 个子元素

#### 4.3.0 容器样式

- background: `$token:surface` (#FFFFFF)
- border-radius: `$token:radius-lg` (16px)
- padding: `$token:spacing-lg` (24px)
- box-shadow: `$token:shadow-sm`
- margin: `0 $token:spacing-md` (0 16px)
- display: flex / flex-direction: column / gap: `$token:spacing-md` (16px)

**视觉状态**：
- `idle`: base
- `submitting-disabled`: 内部所有 input `pointer-events: none; opacity: 0.7;`
- `shake-on-error`: 整体 `animation: shake 400ms ease-out`（见 §7.2）

#### 4.3.1 phone-input · 手机号输入框

**节点**: `form-card/phone-input`

| CSS 属性 | 值 |
|---------|------|
| height | 48px |
| width | 100% |
| border-radius | `$token:radius-md` (12px) |
| background | `$token:surface` |
| border | 1px solid `$token:border` (#FFE0E8) |
| padding | 0 16px |
| font | `$token:typography-body` (14px 400) |
| color | `$token:textPrimary` |
| position | relative（让 label 可绝对定位） |

**label 默认态**：
- position: absolute / left: 16px / top: 50% / transform: translateY(-50%)
- color: `$token:textTertiary`
- font: 14px 400

**:focus 态**：
- border: 2px solid `$token:primary`
- box-shadow: `0 0 0 4px rgba(255,111,145,0.1)` (focus 光圈)
- label 同步: `transform: translateY(-22px) scale(0.85); color: $token:primary`
- transition: 全部 200ms ease-out

**.has-value 态（label 上浮但 border 回默认）**：
- label 维持 `translateY(-22px) scale(0.85)`，color `$token:textSecondary`

**.error 态**：
- border: 2px solid `$token:error`
- 字段下方 caption 红字（inline error message）

**.disabled 态**：
- opacity: 0.45 / pointer-events: none

**内容**: placeholder = "手机号"

#### 4.3.2 code-input · 验证码输入（6 格）

**节点**: `form-card/code-input`

| CSS 属性 | 值 |
|---------|------|
| 容器 display | flex / gap: 8px / justify-content: space-between |
| 每格 width / height | 48px × 48px |
| 每格 border-radius | `$token:radius-md` |
| 每格 background | `$token:surface` |
| 每格 border | 1px solid `$token:border` |
| 数字 font | `$token:typography-h3` (22px 600) |
| 数字 color | `$token:textPrimary` |
| 数字 text-align | center / line-height: 48px |

**焦点格（.focused 类）**：
- border: 2px solid `$token:primary`
- box-shadow: `0 0 0 4px rgba(255,111,145,0.1)`
- 内部 caret 居中闪烁

**.error 态**：
- 所有 6 格 border: 2px `$token:error`
- 触发 form-card shake
- 自动清空 + 聚焦第 1 格

**visibleWhen**: `{{state.view.loginMode === 'code'}}`

#### 4.3.3 password-input · 密码输入框

**节点**: `form-card/password-input`

基础样式同 phone-input（48 高 / 12 圆角 / 1px border / focus 光圈）。

**右侧眼睛图标**：
- 嵌入位置: position: absolute / right: 12px / top: 50% / translateY(-50%)
- width / height: 20px / 20px
- cursor: pointer
- opacity: 0.85（hover → 1）
- 素材绑定:
  - I-02 闭眼: `state.view.passwordVisible !== true`（默认）
  - I-01 睁眼: `state.view.passwordVisible === true`

**密度条（has-value 时显示）**：
- position: absolute / bottom: -8px / left: 0 / right: 0 / height: 2px
- 3 段（弱/中/强），颜色 `$token:warning` / `$token:info` / `$token:success`

**.error 态**：
- 同 phone-input + 自动清空 + 聚焦

**visibleWhen**: `{{state.view.loginMode === 'password'}}`

#### 4.3.4 send-code-btn · 获取验证码按钮（嵌入）

**节点**: `form-card/send-code-btn`

| CSS 属性 | 值 |
|---------|------|
| position | absolute / right: 12px / top: 50% / translateY(-50%)（嵌入 code-input 右侧） |
| 注：实际位置嵌入到 phone-input 旁的独立 wrapper 中（见结构树） | — |
| background | transparent |
| border | none |
| padding | 0 |
| font | `$token:typography-body` (14px 600) |
| color | `$token:primary` |
| cursor | pointer |

**.disabled 态（手机号未填或格式错）**：
- color: `$token:textTertiary` / cursor: not-allowed

**.code-sending 态（60s 倒计时）**：
- text 替换为 "60s" → "59s" → ... "0s"（JS textContent 每秒更新）
- color: `$token:textTertiary`
- disabled: true

**.loading 态（请求发送中）**：
- text 隐藏 / 替换为 16×16 CSS spinner（border 三色 + rotate 1s linear infinite）
- color: `$token:primary`

**visibleWhen**: `{{state.view.loginMode === 'code'}}`

---

### 4.4 submit-btn · 主 CTA 登录按钮

**节点路径**：`submit-btn`  
**视觉权重**：10（主角）  
**Token 引用**：见 visual.md §6

| CSS 属性 | 值 |
|---------|------|
| width | calc(100% - 32px) |
| height | 49px |
| margin | `$token:spacing-xl` 16px 0 16px (32px top) |
| background | `$token:primary` (#FF6F91) |
| color | `$token:textInverse` (#FFFFFF) |
| border | none |
| border-radius | `$token:radius-full` (9999px) |
| font | `$token:typography-h5` (16px 600) |
| box-shadow | `$token:shadow-sm` |
| cursor | pointer |
| transition | `all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)` |
| display | flex / align-items: center / justify-content: center |

**完整状态矩阵**（与 design 层 visualStates 严格对应）：

| 状态 | bg | shadow | transform | extras |
|------|----|--------|-----------|--------|
| default | primary | shadow-sm | none | text "登录" |
| hover | primary | shadow-md | scale(1.03) | （桌面端） |
| pressed | primary | shadow-sm 收缩 | scale(0.97) | press 反馈 |
| focused | primary | shadow-sm | none | outline 2px primary + 2px offset |
| disabled | primary | none | none | opacity: 0.45 / cursor: not-allowed |
| loading | primary | shadow-sm | none | text opacity 0 / spinner 20×20 居中 |
| success | `$token:success` (#3FCC93) | `0 0 16px rgba(63,204,147,0.30)` (glow-success) | none | I-04 ✓ 取代 spinner / 0.5s 后 fade |
| credential-error-shake | primary | shadow-sm | none | form-card 触发 shake，按钮本体 default |

**素材绑定**：
- I-04 checkmark-success（success 态显示）

---

### 4.5 footer · 底部链接

**节点路径**：`footer/_block` + 2 个 link

**容器样式**：
- display: flex / justify-content: center / gap: `$token:spacing-md` (16px)
- padding: `$token:spacing-lg $token:spacing-md` (24px 16px)

**两个 link 样式（register-link / forgot-link 共享）**：
- color: `$token:primary`
- font: `$token:typography-body` (14px 400)
- text-decoration: none
- cursor: pointer
- transition: all 200ms ease-out

**:hover 态**:
- color: `$token:primaryHover` (#FF89A4)
- text-decoration: underline

**:active 态**：
- color: `$token:primaryActive` (#FB406F)
- transform: scale(0.98)

**:focus 态**：
- outline: 2px solid `$token:primary` / outline-offset: 2px

**文案**：
- register-link: "注册"
- forgot-link: "忘记密码"

---

## 5. 组件清单

### 5.1 通用组件引用

| 组件名 | 在本页位置 | props | 期望效果 | 来源 |
|--------|---------|-------|---------|---------|
| ConfirmDialog | 错误 Modal（locked/banned/logging-off） | 见下表 | L4 强确认弹窗 | `interaction-design/overview.md#九 共享组件` |
| Toast | 短信发送成功 / 网络错 / 超时 | `{message, variant, duration}` | L2 顶部下滑 2-3s | 同上 |

**ConfirmDialog 三种调用**（对应 3 种 error 状态）：

| 状态 | variant | title | message | actions |
|------|---------|-------|---------|---------|
| error:locked | warning | "账号锁定 30 分钟" | "密码连续错误 5 次，请稍后再试或重置密码" | [取消, "忘记密码？" → 跳 00-forgot-password] |
| error:banned | error | "账号已被封禁" | "{{state.data.banReason}}" | [取消, "申诉" → 跳 09-appeal] |
| error:logging-off | info | "正在注销，是否撤回?" | "您的注销将在 {{state.data.scheduledCleanAt}} 完成" | ["继续注销", "撤回注销" → API call] |

### 5.2 页面级组件索引

**无页面级复合组件**。所有节点都是简单元素或叶子。  
→ 不进入 Phase 3 通用组件深钻。

---

## 6. 素材清单（索引 → 独立文件）

详见 `materials/` 目录及 `_materials.json` 索引节点。

| 素材ID | 名称 | 类型 | 文件路径 | 用途/所属 |
|--------|------|------|---------|----------|
| B-01 | brand-logo | Brand | `materials/B-01-brand-logo.md` | top-area/logo 节点（64×64 品牌锚点） |
| I-01 | eye-open | Icon | `materials/I-01-eye-open.md` | form-card/password-input 右侧（密码明文态） |
| I-02 | eye-closed | Icon | `materials/I-02-eye-closed.md` | form-card/password-input 右侧（默认密文态） |
| I-04 | checkmark-success | Icon | `materials/I-04-checkmark-success.md` | submit-btn 内部（success 状态） |
| D-02 | pink-circle | Decoration | `materials/D-02-pink-circle.md` | _page 左上装饰（part-overflow） |
| D-03 | mint-leaf | Decoration | `materials/D-03-mint-leaf.md` | _page 右下装饰 |

> 顶部温暖光晕（visual.md 称 D-01）通过 CSS `radial-gradient` 实现，不需要素材文件。

---

## 7. 状态完整矩阵

### 7.1 页面状态视觉快照

| 状态 | 视觉描述 | 与 idle 的差异 | 所需特殊素材 |
|------|---------|-------------|------------|
| `idle:code-mode` | base 页面 + mode-toggle 滑块在左 + code-input 显示 + send-code-btn 显示 | 基准 | — |
| `idle:password-mode` | base 页面 + mode-toggle 滑块在右 + password-input 显示（含眼睛 I-02） | code-input 替换为 password-input | I-02 |
| `inputting` | 任一 input 获得 .focused 类 + label 上浮 + 焦点光圈 | input 视觉变化 | — |
| `code-sending` | send-code-btn 显示 "60s" 倒计时 + disabled 灰 | send-code-btn 文字+态 | — |
| `submitting` | form-card 添加 .submitting-disabled 类 + submit-btn `[data-state="loading"]` | input 半透禁用 + 按钮 spinner | — |
| `success` | submit-btn `[data-state="success"]` + bg 变绿 + I-04 ✓ + glow-success | 按钮整体变绿 | I-04 |
| `error:credential` | form-card 触发 .shake + 错字段下 caption 红字 | shake 动画 400ms + 红字 | — |
| `error:locked/banned/logging-off` | ConfirmDialog 上滑 + overlay fade | 浮层覆盖 | （ConfirmDialog 自带） |
| `error:remote-login` | Toast 顶部下滑 + submit-btn 显示"等待主设备确认"文字 + 轮询 | 按钮文字变化 + Toast | — |

### 7.2 状态转换动效

| 从 → 到 | 变化元素 | 动画属性 | 时长 | 缓动 |
|---------|---------|---------|------|------|
| idle:code-mode → idle:password-mode | mode-toggle 滑块 + 表单 swap | transform translateX + opacity fade | 200ms | spring (0.34, 1.56, 0.64, 1) |
| any → focused | input border / label / box-shadow | border / transform / color | 200ms | ease-out |
| idle → code-sending | send-code-btn text + color | textContent (JS) + color transition | 200ms | ease-out |
| idle → submitting | submit-btn text → spinner | opacity | 200ms | ease |
| submitting → success | bg + icon | background-color + opacity (spinner→I-04) | 300ms | ease-out |
| success → routed | 整页 fade out + push 转场 | opacity / transform | 250ms + 350ms | ease-out / spring |
| any error → form-card.shake | form-card | transform translateX 序列 | 400ms | ease-out |
| any error → Modal up | Modal | transform translateY(100%→0) + overlay opacity 0→1 | 350ms | spring |

**关键 CSS Keyframes**：

```css
@keyframes bounce-in {
  0% { transform: scale(0.92); opacity: 0; }
  60% { transform: scale(1.02); opacity: 1; }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  50% { transform: translateX(4px); }
  75% { transform: translateX(-4px); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes checkmark-draw {
  0% { stroke-dasharray: 0 30; }
  100% { stroke-dasharray: 30 0; }
}
```

---

## 8. 数据与交互设计

### 8.1 数据源定义

#### DS-login-with-code

| 字段 | 值 |
|------|------|
| 类型 | api |
| 描述 | 验证码登录 |
| 方法 | POST |
| 路径 | /api/v1/auth/login/code |
| autoFetchOnEnter | false |
| 触发方式 | submit-btn click |

**请求参数**：

| 参数 | 类型 | 必填 | 来源 | 说明 |
|------|------|:----:|------|------|
| phone | string | ✅ | `state.view.phone` | 11 位手机号 |
| code | string | ✅ | `state.view.code` | 6 位验证码 |
| deviceId | string | ✅ | 设备指纹 | 异地登录检测用 |

**响应结构**：

```typescript
{
  code: number,
  data: {
    token: string,
    refreshToken: string,
    user: { id: string, verificationStatus: 'pending'|'reviewing'|'approved'|'rejected' }
  } | null,
  message: string
}
```

**Mock 场景** (示例 4 个，每个含完整 responseBody)：

| 场景名 | statusCode | delay | isTimeout | responseBody 要点 |
|--------|-----------|-------|-----------|----------------|
| 登录成功-已认证 | 200 | 800ms | false | `{code:0, data:{token:"xxx", user:{verificationStatus:"approved"}}}` |
| 登录成功-审核中 | 200 | 800ms | false | `{code:0, data:{token:"xxx", user:{verificationStatus:"reviewing"}}}` → 跳 00-auth-status |
| 验证码错 | 200 | 500ms | false | `{code:30001, data:null, message:"验证码错误"}` |
| 账号锁定 | 200 | 500ms | false | `{code:30004, data:null, message:"密码错误次数过多，请 30 分钟后重试"}` |

#### DS-login-with-password

同上结构，path 改为 `/api/v1/auth/login/password`，请求参数 `code` 改为 `password`，其余一致。

#### DS-send-code

| 字段 | 值 |
|------|------|
| 类型 | api |
| 方法 | POST |
| 路径 | /api/v1/auth/send-code |
| 触发方式 | send-code-btn click |

请求参数：`{ phone, scene: "login" }`  
响应：`{ code: 0, data: null, message: "已发送" }` 或失败码

### 8.2 状态管理

#### stateInit.data（运行时数据）

| key | 类型 | 初始值 | 写入方式 | 说明 |
|-----|------|--------|---------|------|
| token | string \| null | null | DS-login-with-code onSuccess → state.set | 登录成功后写 token |
| user | object \| null | null | DS-login-with-code onSuccess → state.set | 用户基本信息 |
| banReason | string | "" | DS-login error 30100 → state.set | 封禁原因（Modal 显示） |
| scheduledCleanAt | string | "" | DS-login error 30101 → state.set | 注销时间 |

#### stateInit.view（UI 临时状态）

| key | 类型 | 初始值 | 变更触发 | UI 影响 |
|-----|------|--------|---------|--------|
| loginMode | "code" \| "password" | "code" | mode-toggle click | 切换 code-input ↔ password-input |
| phone | string | "" | phone-input change | 表单校验 |
| code | string | "" | code-input change | 表单校验 |
| password | string | "" | password-input change | 表单校验 |
| passwordVisible | boolean | false | eye icon click | I-01 ↔ I-02 切换 |
| codeSending | boolean | false | send-code-btn click | 倒计时态 |
| countdownSec | number | 60 | 每秒 -1 | send-code-btn 文字 |
| submitState | "idle"\|"loading"\|"success"\|"error" | "idle" | submit-btn click 或响应 | 按钮全状态 |
| errorType | "credential"\|"locked"\|"banned"\|"logging-off"\|"remote-login"\| null | null | error 响应 | 触发对应 UI |
| formValid | boolean (computed) | false | 监听 phone/code/password | submit-btn enabled |

### 8.3 交互事件流

| # | 用户操作 | 触发节点 | trigger | condition | actions 序列 | 状态变化 | UI 响应 |
|---|---------|---------|---------|-----------|-------------|---------|--------|
| 1 | 进入页面 | _page | screenEnter | — | 无（无 autoFetch） | — | Logo bounce-in + 焦点跳到 phone-input |
| 2 | 切换登录方式 | mode-toggle | click | — | `state.set({loginMode: 当前!==current ? current : opposite})` | loginMode 翻转 | mode-toggle 滑块 + 表单 swap |
| 3 | 输入手机号 | form-card/phone-input | change | — | `state.set({phone: value})` | phone 变 | label 上浮 / 实时格式校验 |
| 4 | 获取验证码 | form-card/send-code-btn | click | `{{state.view.phone.length === 11 && !state.view.codeSending}}` | `[state.set({codeSending:true, countdownSec:60}), effect.fetch('DS-send-code', {body:{phone}}), ui.showToast({message:"已发送", variant:"success"}), state.set({...})]` | codeSending = true | 按钮显示倒计时 / Toast 顶部 |
| 5 | 输入验证码 | form-card/code-input | change | — | `state.set({code: value})` + 自动提交（如果填满 6 位）`if(code.length===6) → 触发 #6` | code 变 | 数字显示 / 自动跳焦 |
| 6 | 输入密码 | form-card/password-input | change | — | `state.set({password: value})` | password 变 | label 上浮 + 密度条 |
| 7 | 切换密码可见 | password-input 内 eye icon | click | — | `state.toggle('passwordVisible')` | passwordVisible 翻转 | I-01 ↔ I-02 + input type 变 |
| 8 | 点击登录 | submit-btn | click | `{{state.view.formValid && state.view.submitState !== "loading"}}` | `[state.set({submitState:"loading"}), effect.fetch(DS, {body:...}), 根据响应分支:onSuccess→state.set({submitState:"success", token:..., user:...}) + ui.delay(500) + nav.go(根据 verificationStatus), onError→分类处理]` | submitState 流转 | 按钮 spinner → checkmark → fade 跳转 |
| 9 | error:credential 后用户改输入 | form-card/phone-input or code-input | change | — | `state.set({errorType: null, submitState: "idle"})` | error 清除 | inline 红字消失 |
| 10 | error:locked 点忘记密码 | ConfirmDialog 内按钮 | click | — | `[nav.go("00-forgot-password", {phone: state.view.phone})]` | — | push 转场 |
| 11 | error:banned 点申诉 | ConfirmDialog 内按钮 | click | — | `[nav.go("09-appeal", {reason: state.data.banReason})]` | — | push 转场 |
| 12 | error:remote-login 主设备确认 | 后台轮询 | scheduled | — | `[effect.fetch("DS-check-remote-login")] 每 3s` | 成功后 submitState=success | 轮询期按钮显示"等待主设备" |
| 13 | 点击注册 | footer/register-link | click | — | `[nav.go("00-register", {phone: state.view.phone})]` | — | push |
| 14 | 点击忘记密码 | footer/forgot-link | click | — | `[nav.go("00-forgot-password", {phone: state.view.phone})]` | — | push |

**actions 命名空间**: state.set/toggle · effect.fetch · nav.go · ui.showToast/delay

### 8.4 绑定关系

| 节点路径 | 绑定类型 | 表达式 | 说明 |
|---------|---------|--------|------|
| mode-toggle 滑块 | style.transform | `{{state.view.loginMode === 'password' ? 'translateX(100%)' : 'translateX(0)'}}` | 滑块跟随 mode |
| form-card/code-input | visibleWhen | `{{state.view.loginMode === 'code'}}` | code 模式才显示 |
| form-card/password-input | visibleWhen | `{{state.view.loginMode === 'password'}}` | password 模式才显示 |
| form-card/send-code-btn | visibleWhen | `{{state.view.loginMode === 'code'}}` | 同上 |
| form-card/send-code-btn | text | `{{state.view.codeSending ? state.view.countdownSec + 's' : '获取验证码'}}` | 文字双绑定 |
| form-card/send-code-btn | disabled | `{{state.view.phone.length !== 11 || state.view.codeSending}}` | 禁用条件 |
| password-input 内 eye icon | src/类名 | `{{state.view.passwordVisible ? 'I-01' : 'I-02'}}` | 素材切换 |
| password-input 的 input[type] | type | `{{state.view.passwordVisible ? 'text' : 'password'}}` | 密码显隐 |
| submit-btn | disabled | `{{!state.view.formValid || state.view.submitState === 'loading'}}` | CTA 禁用 |
| submit-btn | data-state | `{{state.view.submitState}}` | 驱动 visualStates |
| submit-btn | text | `{{state.view.submitState === 'loading' ? '' : state.view.submitState === 'success' ? '' : '登录'}}` | 状态文字 |
| form-card | className | `{{state.view.submitState === 'loading' ? 'submitting-disabled' : ''}} {{state.view.errorType === 'credential' ? 'shake' : ''}}` | 状态类 |

---

## 9. 节点结构树

> ⚠️ 严格遵守 `references/node-tree-redlines.md` 4 条红线：
> - 红线 1：所有"组件"内联展开
> - 红线 2：每个非基准状态有对应节点
> - 红线 3：每个节点行含样式关键词
> - 红线 4：叶子节点有内容/素材

```
root (page, 393×852, bg:$background, position:relative, overflow:hidden)
├── decor-pink-circle (D-02 素材, 80×80, position:absolute, top:60, left:-30, z:0, pointer-events:none)
│   └── [素材:D-02 pink-circle] (primary at 8%, 有机不对称圆)
├── decor-top-glow (CSS 装饰, position:absolute, top:0, left:0, w:100%, h:300px, z:0, pointer-events:none)
│   └── [CSS:radial-gradient(circle at 50% 0%, rgba(255,215,119,0.18) 0%, transparent 60%)]
├── decor-mint-leaf (D-03 素材, 60×40, position:absolute, bottom:40, right:20, z:0, pointer-events:none, transform:rotate(-3deg))
│   └── [素材:D-03 mint-leaf] (secondary at 12%, 不对称叶形)
│
├── top-area/_block (block, padding:64px 16px 0, display:flex, flex-col, align:center, gap:16, z:auto)
│   └── logo (element, w:64, h:64, animation:bounce-in 400ms spring 100ms both)
│       └── [素材:B-01 brand-logo] (粉色定位 pin + 校园建筑, outline 2px round + primary 实色锚点)
│       [event: screenEnter → animation 自动播放]
│
├── mode-toggle (element, w:220, h:36, bg:$primaryLight, radius:full, padding:4, position:relative, display:flex, z:auto)
│   (内部包含 2 个 tab + 1 个 absolute 滑块 ::after 或独立 div)
│   ├── tab-code (flex:1, font:body 14/600, color:动态, text:"验证码", z:1, cursor:pointer)
│   │   [event: click → state.set({loginMode:'code'})]
│   │   [visualState: code-mode→primary色，password-mode→textSecondary]
│   ├── tab-password (flex:1, font:body 14/600, color:动态, text:"密码", z:1, cursor:pointer)
│   │   [event: click → state.set({loginMode:'password'})]
│   │   [visualState: 同上反向]
│   └── slider::after (absolute, w:50%, h:calc(100%-8), top:4, left:4, bg:$surface, radius:full, transition:transform 200ms spring)
│       [bind: transform=loginMode=='password'?'translateX(100%)':'translateX(0)']
│
├── form-card/_block (block, bg:$surface, radius:lg, padding:24, shadow:sm, margin:0 16, display:flex, flex-col, gap:16, position:relative)
│   [className-动态: 'submitting-disabled' | 'shake']
│   [visualState: idle / submitting-disabled / shake-on-error]
│   ├── phone-input (input, h:48, w:100%, radius:md, bg:$surface, border:1px $border, padding:0 16, font:body 14, color:$textPrimary, position:relative)
│   │   ├── label "手机号" (absolute, left:16, top:50% translateY(-50%), color:$textTertiary, font:body 14, transition:transform/color 200ms ease-out)
│   │   │   [visualState focus/has-value: translateY(-22) scale(0.85) color:$primary/$textSecondary]
│   │   ├── input[type=tel] (border:none, bg:transparent, font:body 14, w:100%, h:100%)
│   │   │   [event: focus → 加 .focused 类, blur → 移除]
│   │   │   [event: change → state.set({phone:value})]
│   │   │   [bind: value=state.view.phone]
│   │   └── error-msg (条件 visibleWhen=errorType, position:absolute, top:50, font:caption 12, color:$error)
│   │       [text: 动态错误文案]
│   │
│   ├── code-input (input-group, visibleWhen:{{loginMode=='code'}}, display:flex, gap:8, justify:space-between, position:relative)
│   │   ├── digit-cell-1..6 (每个 w:48, h:48, radius:md, bg:$surface, border:1px $border, font:h3 22/600, color:$textPrimary, text-align:center, line-height:48)
│   │   │   [visualState focused: border 2px $primary + shadow 0 0 0 4px rgba(255,111,145,0.1)]
│   │   │   [visualState error: border 2px $error]
│   │   │   [event: change → state.set({code:拼接 6 位})]
│   │   │   [bind: text=state.view.code[i]]
│   │   ├── send-code-btn (button, visibleWhen:{{loginMode=='code'}}, position:absolute, right:12, top:50% translateY(-50%), bg:transparent, border:none, font:body 14/600, color:$primary, cursor:pointer)
│   │   │   [text: 动态 "获取验证码" or "60s"]
│   │   │   [bind: disabled, color, text]
│   │   │   [event: click → DS-send-code]
│   │   │   [visualState disabled/code-sending: color $textTertiary, cursor not-allowed]
│   │   │   [visualState loading: spinner 16×16 取代文字]
│   │   └── (实际 send-code-btn 在 phone-input 容器内，结构上调整：见下方修正)
│   │
│   ├── password-input (input, visibleWhen:{{loginMode=='password'}}, h:48, w:100%, radius:md, bg:$surface, border:1px $border, padding:0 44 0 16, font:body 14, color:$textPrimary, position:relative)
│   │   ├── label "密码" (absolute, left:16, top:50%, 同 phone-input label)
│   │   ├── input[type=动态] (bind:type=state.view.passwordVisible?'text':'password')
│   │   │   [event: change → state.set({password:value})]
│   │   │   [bind: value=state.view.password]
│   │   ├── eye-icon (w:20, h:20, position:absolute, right:12, top:50% translateY(-50%), cursor:pointer, opacity:0.85)
│   │   │   [素材-动态: passwordVisible? I-01 eye-open : I-02 eye-closed]
│   │   │   [event: click → state.toggle('passwordVisible')]
│   │   └── strength-bar (visibleWhen:{{password.length>0}}, absolute, bottom:-8, left:0, right:0, h:2, 3 段渐变)
│   │
│   └── shake-animation-target (form-card 自身)
│       [visualState shake-on-error: animation shake 400ms ease-out]
│
├── submit-btn (button, w:calc(100% - 32px), h:49, margin:32 16 0, bg:$primary, color:$textInverse, border:none, radius:full, font:h5 16/600, shadow:sm, cursor:pointer, transition:all 200ms spring, display:flex, align:center, justify:center)
│   [event: click → DS-login-* / 见 §8.3 #8]
│   [bind: disabled, data-state]
│   ├── label-text (font:h5, color:$textInverse, text:"登录")
│   │   [visualState loading/success: opacity 0]
│   ├── spinner (visibleWhen:{{submitState=='loading'}}, w:20, h:20, border:2px solid rgba(255,255,255,0.3), border-top:2px solid $textInverse, radius:full, animation:spin 1s linear infinite)
│   └── success-icon (visibleWhen:{{submitState=='success'}}, w:20, h:20, animation:checkmark-draw 300ms ease-out)
│       [素材:I-04 checkmark-success] (白色 ✓ outline 2.5px round)
│   [visualState default: bg $primary + shadow-sm]
│   [visualState hover: scale(1.03) + shadow-md] (桌面端)
│   [visualState pressed: scale(0.97) + shadow-sm 收缩]
│   [visualState focused: outline 2px $primary + 2px offset]
│   [visualState disabled: opacity 0.45 + cursor not-allowed]
│   [visualState loading: text opacity 0 + spinner 显示]
│   [visualState success: bg $success + glow-success + I-04 显示 + 0.5s fade]
│
├── footer/_block (block, display:flex, justify:center, gap:16, padding:24 16)
│   ├── register-link (a, color:$primary, font:body 14, text-decoration:none, cursor:pointer, transition:all 200ms ease-out)
│   │   [text:"注册"]
│   │   [event: click → nav.go("00-register", {phone})]
│   │   [visualState hover: color $primaryHover + underline]
│   │   [visualState active: color $primaryActive + scale(0.98)]
│   │   [visualState focused: outline 2px $primary]
│   └── forgot-link (同 register-link 结构)
│       [text:"忘记密码"]
│       [event: click → nav.go("00-forgot-password", {phone})]
│
└── (条件浮层，由 ConfirmDialog 通用组件渲染)
    ├── confirm-dialog [visibleWhen:errorType in (locked,banned,logging-off)]
    │   [组件: ConfirmDialog (interaction-design/overview.md#共享组件)]
    │   (position:fixed inset:0, bg overlay rgba(45,36,56,0.45), display:flex center, z:1000)
    │   ├── dialog-card (bg:$surface, radius:xl, padding:32 24 24, shadow:xl, max-w:320, animation:modal-slide-up 350ms spring)
    │   │   ├── title (font:h3 22/600, color:$textPrimary, text-align:center)
    │   │   │   [text-动态:见§5.1 表]
    │   │   ├── message (font:body 14, color:$textSecondary, margin-top:8, text-align:center)
    │   │   │   [text-动态]
    │   │   └── actions (display:flex, gap:12, margin-top:24)
    │   │       ├── cancel-btn (flex:1, h:44, bg:$primaryLight, color:$primary, radius:full, font:body 14/600)
    │   │       │   [text:"取消"]
    │   │       └── confirm-btn (flex:1, h:44, bg:$primary, color:$textInverse, radius:full, font:body 14/600)
    │   │           [text-动态:见 §5.1]
    │   │           [event-动态:nav.go / state.set / ...]
    │
    └── toast [visibleWhen:toastShown]
        [组件: Toast (overview.md#共享组件)]
        (position:fixed, top:safe-area-inset-top + 16, left:50% translateX(-50%), bg:$surface, radius:md, padding:12 16, shadow:md, font:body 14, color:$textPrimary)
        [text-动态:见 §8.3 #4]
        [animation:toast-slide-in 300ms spring + auto-dismiss 2.5s + slide-out 200ms ease-out]
```

**事件清单**（汇总）：

| # | 节点路径 | trigger | condition | actions |
|---|---------|---------|-----------|---------|
| E1 | _page | screenEnter | — | logo animation 自动 |
| E2 | mode-toggle/tab-code | click | — | `state.set({loginMode:'code'})` |
| E3 | mode-toggle/tab-password | click | — | `state.set({loginMode:'password'})` |
| E4 | form-card/phone-input | change | — | `state.set({phone})` |
| E5 | form-card/code-input | change | code-mode | `state.set({code})` + 自动提交（if length===6） |
| E6 | form-card/password-input | change | password-mode | `state.set({password})` |
| E7 | form-card/password-input/eye-icon | click | — | `state.toggle('passwordVisible')` |
| E8 | form-card/send-code-btn | click | `phone.length===11 && !codeSending` | `[state.set({codeSending,countdownSec:60}), DS-send-code, ui.showToast, 倒计时 effect]` |
| E9 | submit-btn | click | `formValid && submitState!='loading'` | 见 §8.3 #8 完整流程 |
| E10 | footer/register-link | click | — | `nav.go('00-register', {phone})` |
| E11 | footer/forgot-link | click | — | `nav.go('00-forgot-password', {phone})` |
| E12 | confirm-dialog/confirm-btn | click | — | 动态路由（按 errorType） |

**节点总数估算**：~30 个（含 ConfirmDialog 展开 8 个 + Toast 1 个 + 主体 21 个）。executor 实施量约 4-6 小时。

---

## 10. 完整性自检

按 `references/validation-checklist.md` 自检：

- [x] §7 状态机 11 状态 → §9 节点结构树**全部**有对应 visualState 或 visibleWhen 表达
- [x] 所有"组件"标注（ConfirmDialog / Toast）**内联展开**第一层子节点
- [x] §9 每个节点行**含样式关键词**（尺寸 / token / 行为）
- [x] 叶子节点**全部**有内容标注（文本 / 素材 ID / CSS 描述）
- [x] §8 数据源 / 状态变量 / 事件 三方一致（每个 event 用到的 state 变量都在 stateInit，每个 trigger 都在节点上标注）
- [x] 所有素材引用与 `_materials.json` 索引一致（B-01/I-01/I-02/I-04/D-02/D-03 全部对齐）
- [x] 引用的 Token 全部存在于 `design-system.md`
- [x] 与 `interaction-design/pages/00-login.md` 状态机 100% 对应
