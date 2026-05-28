# 00-auth-xuexin · 学信网授权 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#b1-注册主线-happy-path`
> **全局规范**：`interaction-design/overview.md`
> **关键安全约束**：授权页面必须跳转官方学信网，App 内不伪造任何学信网 UI

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle` | 默认：说明卡 + 「开始授权」按钮 |
| `redirecting` | 即将跳出 App 到学信网 |
| `awaiting-callback` | 已跳出，等待回调（最长 10 分钟）|
| `callback-success` | 学信网返回 + 信息与学生证 OCR 一致 |
| `callback-mismatch` | 学信网信息与 OCR 不一致 |
| `callback-rejected` | 用户在学信网拒绝授权 |
| `callback-error` | 学信网接口故障/超时 |
| `submitting` | 提交授权 token + 学籍信息 |
| `success` | 跳 00-auth-face |
| `fallback-confirming` | 用户准备走"仅学生证+人工审核"降级路径 |

### Transitions

```
idle → redirecting:                 点击「开始授权」
redirecting → external:             跳出 App
external → awaiting-callback:       App 进入后台
awaiting-callback → callback-*:     URL Scheme/Universal Link 回调或用户手动返回
callback-success → submitting:       自动提交
callback-mismatch → idle:            L4 Modal「信息不一致」+ 引导改学生证
callback-rejected → fallback-confirming: L4 Modal「拒绝授权，是否走人工审核?」
callback-error → idle:                Toast「学信网繁忙」+ 重试按钮
fallback-confirming → submitting:    确认走降级 → 提交 fallback 标记
submitting → success:                 API 200 → push 00-auth-face
```

### Effects

| 转换 | UI |
|-----|----|
| → redirecting | 触觉 light + 全屏文案「即将跳转学信网…」+ spinner |
| → awaiting-callback | App 后台；前台时显示「正在等待学信网回调…」+ 取消按钮 |
| → callback-success | 触觉 success + 全屏 ✓ 动画 500ms |
| → callback-mismatch | L4 Modal + 高亮不一致字段「姓名: 学信网=张三 / 学生证=张四」 |
| → callback-rejected | L4 Modal「为什么需要授权」+ 「再试一次」/「走降级路径」双按钮 |
| → fallback-confirming | L4 Modal「降级人工审核需 48h，确认?」 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | L4 Modal「退出将丢失认证进度?」 | 确认退出回 id-card | 警告 |
| 2 | 点击「为什么需要」 | click `info-card/help-btn` | — | press | 展开/收起 | — | — |
| 3 | 点击开始授权 | click `start-auth-btn` | idle | press + 触觉 medium | 跳出 App 到学信网 | URL 打开失败→Toast「未安装浏览器」 | 800ms 防抖 |
| 4 | 学信网外部回调 | callback URL | awaiting-callback | App 拉回前台 | 见各 callback-* 状态 | URL Scheme 失效 → 提示用户「手动返回 App」 | — |
| 5 | 点击取消等待 | click `awaiting-card/cancel-btn` | awaiting-callback | press | L4 Modal「确认取消?」 | 确认 → 回 idle | — |
| 6 | 修改学生证（信息不一致）| Modal 内 click「去修改学生证」 | callback-mismatch | press | pop 到 00-auth-id-card | — | OCR 进度保留 |
| 7 | 走人工审核（降级）| Modal 内 click「人工审核」 | callback-rejected/error | press | 进 fallback-confirming → 二次确认 | — | 48h 反馈 |
| 8 | 重新授权 | click `start-auth-btn`（callback-* 后再次显示） | callback-error/rejected | press | 重走 #3 | — | — |

---

## 加载策略

- 等待回调：显示动画「学信网授权中…」+ 取消按钮
- 提交：按钮 spinner（L3）
- 长时间无回调（> 10 分钟）→ 自动回 idle + Toast「未收到回调，请重新授权」

---

## 错误处理

| 错误 | UI |
|------|----|
| 跳转失败 | Toast「无法打开浏览器」+ 联系客服 |
| 学信网信息不一致 | L4 Modal + 高亮字段 + 改学生证入口 |
| 学信网拒绝 | L4 Modal + 降级路径选项 |
| 学信网超时/500 | Toast + 重试 + 降级路径 |
| 网络断开 | Toast「无网络」+ 重试 |

---

## 边界情况

- 用户在学信网完成授权但未点确认返回 → 回 App 后无回调 URL → 服务端轮询拉取（每 3s ×10 次）
- 用户在学信网途中关闭浏览器 → 回 App 无回调 → Toast 引导重试
- 多次拒绝（≥2 次） → 直接展示降级路径作为主 CTA
- 已通过认证但学信网信息变更 → 复核失败 → 触发"学籍续期"流程（V1.x）

---

## 节点骨架

```
00-auth-xuexin/
├── _page.json
├── app-bar/
│   ├── _component.json
│   └── back-btn.json
├── info-card/
│   ├── _component.json             (说明：为什么需要 + 数据安全)
│   └── help-btn.json
├── privacy-note.json           (隐私承诺，纯展示无 trigger - 但需要独立 element 用于 design 阶段引用)
├── start-auth-btn.json
├── awaiting-card/
│   ├── _component.json             (等待回调时显示)
│   └── cancel-btn.json
└── fallback-btn.json           (降级人工审核按钮，callback-error/rejected 时显示)
```

通用组件：`ConfirmDialog`、`Toast`

---

## 产品需求覆盖

- ✅ 规则 1 (跳转官方学信网) → 操作 #3 跳出 App
- ✅ 规则 2 (拒绝降级 48h 人工审核) → state `fallback-confirming` + 操作 #7
- ✅ 规则 3 (与学生证一致校验) → state `callback-mismatch` + 操作 #6
- ✅ 规则 4 (token 仅服务端持有) → 客户端不存储 token（API 层处理）
- ✅ 规则 5 (完成跳人脸核身) → success → push 00-auth-face
