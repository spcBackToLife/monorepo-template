# 00-auth-school-select · 选择学校 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#b1-注册主线-happy-path`
> **全局规范**：`interaction-design/overview.md`
> **作用**：决定后续学信网授权 + GPS 主校园归属

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle:default` | 默认：展示热门高校 + 历史选择（如有）|
| `searching` | 输入框非空，debounce 300ms 后请求 |
| `results-shown` | 有搜索结果 |
| `empty` | 无搜索结果 |
| `campus-pick` | 已选定学校，弹出校区 sheet（多校区学校）|
| `submitting` | 上传选定结果 |
| `success` | 跳 00-auth-id-card |
| `not-found-submitting` | 提交"找不到我的学校"申诉表 |

### Transitions

```
idle:default → searching:        input 非空
searching → results-shown:       API 返回 ≥1
searching → empty:               API 返回 0
results-shown ↔ searching:       输入框继续变化
empty/results-shown → campus-pick:  click 学校项（含 ≥2 校区）
empty/results-shown → submitting:   click 学校项（仅 1 校区）
campus-pick → submitting:        sheet 内点确认
submitting → success:            API 200
empty → not-found-submitting:    点击「找不到我的学校」+ sheet 填申诉表 + 提交
not-found-submitting → idle:default:  Toast「已提交申诉，48h 内回复」
```

### Effects

| 转换 | UI |
|-----|----|
| → searching | 列表区显示 SkeletonLine ×6 |
| → results-shown | Skeleton fade-out + 结果项 stagger 淡入 |
| → empty | 显示「无匹配 + 申请录入」入口（不显示热门）|
| → campus-pick | sheet 上滑 350ms + 蒙层 fade |
| → success | 触觉 medium + 跳 00-auth-id-card |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | pop（注册流回上一步）| — | 警告将丢失认证进度 |
| 2 | 输入搜索 | input `search-input` | — | 300ms debounce 后 → searching | 接口失败→Toast + 列表保留 | 拼音/简称/全称都支持 |
| 3 | 点击热门学校 | click `hot-list/items` | idle:default | item press 态 | 同 #4 选定流程 | — | — |
| 4 | 点击搜索结果 | click `result-list/items` | results-shown | item press 态 | 单校区 → submitting；多校区 → campus-pick | 网络错→Toast + 按钮恢复 | 防止重复点击多个项 |
| 5 | 选择校区 | click `campus-sheet/items` | campus-pick | item press + 触觉 light | 关闭 sheet + submitting | — | 单校区学校跳过此步 |
| 6 | sheet 内确认 | click `campus-sheet/confirm-btn` | sheet 选中某项 | press | 关闭 sheet + submitting | — | 未选中时按钮置灰 |
| 7 | 关闭校区 sheet | click `campus-sheet/mask` 或 下滑手势 | campus-pick | sheet 下滑 250ms | 回 results-shown | — | — |
| 8 | 找不到我的学校 | click `not-found-link` | empty | press | sheet 弹起申诉表（学校名/省市/补充材料）| — | 提交后 48h 内人工录入 |
| 9 | 提交申诉表 | click `appeal-sheet/submit-btn` | 表单填完 | press | Toast + 关 sheet 回 idle:default | inline 红字 | 同一手机号 24h 限 3 次申诉 |

---

## 加载策略

- 首次进入：本地缓存热门 → 后台并行拉取最新（静默替换）
- 搜索：debounce 300ms + 按钮内 spinner
- 选定提交：按钮 spinner（L3）

---

## 错误处理

| 错误 | UI |
|------|----|
| 搜索接口失败 | 列表保留 + Toast「搜索失败」|
| 申诉表单字段不全 | inline + 按钮置灰 |
| 选定提交失败 | Toast + 按钮恢复 |

---

## 边界情况

- 已认证后改主校园（保研/换校场景）→ 进本页时 banner 提示「将重走学信网授权」
- 校区 sheet 仅 1 个校区 → 跳过自动 submit
- 学校在合并状态（merged） → 列表项显示「已合并到 XXX」+ 强制选合并后
- 网络慢导致搜索过期 → 用户已切换关键词，丢弃旧结果

---

## 节点骨架

```
00-auth-school-select/
├── _page.json
├── app-bar/
│   ├── _block.json             (内含 progress-indicator 步骤展示，纯展示)
│   └── back-btn.json
├── search-input.json
├── hot-list/
│   ├── _block.json
│   └── items.json              (热门学校列表，click trigger)
├── result-list/
│   ├── _block.json
│   └── items.json              (搜索结果列表，click trigger)
├── empty-state/_block          (no-result 时显示，含 not-found-link)
├── not-found-link.json
├── campus-sheet/
│   ├── _block.json             (component sheet)
│   ├── mask.json
│   ├── items.json              (校区项列表)
│   └── confirm-btn.json
└── appeal-sheet/
    ├── _block.json             (找不到学校的申诉表 sheet)
    ├── form-fields.json        (统一字段 element，含 input/select)
    └── submit-btn.json
```

通用组件：`Toast`、`EmptyState`（应用 #无搜索结果 variant）

---

## 产品需求覆盖

- ✅ 规则 1 (拼音/简称模糊 + 热度地理排序) → 操作 #2 后端策略
- ✅ 规则 2 (顶部热门 + 用户所在地) → `hot-list`
- ✅ 规则 3 (找不到学校申诉) → 操作 #8/#9 + `appeal-sheet`
- ✅ 规则 4 (多校区必须选校区) → state `campus-pick` + 操作 #5/#6
- ✅ 规则 5 (决定后续学信网 + GPS) → success → 跳 auth-id-card 携带 schoolId+campusId
