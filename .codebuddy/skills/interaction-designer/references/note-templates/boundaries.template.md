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
| 请求超时 | 是 | endpoint.networkPolicy.timeout 自动 abort + Toast；超时分支不计 failureCount | dataSource.endpoint.networkPolicy + onError 分支（code='TIMEOUT'）|
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
        "请求超时: 15s 自动 abort（endpoint.networkPolicy.timeout=15000）+ Toast；onError code='TIMEOUT' 分支不计 failureCount",
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

---

## ★ 翻译契约（Decision-to-Artifact Mapping）

> 上游分析 md 强制段落（v2.5 §0.1.10）。boundaries 描述的兜底策略**很多有 schema 产物**，必须 1:1 列出——不要让某条 boundary 的实现"只活在 md 里"。

| 决策 ID | 决策内容（一句话）| 应翻译为 schema 产物 | 落库任务 | nodeId / 字段 | 期望指纹 |
|---------|------------------|---------------------|---------|---------------|---------|
| B-1 | 防抖：condition 守卫 + submitting 锁 | SubmitBtn.condition.when 含 `!view.submitting` + actions 首步 state.set submitting=true + onSuccess/onError 末尾 false | `I-X-events` | SubmitBtn | `nodeHasEvent { trigger:'click' }`（细节靠 events md 自审）|
| B-2 | 请求超时：networkPolicy.timeout=15000 / 10000 | ds-login.endpoint.networkPolicy={timeout:15000}；ds-send-code.endpoint.networkPolicy={timeout:10000} | `I-X-datasources` | endpoint.networkPolicy | `nonEmpty path: dataSources[id=ds-login].endpoint.networkPolicy.timeout` |
| B-3 | 离屏清理：effect.cancel + ui.stopTimer | Root.screenExit actions（cancel × 2 + stopTimer × 2）| `I-X-events` | Root | `nodeHasEvent { trigger:'screenExit' }` |
| B-4 | 重入恢复：进屏重启 lockedCountdown | Root.screenEnter actions 含 ui.startTimer 重启逻辑 | `I-X-events` | Root | `nodeHasEvent { trigger:'screenEnter' }` |
| B-5 | 离线阻断提交 | SubmitBtn / GetCodeBtn condition.when 含 `network.status !== 'offline'` | `I-X-events` | SubmitBtn / GetCodeBtn | （含主指纹）|
| B-6 | 极端数据截断 | PhoneInput.props.maxLength=11；CredentialInput.props.maxLength 动态表达式 | `I-X-events`（dynamic props）| PhoneInput / CredentialInput | `nonEmpty path: PhoneInput.props.maxLength` |
| B-7 | 锁定中整表单 disabled | NormalFormView visibleWhen + LockedView visibleWhen 互斥；锁定 view 整体替换 | `I-X-view-business` | NormalFormView / LockedView | `nonEmpty path: visibleWhen` × 2 |
| B-8 | authRedirectTo 消费即清空 | SubmitBtn.onSuccess 末尾 logic.if 含 state.set authRedirectTo=null | `I-X-events` | SubmitBtn | （含主指纹）|
| B-9 | 键盘遮挡 | （design 阶段 CSS 实施 sticky-bottom）—— 无 schema 产物 | — | — | — |
| B-10 | 设备时间篡改 | （后端兜底，无前端 schema 产物）| — | — | — |

> 注：每条 B-* 在 boundaries.md 主推理段都有完整论证；本表只列产物对应——便于 events / datasources / view-business 任务汇总 todo。

字段说明见 `STAGE-CONTRACT.md §0.1.10`。
