# 01-publish-entry · 发布入口选择 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#b1-发布动态主线`
> **全局规范**：`interaction-design/overview.md`
> **形态**：从首页 fab 触发的半屏 sheet

---

## 状态机

### States

| State | 含义 |
|------|------|
| `visible` | 默认：两张大入口卡（发动态/埋胶囊）|
| `restricted:unverified` | 未认证/审核中 → 入口卡置灰 + tooltip |
| `restricted:roaming` | 跨校漫游 → 全屏 banner「请先回到主校园」+ 入口禁用 |
| `closing` | sheet 下滑关闭中 |

### Transitions

```
visible → closing:                  下滑 / 点蒙层 / 点关闭
visible → routed:                   点击入口卡（authorized 时）
restricted:* → visible:             权限改变后（仅离开当前 sheet 重新进时）
```

### Effects

| 转换 | UI |
|-----|----|
| 进入 | sheet 上滑 350ms + 蒙层 fade |
| → closing | sheet 下滑 250ms + 蒙层 fade-out |
| → restricted:unverified | 两卡片变灰 + tooltip「认证通过后即可发布」|
| → restricted:roaming | sheet 顶部 banner 提示，卡片完全禁用 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 关闭 sheet | click `mask` 或 下滑手势 / click `app-bar/close-btn` | — | sheet 下滑 250ms | — | — |
| 2 | 点击发动态卡片 | click `entry-cards/moment-btn` | non-restricted | press + 触觉 medium | push 01-publish-edit | restricted→tooltip + 触觉 error | — |
| 3 | 点击埋胶囊卡片 | click `entry-cards/capsule-btn` | non-restricted | press + 触觉 medium | push 03-publish-capsule | restricted→tooltip + 触觉 error | — |
| 4 | 查看认证状态 | tap on restricted tooltip | restricted:unverified | press | push 00-auth-status | — | — |

---

## 加载策略

无加载（纯交互页）。

---

## 错误处理

| 错误 | UI |
|------|----|
| 未认证 | 卡片置灰 + tooltip + 点击触觉 error + 引导跳认证状态 |
| 跨校漫游 | 全屏 banner + 「回主校园」按钮 |

---

## 边界情况

- 用户在 sheet 打开期间收到通知导致 verificationStatus 变化 → 实时更新（不强制刷新）
- sheet 打开后旋转屏幕（如平板）→ 重新计算高度
- 双击 fab 触发两次 → 仅显示一次 sheet（800ms 防抖）

---

## 节点骨架

```
01-publish-entry/
├── _page.json
├── mask.json                    (蒙层，click 关闭)
├── app-bar/
│   ├── _block.json              (sheet 顶部，含拖手柄+标题+关闭)
│   ├── handle.json              (拖手柄)
│   └── close-btn.json
├── restricted-banner.json       (restricted 时显示，含 click→跳认证)
└── entry-cards/
    ├── _block.json
    ├── moment-btn.json          (发动态 - M1)
    └── capsule-btn.json         (埋胶囊 - M3)
```

通用组件：`Toast`（tooltip 触发时）

---

## 产品需求覆盖

- ✅ 规则 1 (半屏 sheet + 半透明) → state 进入 Effect
- ✅ 规则 2 (两大卡片：发动态/埋胶囊) → `entry-cards` 两 element
- ✅ 规则 3 (未认证置灰 + tooltip) → state `restricted:unverified`
- ✅ 规则 4 (点空白/下拉关闭) → 操作 #1
- ✅ 规则 5 (漫游禁用 + 回主校园提示) → state `restricted:roaming`
