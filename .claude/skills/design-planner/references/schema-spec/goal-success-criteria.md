# schema-spec：goal-success-criteria 接口

> 适用任务：`D-X-design-goals`（写 successCriteria）/ `D-X-G<N>-craft` 自审段（核对 successCriteria）/ `D-X-self-review-by-goals`（整屏对账）。
>
> 任务目的：精确定义 successCriteria 的写法 + 可视判据三类标准。

---

## 1. successCriteria 接口定义

```typescript
interface DesignGoal {
  id: string
  statement: string
  whyMatters: string
  impactMode: ImpactMode
  successCriteria: string[]      // ≥ 3 条
  priority: "P0" | "P1" | "P2"
  measureMethod?: string
  forbiddenSignals?: string[]
}
```

每条 `successCriteria` 是一段中文判据。形式上是 string,但内容必须满足以下三大类之一。

---

## 2. 可视判据三大类

### 2.1 类别 1：色彩判据

色彩判据用于 mood-conveyance / brand-recognition / trust-signal 类目标。

#### 写法

```
"<元素或位置>色 <色彩属性> <比较运算> <阈值>"

例:
- "屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt"
- "SubmitBtn 背景色与 textPrimary 对比度 APCA ≥ 60"
- "错误态字色与 #FF0000 距离 ≥ 30 pt（避免暴击）"
```

#### 核对方法

```
1. Bash 调 screenshot-screen.mjs 取截图
2. Read 截图后,在元素位置取像素采样（avg of 5x5 patch）
3. 计算 RGB 距离 √((R-r)² + (G-g)² + (B-b)²)
4. 与阈值比较 → pass / fail
```

#### 像素级观察示例

```
"取屏底中心 (x=375, y=600) 像素 RGB ≈ (248, 244, 238),
 距 #FFFFFF 各通道差 7/11/17 → 距离 21pt > 5pt → ✅ pass"
```

---

### 2.2 类别 2：尺寸 / 占比判据

尺寸判据用于 cta-clarity / brand-recognition / hierarchy 类目标。

#### 写法

```
"<元素>占<参考>面积 / 字号 / 高度 / 距离 <比较> <阈值>"

例:
- "BrandLogo 占首屏面积 ≥ 5%"
- "SubmitBtn 字号 ≥ 16px"
- "CTA 与最近邻居 weight 差 ≥ 4"
- "标题字号 / body 字号比 ≥ 1.4"
```

#### 核对方法

```
1. 取截图后估算视觉边界（左上 x1,y1; 右下 x2,y2）
2. 计算尺寸 / 占比
3. 与阈值比较
```

#### 像素级观察示例

```
"BrandLogo 视觉边界约 (315, 80) - (435, 200),尺寸 120×120,
 首屏 viewport 750×1334, 面积占比 14400/1000500 ≈ 1.44% < 5% → ❌ fail"
```

---

### 2.3 类别 3：视觉权重 / 层级判据

权重判据用于 cta-clarity / hierarchy 类目标。

#### 写法

```
"<元素>视觉权重（按 weight 公式计算）<比较> <阈值>"
"视觉层级 N 层金字塔成立"

例:
- "SubmitBtn 与 GetCodeBtn 视觉权重差 ≥ 4"
- "信息层级 3-4 层金字塔成立,每层节点数比上层多 ≥ 1.5×"
- "字重梯度跨 ≥ 200（如 400/600）"
```

#### 核对方法

权重 weight 由以下因子加权得出（每项 0-3,总和 0-15）：

```
weight ≈ f(色对比强度) + f(尺寸比) + f(字重差) + f(装饰密度) + f(动效)

色对比强度:
  - 主色填充 vs 透明底: 3
  - 主色字 vs 默认字: 2
  - 不同字色: 1
  - 同字色: 0

尺寸比:
  - 比邻居大 ≥ 2x: 3
  - 比邻居大 1.5-2x: 2
  - 比邻居大 1.2-1.5x: 1
  - 同尺寸: 0

字重差:
  - ≥ 200 (400 vs 600): 3
  - 100-200 (400 vs 500): 1
  - 0: 0

装饰密度:
  - 含光晕 / shadow / 渐变: 2-3
  - 无装饰: 0

动效:
  - hover 显著效果: 1
  - 无: 0
```

---

## 3. successCriteria 反例（禁止）

### 3.1 抽象描述

```
❌ "主题契合度高"
❌ "现代化"
❌ "舒服"
❌ "干净"
❌ "协调"
❌ "看起来不错"
❌ "符合 minimal+flat 风格"
```

理由: 无法从截图客观判断 pass / fail → R-GOAL-CRITERIA 拒。

### 3.2 抽象指令

```
❌ "让用户感觉到温度"
❌ "传达校园氛围"
❌ "突出 CTA"
```

理由: 是目标的描述,不是判据。判据要回答"如何看到达成"。

### 3.3 单元素 css 微调

```
❌ "SubmitBtn 圆角 12px"
❌ "屏底色 = #F8F4EE"
```

理由: 这不是判据,是改动指令——属于 goalElementMap.changes 范畴,不是 successCriteria。

---

## 4. forbiddenSignals 写法

forbiddenSignals 用反例方式补充 successCriteria。出现这些信号即视为 fail。

#### 写法

```
"<具体信号>"

例:
- "屏底为 #FFFFFF 或与之差 ≤ 1pt"
- "灰阶占比 > 40%"
- "出现任何直角元素 (border-radius < 4px)"
- "装饰元素 alpha < 20%"
- "BrandLogo 仍是占位虚线 / 无 materialProjectId"
- "Checkbox 视觉为黑色 native 方块"
```

#### 核对方法

与 successCriteria 同——三大类。但反过来：触发 → fail,未触发 → ok。

---

## 5. 各 impactMode 推荐 successCriteria 模板

### 5.1 mood-conveyance（氛围传递）

推荐 ≥ 3 条 + ≥ 2 forbidden：

```
[
  "屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt",
  "出现 ≥ 2 个具象 <主题> 元素表征",
  "首屏视线热点落在 <氛围载体元素> 而非 SubmitBtn 主色块"
]
forbiddenSignals: [
  "屏底 #FFFFFF 或与之差 ≤ 1pt",
  "灰阶占比 > 40%",
  "装饰 alpha < 20%"
]
```

### 5.2 cta-clarity（CTA 主角化）

```
[
  "CTA 与最近邻居视觉权重差 ≥ 4",
  "CTA 字号 ≥ 16px,周围至少 16px 留白",
  "CTA 在 default / hover / pressed / loading / disabled 5 态视觉差异均 ≥ 显著"
]
forbiddenSignals: [
  "CTA 与邻居权重差 < 2 (主从不分明)",
  "CTA 在 disabled 态仍显示主色填充"
]
```

### 5.3 trust-signal（信任传递）

```
[
  "<关键控件>视觉为'圆润主色对勾'非'灰冷方框 / 黑色 native'",
  "状态切换有 ≥ 200ms transition",
  "错误色与 #FF0000 距离 ≥ 30 pt"
]
forbiddenSignals: [
  "错误态用纯红 (#DD0000 或更冷红) 暴击",
  "状态切换无 transition (瞬间切换)"
]
```

### 5.4 hierarchy（信息层级）

```
[
  "信息层级 3-4 层金字塔成立",
  "主标题字号 / body 字号比 ≥ 1.4",
  "字重梯度跨 ≥ 200"
]
forbiddenSignals: [
  "层级超过 5 层 (眼花)",
  "主标 与 body 字重相同"
]
```

### 5.5 state-feedback（状态可见）

```
[
  "状态切换前后截图像素差 ≥ 3% (常规 tab) / ≥ 50% (整屏分支)",
  "切换有 ≥ 250ms transition",
  "切换前后涉及节点 ≥ 2 个 (非单点切换)"
]
forbiddenSignals: [
  "切换前后无视觉变化 (像素差 < 1%)",
  "切换瞬间 (无 transition)"
]
```

### 5.6 brand-recognition（品牌识别）

```
[
  "BrandLogo 真画 (非占位虚线 / 文字 placeholder),materialProjectId 非空",
  "BrandLogo 占首屏面积 ≥ 5%",
  "主色 (theme.primary) 应用 4-6 处"
]
forbiddenSignals: [
  "BrandLogo materialProjectId 空",
  "主色应用点 < 3 (品牌识别度低)",
  "主色应用点 > 8 (强调失效)"
]
```

### 5.7 decoration-storytelling（装饰承载故事）

```
[
  "≥ 2 处装饰呼应 mood 关键词",
  "装饰系统单一族 (soft-glow / illustration / 任选 1)",
  "装饰透明度 ≥ 20%"
]
forbiddenSignals: [
  "装饰族混杂 (光斑 + 几何 + 插画 同时出现)",
  "装饰 alpha < 20% (接近不可见)"
]
```

---

## 6. 一句话总结

> **successCriteria = 截图后能逐条客观核对的判据。色彩 / 尺寸 / 权重三类。任何"主题契合 / 现代化 / 舒服"等抽象描述都是 R-GOAL-CRITERIA 拒。**

---

## 7. 阈值定法 — 上一个台阶原则 ★

### 7.1 反例：贴合现状的阈值

❌ 错（让 schema 残留自动达标）：

```
现状: schema.装饰 alpha = 12% (隐形不可见,但形式上有装饰)
SC 写: "装饰 alpha 8-15% 节制不喧宾"
判定: 12% ∈ [8,15] → ✅ pass
后果: SC 通过,但视觉上装饰几乎看不见,设计目标"校园温度氛围"未达成

现状: 屏底 #FCFCFD,距 #FFFFFF 4.6pt
SC 写: "屏底 RGB 距 #FFFFFF ≥ 5pt(暖白米 + 装饰区融合达标)"
判定: 4.6 + 装饰区融合 ≈ 5 → ✅ pass
后果: SC 通过,但用户截图屏底看起来纯白,温度感为零
```

这是 R-CRITERIA-ADAPTED 红线场景：阈值贴合现状 = 改动空间为零 = 视觉永远不可能突破。

### 7.2 正确做法：上一个台阶原则

```
Step 1: read 当前 schema 状态(作为 lower bound 参考)
        e.g. 装饰 alpha 12%, 屏底距 #FFFFFF 4.6pt

Step 2: 从 designGoal.statement 反推"达成目标真正需要的状态"(作为 target)
        e.g. "校园温度氛围" → 装饰必须可见,目测可分辨色相 → alpha ≥ 20%
              "暖白米感" → 屏底必须有可分辨暖度,与白有明显距离 → ≥ 15pt

Step 3: 阈值 = max(target, current + 显著台阶)
        e.g. SC: "装饰核心 alpha 20-35% 可见有氛围"(non-trivial 提升)
              SC: "屏底装饰区 RGB 距 #FFFFFF ≥ 15pt"
              forbidden: "装饰 alpha < 15% 接近不可见"
```

### 7.3 反向自检（Phase B 写完每条 SC 必跑）

```
对每条 SC 自问:
  "如果当前 schema 残留状态自动达标这条 SC,我满意这个视觉吗?"
  
  ✅ 满意 → 阈值合理,过
  ❌ 不满意 → 阈值定低了,触发 R-CRITERIA-ADAPTED,提升一档台阶重写
  
连续 ≥ 2 条都不满意 → 整组 SC 都被现状合理化,Phase B 重做整个 designGoal
```

### 7.4 阈值典型台阶（参考）

| 维度 | 残留状态 | 推荐 target 阈值 | 显著台阶幅度 |
|---|---|---|---|
| 屏底色距白 | 0-5pt | ≥ 15pt | +10pt |
| 装饰核心 alpha | 5-15% | ≥ 20% | +5%-10% |
| CTA 与邻居权重差 | 1-3 | ≥ 4 | +2 |
| BrandLogo 占首屏 | 1-3% | ≥ 5% | +2% |
| 字号梯度比 | 1.0-1.2 | ≥ 1.4 | +0.2 |
| 状态切换像素差 | < 1% | ≥ 3% (常态) / ≥ 50% (整屏分支) | +2% / +49% |
| transition 时长 | < 100ms | ≥ 200ms | +100ms |
| 错误色距纯红 #FF0000 | 0-30pt | ≥ 30pt | +30pt |

详见 `methodology/14-anti-kpi-thinking.md` §3 现状合理化陷阱。

---
