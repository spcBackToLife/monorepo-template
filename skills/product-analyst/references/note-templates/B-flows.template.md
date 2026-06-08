> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<M>-flows
> 对应 schema 字段：screen.meta.product.summary（流程主线浓缩）

# Step B: <模块名> — 核心流程 + 异常分支

> 详细方法见 `methodology/04-five-step-method.md` Step B。

## 推理过程

### 主线流程（Happy Path）

```
[Step 1: 进入页面] → [Step 2: 输入数据] → [Step 3: 提交] → [Step 4: 接收响应] → [Step 5: 跳转/反馈]
```

每一步说明：
- Step 1：[用户做什么 / 期望看到什么]
- Step 2：...
- Step 3：...

### 异常分支树

对**每一步**问 4 个问题：
1. 失败（API 返回错）怎么办？
2. 数据为空怎么办？
3. 权限不足怎么办？
4. 网络中断怎么办？

```
异常分支：
├── Step 1: 进入页面无权限    → 跳登录 / 引导申请
├── Step 2: 输入格式错        → 行内提示 + 阻断推进
├── Step 2: 触发风控          → 引导验证（图形验证码 / 短信）
├── Step 3: 提交时网络中断    → Toast + 表单数据保留
├── Step 3: 触发并发冲突      → 提示 + 提供解决方案
├── Step 4: API 返回 401      → 跳登录 + 保留来源
├── Step 4: API 返回 5xx      → 兜底页 + 客服入口
├── Step 4: 数据被删（404）   → 友好提示 + 返回入口
└── Step 5: 跳转目标不可达    → fallback 到默认屏
```

### 流程图（可选 ASCII / mermaid）

```
[State: idle]
   │ 用户点击提交
   ▼
[State: submitting] ─── 失败 ───→ [State: error] ──→ 用户重试 ─→ [submitting]
   │ 成功
   ▼
[State: success] ─── 跳转目标屏
```

## 关键时机点

- 进入屏时：[需要触发什么？autoFetch？检查 session？]
- 离开屏时：[需要清理什么？取消 in-flight 请求？]
- 后台切前台：[需要重新拉数据吗？]

---

## ★ 沉淀到 schema 的结论

主线流程浓缩进 `screen.meta.product.summary`；异常分支的处理策略**全部沉淀到 Step C 的 rules**——本任务不直接落 rules。

```jsonc
// MCP: meta/set_screen（在 stories 的 summary 基础上追加流程浓缩）
{
  projectId, screenId,
  patch: {
    product: {
      summary: "...该屏一句话定位（含主线流程浓缩，如：登录页流程 = 输入手机号 → 选模式 → 输凭证 → 勾协议 → 提交 → 跳主页）..."
    }
  }
}
```

> 异常处理细节会在 Step C `<M>-rules` 任务里写到 rules[]——这里只留过程留痕。
