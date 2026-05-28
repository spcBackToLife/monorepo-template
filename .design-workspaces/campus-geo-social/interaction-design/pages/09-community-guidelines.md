# 09-community-guidelines · 社区公约 · 交互规格

> **产品来源**：`product-analysis/modules/M9-content-safety.md#c2-违规分级`
> **全局规范**：`interaction-design/overview.md`
> **使用场景**：1) 设置/关于入口（仅查看） 2) 注册流程强制阅读+勾选（带"同意"CTA）

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading` | 正在加载公约 Markdown |
| `reading` | 阅读中（默认）|
| `toc-open` | 目录抽屉打开 |
| `register-mode-pending` | 注册流程下未滚到底部，"同意"按钮置灰 |
| `register-mode-ready` | 注册流程下已滚到底部，"同意"按钮激活 |
| `submitting` | 注册流程下点击同意，等待 ack |
| `error` | 加载失败 |

### Transitions

```
loading → reading:                    内容加载完成
loading → error:                      网络/服务失败
error   → loading:                    点重试
reading ↔ toc-open:                   点击目录按钮 / 点遮罩 / 选条目
reading → register-mode-pending:      路由参数 source=register（初始无法点同意）
register-mode-pending → register-mode-ready: scrollY >= maxScroll - 32px
register-mode-ready → submitting:     点击"同意并继续"
submitting → routed:                  本地写 acceptedVersion → pop 返回注册流
```

### Effects

| 转换 | UI 效果 |
|-----|--------|
| → loading | 骨架屏（章节段落占位）|
| → reading | 内容淡入 250ms |
| → toc-open | toc-sheet 右滑入 300ms + 蒙层 fade 250ms |
| → register-mode-ready | "同意"按钮从灰转主色，触觉 light，文案不变 |
| → submitting | 按钮内 spinner + 表单禁用 |
| → error | 全屏 ErrorState（手绘小怪兽挠头）+ 重试按钮 |

---

## 操作清单

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 | 进行中 | 成功 | 失败 | 边界处理 |
|---|------|---------|---------|---------|-------|------|------|---------|
| 1 | 打开本页 | router push | — | 进入 loading | 拉取 Markdown | 渲染内容 | error 态 | 路由参数带 source=register/normal |
| 2 | 滚动阅读 | scroll | reading | 章节高亮跟随（toc 自动定位）| — | — | — | 滚到底触发 register-mode-ready 状态切换 |
| 3 | 点击目录按钮 | click `app-bar/toc-btn` | reading | 按钮 scale(0.97) | toc-sheet 滑入 | 显示目录 | — | 二次点击关闭 |
| 4 | 点击目录条目 | click `toc-sheet/item-{i}` | toc-open | item scale(0.97) | sheet 退场 + content 滚到锚点 | 滚到目标章节 | — | 滚动距离 > 1 屏走 500ms ease；近距离用 250ms |
| 5 | 点击蒙层关闭 toc | click `toc-sheet/mask` | toc-open | — | toc-sheet 右滑出 250ms | 回到 reading | — | — |
| 6 | 点击返回 | click `app-bar/back-btn` 或 left-edge swipe | — | 按钮 scale | pop 退出 | — | — | 注册场景下返回 = 拒绝公约 → 回到注册前一步 |
| 7 | 点击新版本 Banner | click `update-banner` | 公约有新版本 | banner scale(0.97) | 平滑滚到 "变更摘要" 章节 | — | — | 仅当 acceptedVersion != currentVersion 时显示 |
| 8 | 点击同意并继续 | click `bottom-cta/agree-btn` | source=register & state=register-mode-ready | 按钮 press + 触觉 medium | submitting：上传 acceptedVersion | pop 回注册流 + 设置 registerStore.agreedGuidelines=true | Toast「提交失败，请重试」+ 按钮恢复 | 重复点击忽略；超时 15s 恢复 |

---

## 加载策略

- 首次加载：骨架屏（章节占位），3s 仍未完成切 error
- 失败重试：保留滚动位置（本地缓存上次成功的 markdown 作为兜底）

详见 `overview.md#二-加载策略`。

---

## 错误处理

| 错误 | UI 响应 |
|------|--------|
| 加载失败 | L5 ErrorState + 重试 |
| 接口超时 | 退到上次缓存版本 + Toast「显示的可能不是最新版本」|
| 注册场景下提交同意失败 | Toast + 按钮恢复，保留 scrollY |

---

## 边界情况

- **极长公约（10+ 章）**：toc-sheet 可滚动；当前章节始终保持可视
- **用户旋转屏幕**：锁竖屏（App 全局策略）
- **注册场景下用户滚到底再滚回顶**：register-mode-ready 状态不回退（只要曾经触底就视为读完）
- **多语言**：MVP 仅中文
- **公约更新弹窗**：若进入本页时检测到新版本 + 老版本 acceptedVersion，显示 Banner（非阻塞）

---

## 节点骨架

```
09-community-guidelines/
├── _page.json
├── app-bar/
│   ├── _component.json
│   ├── back-btn.json
│   ├── title.json
│   └── toc-btn.json
├── version-banner.json          顶部"v2.1 · 2026-01-01 生效"
├── update-banner.json           新版本变更提示（非注册场景才显示）
├── content-area/
│   ├── _component.json              Markdown 渲染容器
│   └── markdown-body.json       内容主体（含锚点跟踪）
├── toc-sheet/                   目录抽屉（component）
│   ├── _component.json
│   ├── mask.json
│   └── items.json               目录项列表
└── bottom-cta/                  仅 source=register 时显示
    ├── _component.json
    └── agree-btn.json           同意并继续
```

---

## 组件级交互需求

| 组件 | 触发场景 | 复杂度 | 独立文档 |
|------|---------|:------:|:-------:|
| `toc-sheet` | 章节导航 | 中（侧滑 sheet + 滚动同步）| 内联本文 |
| `markdown-body` | 标准 markdown 渲染 | 低 | — |

---

## 产品需求覆盖

- ✅ 规则 1 (顶部生效版本号 + 日期) → `version-banner`
- ✅ 规则 2 (违规分级 + 处罚 + 申诉) → markdown 内容（产品文档已规定章节结构）
- ✅ 规则 3 (新版本弹窗提示主要变化) → `update-banner` + 操作 #7
- ✅ 规则 4 (不强制再次确认，仅注册时勾选) → source=register 模式 + 操作 #8
- ✅ 规则 5 (目录索引快速跳转) → 操作 #3/#4
