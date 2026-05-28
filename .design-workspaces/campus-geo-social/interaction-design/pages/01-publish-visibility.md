# 01-publish-visibility · 设置可见性 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#c2-业务规则`
> **全局规范**：`interaction-design/overview.md`
> **入口**：01-publish-edit → 可见性 row

---

## 状态机

### States

| State | 含义 |
|------|------|
| `visible:public` | 默认：公开 |
| `visible:friends` | 选「给好友」→ 必须再选投递目标 |
| `visible:capsule` | 选「胶囊」→ push 03-publish-capsule（本页流程结束） |
| `custom-duration:input` | 自定义时效输入中 |
| `unsaved-warn` | 退出时未保存提示（仅有变更时）|
| `saving` | 保存中（仅本地，不调接口）|
| `saved` | pop 回 edit |

### Transitions

```
visible:public ↔ visible:friends ↔ visible:capsule:    选不同卡片
visible:friends → routed (target-friends):              必须选目标好友
visible:capsule → routed (capsule-bury):                跳胶囊流程
visible:* → custom-duration:input:                       选「自定义」时效
custom-duration:input → visible:*:                        确认/取消
visible:* → saving → saved:                              点保存
* → unsaved-warn:                                          退出时有变更
```

### Effects

| 转换 | UI |
|-----|----|
| 选不同可见性卡片 | 卡片高亮 + 触觉 light + 下方动态显示对应详情区 |
| → visible:friends（无投递目标）| 卡片旁显示「请选择投递好友」红字 + 自动 push target-friends |
| → custom-duration:input | sheet 弹起天数输入器（1-365）|
| → saved | pop + Toast「已保存」（不显式提示，silently）|

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | 有变更→unsaved-warn；无变更→pop（不保存）| — | — |
| 2 | 取消 | click `app-bar/cancel-btn` | — | scale | 直接 pop 不保存 | — | — |
| 3 | 选择可见性 | click `visibility-cards/items` | — | 卡片高亮 + 触觉 light + 下方区域切换 | — | 选 capsule 直接跳走 |
| 4 | 选择投递好友 | click `friends-row` | visible:friends | press | push 01-publish-target-friends | — | 返回时回填头像气泡 |
| 5 | 移除某位投递目标 | click `friends-row/avatar-bubble/x` | 已选好友 ≥1 | 气泡 fade-out | — | 全部移除→显示「请选择」 |
| 6 | 选择时效预设 | click `duration-options/items` | — | 选中态 + 触觉 light | — | 永久/24h/7天 |
| 7 | 选择自定义时效 | click `duration-options/custom-item` | — | press | sheet 弹起输入器 | — | 1-365 天 |
| 8 | 输入自定义天数 | input `custom-duration-sheet/input` | custom-duration:input | label 上浮 | <1 或 >365→inline | 仅整数 |
| 9 | 确认自定义时效 | click `custom-duration-sheet/confirm-btn` | 输入合法 | 关 sheet + 显示在 duration-options | — | — |
| 10 | 切换匿名开关 | click `anonymous-toggle` | — | toggle 动画 + 触觉 light | — | 默认关；好友始终可见 |
| 11 | 切换跨校广场池 | click `cross-campus-toggle` | visible:public | toggle 动画 + 触觉 light | — | 仅 public 时可用，否则置灰 |
| 12 | 保存 | click `save-btn` | 校验通过（如选 friends 必须选目标）| press + 触觉 medium | saving → pop + 回填 edit | 校验失败→inline 提示 | — |
| 13 | 退出未保存确认 | unsaved-warn 内 click「确定退出」 | unsaved-warn | press | 不保存→pop | — | — |

---

## 加载策略

无加载（纯本地）。`saving` 仅是动画过渡。

---

## 错误处理

| 错误 | UI |
|------|----|
| 选 friends 但未选目标 | inline 红字「请选择至少 1 位投递好友」+ 「去选择」按钮 |
| 自定义时效输入非法 | inline 红字「天数 1-365」|
| 选 friends 但无好友（M6 通信） | empty-state 引导跳「02-fishing-cast 捞网认识朋友」|

---

## 边界情况

- 用户选 capsule 后跳走 → 回 edit 时 visibility row 显示「胶囊模式」
- 用户从 target-friends 选完返回但中途取消 → 视为未选投递目标 + 自动切回 public
- 时效设为 24h 但发布到投递时间已过 → 自动延长 1h（避免立刻消失）
- 修改已发布动态的可见性（V1.x） → 仅可见性可改，其他锁定

---

## 节点骨架

```
01-publish-visibility/
├── _page.json
├── app-bar/
│   ├── _component.json
│   ├── back-btn.json
│   └── cancel-btn.json          (右上取消)
├── visibility-cards/
│   ├── _component.json              (3 卡片容器)
│   └── items.json               (public/friends/capsule)
├── friends-row/
│   ├── _component.json              (visible:friends 时显示)
│   ├── select-trigger.json      (点击跳 target-friends)
│   └── avatar-bubbles.json      (已选好友头像气泡，含 x 移除)
├── duration-options/
│   ├── _component.json              (预设 4 项 + 自定义)
│   ├── items.json               (永久/24h/7天)
│   └── custom-item.json         (自定义按钮)
├── custom-duration-sheet/
│   ├── _component.json              (component sheet)
│   ├── input.json
│   └── confirm-btn.json
├── anonymous-toggle.json
├── cross-campus-toggle.json
└── save-btn.json
```

通用组件：`ConfirmDialog`、`Toast`、`Sheet`

---

## 产品需求覆盖

- ✅ 规则 1 (三种可见性卡片) → `visibility-cards`
- ✅ 规则 2 (friends 必选投递目标) → 操作 #4 + state `visible:friends`
- ✅ 规则 3 (时效预设 + 自定义最长 365) → 操作 #6-#9
- ✅ 规则 4 (匿名默认关 + 好友始终可见) → 操作 #10
- ✅ 规则 5 (跨校广场池仅 public) → 操作 #11 + 边界
- ✅ 规则 6 (保存后回 edit) → 操作 #12 → pop
