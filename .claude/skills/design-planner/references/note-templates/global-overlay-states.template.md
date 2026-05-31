# 模板：D-global-overlay-states（全局 overlays visualStates）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/global/overlay-states.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-global-overlay-states
> 对应 schema 字段：project.globalOverlays[*].rootNode 子树的 states + animation

## 1. 出入动画统一规格

详见 `schema-spec/global-overlay-design.md`：

| 类型 | enter 动画 | exit 动画 | duration | easing |
|------|----------|----------|----------|--------|
| Modal | fade + scaleIn(0.95→1) | fade + scaleOut | 300/200ms | ease-out / ease-in |
| BottomSheet | slideUp(100%→0) | slideDown | 350ms | ease-out |
| Drawer | slideRight | slideLeft | 300ms | ease-out |
| Banner | slideDown + fade | fade + slideUp | 200ms | ease-out |
| Toast | slideDown + fade | fade | 200ms | ease-out |

## 2. 每个 overlay 出入动画落库

### global-session-expired（modal）

```jsonc
project.globalOverlays[<...>].rootNode.animation = {
  enter: {
    duration: 300,
    easing: "ease-out",
    keyframes: [
      { offset: 0, styles: { opacity: 0, transform: "translate(-50%,-50%) scale(0.95)" } },
      { offset: 1, styles: { opacity: 1, transform: "translate(-50%,-50%) scale(1)" } }
    ]
  },
  exit: {
    duration: 200,
    easing: "ease-in",
    keyframes: [
      { offset: 0, styles: { opacity: 1, transform: "translate(-50%,-50%) scale(1)" } },
      { offset: 1, styles: { opacity: 0, transform: "translate(-50%,-50%) scale(0.95)" } }
    ]
  }
}
```

[每个 overlay 重复...]

## 3. overlay 内部交互节点 visualStates

### global-session-expired 内的"重新登录"按钮
```jsonc
reloginBtn.states = [
  { name: "default", styles: {} },
  { name: "hover",   styles: { backgroundColor: "$token:colors.primaryHover" }, transition: { duration: 150, easing: "ease-out" } },
  { name: "pressed", styles: { backgroundColor: "$token:colors.primaryActive" }, transition: { duration: 80, easing: "ease-in" } },
  { name: "focus",   styles: { boxShadow: "0 0 0 3px $token:colors.primaryLight" } },
  { name: "disabled", styles: { opacity: 0.6, cursor: "not-allowed" }, disabledEvents: ["click"] }
]
```

### global-app-update 内的"立即更新" / "稍后" 按钮
```jsonc
[同样按 atom Button 规格写完整 states]
```

### global-offline-banner 内的"重试"按钮
```jsonc
[小尺寸 secondary 按钮规格]
```

## 4. backdrop dismissible 行为

| overlay | dismissible | 理由 |
|---------|:-----------:|------|
| global-offline-banner | N/A（无 backdrop）| banner 不阻断 |
| global-session-expired | false | 必须显式重新登录 |
| global-app-update | true | 用户可关闭推迟 |
| global-error-boundary | false | 必须显式重启 / 反馈 |

## 5. ★ 沉淀到 schema 的结论

```jsonc
// 1. 每个 overlay 出入动画
[列每个 element/update animation 调用]

// 2. overlay 内部交互节点 visualStates
[列每个 visual_state/add 调用]

// 3. backdrop 配置（如未在 styles 任务写）
[project/set_overlay 调用]
```

⚠️ **后续任务约束**：
- D-global-overlay-audit：跨 overlay 出入动画统一性核查
```
