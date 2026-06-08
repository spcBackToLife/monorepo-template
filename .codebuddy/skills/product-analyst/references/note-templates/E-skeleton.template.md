> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<M>-skeleton
> 对应 schema 字段：screen.rootNode.children / 节点 meta.product

# Step E: <screenId> — 节点骨架取舍论证

> 详细规范见 `schema-spec/node-skeleton.md` 和 `methodology/04-five-step-method.md` Step E。

## 推理过程

### 1. 屏幕信息架构

本屏要展示什么核心信息？分几个区域？区域间是什么关系？

```
HeaderArea: 顶部信息（品牌 / 标题 / 返回按钮）
   ↓
MainContent: 主体内容（核心交互 / 信息展示）
   ↓
FooterLinks: 底部辅助信息（链接 / 协议 / 切换入口）
```

### 2. 区域容器决策

| 容器 | 是否需要 | 理由 |
|------|:-------:|------|
| HeaderArea | ✅ | 承载品牌 + 标语，与主表单视觉分离 |
| FormCard | ✅ | 业务核心区，独立卡片化便于聚焦 |
| FooterLinks | ✅ | 辅助导航（注册 / 忘记密码），与主表单区分 |
| ... | | |

### 3. 业务原子节点决策

| 节点 | primitive | 命名理由 |
|------|-----------|---------|
| BrandLogo | img | 品牌标识，img 合理 |
| BrandSlogan | div | 纯文字标语 |
| PhoneInput | input | 手机号输入，type="tel" |
| ModeToggle | div | 二选一容器（内部 button 子节点）|
| CodeModeBtn | button | 触发切换的按钮 |
| PasswordModeBtn | button | 同上 |
| CredentialInput | input | 凭证输入 |
| PolicyCheckbox | input | type="checkbox" |
| SubmitBtn | button | 主 CTA |
| ... | | |

### 4. 业务复合组件决策

| 复合 | 内部叶子 | 复用性 |
|------|---------|-------|
| PhoneField | PhoneLabel + PhoneInput + PhoneError | 在登录 / 注册 / 找回密码屏复用 |
| CredentialField | CredentialLabel + CredentialInput + CredentialError | 同上 |
| PolicyRow | PolicyCheckbox + PolicyText | 同上 |
| ... | | |

[决定：本阶段所有 FormField 内部叶子全部建，不抽模板（design 阶段才抽）]

### 5. 不建什么（边界）

| 节点类型 | 例子 | 留给谁 |
|---------|------|------|
| 装饰元素 | PinkCircleDeco / GradientGlow / MintLeafSplash | design |
| 数据加载态 | LoadingOverlay / FormSkeleton | interaction |
| 空态 | EmptyState | interaction |
| 错误态 | ErrorBanner / ServerErrorPage | interaction |
| 状态机分支视图 | AccountLockedView | interaction |
| 全局兜底 | 都在 globalOverlays | 已在 P-global-overlays |

### 6. 节点 ID 与 name 一一对应

骨架建好后，记录节点 ID（用于后续 meta/set_node）：

```
HeaderArea         → <id_001>
  BrandLogo        → <id_002>
  BrandSlogan      → <id_003>
FormCard           → <id_004>
  PhoneField       → <id_005>
    ...
```

## 节点树（最终结构）

```
rootNode (div)
├── HeaderArea (div)
│   ├── BrandLogo (img)
│   └── BrandSlogan (div, "校园里，找到同好")
├── FormCard (div)
│   ├── PhoneField (div)
│   │   ├── PhoneLabel (div, "手机号")
│   │   ├── PhoneInput (input, tel, "请输入手机号")
│   │   └── PhoneError (div, 留空)
│   ├── ModeToggle (div)
│   │   ├── CodeModeBtn (button, "验证码")
│   │   └── PasswordModeBtn (button, "密码")
│   ├── CredentialField (div)
│   │   ├── CredentialLabel (div, "验证码/密码")
│   │   ├── CredentialInput (input)
│   │   └── CredentialError (div)
│   ├── PolicyRow (div)
│   │   ├── PolicyCheckbox (input, checkbox)
│   │   └── PolicyText (div, "我已阅读并同意《用户服务协议》《隐私协议》")
│   └── SubmitBtn (button, "登录")
└── FooterLinks (div)
    ├── RegisterLink (div, "注册账号")
    └── ForgotLink (div, "忘记密码？")
```

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) 创建屏幕（如未创建）
screen/add { projectId, id: "<screenId>", name: "<屏名>" }

// 2) 拿 rootNode.id（query/screen_schema）
// 3) 用 element/insert_subtree 一次性建一整棵
element/insert_subtree {
  projectId, screenId,
  parentId: "<rootNode.id>",
  subtree: {
    type: "div", name: "HeaderArea", props: {},
    children: [
      { type: "img", name: "BrandLogo", props: { alt: "Logo" }, children: [] },
      { type: "div", name: "BrandSlogan",
        props: { textContent: "校园里，找到同好" }, children: [] }
    ]
  }
}

element/insert_subtree {
  projectId, screenId,
  parentId: "<rootNode.id>",
  subtree: {
    type: "div", name: "FormCard", props: {},
    children: [
      // ... 完整 FormCard 子树
    ]
  }
}

// 4) 给每个业务节点写 meta.product
meta/set_node {
  projectId, nodeId: "<PhoneInput.id>",
  patch: { product: { summary: "手机号输入；受控绑定 view.form.phone（interaction 写 bind）",
                       fromModules: ["<M>"] } }
}
// ...（每个业务节点同样落 meta）
```
