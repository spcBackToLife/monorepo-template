# Phase 4: 完整性验证清单

> 信息零丢失的最后防线。确保从交互文档到设计文档的信息传递完整，executor 拿到文档后能无歧义地实现每个节点。

## Step 4.1: 交互状态全覆盖验证（最关键！）

**规则**: index.md §6(状态矩阵) 中列出的每个非基准状态，必须在 §8(节点树) 中有对应的 DOM 结构。

**验证方法**:
```
遍历 §6 的每一行状态 → 问: "这个状态需要什么特殊UI？"
→ 如果需要弹窗 → 节点树中必须有该弹窗的完整子树
→ 如果需要覆盖层 → 节点树中必须有 overlay 节点
→ 如果需要替换内容 → 节点树中必须有替代节点 + visibleWhen
```

**示例(捞人页面)**:
```
状态矩阵列出9个状态:
- idle ← 基准(节点树主结构)
- casting ← FAB文字变化(用 visual_state 解决，不需新节点)
- result ← 需要 fishing-card 区域(节点树必须有)
- empty_result ← 需要空态文案(节点树必须有)
- exhausted ← 需要弹窗提示(节点树必须有 exhausted-sheet 完整子树)
- greeting ← 需要 GreetingSheet(节点树必须有完整子树)
- onboarding ← 需要引导浮层(节点树必须有 onboarding-overlay)
- no_location ← 需要权限提示(节点树必须有)
- out_of_campus ← 需要范围提示(节点树必须有)

→ 逐个检查，缺失的必须补写节点结构到 §8
```

## Step 4.2: 组件内联展开验证

**规则**: 节点树中标注 [组件:X] 的位置，必须内联展开该组件的第一层子节点结构。不可只写一句 [组件:X] 占位。

**格式要求**:
```
❌ 错误(信息丢失):
  └── visibility-sheet [组件:VisibilitySheet]

✅ 正确(完整展开):
  └── visibility-sheet [组件:VisibilitySheet] [visibleWhen:sheetVisible]
      (position:fixed, bottom:0, bg:Layer3, radius:24px 24px 0 0, 毛玻璃)
      ├── drag-bar (w:36, h:4, bg:text-tertiary, radius-full, mx:auto)
      ├── title (heading-md) "选择谁能看到"
      ├── options-list (flex-col, gap:0)
      │   ├── option-public (h:64, flex-row, align:center, gap:12, padding:0 20px)
      │   │   ├── radio (18×18, border:1.5px, radius-full)
      │   │   ├── icon-div (20×20) [素材:I-07]
      │   │   └── text-group: "公开" + "任何人走到这里都能看到"
      │   ├── option-targeted (同结构) [素材:I-08]
      │   └── option-timed (同结构) [素材:I-09]
      └── confirm-btn [组件:GlowButton] "确认"
```

## Step 4.3: 节点→样式完整性验证

**规则**: §8 节点树中的每个节点，必须能在 §3(区块详细设计) 中找到对应的样式规格。

**验证方法**:
```
逐行扫描 §8 的节点 → 在 §3 的表格中查找 → 确认有完整的样式值
缺失的必须补写到 §3
```

**特别注意**:
- 文字节点必须有 color（暗色背景上不设颜色=不可见）
- flex 容器必须有 flexDirection
- 装饰节点必须有 position + top/left/width/height
- 条件显示节点必须有 visibleWhen 表达式

## Step 4.4: 素材+内容覆盖验证

1. **素材覆盖**:
   - 遍历 §8 所有 [素材:X] 标注 → 确认 materials/ 有对应 .md
   - 遍历 Tab/NavBar 图标 → 确认有素材方案

2. **内容覆盖**:
   - span/p → 必须有 textContent 值或数据绑定表达式
   - img → 必须有 src 或占位方案
   - icon-div → 必须有素材引用或 CSS 实现说明

3. **装饰覆盖**:
   - visual.md 装饰策略表的每个装饰 → §8 中必须有对应节点

## Step 4.5: 数据/事件完整性验证

1. 对照交互文档的事件列表 → §7 必须有对应的事件定义
2. §6 状态矩阵引用的每个变量 → §7 stateInit 中必须有定义
3. §7 事件流中引用的每个 effect.fetch → §7 数据源定义中必须有

---

**不通过任何一项 → 回到 Phase 2 补写缺失内容**
**全部通过 → 设计文档完成，可交付给 executor**
