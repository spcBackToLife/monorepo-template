# 页面完整设计模板

每个页面产出一个文件，包含以下 9 个章节，形成自包含的设计闭环。

---

## 1. 页面定位与情感

| 维度 | 定义 | 推导依据 |
|------|------|---------|
| 用户心理 | (进入此页面时用户的心理状态) | (从交互状态机/用户场景推导) |
| 情绪目标 | (A → B → C 情绪递进路线) | (对应状态机的关键转换) |
| 视觉优先级 | (元素1 > 元素2 > 元素3) | (什么最先被看到，决定视觉权重分配) |
| 上下游关系 | (从哪来/到哪去/衔接方式) | (页面间转场的情绪连续性) |
| 设计挑战 | (本页面最难做好的设计点) | (需要额外思考的核心矛盾) |

---

## 2. 整体视觉氛围

### 2.1 色调策略

- 本页主导色调及面积分配
- 与全局设计系统的关系（加强/弱化哪些Token）
- 特殊色彩需求（如捞人页偏蓝绿、商店页偏金色）

### 2.2 光影与层次

- 光源方向暗示（如渐变方向/阴影方向）
- 深度层级（哪些悬浮/哪些沉底）
- 前景-中景-背景关系

### 2.3 装饰策略

| 装饰 | 类型 | 位置 | 尺寸 | 色彩/透明度 | 动效 | 作用(为什么在这里) |
|------|------|------|------|-----------|------|-----------------|
| (名称) | 光晕/几何/有机/... | (精确位置) | (px) | (色值 at X%) | (有/无/参数) | (引导注意力/氛围/填充...) |

### 2.4 质感与肌理

- 毛玻璃使用（哪些区域/blur值/saturate值）
- 渐变使用（方向/色标/应用对象）
- 其他特殊效果

### 2.5 氛围总结

> 一句话描述进入这个页面时的整体视觉感受。

---

## 3. 结构层次设计

### 3.1 宏观布局

```
(ASCII 布局图，标注各区域及尺寸，375px 基准)
```

### 3.2 空间分配

| 区块 | 高度/占比 | 定位方式 | layoutHint |
|------|---------|---------|------------|
| (区块名) | (px或flex比例) | (sticky/fixed/flow) | (scroll-child/sticky-header/...) |

### 3.3 视觉流向

(描述用户视线的自然移动路线：进入页面后先看到X → 然后视线移向Y → 最终停在Z)

### 3.4 层叠关系

| 层级 | 包含元素 | z-index策略 |
|------|---------|------------|
| 最底层 | 背景/装饰 | 默认流 |
| 内容层 | 主要信息 | 默认流 |
| 浮动层 | FAB/Toast | position:fixed/absolute |
| 遮罩层 | Sheet遮罩/Modal | 最高 |

---

## 4. 区块详细设计

### 4.N [区块名称]

**尺寸与位置**: (width×height, position, margin/padding)

**内部元素**:

| 元素 | 标签 | 尺寸 | 样式 | 内容/绑定 |
|------|------|------|------|----------|
| (名称) | div/img/span | WxH | (关键CSS: bg/color/font/radius/shadow) | (textContent/src/绑定表达式) |

**元素间关系**: (gap/对齐方式/排列逻辑)

**微交互**: (hover/press 的即时反馈)

---

## 5. 组件设计

### 5.1 通用组件引用（Phase 3 深钻，此处只记录用法）

| 组件名 | 在本页位置 | props | 期望效果 | 特殊要求 |
|--------|---------|-------|---------|---------|
| GlowButton | 底部CTA区 | {label:"发布", variant:"primary", size:"lg", fullWidth:true} | 渐变发光大按钮 | — |

### 5.2 页面级组件索引（独立文件，存放在 `components/` 下）

仅本页使用的复合组件，每个为独立文件 `components/[name].md`，遵循 `references/component-design-template.md`。

| 组件名 | 文件路径 | 职责 | 为什么不抽为通用 |
|--------|---------|------|----------------|
| (名称) | `components/[name].md` | (一句话) | (只在本页/场景特殊/深度耦合) |

每个组件文件包含完整的：定位 + 结构 + 视觉变体×状态矩阵 + 状态转换动效 + 交互行为 + 素材索引。

---

## 6. 素材清单（索引 → 独立文件）

本页面所有素材（装饰/图标/插图）均为独立文件，存放在 `materials/` 目录下。

### 素材索引表

| 素材ID | 名称 | 类型 | 文件路径 | 用途/所属 |
|--------|------|------|---------|----------|
| I-01 | (名称) | Icon | `materials/I-01-[name].md` | (功能说明) |
| I-02 | (名称) | Icon | `materials/I-02-[name].md` | (功能说明) |
| D-01 | (名称) | Decoration | `materials/D-01-[name].md` | (氛围说明) |
| IL-01 | (名称) | Illustration | `materials/IL-01-[name].md` | (空态/引导) |

每个素材文件遵循 `references/material-design-template.md` 完整 6 节结构：
1. 设计意图（类型/来源/目标感受/Token关系）
2. 风格分析（方向/色彩/线条/同系列）
3. 构图方案（参考框/图形描述/正负空间）
4. 变体设计（各状态差异/过渡）
5. 应用效果（目标节点/附加样式/技术方案）
6. 绘制指令（canvas步骤表）

---

## 7. 状态完整矩阵

### 7.1 页面状态视觉快照

| 状态 | 视觉描述 | 与idle的差异 | 所需特殊素材 |
|------|---------|-------------|------------|
| loading | (骨架屏描述) | (哪些区域替换为占位) | — |
| idle | (正常态完整描述) | (基准) | — |
| empty | (空状态描述) | (哪些隐藏/哪些显示) | IL-xx(空状态插画) |
| error | (错误态描述) | (哪些变化) | — |
| (其他状态...) | | | |

### 7.2 状态转换动效

| 从 → 到 | 变化元素 | 动画属性 | 时长 | 缓动 | 延迟 |
|---------|---------|---------|------|------|------|
| loading→idle | 骨架 → 内容 | opacity, transform | 300ms | ease-out | — |

---

## 8. 数据与交互设计

### 8.1 数据源定义

对本页面每个数据源完整定义（示例格式）：

#### DS-[name]

| 字段 | 值 |
|------|------|
| 类型 | api / static |
| 名称/描述 | (用途) |
| 方法 | GET / POST |
| 路径 | /api/v1/... |
| autoFetchOnEnter | true / false |
| 触发方式 | screenEnter / 按钮点击 / scrollReachBottom / pullRefresh |

**请求参数**:
| 参数 | 类型 | 必填 | 来源 | 说明 |
|------|------|:----:|------|------|
| (name) | string | ✅ | state.view.xx / GPS / 固定值 / 路由参数 | (用途) |

**默认参数**: `{ "page": 1, "pageSize": 20 }`

**响应结构 TypeDef** (完整 TypeScript 类型):
```typescript
{
  code: number,
  data: {
    list: Array<{ id: string, ... }>,
    hasMore: boolean,
    total: number
  }
}
```

**Mock 场景** (≥3个，每个含**完整 responseBody JSON**):
| 场景名 | statusCode | delay | isTimeout | responseBody要点 |
|--------|-----------|-------|-----------|----------------|
| 正常有数据 | 200 | 500ms | false | list有3条，hasMore:true |
| 空数据 | 200 | 300ms | false | list:[], hasMore:false |
| 服务器错误 | 500 | 1000ms | false | {code:-1, message:"..."} |
| 超时 | — | — | true | — |

每个场景必须写出完整的 responseBody JSON（不是摘要）。

---

### 8.2 状态管理

#### stateInit.data (运行时数据，由 effect.fetch 写入)

| key | 类型 | 初始值 | 写入方式 | 说明 |
|-----|------|--------|---------|------|
| (key) | Array/Object/null | [] / null | effect.fetch onSuccess → state.set / state.append | (说明) |

#### stateInit.view (UI临时状态，交互直接写入)

| key | 类型 | 初始值 | 变更触发 | UI影响 |
|-----|------|--------|---------|--------|
| (key) | string/boolean/number | (默认值) | (什么操作改变它) | (影响哪些visibleWhen/UI变化) |

---

### 8.3 交互事件流

**这是页面功能逻辑的核心表达**——每个用户可执行的操作都对应一条完整的「操作→系统响应」链路：

| # | 用户操作 | 触发节点 | trigger | condition | actions 序列 | 状态变化 | UI 响应 |
|---|---------|---------|---------|-----------|-------------|---------|--------|
| 1 | 进入页面 | root | screenEnter | — | [effect.fetch('DS-xxx')] | data.list写入 | 骨架→内容 |
| 2 | 下拉刷新 | content | pullRefresh | — | [state.set({isRefreshing:true}), effect.fetch('DS-xxx'), state.set({isRefreshing:false})] | 刷新 | 指示器→更新 |
| 3 | 点击元素 | item | click | — | [nav.go('targetScreen', {id:item.id})] | — | 跳转 |
| 4 | 点赞 | like-btn | click | — | [effect.fetch('DS-like'), state.set({isLiked:true, likeCount:+1})] | 乐观更新 | 动画 |
| 5 | 提交表单 | submit-btn | click | {{state.view.formValid}} | [effect.fetch('DS-submit', {body:...})] | loading→success | 按钮spinner→Toast |
| ... | | | | | | | |

**actions 可用动词**(v2 dot-namespace):
- `state.set/append/remove/merge/toggle` — 状态写入
- `effect.fetch/cancel` — 网络请求
- `nav.go/back` — 页面跳转
- `node.setVisualState` — 视觉状态切换
- `ui.showToast/openUrl/delay` — UI反馈

---

### 8.4 绑定关系

| 节点路径 | 绑定类型 | 表达式 | 说明 |
|---------|---------|--------|------|
| item-list | repeat | `{{state.data.moments}}` | 列表渲染 |
| empty-state | visibleWhen | `{{state.data.moments.length === 0}}` | 空态显示 |
| input-field | bind | `state.view.inputValue` | 双向绑定 |
| loading-indicator | visibleWhen | `{{state.view.isRefreshing}}` | 刷新时显示 |

---

## 9. 节点结构树

> ⚠️ 本章描述页面的**逻辑结构和设计要求**，**不写具体CSS值**。
> page-builder 技能会根据第2-4章的设计规格 + 设计系统Token自主决定具体样式实现。

```
root (页面根容器, 全高, 暗色背景$layer0, flex纵向排列)
├── nav-bar (导航栏) [layoutHint: sticky-header]
│   ├── avatar (头像按钮, 32px圆形, $layer2背景)
│   ├── title (标题文字, $textPrimary, bodyMd加粗)
│   └── action-btn (操作按钮, 32px, 内含icon)
│       └── icon (20×20, 素材I-xx)
├── content (主内容区, flex:1, 可滚动) [layoutHint: scroll-child]
│   ├── section-1 (...)
│   │   ├── element (...)
│   │   └── ...
│   └── ...
├── floating-elements (浮动层, absolute/fixed)
│   ├── fab (发布按钮, 56px圆形, primary渐变, glow阴影)
│   │   └── icon (24×24, 素材I-xx)
│   │   [event: click → nav.go(targetScreen)]
│   └── locate-btn (定位按钮, 36px, 毛玻璃, 内含icon)
│       └── icon (20×20, 素材I-xx)
└── tab-bar (底部导航) [layoutHint: sticky-footer]
    ├── tab-item×N (图标+文字, 等宽分布)
    └── ...
```

**结构说明**:
- 括号内是**设计要求描述**（尺寸/颜色引用Token/视觉效果）
- page-builder 负责将这些要求翻译为正确的CSS
- 方括号是元信息（layoutHint/事件/素材引用）

**事件清单**:
| # | 节点路径 | trigger | condition | actions |
|---|---------|---------|-----------|---------|

**节点总数估算**: ~N个（用于评估搭建任务拆分）
