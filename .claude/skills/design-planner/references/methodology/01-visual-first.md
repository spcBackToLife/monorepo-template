# 方法论 1：视觉先行 7 步思考框架

> 适用任务：`D-X-emotion`、`D-X-hierarchy`、`D-X-styles`（落库前回头查情感/手段/契合度）、`D-X-decorations`、`D-X-materials`

## 0. 绝对红线：视觉先行（Visual-First）

```
❌ 错误：先想"这屏要几个节点几个 div" → 再补样式 → 再补装饰
✅ 正确：先想"这屏让用户感受什么" → 再用视觉手段实现 → 最后落到节点 + 样式
```

**视觉决定结构、视觉决定装饰、视觉决定素材**。任何"先结构后视觉" = 流程错误，必须推倒重来。

interaction 阶段已经把节点骨架建好了（业务节点 + 衍生视图节点 + overlays），但**节点骨架 ≠ 视觉决策**——design 阶段是站在已有骨架上做"视觉编排"，不是补样式。

## 1. 7 步思考框架（每屏必做）

| Step | 思考 | 落到 schema 哪 | 对应任务 |
|------|------|----------------|---------|
| 1. 情感与氛围 | 用户此刻心理状态 / 目标感受 / 情绪曲线 / 与主题的关系 | `screen.meta.design.summary` | `D-X-emotion` |
| 2. 视觉层级 | 前景 / 中景 / 背景 / 遮罩 4 层 + 各层 z-index 规划 + 主次配 | `screen.meta.design.layers` | `D-X-hierarchy` |
| 3. 视觉手段 | 色彩 / 排版 / 阴影 / 渐变 / 动效 / 装饰 的具体选择 | 体现在 `node.styles` | `D-X-styles` |
| 4. 装饰决策 | 7 大类装饰中选哪些（见 `04-decoration-categories.md`）+ 用量 | 装饰节点 + `node.styles` + `materialSpec` | `D-X-decorations` |
| 5. 素材需求 | 需要哪些图标 / 装饰素材 / 插画 / 品牌素材 | `node.meta.design.materialSpec` | `D-X-materials` |
| 6. 视觉权重预算 | 每个组件视觉权重 + 角色 + 允许手段 | `screen.meta.design.componentBudgets` | `D-X-budget` |
| 7. 主题契合 | 所有色 / 字号 / 间距 / 圆角 / 阴影 是否引用 token | 自检 `$token:` 使用率 | `D-token-coverage` |

> Step 1-2 是"思考"型分析任务（在 md 中产出，结论由后续落库任务承接）。
> Step 3-7 都对应到具体的 schema 写入任务。
> 7 步**没有先后改写权**——Step 6 视觉预算的"组件 weight"反过来约束 Step 3 的"视觉手段"。

## 2. Step 1：情感与氛围

回答以下 4 维度，落到 `screen.meta.design.summary`（一句话浓缩）+ md 推理段（完整论证）：

| 维度 | 问 | 例（登录页）|
|------|----|------------|
| 用户心理状态 | 用户从哪来？带着什么期望/情绪？ | "看广告进来→焦虑值高（怕被推销）→需要安抚" |
| 目标感受 | 看到这屏 0.5s 内**立即感受到**什么？用 3 个形容词 | "温暖、可信、不强迫" |
| 情绪曲线 | 随着使用过程，情绪如何变化？A → B → C | "好奇 → 信任 → 期待" |
| 与主题的关系 | 如何体现 theme 的 intent？加强/弱化/变体哪些方面？ | "playful 主题中性化（登录页不要太活泼，避免轻浮）" |

**红线**：
- 情感描述不能是"漂亮"、"好看"、"现代"——这些词无视觉手段对应
- 必须用 3 个形容词浓缩，写到 `meta.design.summary`

## 3. Step 2：视觉层级（4 层模型）

```
[最深层]  ──  背景 / 底色 / 大面积装饰              z-0   最弱存在感
   ↑
[氛围层]  ──  装饰光晕 / 纹理 / 角落溢出图形         z-5   若隐若现
   ↑
[内容层]  ──  主要信息 / 交互元素                   z-10  视觉焦点
   ↑
[强调层]  ──  CTA 按钮 / 重点提示 / 浮动元素        z-20  最强存在感
   ↑
[覆盖层]  ──  弹窗 / Sheet / 遮罩                  z-30  临时最高
```

每屏在 `screen.meta.design.layers` 中按此 4 层分配每个节点：

```jsonc
layers: [
  { name: "前景",  zIndex: 3, elements: ["LoadingOverlay","ErrorToast"] },
  { name: "中景",  zIndex: 2, elements: ["FormCard","FooterLinks"] },
  { name: "中景",  zIndex: 1, elements: ["HeaderArea","BrandLogo","BrandSlogan"] },
  { name: "背景",  zIndex: 0, elements: ["PageBackground","PinkCircleDeco","MintLeafDeco"] }
]
```

**视觉流向**——用户视线的自然路径：
```
进入页面 → 视线首先落在 BrandLogo（z=1，主角-品牌）
        → 被 PinkCircleDeco 的渐变光引导到 FormCard（z=2，配角-容器）
        → 沿表单字段向下移动到 SubmitBtn（z=2，主角-CTA，最高视觉权重）
        → 完成后视线扫到 FooterLinks（z=2，工具-导航）
```

**红线**：
- z-index 必须用 token（`zIndex: "$token:zIndex.overlay"` 或固定 0/1/2/3 这种 4 阶层级），不要 999 之类的乱数
- 装饰必须 z=0/1，不能与 z=10 的内容层抢

## 4. Step 3：视觉手段清单

从 Step 1 情感目标推导，逐一选择视觉手段：

### 4.1 色彩运用
| 手段 | 描述 | 营造 | token 引用 |
|------|------|------|-----------|
| 主色渐变 | 135deg, primary→secondary | 科技感+品牌识别 | `$token:colors.primary`+`$token:colors.secondary` |
| 中性灰阶层 | bg-page/bg-card/border 三阶 | 清晰层次 | `$token:colors.bgPage` 等 |
| 状态色点缀 | 错误红 / 成功绿 / 警告橙 | 状态识别 | `$token:colors.error/success/warning` |

### 4.2 光影效果
| 手段 | 描述 | 应用 | 营造 | 参数 |
|------|------|------|------|------|
| 按钮外发光 | primary 色扩散阴影 | SubmitBtn | "夜空中的星" | `0 0 20px rgba(...,0.4)` 或 `$token:shadows.glow` |
| 卡片底阴影 | 底部柔和阴影 | FormCard | "从纸面浮起" | `$token:shadows.md` |
| 内阴影 | 输入框聚焦时 | PhoneInput hover/focus | 嵌入感 | `inset 0 1px 2px rgba(0,0,0,0.05)` |

### 4.3 质感与肌理
| 手段 | 应用 | 参数 | 营造 |
|------|------|------|------|
| 毛玻璃 | NavBar / Sheet | `backdrop-filter: blur(20px) saturate(1.2)` | 层级分明+现代感 |
| 噪点纹理 | 全局背景叠层 | `opacity:0.03, 全屏 PNG` | 质感+手工感 |
| 圆角 | 所有交互元素 | `borderRadius: $token:radius.md/lg/full` | 软化锐利 |

### 4.4 排版手段
| 手段 | 描述 | 营造 |
|------|------|------|
| 字号阶梯 | display > h1 > h2 > body > caption | 层次清晰 |
| 字重对比 | regular vs semibold vs bold | 强弱区分 |
| 行高节奏 | tight(标题) vs normal(正文) vs loose(说明) | 阅读舒适度 |
| 字间距 | 大标题 -0.02em / 全大写 +0.05em | 精致感 |

### 4.5 动效
| 手段 | 触发 | 参数 | 营造 |
|------|------|------|------|
| 按钮 hover 抬升 | hover | `transform: translateY(-1px)` + `shadow:md→lg` | 可点击感 |
| 输入聚焦光晕 | focus | `box-shadow: 0 0 0 3px primaryLight` | 当前焦点 |
| 切换 spring | 切 mode 时 | `transition: all 200ms cubic-bezier(...)` | 弹性自然 |

**红线**：
- 任何 color / 字号 / 间距 / 阴影 / 时长必须 `$token:` 引用
- 例外：CSS 关键字（auto / 0 / transparent / none / inherit）、`safe-area-inset-*`、派生展示节点的 minimal-debug 兜底色（v2.5）

## 5. Step 4：装饰决策

详见 `04-decoration-categories.md`。要点：

- 选 1-2 个主装饰类 + 1 个辅助类（不要 7 大类全用）
- 装饰节点用 `position: absolute` + 低 z-index（0/1）+ `pointerEvents: none`
- C 端每屏**至少一个装饰节点**（"全 CSS 不需要装饰"是偷懒）

## 6. Step 5：素材需求

详见 `schema-spec/material-spec.md`。识别本屏需要哪些素材：

- 品牌素材（Logo / 品牌符号）→ kind: `brand`
- 功能图标（提交 / 切换 / 关闭）→ kind: `icon`
- 装饰素材（角落 blob / 背景光晕）→ kind: `decoration`
- 空态 / 错误 / 引导插画 → kind: `illustration`
- 整体背景图 → kind: `background`

每个素材在对应节点的 `meta.design.materialSpec` 中写完整 10 节规格。

## 7. Step 6：视觉权重预算

详见 `02-visual-budget.md`。要点：

- 全屏总权重 ≤ 30
- 主角角色最多 2 个（视觉焦点清晰）
- 每个节点 weight + role + allowedTools + decorationDensity 落到 `screen.meta.design.componentBudgets`

## 8. Step 7：主题契合

```
□ 所有 color 都是 $token:colors.*？
□ 所有 fontSize 都是 $token:typography.<key>.fontSize？（先选预设再引子属性）
□ 所有 fontWeight / lineHeight / letterSpacing 都引同一预设的子属性？（不能自由拆装）
□ 所有 spacing 都是 $token:spacing.*？
□ 所有 borderRadius 都是 $token:radius.*？
□ 所有 boxShadow 都是 $token:shadows.* 或显式 token 组合？
□ 所有 transition 都引整段 $token:transitions.<key>（含时长 + 缓动）？(schema 没有独立 durations/easings)
```

任何一项 ❌ → 必须先回去补 token（theme/set_theme_tokens）或换用现有 token，**绝不当场硬编码**。

## 9. 7 步落库到 md 的结构

每屏的视觉先行分析按 11 个屏级任务拆开：
- `D-X-emotion` md 写 Step 1（情感与氛围）
- `D-X-hierarchy` md 写 Step 2（视觉层级）
- `D-X-budget` md 写 Step 6（视觉权重预算）
- `D-X-decorations` md 写 Step 4 + 落库装饰节点
- `D-X-styles` md 写 Step 3 + 落库每节点全量 styles
- `D-X-states` md 落库 visualStates
- `D-X-materials` md 写 Step 5 + 落库 materialSpec
- `D-token-coverage` 项目级 md 写 Step 7

## 10. 红线

- ❌ 跳过 Step 1（情感分析）直接做 styles → 必然出现"美感缺位"
- ❌ Step 2-7 任意一步在 md 里没穷举 ≥ 2 个候选方案 + 否决理由 → 推理深度不够
- ❌ Step 3 的视觉手段未落到 styles 字段（如 md 写"按钮发光"但 styles 没 boxShadow）→ md 与 schema 漂移
- ❌ Step 4 装饰决策未在 md 给出"为什么是这一类装饰"——不能只列 CSS 实现
- ❌ Step 7 主题契合不写自检表 → 为后续 R-TOKEN-COVERAGE 埋雷
