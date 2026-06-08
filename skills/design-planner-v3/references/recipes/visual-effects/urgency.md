# 视觉效果配方：紧迫感 (Urgency)

> 适用：限时倒计时 / 库存告急 / 提交错误警告 / 重要操作前确认
>
> **核心**：警示色 + 倒计时数字 + 微脉动 + 不能让用户错过。

---

## 1. 视觉目标

让用户立刻感受到"现在必须做点什么"——通过颜色 / 动效 / 文字三向合奏。

适用 visualState：urgency（业务态，由 state.view 触发）。

---

## 2. 参与元素（4 角色）

| 角色 | 节点 | 改什么 |
|---|---|---|
| 主体 | UrgencyText / CountdownNumber | 警示色 + 字重 + 微脉动 |
| 邻居 | 周围相关元素（如包含的 Card）| 边色加 warning 强调 |
| 父容器 | 不动 | — |
| 装饰 | 不动 / 加 warning icon | warning icon 强化 |

---

## 3. CSS 配方

```jsonc
// 主体 CountdownNumber（倒计时数字）
{
  styles: {
    color: "$token:colors.warning",                     // 警示橙
    fontSize: "$token:typography.h2.fontSize",          // 偏大显眼
    fontWeight: "700",
    fontFamily: "monospace",                            // 等宽数字（"00:30" 不抖动）
    letterSpacing: "0.02em"
  },
  states: [
    {
      name: "urgent",                                   // 倒计时 < 10s 时切到 urgent
      activeWhen: "{{state.view.countdown < 10}}",
      styles: {
        color: "$token:colors.error",                    // 切到错误红
        animation: "pulse 1s ease-in-out infinite"      // 脉动
      }
    }
  ]
}

// keyframes（需 SchemaRenderer 全局注入或在 P0-4(d) 修复）
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.05); opacity: 0.85; }
}

// 邻居 Card（如倒计时所在 Card）
{
  states: [
    {
      name: "urgent-context",
      activeWhen: "{{state.view.countdown < 10}}",
      styles: {
        borderColor: "$token:colors.warning",
        boxShadow: "0 0 0 2px $token:colors.warningLight"
      }
    }
  ]
}
```

---

## 4. 动效

| 切换 | duration | easing |
|---|---|---|
| 进入 urgent 态 | 200ms | ease-out |
| pulse 循环 | 1000ms | ease-in-out |
| 倒计时归 0 | 200ms | ease-out（停 pulse + 切 disabled）|

---

## 5. 适用场景

| 场景 | 主体 | 邻居 |
|---|---|---|
| 验证码倒计时 | GetCodeBtn 文字 | input 边色 |
| 限时优惠 | OfferTimer 大字 | OfferCard 边色 |
| 库存告急 | StockText "仅剩 3 件" | ProductCard 角标 warning |
| 表单提交错误 | ErrorMsg | input 边 + 抖动微动效 |

---

## 6. 红线

- ❌ urgent 不切色 → 紧迫感缺失
- ❌ pulse 无 keyframe 注入 → 动画不跑（待 P0-4(d) 修复）
- ❌ pulse 频率太高（< 0.5s）→ 让人焦虑
- ❌ urgent 持续超 30s 不消失 → 用户疲劳
- ❌ 多个 urgent 同屏（焦点散）
- ❌ 倒计时不用等宽字体 → 数字抖动
