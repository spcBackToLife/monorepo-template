# 方法论 8：节点结构 4 红线

> 适用任务：`D-X-tree-redlines`
> 即使所有 styles / visualStates / materialSpec 都到位，**节点结构本身有问题，整套设计就废了**。

## 1. 节点结构 4 红线（执行红线）

任何节点写入 schema 时必须满足以下 4 条：

### 红线 1：组件内联展开

业务组件实例化时，**第一层子节点结构必须可见**——不能只写一个 `[组件:Card]` 占位。

```jsonc
❌ 错误：
n4 = { type: "div", name: "FormCard", templateRef: "tpl_formCard" }
   // 但 children 是空 + 没有 inlinedTemplate 字段
   // → executor / 编辑画布看不到内部结构

✅ 正确（方式 A：直接写出实例的内联子节点）：
n4 = {
  type: "div", name: "FormCard",
  children: [
    { id: "n5", type: "div", name: "FormTitle", ... },
    { id: "n6", type: "input", name: "PhoneInput", ... },
    { id: "n7", type: "input", name: "CredentialInput", ... },
    { id: "n8", type: "div", name: "ModeToggle", ... },
    { id: "n9", type: "button", name: "SubmitBtn", ... }
  ]
}

✅ 正确（方式 B：用 asset/instantiate 生成实例，自带子树）：
asset/instantiate { templateId: "tpl_formCard", parentId: ... }
   → 生成的实例 children 已展开
```

**为什么**：编辑画布需要可见结构进行布局调整；executor 需要可遍历所有节点应用素材。

### 红线 2：每个非基准 visualState 必须有对应节点

如 visualStates 里有 `error` 态，节点树中要有对应的"错误提示"子节点：

```jsonc
❌ 错误：
n6 (PhoneInput).states = [
  { name: "error", styles: { borderColor: red } }   // 仅边框变红
]
// 但 PhoneInput 旁边没有 PhoneError 节点显示错误文案
// → 用户只看到红框，不知道哪里错了

✅ 正确：
n6 (PhoneInput).states = [
  { name: "error", styles: { borderColor: red } }
]
n7 (PhoneError) = {                          // ★ 新建对应错误提示节点
  type: "div", name: "PhoneError",
  visibleWhen: "{{!!state.view.errors.phone}}",
  styles: { color: "$token:colors.error", fontSize: "$token:typography.body-sm.fontSize" },
  props: { textContent: "{{state.view.errors.phone}}" }
}
```

同理：
- loading 态 → 有 LoadingSpinner 节点
- success 态 → 有 SuccessIcon 节点
- selected 态 → 有 SelectedIndicator 节点
- locked 态 → 有 LockedSheet overlay

**注**：interaction 阶段已经把这些节点建好了（衍生视图节点）；design 阶段只需核对**每个 visualState 是否真的有对应节点**——若缺，回头让 interaction-designer 补（走 UpstreamChallenge）。

### 红线 3：每个节点必须有完整样式

```jsonc
❌ 错误：
n4 (FormCard).styles = {
  backgroundColor: "$token:colors.bgCard"
  // 仅一个 bg，没 width/height/padding/border/radius/shadow
}

✅ 正确：
n4 (FormCard).styles = {
  width: "100%",
  padding: "$token:spacing.lg",
  backgroundColor: "$token:colors.bgCard",
  borderRadius: "$token:radius.lg",
  boxShadow: "$token:shadows.md",
  border: "1px solid $token:colors.borderLight",
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.md"
}
```

**完整样式必备维度**：
```
布局：display / flexDirection / alignItems / justifyContent / gap
尺寸：width / height (按需 minWidth/minHeight/maxWidth/maxHeight)
间距：padding / margin
颜色：backgroundColor / color / borderColor
排版：fontSize / fontWeight / lineHeight (文字节点)
形状：borderRadius / border
阴影：boxShadow（容器/卡片）
过渡：transition（交互节点）
```

**红线**：不允许"先写关键样式、留给 executor 补"——一次到位。

### 红线 4：叶子节点必须有内容

```jsonc
❌ 错误：
n5 (FormTitle) = { type: "div", name: "FormTitle", children: [], props: {} }
   // 既没 textContent 又没子节点 → 渲染出来是空 div

✅ 正确（文字节点）：
n5 (FormTitle) = {
  type: "div", name: "FormTitle",
  props: { textContent: "欢迎回来" }                // 静态文案
}

✅ 正确（图片节点）：
n2 (BrandLogo) = {
  type: "img", name: "BrandLogo",
  props: { src: "<待 executor 写入 PNG URL>", alt: "校园 Logo" },
  meta: { design: { materialSpec: { kind: "brand", ... } } }      // 标记需要素材
}

✅ 正确（icon 节点）：
n10 (CloseIcon) = {
  type: "div", name: "CloseIcon",
  styles: { backgroundImage: "<executor 写>" },
  meta: { design: { materialSpec: { kind: "icon", renderHint: "png", ... } } }
}

✅ 正确（动态文案，interaction 阶段已写）：
n11 (ButtonText) = {
  type: "span", name: "ButtonText",
  props: { textContent: "{{state.view.submitting ? '登录中...' : '登录'}}" }
}
```

**红线**：叶子节点空内容 → 浏览器渲染空白 → 视觉缺位

## 2. 4 红线核对清单（D-X-tree-redlines 用）

```
对屏的每个节点（深度遍历）：
  □ 红线 1（组件内联）：如果是组件实例，children 是否展开（或 templateRef + inlinedTemplate 都有）？
  □ 红线 2（状态-节点对应）：visualStates 里每个 error/loading/success/selected 等是否都有对应子节点？
  □ 红线 3（完整样式）：styles 是否覆盖布局/尺寸/颜色/排版/形状关键维度？
  □ 红线 4（叶子内容）：叶子节点是否有 textContent / src / backgroundImage / materialSpec？
```

任何 ❌ → 在 md 列出 + 立刻补；如果是 interaction 阶段的责任（如缺 PhoneError 节点）→ 走 UpstreamChallenge 协议。

## 3. 自检快速法

写完一个节点，快问自己：

```
1. 这个节点是组件实例吗？→ children 展开了吗？
2. 这个节点有 visualStates 吗？→ 每个非 default 态都有对应子节点吗？
3. 这个节点的 styles 写齐了吗？→ 布局 + 尺寸 + 颜色 + 间距至少 4 维都有？
4. 这个节点是叶子吗？→ 有 textContent / src / materialSpec 吗？
```

## 4. md 落地（D-X-tree-redlines）

```markdown
## 节点结构 4 红线核对（D-X-tree-redlines）

### 红线 1：组件内联展开
| 节点 | 类型 | children 展开？ | 说明 |
|------|------|:--------------:|------|
| FormCard | molecule | ✅ | 已 instantiate 自动展开 |
| BrandLogo | atom | N/A | 单节点 |
| ... |

### 红线 2：状态-节点对应
| 节点 | 状态 | 对应节点 | 是否存在 |
|------|------|---------|:--------:|
| PhoneInput | error | PhoneError | ✅ |
| CredentialInput | error | CredentialError | ✅ |
| SubmitBtn | loading | SubmitSpinner | ✅ |
| FormCard | locked | LockedSheet (overlay) | ✅ |
| OrderCard | refunding | RefundingView | ❌ 缺！→ UpstreamChallenge |

### 红线 3：完整样式
[每节点 styles 覆盖维度勾选]

### 红线 4：叶子内容
| 叶子节点 | 类型 | 内容 | 是否完整 |
|---------|------|------|:--------:|
| FormTitle | div+text | "欢迎回来" | ✅ |
| BrandLogo | img | materialSpec | ✅ |
| LoadingSpinner | div+icon | materialSpec | ✅ |

### 不一致项 + 修复操作
[列出所有 ❌ + 修复 MCP 调用]

### ★ 沉淀到 schema 的结论
[修复后的 schema 状态确认]
```

## 5. 红线

- ❌ 红线 1-4 任意一条不过 → 整个屏 design 阶段不算完成
- ❌ 跳过 D-X-tree-redlines 直接做 D-X-integrity → 漏掉结构问题
- ❌ 红线 2 发现缺节点不退回 interaction 而是自己加 → 越界（design 只能加纯装饰节点）
- ❌ 红线 3 留"关键样式先写"→ 一次到位原则违反
- ❌ 红线 4 叶子节点用空 div 占位 → 渲染空白
