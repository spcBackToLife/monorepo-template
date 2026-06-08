# 方法论 7：跨屏一致性 audit

> 适用任务：`D-audit`、`D-global-overlay-audit`
> 设计完所有屏后，必须做跨屏一致性核对——这是企业级 UI 与"个人作品集"的分水岭。

## 1. 5 维度核对

### 维度 1：通用组件类型在不同屏的样式一致性

```
对每种通用组件（按钮/输入框/卡片/导航/链接）：
  - 同样的 SubmitBtn 在登录页和注册页样式完全一致吗？
    □ size（width/height/padding）
    □ color（bg/text/border）
    □ shadow / radius / fontSize / fontWeight
    □ transition / hover/pressed/disabled 视觉
  - FormCard 在多屏 padding/radius/shadow 完全一致？
  - 错误提示文字色（color: $token:colors.error）统一？
  - Toast 出入动画（duration / easing / 方向）统一？
```

**冲突处理**：
1. 优先回头**抽模板**（asset/save_as_template）让所有实例自动同步
2. 已抽模板但样式漂了 → 检查 detached 实例，重新 sync
3. 不能抽模板的（如登录卡 vs 注册卡布局不同）→ 按 token 引用确保色彩/间距/圆角一致，仅布局允许差异

### 维度 2：视觉密度跨屏均衡

```
跨屏总权重表：
  登录页：28
  首页：22
  详情页：26
  设置页：18
  错误页：12
  
□ 相邻屏总权重差 > 10？(如 登录页 28 → 首页 14) → 风格断层
□ 设置页总权重 < 15？→ 太冷清，可考虑加少量装饰或加大间距
□ 庆典页 / 营销页 总权重在 25-30 → 合理
```

**冲突处理**：
- 总权重断层 → 在低权重屏加一个氛围装饰（如设置页加角落极淡渐变）
- 高权重屏过载 → 按视觉预算上限规则削权

### 维度 3：主题契合 / Token 引用率

```
对每个屏：
  □ 所有 color 都是 $token:colors.*？
  □ 所有 fontSize 都是 $token:typography.<key>.fontSize？（先选预设再引子属性）
  □ 所有 fontWeight / lineHeight 都引同一预设的子属性？（不能自由拆装）
  □ 所有 spacing 都是 $token:spacing.*？
  □ 所有 borderRadius 都是 $token:radius.*？
  □ 所有 boxShadow 都是 $token:shadows.* 或显式 token 组合？
  □ 所有 transition 都引整段 $token:transitions.<key>（含时长 + 缓动）？(schema 没有独立 durations/easings)

整体引用率：
  Token 引用次数 / 总样式属性次数 ≥ 95% → ✅ 通过 D-token-coverage
  < 95% → 找出硬编码处，要么改 token 要么加 token 后引用
```

**例外清单**（计入 100%）：
- CSS 关键字（auto / 0 / transparent / none / inherit / unset）
- safe-area-inset-* / env() 系列
- 派生展示节点的 minimal-debug 兜底色（v2.5）
- 装饰节点的特殊渐变（如 `radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)` 中的 0% 70% 比例）

### 维度 4：通用组件抽模板覆盖率

```
对每种 Molecule / Organism：
  □ 跨屏 ≥ 2 次出现的是否都抽了模板？
  □ 模板的 propDefinitions 是否完整？
  □ 实例是否都引用模板（detached=false 比例 ≥ 90%）？
  □ 是否存在"看似一样但其实是各屏独立写"的组件？→ 必须改为 instantiate
```

**冲突处理**：
- 发现 ≥ 2 次出现但未抽模板 → asset/save_as_template + 把所有实例改为 instantiate
- 发现已抽模板但实例 detached 比例高 → 检查为什么 detach，是否需要扩展 propDefinitions
- 发现"假相似"组件（外观一致但内部结构差异大）→ 不抽模板，统一通过 token 保证视觉一致

### 维度 5：全局 overlays 视觉规格统一

```
对 project.globalOverlays 中每个 overlay：
  □ Modal 出入动画统一（fade + scaleIn 300ms ease-out）？
  □ BottomSheet 出入动画统一（slideUp 350ms ease-out）？
  □ Drawer 出入动画统一（slideRight 300ms ease-out）？
  □ Toast 出入动画统一（slideDown + fade 200ms ease-out）？
  □ backdrop 颜色/透明度/dismissible 一致（如 rgba(0,0,0,0.45) + dismissible:true）？
  □ 圆角顶部一致（Sheet 16px / Modal 12px）？
  □ safe-area 适配一致（底部 padding-bottom: env(safe-area-inset-bottom)）？
  □ 内部 CTA 按钮风格与全局按钮一致？
```

**为什么要统一**：全局 overlays 跨屏出现，跟不同屏内容并存——风格不统一会**撕裂体验**（用户在登录页看到一种 Modal 风格，去到首页看到完全不同的 → 认知混乱）。

## 2. audit 执行流程

```
1. 列出所有需 audit 的对象：
   - 通用组件类型清单（按钮 / 输入框 / 卡片 / 链接 / Toast 等）
   - 全局 overlays 清单
   
2. 对每个对象做 5 维度核对（用对照表）：
   维度 1: 跨屏样式对照表
   维度 2: 跨屏总权重对照表
   维度 3: token 引用率对照表
   维度 4: 模板抽取/instantiate 矩阵
   维度 5: 全局 overlays 规格统一表

3. 列出所有不一致项 → 优先级排序：
   P0: 完全不同的视觉（如同种按钮在 A 屏和 B 屏色完全不一样）→ 必须立刻修
   P1: 细微不一致（如 padding 差 2px）→ 尽快修
   P2: 主观偏好（如 A 屏 hover 抬升 1px、B 屏抬升 2px）→ 统一即可

4. 用 style/batch_update 批量统一（避免逐个改）

5. 修完后 query/integrity 自检 + 重跑 D-token-coverage
```

## 3. 跨屏对照表示例

### 通用按钮对照
| 屏 | 节点 | size | bg | radius | shadow | hover 行为 |
|----|------|------|----|----|----|----|
| 00-login | SubmitBtn | 100% × 48 | primary | full | sm | translateY(-1) + shadow:md |
| 01-register | RegisterBtn | 100% × 48 | primary | full | sm | translateY(-1) + shadow:md ✅ |
| 02-forgot | ConfirmBtn | 100% × 44 ❌ | primary | full | sm | translateY(-1) + shadow:md |
| 03-home | CreateBtn | auto × 40 | primary | full | sm | translateY(-2) ❌ + shadow:md |

→ 02-forgot 高度漂了 4px，03-home hover 抬升不一致 → 必须统一

### 全局 overlays 对照
| overlay | 类型 | 出入动画 | duration | easing | backdrop |
|---------|------|----------|----------|--------|----------|
| OfflineBanner | banner | slideDown+fade | 200ms | ease-out | none |
| SessionExpired | modal | fade+scaleIn | 300ms | ease-out | rgba(0,0,0,0.5) |
| AppUpdate | modal | fade+scaleIn | 300ms | ease-out | rgba(0,0,0,0.5) ✅ |
| ErrorBoundary | custom | fade | 250ms ❌ | ease-out | rgba(0,0,0,0.7) ❌ |

→ ErrorBoundary 时长和 backdrop 透明度漂了 → 必须统一

## 4. md 落地（D-audit）

```markdown
## 跨屏一致性 audit（D-audit）

### 维度 1：通用组件样式对照
[每种通用组件的跨屏对照表]

### 维度 2：视觉密度均衡
[各屏总权重对照 + 断层风险]

### 维度 3：Token 引用率
[整体 95% / 各屏明细 / 硬编码点列表]

### 维度 4：模板抽取覆盖
[Molecule/Organism 矩阵 + detached 比例]

### 维度 5：全局 overlays 规格
[出入动画 / backdrop / safe-area 对照]

### 不一致项清单（按 P0/P1/P2 优先级）
- P0: 02-forgot SubmitBtn 高度 44px ≠ 全局 48px → batch_update 修
- P0: ErrorBoundary 出入 250ms ≠ 全局 modal 300ms → 修
- P1: 03-home CreateBtn hover -2px ≠ 全局 -1px → 修
- P2: ...

### 修复操作记录
[style/batch_update 调用清单]

### 修复后核对
[再跑维度 1-5 → 全部 ✅]

### ★ 沉淀到 schema 的结论
[batch_update 调用 + audit 结论写到 project.meta.designSystem.auditPassed = true]
```

## 5. 红线

- ❌ 跳过 D-audit 直接 D-handover → executor 拿到撕裂的设计
- ❌ 维度 1-5 任何一项没核对 → audit 不算完成
- ❌ 发现不一致但只在 md 列出、没 batch_update → 假完成
- ❌ batch_update 后没重新核对 → 修复可能引入新问题
- ❌ 全局 overlays 在跨屏并存场景下风格不统一（修都不修就交付）→ R-PHASE-01 真实风险
- ❌ Token 引用率 < 95% 不补 → R-TOKEN-COVERAGE
