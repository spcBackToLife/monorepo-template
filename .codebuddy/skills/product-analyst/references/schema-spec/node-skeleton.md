# 节点骨架规范

## 建什么 / 不建什么

| 类型 | 是否建 | 备注 |
|------|:-----:|------|
| 区域容器（HeaderArea / FormCard / FooterLinks） | ✅ | 用 `div` |
| 业务原子节点（PhoneInput / SubmitBtn / ModeToggle / BrandLogo） | ✅ | 用准确 primitive |
| 业务复合组件（FormField = label+input+error） | ✅ | 含内部叶子（label / input / error 节点） |
| 装饰元素（PinkCircle / GradientGlow / 分割线纹理） | ❌ | 留给 design-planner |
| 运行时显隐节点（LoadingOverlay / ErrorToast / SuccessSheet / EmptyState / 状态机分支视图） | ❌ | 留给 interaction-designer |

## Primitive 选择规范

每个节点必须用**准确的 HTML primitive**：

| 业务节点 | primitive |
|---------|-----------|
| 按钮 | `button` |
| 输入框 | `input` |
| 多行输入 | `textarea` |
| 图片 | `img` |
| 容器 / 文本 / 标签 | `div` |
| 链接（产品阶段统一用 div，交互阶段挂 nav.go） | `div` |

## 命名规范

**PascalCase + 业务语义**：
- ✅ `HeaderArea` / `SubmitBtn` / `BrandLogo` / `PhoneInput` / `CredentialInput`
- ❌ `div1` / `btn` / `el-1` / `Container` / `Wrapper` / `Box`

`label` 字段可写中文显示名（可选）。

## 节点完整结构（产品阶段写到这里为止）

```jsonc
{
  id,                                   // 自动生成，记下来给 meta/set_node 用
  type,                                 // 准确 primitive
  name,                                 // PascalCase
  label: "中文显示名",                   // 可选
  props: {
    textContent: "登录",                 // 静态文案直接写
    placeholder: "请输入手机号",
    type: "tel"                          // input 的 type
    // ⛔ 动态文案 {{state.x}} 留给 interaction
  },
  children: [...],                      // 子节点

  // ⛔ 全部留空（下游写）：
  styles: {},
  states: [],
  events: [],
  // visibleWhen / bind / repeat / animation / materialProjectId
  // editorMetadata / constraints / templateRef / componentBoundary 全部不写

  meta: {
    product: {
      summary: "...该节点承担的需求...",
      fromModules: ["M1"],
      rules: []                          // 仅当该节点有专属规则
    }
    // ⛔ interaction / design / status 留空
  }
}
```

## 推荐的 MCP 调用方式

**优先用 `element/insert_subtree`**——一次性建一整棵子树，避免逐个 add 太繁琐。

```jsonc
element/insert_subtree {
  projectId, screenId,
  parentId: "<rootNode.id>",
  subtree: {
    type: "div", name: "FormCard", props: {},
    children: [
      { type: "div", name: "PhoneField", props: {}, children: [
        { type: "div",   name: "PhoneLabel", props: { textContent: "手机号" }, children: [] },
        { type: "input", name: "PhoneInput", props: { type: "tel", placeholder: "请输入手机号" }, children: [] },
        { type: "div",   name: "PhoneError", props: {}, children: [] }
      ]},
      // ... 其他业务节点
      { type: "button", name: "SubmitBtn", props: { textContent: "登录" }, children: [] }
    ]
  }
}
```

建完后用 `meta/set_node` 给每个业务节点写 `meta.product.summary`。

## 父子关系示例（登录页参考）

```
rootNode (div, ScreenRoot, 默认存在)
├── HeaderArea (div)
│   ├── BrandLogo (img)
│   └── BrandSlogan (div)
├── FormCard (div)
│   ├── PhoneField (div)
│   │   ├── PhoneLabel (div)
│   │   ├── PhoneInput (input)
│   │   └── PhoneError (div)
│   ├── ModeToggle (div)
│   │   ├── CodeModeBtn (button)
│   │   └── PasswordModeBtn (button)
│   ├── CredentialField (div)
│   │   ├── CredentialLabel (div)
│   │   ├── CredentialInput (input)
│   │   └── CredentialError (div)
│   ├── PolicyRow (div)
│   │   ├── PolicyCheckbox (input)
│   │   └── PolicyText (div)
│   └── SubmitBtn (button)
└── FooterLinks (div)
    ├── RegisterLink (div)
    └── ForgotLink (div)
```
