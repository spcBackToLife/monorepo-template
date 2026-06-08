# 设计思维总纲 — 像设计师一样思考

> **必读时机**：每次入场启动时第一份 read_file；任何陷入"机械填字段"迹象时重读。
> **定位**：本文档是 design-planner-v3 的**思维总纲**——先读它，再去按需加载 methodology/ 下的具体方法。

---

## 1. 一句话总结

> **视觉设计 = 用具体可视判据的设计目标驱动多元素协同改动；不是按字段类别给所有节点遍历填值。**

---

## 2. 目标驱动 vs 字段驱动（最重要的认知切换）

### 2.1 字段驱动（错误，禁止）

```
任务清单：
  - 写 styles 字段（按节点遍历）
  - 写 visualStates 字段（按节点遍历）
  - 写 materials 字段（按节点遍历）
  - 加装饰节点（按预算配额）

执行心智："我要把所有字段填满 → 任务 done → 流程通过"

后果：字段全填 ≠ 设计达标；视觉决策无溯源、无对账、无问责
```

### 2.2 目标驱动（唯一正确）

```
思考流程：
  1. 我当前的设计目标是什么？（让用户感受到什么 / 看到什么 / 区分到什么）
  2. 我有哪些手段可以达到这个目标？
     → 结构/布局（信息层级、视觉中心）
     → 颜色（情感映射、品牌色、语义色、对比度）
     → 字体/排版（层级阶梯、字重对比）
     → 装饰元素（氛围、愉悦感、品牌感）
     → 间距/圆角/阴影（精致感、现代感）
  3. 需要哪些元素协同？每个元素扮演什么角色？
  4. 达成后怎么从截图判断？（≥3 条可视判据）
  5. 截图对账 → 不达就改
```

执行心智：**"我要让用户在视觉上感受到 X → 拆出涉及元素 + 多维度协同改动 → 一次性改完 → 截图看是否达成 → 不达就改"**

---

## 3. 设计师的手段箱（按优先级）

设计师影响用户感知的手段，按优先级排列：

| 优先级 | 手段 | 影响什么 | 参考文档 |
|---|---|---|---|
| P0 | **结构/布局** | 信息层级、阅读顺序、视觉中心 | methodology/02-goal-decomposition.md §4.7 |
| P1 | **颜色** | 情感、品牌、状态区分、对比度 | 见下方 §4 颜色方法论要点 |
| P2 | **字体/排版** | 信息层级、可读性、精致感 | methodology/03-multi-element-coordination.md §3.4 |
| P3 | **装饰元素** | 愉悦感、品牌感、氛围 | methodology/04-decoration-system.md |
| P4 | **间距/圆角/阴影** | 精致感、层级感、现代感 | 散布在各 methodology 中 |

**重要**：优先级高的手段没搞定之前，不要急着上装饰。`结构混乱 + 满屏装饰 = 更糟`。

---

## 4. 各手段的核心理论要点（速查）

> 这里只放核心要点。深度方法按任务阶段 read 对应 methodology 文件。

### 4.1 结构/布局（P0）

- **视觉层级金字塔**：3-4 层，每层节点数比上层多 ≥ 1.5×
- **阅读顺序引导**：视线从主 → 次 → 辅，不要让用户「迷失」
- **留白节奏**：主要元素周围留白 ≥ 间距系统 1 档以上
- **对齐系统**：严格网格 / 左对齐优先，减少视觉噪声

### 4.2 颜色（P1）

- **三色角色**：品牌主色（1 个）+ 语义色（4 个）+ 中性灰阶（5-7 阶）
- **对比度（APCA）**：正文-背景 ≥ 60；大字号 ≥ 45
- **60-30-10 法则**：60% 中性/背景色 + 30% 主色区 + 10% 强调色
- **色彩情感映射**：蓝=专业，绿=安全，红=错误，橙=警示/活力

### 4.3 字体/排版（P2）

- **字号梯度**：display(32) → h2(22) → body-lg(16) → body(14) → caption(12)
  - 每档比上一档 ≥ 1.3×
- **字重梯度**：600(主标) → 500(副标/label) → 400(正文)
  - 主标与正文差 ≥ 200
- **色彩梯度**：textPrimary(0.88α) → textSecondary(0.65α) → textTertiary(0.45α)
  - 每档 alpha 差 ≥ 0.2

### 4.4 多元素协同（核心心法）

视觉效果 ≠ 单元素的 CSS 调整；视觉效果 = 多元素的协同合奏。

典型协同模式 7 种：
- `mood-conveyance`：屏底 + Logo + 装饰群（≥ 4 元素）
- `cta-clarity`：CTA + 周围弱化邻居（3-5 元素）
- `trust-signal`：控件 + 错误态 + 微动效（2-4 元素）
- `hierarchy`：标题 + 副标 + 正文 + caption（3-5 元素）
- `state-feedback`：状态切换前后联动（2-5 元素）
- `brand-recognition`：Logo + 主色应用 + 装饰呼应（3-5 元素）
- `decoration-storytelling`：装饰群 + 主屏元素呼应（3-6 元素）

详见 `methodology/03-multi-element-coordination.md` §3。

### 4.5 装饰系统

- 装饰 = **某个设计目标的实现手段**，不是屏级独立配额
- 装饰族单一（soft-glow / geometric-line / illustration / texture / organic-curve），不混杂
- 装饰透明度 ≥ 20%（避免接近不可见）
- 装饰节点必须挂 `servingGoals` 和 `kind: "decoration"`

详见 `methodology/04-decoration-system.md`。

---

## 5. 思考时的 5 步自问清单

**执行每个设计任务前，强制在内心/对话中回答这 5 个问题**：

### Q1: 我现在做的改动服务于哪个 designGoal？
- 答得出 G<N> 编号 + 一句话 statement → 通过
- 答不出 → 停下来，先做目标提取（读 `methodology/01-goal-extraction.md`）

### Q2: 这个目标需要哪些手段维度？（结构/颜色/字体/装饰/间距）
- 能列出 ≥ 2 个维度 → 通过
- 只有 1 个维度 → 重新审视：这真是设计目标吗？还是 CSS 微调？

### Q3: 涉及哪些元素协同？每个元素扮演什么角色？
- 4 角色框架：主体 / 主角 / 邻居 / 父容器 / 装饰
- ≥ 2 个元素协同 → 通过
- 单元素 → 这不是目标驱动，这是字段微调

详见 `methodology/03-multi-element-coordination.md` §2。

### Q4: 改完之后，怎么从截图判断目标达成？
- ≥ 3 条具体可视判据（能用 Read 看截图判断 pass/fail）→ 通过
- 只有"看起来不错" → 重写 successCriteria（见 `methodology/01-goal-extraction.md` §5）

### Q5: 这个改动会不会破坏别的目标？
- 考虑了跨目标冲突 → 通过
- 没考虑 → 停下来，读本文 §6 冲突处理

**任一未通过 → 当前思维处于"字段填表"状态，回到目标提取重做。**

---

## 6. 跨目标统筹（避免目标冲突）

### 6.1 常见冲突场景

| 冲突类型 | 场景 | 处理策略 |
|---|---|---|
| 颜色冲突 | G1 要暖色氛围，G2 要蓝色 CTA | CTA 用主色（蓝色），暖色留给屏底和装饰 |
| 权重冲突 | G1 要让 Logo 突出，G2 要让 CTA 突出 | 按优先级取最高权重；P0 目标优先 |
| 装饰冲突 | 多个 goal 都想加装饰 | 按 goal 频次选单一族，所有 goal 共用 |
| 状态冲突 | default 态要温暖，error 态要醒目 | 不同状态用不同 token，不共享同一色 |

### 6.2 60-30-10 法则（视觉策略）

```
60% — 中性/背景色（屏底、卡片背景、大面积底色）
30% — 主色区（主要操作区、品牌色应用区）
10% — 强调色（装饰、点缀、状态反馈）
```

这个比例不是「按面积算的精确数值」，而是**视觉重量的比例感**。截图后整体看：
- 大面积是中性调？→ 60% 到位
- 主色块在正确的位置（CTA / 导航 / 品牌区）？→ 30% 到位
- 装饰和点缀不喧宾夺主？→ 10% 到位

---

## 7. 反模式（必须识别并拒绝）

### 7.1 把 craft 写成 fix-issue

❌ 错（修补型）：
```
craft-brandlogo: 修 BrandLogo 占位虚线
craft-decoration-rebalance: 修装饰透明度
craft-tab-indicator: 修 ModeToggle 缺指示线
```

✅ 对（目标驱动）：
```
craft-G1-mood-warmth: 服务 G1 校园温度，改动屏底+BrandLogo+BgBlob+FormCard 协同
craft-G2-cta-hierarchy: 服务 G2 SubmitBtn 主角化，改动 SubmitBtn+GetCodeBtn+Links 权重再分配
craft-G3-form-clarity: 服务 G3 表单清晰，改动 Inputs+Labels+Errors 协同
```

### 7.2 把抽象意图当 successCriteria

❌ 错：
```jsonc
{ "successCriteria": ["整体感觉更现代", "配色更和谐"] }
```

✅ 对：
```jsonc
{
  "successCriteria": [
    "主按钮背景色为品牌蓝 #165DFF，截图可见",
    "卡片圆角 12px，截图测量圆角明显大于之前的 4px",
    "主要信息（标题+数值）字号 24px，视觉层级高于辅助信息 14px"
  ]
}
```

### 7.3 单元素/单维度的"目标"

❌ 错（这不是设计目标，是 CSS 微调）：
```
G4.statement = "让 SubmitBtn 圆角 12px"
G4.involvedElements = [SubmitBtn]
G4.changes = { styles: [{ nodeId: SubmitBtn, patch: { borderRadius: 12 } }] }
```

✅ 对（真目标）：
```
G2.statement = "让 SubmitBtn 成为首屏第二视觉锚点，引导用户视线从 BrandLogo 自然过渡到 CTA"
G2.involvedElements = [SubmitBtn, GetCodeBtn, Links, FormCard]
G2.changes = {
  styles: [SubmitBtn 主色填充 + GetCodeBtn 弱化字色 + Links caption 字号],
  layout: [SubmitBtn 上方 spacing 加大，与字段视觉断开]
}
```

### 7.4 装饰不挂 servingGoals

❌ 错：装饰节点不挂 `servingGoals` → 视为孤儿装饰 → 拒
✅ 对：装饰节点必挂 `meta.design.servingGoals: ["G1"]`

---

## 8. 方法论文档索引（按需加载）

### 8.1 思考方法论（methodology/）

| 阶段 | 读什么 | 为什么 |
|---|---|---|
| 刚入场、思维迷失 | **本文档**（重读 §2、§5） | 建立目标驱动心智 |
| 提取设计目标 | `methodology/01-goal-extraction.md` | 5 步提取法 + successCriteria 写法 |
| 拆解目标→元素 | `methodology/02-goal-decomposition.md` | 涉及哪些元素 + 5 维 changes |
| 涉及多元素协同 | `methodology/03-multi-element-coordination.md` | 4 角色 + 7 种协同模式 |
| 涉及装饰节点 | `methodology/04-decoration-system.md` | 装饰族选定 + 单一族约束 |

### 8.2 配方库（recipes/）

> 读完后**直接参数化套用**，不需要重新发明。

| 需要什么 | 读 recipes/ 下哪个 | 里面有什么 |
|---|---|---|
| 选定了主题风格（theme.intent.tone） | `theme-element-dict/<tone>.md` | 该风格下色/字/形/饰/律的默认套餐 |
| 需要加装饰节点 | `decoration-systems/<system>.md` | 该装饰族的视觉特征 + CSS 配方 + 红线 |
| 需要达成某种视觉感受 | `visual-effects/<effect>.md` | 该效果的参与元素 + CSS 配方 + 动效 |
| 需要实现某个业务复合控件 | `compositions/<widget>.md` | 该控件的节点结构 + styles + visualStates |

详细索引见 `recipes/README.md`。

---

## 9. 一句话再总结

> **设计目标驱动 = 让"用户感受到 X"成为唯一真理；结构/颜色/字体/装饰/间距都是它的实现手段。任何不挂在某个目标下的改动都是"无目的填字段"，必须拒。**
