# 01-moment-detail · 动态详情 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#b2-浏览动态主线`
> **全局规范**：`interaction-design/overview.md`
> **特殊约束**：跨校漫游模式下底部互动栏置灰；动态被删/下架自动 pop

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading` | 拉取详情数据 |
| `visible` | 默认浏览 |
| `liking` | 点赞 API 中（防止抖动）|
| `comments-open` | 评论 sheet 弹起（实际是 push 01-comments 半屏）|
| `more-open` | 更多菜单 ActionSheet 弹起 |
| `deleted` | 动态已被作者删除/审核下架 → 自动 pop 上一页 |
| `roaming-mode` | 跨校漫游模式 → 顶部 banner「外校内容，仅可浏览」+ 底部互动栏置灰 |
| `error:not-found` | 详情接口 404 |

### Transitions

```
loading → visible:                 接口返回
visible → liking → visible:         点赞操作（乐观更新）
visible → comments-open:            点评论按钮 / 双击评论数
visible → more-open:                点更多按钮
visible → deleted → pop:            轮询发现被删除（200ms 延迟 + L4 Modal 提示）
visible → routed:                   点作者→push 05-user-profile / 点地点→push 03-pick-location 查看
```

### Effects

| 转换 | UI |
|-----|----|
| → loading | skeleton 详情骨架 |
| → liking | 心形 scale 1→1.3→1 + 红色填充 + 触觉 light + 计数 +1（乐观） |
| → comments-open | sheet 上滑（01-comments）|
| → more-open | ActionSheet 上滑 |
| → deleted | L4 Modal「该动态已不可见」+ 单按钮「确定」→ pop |
| → roaming-mode | 顶部 banner 下滑入 + 互动栏置灰 + 不可点 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | pop | — | 滑动右滑返回手势同效 |
| 2 | 媒体轮播切换 | swipe horizontal `media-carousel` | visible | 实时跟手 + 指示器变化 | — | 视频自动播放 + 静音 |
| 3 | 双击点赞（媒体）| double-tap `media-carousel` | visible | 心形浮现+1s 消失 + 触觉 light + 调 like API | 漫游模式 disabled | 未认证→引导认证 |
| 4 | 长按图片 | long-press `media-carousel` | visible | ActionSheet：保存到相册/识别/查看原图 | — | 视频长按 = 倍速 |
| 5 | 点击作者卡片 | click `author-card` | visible | press | push 05-user-profile?userId={{author.id}} | 漫游模式禁用 |
| 6 | 点击关注/取关 | click `author-card/follow-btn` | visible | toggle 状态 + 乐观更新 | 失败→回滚 | 漫游模式禁用 |
| 7 | 点击地点 | click `location-card` | visible | press | sheet 弹起地点详情（mini map + 导航/复制坐标）| 漫游模式仅展示不可点 |
| 8 | 点击路过统计 | click `passers-stat-btn` | visible | sheet 弹起路过历史（不显示具体身份）| — | 仅作者本人可见时显示「X 个路人路过」否则隐藏 |
| 9 | 点赞 | click `action-bar/like-btn` | visible，非 roaming | 心形 scale + 触觉 light + 计数变化（乐观）| 失败→回滚+Toast | 已赞 → 取消赞 |
| 10 | 评论按钮 | click `action-bar/comment-btn` | visible，非 roaming | press | push 01-comments?momentId={{id}} | 漫游禁用 |
| 11 | 分享 | click `action-bar/share-btn` | visible | press | ActionSheet：好友/复制链接/微信/QQ | 漫游模式仅复制链接可用 |
| 12 | 更多菜单 | click `action-bar/more-btn` | visible | press | ActionSheet 上滑 | — | 作者本人显示「删除」「编辑」；他人显示「举报」「屏蔽该作者」「复制链接」 |
| 13 | more-menu 选项 | click `more-menu/items` | more-open | press → 执行对应动作 | 各自处理（举报→push 09-report；删除→L4 Confirm；屏蔽→Toast 确认）| — |
| 14 | 拉黑/屏蔽该作者 | click `more-menu/block-item` | 他人动态 | L4 Modal 二次确认 | 调 M6 block API | 漫游禁用 |
| 15 | 编辑动态（作者本人）| click `more-menu/edit-item` | 作者本人 | press | push 01-publish-edit?id={{id}}&mode=edit | — | 已审核通过的动态编辑后重新进审核 |

---

## 加载策略

- 进入页：skeleton 详情骨架（顶部媒体框 + 文字行 + 按钮行）
- 媒体加载：媒体框内 spinner（首屏图先用缩略图模糊预览）
- 评论数 / 路过数：异步并行拉取，先显示 `--` 占位
- 点赞/关注：乐观更新（按钮立即响应）

---

## 错误处理

| 错误 | UI |
|------|----|
| 详情 404 | 全屏 ErrorState「该动态已不存在」+ 「返回」按钮 |
| 媒体加载失败 | 媒体框占位 + 「点击重试」 |
| 点赞失败 | 状态回滚 + Toast「网络异常」 |
| 评论失败 | sheet 内 inline + 按钮恢复 |
| 网络断开 | 顶部 banner |

---

## 边界情况

- 进入时动态状态为 `reviewing`（仅作者本人可见）→ 顶部 banner「审核中，仅你可见」
- 动态状态为 `rejected` → 顶部 banner「审核未通过：{{reason}}」+ 「修改重发」按钮
- 长视频 → 进入时自动播放 + 静音 + 顶部声音按钮可手动开
- 滑动顶部下拉手势 → 不触发刷新（避免冲突），仅 pop 手势
- 用户在浏览过程中接到推送（如有人评论了该动态）→ inline Toast 提示「有新评论」
- 双击点赞但用户已经赞过 → 不重复 +1，仅触觉反馈
- 跨校漫游进入详情：进入瞬间检测，若 visibility=friend → 跳出 L4 Modal「无权查看」并 pop

---

## 节点骨架

```
01-moment-detail/
├── _page.json
├── app-bar/
│   ├── _block.json              (透明/半透明，滚动后变实)
│   ├── back-btn.json
│   └── share-shortcut-btn.json  (顶部右上的分享快捷入口)
├── roaming-banner.json          (引用 overview.md#八-全局-banner)
├── media-carousel/
│   ├── _block.json              (component: 媒体轮播容器)
│   └── slides.json              (单帧媒体，含 double-tap/long-press)
├── author-card/
│   ├── _block.json
│   ├── avatar.json              (click trigger 跳 user-profile)
│   └── follow-btn.json
├── text-content.json            (文字 + 标签 + emoji，长文「展开/收起」)
├── tag-row.json                 (标签气泡组，click trigger 跳标签聚合页 V1.x)
├── location-card/
│   ├── _block.json              (mini map + 地名 + 距离)
│   └── view-detail-btn.json     (查看地点详情)
├── passers-stat-btn.json        (路过统计入口)
├── action-bar/
│   ├── _block.json              (底部固定，含点赞/评论/分享/更多)
│   ├── like-btn.json
│   ├── comment-btn.json
│   ├── share-btn.json
│   └── more-btn.json
└── more-menu/
    ├── _block.json              (component: ActionSheet)
    └── items.json               (作者/路人差异化的菜单项)
```

通用组件：`ActionSheet`、`ConfirmDialog`、`Toast`、`ErrorState`

---

## 产品需求覆盖

- ✅ 规则 1 (顶部沉浸式媒体) → `media-carousel`
- ✅ 规则 2 (作者卡+文字+地点+路过) → 多个 block/element
- ✅ 规则 3 (底部互动栏 + 漫游置灰) → `action-bar` + state `roaming-mode`
- ✅ 规则 4 (评论时间倒序+二级缩进 + 删除规则) → 01-comments 子页面
- ✅ 规则 5 (漫游模式顶部明示) → `roaming-banner`
- ✅ 规则 6 (被删除/下架自动返回) → state `deleted` Effect
- ✅ 规则 7 (更多菜单含举报/复制/屏蔽) → `more-menu` 项
