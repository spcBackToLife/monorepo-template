# 视觉效果配方：浮出感（Floating）

> 适用：主 CTA hover、Card 强调、表单主操作、关键引导元素 hover/focus
>
> **核心**：浮出感不是只改主体——多元素合奏才能"立体浮出"。

---

## 1. 视觉目标

让用户感受到"这个元素从平面里抬升出来 / 可被点击 / 是主要焦点"。

适用 visualState：`hover` / `focus` / `selected`。

---

## 2. 参与元素（多元素合奏，少一个都不立体）

| 元素 | 角色 | 必须改的属性 |
|---|---|---|
| 主体（如 SubmitBtn）| 抬升 | `transform: translateY(-2px)` + `boxShadow` 加深 |
| 主体兄弟（如 PolicyRow / FormCard 内其他字段）| 微退 | `opacity: 0.95`（可选，强场景用）|
| 主体父容器（如 FormCard）| 不动 | 固定 padding 防止跳动 |
| 装饰（如 BgBlob）| 不动 | 不参与 hover |

---

## 3. CSS 配方（含 token 引用）

```jsonc
// 主体 visualState hover
{
  name: "hover",
  styles: {
    transform: "translateY(-2px)",
    boxShadow: "$token:shadows.lg",                    // ← 比 default 阴影深一档
    backgroundColor: "$token:colors.primaryHover"      // ← 比 default 主色深一档
  },
  transition: { duration: 200, easing: "ease-out" }
}

// 主体 visualState pressed（按下"压回去"，与 hover 反向）
{
  name: "pressed",
  styles: {
    transform: "translateY(0)",                        // ← 回到原位
    boxShadow: "$token:shadows.sm",                    // ← 阴影变浅
    backgroundColor: "$token:colors.primaryActive"
  },
  transition: { duration: 80, easing: "ease-in" }      // ← 按下要快
}

// 主体 visualState focus（键盘聚焦）
{
  name: "focus",
  styles: {
    boxShadow: "0 0 0 3px $token:colors.primaryLight, $token:shadows.md"  // ← 多重阴影叠加光晕
  },
  transition: { duration: 150, easing: "ease-out" }
}
```

---

## 4. 动效（必须 transition，不允许瞬间跳变）

| 切换 | duration | easing |
|---|---|---|
| default → hover | 200ms | ease-out（友好响应）|
| hover → pressed | 80ms | ease-in（按下要快）|
| pressed → hover | 200ms | ease-out |
| → focus | 150ms | ease-out |

---

## 5. 注意事项

- ⚠️ `transform: translateY` 不影响布局（不会让兄弟元素位移）；如果用 `marginTop` / `top` 会触发布局重排，**禁用**。
- ⚠️ `boxShadow` 不要叠加重过 3 层；用 `$token:shadows.lg` / `$token:shadows.xl` 即可。
- ⚠️ 低性能设备（iOS 老机型）避免 `filter: blur` 与 transform 同时用——会卡顿。
- ⚠️ 如果主体兄弟用 `opacity: 0.95`，**主体父容器** 必须 `position: relative` 防 z-index 继承问题。

---

## 6. 对账信号（B2 工具）

`query/visual_state_distinctness { nodeId, stateName: 'hover' }` 返回：

| 期望 distinct override 数 | 实际 |
|---:|---:|
| ≥ 3（transform / boxShadow / backgroundColor）| __ |

任一态 distinct < 3 → 浮出感不足 → 重做。

---

## 7. md 落地（在 D-X-craft-hero 任务中引用）

```markdown
## 浮出感视觉效果（参考 recipes/visual-effects/floating.md）

### 参与节点
- 主体：SubmitBtn (n9)
- 兄弟：PolicyRow (n36)（轻退）

### 落到 schema
- SubmitBtn.states：default / hover / pressed / focus（参配方 §3）
- PolicyRow.states：(可选) hover-bg-active（activeWhen: state.view.btnHover）

### 自审
- query/visual_state_distinctness 检查 hover/pressed/focus 各 ≥ 3 distinct override ✅
```

---

## 8. 红线

- ❌ 只改 backgroundColor 没 boxShadow + transform → 不立体
- ❌ transform: translateY 用了 margin 实现 → 触发布局抖动
- ❌ 无 transition 直接 hover 跳变
