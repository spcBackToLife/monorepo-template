# 复合控件配方：Checkbox

> 适用：协议勾选、批量选择、过滤选项、表单 boolean 字段
>
> **核心**：native `<input type=checkbox>` 不可深度自定义 → 必须用 wrapper-label 模式自绘外框 + 勾。
>
> 关联陷阱清单：`pitfalls/web-rendering.md` §1.1

---

## 1. 视觉目标

让用户**未选 vs 选中**有 ≥ 3 个视觉信号区分（最低识别阈值，参 02-visual-budget.md §4）。

适用 visualState：default / hover / focus / checked / disabled-unchecked / disabled-checked / error。

---

## 2. 节点结构（schema）

```jsonc
{
  type: "label",
  name: "PolicyCheckLabel",
  label: "协议勾选行",
  props: { htmlFor: "policy-check" },
  styles: {
    display: "flex",
    alignItems: "center",
    gap: "$token:spacing.xs",
    cursor: "pointer",
    userSelect: "none"
  },
  meta: { design: { kind: "visual-container" } },     // ★ design 阶段允许 add 视觉容器
  children: [
    {
      type: "input",
      name: "PolicyCheckbox",
      props: { type: "checkbox", id: "policy-check" },
      styles: { display: "none" },                     // ★ native 隐藏
      bind: { kind: "value", path: "view.policyAccepted" },   // ★ interaction 已写
      // events 由 interaction 已建（如有 change 事件触发表单校验）
    },
    {
      type: "div",
      name: "PolicyCheckVisual",                       // ★ 自绘外框
      styles: {
        width: "18px",
        height: "18px",
        flexShrink: "0",
        border: "1.5px solid $token:colors.border",
        borderRadius: "$token:radius.sm",              // ← 4dp 软化
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all $token:transitions.fast.value"
      },
      states: [
        {
          name: "checked",
          activeWhen: "{{state.view.policyAccepted}}",
          styles: {
            backgroundColor: "$token:colors.primary",
            borderColor: "$token:colors.primary"
          },
          childrenVisibility: { "checkmark": true }    // ★ 选中时显示勾
        },
        {
          name: "hover",
          styles: { borderColor: "$token:colors.primaryHover" },
          transition: { duration: 150, easing: "ease-out" }
        },
        {
          name: "focus",
          styles: { boxShadow: "0 0 0 3px $token:colors.primaryLight" }
        },
        {
          name: "disabled",
          activeWhen: "{{state.view.policyDisabled}}",
          styles: { opacity: "0.5", cursor: "not-allowed", borderColor: "$token:colors.borderLight" }
        },
        {
          name: "error",
          activeWhen: "{{!state.view.policyAccepted && state.view.submitAttempted}}",
          styles: { borderColor: "$token:colors.error" }
        }
      ],
      children: [
        {
          type: "div",
          name: "checkmark",
          props: { textContent: "✓" },                // 简单版：unicode
          // 进阶：用 SVG path 自绘：M3 9 L7 13 L15 5
          visible: false,                              // 默认隐藏；checked 态触发显示
          styles: {
            color: "$token:colors.textInverse",
            fontSize: "12px",
            fontWeight: "700",
            lineHeight: "1"
          }
        }
      ]
    },
    {
      type: "div",
      name: "PolicyText",
      props: { textContent: "我已阅读并同意《用户服务协议》和《隐私协议》" },
      styles: {
        color: "$token:colors.textSecondary",
        fontSize: "$token:typography.body.fontSize",
        fontFamily: "$token:typography.body.fontFamily",
        lineHeight: "$token:typography.body.lineHeight"
      }
    }
  ]
}
```

---

## 3. 视觉信号清单（最低 ≥ 3）

| # | 信号 | 默认 | 选中 |
|:---:|---|---|---|
| 1 | 外框颜色 | border (灰) | primary |
| 2 | 内填颜色 | transparent | primary |
| 3 | 勾 | 隐藏 | 显示 ✓ |
| 4 | 焦点光晕（focus）| 无 | primaryLight 3px |
| 5 | 错误高亮（error）| 无 | error 边框 |

---

## 4. variant 扩展

### 4.1 大尺寸 (24×24)
- width / height = "24px"
- borderRadius = `radius.md`（6dp）
- 勾的 fontSize = "16px"

### 4.2 圆形 radio
- borderRadius = "9999px"
- 勾换成圆点：`<div>` `width:8px height:8px backgroundColor:textInverse borderRadius:50%`

### 4.3 错误必填态（如未勾选协议但提交）
- error visualState 自动激活：
  ```
  activeWhen: "{{!state.view.policyAccepted && state.view.submitAttempted}}"
  ```

---

## 5. SVG 勾（进阶版，比 unicode 视觉更佳）

```jsonc
// checkmark 节点改为 svg 包装
{
  type: "div",
  name: "checkmark",
  visible: false,
  styles: { width: "12px", height: "12px" },
  // 内嵌 SVG path（material-painter 画或直接写 path string）
  // path: "M2 7 L6 11 L14 3" stroke-width:2 stroke:textInverse fill:none
}
```

---

## 6. 与 interaction 的接口

interaction 阶段会写：
- `state.view.policyAccepted: boolean`
- 可能有 `state.view.submitAttempted: boolean`（用于 error 态）
- `bind` 在 input 节点上：`{ kind: "value", path: "view.policyAccepted" }`
- `events` 在 input 节点上：可能 onChange 触发

design 阶段不动以上字段，只新增视觉节点（label + visual + checkmark）。

⚠️ 如果 interaction 没写 `state.view.submitAttempted` → error 态无法激活 → 走 UpstreamChallenge 让 interaction 补字段。

---

## 7. 对账信号

`query/visual_recognition_audit { nodeId: 'PolicyCheckLabel', role: '工具-勾选' }`：

```
expected minSignals: ≥ 3
actual: 4 (外框色 + 内填色 + 勾 + 焦点光晕) ✅
```

`query/visual_state_distinctness { nodeId: 'PolicyCheckVisual', stateName: 'checked' }`：

```
expected: ≥ 2 distinct override
actual: 2 (backgroundColor + borderColor) ✅
```

---

## 8. md 落地（在 D-X-craft-form 任务中）

```markdown
## PolicyCheckbox 复合控件落库（参考 recipes/compositions/checkbox.md）

### 当前状态
- 节点：n42-PolicyCheckbox（type=input + props.type=checkbox）
- 父：n36-PolicyRow（div）
- 兄弟：n5-PolicyText
- 当前 styles：18×18 + accentColor → 视觉信号 = 1（accentColor 仅染勾）→ 不达 minSignals=3 ❌

### 重构方案
1. element/wrap：用新 PolicyCheckLabel 包裹 PolicyCheckbox + PolicyCheckVisual + PolicyText
2. element/add：PolicyCheckVisual + checkmark
3. style/update：PolicyCheckbox display:none / PolicyCheckVisual 全套样式
4. visual_state/add：PolicyCheckVisual.checked / .hover / .focus / .error
5. PolicyCheckbox.bind 不变 / PolicyText 提到 Label 内（移动）

### 自审
- 切 checked 态截图：勾显示 + 主色填充 ✅
- 切 focus 态截图：光晕显示 ✅
- 切 error 态截图：红边框 ✅
```

---

## 9. 红线

- ❌ 仅改 width/height/accentColor（不达 minSignals=3）→ R-RECOG-01
- ❌ wrapper 模式忘记给 native input `display:none` → 双重渲染
- ❌ wrapper 模式忘记 `htmlFor` / `id` 配对 → 点击 wrapper 不切换
- ❌ 仅写 default + checked，无 focus / error → 键盘用户找不到、提交错误用户不知错在哪
- ❌ 错误态用纯红 #FF0000 → 信任场景用 warm error #E16A6A
