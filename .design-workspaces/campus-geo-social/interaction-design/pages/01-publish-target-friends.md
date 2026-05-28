# 01-publish-target-friends · 选择投递好友 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#c2-业务规则`
> **全局规范**：`interaction-design/overview.md`
> **入口**：01-publish-visibility → 「给好友」→ 选投递目标

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading` | 拉取好友列表 |
| `visible` | 默认按字母索引 + 顶部已选气泡 |
| `searching` | 搜索框非空，过滤显示 |
| `empty:no-friends` | 该用户 0 好友 → 引导去 02-fishing-cast |
| `empty:no-results` | 搜索无结果 |
| `confirming` | 点确认按钮，校验中 |

### Transitions

```
loading → visible/empty:no-friends:    接口返回
visible → searching:                   搜索框输入
searching → visible:                   清空搜索框
visible/searching → confirming:        点确认（已选 ≥1）
confirming → routed:                   pop 回 visibility（带 friends 列表）
empty:no-friends → routed (fishing):   点 CTA 跳捞网
```

### Effects

| 转换 | UI |
|-----|----|
| → loading | skeleton 列表行 ×10 |
| 选/取消选好友 | item 复选框 + 头像勾选标记 + 顶部气泡同步 + 触觉 light |
| 顶部气泡满 (>5) | 滚动条出现 |
| → empty:no-friends | 治愈插画 + CTA「去捞网认识朋友」 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回/取消 | click `app-bar/back-btn` 或 cancel-btn | — | scale | pop（已选不保存）| — | — |
| 2 | 输入搜索 | input `search-input` | — | label 上浮 + 200ms debounce | — | 拼音/昵称/备注名匹配 |
| 3 | 字母索引跳转 | tap `letter-index/items` | visible | 触觉 light + scroll-to-letter | — | 长按 + drag 滑动连续跳转 |
| 4 | 切换选中好友 | click `friends-list/items` | — | item 行 press + 复选框 toggle + 头像勾选 + 触觉 light | — | 单击不导航 |
| 5 | 移除已选好友 | click `selected-bubbles/items/x` | 已选 ≥1 | bubble fade-out + 同步取消列表勾选 | — | — |
| 6 | 完成 | click `confirm-btn` | 已选 ≥1 | press + 触觉 medium | confirming → pop 携带 friends[] | 0 选→按钮置灰 + 提示 | 800ms 防抖 |
| 7 | 全选当前可见 | click `top-bar/select-all-btn` | searching 中显示 | press | 当前过滤结果全选 | — | 上限 50 人 |
| 8 | 去捞网（空状态）| click `empty-state/cast-net-btn` | empty:no-friends | press | push 02-fishing-cast | — | — |
| 9 | 清空搜索 | click `search-input/clear-btn` | searching | press | input 清空 + 回 visible | — | — |

---

## 加载策略

- 首屏：skeleton 列表行 ×10
- 搜索：debounce 200ms（本地过滤为主，仅备注名搜索 + 服务端）
- 确认：按钮 spinner（极快，几乎瞬间 pop）

---

## 错误处理

| 错误 | UI |
|------|----|
| 拉取好友列表失败 | 全屏 ErrorState「加载失败」+ 重试 |
| 部分好友已被删除（如用户在 settle 期间）| 列表自动剔除 + Toast 提示「N 位好友已不可投递」 |
| 选择超过 50 人 | Toast「最多选择 50 人」 |

---

## 边界情况

- 已选好友若在浏览期间被对方解除好友 → pop 前再次校验 → 自动剔除 + Toast
- 字母索引区在 iPhone 小屏不显示，改为顶部 dropdown
- 列表中"特别关注"好友置顶展示（V1.x）
- 用户长按某好友 → 不弹菜单（避免与多选冲突）
- 选定全部好友的极端情况（>20）→ 顶部气泡折叠为「+N」可点击展开

---

## 节点骨架

```
01-publish-target-friends/
├── _page.json
├── app-bar/
│   ├── _block.json
│   ├── back-btn.json
│   └── cancel-btn.json
├── selected-bubbles/
│   ├── _block.json              (顶部已选气泡区，可横向滚动)
│   └── items.json               (含 x 移除)
├── search-input.json
├── top-bar/
│   ├── _block.json              (search 之下的副 bar)
│   └── select-all-btn.json      (searching 时显示)
├── friends-list/
│   ├── _block.json              (component: 列表容器)
│   └── items.json               (好友行，含 click toggle)
├── letter-index/
│   ├── _block.json              (右侧字母索引)
│   └── items.json               (字母项，tap+drag)
├── confirm-btn.json
└── empty-state/
    ├── _block.json              (引用 overview.md)
    └── cast-net-btn.json
```

通用组件：`Toast`、`EmptyState`、`ErrorState`

---

## 产品需求覆盖

- ✅ 规则 1 (字母索引 + 搜索) → `letter-index` + `search-input`
- ✅ 规则 2 (至少 1 人才能继续) → 操作 #6 + 按钮置灰
- ✅ 规则 3 (顶部头像气泡 + 移除) → `selected-bubbles` + 操作 #5
- ✅ 规则 4 (0 好友引导捞网) → state `empty:no-friends` + 操作 #8
- ✅ 规则 5 (回填 edit) → 操作 #6 pop 携带参数
