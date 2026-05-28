# 00-profile-init · 完善基础资料 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#b1-注册主线-happy-path`（最后一步）
> **全局规范**：`interaction-design/overview.md`
> **激励**：全部完成赠送 50 积分（与 M7 联动）

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle` | 默认空表单 |
| `uploading-avatar` | 头像上传中 |
| `nickname-checking` | 昵称唯一性 debounce 异步校验 |
| `nickname-conflict` | 昵称重复，建议后缀 |
| `submitting` | 提交资料 |
| `success:full` | 全部完成 → 赠送 50 积分动画 → 跳主页 |
| `success:partial` | 跳过部分 → 直接跳主页（24h 后通知提醒）|
| `error` | 字段不符或网络错 |

### Transitions

```
idle → uploading-avatar:        点击头像 + 选好图片
uploading-avatar → idle:         上传完成或失败
idle → nickname-checking:        昵称 onBlur (≥2 字)
nickname-checking → idle:         可用
nickname-checking → nickname-conflict: 占用
idle → submitting:               点击完成
submitting → success:full:        头像/昵称都填 + 性别/简介至少一项
submitting → success:partial:     仅头像+昵称（必填）
submitting → error:               校验失败
success:full → routed:           50 积分飞入 + 触觉 success + 1.5s 跳 01-home-map
success:partial → routed:        直接跳 01-home-map
```

### Effects

| 转换 | UI |
|-----|----|
| → uploading-avatar | 头像占位显示 spinner + 进度环 |
| → nickname-conflict | 输入框下方 inline 红字 + 「试试 张三01 / 张三_2026」可点击建议 |
| → success:full | 全屏遮罩 + 「+50 积分」金币飞入右上钱包动画 + 烟花 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 点击头像 | click `avatar-picker` | — | press + 触觉 light | 唤起 MediaPicker → 选图 → uploading | 上传失败→Toast + 占位恢复 | jpg/png ≤5MB |
| 2 | 输入昵称 | input `form-card/nickname-input` | — | label 上浮 | onBlur 异步校验 | 占用→inline + 建议 | 2-16 字符 |
| 3 | 选建议昵称 | click `nickname-suggestion` | nickname-conflict | press | 填入输入框 + 再次校验 | — | — |
| 4 | 选择性别 | click `form-card/gender-picker` | — | 选项 scale + 触觉 light | — | — | 可不选（默认 unknown）|
| 5 | 输入简介 | input `form-card/bio-input` | — | 字符计数 N/100 | 超 100 字→拒绝输入 | — | 可不填 |
| 6 | 点击跳过 | click `app-bar/skip-btn` | 头像已传 + 昵称已填 | press | L2 Confirm「跳过将无 50 积分奖励，确认?」 | 确认→success:partial | 必填项未填→跳过按钮置灰 |
| 7 | 点击完成 | click `submit-btn` | 必填项填好 | press + 触觉 medium | submitting | 校验失败→inline + 聚焦错字段 | 800ms 防抖 |
| 8 | 查看学信网信息 | click `xuexin-info-card` | — | press | 展开/收起院系/年级展示（仅展示不可编辑）| — | — |

---

## 加载策略

- 头像上传：进度环（按钮内）
- 昵称校验：debounce 500ms + 输入框右侧 spinner
- 提交：按钮 spinner + 表单禁用

---

## 错误处理

| 错误 | UI |
|------|----|
| 头像超大 / 格式错 | Toast + 占位恢复 |
| 头像审核失败 (M9) | Toast「头像未通过审核，请更换」+ 占位 |
| 昵称占用 | inline + 3 个建议 |
| 昵称含敏感词 | inline「含违规词，请修改」 |
| 提交失败 | Toast + 按钮恢复 + 保留输入 |
| 网络断开 | 头像保留本地，恢复后自动重传 |

---

## 边界情况

- 用户拒绝授权头像（相册权限）→ 提供默认 6 个治愈风插画头像可选
- 24h 后未完善 → M8 推送提醒「完善资料领 50 积分」
- 昵称含 emoji → 拒绝输入并提示
- 同时编辑头像 + 昵称中点击完成 → 等头像上传完再提交
- 已认证用户从 11-profile-edit 重新进入本页（V1.x） → 复用，不送积分

---

## 节点骨架

```
00-profile-init/
├── _page.json
├── app-bar/
│   ├── _block.json
│   └── skip-btn.json
├── progress-indicator.json     (进度，纯展示)
├── avatar-picker.json          (头像选择器，click trigger)
├── form-card/
│   ├── _block.json
│   ├── nickname-input.json     (含 nickname-suggestion 子元素)
│   ├── nickname-suggestion.json(冲突时显示，click trigger)
│   ├── gender-picker.json      (3 选 1 单选)
│   └── bio-input.json          (textarea + 计数)
├── xuexin-info-card/
│   ├── _block.json             (展示学信网拉取的院系/年级，可展开收起)
│   └── toggle-btn.json
└── submit-btn.json
```

通用组件：`MediaPicker`、`ConfirmDialog`、`Toast`

---

## 产品需求覆盖

- ✅ 规则 1 (头像必填 + 昵称必填唯一 + 其他可选) → 操作 #1/#2 + skip-btn 条件
- ✅ 规则 2 (跳过 24h 后通知提醒) → 操作 #6
- ✅ 规则 3 (全部完成 +50 积分 + 新手任务达成) → success:full Effect
- ✅ 规则 4 (院系/年级不可编辑) → `xuexin-info-card` 仅展示
- ✅ 规则 5 (完成跳 01-home-map) → success → routed
