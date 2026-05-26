---
name: design-from-screenshot
description: 按照用户提供的参考设计截图/设计稿，使用 MCP 设计工具（canvas/style/element/material）精确还原或创建素材/页面组件。当用户提供 UI 设计参考图并要求实现/还原/绘制时触发。支持场景：按钮、卡片、图标、插画、渐变背景、页面布局等视觉元素的从图还原。
---

# 截图还原设计 Skill

根据用户提供的参考设计图，使用 MCP 设计工具链精确还原视觉设计。

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
2. `theme / get` → 获取 tokens + decorationRules

**素材风格从 decorationRules 推导**：iconStyle=outline → 描边不填充；shadow.strategy=glow → 加发光；颜色取 tokens.colors.primary/secondary

---

## 素材设计原则

**设计思考三步**（禁止"放字母/emoji 凑数"）：
1. **概念提取** — 功能名→视觉隐喻
2. **构成规划** — 底层(底板)+中层(path描边)+顶层(装饰)
3. **风格适配** — 从 decorationRules 推导参数

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

### Step 7: 导出后清理

```
7a. style/reset → ["background", "backgroundImage", "backgroundSize",
     "backgroundPosition", "backgroundRepeat", "backgroundOrigin",
     "backgroundClip", "boxShadow"]
7b. style/update → { backgroundImage: "url(PNG)", backgroundSize: "contain",
     backgroundPosition: "center", backgroundRepeat: "no-repeat" }
7c. component_prop/update_props → { textContent: "", children: "" }
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
- **generate_snapshots** 截图对照
- **get_schema** 检查对象位置/重复

---

## 详细参考（按需加载）

遇到具体问题时加载以下文件：
- `references/canvas-rendering.md` — 服务端渲染能力边界表、path/pathData 坐标系详解、踩坑案例（#1图标飞出、#3编辑器偏移）
- `references/apply-bridge.md` — applyMaterialDesign 9个属性列表、追加行为详解、CSS background 原子性规则、案例#2多值叠加

---

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
