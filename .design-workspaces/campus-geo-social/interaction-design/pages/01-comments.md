# 01-comments · 评论列表 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#c2-业务规则`
> **全局规范**：`interaction-design/overview.md`
> **形态**：从 `01-moment-detail` 上滑入的半屏 sheet（也可走路由独立打开）

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading` | 拉取评论列表中 |
| `visible` | 有评论 |
| `empty` | 无评论 → 治愈插画「来抢沙发吧」 |
| `composing` | 输入框聚焦中 |
| `submitting` | 提交评论中 |
| `replying` | 回复某条评论（输入框上方显示 "回复 @xxx：xxx_quoted_"）|
| `mention-picking` | @ 触发好友选择器 |
| `success` | 提交成功 → 列表头部插入新评论（高亮 fade）|
| `error:review-pending` | 审核中 → Toast「评论审核中，仅你可见」 |
| `error:violation` | 违规即时撤回 + 通知 |
| `error:network` | 提交失败 |
| `deleting` | 删除二次确认 + API 中 |

### Transitions

```
loading → visible/empty:           接口返回
visible → composing:               输入框聚焦
composing → submitting:             点发送
submitting → success → visible:    成功
visible → replying:                 点某条评论的「回复」按钮
replying → composing:                取消回复
composing → mention-picking:        输入 @
mention-picking → composing:        选定/取消
visible → deleting:                 长按自己评论 / 作者长按任意评论
deleting → visible:                 确认删除/取消
```

### Effects

| 转换 | UI |
|-----|----|
| → loading | skeleton 评论行 ×5 |
| → composing | 键盘弹起 + sheet 自动撑高 + 发送按钮激活 |
| → submitting | 发送按钮 spinner + 输入框禁用 |
| → success | 新评论从顶部 fade-in 0.5s + 列表自动滚到该评论 + 触觉 light |
| → replying | 输入框上方 inline 显示「回复 @xxx」+ 取消 X |
| → mention-picking | sheet 内嵌好友选择 popup（仅互为好友的列表）|
| → error:violation | 失败评论 fade-out + L4 Modal「评论违反社区公约」 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 关闭 sheet | click `app-bar/close-btn` 或下滑手势 | — | sheet 下滑 250ms | — | 有输入内容→Confirm「内容未保存」 |
| 2 | 切换排序 | click `sort-tabs`（最新/最热）| visible | tab 滑块 + 列表重渲染 | 接口失败→Toast | scroll-to-top |
| 3 | 上拉加载更多 | scroll 触底 `comment-list` | visible | footer spinner | 失败→「点击重试」 | 单页 20 |
| 4 | 输入评论 | input `composer/text-input` | — | label 上浮 + 字符计数 N/200 | 超 200→拒绝输入 | emoji 支持 |
| 5 | @ 提及 | input `@` in `composer/text-input` | composing | 弹好友选择器 | — | 仅互为好友可选 |
| 6 | 选定 @ 好友 | click `mention-picker/items` | mention-picking | 插入「@昵称」蓝色文本 + 关闭 picker | — | — |
| 7 | 添加图片（V1.x）| click `composer/add-image-btn` | composing | MediaPicker → 1 张图 | 超 5MB→Toast | MVP 隐藏此按钮 |
| 8 | 发送评论 | click `composer/send-btn` | text 非空 + 校验通过 | press + 触觉 light + submitting | 见 error:* | 800ms 防抖 |
| 9 | 回复某评论 | click `comment-list/items/reply-btn` | visible | 输入框上方显示「回复 @xxx」+ 聚焦 | — | 二级评论缩进展示 |
| 10 | 取消回复 | click `composer/reply-cancel-btn` | replying | inline 关闭 + 回 composing | — | — |
| 11 | 长按自己评论 | long-press `comment-list/items` | 评论作者 = current user | 触觉 medium + ActionSheet：复制/删除 | — | — |
| 12 | 长按任意评论（动态作者）| long-press `comment-list/items` | current user = 动态作者 | 触觉 medium + ActionSheet：复制/删除/举报 | — | — |
| 13 | 删除评论 | click `delete-confirm/yes-btn` | deleting | spinner | 失败→Toast | 二级评论删除后子树折叠 |
| 14 | 点击评论作者头像 | click `comment-list/items/avatar` | visible | press | push 05-user-profile | 漫游禁用 |
| 15 | 点击 @ 链接 | click 评论文本内 `@昵称` 蓝字 | visible | press | push 05-user-profile?userId=xxx | — |
| 16 | 展开折叠的二级评论 | click `comment-list/items/expand-replies-btn` | 有 ≥3 条二级评论 | 列表展开 + 高度动画 | 接口失败→Toast | — |
| 17 | 双击点赞评论 | double-tap `comment-list/items` | visible | 心形浮现 + 点赞计数 +1 | 漫游禁用 | — |

---

## 加载策略

- 首次：skeleton 评论行 ×5
- 增量：底部 loading footer
- 提交：按钮 spinner + 输入框禁用
- 删除：按钮内 spinner

---

## 错误处理

| 错误 | UI |
|------|----|
| 审核中 | 提交后 inline Toast「评论已发送，正在审核」+ 评论显示「审核中」标记仅自己可见 |
| 违规即时撤回 | L4 Modal「评论违反社区公约」+ 撤回评论 + 通知用户 |
| 网络失败 | inline 红字 + 重试按钮（保留输入）|
| @ 好友列表加载失败 | picker 内 ErrorState + 重试按钮 |
| 字数超限 | 提交按钮置灰 + inline 提示 |

---

## 边界情况

- 发布者本人在评论列表中评论：标记「作者」标签
- 删除二级评论后，其子评论需要重新挂到祖父级（保留链路）但不可见
- 软键盘弹起时 sheet 自动 resize 适配
- 用户从详情页连续打开/关闭评论 sheet → 缓存上次滚动位置 + 已加载数据
- 评论中含外部链接 → 仅显示纯文本不做超链
- @ 触发后用户继续输入超过 30 字符未完成选择 → 自动取消 mention 模式

---

## 节点骨架

```
01-comments/
├── _page.json
├── app-bar/
│   ├── _block.json              (sheet 顶部，含拖手柄 + 关闭)
│   ├── handle.json              (拖手柄，纯展示)
│   ├── title.json               (评论 (N)，纯展示)
│   └── close-btn.json
├── sort-tabs.json               (最新/最热)
├── comment-list/
│   ├── _block.json              (component: 评论列表容器)
│   └── items.json               (含子树：avatar+content+like+reply+expand-replies)
├── composer/
│   ├── _block.json              (底部固定输入区)
│   ├── text-input.json          (含 @ 触发)
│   ├── add-image-btn.json       (V1.x，MVP 隐藏)
│   ├── reply-cancel-btn.json    (replying 态显示)
│   └── send-btn.json
├── mention-picker/
│   ├── _block.json              (component: @ 好友选择)
│   └── items.json
└── empty-state/_block            (引用 overview.md)
```

通用组件：`ActionSheet`（长按菜单）、`ConfirmDialog`（删除）、`Toast`、`MediaPicker`（V1.x）、`EmptyState`

---

## 产品需求覆盖

- ✅ 规则 1 (≤200 字 + V1.x 1 张图) → 操作 #4/#7
- ✅ 规则 2 (二级评论 + 更深折叠) → 操作 #9 + `expand-replies-btn`
- ✅ 规则 3 (@ 仅好友) → 操作 #5/#6 + `mention-picker`
- ✅ 规则 4 (发布者删任意/评论者删自己) → 操作 #11/#12 条件分支
- ✅ 规则 5 (送审 + 违规撤回 + 通知) → state `error:review-pending` + `error:violation`
