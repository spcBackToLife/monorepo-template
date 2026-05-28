# 页面 index.md 模板（8 章）

每个页面产出一个 `index.md`，作为**最后**写的**汇总**文档。所有具体样式规格已在各组件 `<name>.md` 中独立深钻，index.md **只引用不发明**。

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

## 2. 结构层次设计

### 2.1 宏观布局

```
(ASCII 布局图，标注各区域及尺寸，375px 基准)
```

### 2.2 空间分配

| 组件 | 高度/占比 | 定位方式 | layoutHint |
|------|---------|---------|------------|
| (组件名) | (px或flex比例) | (sticky/fixed/flow) | (scroll-child/sticky-header/...) |

### 2.3 视觉流向

(描述用户视线的自然移动路线：进入页面后先看到X → 然后视线移向Y → 最终停在Z)

### 2.4 层叠关系

| 层级 | 包含元素 | z-index策略 |
|------|---------|------------|
| 最底层 | 背景/装饰 | 默认流 |
| 内容层 | 主要信息 | 默认流 |
| 浮动层 | FAB/Toast | position:fixed/absolute |
| 遮罩层 | Sheet遮罩/Modal | 最高 |

---

## 3. 组件清单（通用引用 + 页面专属索引）

### 3.1 通用组件引用（首次深钻在其他页面，本页只是引用）

| 组件名 | 在本页位置 | 文档路径 | props | 期望效果 | 是否需要新增 variant |
|--------|---------|---------|-------|---------|---------|
| (名称) | (位置) | `design-plan/components/<name>/<name>.md` | {key:value} | (描述) | — / 是 (描述新增需求) |

### 3.2 页面专属组件索引

仅本页使用的复合组件，每个为独立目录 `components/<name>/`，内含 `<name>.visual.md + <name>.md`。

| 组件名 | 文档路径 | 职责 | 为什么不抽为通用 |
|--------|---------|------|----------------|
| (名称) | `design-plan/pages/<id>/components/<name>/<name>.md` | (一句话) | (只在本页/场景特殊/深度耦合) |

每个组件 `<name>.md` 包含完整的：定位 + 结构 + 视觉变体×状态矩阵 + 状态转换动效 + 交互行为 + 素材索引。
样式规格写在组件 `<name>.md` 里，**不在 index.md 里重复**。

---

## 4. 素材清单（索引 → 独立文件）

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

## 5. 状态完整矩阵

### 5.1 页面状态视觉快照

| 状态 | 视觉描述 | 与idle的差异 | 所需特殊素材 |
|------|---------|-------------|------------|
| loading | (骨架屏描述) | (哪些区域替换为占位) | — |
| idle | (正常态完整描述) | (基准) | — |
| empty | (空状态描述) | (哪些隐藏/哪些显示) | IL-xx(空状态插画) |
| error | (错误态描述) | (哪些变化) | — |
| (其他状态...) | | | |

### 5.2 状态转换动效

| 从 → 到 | 变化元素 | 动画属性 | 时长 | 缓动 | 延迟 |
|---------|---------|---------|------|------|------|
| loading→idle | 骨架 → 内容 | opacity, transform | 300ms | ease-out | — |

---

## 6. 数据与交互设计

### 6.1 数据源定义

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

### 6.2 状态管理

#### stateInit.data (运行时数据，由 effect.fetch 写入)

| key | 类型 | 初始值 | 写入方式 | 说明 |
|-----|------|--------|---------|------|
| (key) | Array/Object/null | [] / null | effect.fetch onSuccess → state.set / state.append | (说明) |

#### stateInit.view (UI临时状态，交互直接写入)

| key | 类型 | 初始值 | 变更触发 | UI影响 |
|-----|------|--------|---------|--------|
| (key) | string/boolean/number | (默认值) | (什么操作改变它) | (影响哪些visibleWhen/UI变化) |

---

### 6.3 交互事件流

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

### 6.4 绑定关系

| 节点路径 | 绑定类型 | 表达式 | 说明 |
|---------|---------|--------|------|
| item-list | repeat | `{{state.data.moments}}` | 列表渲染 |
| empty-state | visibleWhen | `{{state.data.moments.length === 0}}` | 空态显示 |
| input-field | bind | `state.view.inputValue` | 双向绑定 |
| loading-indicator | visibleWhen | `{{state.view.isRefreshing}}` | 刷新时显示 |

---

## 7. 节点结构树

> ⚠️ 本章描述页面的**逻辑结构和组件引用关系**，**不写具体 CSS 值**。
> 各组件内部的样式规格在其独立 `<name>.md` 文档中描述。

```
root (页面根容器, 全高, 暗色背景$layer0, flex纵向排列)
├── nav-bar [组件:AppBar @ design-plan/components/app-bar/app-bar.md]
│   ├── avatar (32px圆形, $layer2背景)
│   ├── title ($textPrimary, bodyMd加粗) "页面标题"
│   └── action-btn (32px) → icon (20×20, 素材I-xx)
├── content (主内容区, flex:1, 可滚动) [layoutHint: scroll-child]
│   ├── section-1 [组件:SectionCard @ design-plan/pages/<id>/components/section-1/section-1.md]
│   │   ├── (展开第一层子节点结构)
│   │   └── ...
│   └── ...
├── floating-elements (浮动层, absolute/fixed)
│   ├── fab (56px圆形, primary渐变, glow阴影)
│   │   └── icon (24×24, 素材I-xx)
│   │   [event: click → nav.go(targetScreen)]
│   └── locate-btn (36px, 毛玻璃) → icon (20×20, 素材I-xx)
└── tab-bar [组件:TabBar @ design-plan/components/tab-bar/tab-bar.md]
    └── tab-item×N (图标+文字, 等宽分布)
```

**结构说明**:
- `[组件:Name @ path]` 标注组件引用 + 独立文档位置
- 组件必须**内联展开第一层子节点**（节点树红线 1）
- 括号内是**关键设计描述**（尺寸/Token引用/视觉效果）
- 方括号是元信息（layoutHint/事件/素材引用）

**事件清单**:
| # | 节点路径 | trigger | condition | actions |
|---|---------|---------|-----------|---------|

**节点总数估算**: ~N个（用于评估搭建任务拆分）

---

## 8. 引用契合度核对（通用组件）

列出本页面引用的所有**通用组件**，核对其文档是否覆盖本页面所需的全部 variant / state。

| 通用组件 | 引用位置 | 本页面需要的 variant/state | 组件文档是否已覆盖 | 需补充什么 |
|---------|---------|------------------------|------------------|-----------|
| app-bar | 顶部 | with-back-btn + transparent-bg | ✅ 已覆盖 | — |
| empty-state | content 区 | with-cta | ⚠️ 未覆盖 cta variant | 补到 design-plan/components/empty-state/empty-state.md |

**纪律**：本表不为零代表"页面还没完成"。所有 ⚠️ 必须在 PLAN 打勾前消除（补到对应组件文档）。
