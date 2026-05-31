# 复合控件配方：Modal / Drawer

> 适用：模态弹窗 / 侧边抽屉 / 全屏 sheet
>
> **核心**：backdrop + 主体 + 进出动效 + safe-area + close 入口。

---

## 1. 视觉目标

1. 用户清楚看到 modal 弹出（动效平滑、不突兀）
2. backdrop 暗化背景实现 focus
3. 用户可点 backdrop / X / ESC 关闭

适用 visualState：modal 进出动效 + backdrop 进出动效。

---

## 2. 节点结构（schema 在 screen.overlays 或 project.globalOverlays）

```jsonc
// interaction 阶段已建 overlay 的 showWhen + close events
// design 阶段补 styles + visualStates + 进出动效

{
  id: "policy-modal",
  type: "modal",                                       // 或 "drawer" / "sheet"
  showWhen: "{{state.view.policyModalOpen}}",
  rootNode: {
    type: "div",
    name: "PolicyModalContainer",
    meta: { design: { kind: "visual-container" } },
    styles: {
      position: "fixed",
      inset: "0",
      zIndex: "100",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "auto"
    },
    children: [
      {
        type: "div",
        name: "Backdrop",
        styles: {
          position: "absolute",
          inset: "0",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          opacity: "0",
          transition: "opacity 300ms ease-in-out"
        },
        states: [
          {
            name: "shown",
            activeWhen: "{{state.view.policyModalOpen}}",
            styles: { opacity: "1" }
          }
        ],
        events: [/* interaction 已写：click backdrop → close */]
      },
      {
        type: "div",
        name: "ModalBody",
        styles: {
          position: "relative",
          backgroundColor: "$token:colors.surfaceElevated",
          borderRadius: "$token:radius.xl",
          width: "min(90%, 480px)",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "$token:spacing.lg",
          boxShadow: "$token:shadows.xl",
          transform: "translateY(20px) scale(0.95)",
          opacity: "0",
          transition: "transform 300ms ease-out, opacity 300ms ease-out",
          // safe-area
          paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.lg)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + $token:spacing.lg)"
        },
        states: [
          {
            name: "shown",
            activeWhen: "{{state.view.policyModalOpen}}",
            styles: {
              transform: "translateY(0) scale(1)",
              opacity: "1"
            }
          }
        ],
        children: [
          /* ModalTitle / ModalContent / ModalFooter / CloseBtn */
          /* 这些子节点结构由 interaction 已建，design 给 styles */
        ]
      }
    ]
  }
}
```

---

## 3. 进出动效细节

### 3.1 Modal（中央弹出）
- backdrop: opacity 0 → 1 / 300ms ease-in-out
- body: scale(0.95) translateY(20) opacity 0 → scale(1) translateY(0) opacity 1 / 300ms ease-out

### 3.2 Drawer（侧边滑入）
- backdrop: opacity 0 → 1
- body: transform translateX(100%) → translateX(0) / 300ms ease-out（右侧 drawer）
- 左侧用 translateX(-100%)

### 3.3 Sheet（底部滑入）
- backdrop: opacity 0 → 1
- body: transform translateY(100%) → translateY(0) / 300ms ease-out
- borderTopLeftRadius / borderTopRightRadius: $token:radius.xl
- 底部贴边（不要 borderRadius）

---

## 4. safe-area 兼容（iOS 刘海 / 底部 home bar）

```css
paddingTop: calc(env(safe-area-inset-top) + $token:spacing.lg)
paddingBottom: calc(env(safe-area-inset-bottom) + $token:spacing.lg)
```

⚠️ 编辑画布 env() = 0，需 P0-4(e) 渲染器 fallback（待 B 类代码改造）；过渡期可以加 max(...) 兜底：
```
paddingTop: calc(max(env(safe-area-inset-top), 20px) + $token:spacing.lg)
```

---

## 5. close 入口

至少 2 个：
- ✅ X icon（右上角）
- ✅ click backdrop（mobile 通用）
- ✅ ESC 键（PC，由 interaction 已写键盘 event）

---

## 6. variant：confirm 确认对话框

```
ModalBody.styles.padding: spacing.xl
ModalTitle: h2 22px 600
ModalContent: body 14
ModalFooter: 横向 flex / gap md / right-align
  CancelBtn: secondary（边框版）
  ConfirmBtn: primary（实色填充）
```

---

## 7. 红线

- ❌ 无进出动效 → 体验生硬
- ❌ backdrop 无 pointer-events: auto → 用户能点穿
- ❌ ModalBody 没 maxHeight + overflowY auto → 长内容撑满屏幕
- ❌ 没 safe-area 兼容 → iOS 刘海 / home bar 遮挡
- ❌ 没 close 入口（没 X 没 ESC 没 backdrop click）→ 用户被困
- ❌ Modal z-index 低于 Toast / 其他浮层
- ❌ 同时多个 modal 不处理优先级 → 视觉混乱
