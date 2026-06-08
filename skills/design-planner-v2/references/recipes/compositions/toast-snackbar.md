# 复合控件配方：Toast / Snackbar

> 适用：操作反馈（成功 / 错误 / 警告 / 信息）
>
> **核心**：4 语义色 + icon + 进出动效 + 自动消失。

---

## 1. 视觉目标

用户能：
1. 立即识别消息语义（success / error / warning / info）
2. 看清消息内容
3. 自动消失（3-5s）+ 手动关闭（可选）

适用 visualState：success / error / warning / info（语义态）+ shown / hidden（生命周期态）。

---

## 2. 节点结构（schema 在 screen.overlays 或 project.globalOverlays）

```jsonc
{
  id: "toast-overlay",
  type: "global",                                      // 通常项目级
  showWhen: "{{state.view.activeToast !== null}}",
  rootNode: {
    type: "div",
    name: "ToastContainer",
    meta: { design: { kind: "visual-container" } },
    styles: {
      position: "fixed",
      top: "calc(env(safe-area-inset-top) + $token:spacing.lg)",
      left: "50%",
      transform: "translateX(-50%) translateY(-100%)",
      opacity: "0",
      zIndex: "200",
      pointerEvents: "auto",
      transition: "transform 250ms ease-out, opacity 250ms ease-out"
    },
    states: [
      {
        name: "shown",
        activeWhen: "{{state.view.activeToast !== null}}",
        styles: {
          transform: "translateX(-50%) translateY(0)",
          opacity: "1"
        }
      }
    ],
    children: [
      {
        type: "div",
        name: "ToastBody",
        styles: {
          display: "flex",
          alignItems: "center",
          gap: "$token:spacing.sm",
          padding: "$token:spacing.sm $token:spacing.md",
          borderRadius: "$token:radius.lg",
          backgroundColor: "$token:colors.surfaceElevated",
          boxShadow: "$token:shadows.lg",
          maxWidth: "min(90vw, 400px)",
          fontSize: "$token:typography.body.fontSize"
        },
        states: [
          {
            name: "success",
            activeWhen: "{{state.view.activeToast?.kind === 'success'}}",
            styles: {
              backgroundColor: "$token:colors.successLight",
              borderLeft: "3px solid $token:colors.success"
            }
          },
          {
            name: "error",
            activeWhen: "{{state.view.activeToast?.kind === 'error'}}",
            styles: {
              backgroundColor: "$token:colors.errorLight",
              borderLeft: "3px solid $token:colors.error"
            }
          },
          {
            name: "warning",
            activeWhen: "{{state.view.activeToast?.kind === 'warning'}}",
            styles: {
              backgroundColor: "$token:colors.warningLight",
              borderLeft: "3px solid $token:colors.warning"
            }
          },
          {
            name: "info",
            activeWhen: "{{state.view.activeToast?.kind === 'info'}}",
            styles: {
              backgroundColor: "$token:colors.primaryLight",
              borderLeft: "3px solid $token:colors.primary"
            }
          }
        ],
        children: [
          {
            type: "div",
            name: "ToastIcon",
            props: { textContent: "" },                // 由 visualState 切换 textContent 不可行（这是 design 不动 props.textContent 含 state 的限制）
            // 实际方式：在 ToastBody 子节点用 4 个 visible 切换的 icon div
            // 或者由 interaction 阶段提供 state.view.activeToast.iconKey 字段，design 写 styles
            styles: { width: "20px", height: "20px", flexShrink: "0" }
            // 各 state 下用 backgroundImage 切 icon（material-painter 画 4 个 icon SVG）
          },
          {
            type: "div",
            name: "ToastMessage",
            props: { textContent: "{{state.view.activeToast?.message}}" },   // interaction 已写
            styles: {
              flex: "1",
              color: "$token:colors.textPrimary",
              lineHeight: "1.4"
            }
          }
        ]
      }
    ]
  }
}
```

---

## 3. 视觉信号清单（4 语义各 ≥ 3 信号）

| 语义 | 底色 | 边色 | icon |
|---|---|---|---|
| success | successLight 浅绿 | success 绿 | ✓ 勾 |
| error | errorLight 浅红 | error 暖珊瑚红 | ⚠️ 警告 / ✕ |
| warning | warningLight 浅黄 | warning 橙 | ⚠️ |
| info | primaryLight 浅蓝紫 | primary | i |

---

## 4. 进出动效

```
顶部弹出（推荐 mobile）：
  shown: translateY(0) opacity 1
  hidden: translateY(-100%) opacity 0
  transition: 250ms ease-out

底部弹出（PC 桌面端通用）：
  shown: translateY(0) opacity 1
  hidden: translateY(100%) opacity 0
```

---

## 5. 与 interaction 的接口

- `state.view.activeToast: { kind: 'success'|'error'|'warning'|'info', message: string, iconKey?: string } | null`
- 自动消失定时器由 interaction effect 写（3-5s 后 state.set view.activeToast = null）
- click ToastBody 可手动关闭（interaction 已写）

design 阶段不动以上。

---

## 6. 多 Toast 队列（如需）

如果系统允许多 toast 同时显示，需要：
- `state.view.toasts: Toast[]`
- design 阶段在 ToastContainer 用 `repeat`（interaction 已写）+ flexDirection column + gap

---

## 7. 红线

- ❌ 4 语义全用同色 → 用户分不清成功 / 错误
- ❌ 无 icon → 视觉锚点弱
- ❌ 无进出动效 → 突兀
- ❌ Toast 没 max-width → 长消息全屏
- ❌ Toast 不 fixed 位置（被滚动）
- ❌ z-index 太低（< 100）被其他元素遮
- ❌ safe-area 兼容缺失（iOS 刘海遮 toast）
