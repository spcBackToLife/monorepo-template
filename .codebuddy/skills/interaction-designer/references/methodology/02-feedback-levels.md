# 方法论 2：反馈层级 L0-L5

> 适用任务：`I-X-operations`、`I-X-events`（每条 event.actions 都要回头匹配反馈层级）

## 1. 反馈层级总表

```
L0 微反馈    图标动画 / 颜色变化 / 轻震动        100-150ms
L1 局部提示  行内 toast / 文字气泡                200-400ms
L2 中等反馈  loading + 结果文案                   跟随异步
L3 强反馈    全屏 overlay / 模态结果              跟随异步 / 阻断
L4 阻断确认  确认弹窗 + 二次确认                  用户主动关闭
L5 终极阻断  倒计时确认（删除账户 / 清空数据）    用户主动关闭 + 等待
```

## 2. 操作量级 → 反馈层级的匹配

| 操作量级 | 例子 | 适合的反馈 |
|---------|------|----------|
| 微操作（瞬时态切换）| 点赞 / 收藏 / 切换 tab | L0 |
| 小操作（局部状态变更）| 保存草稿 / 复制成功 / 表单字段聚焦 | L0 + L1 |
| 中操作（异步业务请求）| 提交表单 / 发布内容 / 加载列表 | L2 / L3（关键提交）|
| 大操作（关键提交）| 支付 / 关键开通 | L3（全屏 LoadingOverlay）|
| 不可逆操作 | 删除 / 退出 / 解绑 | L4 |
| 灾难级不可逆 | 删除账户 / 清空全部数据 | L5 |

**原则**：错的层级匹配 = 灾难。
- 删除账户没确认 → 用户误删跑路
- 点赞还要弹确认 → 烦死人

## 3. 反馈链 5 段（每个操作必须穷举）

每条用户操作都要按 5 段思考：

```
触发条件 → 即时反馈(L0) → 进行中(L2/L3) → 成功 → 失败 → 边界
```

- **触发条件**：trigger 类型 + 前置 condition（如 formValid && !submitting）
- **即时反馈 L0**：按下立刻视觉响应（按钮 scale(0.97) + shadow 降级）
- **进行中**：异步操作中状态（spinner / 表单 disabled / 阻断点击）
- **成功**：✓ + 文案 + 跳转 / 数据本地更新
- **失败**：按钮恢复 + Toast / shake + 聚焦关键字段
- **边界**：防抖 / 超时 / 离开页面 / 重复点击

## 4. 操作清单 7 列模板（穷举该屏所有用户操作）

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 | 进行中 | 成功反馈 | 失败反馈 | 边界处理 |
|---|------|---------|---------|---------|-------|---------|---------|---------|
| 1 | 切换登录方式 | click `mode-toggle` | — | toggle 滑动 200ms (L0) | — | 表单切换 200ms 淡入淡出 | — | 保留已输入手机号 |
| 2 | 输入手机号 | input `phone-input` | — | label 上浮 / 实时校验 (L0) | — | 解锁登录按钮 | 红字"格式不对" (L1) | iOS 短信预填 |
| 3 | 提交登录 | click `submit-btn` | formValid && !submitting | 按钮 scale(0.97) (L0) | 按钮 spinner + 表单 disabled (L3) | ✓ + nav.go home | shake + Toast | 800ms 防抖 + 重复忽略 |

## 5. 落到 schema

操作清单 7 列结构化对象写入 `screen.meta.interaction.operations`：

```jsonc
operations: [
  {
    op: "提交登录",
    triggerNodePath: "FormCard/SubmitBtn",
    feedbackLevel:    "L3",
    immediateFeedback: "按钮 scale(0.97) + shadow 降级",
    inProgress:        "按钮 spinner + 表单 disabled + 全屏 LoadingOverlay 半透明",
    onSuccess:         "✓ 0.5s 后 nav.go home",
    onFailure:         "shake + Toast + 聚焦凭证框",
    boundary:          "800ms 防抖 / 重复点击忽略"
  }
]
```

详细字段见 `schema-spec/screen-meta-interaction.md` §2。

## 6. 红线

- ❌ 操作清单某条只写 4 列（漏 immediateFeedback / boundary 等）
- ❌ feedbackLevel 全选 L3（说明没思考——并非每个操作都需要全屏 loading）
- ❌ "点赞 → 弹确认 modal"（操作量级与反馈不匹配）
- ❌ "删除账户 → 直接执行不弹确认"（应 L4 / L5）
