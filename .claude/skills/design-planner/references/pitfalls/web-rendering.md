# 陷阱清单：Web 真实渲染能力（v3 新增）

> 适用任务：所有 `D-X-craft-*`、`D-X-styles`、`D-X-states`
>
> **核心**：HTML 有一组"半开放"控件——浏览器自渲染默认外观，CSS 仅能改少数属性。**资深设计师在拿到这类控件时立刻包装一层**——不会让浏览器的默认样式出场。
>
> 设计前必读：本屏出现的每一个 native 控件 → 查本表 → 选 workaround → 落 schema。

---

## 1. 不可深度自定义的 native 控件清单

### 1.1 `<input type=checkbox>` ★ 高危（登录页常见）

| 属性 | 可设吗 | 说明 |
|---|:---:|---|
| width / height | ✅ | 但 ≤ 24px 后某些浏览器仍渲染默认大小 |
| margin / padding | ✅ | |
| accentColor | ⚠️ | **只染选中态的勾**，不染未选中态外框/底色 |
| borderRadius / border / backgroundColor | ❌ | 大多数浏览器忽略 |
| 自绘勾（::before / ::after）| ❌ | input 不能加伪元素 |

**workaround：wrapper-label 模式**

```jsonc
{
  type: "label",
  name: "PolicyCheckLabel",
  props: { htmlFor: "policy-check" },
  styles: { display: "flex", alignItems: "center", gap: "$token:spacing.xs", cursor: "pointer" },
  children: [
    {
      type: "input",
      name: "PolicyCheckbox",
      props: { type: "checkbox", id: "policy-check" },
      styles: { display: "none" },                    // ★ native 隐藏
      bind: { kind: "value", path: "view.policyAccepted" }
    },
    {
      type: "div",                                    // ★ 自绘外框
      name: "PolicyCheckVisual",
      styles: {
        width: "18px", height: "18px",
        border: "1.5px solid $token:colors.border",
        borderRadius: "$token:radius.sm",
        backgroundColor: "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all $token:transitions.fast.value"
      },
      states: [
        {
          name: "checked",
          activeWhen: "{{state.view.policyAccepted}}",
          styles: { backgroundColor: "$token:colors.primary", borderColor: "$token:colors.primary" },
          childrenVisibility: { "checkmark": true }
        },
        {
          name: "focus",
          styles: { boxShadow: "0 0 0 3px $token:colors.primaryLight" }
        }
      ],
      children: [
        {
          type: "div",                                // ★ 勾（unicode 简易版；复杂版用 SVG）
          name: "checkmark",
          props: { textContent: "✓" },
          visible: false,
          styles: { color: "$token:colors.textInverse", fontSize: "12px", fontWeight: "700", lineHeight: 1 }
        }
      ]
    }
  ]
}
```

**最低识别阈值**（来自 02-visual-budget.md §4）：≥ 3 个手段（自绘外框 + 选中底色 + 勾 + 焦点光晕，任选 ≥3）。

---

### 1.2 `<input type=radio>`

同 1.1 wrapper 模式 —— 唯一区别：自绘外框圆形（`borderRadius: 50%`），勾用 ::after 圆点（`width: 8px; height: 8px; backgroundColor: primary; borderRadius: 50%`）。

---

### 1.3 `<select>` ★ 高危

| 属性 | 可设吗 | 说明 |
|---|:---:|---|
| 边框 / 圆角 / 字色 / 高度 | ⚠️ | iOS Safari 仍可能强制系统外观 |
| 下拉箭头 icon | ❌ | 浏览器自渲染 |
| `<option>` 列表样式 | ❌ | 完全不可定制 |

**workaround**：放弃 native select，改用 `<div role="combobox">` + 自绘 chevron icon + `screen.overlays` 浮层装 options。

```jsonc
{
  type: "div",
  name: "ProvinceCombobox",
  props: { role: "combobox", "aria-expanded": "{{state.view.provinceOpen}}" },
  styles: { /* 完整 input 样式：border / radius / padding / cursor / 等 */ },
  events: [{ trigger: "click", actions: [{ kind: "state.set", path: "view.provinceOpen", value: true }]}],
  children: [
    { type: "div", name: "ComboValue", props: { textContent: "{{state.view.province ?? '请选择省份'}}" }, styles: {} },
    { type: "div", name: "ComboChevron", props: { textContent: "▾" }, styles: { color: "$token:colors.textTertiary" } }
  ]
}
// 配套 screen.overlays 一个 ProvinceOptionsList，用 visibleWhen 控制
```

---

### 1.4 `<input type=file>`

| 属性 | 可设吗 |
|---|:---:|
| 按钮文案 | ❌ |
| 按钮尺寸 / 颜色 | ❌ |

**workaround**：`<label for="hidden-file">` + 自绘按钮 + `<input type=file>` 设 `display:none`。

```jsonc
{
  type: "label",
  props: { htmlFor: "avatar-file" },
  styles: { /* 完整自绘按钮样式 */ },
  children: [
    { type: "input", props: { type: "file", id: "avatar-file", accept: "image/*" }, styles: { display: "none" }, events: [...] },
    { type: "div", props: { textContent: "上传头像" }, styles: {} }
  ]
}
```

---

### 1.5 `<input type=range>` / `type=date` / `type=time` / `type=color`

跨浏览器外观差异极大，**务必用第三方组件或自绘**。schema 层用 `<div role="slider">` + state.view 状态托管 + 自绘轨道+滑块。

---

## 2. 部分可控但需注意的控件

### 2.1 `<button>`

| 属性 | 可设吗 | 注意 |
|---|:---:|---|
| 全部 CSS | ✅ | 但浏览器有默认 `appearance: button` |

**必须重置**（在节点 styles 写一次，或 SchemaRenderer 全局基线已注入）：
```css
appearance: none;
-webkit-appearance: none;
font: inherit;
border: 0;
cursor: pointer;
background: transparent;  /* 然后再写 backgroundColor token */
```

P0-4(b) 已在 SchemaRenderer 注入 button reset 基线，**节点 styles 写 token 即可**。

---

### 2.2 `<a>`

浏览器默认带下划线 + visited 紫色。装饰性 link 需显式 `text-decoration: none` + visited 与 default 同色（除非有意保留 visited 视觉）。

---

### 2.3 `<input type=text/tel/email/password>`

CSS 几乎全可控，**唯一陷阱**：iOS 自动放大 fontSize < 16px → 在表单输入字段必须 `fontSize: $token:typography.body-lg.fontSize`（= 16px）。

---

### 2.4 placeholder

```css
::placeholder { color: $token:colors.textTertiary; }   /* 在 input 节点 styles 用 selector 写 */
```

如 SchemaRenderer 不支持 selector 写法 → 用 `propsBased` 兜底：在 input.props 加 `placeholder` 文案，色由 SchemaRenderer 全局注入。

---

## 3. 设计阶段的判定流程

```
对每个 node：
  1. node.type === 'input' && props.type ∈ {'checkbox','radio','file','range','date','time','color'}
     → 必须使用 wrapper 模式 → 在 budget 表标 workaroundPattern + 在 craft 任务里加 wrapper 子树
  2. node.type === 'select' → 必须改用 combobox 模式
  3. node.type === 'button' → 确认 SchemaRenderer reset 基线已生效（P0-4b）；styles 必须含 backgroundColor + cursor + transition
  4. node.type === 'a' → 显式写 textDecoration + 重置 visited
```

---

## 4. md 落地（在 D-X-craft-form / D-X-styles 任务中）

```markdown
## native 控件 workaround 决策

| 节点 | type | props.type | workaroundPattern | 修改 |
|---|---|---|---|---|
| PolicyCheckbox | input | checkbox | wrapper-label | element/wrap 增加 PolicyCheckLabel + PolicyCheckVisual + checkmark；设 native input display:none |
| ProvinceSelect | select | — | combobox-with-overlay | element/change_type select → div role=combobox + 配套 screen.overlays |
| AvatarUpload | input | file | label-button | element/wrap 增加 AvatarUploadLabel；input display:none |

### 在 schema 上的影响
- 增加 N 个视觉容器节点（属于 design 阶段允许动作，参 SKILL §5.4）
- input 的 events / bind 不变（interaction 阶段已写）
- 新增的 visual 节点由 design-planner 标 meta.design.kind = "visual-container"
```

---

## 5. 红线

- ❌ 看到 native checkbox/radio/select 仍按"加 width/height/accentColor"应付 → R-RECOG-01 必报失败
- ❌ wrapper 模式忘记给 native input 加 `display:none` → 双重渲染（native + 自绘同时显示）
- ❌ wrapper 模式忘记设 `htmlFor` / `id` → 点击 wrapper 不切换 checkbox
- ❌ combobox 模式忘记建 screen.overlays → 下拉浮层无处呈现
- ❌ button 节点无 reset 但靠 SchemaRenderer 基线兜底 → 在测试环境（无渲染器基线）会显示浏览器默认外观
