# 方法论 2：截图核对 5 维度

> 适用任务：`E-X-snapshot`、`E-global-snapshot`、`E-cross-screen-snapshot`
> 视觉验证不是"看起来 OK"——必须 5 维度逐项对照 design 阶段的 summary / palette / componentBudgets。

## 0. 核对原则

```
✅ 逐项对照 design summary 的具体描述
✅ 用客观词描述观察到的视觉（"粉色饱和度约 90%"，不是"看起来粉粉的"）
✅ 不一致项必须列出 → 决定修 / 退回 / 接受
❌ "整体看起来不错" → 不算核对
❌ 截图后直接标 done → 跳过验证
```

## 1. 维度 1：整体视觉氛围

对照 `screen.meta.design.summary`，回答：

```
设计意图（来自 summary）：___________
   例："暖白底 + 顶部粉色渐变氛围 + 角落装饰 + 居中品牌 + 表单卡 + 药丸 CTA"

实际渲染观察：___________
   例："底色暖白（接近 #FFF8F5），顶部确实有渐变氛围，
        粉色光晕在右上角溢出（占屏 15%），左下角薄荷叶清晰，
        BrandLogo 居中（约屏幅中线），FormCard 圆角明显（约 16px），
        SubmitBtn 圆角 full（药丸形状），粉色填充。"

是否一致：✅ / ❌
不一致点：___________
```

**如不一致**：
- 偏差 < 5%（如饱和度差 5%）→ 接受 / 在 md 备注
- 偏差 5-15% → 调整素材或 styles
- 偏差 > 15% → 可能 design summary 与 styles 本身有出入 → 退回 design-planner

## 2. 维度 2：色彩 palette 一致性

对照 `screen.meta.design.palette`：

```
palette 声明（来自 design）：
  - colors.primary（草莓粉）
  - colors.primaryLight（浅粉）
  - colors.secondary（薄荷绿）
  - colors.bgPage（暖白）
  - colors.bgCard
  - colors.textPrimary
  - colors.textSecondary

实际渲染色彩观察：
  □ 主色（粉色）在 SubmitBtn / BrandLogo 出现 ✓
  □ 浅粉色在 PinkCircleDeco 出现 ✓
  □ 薄荷绿在 MintLeafDeco / BrandLogo 装饰点出现 ✓
  □ 暖白底贯穿 ✓
  □ 文字主色（深灰）在 FormTitle / labels 上 ✓
  □ 没有 palette 外的色（如蓝色 / 紫色突然出现）✓

是否一致：✅
```

**红线**：
- 出现 palette 外的色 → 必然是某节点 styles 用了硬编码 / 错引用 → 立刻定位 → 退回 design-planner（D-token-coverage 应在出场前 ≥ 95% 通过）

## 3. 维度 3：主角突出 / 视觉权重

对照 `screen.meta.design.componentBudgets`：

```
budget 声明：
  - SubmitBtn (主角-CTA, weight=9)
  - BrandLogo (主角-品牌, weight=7)  
  - FormCard (配角-容器, weight=4)
  - PhoneInput (工具-输入, weight=2)
  - ...

视觉焦点观察（用户进入此屏 0.5s 内视线落在哪）：
  第 1 焦点：SubmitBtn ✓（最强发光 + 最强色 + 圆角 full）
  第 2 焦点：BrandLogo ✓（居中 + 双色 + 大尺寸）
  第 3 焦点：FormCard ✓（白底 + 阴影/边框）
  辅助元素：装饰光晕在背景，不抢戏 ✓

是否符合 budget：✅
```

**红线**：
- 工具角色（如 RegisterLink）反而比 CTA 更显眼 → 视觉权重错位
- 装饰节点（PinkCircle）饱和度过高，盖过 BrandLogo → 装饰权重越权
- 这些都需要回头看是 styles 本身的问题（退回 design）还是素材饱和度过高（重画）

## 4. 维度 4：装饰平衡

对照 `screen.meta.design.layers` + `D-X-decorations` 的论证：

```
装饰节点观察：
  - PinkCircleDeco：右上角溢出，半径 90px，透明度感觉约 12%，渐变中心明显 ✓
  - MintLeafDeco：左下角，120×120，三叶错落，饱和度约 8% ✓
  - 整体构图：右上重 + 左下平衡 = 对角呼吸 ✓
  
装饰节点不抢戏：
  - z-index 正确（不在内容层）✓
  - pointerEvents:none 实际不阻挡点击（运行时验证）✓
  - 透明度足够低，不影响阅读 ✓

是否平衡：✅
```

**红线**：
- 装饰节点占据中心位置 → 错放 z-index → 退回 design-planner
- 装饰透明度 > 25% → 抢戏 → 重画时降低 alpha
- 单侧装饰过重（如只有右上没有左下）→ 构图失衡 → 检查 design 阶段是否漏建装饰

## 5. 维度 5：衍生视图态（Loading / Empty / Error / 业务态）

每屏的衍生视图节点视觉规格在 `D-X-coverage` 已经核对过，这里再做**实际渲染态切换**核对：

### 切换到 loading 态截图核对

```
1. state/view_set_preview { variable: 'submitting', value: true }（编辑期模拟）
2. generate_snapshots
3. 核对：
   - LoadingOverlay 是否半透明 + 居中 spinner
   - SubmitBtn 是否变 spinner（childrenVisibility 正确切换）
   - 表单是否 disabled 状态（FormCard.loading 子态联动）
4. state/view_set_preview { variable: 'submitting', value: false }（恢复）
```

### 切换到 error 态截图核对

```
1. state/view_set_preview { variable: 'errors', value: { phone: '手机号格式不正确' } }
2. generate_snapshots
3. 核对：
   - PhoneInput 边框是否变红（activeWhen 触发）
   - PhoneError 文字是否显示，色彩是否 token:colors.error
   - minimal-debug 升级是否完整（v2.5）
4. 恢复
```

### 切换到业务状态分支视图（如订单 status）

```
对每个状态：
  state/view_set_preview { ..., value: 'pending_payment' / 'shipping' / ... }
  generate_snapshots → 核对每个状态的独立 layout
```

### 切换到全局 overlay 显示态

```
state/view_set_preview { variable: 'globalView.network.status', value: 'offline' }
→ 核对 OfflineBanner 是否出现，slideDown 动画是否顺畅，色彩是否 warning
```

## 6. 5 维度核对模板

```markdown
## 截图核对（E-X-snapshot）

### 截图 URL
- 默认态：[URL]
- loading 态：[URL]
- error 态：[URL]
- business 态各分支：[URLs]

### 维度 1：整体视觉氛围
设计意图：___________
实际观察：___________
是否一致：✅ / ❌（不一致点）

### 维度 2：色彩 palette
[token 列表 + 实际是否出现]

### 维度 3：主角突出 / 视觉权重
[budget 列表 + 视觉焦点观察]

### 维度 4：装饰平衡
[layers + 装饰节点观察]

### 维度 5：衍生视图态
[Loading / Empty / Error / Business / Overlay 各态截图核对]

### 不一致项 + 处理路径
- ❌ XXX 节点饱和度偏淡 5% → 接受（在阈值内）
- ❌ YYY 节点视觉权重过高 → 重画素材，降低饱和度
- ❌ ZZZ 衍生视图缺失 → 退回 interaction-designer 补节点

### ★ 沉淀到 schema 的结论
本任务以核对为主，schema 写入：
- 标 screen.meta.status.notes = "snapshot 通过 5 维核对"
- 不一致项已在对应任务（mat / 退回上游）处理
```

## 7. 红线

- ❌ "整体看起来 OK" → 不算核对
- ❌ 不切换 loading/error/business 态就标 done → 漏验证
- ❌ 不一致项不列出 / 不处理 → 假完成
- ❌ 偏差 > 15% 还接受 → 视觉撕裂
- ❌ 发现 design 决策有问题不退回 → 越权修
- ❌ 跳过截图直接标 verified → integrity 兜不住视觉问题
