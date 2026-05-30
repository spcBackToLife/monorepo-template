# 方法论 5：边界 Case 7 类

> 适用任务：`I-X-boundaries`、`I-X-events`（每个 event 都要回头查边界处理）

## 1. 7 大类边界 Case（每屏必想）

| 类 | 触发场景 | 兜底策略 |
|----|---------|---------|
| 重复点击 / 防抖 | 用户连点提交按钮 | 第一次点击后立即 `view.submitting = true` 守卫；800ms 防抖 |
| 请求超时 | 网络慢 / 服务卡 | 15s 自动取消 fetch + Toast"请求超时，请重试"|
| 离开页面 / 任务终止 + 重入恢复 | 用户切走 / 后台 | screenExit 时 `effect.cancel`；screenEnter 时检查未完成任务 |
| 并发冲突 / 乐观锁 | 两次请求同时返回 | 只取最后一次 / 版本号校验 |
| 离线 / 离线缓存 | 网络断开 | 显示离线 banner（globalOverlays）+ 缓存待发 |
| 极端数据 / 空 / 超长 / 异常字符 | 输入超长 / 列表 0 条 / 字符攻击 | 截断 / 空态视图 / escapeHTML |
| 键盘遮挡 / 软键盘适配 | 移动端表单 | 提交按钮 sticky-bottom / focus 时 scrollIntoView |

## 2. 落到 schema

`screen.meta.interaction.boundaries`（字符串数组，每条说清场景 + 策略）：

```jsonc
boundaries: [
  "重复点击: 800ms 防抖 + view.submitting 守卫；condition.when 检查",
  "请求超时: 15s 自动取消 fetch（effect.fetch 自动支持 timeout）+ Toast 提示",
  "离开页面: screenExit 时 effect.cancel 当前请求",
  "并发: 同时只允许一个登录请求；后续点击被 condition 拦截",
  "离线: 检测到 globalView.network.status='offline' → 显示离线 banner",
  "极端数据: phone 长度 > 11 截断；密码 max-length=20",
  "键盘遮挡: 提交按钮 position:sticky bottom（design 阶段实施）"
]
```

## 3. 与 events.actions 的对应关系

| 边界 | 在 events 中如何体现 |
|------|--------------------|
| 重复点击 / 防抖 | `event.condition.when: "{{ !view.submitting }}"` + 进入 actions 立刻 `state.set submitting=true` |
| 超时 | `effect.fetch` 自动支持（在 dataSource.endpoint 配 timeout）+ onError 含 timeout 分支 |
| 离开页面 | rootNode 挂 `screenExit` event → `effect.cancel { dataSourceId }` |
| 并发 | 同上 condition + submitting 守卫 |
| 离线 | rootNode 挂 `screenEnter` 检查 `globalView.network.status` |
| 极端数据 | 输入框 onChange 截断（state.set）+ stateInit 默认值 |
| 键盘遮挡 | 留给 design 阶段（CSS layout）|

## 4. 红线

- ❌ 边界 Case 写"通用文案"（"做了防抖"——没说几 ms / 在哪个 event 守卫）
- ❌ 关键操作没写"重复点击"边界 → 用户连点导致重复请求
- ❌ 列表型屏没写 screenExit 取消 fetch → 切走后请求继续返回污染状态
- ❌ 没识别离线场景但用户主链路可能在地铁 / 弱网（电商 / 社交 / IM 类必想）

## 5. 跨屏共用的边界（来自全局态）

部分边界 Case 由 globalOverlays / globalView 统一处理，**屏内只需触发**：

| 边界 | 全局兜底 | 屏内动作 |
|------|---------|---------|
| 离线 | global-offline-banner（globalOverlays）| 写 `globalView.network.status='offline'` 即可 |
| Session 过期 | global-session-expired Modal | 写 `globalView.session.status='expired'` 即可 |
| 全局错误兜底 | global-error-boundary | 不可恢复异常 → `globalView.errorBoundary.crashed=true` |

详见 `schema-spec/state-completion.md` §3。
