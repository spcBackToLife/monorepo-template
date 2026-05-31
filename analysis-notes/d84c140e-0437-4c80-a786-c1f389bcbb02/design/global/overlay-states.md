> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-global-overlay-states
> 对应 schema 字段：globalOverlays[*].rootNode.children[*].states 整组替换

# D-global-overlay-states — 全局 overlays visualStates

## 节点 × 状态矩阵

| 节点 | 类型 | 应有 states | 决策 |
|------|------|------------|------|
| OfflineBanner | 容器 | — | 无独立 states（显隐由 showWhen 驱动）|
| WifiOffIcon | 占位圆点 | — | 静态 |
| OfflineText | 文字 | — | 静态 |
| RetryButton | Button-text-outline | default / hover / pressed / disabled | ✅ 4 态 |
| SessionExpiredModal | 容器 | — | 无独立 states |
| ExpiredTitle / ExpiredDesc | 文字 | — | 静态 |
| ReLoginBtn | Button-primary | default / hover / pressed / focus / disabled / loading | ✅ 6 态（同 00-login SubmitBtn）|

## RetryButton states 设计

```jsonc
states: [
  { name: "default", styles: {}, transition: { duration: 150, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }, childrenStates: {}, childrenVisibility: {}, disabledEvents: [] },
  { name: "hover",   styles: { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.7)" }, transition: { duration: 150, easing: "cubic-bezier(0, 0, 0.2, 1)" }, childrenStates: {} },
  { name: "pressed", styles: { transform: "scale(0.97)" }, transition: { duration: 80, easing: "cubic-bezier(0.4, 0, 1, 1)" }, childrenStates: {} },
  { name: "disabled", styles: { opacity: "0.5", cursor: "not-allowed" }, transition: { duration: 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }, childrenStates: {}, disabledEvents: ["click"] }
]
```

## ReLoginBtn states 设计（与 SubmitBtn 同款）

```jsonc
states: [
  { name: "default", styles: {}, transition: { duration: 250, easing: "cubic-bezier(0.4, 0, 0.2, 1)" } },
  { name: "hover",   styles: { backgroundColor: "$token:colors.primaryHover", boxShadow: "$token:shadows.md", transform: "translateY(-1px)" }, transition: { duration: 150, easing: "cubic-bezier(0, 0, 0.2, 1)" } },
  { name: "pressed", styles: { backgroundColor: "$token:colors.primaryActive", boxShadow: "$token:shadows.sm", transform: "scale(0.98)" }, transition: { duration: 80, easing: "cubic-bezier(0.4, 0, 1, 1)" } },
  { name: "focus",   styles: { boxShadow: "0 0 0 2px $token:colors.primaryLight, $token:shadows.sm" }, transition: { duration: 150, easing: "cubic-bezier(0, 0, 0.2, 1)" } },
  { name: "disabled", styles: { backgroundColor: "$token:colors.gray400", boxShadow: "none", cursor: "not-allowed", opacity: "0.4" }, transition: { duration: 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }, disabledEvents: ["click"] },
  { name: "loading",  styles: { cursor: "wait", opacity: "0.9" }, transition: { duration: 200, easing: "cubic-bezier(0, 0, 0.2, 1)" }, disabledEvents: ["click"] }
]
```

## ★ 沉淀

states 数组连同 styles 一起在 D-global-overlay-audit 任务做整组 set_global_overlays 时下发。

**自检**：
- ✅ RetryButton 4 态满足 outline 按钮最低门槛
- ✅ ReLoginBtn 6 态完备（同 SubmitBtn 风格）
- ✅ disabled 态 disabledEvents:["click"] 防误点
