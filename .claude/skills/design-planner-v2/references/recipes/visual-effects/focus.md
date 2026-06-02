# 视觉效果配方：聚焦感（Focus）

> 适用：表单 focus / 模态弹出 backdrop / 引导高亮 / 选中态强化
>
> **核心**：聚焦不是只把主体高亮——还要让"非聚焦区域降饱和"形成视觉收窄。

---

## 1. 视觉目标

让用户视线被"拉"到主体——通过对比强化（主体亮 + 周围暗）实现。

适用 visualState：`focus` / `selected` / `loading`（loading 时整屏 dim 主体高亮）/ `error`（attention focus）。

---

## 2. 参与元素

| 元素 | 角色 | 改什么 |
|---|---|---|
| 主体（如 PhoneInput focus）| 加亮 | borderColor: primary + boxShadow 光晕 |
| 主体兄弟（同字段内其他 input）| 维持 | 不动 |
| 主体父容器（如 FormCard）| 维持 | 不动（除非全屏模态聚焦）|
| 全屏其他区域（仅模态/loading 场景）| 降饱和 | backdrop opacity 0.4 黑 |

---

## 3. CSS 配方

### 3.1 表单字段 focus（轻量聚焦）

```jsonc
// PhoneInput visualState focus
{
  name: "focus",
  styles: {
    borderColor: "$token:colors.primary",
    boxShadow: "0 0 0 3px $token:colors.primaryLight"   // ← 4dp 光晕
  },
  transition: { duration: 150, easing: "ease-out" }
}
```

### 3.2 选中态聚焦（如选中卡片）

```jsonc
{
  name: "selected",
  activeWhen: "{{state.view.selectedId === id}}",
  styles: {
    borderColor: "$token:colors.primary",
    backgroundColor: "$token:colors.primaryLight",       // ← 极淡主色填充
    transform: "scale(1.02)",                            // ← 微放大
    boxShadow: "$token:shadows.md"
  },
  transition: { duration: 200, easing: "ease-out" }
}
```

### 3.3 全屏聚焦（如 Modal / Loading）

```jsonc
// 在 screen.overlays 里建 backdrop
{
  id: "overlay-backdrop-loading",
  type: "fullscreen",
  showWhen: "{{state.view.submitting}}",
  rootNode: {
    type: "div",
    styles: {
      position: "fixed",
      top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.4)",            // ← 全屏 dim
      backdropFilter: "blur(2px)",                      // ← 可选，弱模糊辅助
      pointerEvents: "auto",
      zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center"
    },
    children: [
      // 中央 spinner / loading message（主体焦点）
    ]
  }
}
```

---

## 4. 动效

| 切换 | duration | easing |
|---|---|---|
| default → focus | 150ms | ease-out |
| default → selected | 200ms | ease-out |
| 全屏聚焦进出 | 300ms | ease-in-out（backdrop 渐显）|

---

## 5. 注意事项

- ⚠️ focus 光晕 `boxShadow: 0 0 0 3px primaryLight` 这种"实心光晕"在大字段上视觉太重——大字段（card-level）改用 `0 0 12px rgba(primary, 0.2)` 软光晕。
- ⚠️ `transform: scale(1.02)` 父容器必须 `overflow: visible`，否则被裁。
- ⚠️ backdrop blur 在低性能设备开销大，可降级为 backgroundColor only。
- ⚠️ 同时只能有一处"聚焦"——不要 PhoneInput focus 时 SubmitBtn 也加光晕。

---

## 6. 对账信号

`query/visual_state_distinctness { stateName: 'focus' }`：≥ 2 distinct override（borderColor + boxShadow）。

`query/canvas_render_status`：backdrop overlay 在 showWhen=true 时是否实际渲染出 dim 效果。

---

## 7. md 落地

```markdown
## 聚焦感视觉效果（参考 recipes/visual-effects/focus.md）

### 场景 A：PhoneInput 字段 focus
- 应用配方 §3.1
- 落到 PhoneInput.states.focus

### 场景 B：登录提交时全屏 dim
- 应用配方 §3.3
- 在 screen.overlays 加 LoadingBackdrop（design 阶段允许 add overlay 节点）

### 自审
- 切到 focus 态截图：主体边色 + 光晕清晰 ✅
- submitting=true 时整屏 dim 出现 ✅
```

---

## 8. 红线

- ❌ focus 仅改 borderColor 不加光晕 → 视觉太弱
- ❌ 多处同时聚焦（违反"焦点唯一"原则）
- ❌ backdrop 不带 pointerEvents → 用户能点穿
- ❌ Modal 关闭后忘记同步关 backdrop → 卡死
