# 11-about · 关于 · 交互规格

> **产品来源**：`product-analysis/modules/M11-settings-privacy.md#b1-设置主菜单结构`
> **全局规范**：`interaction-design/overview.md`
> **页面定位**：版本/协议/客服汇总，纯展示+导航

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle` | 默认（已加载本地 package + manifest 数据）|
| `checking-update` | 正在向后端查询最新版本 |
| `up-to-date` | 已是最新（持续 2s 后回 idle）|
| `has-update` | 有新版本可更新（持续显示，直到用户操作）|
| `updating` | 跳转应用商店中 |
| `debug-mode` | 开发者模式（长按版本号 7 次后开启，仅 dev/灰度构建有此状态）|

### Transitions

```
idle → checking-update:     点击"检查更新"行
checking-update → up-to-date: API 返回 currentVersion >= remoteVersion
checking-update → has-update: API 返回 remoteVersion > currentVersion
checking-update → idle:       API 错误（已 Toast，状态回退）
up-to-date → idle:            2s 后自动
has-update → updating:        点击"立即更新"
idle → debug-mode:            长按版本号 7 次（间隔 ≤ 500ms）
```

### Effects

| 转换 | UI 效果 |
|-----|--------|
| → checking-update | "检查更新"行右侧 spinner |
| → up-to-date | 右侧 ✓ 图标 + 文案"已是最新"，2s 后恢复 |
| → has-update | 右侧红点 + 文案"有新版本 v2.3.0 立即更新" |
| → updating | 触觉 medium → 跳应用商店（App 进入后台）|
| → debug-mode | Toast「开发者模式已开启」+ 显示隐藏的调试入口 |

---

## 操作清单

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 | 进行中 | 成功 | 失败 | 边界处理 |
|---|------|---------|---------|---------|-------|------|------|---------|
| 1 | 返回 | click `app-bar/back-btn` 或 left-edge swipe | — | scale(0.97) | pop | — | — | — |
| 2 | 检查更新 | click `menu/check-update-row` | state=idle | row press 态 | checking-update | up-to-date / has-update | Toast「检查失败」+ 回 idle | 已是 has-update 状态时再点 → 重新检查 |
| 3 | 立即更新 | click `menu/check-update-row` | state=has-update | 触觉 medium | updating | 跳应用商店 | Toast「应用商店未安装」| — |
| 4 | 用户协议 | click `menu/user-agreement-row` | — | row press 态 | push WebView | — | WebView 加载失败 → Toast | URL 带 ?version=currentVersion |
| 5 | 隐私政策 | click `menu/privacy-policy-row` | — | 同上 | push WebView | — | 同上 | 同上 |
| 6 | 社区公约 | click `menu/community-guidelines-row` | — | 同上 | push `09-community-guidelines` (source=normal) | — | — | — |
| 7 | 联系客服 | click `menu/contact-row` | — | row press | 弹出 sheet（常见问题 / 在线客服 / 提交工单 3 选项）| 选项 click → 跳对应页 | 客服离线 → Toast「客服稍后联系」| 在线客服走 WebView 第三方 IM |
| 8 | 关于我们 | click `menu/about-us-row` | — | row press | push WebView (公司介绍页) | — | — | — |
| 9 | 长按版本号 7 次 | longPress `hero/version-text` 累计 7 次（间隔≤500ms）| 仅 dev/灰度 | 每次触觉 light + 计数 toast「再点 N 次」| — | 进入 debug-mode | 间隔超时重置计数 | 普通构建忽略 |
| 10 | 点击 ICP 备案号 | click `icp-footer/text` | — | 弹出 Toast「ICP备案号已复制」+ 复制到剪贴板 | — | — | — | — |
| 11 | 评分入口（彩蛋）| 进入本页满 5 秒 + 用户活跃 > 7 天 | 一次/版本 | 浮层卡片淡入 | — | 用户点"去评分" → 跳 App Store 评分 | 用户点"以后再说" → 记录 7 天不再展示 | 不打断主流程 |

---

## 加载策略

- 进入页面：本地数据立即可见（版本号/package 信息）
- "检查更新"主动触发：spinner 在行内（L3），不阻塞其他操作

---

## 错误处理

| 错误 | UI 响应 |
|------|--------|
| 检查更新接口失败 | L2 Toast「检查失败，请重试」 |
| WebView 加载失败 | WebView 自带错误页 + 顶部返回 |
| 客服系统离线 | sheet 内提示「客服离线，可提交工单」|

---

## 边界情况

- **App 在审核期间**：隐藏"评分入口"彩蛋（防苹果审核拒绝）
- **iPhone 横屏（强制竖）**：忽略
- **强制更新中点本页其他入口**：被全局 update-modal 拦截（splash 已处理）
- **客服系统是 WebView 三方 IM**：长时间使用未推送/客服未回复 → 显示在线状态轮询

---

## 节点骨架

```
11-about/
├── _page.json
├── app-bar/
│   ├── _component.json
│   ├── back-btn.json
│   └── title.json
├── hero/
│   ├── _component.json              品牌头部（logo + 应用名 + 版本号）
│   ├── logo.json
│   ├── app-name.json
│   └── version-text.json        版本号（长按 7 次彩蛋）
├── menu/
│   ├── _component.json              功能行容器
│   ├── check-update-row.json    检查更新（含状态：idle/up-to-date/has-update）
│   ├── user-agreement-row.json  用户协议
│   ├── privacy-policy-row.json  隐私政策
│   ├── community-guidelines-row.json  社区公约
│   ├── about-us-row.json        关于我们
│   └── contact-row.json         联系客服（触发 sheet）
├── contact-sheet/                客服选项 sheet（component）
│   ├── _component.json
│   ├── faq-option.json
│   ├── online-option.json
│   └── ticket-option.json
├── rating-banner.json            评分彩蛋浮层（条件显示）
└── icp-footer/
    ├── _component.json
    └── text.json                 ICP备案 + 公司信息
```

---

## 组件级交互需求

| 组件 | 触发场景 | 复杂度 | 独立文档 |
|------|---------|:------:|:-------:|
| `contact-sheet` | 联系客服三选项 sheet | 低 | 内联 |
| `menu-row` | 通用功能行（hover/press/disclosure）| 低 | 由 design-system 规范统一 |

---

## 产品需求覆盖

- ✅ 规则 1 (版本号 + 检查更新) → hero + menu/check-update-row + 操作 #2/#3
- ✅ 规则 2 (协议 WebView 带版本号) → 操作 #4/#5
- ✅ 规则 3 (ICP + 公司信息) → `icp-footer`
- ✅ 规则 4 (客服三入口：FAQ + 在线 + 工单) → 操作 #7 + `contact-sheet`
- ✅ 规则 5 (Q 版插画装饰) → 视觉层处理（design 阶段）
