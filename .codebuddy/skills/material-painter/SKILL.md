---
name: material-painter
description: 使用 MCP canvas 工具在素材工程画布上绘制矢量图形（图标/装饰/品牌/插画），并通过 export_and_apply 导出为 PNG 应用到设计节点。当需要绘制图标、装饰性背景、品牌素材、插画等视觉资产时触发。与 page-builder（页面搭建）互补：本技能关注素材绘制和导出，页面结构需求由 page-builder 处理。
---

# 素材绘制 Skill（material-painter）

根据设计规划（design-planner）的素材清单或用户提供的参考图，使用 MCP 设计工具链绘制和应用素材。

**支持的素材类型**：
- **Icon（功能性）** — 导航图标、操作图标、状态图标
- **Decoration（装饰性）** — 背景光晕、几何线条、渐变色块、波纹纹理
- **Brand（品牌性）** — Logo、品牌标识
- **Illustration（情感性）** — 空状态插画、引导插画

---

## 核心架构模型

素材系统由三层组成，每层有**不变量（invariant）**。所有规则从 invariant 推导。

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: Canvas（素材工程画布）                               │
│  职责: 绘制矢量图形 → 导出为 PNG                              │
│  Invariant:                                                   │
│    I-1: 参考框尺寸 = 目标节点渲染尺寸（1:1 对应）             │
│    I-2: add_object 的 x/y 是画布绝对坐标 = rfx + localX      │
│    I-3: 导出只裁剪参考框范围，框外内容丢弃                    │
│    I-4: 画布 backgroundColor 必须 transparent，否则 PNG 有底色 │
│    I-5: default 白框必须隐藏（set_visibility false）           │
│    I-6: group 不被服务端展开 → 不用 group                     │
│    I-7: textbox 渲染不稳定 → 文字/符号用 path(pathData)       │
│    I-8: pathData 坐标是相对于对象 viewBox(0,0,width,height)的 │
│         不是画布绝对坐标；对象的 x/y 确定它在画布中的位置     │
│    I-8b: pathData 只支持 M/L/H/V/C/A/Z 命令（空格分隔格式）  │
│          ❌ Q/q/T/t 不被服务端渲染！会导致导出空白            │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Bridge（export_and_apply 桥梁）                     │
│  职责: 把 PNG 写入节点 CSS background-image + 建 slot        │
│  Invariant:                                                   │
│    I-9:  applyMaterialDesign 是追加模式——不清旧值就叠加       │
│    I-10: 它会写入 9 个样式属性（含 border:none, boxSizing）   │
│    I-11: 因此目标节点必须是纯展示节点（无装饰职责）          │
│    I-12: 应用后必须 reset 全部 background-* 再设干净单值      │
├──────────────────────────────────────────────────────────────┤
│  Layer 3: Node（设计节点 DOM）                                │
│  职责: 布局 + 装饰 + 内容展示                                 │
│  Invariant:                                                   │
│    I-13: 单一职责 — 容器=布局+装饰，内容节点=纯展示          │
│    I-14: 素材必须应用到内容节点，永远不应用到容器节点         │
│    I-15: 渲染器读 props.textContent，不读 props.children     │
│    I-16: textContent 和 children 独立存储，清一个不够         │
└──────────────────────────────────────────────────────────────┘
```

**遇到任何新场景，先问"违反了哪个 invariant？"——答案自然浮现。**

---

## 主题门禁（最高优先级）

执行任何设计操作前：
1. `theme / check` → `customized=false` → **停止！** 引导用户制定主题
2. `theme / get` → 获取 tokens + decorationRules + **iconSpec**

**图标绘制参数全部从 iconSpec 读取**（零自由度、零硬编码）：
- `iconSpec.style` → 决定 stroke 还是 fill
- `iconSpec.stroke.width/linecap/linejoin` → 直接传入 add_object
- `iconSpec.colors.default` → 解析 $token 引用后作为 stroke/fill 色值
- `iconSpec.sizing.containerRatio + minPadding` → 计算 pathData 绘图区域
- `iconSpec.consistency` → 控制复杂度和风格一致性

---

## ★ 读取装饰系统策略（v3.2 新增，最高优先级）

**material-painter 不是"自由画家"，必须按 brief 指定的装饰系统策略设计素材。**

### 收到 brief 后、开始绘制前，必须读对应的 `decoration-systems/*.md`：

| brief 指定 `decorationSystem` | 必须读取的文件 | 关键内容 |
|------------------------------|-----------------|---------|
| `soft-glow` | `decoration-systems/soft-glow.md` | 光斑视觉特征、CSS 配方、多光斑组合、光斑色规则、红线 |
| `geometric-line` | `decoration-systems/geometric-line.md` | 几何线条视觉特征、CSS 配方、几何形类型、红线 |
| `illustration` | `decoration-systems/illustration.md` | 插画视觉特征、插画类型、规模约束、红线 |
| `texture` | `decoration-systems/texture.md` | 纹理视觉特征、CSS 实现、纹理强度规则、红线 |
| `organic-curve` | `decoration-systems/organic-curve.md` | 有机曲线视觉特征、blob 形状特征、红线 |

### 读取后必须遵循：

1. **视觉特征**：素材必须符合该装饰系统的视觉特征（如 `soft-glow` 必须是圆形/椭圆/不规则圆润 blob，不能用直线）
2. **CSS 配方**：优先使用文件中提供的 CSS 配方（如 `soft-glow` 的径向渐变配方）
3. **红线**：绝对不能违反该装饰系统的红线（如 `soft-glow` 不能用直线/网格/几何形状）
4. **适用场景**：素材必须用于该装饰系统的适用场景（如 `illustration` 不能用于 trust 场景）

### brief 未指定 `decorationSystem` 时的处理：

1. 从 `theme.decorationRules` 推导
2. 从 `visualStrategy.decorationSystem.family` 读取
3. 如果都无法推导，提示 design-planner 补充

---

## 素材设计原则

**设计思考三步**（禁止"放字母/emoji 凑数"）：
1. **概念提取** — 功能名→视觉隐喻
2. **构成规划** — 底层(底板)+中层(path描边)+顶层(装饰)
3. **风格适配** — 从 decorationRules 推导参数

---

## ★ Brief 入场契约（v3.1 新增，最高优先级）

**material-painter 是专业画家，不是画板代笔**。上游（design-planner）应该只给**目标 + 概念 + 约束**，**不应该给施工图**。

### 收到 brief 时先做边界扫描

| brief 含以下任一项 → "施工图 brief"，必须拒收处理 |
|---|
| ❌ pathData 字符串（如 `M 180 120 C ...`）|
| ❌ 具体坐标（如 "圆心 (120, 120)" / "起点 (a, b)"）|
| ❌ strokeWidth 像素值（如 "stroke=18"）|
| ❌ hex 色值（如 #5B6CFF；应该用 token 引用名让你自己 theme/get 解析）|
| ❌ 构图层数清单（如 "3 层：①底层圆角矩形 fill=X stroke=Y ② 中层 path ③ ..."）|
| ❌ safe-zone 像素值（应由你按 iconSpec 推导）|
| ❌ rect/path/ellipse 选型（应由你按内容决定）|

### 拒收处理流程

1. **提示上游**：「这个 brief 含施工细节（列出具体哪几条），违反 v3.1 边界契约 §5.5。我会忽略这些细节，按设计思考三步自己决策。」
2. **从 brief 中提取真正有效的"目标层"信息**：
   - 视觉目标（一句话）
   - concept.md 灵魂句 + 关键词 + mood board
   - 装饰系统单一族
   - 60-30-10 调色定位
   - 节点尺寸 + 上下文
   - token 池引用名
   - 失败案例（如有）
3. **跑「设计思考三步 + 7 步绘制工作流」**，所有构图决策**由你做**：
   - Step 概念提取 — 这素材的视觉隐喻是什么（字标 / 几何 / 抽象 / ...）
   - Step 构成规划 — 底/中/顶层各画什么；是否需要边框/阴影/光晕
   - Step 风格适配 — 笔触粗细 / 色比 / 留白
   - Step 0b 尺寸决策 — 参考框 / stroke / safe-zone 像素值

### 完成后回报必含

- materialProjectId / 导出 PNG URL（标准产物）
- **★ 设计思考三步**（让 design-planner 知道你怎么想的，便于"目标对账"）
- **★ 关键差异化决策**（特别是 brief 给了失败案例时，写明你怎么避免再犯）

### 反模式案例（v3.1 实战教训）

design-planner v1 给的 brief：
```
- 整张 240×240 圆角矩形（rx=ry=16）
- 主色 1.5px 描边
- 中心字母 C，圆心 (120, 120) 半径 60，stroke=18
- safe-zone 24px padding
```

material-painter 错误做法：按图施工 → C 开口朝右导致视觉重心偏左 + 1.5px 边框缩到 120×120 几乎不可见。**这都是构图问题，painter 本可以避免**，但 design 把决策抢了，painter 没拒收 brief 直接执行 → 共同失败。

material-painter 正确做法：扫描 brief → 发现含 pathData/坐标/strokeWidth → 提示上游边界违规 → 从 brief 提取目标层信息 → 自己跑设计三步 → 可能选「主色填充背景 + 白字 C」（避免融合），或「微弱阴影 + 暖白底」，或「primaryLight 渐变底 + 主色字」——这些选择由你专业判断。

---

## 工作流：Canvas 绘制流程（7 步不可跳步）

| Step | 操作 | 满足 Invariant | 跳过后果 |
|------|------|---------------|---------|
| 0 | query/screen_schema 获取目标节点 | I-1, I-13 | 尺寸错/应用到容器 |
| 0b | **尺寸设计决策** — 确定 IconDiv + 参考框尺寸 | I-1 | 模糊/太小 |
| 1 | material_project/create | — | — |
| 2 | canvas/resize_reference_frame | I-1 | 导出尺寸错误 |
| 3 | get_canvas_info + set_background_color(transparent) + 隐藏 default | I-2, I-4, I-5 | 坐标错+白底 |
| 4 | add_object 绘制 | I-2, I-3, I-6~I-8 | 内容缺失/飞出 |
| 5 | get_schema 验证 | I-3 | 重复对象 |
| 6 | export_and_apply | I-9~I-11 | 样式覆盖 |
| 7 | reset + 设干净样式 + 清文字 | I-9, I-12, I-15, I-16 | 多值叠加/文字残留 |

### Step 0: 节点调查 & 职责判定

```
query / screen_schema → 找目标节点 → 记录 width/height/当前样式
→ 判断节点职责（I-13/I-14）：
  有 border/backdropFilter/backgroundColor/boxShadow → 容器节点
    → 在内部创建纯净 IconDiv 作为应用目标
  无装饰样式 → 纯内容节点 → 可直接应用
```

### Step 0b: 尺寸设计决策

**在创建素材工程之前，必须确定 IconDiv 和参考框的尺寸。**

规则：**IconDiv 尺寸 = 容器尺寸 × 0.7~0.8**（让图标填充容器主体区域）

| 容器尺寸 | IconDiv 尺寸 | 参考框 | 导出 2x | 说明 |
|---------|-------------|--------|---------|------|
| 24×24 | 20×20 | 20×20 | 40×40 px | BottomTab 图标 |
| 32×32 | 24×24 | 24×24 | 48×48 px | QuickGrid 图标 |
| 34×34 | 20×20 | 20×20 | 40×40 px | 圆形按钮内图标 |
| 48×48 | 36×36 | 36×36 | 72×72 px | 大图标 |
| 64×64 | 64×64 | 64×64 | 128×128 px | Logo（无容器） |

**关键**：参考框越大，pathData 绘制空间越大，线条渲染越清晰。
- 最小建议参考框：**20×20**（低于此值线条会模糊）
- strokeWidth 建议：参考框 20~24 时用 1.5，24~36 时用 1.5~2.0

**禁止**：在 32×32 容器中创建 18×18 的 IconDiv — 图标太小且模糊。

### Step 3: 画布准备（3 件事缺一不可）

```
1. canvas/get_canvas_info → 记录 rfx, rfy, refW, refH, defaultElementId
2. canvas/set_background_color → "transparent"（I-4）
3. canvas/set_visibility → defaultElementId, visible=false（I-5）
```

### Step 4: 绘制规则

```
坐标: x = rfx + localX, y = rfy + localY（I-2）
path 的 pathData: 坐标相对于对象自身的 viewBox(0,0,width,height)（I-8）
  → pathData 中的点范围应在 0~width, 0~height 之内
图层: 先添加=底层，后添加=顶层
不用 group（I-6），文字用 path 不用 textbox（I-7）
```

**图标绘制必须从 ThemeConfig.iconSpec 读取参数**（零自由度）：

```
theme / get → iconSpec = {
  style,                      // 决定用 stroke 还是 fill
  stroke.width,               // 直接用作 strokeWidth 参数
  stroke.linecap,             // 影响 pathData 端点设计
  stroke.linejoin,            // 影响 pathData 转角设计
  colors.default/active/inactive,  // 解析 $token 引用后用作 stroke/fill 色值
  sizing.containerRatio,      // 绘图区域 = refFrame × containerRatio
  sizing.minPadding,          // pathData 坐标必须 ≥ minPadding 且 ≤ (size-minPadding)
  consistency.targetComplexity, // 控制笔画数量
  consistency.geometricOnly   // 是否只用直线+圆弧
}
```

**绘图区域计算**：
```
参考框尺寸 = 目标节点尺寸（如 32×32）
padding = max(iconSpec.sizing.minPadding, 参考框 × (1-containerRatio) / 2)
绘图区域 = (padding, padding) ~ (参考框-padding, 参考框-padding)
pathData 所有坐标必须落在此区域内
```

### 不同素材类型的绘制策略

#### Icon（功能性素材）
- 全部参数从 `iconSpec` 读取
- 纯 path + stroke，透明背景
- 同组图标视觉重量统一

#### Decoration（装饰性素材）

装饰素材通常**不需要** containerRatio 限制（可填满参考框），且边缘可柔化。

**基础绘制手法**：

| 装饰类型 | 画布对象 | 关键参数 |
|---------|---------|---------|
| 光晕/光斑 | `ellipse` | fill: 径向渐变(中心色→透明), 无 stroke |
| 几何线条 | `path` | stroke: 低透明度色, strokeWidth: 0.5-1.5px |
| 渐变色块 | `rect` | fill: 线性/径向渐变, rx/ry 圆角 |
| 波纹/弧线 | `path`(C命令) | stroke: 渐变透明度, 无 fill |
| 星星/闪烁 | `path`(十字形) | stroke + fill, 小尺寸(3-6px) |
| 噪点/纹理 | 多个小 `ellipse`/`rect` | 随机位置, 1-2px, 极低透明度 |

**裁剪/溢出装饰的绘制技巧**：

```
核心原理: 画布参考框就是"裁剪窗口"——框外的内容不会导出。
所以"截断效果" = 把图形画在参考框边缘，一部分在框内，一部分在框外。

示例: 右上角溢出的半圆
  参考框: 200×150 (rfx=200, rfy=125)
  圆心: (rfx+200, rfy+0) = (400, 125) — 在参考框右上角外
  半径: 80
  效果: 只有左下四分之一弧线可见

示例: 底部弧线分区
  参考框: 375×200
  path: 从 (0, 180) 画弧线到 (375, 160)
  fill: 下方区域用背景色填充
  效果: 页面上下区域的弧线分割

示例: 截断矩形色块
  参考框: 375×812 (全屏)
  rect: x=rfx-40, y=rfy+100, width=200, height=300
  只有右侧 160px 在参考框内 → 看起来从左边"伸进来"
```

**不规则色块(Blob)绘制**：
```
使用 path + C(三次贝塞尔) 画自由曲线闭合图形:
  M 起点 C cp1 cp2 端点 C cp3 cp4 端点 ... Z
  fill: 渐变色(primary 10-20%)
  无 stroke

控制点规律: 让曲线圆滑流动，避免尖角
  - 相邻控制点方向一致 → 圆滑
  - 控制点距离 = 曲线段长度的 1/3 → 自然弧度
```

**色彩过渡实现**：
```
方案1 — 渐变 fill:
  rect fill="linear-gradient(180deg, #6366f1 0%, transparent 100%)"
  → 颜色自然淡出

方案2 — 多层叠加:
  底层 rect(浅色, 全宽)
  上层 ellipse(主色, 低透明度, 大模糊半径)
  → 叠加后产生自然过渡

方案3 — 多段 path:
  同一条路径不同区域用不同 fill 不可行(单 path 只有一个 fill)
  → 拆为多个 path，相邻区域颜色渐变
```

**装饰素材的应用方式**：
```
图标(Icon) → export_and_apply 到独立 IconDiv (backgroundImage)
装饰(Decoration) → 两种方式:
  1. 如果装饰独立于内容 → export_and_apply 到独立的装饰 div (position: absolute, z-index: -1)
  2. 如果装饰就是背景 → export_and_apply 到页面/容器的背景层
  
关键: 装饰 div 必须在 DOM 中位于内容之下(z-index 更低)
```

#### Brand（品牌性素材）
- Logo 通常由多个 path 组合
- 颜色使用品牌色（tokens.colors.primary/secondary）
- 需要多个尺寸变体时，创建多个素材工程

#### Illustration（情感性素材）
- 风格与 iconSpec.style 一致（outline 图标配 outline 插画）
- 比图标复杂，允许使用 15-30 个 path 对象
- 颜色可以比图标丰富（使用 primary + secondary + 辅助色）
- 参考框通常较大（120-200px），绘制空间充裕

### Step 7: 导出后清理

```
7a. style/reset → ["background", "backgroundImage", "backgroundSize",
     "backgroundPosition", "backgroundRepeat", "backgroundOrigin",
     "backgroundClip", "boxShadow"]
7b. style/update → { backgroundImage: "url(PNG)", backgroundSize: "contain",
     backgroundPosition: "center", backgroundRepeat: "no-repeat" }
7c. component_prop/update_props → { textContent: "", children: "" }
```

### ⚠️ 条件素材：只 export 不 apply

当 design-executor 委托绘制的素材标注了 `应用条件`（如"只在 success 态显示"），流程变为：

```
Step 6 变体: export_and_apply 到一个临时纯展示 div（不是最终目标节点）
  → 记录导出的 imageUrl
  → 返回 imageUrl 给 executor
  → executor 负责将 URL 写入目标节点的对应 visualState

为什么不直接 apply 到目标节点？
  因为 applyMaterialDesign 会覆盖 9 个样式属性（I-10），
  如果素材只在某个状态使用（如 success），直接 apply 会摧毁节点的默认态样式。

如何识别"条件素材"？
  design-executor 在委托时会明确标注:
    应用模式: 条件应用
    条件: "{{state.view.submitState === 'success'}}"
  看到此标注 → 不 apply 到目标节点！
```

---

## 节点结构模式

**模式判定**（Step 0 完成后执行）：

问："如果 export_and_apply 覆盖此节点的 border/bg，最终视觉效果是否还是正确的？"
- **是** → 模式 C（直接应用）— 节点本身就是最终渲染载体
- **否** → 模式 A/B（需要子节点）— 节点的装饰必须独立保留

| 场景 | 判定 | 模式 | 原因 |
|------|------|------|------|
| GridIcon (32×32 带渐变+border) → 图标替代整个渐变 | 装饰可以丢 | C | 图标就是全部内容 |
| NotifyBtn (34×34 毛玻璃圆按钮) → 内部放铃铛 | 装饰必须保留 | A | 按钮框+图标是两层 |
| Logo (64×64 无装饰) | 无装饰 | C | 直接应用 |
| PasswordInput → suffix 眼睛 | input 不能有子元素 | B | 需兄弟定位 |

**模式 A: 容器 + 子节点**（容器装饰必须保留）
```
容器 (border, backdrop-filter)  ← 保持不动
└── IconDiv (尺寸=容器内空间×0.5~0.6)  ← 应用目标
```

**模式 B: 输入框 suffix**
```
InputGroup (position: relative)
├── input (padding-right: 44px)
└── IconDiv (position: absolute)  ← 应用目标
```

**模式 C: 直接应用**（节点就是最终渲染载体）
```
目标节点 (W×H)  ← 直接 export_and_apply
参考框 = 节点尺寸
pathData 内部留 2~3px padding（不要画到边缘）
```
优点：不会有尺寸不匹配/模糊/偏移问题
缺点：会覆盖节点已有的 border/bg（所以只在"可以覆盖"时用）

---

## 验证方法

- **PNG 文件大小**：<150B 几乎肯定是空白图（透明或纯色）
- **正常图标 PNG**：500B~3KB（有描边内容的 18-64px 图标）
- **`scripts/screenshot-screen.mjs` 截图对照**（mcp/generate_snapshots 已知 bug，必读 `../common/references/screenshot-tool.md`）
- **get_schema** 检查对象位置/重复

---

## 详细参考（按需加载）

遇到具体问题时加载以下文件：
- `references/canvas-rendering.md` — 服务端渲染能力边界表、path/pathData 坐标系详解、踩坑案例（#1图标飞出、#3编辑器偏移）
- `references/apply-bridge.md` — applyMaterialDesign 9个属性列表、追加行为详解、CSS background 原子性规则、案例#2多值叠加
- `../common/references/screenshot-tool.md` ★★ — **2026-06 新增**：素材应用到节点后用 `scripts/screenshot-screen.mjs` 拿真渲染图对照（mcp/generate_snapshots 当前有 bug）

---

## 工作产物存储

素材绘制记录存入 `.design-workspaces/<task-name>/material/`：

- `material-registry.md` — 素材清单（每完成一个素材追加一行）

```markdown
| 素材名 | materialId | 用途 | 目标节点 | 参考框 | 状态 |
|--------|-----------|------|---------|--------|------|
| Icon-Home | dd655e88-... | BottomTab首页 | nd_xxx | 20×20 | ✅ |
```

- `icon-spec.md` — 从 ThemeConfig.iconSpec 解析出的当前图标参数快照

**每次完成素材操作后，更新 registry 并同步 STATUS.md。**

## 快速参考

| 目标 | 工具 | action |
|------|------|--------|
| 页面修改样式 | style | update / batch_update |
| 页面增删节点 | element | add / remove / wrap |
| 从零画素材 | canvas | add_object |
| 导出应用 | canvas | export_and_apply |
| 修改文字 | component_prop | update_props |
| 查页面结构 | query | screen_schema |

## 工具参数

MCP 工具参数通过 `mcp_get_tool_description` 动态获取。调用前务必先查 schema。
