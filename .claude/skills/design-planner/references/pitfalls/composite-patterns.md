# 陷阱清单：业务复合控件必备视觉态（v3 新增）

> 适用任务：所有 `D-X-craft-*`、`D-X-states-business`
>
> **核心**：以下控件不是"一个 div + 一段 styles"，而是**多元素 + 必须有 active/selected/expanded 等业务态视觉**——少一个态 = 用户看不出当前状态。
>
> 设计前必读：本屏每出现一种复合控件 → 查本表 → 落 wrapper 子树 + visualStates。

---

## 1. Tab / Segment ★（登录页 ModeToggle 示例）

**典型场景**：验证码登录 / 密码登录切换、商品详情多 tab、导航 segment。

**节点结构**：
```
TabContainer (div, gap, borderBottom 可选)
├── TabBtn[N] (button)
│   styles: 字色 textSecondary / 字重 500 / paddingY xs / 透明背景
│   visualStates:
│     - active (activeWhen: state.view.activeTab === 'X')
│         styles: { color: primary, fontWeight: 700 }
│         OR + 子节点 indicator 显示
│     - hover / pressed / focus / disabled
└── TabIndicator (div, optional, 移动下划线指示条)
    styles: position: absolute / bottom: 0 / height: 2px / background: primary
    transform: translateX 跟随 active tab 索引（用 state.view 算 transform 值）
```

**必备视觉态**（最低 ≥ 2 个区分 active / inactive）：
- ✅ active 字色 = primary，inactive 字色 = textSecondary
- ✅ active 字重 ≥ 600，inactive 字重 ≤ 500
- ✅ + 任选一项强化：下划线 / 底色 / 移动指示条

**禁止**：
- ❌ 容器写静态 borderBottom，子 tab 字色完全相同（登录页当前问题）
- ❌ 仅靠 hover 区分 active

---

## 2. Stepper ★

**典型场景**：注册多步、订单进度。

**节点结构**：
```
StepperContainer (div, flex row, gap)
├── StepItem[N]
│   ├── StepCircle (div, 28x28 圆) — 显示步骤号或勾
│   ├── StepLabel  (div) — 步骤文案
│   └── StepConnector (div, height 2px, flex:1) — 连接线（最后一步无）
│   visualStates:
│     - completed (activeWhen: index < state.view.currentStep)
│         circle: bg primary + 显示勾 / connector: bg primary
│     - current (activeWhen: index === state.view.currentStep)
│         circle: 边框 primary + bg surface + 字色 primary / connector: 灰
│     - upcoming (默认)
│         circle: 边框 borderLight + bg surface + 字色 textTertiary / connector: 灰
```

**必备视觉态**：3 态（completed / current / upcoming）必须**色 + 形** 双重区分。

**禁止**：仅用字色区分；当前步无任何视觉强化。

---

## 3. Accordion / Collapse

**典型场景**：FAQ、设置展开项。

**节点结构**：
```
AccordionItem (div)
├── AccordionHeader (button, role=button)
│   ├── HeaderTitle (div)
│   └── ChevronIcon (div, transform rotate)
└── AccordionPanel (div, height 动画)
    visibleWhen: state.view.expandedKey === item.key
```

**必备视觉态**：
- ✅ 收起：chevron 朝下，panel 隐藏
- ✅ 展开：chevron 旋转 180°，panel 滑出（height: auto + transition）
- ✅ hover header 有反馈

---

## 4. Pagination

**节点结构**：每页码一个 button + active 高亮 + 上一页/下一页按钮 + ellipsis 间隔。

**必备视觉态**：
- ✅ active 页 = 主色填充 + 白字
- ✅ inactive = 边框 + textSecondary 字
- ✅ disabled（首页时上一页禁用、尾页时下一页禁用）= opacity 0.5 + cursor not-allowed

---

## 5. Breadcrumb

**节点结构**：text + separator (`/` 或 `›`) + text + ...

**必备视觉态**：
- ✅ 当前页（最后一项）= textPrimary，无下划线
- ✅ 链接项（前面所有）= textSecondary + hover textPrimary
- ✅ separator = textTertiary

---

## 6. Toast / Snackbar

**节点结构**：固定位置容器 + icon + 文字 + close button（可选）。

**必备视觉态**（按语义）：
- ✅ success = bg successLight + border success + icon ✓
- ✅ error   = bg errorLight   + border error   + icon ⚠️
- ✅ warning = bg warningLight + border warning + icon ⚠️
- ✅ info    = bg primaryLight + border primary + icon i

**进出动效**：transform translateY + opacity，duration 300ms ease-out。

---

## 7. Drawer / Sheet / Modal

**节点结构**：`screen.overlays` 项，含 backdrop + 主体。

**必备视觉态**：
- ✅ 进出动效：modal scale + opacity；drawer translateX/Y；sheet translateY
- ✅ backdrop = rgba(0,0,0,0.4) + click 关闭事件
- ✅ 内容区 safe-area 兼容（顶部 + 底部 inset）

---

## 8. Empty / Skeleton / Error

**典型场景**：列表无数据、加载中、加载失败。

interaction 阶段已建对应衍生视图节点（emptyView/loadingView/errorView）—— design 阶段必须给视觉规格：

| 视图 | 必备元素 |
|---|---|
| Empty | 插画/icon ≥ 80px + 标题 + 副标题（可选）+ 引导 CTA（可选）|
| Skeleton | 占位条形/卡片，结构与最终内容一致；shimmer 动画 |
| Error | 错误 icon + 标题（明确错误类型）+ 重试按钮 |

---

## 9. Switch / Toggle

**节点结构**：track（外壳）+ thumb（圆点）。

**必备视觉态**：
- ✅ unchecked: track 灰 + thumb 在左
- ✅ checked: track primary + thumb 在右（transform translateX）
- ✅ disabled: opacity 0.5

**禁止**：用 native checkbox + accentColor —— 视觉太弱。Switch 必须自绘。

---

## 10. Avatar / AvatarGroup

**节点结构**：圆形 + img / 占位字 + status dot（可选）。

**必备视觉态**：
- ✅ 有头像：display img
- ✅ 无头像：fallback 显示首字母 + 背景色（用 hash 算法选）
- ✅ AvatarGroup：负 margin 重叠

---

## 11. 设计阶段判定流程

```
扫本屏 interaction 阶段写的 state.view 字段：
  - activeTab / activeMode / currentStep → 涉及 Tab / Stepper
  - expandedKey / collapsedKey → 涉及 Accordion
  - selectedKey / selectedIds → 涉及 List item / Card selection
  - currentPage → 涉及 Pagination
  - drawerOpen / modalOpen / sheetOpen → 涉及 Drawer / Modal / Sheet
  - toasts / messages → 涉及 Toast

扫到 → 在 D-X-craft-* 任务里：
  1. 落本表对应节点结构（element/add 必要的视觉容器）
  2. 落 visualStates 矩阵（业务态 activeWhen 表达式）
  3. 在 budget 表标 minSignals + workaroundPattern (composite)
```

---

## 12. md 落地（在 D-X-states-business 任务中）

```markdown
## 业务复合控件落库（D-X-states-business）

### 1. 扫描 state.view 字段映射
| state.view 字段 | 类型 | 涉及控件 | 节点 ID | 复合 pattern |
|---|---|---|---|---|
| activeMode | "code"\|"password" | Tab/Segment | ModeToggle | tab |
| policyAccepted | bool | Checkbox | PolicyCheckbox | wrapper-label |
| codeCountdown | number | Timer Button | GetCodeBtn | counting state |

### 2. 各控件 visualStates 落地
[每个控件按本表对应节落 schema 调用]

### 3. ★ 沉淀到 schema 的结论
[visual_state/add 调用清单 + 必要时 element/wrap 调整结构]
```

---

## 13. 红线

- ❌ Tab/Segment 容器写 borderBottom 但子节点字色一样 → 没 active 视觉 → R-RECOG-01
- ❌ Stepper 三态混用单一颜色 → 看不出当前在第几步
- ❌ Switch 用 native checkbox 实现 → 视觉太弱不像 Switch
- ❌ Pagination 当前页与其他页区分 < 2 信号
- ❌ Toast 四语义全用同色 → 用户分不清成功/错误
- ❌ Modal 无进出动效 → 体验生硬
- ❌ 扫到 state.view 业务字段但没落对应控件视觉态 → 业务态不可见
