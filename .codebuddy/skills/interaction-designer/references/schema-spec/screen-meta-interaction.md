# 屏幕级 Schema 字段规范（ScreenMeta.interaction）

## 字段总览

```jsonc
screen.meta.interaction = {
  summary,                  // §1 屏交互叙事（1-3 句话）
  states,                   // §1 状态列表（字符串数组）
  operations,               // §2 操作清单 7 列结构化对象数组
  loadingStrategy,          // §3 加载策略 5 场景对象
  errorHandling,            // §3 错误处理 6 类对象
  boundaries,               // §4 边界 Case 字符串数组
  ref: undefined            // 不写
}

screen.meta.status.phase = "interaction-defined"  // §5 阶段收尾打
```

## §1. summary + states（任务 `I-X-statemachine` 落库）

```jsonc
// MCP: meta/set_screen
{
  projectId, screenId,
  patch: {
    interaction: {
      summary: "...本屏交互叙事（1-3 句话）..." ,
      states:  ["idle","inputting","validating","submitting","success","error","locked"]
    }
  }
}
```

**红线**：
- summary 缺 → 屏交互叙事缺失
- states 用非语义命名（state1 / loading2）

## §2. operations（任务 `I-X-operations` 落库）

```jsonc
{
  projectId, screenId,
  patch: {
    interaction: {
      operations: [
        // ★ 7 列结构化对象（不可写字符串数组）
        {
          op: "提交登录",
          triggerNodePath: "FormCard/SubmitBtn",     // 必须对应到真实节点 name 路径
          feedbackLevel:   "L3",                      // L0-L5
          immediateFeedback: "按钮 scale(0.97) + shadow 降级",
          inProgress:        "按钮 spinner + 表单 disabled + 全屏 LoadingOverlay 半透明",
          onSuccess:         "✓ 0.5s 后 nav.go home",
          onFailure:         "shake + Toast + 聚焦凭证框",
          boundary:          "800ms 防抖 / 重复点击忽略"
        }
        // ...其他操作
      ]
    }
  }
}
```

**红线**：
- 操作清单缺 7 列任意一列
- triggerNodePath 写不对应的节点名
- feedbackLevel 取 L0-L5 之外的值

## §3. loadingStrategy + errorHandling（任务 `I-X-loading` / `I-X-errors` 落库）

```jsonc
{
  projectId, screenId,
  patch: {
    interaction: {
      // 5 场景加载策略
      loadingStrategy: {
        initial:    "无（首屏 cold start）",          // 或 "全屏 Skeleton —— FeedSkeleton 节点"
        refresh:    "下拉 + 顶部进度条",
        pagination: "—",                              // — 表示本屏不适用
        button:     "按钮内 spinner + disabled + 文案改为'登录中...'",
        silent:     "—"
      },
      // 6 类错误处理
      errorHandling: {
        validation: "行内红字 + 输入框红框 + 聚焦该字段",
        business:   "Toast(level=error) + 累加 failureCount",
        permission: "锁定状态机 + locked 倒计时 Sheet",
        network:    "Toast + 重试 / 离线 banner",
        server:     "Toast + 客服入口",
        unknown:    "兜底 Toast + 上报"
      }
    }
  }
}
```

**红线**：
- loadingStrategy 任一场景缺（用 "—" 表示不适用，不能完全省略 key）
- errorHandling 6 类某类完全没设计（用 "—" 都不行，必须显式说明兜底策略）

## §4. boundaries（任务 `I-X-boundaries` 落库）

```jsonc
{
  projectId, screenId,
  patch: {
    interaction: {
      boundaries: [
        "重复点击: 800ms 防抖 + view.submitting 守卫；condition.when 检查",
        "请求超时: 15s 自动取消 fetch + Toast 提示",
        "离开页面: screenExit 时 effect.cancel 当前请求",
        "并发: 同时只允许一个登录请求；后续点击被 condition 拦截",
        "离线: 检测到 globalView.network.status='offline' → 显示离线 banner",
        "极端数据: phone 长度 > 11 截断；密码 max-length=20",
        "键盘遮挡: 提交按钮 position:sticky bottom（design 阶段实施）"
      ]
    }
  }
}
```

每条字符串必须含**场景 + 策略**两段（不允许只写"做了防抖"）。

## §5. 阶段收尾（任务 `I-X-integrity` 通过后）

```jsonc
meta/set_screen {
  projectId, screenId,
  patch: { status: { phase: "interaction-defined" } }
}
```

**红线 R-PHASE-01**：phase = "interaction-defined" 但 ready 仍有 false（即 events / view 等未达标）。phase 由 integrity 自动校验，不要手动改 ready。

## 红线汇总

| 红线 | 触发条件 |
|------|---------|
| **R-EVENTS-01** | 节点声明交互意图但 events 缺对应 trigger |
| **R-EVENTS-02** | event 没 actions（actions[] 为空数组）|
| **R-EVENTS-03** | effect.fetch 缺 onSuccess 或 onError 分支 |
| **R-VIEW-LOAD-01** | dataSource 类型 = api 但本屏无对应 pending 视图节点 |
| **R-VIEW-EMPTY-01** | 列表型 data 但本屏无对应 empty 视图节点 |
| **R-VIEW-ERROR-01** | dataSource 类型 = api 但本屏无对应 error 视图 |
| **R-VIEW-BUSINESS-01** | product 阶段 rules 显式枚举的状态字段，存在 enum 值未对应到独立 visibleWhen 节点 |
| **R-COVERAGE-01** | rules 中某条没对应到任何 events / state / 衍生视图 |
| **R-PHASE-01** | phase = "interaction-defined" 但 ready 仍有 false |
