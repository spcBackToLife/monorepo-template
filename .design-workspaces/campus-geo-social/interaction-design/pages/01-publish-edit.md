# 01-publish-edit · 编辑动态 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#b1-发布动态主线`
> **全局规范**：`interaction-design/overview.md`
> **入口**：01-publish-entry → 发动态 / 01-moment-detail → 编辑

---

## 状态机

### States

| State | 含义 |
|------|------|
| `empty` | 空白默认（含 GPS 自动填的地点）|
| `editing` | 正在编辑（任一字段有内容）|
| `uploading-media` | 媒体上传中（可后台进行）|
| `media-upload-failed` | 某张图片上传失败 |
| `draft-loading` | 进入时检测到本地草稿 → Modal 询问是否继续 |
| `submitting` | 发布提交中（仅文字接口；媒体已传完）|
| `success:review-pending` | 提交成功，内容进入异步审核 |
| `success:approved` | 自动审核通过（极少数情况直接通过）|
| `exit-confirm` | 退出时草稿提示 Modal |
| `error:size-exceed` | 单图 >10MB / 单视频 >100MB |
| `error:nsfw-local` | 本地预审拦截（明显违规图）|
| `error:network` | 提交失败 |

### Transitions

```
empty → editing:                    任一字段有输入
editing → uploading-media:           添加媒体（不阻塞文字编辑）
uploading-media → editing:           上传完成 / 失败
draft-loading → editing:             加载草稿后
editing → submitting:               点发布（校验通过 + 媒体全传完）
submitting → success:review-pending: API 200 → 触发 M9 异步审核
submitting → success:approved:      API 返回 approved=true
success:* → routed:                 pop / 跳详情
editing → exit-confirm:              点返回 / 系统返回
exit-confirm → routed:               确认退出（存草稿/丢弃二选一）
```

### Effects

| 转换 | UI |
|-----|----|
| 进入页 | 全屏淡入 + 自动检测草稿 |
| → uploading-media | 媒体格子内进度环 0-100% |
| → submitting | 按钮 spinner + 表单全禁用 |
| → success:review-pending | ✓ 动画 + Toast「已发布，审核中」+ 1.5s pop + 详情页顶部 banner |
| → success:approved | ✓ 动画 + 直接 push 01-moment-detail |
| → exit-confirm | L4 Modal 三按钮：存草稿/丢弃/取消 |
| → error:size-exceed | Toast「视频不能超过 100MB」+ 移除媒体 |
| → error:nsfw-local | L4 Modal「内容可能违反公约，请修改」 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 关闭 | click `app-bar/back-btn` | — | scale | 有内容→exit-confirm；无内容→pop | — | 系统返回手势同效 |
| 2 | 发布 | click `app-bar/publish-btn` | 校验通过+媒体传完 | press + 触觉 medium | submitting | 见 error:* | 800ms 防抖；地点未选→inline 提示 |
| 3 | 添加媒体 | click `media-grid/add-btn` | 媒体 <9（图）/ <1（视频）| MediaPicker → 拍照/相册 | 超数→Toast；超大→error:size-exceed | 视频与图片互斥；自动压缩 |
| 4 | 删除媒体 | click `media-grid/items/delete-x` | uploading-media/editing | 长按选中 + delete icon | 移除该项 | 仅本地移除；服务端文件 24h 后清理 | — |
| 5 | 重排媒体 | drag `media-grid/items` | media-count ≥2 | 跟手拖动 + 触觉 light | — | 视频不可重排（只能 1 个）|
| 6 | 编辑文字 | input `text-editor` | — | 字符计数 N/1000 | 超 1000→拒绝输入 | emoji 支持；# 触发标签建议 |
| 7 | 添加标签（手动）| click `tag-row/add-btn` | tag-count <5 | sheet 弹起标签输入器（含历史/热门）| — | 单标签 ≤12 字；不允许特殊字符 |
| 8 | 编辑/删除标签 | tap `tag-row/items/x` | 已有标签 | 标签变可编辑 / 删除 | — | — |
| 9 | 选择地点 | click `location-row` | — | press | push 01-publish-pick-location（带当前选定回填） | 选定后 location-row 显示地名+距离 | 必填；未选无法发布 |
| 10 | 设置可见性 | click `visibility-row` | — | press | push 01-publish-visibility | 选定后 visibility-row 显示可见性图标+目标 | 默认 public |
| 11 | 保存草稿 | exit-confirm 内 click「存草稿」 | exit-confirm | press | 本地保存 → pop + Toast | — | 30 天后清理 |
| 12 | 丢弃 | exit-confirm 内 click「丢弃」 | exit-confirm | press | 不保存 → pop | — | — |
| 13 | 取消（继续编辑）| exit-confirm 内 click「取消」 | exit-confirm | 关 Modal | — | — | — |
| 14 | 加载草稿 | Modal 内 click「继续编辑」 | draft-loading | press | 草稿内容回填 → editing | — | — |
| 15 | 放弃草稿 | Modal 内 click「重新开始」 | draft-loading | press | 草稿丢弃 → empty | — | — |
| 16 | 重新上传失败媒体 | click `media-grid/items/retry-btn` | media-upload-failed | press + 进度环重启 | 仍失败→Toast | — | — |

---

## 加载策略

- 进入页：< 100ms（无网络请求）
- 草稿检测：< 100ms 本地 IO
- 媒体上传：进度环（每张图独立进度，不阻塞文字编辑）
- 发布：按钮 spinner（仅文字接口很快）

---

## 错误处理

| 错误 | UI |
|------|----|
| 媒体超大 | Toast + 移除该项 |
| 本地预审拦截 | L4 Modal「内容可能违反公约」 |
| 媒体上传失败 | 该格子显示重试按钮 |
| 网络断开 | 顶部 banner，发布按钮置灰 |
| 服务端审核失败（异步）| 详情页 + 通知（M8 推送）|

---

## 边界情况

- App 后台 → 媒体上传暂停 → 回前台自动续传
- 中途流量切换 WiFi/4G → 不重传，仅暂停 + 提示
- 输入中遇到 # 触发标签建议 popup（V1.x，MVP 不实现）
- 重复添加同一张图（用户重复选了相同文件）→ 客户端校验文件哈希，警告「该图已添加」
- 长按可见性卡片显示已选好友头像气泡 tooltip
- 草稿存在但用户主动新建 → 提示「上次未完成的草稿仍在」

---

## 节点骨架

```
01-publish-edit/
├── _page.json
├── app-bar/
│   ├── _block.json
│   ├── back-btn.json
│   └── publish-btn.json         (右上发布按钮)
├── media-grid/
│   ├── _block.json              (component: 媒体网格容器)
│   ├── items.json               (媒体项，含 delete-x + drag + retry-btn)
│   └── add-btn.json             (+ 按钮，含 click→MediaPicker)
├── text-editor.json             (textarea + 字符计数)
├── tag-row/
│   ├── _block.json
│   ├── items.json               (标签气泡，含 click 编辑/删除)
│   └── add-btn.json
├── location-row.json            (地点 row，click→push pick-location)
├── visibility-row.json          (可见性 row，click→push visibility)
├── draft-modal/
│   ├── _block.json              (component: ConfirmDialog 变体)
│   ├── continue-btn.json
│   └── restart-btn.json
└── exit-modal/
    ├── _block.json
    ├── save-btn.json
    ├── discard-btn.json
    └── cancel-btn.json
```

通用组件：`MediaPicker`、`ConfirmDialog`、`Toast`、`ActionSheet`（媒体长按）

---

## 产品需求覆盖

- ✅ 规则 1 (≤9 图 + ≤60s 视频 + 自动压缩) → 操作 #3 + state `uploading-media`
- ✅ 规则 2 (文字 0-1000) → 操作 #6
- ✅ 规则 3 (≤5 标签 + 每个 ≤12 字) → 操作 #7
- ✅ 规则 4 (地点必选 + 默认 GPS 命中 POI) → 操作 #9 + 边界
- ✅ 规则 5 (可见性必选 + 胶囊跳转) → 操作 #10
- ✅ 规则 6 (草稿 30 天) → 操作 #11 + state `draft-loading`
- ✅ 规则 7 (M9 异步审核) → state `success:review-pending`
