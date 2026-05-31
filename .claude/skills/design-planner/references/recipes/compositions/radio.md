# 复合控件配方：Radio

> 适用：单选项（如登录方式选择 / 配送方式 / 性别）
>
> **核心**：与 Checkbox 同 wrapper-label 模式，唯一区别 = 圆形外框 + 圆点勾。
>
> 关联：`pitfalls/web-rendering.md` §1.2 + `recipes/compositions/checkbox.md`

---

## 1. 视觉目标

`unchecked vs checked` ≥ 3 个视觉信号区分（同 checkbox minSignals=3）。

适用 visualState：default / hover / focus / **checked**（业务态）/ disabled。

---

## 2. 节点结构（schema）

```jsonc
// 一组 radio 用 fieldset 或 group div 包；每个 option 一个 wrapper-label
{
  type: "div",
  name: "GenderGroup",
  meta: { design: { kind: "visual-container" } },
  styles: { display: "flex", gap: "$token:spacing.md" },
  children: [
    {
      type: "label",
      name: "GenderMaleLabel",
      props: { htmlFor: "gender-male" },
      styles: {
        display: "flex",
        alignItems: "center",
        gap: "$token:spacing.xs",
        cursor: "pointer"
      },
      meta: { design: { kind: "visual-container" } },
      children: [
        {
          type: "input",
          name: "GenderMaleInput",
          props: { type: "radio", id: "gender-male", name: "gender", value: "male" },
          styles: { display: "none" },                 // ★ native 隐藏
          bind: { kind: "value", path: "view.gender" } // ★ interaction 已写
        },
        {
          type: "div",
          name: "GenderMaleVisual",
          styles: {
            width: "18px",
            height: "18px",
            border: "1.5px solid $token:colors.border",
            borderRadius: "9999px",                    // ★ 圆形（vs checkbox 方形）
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all $token:transitions.fast.value"
          },
          states: [
            {
              name: "checked",
              activeWhen: "{{state.view.gender === 'male'}}",
              styles: { borderColor: "$token:colors.primary" },
              childrenVisibility: { "dot": true }
            },
            { name: "hover", styles: { borderColor: "$token:colors.primaryHover" } },
            { name: "focus", styles: { boxShadow: "0 0 0 3px $token:colors.primaryLight" } }
          ],
          children: [
            {
              type: "div",
              name: "dot",
              visible: false,                          // ★ checked 态显示
              styles: {
                width: "8px",
                height: "8px",
                backgroundColor: "$token:colors.primary",
                borderRadius: "9999px"
              }
            }
          ]
        },
        {
          type: "div",
          name: "GenderMaleText",
          props: { textContent: "男" },
          styles: {
            color: "$token:colors.textPrimary",
            fontSize: "$token:typography.body.fontSize"
          }
        }
      ]
    }
    // 同结构再来一份 GenderFemaleLabel
  ]
}
```

---

## 3. 视觉信号清单（≥ 3）

| # | 信号 | unchecked | checked |
|:---:|---|---|---|
| 1 | 外框颜色 | border 灰 | primary |
| 2 | 圆点 | 隐藏 | 显示 |
| 3 | 焦点光晕 | 无 | primaryLight |

---

## 4. variant 扩展

### 4.1 Card-style radio（每个选项是一个卡片）

```jsonc
GenderMaleLabel.styles: {
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.sm",
  padding: "$token:spacing.lg",
  border: "1.5px solid $token:colors.borderLight",
  borderRadius: "$token:radius.lg",
  cursor: "pointer"
}
// 整个 label 作为卡片，state.view.gender === 'male' 时整张卡片高亮
GenderMaleLabel.states: [
  {
    name: "checked",
    activeWhen: "{{state.view.gender === 'male'}}",
    styles: { borderColor: "$token:colors.primary", backgroundColor: "$token:colors.primaryLight" }
  }
]
```

---

## 5. 与 interaction 的接口

interaction 阶段已写：
- `state.view.gender: 'male' | 'female' | 'other'`
- 各 input 的 `bind` 同名 group + value

design 阶段不动以上，新增 wrapper-label + visual + dot 节点。

---

## 6. 红线

- ❌ 仅用 native input（不 wrapper）→ 浏览器自渲染丑
- ❌ wrapper 模式 native input 没 display:none → 双重渲染
- ❌ 同组 radio 没用同名 `props.name` → 浏览器不识别为同组（即使 design 看起来对）
- ❌ checked 视觉信号 < 3 个
