# 复合控件配方：Stepper（步骤指示）

> 适用：注册多步、订单进度、表单分步、引导流程
>
> **核心**：3 态视觉强区分（completed / current / upcoming），每态色形双重区分。

---

## 1. 视觉目标

用户一眼看出：
1. 总共多少步
2. 当前在第几步
3. 哪些已完成、哪些未开始

适用 visualState：**completed**（业务态）/ **current**（业务态）/ **upcoming**（默认）。

---

## 2. 节点结构（schema）

```jsonc
{
  type: "div",
  name: "RegisterStepper",
  styles: {
    display: "flex",
    alignItems: "center",
    gap: "$token:spacing.sm",
    width: "100%"
  },
  meta: { design: { kind: "visual-container" } },
  children: [
    // 每个 StepItem 由 interaction 阶段 repeat 生成（state.data.steps）
    // design 阶段为 template 内节点写 styles + visualStates
    {
      type: "div",
      name: "StepItem",
      repeat: { expression: "{{state.data.steps}}", template: { /* 见下 */ } },
      // ↑ interaction 已写
      meta: { design: { kind: "visual-container" } },
      styles: { display: "flex", alignItems: "center", flex: "1" },
      children: [
        {
          type: "div",
          name: "StepCircle",
          styles: {
            width: "32px",
            height: "32px",
            borderRadius: "9999px",
            border: "2px solid $token:colors.borderLight",
            backgroundColor: "$token:colors.surfaceElevated",
            color: "$token:colors.textTertiary",
            fontSize: "$token:typography.body.fontSize",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all $token:transitions.normal.value"
          },
          states: [
            {
              name: "completed",
              activeWhen: "{{index < state.view.currentStep}}",
              styles: {
                backgroundColor: "$token:colors.primary",
                borderColor: "$token:colors.primary",
                color: "$token:colors.textInverse"
              }
              // 圆内显示勾（childrenVisibility）
            },
            {
              name: "current",
              activeWhen: "{{index === state.view.currentStep}}",
              styles: {
                backgroundColor: "$token:colors.surfaceElevated",
                borderColor: "$token:colors.primary",
                color: "$token:colors.primary"
              }
            }
            // 默认 = upcoming（无 activeWhen，用默认 styles）
          ]
        },
        {
          type: "div",
          name: "StepLabel",
          props: { textContent: "{{item.label}}" },
          styles: {
            fontSize: "$token:typography.caption.fontSize",
            color: "$token:colors.textSecondary",
            marginLeft: "$token:spacing.sm"
          },
          states: [
            {
              name: "current",
              activeWhen: "{{index === state.view.currentStep}}",
              styles: { color: "$token:colors.textPrimary", fontWeight: "600" }
            }
          ]
        },
        {
          type: "div",
          name: "StepConnector",
          // visibleWhen: 不是最后一个时显示
          visibleWhen: "{{index < state.data.steps.length - 1}}",
          // ↑ interaction 已写
          styles: {
            flex: "1",
            height: "2px",
            backgroundColor: "$token:colors.borderLight",
            margin: "0 $token:spacing.sm",
            transition: "background-color $token:transitions.normal.value"
          },
          states: [
            {
              name: "completed",
              activeWhen: "{{index < state.view.currentStep}}",
              styles: { backgroundColor: "$token:colors.primary" }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 3. 视觉信号清单（3 态各 ≥ 2 信号）

| 态 | 圆色 | 圆边 | 字色 | 字重 | 连接线 |
|---|---|---|---|---|---|
| completed | primary | primary | textInverse | 600 | primary |
| current | surface | primary | primary | 600 | borderLight |
| upcoming | surface | borderLight | textTertiary | 600 | borderLight |

---

## 4. variant：垂直 Stepper

```jsonc
RegisterStepper.styles: { flexDirection: "column", gap: "$token:spacing.md" }
StepConnector.styles: { width: "2px", height: "32px", margin: "$token:spacing.sm 0" }
```

---

## 5. 与 interaction 的接口

- `state.view.currentStep: number`
- `state.data.steps: { label, key }[]`
- `repeat` 在 StepItem 上

design 阶段不动以上，仅写 visualStates。

---

## 6. 红线

- ❌ 三态用单一颜色区分 → 看不清当前在第几步
- ❌ 当前步无字重加强（仅字色）→ 不够突出
- ❌ connector 无完成态变色 → 缺进度感
- ❌ 最后一个 step 后还显示 connector
