> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-global-coverage
> 对应 schema 字段：—（全局态跨屏使用的核对）

# Step I-global-coverage — 全局态跨屏覆盖检查

> 详细方法见 `methodology/06-three-axis-coverage.md`。

检查 5 类全局态是否被各屏正确读写——任何一类没有正确接入 → 在 plan 里追加补丁任务。

## 1. session 跨屏读写核对

| 屏 | 读 session | 写 session | 操作 | ✓/❌ |
|----|-----------|-----------|-----|-----|
| 00-login | — | onSuccess: globalView.session = authenticated | 登录成功设置 | ✓ |
| 01-home | screenEnter 检查 expiresAt | — | session 过期检测 | ✓ |
| 02-profile | 显示 user 信息 | 退出登录: session = anonymous | 退出 + 显示 | ✓ |
| 各受保护屏 | screenEnter 检查 status | — | 保护页面 | ❌ 待补 |

## 2. network 跨屏读写核对

| 屏 | 读 network | 写 network | 操作 | ✓/❌ |
|----|-----------|-----------|-----|-----|
| —（一般由宿主层写入；屏内只读）| — | — | platform.checkNetwork → status | ✓ |
| 各列表屏 | offline 时显示 OfflineNoDataState | — | 离线兜底 | ✓ |

## 3. preferences 跨屏读核对

| 屏 | 读 preferences | 操作 | ✓/❌ |
|----|---------------|-----|-----|
| 全屏（design 阶段读 themeVariant 切换主题）| themeVariant | — | ✓ |
| 设置页 | fontSize / lang / a11y | 修改 → state.set | ✓ |

## 4. nav 跨屏读写核对

| 屏 | 读 nav | 写 nav | 操作 | ✓/❌ |
|----|-------|-------|-----|-----|
| 00-login | onSuccess 检查 authRedirectTo | onSuccess 后清空 | 跳转兜底 | ✓ |
| 受保护屏 | — | screenEnter 未登录 → 写 authRedirectTo | 保留来源 | ✓ |

## 5. errorBoundary 跨屏核对

| 屏 | 读 errorBoundary | 写 errorBoundary | 操作 | ✓/❌ |
|----|-----------------|----------------|-----|-----|
| 全屏（global-error-boundary overlay 自动显）| crashed | — | 兜底 | ✓ |
| 异常处理点 | — | crashed=true | 抓异常 | ⚠️ 需要 platform.reportError 接入 |

## 6. 缺口处理

> 如发现某屏缺正确接入，在 plan 中追加补丁任务（如 "I-<screenId>-add-session-guard"）。

---

## ★ 沉淀到 schema 的结论

```jsonc
// 例：发现 02-profile 屏缺 screenEnter 的 session 检查 → 追加任务
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId: "02-profile",
  tasks: [
    {
      id: "I-02-profile-session-guard",
      title: "screenEnter 检查 session.status；过期则触发 global-session-expired",
      stage: "interaction",
      status: "pending",
      notes: "由 I-global-coverage 识别"
    }
  ]
}
```

如果全 ✓，沉淀段写：

```
✅ 5 类全局态跨屏覆盖核对全通过。下一步 → I-handover 移交 design-planner。
```
