# 复合控件配方：Accordion / Collapse

> 适用：FAQ、设置展开项、长内容折叠、嵌套分类
>
> **核心**：展开 vs 收起 用 chevron 旋转 + height 动画 + 可选 hover 反馈，**双向都要可见且平滑**。

---

## 1. 视觉目标

让用户清楚知道：
1. 这是可点击的折叠项（hover 反馈）
2. 当前是展开还是收起（chevron 方向）
3. 切换时有平滑过渡（不是瞬间跳变）

适用 visualState：default / hover / focus / **expanded**（业务态）/ disabled。

---

## 2. 节点结构（schema）

```jsonc
{
  type: "div",
  name: "FAQAccordionItem",
  label: "FAQ 折叠项",
  styles: {
    borderBottom: "1px solid $token:colors.borderLight"
  },
  children: [
    {
      type: "button",
      name: "AccordionHeader",
      props: { textContent: "" },                      // textContent 在子 HeaderTitle
      styles: {
        width: "100%",
        padding: "$token:spacing.md 0",
        backgroundColor: "transparent",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        textAlign: "left",
        transition: "background-color $token:transitions.fast.value"
      },
      states: [
        { name: "hover", styles: { backgroundColor: "$token:colors.gray100" } },
        { name: "focus", styles: { boxShadow: "0 0 0 2px $token:colors.primaryLight" } }
      ],
      events: [/* interaction 已写 click → toggle expandedKey */],
      children: [
        {
          type: "div",
          name: "HeaderTitle",
          props: { textContent: "{{item.question}}" },
          styles: {
            color: "$token:colors.textPrimary",
            fontSize: "$token:typography.body.fontSize",
            fontWeight: "500",
            lineHeight: "1.4",
            flex: "1"
          }
        },
        {
          type: "div",
          name: "ChevronIcon",
          props: { textContent: "▾" },                 // 简单版用 unicode；进阶用 SVG arrow
          styles: {
            color: "$token:colors.textTertiary",
            fontSize: "16px",
            lineHeight: "1",
            marginLeft: "$token:spacing.sm",
            transformOrigin: "center",
            transform: "rotate(0deg)",                 // ★ 默认朝下
            transition: "transform $token:transitions.normal.value"
          },
          states: [
            {
              name: "expanded",
              activeWhen: "{{state.view.expandedKey === item.id}}",
              styles: { transform: "rotate(180deg)" } // ★ 展开时翻转
            }
          ]
        }
      ]
    },
    {
      type: "div",
      name: "AccordionPanel",
      styles: {
        overflow: "hidden",
        maxHeight: "0",                                // ★ 默认收起
        transition: "max-height $token:transitions.normal.value, padding $token:transitions.normal.value",
        padding: "0 0",
        color: "$token:colors.textSecondary",
        fontSize: "$token:typography.body.fontSize",
        lineHeight: "1.6"
      },
      states: [
        {
          name: "expanded",
          activeWhen: "{{state.view.expandedKey === item.id}}",
          styles: {
            maxHeight: "1000px",                       // ★ 足够大的值（实测以最长内容为准）
            padding: "0 0 $token:spacing.md 0"        // 展开时加内边距
          }
        }
      ],
      children: [
        {
          type: "div",
          name: "PanelContent",
          props: { textContent: "{{item.answer}}" },
          styles: {}
        }
      ]
    }
  ]
}
```

---

## 3. 视觉信号清单

| # | 信号 | 收起 | 展开 |
|:---:|---|---|---|
| 1 | chevron 旋转 | 0deg（朝下）| 180deg（朝上）|
| 2 | panel 高度 | 0（隐藏）| 1000px（显示）|
| 3 | panel padding | 0 | spacing.md（内容呼吸）|
| 4（可选）| header 颜色 | textPrimary | primary（强化）|
| 5（可选）| header 底色 | transparent | gray100（标记当前展开）|

**最低**：1 + 2 + 3（chevron + 高度 + padding）。

---

## 4. 单展开 vs 多展开

### 单展开（accordion 单选）
- state.view.expandedKey: string | null
- click：`state.set view.expandedKey = item.id === current ? null : item.id`
- 一次只能开一项

### 多展开（独立折叠）
- state.view.expandedKeys: string[]
- click：`state.set view.expandedKeys = toggle(item.id)`
- 各项独立

interaction 阶段决定哪种模式 → design 阶段照写 activeWhen 表达式。

---

## 5. height 动画的兼容性

`max-height` 配 transition 是**最广兼容**的方案，但内容动态变化时（如 panel 内含图片懒加载）max-height 不准确——可改用：
- JS 主动测高（不在本配方范围）
- `grid-template-rows: 0fr → 1fr` 动画（现代浏览器，对 Safari 兼容性较新）

简单场景用 max-height 1000px 已够。

---

## 6. 与 interaction 的接口

interaction 阶段已写：
- `state.view.expandedKey` 或 `state.view.expandedKeys`
- repeat 表达式：`expression: "{{ state.data.faqList }}"` + template
- click 事件 → toggle 表达式

design 阶段不动以上，只补：
- ChevronIcon.expanded 视觉态（rotate 180）
- AccordionPanel.expanded 视觉态（maxHeight + padding）
- header.hover / focus 反馈

---

## 7. 对账信号

`query/visual_state_distinctness { nodeId: 'AccordionPanel', stateName: 'expanded' }`：

```
expected: ≥ 2 distinct override
actual: 2 (maxHeight + padding) ✅
```

`query/visual_recognition_audit { nodeId: 'AccordionHeader', role: '工具-切换' }`：

```
expected minSignals: ≥ 2 (chevron 旋转 + panel 切换)
actual: 3 ✅
```

---

## 8. md 落地

```markdown
## FAQAccordion 复合控件落库（参考 recipes/compositions/accordion-collapse.md）

### 当前状态
- interaction 已建：FAQList (repeat data.faqList) → FAQItem 模板 → 含 click 事件 toggle expandedKey
- design 缺：ChevronIcon 旋转态、AccordionPanel 高度态、header hover

### 重构方案
1. style/update FAQAccordionItem / AccordionHeader / HeaderTitle / ChevronIcon / AccordionPanel 全套样式
2. visual_state/add ChevronIcon.expanded（transform: rotate(180deg)）
3. visual_state/add AccordionPanel.expanded（maxHeight: 1000px + padding）
4. visual_state/add AccordionHeader.hover / .focus
5. transition 全部用 transitions.normal.value（300ms）

### 自审
- 切 expandedKey=item.id：chevron 翻转 ✅，panel 滑出 ✅
- hover header：底色变化 ✅
- 平滑无瞬间跳变 ✅
```

---

## 9. 红线

- ❌ 没 chevron 旋转，仅 panel 隐藏 → 用户看不出"会有内容展开"
- ❌ panel 用 `display: none` ↔ `block` → 无法 transition，瞬间跳变
- ❌ panel `height: auto` 无法 transition → 必须用 max-height 大数值或 grid 1fr
- ❌ click 切换 expandedKey 但 ChevronIcon.expanded.activeWhen 表达式错（拼写、单等号、漏 state.view 前缀）
- ❌ 所有项默认全展开（违反 accordion 节省空间初衷）
