# 复合控件配方：Switch / Toggle

> 适用：开关项（通知开关 / 隐私开关 / 模式切换）
>
> **核心**：track（外壳）+ thumb（圆点滑块），unchecked vs checked 视觉强区分（底色 + 滑块位置）。
>
> ⚠️ 不要用 `<input type=checkbox>` + accentColor 实现 Switch——那是丑的。

---

## 1. 视觉目标

`unchecked vs checked` 必须同时改 ≥ 2 个属性（底色 + 滑块位置），让用户一眼看出开 vs 关。

---

## 2. 节点结构（schema）

```jsonc
{
  type: "label",
  name: "NotifySwitchLabel",
  props: { htmlFor: "notify-switch" },
  styles: {
    display: "inline-flex",
    alignItems: "center",
    gap: "$token:spacing.sm",
    cursor: "pointer",
    userSelect: "none"
  },
  meta: { design: { kind: "visual-container" } },
  children: [
    {
      type: "input",
      name: "NotifyInput",
      props: { type: "checkbox", id: "notify-switch", role: "switch" },
      styles: { display: "none" },
      bind: { kind: "value", path: "view.notificationEnabled" }
    },
    {
      type: "div",
      name: "SwitchTrack",
      styles: {
        width: "44px",
        height: "24px",
        borderRadius: "9999px",                          // pill 形
        backgroundColor: "$token:colors.borderLight",   // 未选灰底
        position: "relative",
        transition: "background-color $token:transitions.normal.value"
      },
      states: [
        {
          name: "checked",
          activeWhen: "{{state.view.notificationEnabled}}",
          styles: { backgroundColor: "$token:colors.primary" }
        },
        {
          name: "focus",
          styles: { boxShadow: "0 0 0 3px $token:colors.primaryLight" }
        }
      ],
      children: [
        {
          type: "div",
          name: "SwitchThumb",
          styles: {
            width: "20px",
            height: "20px",
            borderRadius: "9999px",
            backgroundColor: "$token:colors.surfaceElevated",
            boxShadow: "$token:shadows.sm",
            position: "absolute",
            top: "2px",
            left: "2px",
            transform: "translateX(0)",
            transition: "transform $token:transitions.normal.value"
          },
          states: [
            {
              name: "checked",
              activeWhen: "{{state.view.notificationEnabled}}",
              styles: { transform: "translateX(20px)" }   // 滑到右
            }
          ]
        }
      ]
    },
    {
      type: "div",
      name: "SwitchText",
      props: { textContent: "{{state.view.notificationEnabled ? '已开启' : '未开启'}}" },
      // ↑ interaction 已写动态文案
      styles: {
        fontSize: "$token:typography.body.fontSize",
        color: "$token:colors.textSecondary"
      }
    }
  ]
}
```

---

## 3. 视觉信号清单（≥ 2）

| # | 信号 | unchecked | checked |
|:---:|---|---|---|
| 1 | track 底色 | borderLight 灰 | primary |
| 2 | thumb 位置 | translateX(0) 左 | translateX(20px) 右 |
| 3（可选）| 文字 | "未开启" | "已开启" |

---

## 4. 尺寸 variant

| variant | track | thumb | thumb 位移 |
|---|---|---|---|
| sm | 32×18 | 14×14 | 14 |
| md（默认）| 44×24 | 20×20 | 20 |
| lg | 52×28 | 24×24 | 24 |

---

## 5. 与 interaction 的接口

- `state.view.notificationEnabled: boolean`
- `bind` 在 NotifyInput 上：value 同 state.view 字段

design 阶段不动以上。

---

## 6. 红线

- ❌ 用 native checkbox + accentColor 实现 Switch → 视觉太弱，用户分不清是 switch 还是 checkbox
- ❌ unchecked vs checked 仅底色变化（无滑块位移）→ 不像 switch
- ❌ thumb 无 transition → 切换瞬间跳变
- ❌ track 大小 thumb 不匹配（thumb 太小留太多 padding）
