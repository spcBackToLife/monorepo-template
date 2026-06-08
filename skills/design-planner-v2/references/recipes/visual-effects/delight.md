# 视觉效果配方：愉悦感 (Delight)

> 适用：成功提交 / 任务完成 / 点赞收藏 / 解锁奖励 / 引导步骤完成
>
> **核心**：spring 弹动 + 微小粒子 / 装饰 + 短暂高亮 = 给用户"小确幸"。

---

## 1. 视觉目标

让用户感受到"完成了件好事"——视觉给小奖励，强化正向反馈。

适用 visualState：delight 触发态（短暂，1-2s 后自动消失）。

---

## 2. 参与元素

| 角色 | 节点 | 改什么 |
|---|---|---|
| 主体 | LikeBtn / SuccessIcon / CheckMark | spring scale + 主色填充 + 短暂动效 |
| 邻居 | 周围相关元素 | 微高亮 / 微震动 |
| 装饰 | 临时 confetti / 粒子 / 圆环扩散 | 出现 → 消失 |

---

## 3. CSS 配方

```jsonc
// 主体：点赞 / 收藏按钮（spring 弹动）
{
  styles: {
    transform: "scale(1)",
    transition: "transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)"  // spring easing
  },
  states: [
    {
      name: "delight",
      activeWhen: "{{state.view.justLiked}}",
      styles: {
        transform: "scale(1.2)",                       // 弹大
        color: "$token:colors.error"                    // 心型变红
      }
    }
  ]
}
// 接着 interaction 在 200ms 后将 view.justLiked 设回 false → 主体回到 scale(1)

// 装饰：圆环扩散（点击点的扩散波）
{
  type: "div",
  name: "RippleDecoration",
  visibleWhen: "{{state.view.justLiked}}",
  styles: {
    position: "absolute",
    inset: "0",
    borderRadius: "9999px",
    border: "2px solid $token:colors.errorLight",
    transform: "scale(1)",
    opacity: "1",
    pointerEvents: "none",
    animation: "ripple 600ms ease-out forwards"
  }
}

@keyframes ripple {
  0%   { transform: scale(1);   opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
```

---

## 4. 动效细节

| 切换 | duration | easing |
|---|---|---|
| spring scale up | 350ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| spring scale return | 250ms | ease-out |
| ripple 扩散 | 600ms | ease-out |
| confetti 落下 | 1500ms | ease-out（如有）|

---

## 5. 适用场景

| 场景 | 视觉策略 |
|---|---|
| 点赞 / 收藏 | spring scale + 颜色变 + ripple |
| 任务完成（todo）| CheckMark spring + 横线划过 + 微 ripple |
| 表单提交成功 | 整张 Card 短暂高亮 + 大成功 icon spring + Toast 进入 |
| 解锁奖励 | 大图标 spring + confetti（特殊场景）|

---

## 6. 与 interaction 的接口

- `state.view.justLiked: boolean`（短暂，由 click → state.set true，setTimeout 200-300ms 后 false）
- 或 `state.view.lastLikedAt: timestamp` + activeWhen `{{$.now() - state.view.lastLikedAt < 1000}}`

⚠️ delight 不能持久 active —— 必须自动消失。

---

## 7. 与其他配方的关系

- **可叠加**：delight + floating（点赞按钮持续 hover floating + 点击瞬间 spring delight）
- **可叠加**：delight + Toast 进入（成功 Toast 同步弹出）
- **冲突**：urgency 与 delight 不能同屏（情绪矛盾）

---

## 8. 红线

- ❌ delight 持续不消失（违反"短暂奖励"原则）
- ❌ 整屏到处 delight → 喧宾夺主
- ❌ spring 频率太高 → 用户视觉疲劳
- ❌ confetti 用在严肃场景（支付 / 实名）
- ❌ 没自动消失逻辑 → 视觉态卡住
