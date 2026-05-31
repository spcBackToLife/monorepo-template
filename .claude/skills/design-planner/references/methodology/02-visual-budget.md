# 方法论 2：视觉权重金字塔 + 最低识别阈值（v3）

> 适用任务：`D-X-budget`、所有 `D-X-craft-*`、`D-audit`
>
> **核心信念**：budget = 视觉权重统筹，不是装饰量上限。"省着用"会把工具角色压成几乎不可见 → 简陋。**专业设计 = 主角浓墨重彩 + 工具简洁但仍达识别阈值 + 装饰克制有节**。
>
> **v2 → v3 关键变化**：
> - 删除"视觉资源是稀缺品，必须省着用"的教学主线
> - 新增"视觉权重金字塔"强约束（§3）
> - 新增每个 role 的"最低识别阈值"表（§4）★ 必读
> - 新增 weight 量化公式（5 维评分，§5）
> - 削减叙事降级为"溢出时调整"工具，不是教学主线（§7）

---

## 1. 视觉统筹三层级（保留 v2）

```
L0 全局基调（来自 ThemeConfig）
   产物：themes[].{ tokens, decorationRules, iconSpec, stateSpec }
       ↓ 约束 ↓
L1 页面级统筹（screen.meta.design）
   职责：定金字塔结构 / 装饰系统单一族 / 60-30-10 调色配比
   产物：componentBudgets + visualStrategy（v3 新增）
       ↓ 约束 ↓
L2 组件级深钻（每个 node.meta.design）
   职责：在 L1 给的"权重 + role + 最低阈值"内做组件设计
   产物：node.styles 全量 + visualStates 完备 + materialSpec
```

---

## 2. 视觉权重 1-10 标尺（保留 v2，作为分级参考）

| 权重 | 角色 | 例 | 装饰密度 |
|:---:|------|---|----------|
| 9-10 | 主角-CTA | SubmitBtn / 支付按钮 | 密 |
| 8-9  | 主角-内容 | 单价数字 / Hero 区域 | 中 |
| 7-8  | 主角-品牌 | BrandLogo / 主导航 | 中 |
| 5-6  | 配角-信息 | 卡片标题 / 列表项 | 少 |
| 4-5  | 配角-容器 | FormCard / Section | 少 |
| 3-4  | 工具-输入 | PhoneInput / Checkbox | 极少（但 ≥ 阈值，§4）|
| 2-3  | 工具-导航 | Tab / 链接 | 极少（但 ≥ 阈值）|
| 3-5  | 氛围-装饰 | 光斑 / 几何线 / 渐变 | 中 |

**注意**：装饰密度 = 视觉繁复度，不等于"视觉信号数量"。所有 role 都要满足 §4 最低识别阈值。

---

## 3. ★ 视觉权重金字塔（v3 新增强约束）

整屏权重必须呈金字塔结构 —— 每层之间有**数量级差异**：

```
        ◆ 主角层 (weight 8-10)         ← 最多 1-2 个节点 / 总权重占 ~30%
       ◆◆ 配角层 (weight 5-6)          ← 占 ~30% 节点 / 总权重占 ~30%
     ◆◆◆◆ 工具层 (weight 2-3)          ← 占大多数节点 / 总权重占 ~25%
   ◆◆◆◆◆◆ 氛围层 (weight 1-3 装饰)    ← 大面积低密度 / 总权重占 ~15%
```

**强约束**：
1. 主角与配角 weight 差 ≥ 2（5 → 7+ 而不是 5 → 6）
2. 配角与工具 weight 差 ≥ 2（5 → 3- 而不是 4 → 3）
3. 主角节点数 ≤ 2，否则没主角
4. 工具层节点数无上限，但每个 ≤ 3
5. 全屏 weight 总和 ≤ 30
6. 装饰节点 weight 总和 ≤ 8

**红线（R-PYRAMID-01）**：金字塔结构不成立（如全屏 weight 6/6/6/6/6/6 没有主角配角差异）→ 视觉无层次 → 必须重新分配。

**对账（B2 工具）**：`query/visual_weight_audit { screenId }` 返回每节点实测 weight + 金字塔是否成立。

---

## 4. ★ 每个 role 的最低识别阈值（v3 新增）

> **核心**：weight 决定"装饰繁复度"上限；**最低识别阈值**决定"视觉信号"下限。两者都是必须的。
>
> 工具层 weight 低 ≠ 装饰为 0。Checkbox 写成 native input + accentColor 就是典型违反——浏览器默认渲染 = 用户识别度 1/5（看着像被禁用的黑方块）。

每个 role 必须满足以下**最少视觉信号数**——少于阈值视为设计未完成：

| role | 必须 | 信号清单（≥ N 个） | 禁止 |
|---|---|---|---|
| **工具-勾选** (checkbox/radio) | ≥ 3 个手段 | 自绘外框 + 选中底色/边色 + 勾(SVG/unicode) + 焦点光晕 | 仅 accentColor / 仅 native + width/height |
| **工具-切换** (tab/segment) | ≥ 2 个手段区分 active vs inactive | 字色差 + 字重差 + 下划线/底色 + 移动指示条（任 2）| 仅静态 borderBottom 不区分 |
| **工具-辅助** (secondary CTA / link / icon-button) | ≥ 2 个手段表达可点击 | 边框 + 底色（任 1）+ hover 反馈 + 箭头/外链 icon | 仅字色（除非 underline + hover 反馈） |
| **工具-输入** (input/textarea) | ≥ 4 态 + ≥ 3 视觉信号 | default 边框 / focus 边色+光晕 / error 边色+icon / disabled 灰色 | 完全没 focus 视觉变化 |
| **配角-容器** (card/section) | ≥ 2 个手段表达"容器" | 圆角 + 阴影 + 边框 + 底色（任 2）| 完全平铺无边界 |
| **主角-CTA** | ≥ 5 态 + ≥ 4 视觉信号 | 主色填充 + 圆角 + 阴影 + 字重 + 高度统一 + hover/pressed/focus/disabled/loading | 简陋色块 / 无 hover |
| **主角-品牌** (Logo/Hero) | ≥ 1 个 ≥ 80px 视觉锚 + 主色或主色衍生色 | 真画的图（SVG/PNG）/ 大字号 LOGO 字 / 几何符号 | type=img 留空 src 让占位框出场 |
| **氛围-装饰** | 实测渲染对比度 ≥ 0.05 vs 背景 | 渐变光斑 / 几何线条 / 纹理 / 插画（任 1，按装饰系统单一族）| 写完不可见（如字符串内嵌 token 解析失败）|

**对账（B2 工具）**：`query/visual_recognition_audit { screenId, role? }` 扫每个节点的实际 styles + visualStates，统计信号数；不达阈值 → 报错。

**红线（R-RECOG-01）**：任一节点未达本 role 最低阈值 → D-X-craft-* 任务不可标 done。

---

## 5. weight 量化公式（v3 新增，便于对账）

每个节点的实测 weight = 5 维度评分加总（每维 0-3 分，总分 0-15，归一化到 1-10）：

| 维度 | 0 分 | 1 分 | 2 分 | 3 分 |
|---|---|---|---|---|
| **色对比强度** | 同灰阶 | 弱对比（≤2.5）| 标准（2.5-4.5）| 强对比（≥4.5）|
| **尺寸/字号比** | < 0.5×全屏均值 | 0.5-1× | 1-1.5× | ≥ 1.5× |
| **字重对比** | 与同类一致 | 略重 (+100) | 明显重 (+200) | 突出 (+300/700) |
| **装饰密度** | 无装饰 | 1 处微装饰 | 2-3 处装饰 | 复合装饰（4+）|
| **动效存在** | 静态 | hover 微反馈 | hover+pressed | hover+pressed+focus+spring |

实测 weight = ⌈(总分 / 15) × 10⌉

**用法**：声明 weight=9 的 SubmitBtn，实测必须 ≥ 8 才合格。声明 weight=2 的 FooterLink，实测应在 [1, 3]，太低（实测 0）= 没设计。

**对账（B2 工具）**：`query/visual_weight_audit` 返回 declared 与 measured 差，超 1 → 报警。

---

## 6. componentBudgets 表落库（升级）

```jsonc
screen.meta.design.componentBudgets = [
  {
    nodeId: "n9-SubmitBtn",
    role: "主角-CTA",
    weight: 9,
    minSignals: 4,            // ★ v3 新增：本节点最低识别信号数（来自 §4 阈值表）
    allowedTools: ["主色填充","圆角","阴影","字重","spring 动效","focus 光晕","loading spinner"],
    decorationDensity: "密"
  },
  {
    nodeId: "n42-PolicyCheckbox",
    role: "工具-勾选",
    weight: 2,
    minSignals: 3,            // ★ 必须 ≥3：自绘外框 + 选中底色 + 勾
    allowedTools: ["自绘外框","选中底色","勾(SVG/unicode)","焦点光晕"],
    decorationDensity: "极少",
    workaroundPattern: "wrapper-label"   // ★ v3：见 pitfalls/web-rendering.md
  },
  {
    nodeId: "n14-BgBlobTopRight",
    role: "氛围-装饰",
    weight: 2,
    minSignals: 1,
    allowedTools: ["径向渐变（不要字符串内嵌 token，见 pitfalls/render-capabilities.md）"],
    decorationDensity: "中"
  }
]
```

---

## 7. 溢出调整（仅在总权重 > 30 时使用，不再是教学主线）

```
sum(componentBudgets[*].weight) ≤ 30  → 不必调整
sum > 30 → 削减优先级：
  1. 优先合并同类节点（多个 footer link → 单个 FooterLinks group）
  2. 削减允许手段（"主色填充+渐变+发光" → "主色填充+spring 动效"）
  3. 删氛围装饰节点（最先牺牲）
  4. 降配角 weight（5→4 时容器特征仍要够 § 4 阈值）

⚠️ 削减不能突破 §4 最低识别阈值。
```

**与 v2 不同**：删了"登录页 sum=43 → 多次削减 → 28"的反复推演——那种叙事让 AI 把"省着用"作为主线。v3 把削减做成"溢出补救工具"。

---

## 8. 视觉预算与装饰决策的连动（保留）

```
剩余预算 = 30 - sum(业务节点 weight)
剩余 ≥ 8  → 富裕：可用 2-3 个装饰节点 + 主装饰渐变 + 角落溢出
剩余 4-7  → 中等：1-2 个装饰节点 + 简单渐变背景
剩余 1-3  → 紧张：0-1 个装饰节点 + 纯色背景
剩余 ≤ 0  → 必须削业务侧 weight 让出装饰空间（不要"业务挤掉装饰" → 失去氛围）
```

---

## 9. L2 组件级深钻——自查清单（升级）

写每个节点的 styles + meta.design 之前回答：

```
□ 我在 componentBudgets 表里 weight 多少？role 是什么？minSignals 多少？
□ 我的 styles 信号数是否 ≥ minSignals？（v3 新增，A2 关键）
□ 我的视觉手段是否在 allowedTools 内？
□ 我的 visualStates 数量是否匹配 role 阈值？（v3 新增，参 §4）
□ native HTML 控件？→ 必读 pitfalls/web-rendering.md，确认是否需要 wrapper 模式
□ 复合控件（tab/stepper/accordion）？→ 必读 pitfalls/composite-patterns.md
□ 装饰节点？→ 装饰系统单一族（不混杂多种装饰风格）
□ 我需要 materialSpec 吗？（weight ≥ 7 主角往往需要素材；装饰按需）
```

---

## 10. 跨屏视觉密度均衡（D-audit 用，保留）

```
登录页 ~28（高情感+营销引导）
列表页 ~22（信息密度高但单元素轻）
表单页 ~25
设置页 ~18（功能型）
详情页 ~26
引导页 ~30（情感最重）
```

红线：相邻屏总权重差 > 10 → 风格断层，D-audit 时核对。

---

## 11. md 落地（升级）

```markdown
## 组件视觉预算（D-X-budget）

### 1. 节点权重清单
[列每节点 + weight + role + minSignals + allowedTools + decorationDensity + workaroundPattern]

### 2. 金字塔结构核查
| 层 | 节点 | 总权重 | 占比 |
|---|---|---:|:---:|
| 主角层 | SubmitBtn(9), BrandLogo(7) | 16 | 57% |
| 配角层 | FormCard(4) | 4  | 14% |
| 工具层 | Phone(2), Cred(2), Mode(2), Get(1), Eye(1), Check(2), Footer(2) | 12 | ~|
| 氛围层 | BgBlob(2) | 2  | 7%  |
| 总和 | — | 28 | ✅ ≤30 |

主角差 配角 = 9-4 = 5 ≥ 2 ✅
配角差 工具 = 4-2 = 2 ≥ 2 ✅
主角节点数 = 2 ≤ 2 ✅

### 3. 各节点 minSignals 核查
[基于 §4 阈值表逐项核对]

### 4. ★ 沉淀到 schema 的结论
[完整 componentBudgets 数组 jsonc]
```

---

## 12. 红线汇总

- ❌ R-PYRAMID-01：金字塔结构不成立
- ❌ R-RECOG-01：任一节点未达 §4 最低识别阈值
- ❌ R-BUDGET-01：sum(weight) > 30
- ❌ R-BUDGET-02：主角节点数 > 2
- ❌ 工具角色未声明 workaroundPattern 但是 native 不可定制控件
- ❌ 装饰节点声明用 `background: "...$token:..."` 字符串内嵌 token（见 pitfalls/render-capabilities.md）
- ❌ 写 `D-X-craft-*` 时不回头看 budget → 必然出现样式与角色错位
