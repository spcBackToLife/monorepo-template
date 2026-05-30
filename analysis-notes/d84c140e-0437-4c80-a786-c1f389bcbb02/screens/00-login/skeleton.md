> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：M1-skeleton
> 对应 schema 字段：screen.rootNode.children + 各节点 meta.product

# Step E: 00-login — 节点骨架取舍论证

> rootNode.id = `nd_6a7f2492b59b4e7eab7e1`（由 query/screen_schema 获取）

## 推理过程

### 1. 屏幕信息架构

登录页是"目标极度收敛 + 输入步骤极少"的典型场景。本屏分 3 个区域：

```
HeaderArea：顶部品牌区（Logo + 标语）→ 给用户"在哪儿"的安全感
   ↓
FormCard：核心表单区（手机号 → 模式切换 → 凭证 → 协议 → 登录按钮）→ 主操作流
   ↓
FooterLinks：底部辅助链接（注册 + 忘记密码）→ 出口
```

3 区域纵向布局（design 阶段决定具体 flex / spacing）。

### 2. 区域容器决策

| 容器 | 是否需要 | 理由 |
|------|:-------:|------|
| HeaderArea | ✅ | 承载品牌 + 标语，与主表单视觉分离 |
| FormCard | ✅ | 表单核心区独立卡片化便于聚焦 |
| FooterLinks | ✅ | 辅助导航（注册 / 忘记密码），低视觉权重 |

### 3. 业务原子节点决策

| 节点 | primitive | 命名理由 |
|------|-----------|---------|
| BrandLogo | `img` | 品牌标识 |
| BrandSlogan | `div` | 纯文字标语（"找到校园同好"等） |
| PhoneInput | `input` | type="tel" 触发数字键盘 |
| CodeModeBtn | `button` | 切换到验证码模式 |
| PasswordModeBtn | `button` | 切换到密码模式 |
| CredentialInput | `input` | 凭证输入；type 由 interaction 阶段根据 `view.loginMode` 动态切换（产品阶段先用 text 占位）|
| GetCodeBtn | `button` | 验证码模式专属按钮（**始终建出，由 interaction 用 visibleWhen 控制只在 code 模式可见**）|
| PasswordToggleEye | `div` | 密码模式下"显示/隐藏"切换按钮（同上，visibleWhen 由 interaction 控制）|
| PolicyCheckbox | `input` | type="checkbox" |
| PolicyText | `div` | 协议文本（含两个链接子节点，由 interaction 挂 nav） |
| SubmitBtn | `button` | 主 CTA "登录" |
| RegisterLink | `div` | "注册账号"出口 |
| ForgotLink | `div` | "忘记密码？" 出口 |

### 4. 业务复合组件决策

| 复合 | 内部叶子 | 是否抽模板 |
|------|---------|----------|
| PhoneField | PhoneLabel + PhoneInput + PhoneError | ❌ 本期不抽（design 阶段评估）|
| CredentialField | CredentialLabel + CredentialInput + CredentialError + GetCodeBtn + PasswordToggleEye | ❌ 同上 |
| PolicyRow | PolicyCheckbox + PolicyText | ❌ 同上 |
| ModeToggle | CodeModeBtn + PasswordModeBtn | ❌ 同上 |

> CredentialField 内部嵌入 GetCodeBtn 和 PasswordToggleEye 是为了"输入框 + 后缀按钮"的容器关系（design 阶段会用 position 布局）。注意：本阶段不写 styles，但**节点关系**已经明示——把 GetCodeBtn 放在 CredentialField 内是因为它视觉上是"输入框右侧的后缀按钮"，与 CredentialInput 同区域。

### 5. 不建什么（边界）

| 节点类型 | 例子 | 留给谁 |
|---------|------|------|
| 装饰元素 | 几何装饰 / 渐变光晕 / 校园元素图形 | design |
| Loading 态 | LoadingOverlay / FormSkeleton | interaction |
| 锁定视图 | AccountLockedView（display lockedUntil 倒计时） | interaction |
| 错误 Toast | ErrorToast | interaction（运行时由 ui.showToast 触发，不是节点）|
| 离线 Banner | OfflineBanner | 已建在 globalOverlays |
| 协议链接的具体 hyperlink | 把 "《用户服务协议》" 拆成可点击 span | interaction（挂 ui.openUrl actions）—— 本阶段 PolicyText 用一个 div 承载完整文案，interaction 阶段决定如何拆点击区 |

### 6. 关于 PolicyText 文本的特殊处理

PolicyText 是静态文案 "我已阅读并同意《用户服务协议》和《隐私协议》"——本阶段直接写 `props.textContent`。点击两个协议名跳转的逻辑是 interaction 阶段的事（届时可能拆成多个 span 子节点，或挂事件解析点击坐标）。**本阶段先用整段文本占位**。

## 节点树（最终结构）

```
rootNode (div, 已存在)
├── HeaderArea (div)
│   ├── BrandLogo (img)
│   └── BrandSlogan (div, "找到校园同好")
├── FormCard (div)
│   ├── PhoneField (div)
│   │   ├── PhoneLabel (div, "手机号")
│   │   ├── PhoneInput (input, type=tel, placeholder=请输入手机号)
│   │   └── PhoneError (div, 留空，文案 interaction 写)
│   ├── ModeToggle (div)
│   │   ├── CodeModeBtn (button, "验证码登录")
│   │   └── PasswordModeBtn (button, "密码登录")
│   ├── CredentialField (div)
│   │   ├── CredentialLabel (div, "凭证")
│   │   ├── CredentialInput (input, type=text, placeholder=请输入)
│   │   ├── CredentialError (div, 留空)
│   │   ├── GetCodeBtn (button, "获取验证码")     // visibleWhen 留 interaction
│   │   └── PasswordToggleEye (div, 留空，留给 interaction 挂 toggle)
│   ├── PolicyRow (div)
│   │   ├── PolicyCheckbox (input, type=checkbox)
│   │   └── PolicyText (div, "我已阅读并同意《用户服务协议》和《隐私协议》")
│   └── SubmitBtn (button, "登录")
└── FooterLinks (div)
    ├── RegisterLink (div, "注册账号")
    └── ForgotLink (div, "忘记密码？")
```

## meta.product.summary 一览（每个业务节点的产品语义）

| 节点 | 产品语义（filled meta.product.summary） | fromModules |
|------|--------------------------------------|------|
| HeaderArea | 顶部品牌区，承载品牌强调字 + 标语 | M1 |
| BrandLogo | 校园社交 App 的品牌 Logo | M1 |
| BrandSlogan | 标语 "找到校园同好"，简约时尚 + 校园温度的语言体现 | M1 |
| FormCard | 核心表单卡片，承载手机号 / 模式切换 / 凭证 / 协议 / 登录主 CTA 整套交互 | M1 |
| PhoneField | 手机号输入复合（label + input + error） | M1 |
| PhoneLabel | "手机号" 静态标签 | M1 |
| PhoneInput | 手机号输入；受控绑定 view.form.phone（interaction 写 bind）；失焦校验 11 位 | M1 |
| PhoneError | 手机号校验错误行内提示位（文案由 interaction 写 textContent 表达式）| M1 |
| ModeToggle | 登录方式互斥切换容器：影响 CredentialInput 的 placeholder/type/校验规则 | M1 |
| CodeModeBtn | 切换到验证码登录（state.set view.loginMode='code'）| M1 |
| PasswordModeBtn | 切换到密码登录（state.set view.loginMode='password'）| M1 |
| CredentialField | 凭证输入复合；内含模式相关的 GetCodeBtn / PasswordToggleEye 后缀 | M1 |
| CredentialLabel | "凭证" 标签（动态文案 "验证码"/"密码" 由 interaction 阶段处理）| M1 |
| CredentialInput | 凭证输入；受控绑定 view.form.credential；type/placeholder 由 interaction 按 view.loginMode 切换 | M1 |
| CredentialError | 凭证错误行内提示位 | M1 |
| GetCodeBtn | 验证码模式专属：点击触发 ds-send-code + 启动 60s 倒计时；visibleWhen=（loginMode==='code'）由 interaction 写；按钮 disabled 守卫 view.codeCountdown>0 由 interaction 写 | M1, M6 |
| PasswordToggleEye | 密码模式专属：点击切换 view.passwordVisible；visibleWhen=（loginMode==='password'）由 interaction 写 | M1 |
| PolicyRow | 协议同意行（合规红线）| M5 |
| PolicyCheckbox | 协议勾选；受控绑定 view.form.policy；未勾时 SubmitBtn disabled | M5 |
| PolicyText | 协议文案静态展示；点击《用户服务协议》《隐私协议》跳外链由 interaction 阶段挂 ui.openUrl | M5 |
| SubmitBtn | 登录主 CTA；点击 effect.fetch ds-login；守卫 form 完整 + policy=true + !submitting + online；onSuccess 写 globalView.session + 消费 nav.authRedirectTo | M1, M5, M6 |
| FooterLinks | 底部辅助导航容器 | M1, M2, M3 |
| RegisterLink | 跳转 00-register（占位）| M2 |
| ForgotLink | 跳转 00-forgot-password（占位）| M3 |

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) 用 element/insert_subtree 一次性建一整棵 HeaderArea
element/insert_subtree {
  projectId, screenId,
  parentId: "nd_6a7f2492b59b4e7eab7e1",   // rootNode.id
  subtree: {
    type: "div", name: "HeaderArea", label: "顶部品牌区",
    props: {},
    children: [
      { type: "img", name: "BrandLogo",   label: "品牌 Logo",
        props: { alt: "Logo" }, children: [] },
      { type: "div", name: "BrandSlogan", label: "品牌标语",
        props: { textContent: "找到校园同好" }, children: [] }
    ]
  }
}

// 2) FormCard
element/insert_subtree {
  projectId, screenId,
  parentId: "nd_6a7f2492b59b4e7eab7e1",
  subtree: {
    type: "div", name: "FormCard", label: "表单卡片",
    props: {},
    children: [
      // PhoneField
      { type: "div", name: "PhoneField", label: "手机号字段", props: {}, children: [
        { type: "div",   name: "PhoneLabel",  props: { textContent: "手机号" }, children: [] },
        { type: "input", name: "PhoneInput",  props: { type: "tel", placeholder: "请输入手机号", maxLength: 11 }, children: [] },
        { type: "div",   name: "PhoneError",  props: {}, children: [] }
      ]},
      // ModeToggle
      { type: "div", name: "ModeToggle", label: "登录方式切换", props: {}, children: [
        { type: "button", name: "CodeModeBtn",     props: { textContent: "验证码登录" }, children: [] },
        { type: "button", name: "PasswordModeBtn", props: { textContent: "密码登录"   }, children: [] }
      ]},
      // CredentialField
      { type: "div", name: "CredentialField", label: "凭证字段", props: {}, children: [
        { type: "div",   name: "CredentialLabel", props: { textContent: "凭证" }, children: [] },
        { type: "input", name: "CredentialInput", props: { type: "text",  placeholder: "请输入" }, children: [] },
        { type: "div",   name: "CredentialError", props: {}, children: [] },
        { type: "button", name: "GetCodeBtn",     props: { textContent: "获取验证码" }, children: [] },
        { type: "div",    name: "PasswordToggleEye", label: "密码显隐切换", props: {}, children: [] }
      ]},
      // PolicyRow
      { type: "div", name: "PolicyRow", label: "协议同意行", props: {}, children: [
        { type: "input", name: "PolicyCheckbox", props: { type: "checkbox" }, children: [] },
        { type: "div",   name: "PolicyText",
          props: { textContent: "我已阅读并同意《用户服务协议》和《隐私协议》" }, children: [] }
      ]},
      // SubmitBtn
      { type: "button", name: "SubmitBtn", props: { textContent: "登录" }, children: [] }
    ]
  }
}

// 3) FooterLinks
element/insert_subtree {
  projectId, screenId,
  parentId: "nd_6a7f2492b59b4e7eab7e1",
  subtree: {
    type: "div", name: "FooterLinks", label: "底部链接", props: {},
    children: [
      { type: "div", name: "RegisterLink", props: { textContent: "注册账号" },  children: [] },
      { type: "div", name: "ForgotLink",   props: { textContent: "忘记密码？" }, children: [] }
    ]
  }
}

// 4) 给每个业务节点写 meta.product（按上面"meta.product.summary 一览"逐一 set_node）
// （ID 由 insert_subtree 返回，落库时按返回的 affectedNodeIds 逐个 set_node）
```
