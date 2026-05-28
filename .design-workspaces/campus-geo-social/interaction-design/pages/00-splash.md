# 00-splash · 启动页 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#step-b-核心流程`（用户旅程入口）
> **全局规范**：`interaction-design/overview.md`
> **平台特性**：原生 App 冷启动；无用户操作，全自动逻辑

---

## 状态机

### States

| State | 含义 | 显示内容 |
|------|------|---------|
| `bootstrapping` | 初始态：logo 入场动画 + 并行后台检查（token/version/local-flag） | logo + 应用名 + 隐式 loading |
| `routing` | 检查完成、即将路由 | logo 静态保持，500ms 内 fade-out |
| `updating-blocked` | 检测到强制更新 | 强制更新 Modal（L4），不可关闭 |
| `timeout` | 3s 未完成（白屏阈值） | logo + "网络不太好" 提示 + 重试按钮 |
| `routed` | 已离开本页 | — |

### Transitions

```
bootstrapping → routing:           token 校验 + 版本检查并行完成
bootstrapping → updating-blocked:   detect forceUpdate == true
bootstrapping → timeout:            elapsed >= 3000ms 且未完成
timeout → bootstrapping:            点击重试按钮
routing → routed:
  - !onboarding_completed → push 00-onboarding (fade)
  - currentUser == null → push 00-login (fade)
  - verificationStatus == reviewing → push 00-auth-status (fade)
  - else → push 01-home-map (fade)
updating-blocked → external:        点击"去更新" → 跳应用商店（App 退出）
```

### Effects

| 转换 | UI 效果 |
|-----|--------|
| → bootstrapping | logo 从中心 scale(0.8 → 1) + opacity(0 → 1) `spring 1500ms`；首次启动至少持续 1.5s（即使后台已完成也等动画结束）|
| → routing | logo 维持 + 整页 fade-out 250ms 后跳转 |
| → updating-blocked | Modal 上滑（350ms）+ 蒙层 fade（250ms）|
| → timeout | logo 维持 + "网络不太好"文案下浮入场 + 重试按钮淡入；触觉 `notification.warning` |

---

## 操作清单

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 (L0) | 进行中 (L3) | 成功反馈 | 失败反馈 | 边界处理 |
|---|------|---------|---------|--------------|-------------|---------|---------|---------|
| 1 | App 启动 | 系统冷启动（无用户操作） | App 进程拉起 | logo 入场动画 1.5s | 后台并行：tokenCheck / versionCheck / readLocalFlags | → routing 后跳目标页 | timeout 态显示重试 | 后台已完成但首次启动需等动画完整 1.5s |
| 2 | 点击重试 | click `status-area/retry-btn` | state = `timeout` | 按钮 scale(0.97) + spinner | 重置为 `bootstrapping` 重新并行检查 | 同 #1 成功路径 | 二次超时 → 显示"请检查网络"详细文案 | 重试 ≥3 次 → 提示"打开网络设置"链接 |
| 3 | 点击去更新 | click `update-modal/store-btn` | state = `updating-blocked` | 按钮 scale(0.97) + 触觉 medium | — | 跳出 App 到应用商店 | 跳转失败 → Toast「应用商店未安装」 | 强制更新 Modal 无法用返回键/手势关闭 |
| 4 | 长按 logo | longPress 600ms on `brand-area/logo` | dev 模式启用（隐藏彩蛋）| 触觉 medium + logo 旋转一周 | — | 显示版本调试面板（仅 dev） | — | 普通构建忽略 |

---

## 加载策略

| 场景 | 策略 | 说明 |
|------|------|------|
| Token 校验 | 静默 | 无 UI 变化，并行执行 |
| 版本检查 | 静默 | 静默拉取 manifest |
| 本地 flag 读取 | 同步 | 极快，无 UI 变化 |
| > 3s 总耗时 | timeout 态 | 见状态机 |

加载失败恢复：参见 `overview.md#二-加载策略#22-加载失败恢复策略`。本页失败 → timeout 态。

---

## 错误处理

| 错误 | UI 响应 |
|------|--------|
| 网络断开 | 直接进 `timeout` 态，提示"网络不太好" |
| Token 过期但有 refresh_token | 静默 refresh，成功后继续 routing；失败则当作未登录 |
| 版本检查接口 500 | 忽略错误，按已是最新继续（不阻断启动）|
| 强制更新版本号不合法 | 上报 Sentry + 跳过强制更新逻辑（不阻断）|

---

## 边界情况

- **同时多次冷启动**：仅第一次走完整动画，后续 700ms 内秒过（首次启动 flag 已存）
- **黑屏期被用户切到后台**：App 切回前台后重新进入 bootstrapping
- **强制更新弹窗被用户用 OS 强杀返回**：下次启动还会触发，无法绕过
- **首次启动断网**：3s 后 timeout，重试按钮+引导打开网络
- **超长动画期间用户按 home 键**：App 进入后台，恢复时重新走启动流程

---

## 节点骨架

```
00-splash/
├── _page.json
├── brand-area/
│   ├── _component.json              品牌区容器
│   └── logo.json                logo 元素（动画 + 长按彩蛋）
├── status-area/
│   ├── _component.json              状态区容器
│   ├── progress.json            隐式进度（旋转粒子或脉冲）
│   └── retry-btn.json           重试按钮（仅 timeout 态可见）
└── update-modal/
    ├── _component.json              强制更新弹窗（component）
    └── store-btn.json           跳应用商店按钮
```

---

## 组件级交互需求

| 组件 | 触发场景 | 复杂度 | 独立文档 |
|------|---------|:------:|:-------:|
| `update-modal` | 强制更新场景 | 中（L4 不可关闭 + 跳外部）| 内联本文，足够简单 |

---

## 产品需求覆盖验证

- ✅ 规则 1 (token 路由) → 状态机 `bootstrapping → routing`
- ✅ 规则 2 (强制更新) → state `updating-blocked` + 操作 #3
- ✅ 规则 3 (首次启动 ≥1.5s) → 操作 #1 effect 描述
- ✅ 规则 4 (3s 超时显示重试) → state `timeout` + 操作 #2
- ✅ 规则 5 (启动期间不申请敏感权限) → 状态机注释（位置/通知权限延迟到首次使用功能时申请）
