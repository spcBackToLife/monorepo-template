# 复合控件配方：Pagination（分页）

> 适用：列表分页、表格分页
>
> **核心**：当前页 vs 其他页 ≥ 2 信号区分；首/尾页时上一页/下一页 disabled。

---

## 1. 视觉目标

用户清楚看到：
1. 当前在第几页
2. 总共多少页（如显示）
3. 哪些页可点 / 当前页 / 上下页禁用

适用 visualState：default / hover / **active**（业务态）/ disabled。

---

## 2. 节点结构（schema）

```jsonc
{
  type: "div",
  name: "Pagination",
  styles: {
    display: "flex",
    alignItems: "center",
    gap: "$token:spacing.xs",
    justifyContent: "center"
  },
  meta: { design: { kind: "visual-container" } },
  children: [
    // 上一页按钮
    {
      type: "button",
      name: "PrevPageBtn",
      props: { textContent: "‹" },
      styles: {
        width: "32px", height: "32px",
        border: "1px solid $token:colors.border",
        borderRadius: "$token:radius.sm",
        backgroundColor: "$token:colors.surfaceElevated",
        color: "$token:colors.textSecondary",
        fontSize: "16px",
        cursor: "pointer",
        transition: "$token:transitions.fast.value"
      },
      states: [
        { name: "hover", styles: { borderColor: "$token:colors.primary", color: "$token:colors.primary" } },
        {
          name: "disabled",
          activeWhen: "{{state.view.currentPage <= 1}}",
          styles: { opacity: "0.4", cursor: "not-allowed" },
          disabledEvents: ["click"]
        }
      ],
      events: [/* interaction 已写：click → state.set view.currentPage = currentPage - 1 */]
    },
    
    // 数字页码（repeat 由 interaction 写）
    {
      type: "button",
      name: "PageBtn",
      repeat: { expression: "{{state.data.pageNumbers}}", template: { /* 见下 */ } },
      props: { textContent: "{{item}}" },
      styles: {
        minWidth: "32px", height: "32px",
        padding: "0 $token:spacing.sm",
        border: "1px solid $token:colors.border",
        borderRadius: "$token:radius.sm",
        backgroundColor: "$token:colors.surfaceElevated",
        color: "$token:colors.textSecondary",
        fontSize: "$token:typography.body.fontSize",
        cursor: "pointer",
        transition: "$token:transitions.fast.value"
      },
      states: [
        { name: "hover", styles: { borderColor: "$token:colors.primary", color: "$token:colors.primary" } },
        {
          name: "active",
          activeWhen: "{{item === state.view.currentPage}}",
          styles: {
            backgroundColor: "$token:colors.primary",
            borderColor: "$token:colors.primary",
            color: "$token:colors.textInverse",
            fontWeight: "600"
          }
        }
      ]
    },
    
    // 下一页按钮
    {
      type: "button",
      name: "NextPageBtn",
      props: { textContent: "›" },
      // 同 PrevPageBtn 结构，disabled activeWhen: currentPage >= totalPages
    }
  ]
}
```

---

## 3. 视觉信号清单

| 态 | 底色 | 边框 | 字色 | 字重 |
|---|---|---|---|---|
| default | surface | border | textSecondary | 400 |
| hover | surface | primary | primary | 400 |
| active | primary | primary | textInverse | 600 |
| disabled | surface | border | textTertiary | 400 |

---

## 4. variant：紧凑型（仅显示当前/总页 + 上下页）

```jsonc
Pagination.children: [
  PrevPageBtn,
  { name: "PageInfo", props: { textContent: "{{state.view.currentPage}} / {{state.data.totalPages}}" } },
  NextPageBtn
]
```

---

## 5. 与 interaction 的接口

- `state.view.currentPage: number`
- `state.data.totalPages: number`
- `state.data.pageNumbers: number[]`（mock：[1,2,3,4,5]）
- click 事件均 interaction 已写

---

## 6. 红线

- ❌ active 仅靠字色（无底色 / 无字重）→ 区分弱
- ❌ disabled 无视觉 → 用户尝试点击无反应
- ❌ 大量页码全显示（应折叠为 1...5,6,7...20）
- ❌ hover 无反馈
