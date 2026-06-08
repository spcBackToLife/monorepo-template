# 复合控件配方：Select / Combobox

> 适用：下拉选择（省份 / 排序 / 分类筛选 等）
>
> **核心**：native `<select>` 在 iOS Safari / 移动端被强制系统外观，CSS 几乎不可控 → 必须用 `<div role="combobox">` + 自绘 chevron + 配套 screen.overlays 浮层装 options。
>
> 关联：`pitfalls/web-rendering.md` §1.3

---

## 1. 视觉目标

让用户清楚看到：
1. 这是可选择的下拉控件
2. 当前选中的是什么
3. 点击后下拉浮层弹出
4. 选项可视、可滚动、可选中

适用 visualState：default / hover / focus / **expanded**（业务态）/ disabled / has-value。

---

## 2. 节点结构（schema）

```jsonc
{
  type: "div",
  name: "ProvinceSelect",
  label: "省份选择",
  props: { role: "combobox", "aria-expanded": "{{state.view.provinceOpen ? 'true' : 'false'}}" },
  styles: {
    width: "100%",
    height: "48px",
    padding: "0 $token:spacing.md",
    border: "1px solid $token:colors.border",
    borderRadius: "$token:radius.md",
    backgroundColor: "$token:colors.surfaceElevated",
    fontSize: "$token:typography.body-lg.fontSize",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    transition: "$token:transitions.fast.value"
  },
  meta: { design: { kind: "visual-container" } },
  states: [
    { name: "hover", styles: { borderColor: "$token:colors.primaryHover" } },
    { name: "focus", styles: { borderColor: "$token:colors.primary", boxShadow: "0 0 0 3px $token:colors.primaryLight" } },
    {
      name: "expanded",
      activeWhen: "{{state.view.provinceOpen}}",
      styles: { borderColor: "$token:colors.primary" }
    },
    {
      name: "has-value",
      activeWhen: "{{!!state.view.province}}",
      styles: {}                                        // 选了之后字色变 textPrimary（v 子节点 ComboValue 控制）
    },
    { name: "disabled", styles: { opacity: "0.5", cursor: "not-allowed" } }
  ],
  events: [/* interaction 已写：click → toggle state.view.provinceOpen */],
  children: [
    {
      type: "div",
      name: "ComboValue",
      props: { textContent: "{{state.view.province ?? '请选择省份'}}" },
      styles: { fontSize: "$token:typography.body-lg.fontSize" },
      states: [
        {
          name: "placeholder",
          activeWhen: "{{!state.view.province}}",
          styles: { color: "$token:colors.textTertiary" }
        },
        {
          name: "value",
          activeWhen: "{{!!state.view.province}}",
          styles: { color: "$token:colors.textPrimary" }
        }
      ]
    },
    {
      type: "div",
      name: "ComboChevron",
      props: { textContent: "▾" },                     // 简单版 unicode；进阶版 SVG path
      styles: {
        color: "$token:colors.textTertiary",
        fontSize: "16px",
        transformOrigin: "center",
        transform: "rotate(0deg)",
        transition: "transform $token:transitions.normal.value"
      },
      states: [
        {
          name: "expanded",
          activeWhen: "{{state.view.provinceOpen}}",
          styles: { transform: "rotate(180deg)" }
        }
      ]
    }
  ]
}

// === 配套 screen.overlays（design 阶段允许加视觉 overlay）===
{
  id: "province-options-overlay",
  type: "anchor",                                       // 锚定 ProvinceSelect
  showWhen: "{{state.view.provinceOpen}}",
  rootNode: {
    type: "div",
    name: "ProvinceOptionsList",
    meta: { design: { kind: "visual-container" } },
    styles: {
      backgroundColor: "$token:colors.surfaceElevated",
      borderRadius: "$token:radius.md",
      boxShadow: "$token:shadows.lg",
      maxHeight: "300px",
      overflowY: "auto",
      padding: "$token:spacing.xs"
    },
    children: [
      {
        type: "div",
        name: "ProvinceOption",
        repeat: { expression: "{{state.data.provinces}}", template: { /* per-item */ } },
        // ↑ ⚠️ repeat 是 interaction 阶段的字段，design 不动
        // 实际：interaction 阶段已建好 repeat + click 事件 → state.set view.province
        // design 仅给 styles + visualStates
        styles: {
          padding: "$token:spacing.sm",
          borderRadius: "$token:radius.sm",
          cursor: "pointer",
          fontSize: "$token:typography.body.fontSize"
        },
        states: [
          { name: "hover", styles: { backgroundColor: "$token:colors.gray100" } },
          {
            name: "selected",
            activeWhen: "{{state.view.province === item.code}}",
            styles: { backgroundColor: "$token:colors.primaryLight", color: "$token:colors.primary" }
          }
        ]
      }
    ]
  }
}
```

---

## 3. 视觉信号清单

| # | 信号 | 收起 | 展开 | 已选 |
|:---:|---|---|---|---|
| 1 | chevron 旋转 | 0deg | 180deg | — |
| 2 | 边框色 | border 灰 | primary | — |
| 3 | 文字色 | textTertiary（placeholder）| — | textPrimary（value）|
| 4 | 选项浮层 | 隐藏 | 显示 + scroll | — |
| 5 | 当前选项高亮 | — | selected option bg primaryLight | — |

---

## 4. 与 interaction 的接口

interaction 阶段已写：
- `state.view.province: string | null`
- `state.view.provinceOpen: boolean`
- `state.data.provinces: { code, name }[]`（mock scenarios 提供）
- click ProvinceSelect → toggle view.provinceOpen
- click 某 option → set view.province + close

design 阶段不动以上，仅写 styles + visualStates + 在 screen.overlays 加 ProvinceOptionsList overlay 的视觉规格。

---

## 5. 红线

- ❌ 用 native `<select>` 不替换为 combobox → 浏览器外观不可控
- ❌ 不建 screen.overlays → 选项浮层无处呈现
- ❌ 选项 hover 没视觉反馈
- ❌ chevron 无 transition → 切换瞬间跳变
- ❌ selected 选项无视觉高亮
- ❌ 浮层最大高度无 maxHeight → 长列表撑满屏幕
