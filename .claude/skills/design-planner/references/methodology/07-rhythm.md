# 方法论 7：间距 + 动效律 (Rhythm Strategy)（v3 新增）

> 适用任务：`D-X-strategy`、`D-X-craft-*`
>
> **核心**：间距梯度 + 动效时长 全屏统一，形成视觉"节奏感"。

---

## 1. 间距梯度（来自 theme.tokens.spacing）

标准 7 级（2x 或 1.5x 比例）：

| token | px | 用途 |
|---|---|---|
| `spacing.2xs` | 2 | 细微间隙（error 字与下方）|
| `spacing.xs` | 4 | label - input |
| `spacing.sm` | 8 | 小型间距（icon - text）|
| `spacing.md` | 16 | 字段间 / card 内 padding |
| `spacing.lg` | 24 | screen padding / card padding（大）|
| `spacing.xl` | 32 | 区块间（HeaderArea 与 FormCard）|
| `spacing.2xl` | 48 | screen 顶部留白 / 大区块 |
| `spacing.3xl` | 64 | 引导页 hero 区 |

---

## 2. 间距策略与 visualConcept 联动

| visualConcept 风格 | 间距策略 |
|---|---|
| 紧凑 / 信息密集 | 4-8-12-16-24（小档位为主）|
| 呼吸 / 极简 | 8-16-24-32-48（中档为主，大留白）|
| 大留白 / 高端 | 16-24-48-64-96（大档为主）|
| 营销 / 故事 | 8-16-32-64（对比强烈）|

---

## 3. 间距使用约束

```
✅ 同一层级间距相同：
  - 表单各字段间距全用 spacing.md（16）
  - 区块间距全用 spacing.xl（32）

❌ 同一层级间距混用：
  - 字段 1-2 用 16 / 字段 2-3 用 12 → 节奏混乱
```

---

## 4. 动效时长 (Motion Timings)

| 切换类型 | duration | easing | token |
|---|---|---|---|
| hover 微反馈 | 150ms | ease-out | `transitions.fast` |
| pressed 反馈 | 80ms | ease-in | （可硬编 80ms 或加 token transitions.instant）|
| focus 切换 | 150-200ms | ease-out | `transitions.normal` 或 fast |
| active 业务态切换 | 200ms | ease-out | `transitions.normal` |
| disabled 灰化 | 200ms | ease-in-out | `transitions.normal` |
| loading spinner | 1000ms 循环 | linear | infinite spin keyframe |
| Modal 进出 | 300ms | ease-in-out | `transitions.slow` |
| Drawer 滑入 | 300ms | ease-out | `transitions.slow` |
| Toast 进出 | 250ms | ease-out | （特殊）|

---

## 5. 动效原则

```
快变化（< 150ms）：用户即时反馈（hover / pressed）
中等变化（150-300ms）：状态切换（active / focus / 隐藏显示）
慢变化（300-500ms）：进出动效（Modal / Drawer / Toast）
循环动画（>= 1s）：loading / 装饰动画 / spinner

禁止：> 500ms 的状态切换 → 用户觉得"卡"
```

---

## 6. 同一视觉效果的 transition 一致性

协同视觉（多元素合奏）的 transition 必须用**同一 duration + easing**：

```
SubmitBtn 浮出感：
  主体 transform / boxShadow / backgroundColor → all 200ms ease-out
  邻居 PolicyRow opacity 0.95 → 也 200ms ease-out（同节奏）

❌ 主体 200ms 邻居 150ms → 节奏不齐，视觉"打鼓不齐"
```

---

## 7. transition 写法

```jsonc
// ✅ 完整属性 transition
{
  styles: {
    transition: "all $token:transitions.fast.value"   // 整体 transition 字符串
  },
  states: [
    {
      name: "hover",
      transition: { duration: 200, easing: "ease-out" }   // 状态切换 transition 对象
    }
  ]
}
```

---

## 8. 自检（D-X-strategy 用）

- [ ] 间距梯度 ≤ 7 级
- [ ] 全屏同层级间距统一
- [ ] 动效梯度 ≥ 3 级（fast / normal / slow）
- [ ] 协同视觉 transition 一致
- [ ] 全部用 token 引用（duration / easing）

---

## 9. 红线

- ❌ 间距硬编码（如 `padding: '16px'`）→ token 引用
- ❌ 同层级间距混用（字段 1-2 用 16，字段 2-3 用 12）
- ❌ 状态切换无 transition → 瞬间跳变
- ❌ transition duration > 500ms（除 modal / drawer 进出）
- ❌ 同一视觉效果中 transition duration 不一致
- ❌ loading 循环动画无 keyframe 定义（B 类代码改造修复 P0-4(d) keyframe 注入；过渡期用 inline keyframe）
