> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-boundaries
> 对应 schema 字段：screen.meta.interaction.boundaries[]

# Step I-boundaries: <屏名> — 边界 Case 7 类

> 详细方法见 `methodology/05-boundary-cases.md`。

## 推理过程

### 1. 7 类边界 Case 适用性判断

| 类 | 本屏是否适用 | 兜底策略 | 实现锚点 |
|----|------------|---------|---------|
| 重复点击 / 防抖 | 是 | 800ms 防抖 + view.submitting 守卫 | event.condition.when |
| 请求超时 | 是 | 15s 自动取消 fetch + Toast | dataSource.endpoint.timeout + onError 分支 |
| 离开页面 / 任务终止 | 是/否 | screenExit cancel | rootNode.events screenExit |
| 并发冲突 | 是 | 同时只允许一个登录请求 | condition + submitting 守卫 |
| 离线 / 离线缓存 | 是 | 离线 banner + 重试 | globalView.network.status 监听 |
| 极端数据 / 空 / 超长 | 是 | phone 长度截断；密码 max-length=20 | onChange 截断 action |
| 键盘遮挡 | 是 | 提交按钮 sticky-bottom | design 阶段 CSS 实施 |

### 2. 跨屏共用的边界（来自全局态）

| 边界 | 全局兜底 | 屏内动作 |
|------|---------|---------|
| 离线 | global-offline-banner | 写 globalView.network.status='offline' |
| Session 过期 | global-session-expired Modal | 写 globalView.session.status='expired' |

### 3. 候选方案与否决

- 候选 A：登录失败 5 次后允许第 6 次试 → 否决：违反 product 安全规则
- 候选 B：用户切走不取消 fetch → 否决：返回时数据污染
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId, screenId,
  patch: {
    interaction: {
      boundaries: [
        "重复点击: 800ms 防抖 + view.submitting 守卫；event.condition.when 检查",
        "请求超时: 15s 自动取消 fetch（endpoint.timeout=15000）+ Toast 提示",
        "离开页面: screenExit 时 effect.cancel { dataSourceId: 'ds-login' }",
        "并发: 同时只允许一个登录请求；后续点击被 condition 拦截",
        "离线: globalView.network.status='offline' 时显示 global-offline-banner",
        "极端数据: phone onChange 截断到 11 位；credential max-length=20",
        "键盘遮挡: 提交按钮 position:sticky bottom（design 阶段实施）"
      ]
    }
  }
}
```

每条字符串必须含**场景 + 策略**两段，不允许只写"做了防抖"。
