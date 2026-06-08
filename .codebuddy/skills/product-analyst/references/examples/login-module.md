# 模块分析五步法完整示例 — 登录模块（含节点骨架样板）

> 本示例展示 product-analyst Phase 2 中**单个模块**走完 Step A→E 的样板，**重点**在 Step E 节点骨架 + dataSource + state 占位的 MCP 调用形态。
>
> 对应契约：`STAGE-CONTRACT.md §1`。
>
> 假设项目 `projectId = proj_demo`，模块 `M1 = 用户认证`，屏幕 `00-login`。

---

## Step A: 用户故事穷举（任务 `M1-stories`）

以"作为[角色]，我希望[功能]，以便[价值]"格式，穷举核心 / 扩展 / 异常三类：

```markdown
### M1 用户认证 - 用户故事

核心故事：
- 作为新用户，我希望用手机号验证码免密登录，以便不用记密码
- 作为老用户，我希望用手机号+密码登录，以便快速进入
- 作为用户，我希望切换登录方式（验证码/密码），以便选择当下最方便的方式

扩展故事：
- 作为用户，我希望首次登录后下次自动填充手机号，以便减少输入

异常故事：
- 作为用户，如果手机号格式不对，我希望立即看到提示而不是提交后才知道
- 作为用户，如果密码错多次，我希望知道还能错几次 + 锁定剩余时间
- 作为用户，如果验证码 60s 内重复点击发送，我希望按钮禁用 + 倒计时可见
- 作为用户，如果网络中断，我希望知道是网络问题而不是密码错了
```

**落库**：核心结论浓缩进 `screen.meta.product.summary`。完整故事列表对话里展示即可，schema 中不必逐条落。

```jsonc
// MCP: meta/set_screen
meta/set_screen {
  projectId: "proj_demo", screenId: "00-login",
  patch: {
    product: {
      summary: "校园社交 App 登录入口，支持手机号免密+密码两种方式，含失败锁定与冷却控制"
    }
  }
}
```

---

## Step B: 核心流程 + 异常分支（任务 `M1-flows`）

```markdown
### 登录流程

主线（Happy Path）：
1. 进入登录页 → 2. 输入手机号 → 3. 选登录方式（验证码/密码）
→ 4. 输入凭证 → 5. 勾选协议 → 6. 点击登录 → 7. 提交 fetch
→ 8. 成功（写入 token + user）→ 9. nav.go 主页

异常分支：
├── Step 2: 手机号格式错 → 行内提示 + 提交按钮 disabled
├── Step 3 (验证码): 60s 内重复发送 → 按钮 disabled + 显示倒计时
├── Step 3 (验证码): 短信通道失败 → Toast "请稍后重试" + 不消耗当日额度
├── Step 4 (验证码): 6 位数字 → 自动聚焦 + 输完自动提交
├── Step 6: 协议未勾选 → 登录按钮 disabled
├── Step 7: 凭证错误（401）→ failureCount++ + Toast + 5 次后锁 30 分钟
├── Step 7: 网络中断 → Toast 网络异常 + 表单数据保留
└── Step 7: 服务端 5xx → 兜底 Toast + 客服入口
```

**落库**：流程主线浓缩进 `summary`；异常分支的处理策略**全部沉淀到 Step C 的 rules**——流程图本身不进 schema。

---

## Step C: 业务规则 4 类（任务 `M1-rules` ★ 核心）

```markdown
### 登录模块 - 业务规则（4 类齐全）

数据规则：
- 手机号：11 位中国大陆号段，前端校验 + 后端唯一性
- 验证码：6 位数字
- 密码：6-20 位，含字母+数字
- 登录方式 view.loginMode ∈ { "code" | "password" }
- 协议必勾，view.form.policy = true 才能提交

业务规则：
- 登录方式字段 view.loginMode ∈ { "code" | "password" }（互斥切换）
- 失败状态机：view.failureCount ∈ [0, ∞)；> 5 触发锁定
- 锁定字段 view.lockedUntil ∈ { null | timestamp }；> now() 时进入"锁定视图"
- 成功后立即写入 data.user + data.session，跳转主页
- 验证码倒计时 60s（view.codeCountdown ∈ [0, 60]）

安全规则：
- 密码 6 位起 + 含字母数字（前端先校验，后端再校验）
- 同号 60s 内只能发 1 次验证码；当日 ≤ 10 次
- 密码错误累计 ≥ 5 次锁定该账号 30 分钟
- 短信通道防刷（前置图形验证码——后期增强，本期跳过）
- 设备指纹识别（后端做，前端无感）

边界 Case：
- 提交按钮 800ms 防抖
- 进行中 fetch 时再次点击 → 守卫忽略（view.submitting=true）
- 离开页面（screenExit）→ 取消进行中的 fetch
- 离线 → 显示离线 banner + 提交时阻断
- 键盘遮挡 → 提交按钮 sticky-bottom
- 手机号超 11 位 → 截断 + 提示
```

**落库**（★ 关键）：

```jsonc
// MCP: meta/set_screen
meta/set_screen {
  projectId: "proj_demo", screenId: "00-login",
  patch: {
    product: {
      fromModules: ["M1"],
      rules: [
        "数据规则: 手机号 11 位中国大陆号段；验证码 6 位数字；密码 6-20 位含字母+数字；协议必勾",
        "数据规则: view.loginMode ∈ { 'code' | 'password' }（决定凭证字段含义）",
        "业务规则: 失败状态机——view.failureCount 累加；≥ 5 触发 view.lockedUntil = now()+30min",
        "业务规则: 成功后写入 data.user / data.session，nav.go '01-home'",
        "安全规则: 验证码同号 60s 冷却，当日 ≤ 10 次；密码错 ≥ 5 次锁定 30 分钟",
        "边界 Case: 提交 800ms 防抖；view.submitting 守卫；screenExit 时 cancel fetch；离线 banner 阻断"
      ]
    }
  }
}
```

**⚠️ R-PRODUCT-01**：rules 必须 ≥ 4 条且 4 类齐——上面 6 条覆盖了数据/业务/安全/边界四类。

**⚠️ R-PRODUCT-03**：业务状态机相关的字段+枚举值必须显式写出（如 `view.loginMode ∈ {'code'|'password'}` / `view.failureCount` / `view.lockedUntil`），否则 interaction 阶段不知道有几个状态视图要建。

---

## Step D: 数据模型 + API 契约（任务 `M1-data`）

```markdown
### 登录模块 - 数据需求

涉及实体：
- User: id / phone / nickname / avatar
- Session: token / expiresIn

涉及接口：
- POST /api/auth/login  (登录)
- POST /api/auth/send-code (发送验证码，本屏暂只声明，留给后续扩展)

涉及静态数据：
- 隐私协议 / 用户协议文案
```

**落库**：API 写成 `dataSources`，含完整 `typeDef`：

```jsonc
// MCP: data_source/add (type=api)
data_source/add {
  projectId: "proj_demo", screenId: "00-login",
  dataSource: {
    id: "ds-login",
    type: "api",
    name: "登录接口",
    description: "提交手机号 + 凭证，返回 token + user",
    typeDef: {
      responseName: "LoginResponse",
      responseShape: "object",
      responseFields: [
        { name: "token",     type: "string", description: "JWT 凭证" },
        { name: "user",      type: "User",   description: "用户信息" },
        { name: "expiresIn", type: "number", description: "过期秒数" }
      ],
      paramsName: "LoginParams",
      paramsFields: [
        { name: "phone",      type: "string" },
        { name: "credential", type: "string" },
        { name: "mode",       type: "'code' | 'password'" }
      ]
    }
  }
}

// MCP: data_source/set_endpoint
data_source/set_endpoint {
  projectId: "proj_demo", screenId: "00-login",
  dataSourceId: "ds-login",
  endpoint: {
    method: "POST",
    path: "/api/auth/login",
    body: {
      phone: "<placeholder>",
      credential: "<placeholder>",
      mode: "<placeholder>"
    },
    responseSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        user:  { type: "object", properties: {
          id: { type: "string" }, nickname: { type: "string" },
          avatar: { type: "string" }, phone: { type: "string" }
        }},
        expiresIn: { type: "number" }
      }
    }
  }
}

// 静态文案
data_source/add {
  projectId: "proj_demo", screenId: "00-login",
  dataSource: {
    id: "ds-policy-text", type: "static", name: "协议文案",
    initial: { privacyTitle: "《隐私协议》", termsTitle: "《用户服务协议》" }
  }
}
```

**data 占位**：每个 API → 1 个 `state.data` key + dataTypes 注解：

```jsonc
// MCP: state/data_set_init
state/data_set_init { projectId, screenId: "00-login",
  key: "user",    initial: null,
  typeDef: { typeName: "User",    isArray: false } }

state/data_set_init { projectId, screenId: "00-login",
  key: "session", initial: null,
  typeDef: { typeName: "Session", isArray: false } }
```

**⛔ 本阶段不写**：`mock` 场景 / `autoFetchOnEnter` / `defaultParams`——这是 interaction 阶段的运行时策略。

---

## Step E: 屏幕落库 + 节点骨架 + state 占位（任务 `M1-skeleton` + `M1-state-shape`）

### E.1 创建屏幕（如未创建）

```jsonc
screen/add { projectId: "proj_demo", id: "00-login", name: "登录页" }
```

### E.2 state.view 占位（仅声明已知的产品决策态）

```jsonc
// MCP: state/view_add（多次调用）
state/view_add { projectId, screenId: "00-login",
  variable: {
    name: "loginMode", label: "登录方式",
    defaultValue: "code",
    enum: [
      { value: "code",     label: "验证码免密" },
      { value: "password", label: "密码登录" }
    ]
  }
}

state/view_add { projectId, screenId: "00-login",
  variable: {
    name: "form", label: "表单数据",
    defaultValue: { phone: "", credential: "", policy: false }
  }
}

state/view_add { projectId, screenId: "00-login",
  variable: { name: "submitting", label: "提交中", defaultValue: false }
}

// ⛔ 不写：errors / canSubmit / showPassword / failureCount / lockedUntil /
//        codeCountdown ——这些是运行时派生态，留给 interaction 完整化
```

### E.3 节点骨架（业务原子 + 区域容器）

每屏的骨架按"区域容器 → 业务节点"层级建。建完后骨架长这样：

```
rootNode (div, ScreenRoot, 默认已存在)
├── HeaderArea (div)
│   ├── BrandLogo (img / div)
│   └── BrandSlogan (div, "校园里，找到同好")
├── FormCard (div)
│   ├── PhoneField (div, 复合容器)
│   │   ├── PhoneLabel (div, "手机号")
│   │   ├── PhoneInput (input, type=tel, placeholder=请输入手机号)
│   │   └── PhoneError (div, 留空，文案 interaction 写)
│   ├── ModeToggle (div, 二选一切换)
│   │   ├── CodeModeBtn (button, "验证码")
│   │   └── PasswordModeBtn (button, "密码")
│   ├── CredentialField (div)
│   │   ├── CredentialLabel (div, "验证码/密码")
│   │   ├── CredentialInput (input)
│   │   └── CredentialError (div)
│   ├── PolicyRow (div)
│   │   ├── PolicyCheckbox (input, type=checkbox)
│   │   └── PolicyText (div, "我已阅读并同意 …")
│   └── SubmitBtn (button, "登录")
└── FooterLinks (div)
    ├── RegisterLink (div, "注册账号")
    └── ForgotLink (div, "忘记密码？")
```

**MCP 调用**（推荐用 `element/insert_subtree` 一次性建一整棵，避免逐个 add 太繁琐）：

```jsonc
// MCP: element/insert_subtree
element/insert_subtree {
  projectId: "proj_demo", screenId: "00-login",
  parentId: "<rootNode.id, query/screen_schema 获取>",
  subtree: {
    type: "div",
    name: "HeaderArea",
    label: "顶部品牌区",
    props: {},
    children: [
      { type: "img", name: "BrandLogo", label: "品牌 Logo", props: { alt: "Logo" }, children: [] },
      { type: "div", name: "BrandSlogan", label: "品牌标语",
        props: { textContent: "校园里，找到同好" }, children: [] }
    ]
  }
}

element/insert_subtree {
  projectId, screenId: "00-login",
  parentId: "<rootNode.id>",
  subtree: {
    type: "div", name: "FormCard", label: "表单卡片", props: {},
    children: [
      // PhoneField（复合）
      { type: "div", name: "PhoneField", props: {}, children: [
        { type: "div",   name: "PhoneLabel",  props: { textContent: "手机号" }, children: [] },
        { type: "input", name: "PhoneInput",  props: { type: "tel", placeholder: "请输入手机号" }, children: [] },
        { type: "div",   name: "PhoneError",  props: {}, children: [] }
      ]},
      // ModeToggle
      { type: "div", name: "ModeToggle", props: {}, children: [
        { type: "button", name: "CodeModeBtn",     props: { textContent: "验证码" }, children: [] },
        { type: "button", name: "PasswordModeBtn", props: { textContent: "密码"   }, children: [] }
      ]},
      // CredentialField
      { type: "div", name: "CredentialField", props: {}, children: [
        { type: "div",   name: "CredentialLabel", props: { textContent: "验证码/密码" }, children: [] },
        { type: "input", name: "CredentialInput", props: {}, children: [] },
        { type: "div",   name: "CredentialError", props: {}, children: [] }
      ]},
      // PolicyRow
      { type: "div", name: "PolicyRow", props: {}, children: [
        { type: "input", name: "PolicyCheckbox", props: { type: "checkbox" }, children: [] },
        { type: "div",   name: "PolicyText",
          props: { textContent: "我已阅读并同意《用户服务协议》《隐私协议》" }, children: [] }
      ]},
      // SubmitBtn
      { type: "button", name: "SubmitBtn", props: { textContent: "登录" }, children: [] }
    ]
  }
}

element/insert_subtree {
  projectId, screenId: "00-login", parentId: "<rootNode.id>",
  subtree: {
    type: "div", name: "FooterLinks", props: {}, children: [
      { type: "div", name: "RegisterLink", props: { textContent: "注册账号" },  children: [] },
      { type: "div", name: "ForgotLink",   props: { textContent: "忘记密码？" }, children: [] }
    ]
  }
}
```

### E.4 给每个业务节点写 meta.product

```jsonc
// MCP: meta/set_node（按需逐个；可批量）
meta/set_node {
  projectId, nodeId: "<PhoneInput.id>",
  patch: { product: { summary: "手机号输入，11 位号段；受控绑定 view.form.phone（interaction 写 bind）",
                       fromModules: ["M1"] } }
}

meta/set_node {
  projectId, nodeId: "<SubmitBtn.id>",
  patch: { product: { summary: "登录主 CTA；点击触发 ds-login fetch；受 view.canSubmit 守卫",
                       fromModules: ["M1"] } }
}

meta/set_node {
  projectId, nodeId: "<ModeToggle.id>",
  patch: { product: { summary: "登录方式二选一切换：影响 CredentialInput 的 placeholder/type/校验规则",
                       fromModules: ["M1"] } }
}
// ... 其余业务节点同上
```

### E.5 屏阶段收尾

```jsonc
// 跑完该屏所有 P-X-* 任务后：
meta/set_screen {
  projectId, screenId: "00-login",
  patch: { status: { phase: "analyzed" } }
}

// 自检（任务 P-X-integrity）
query/integrity { projectId, screenId: "00-login" }
// 期望返回 0 个 R-PRODUCT-* 和 R-STRUCTURE-01
```

---

## Step E 的红线复核

- ✅ 区域容器（HeaderArea / FormCard / FooterLinks）已建
- ✅ 业务原子（PhoneInput / SubmitBtn / ModeToggle / 等）已建
- ✅ 业务复合（PhoneField / CredentialField / PolicyRow）已建，内部叶子已建
- ❌ **不建**装饰元素（粉色光晕 / 薄荷叶等）——留给 design
- ❌ **不建**运行时显隐节点（LoadingOverlay / ErrorToast / AccountLockedView）——留给 interaction
- ❌ **不写**任何 `styles`
- ❌ **不写**任何 `events` / `bind` / `repeat`
- ❌ 动态文案（`{{state.x}}`）**不写**；静态文案（`"登录"`、`"手机号"`、`"我已阅读..."`）OK

---

## 模块间关联分析

每个模块分析完，标注与其他模块的依赖关系（写入 `meta.modules[M].summary` 或 `meta.constraints.decisions[]`）：

```
M1 用户认证
  → 依赖：无（入口模块）
  → 被依赖：所有需要登录态的模块（M2 内容浏览 / M3 个人中心 / ...）
  → 关联跳转：00-login → 01-home（成功后） / 00-register（注册账号） / 00-forgot-password（忘记密码）
```

落入 `navigation.flows`：

```jsonc
meta/set_project {
  projectId,
  patch: {
    navigation: {
      flows: [
        { from: "00-login", to: "01-home",            trigger: "登录成功", transition: "fade"  },
        { from: "00-login", to: "00-register",        trigger: "点击注册",  transition: "push"  },
        { from: "00-login", to: "00-forgot-password", trigger: "点击忘记",  transition: "push"  }
      ]
    }
  }
}
```

---

## 收尾任务清单（每屏跑完 5 个子任务后）

```
✅ M1-stories     → schema 中 summary 已表达
✅ M1-flows       → schema 中 summary + rules 已表达
✅ M1-rules       → screen.meta.product.rules（4 类齐）
✅ M1-data        → ds-login（含 typeDef）+ ds-policy-text + state.data 占位
✅ M1-skeleton    → 业务节点骨架已建
✅ M1-state-shape → view 占位 + data 占位完成
✅ M1-coverage    → 三轴覆盖核对通过
✅ M1-integrity   → screen.meta.status.phase = "analyzed" + query/integrity 0 错
```

每完成一项立即 `meta/update_plan_task { taskId, patch: { status: "done", notes: "..." } }`。
