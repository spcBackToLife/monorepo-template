# Frame / Viewport / Canvas 三层解耦 — 产品方案

> 把"设备框就是画布"改成"画布上有可自适应高度的 Frame，Viewport 是浮在 Frame 上的取景框"。
>
> 本文档定义**为什么**要改、**改成什么**、**对设计师 / Agent 的可见行为变化**。
> 技术实现规划见：[Frame / Viewport / Canvas 三层解耦 — 技术实现](../../../03-tech/editor/frame-viewport-canvas-redesign.md)
>
> 相关文档：
> - [第一性原理](../../../01-vision/first-principles.md) — Q3：屏幕选择 = 选择初始视口
> - [01 - 中央画布](./README.md) — 当前画布架构（本方案修订其 §九「视口适配」）
> - [10 - 预览与测试](../10-preview-mode/README.md) — 预览模式（本方案修订其 §六「预览视口与设备模拟」）
>
> 状态：**方案稿（待评审）**
> 日期：2026-04-30

---

## 一、问题陈述：现状违反了我们自己的第一性原理

### 1.1 第一性原理早已写明

`design_docs/01-vision/first-principles.md` Q3 已经定调：

> **屏幕选择 = 选择初始视口（Viewport）**
> Schema 不变 → 切换视口只是改变观看窗口 → 验证适配效果

这条原则蕴含两个**实现上必须满足**的命题：

1. **Schema 的内容范围 ≠ Viewport 的尺寸** —— Schema 想多长就多长（Home 页可能 4 屏），Viewport 只是"我用什么尺寸的窗口看它"
2. **Viewport 是观察手段，不是内容边界** —— 切 iPhone / iPad 不应该裁掉内容，只应改变取景框

### 1.2 现状实现违背了原则

代码事实（截至 2026-04-30）：

| 现象 | 证据位置 |
|---|---|
| 设备框高度 = `viewport.height`（设备物理高，固定）| `features/design-engine/src/viewport/ViewportContainer.tsx:36-62` |
| 默认 `clipDeviceFrame: true` → 设备框 `overflow: hidden`，超出**直接裁掉** | 同上 |
| 编辑模式 DOM 层 `pointer-events: none` → 任何 `overflow:auto` 容器**滚不动** | `apps/design_front/src/views/editor/Canvas/canvas.css:25-30` |
| 唯一对长内容的回应是 `viewportOverflow` 徽章 —— 一个 ⚠️ | `apps/design_front/src/views/editor/Canvas/index.tsx:159-180` |
| 嵌入式预览父层 `overflow: hidden`，整页滚动也未必能滚 | `features/design-engine/src/preview/PreviewRenderer.tsx:316-329` |

### 1.3 实际后果

设计师 / Agent 在编辑器里看到的是**首屏一帧**。这导致：

- **看不到长内容**：超出设备框高度的 Schema 节点被裁，肉眼不可见
- **改不到长内容**：DOM 层无指针事件，鼠标无法接近被裁掉的部分
- **测不到长内容**：MCP `generate_snapshots` 截图也只截了 viewport 内的那一帧
- **AI 推理被误导**：Agent 拿截图问"sticky bottom bar 是否遮挡 Popular 第二行卡片"，但截图里**没有 Popular 第二行**

### 1.4 触发本次重新设计的具体场景

设计 `Music AI Hub` 的 Home 页时（参考 `design_docs/03-tech/home-bottom-area-redesign-plan.md`）：

- 参考图（产品稿）：Hero 圈 + Feature Grid 2×2 + **Popular Promt 多张卡片** + **浮动玻璃 tab bar**
- 编辑器实际呈现：Hero 圈 + Feature Grid 2×2 + tab bar 直接贴在 Grid 下面 ← Popular Promt 区**完全不可见**
- 我们当时给的"补丁"是 `viewportOverflow` 徽章 ⚠️ —— 治标不治本

---

## 二、决策：Frame / Viewport / Canvas 三层解耦

### 2.1 概念模型

```
┌───────────────────────────────────────────────────────────┐
│  Canvas（画布工作台，无限平面，缩放/平移）                 │
│                                                           │
│   ┌─────────────────────────────────────┐                 │
│   │ Frame（一份 Schema 的"舞台"）         │                 │
│   │ width  = 设计基准宽（如 375）         │                 │
│   │ height = 内容自适应（可以是 1800px） │                 │
│   │                                     │                 │
│   │   ┌──────────────────────┐ ←──── Viewport "取景框"     │
│   │   │ 375 × 812            │       (可拖动 / 多个并存) │
│   │   │ [iPhone 15] (首屏)   │                           │
│   │   └──────────────────────┘                           │
│   │                                     │                 │
│   │   Hero 圆圈                         │                 │
│   │   Feature Grid 2×2                 │                 │
│   │   Popular Promt #1                 │  ← 全部铺开   │
│   │   Popular Promt #2                 │     可见可改   │
│   │   ...                              │                 │
│   │                                     │                 │
│   │   [Sticky Bottom Bar] ← 锚定到激活 Viewport 取景框底  │
│   │                                     │                 │
│   └─────────────────────────────────────┘                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 2.2 三层各自的定义

| 层 | 是什么 | 是谁的属性 | 边界来自 |
|---|---|---|---|
| **Canvas** | 设计师工作台，承载 Frame，支持缩放平移 | 编辑器 | 浏览器窗口 |
| **Frame** | 一份 Schema 的物理舞台 | **Schema 的属性**（`Screen.frame`） | width 由设计基准定（默认设备宽），**height 由内容自然撑开** |
| **Viewport** | 设计师选的观察窗口，浮在 Frame 上 | **编辑器观察参数**，**不进 Schema** | 由设备库（iPhone 15 / iPad Air...）决定 |

> **核心原则**：Frame 是"产品本身有多长"，Viewport 是"我用多大的窗口看它"。两件事必须分开。

### 2.3 设计师视角的可见行为变化

| 场景 | 改前 | 改后 |
|---|---|---|
| 打开 Home 页编辑 | 只看到首屏（设备框高度内的内容），下面被裁 | 看到**完整长内容**铺开，Viewport 取景框浮在上面标记"首屏在哪" |
| 切换 iPhone 15 → iPad Air | 整个画布尺寸切换，需要重新缩放定位 | Viewport 取景框换尺寸，**Frame 内容不动**，可同时存在多个 Viewport |
| 拖动 Viewport 取景框 | 不存在这个交互 | 模拟"用户在 viewport 内向下滚动"，sticky 元素跟着重定位 |
| 编辑长内容下方的卡片 | 鼠标到不了，需要切换缩放/滚动技巧 | 直接点击编辑，和编辑首屏内容**完全一致** |
| 检查 sticky bottom bar | 看不到（被裁） | 在每个 Viewport 取景框底部都能看到 sticky 元素的真实位置 |
| 同时验证多设备适配 | 一次只能看一个 viewport | 同 Frame 上叠 3 个 Viewport（375×812 / 414×896 / 360×640），同屏对比 |

### 2.4 Agent / MCP 视角的可见行为变化

| 场景 | 改前 | 改后 |
|---|---|---|
| `generate_snapshots` 截图 | 只能截 viewport 内首屏 | 新增 `mode` 参数：`frame`（整 Frame）/ `viewport`（首屏）/ `viewport-scroll`（指定 scrollY 后的视口）/ `multi-viewport`（多设备同框对比） |
| AI 验证"Popular 第二行是否被遮挡" | 不可能（截图里没有 Popular 第二行）| 截 `viewport-scroll` 模式，指定 `scrollY = N` 即可 |
| AI 调"长页面布局" | 凭脑补 | 拿到完整 Frame 截图，可基于真实坐标推理 |
| AI 修 sticky 元素 | 看不到 sticky 在不同 viewport 下的位置 | `multi-viewport` 模式一次拿到 3 张图对比 |

---

## 三、关键决策点

### 3.1 Frame 写不写进 Schema？

**写进 Schema。**

**理由**：Frame 表达的是"这个 UI 的设计基准宽 + 自然高度范围"，是 Schema 自描述的一部分。如果不写进 Schema，导出的代码 / 跨平台 codegen 就缺了"这个页面应该按多宽设计"的信息。

**对应字段**：`Screen.frame: { width: number; minHeight?: number; maxHeight?: number }`
- `width` 必填，是设计基准宽（如 iPhone 设计稿用 375）
- `minHeight` 可选，避免空内容时 Frame 高度塌缩到 0
- 不写 `height`，由内容撑开

### 3.2 Viewport 写不写进 Schema？

**不写进 Schema。**

**理由**：Viewport 是"我用什么设备来看 Schema"，是观察手段，不是产品内容。同一份 Schema 可以被任何 viewport 观察。如果写进 Schema 会污染"产品定义"和"工具偏好"的边界。

**对应实现**：Viewport 选择存在**编辑器本地状态**（per-screen-per-user 偏好），不进 op log，不进数据库。

> **例外**：`Screen.defaultViewport: ViewportProfileId` 可以记一个"打开这个 Screen 时默认用什么 viewport 看"——这是**导航偏好**，不是内容定义，仍可写进 Schema 的元数据区。

### 3.3 sticky / scroll-container 怎么表达？

**抬成显式语义字段**，不再靠 CSS `overflow:auto` / `position:sticky` 隐式推断。

**对应字段**（建议）：
- `node.role: 'scroll-container' | 'sticky-bottom' | 'sticky-top' | undefined`
- 渲染层根据 `role` 在 Frame 模式下做特殊定位（如 `sticky-bottom` 锚定到激活 Viewport 取景框底部）
- 导出代码时，`role` → 真实 CSS（`overflow:auto` / `position:sticky`）

**理由**：
1. **MCP 可识别**：Agent 可以问"哪些节点是 sticky" → 直接查 `role` 字段，不用解析 CSS
2. **编辑器可特殊处理**：渲染时 sticky 元素需要"跟着 viewport 取景框走"，只有显式 role 才能做这件事
3. **不破坏 CSS 1:1 原则**：role 不替代 CSS，只是**附加**语义层；导出代码时 role 还是翻译成标准 CSS

### 3.4 长内容里的滚动子区域（如 Popular 横向滑动）怎么编辑？

**两种交互模式叠加**：

1. **Frame 模式（默认）**：scroll-container 节点的内容**完全展开**显示，不做内部滚动 —— 设计师能看到所有横向卡片
2. **Viewport 模式（hover 1s 进入）**：把鼠标移到 Viewport 取景框内并停留 1 秒，DOM 层 `pointer-events` 临时启用 —— 此时滚动 Popular 内部就跟运行时一样

这样兼顾"看到全貌"和"模拟真实交互"两件事。

### 3.5 现有 Screen.viewport 字段如何迁移？

**一次性 migration**：
- 把现有 `Screen.viewport: { width, height }` 转成 `Screen.frame.width = viewport.width`
- `Screen.defaultViewport = matchProfileByDimensions(viewport.width, viewport.height)`
- Frame 高度不写（默认由内容撑开），存量数据**视觉上零变化**（因为内容本来就在那个高度内）

---

## 四、不做什么（明确划界）

为避免范围蔓延，本方案**不做**以下事项，留作独立方案：

| 不做 | 为什么 |
|---|---|
| 长页面虚拟化渲染 | 已有 `canvasVirtualizeOutsideDeviceFrame`，本方案改造后该机制可继续生效 |
| 响应式布局规则（断点） | 是 Codegen 层的事，不是编辑器视图层的事 |
| 真机调试 / 设备外壳图片 | 远期"高级预览"功能，与三层解耦正交 |
| 多 Frame 同屏（一次设计多个 Screen） | 当前 Schema 一次只编辑一个 Screen，多 Frame 需要先扩展 Schema |
| Frame 高度的硬约束（"页面不允许超过 N 屏"）| 不限制，靠组件树的 ⚠️ 标记提示 |

---

## 五、边界情况与异常处理

| 场景 | 预期行为 |
|---|---|
| Schema 内容为空 | Frame 高度 = `minHeight` ?? Viewport 高度，避免 Frame 塌缩 |
| 元素显式 `position: absolute; top: 99999px` | Frame 高度跟着撑到那里；组件树标记"超大画布"性能警告 |
| sticky-bottom 节点 + Viewport 拖动 | sticky 节点跟随激活的 Viewport 取景框底部移动；多 Viewport 时按"主 Viewport"锚定，副 Viewport 显示半透明位置预览 |
| Viewport 拖出 Frame 范围 | 允许（Viewport 自由位置），但提示"超出 Frame 内容"|
| 同 Frame 多 Viewport 时编辑节点 | 编辑发生在 Frame 上（与 Viewport 无关），所有 Viewport 同步显示新内容 |
| MCP `generate_snapshots` 旧调用（无 mode 参数）| 默认走 `viewport` 模式（即原行为），保持向后兼容 |

---

## 六、对其他子系统的影响

| 子系统 | 影响 | 是否需要同步改 |
|---|---|---|
| `01-canvas` | 本方案核心修订对象，§九 视口适配重写 | **是** |
| `10-preview-mode` | §六 预览视口与设备模拟重写：预览 = 锁定一个 Viewport 取景框 | **是** |
| `02-toolbar` | 顶部 viewport 切换 → 改成 "添加 Viewport" / "切换激活 Viewport" | 是 |
| `08-layer-tree` | 长内容节点不再被裁，组件树定位行为不变；增加 sticky / scroll-container 节点的图标标记 | 小改 |
| `04-state-system` / `05-data-driven` | 不影响（数据集 / 状态切换仍走原路径） | 否 |
| `09-interaction-binding` | 不影响（事件绑定仍走原路径） | 否 |

---

## 七、验收标准

### 设计师可感知的体验
- [ ] 打开 Home 页，能在画布上**完整看到**所有 Schema 节点（包括原本被裁的 Popular Promt 区）
- [ ] 切换 iPhone 15 → iPad Air 时，Frame 内容不动，只有 Viewport 取景框换大小
- [ ] 能在同一 Frame 上叠 2~3 个 Viewport 取景框对比不同设备
- [ ] 拖动 Viewport 取景框时，sticky bottom bar 跟随移动
- [ ] hover Viewport 内 1 秒后，能在内部 scroll-container 里真实滚动

### Agent / MCP 可达成的能力
- [ ] `generate_snapshots` 支持 `mode: 'frame' | 'viewport' | 'viewport-scroll' | 'multi-viewport'`
- [ ] AI 调"frame 模式"截图能拿到完整长页面图
- [ ] AI 调"multi-viewport 模式"一次拿到多设备对比图
- [ ] 旧调用（无 mode）保持原行为，零破坏

### 工程一致性
- [ ] 现有 Screen 数据零迁移成本（migration 自动做）
- [ ] `decision-log.md` 加索引行
- [ ] `01-canvas/README.md` §九 / `10-preview-mode/README.md` §六 同步修订
- [ ] 技术实现文档落地：`03-tech/editor/frame-viewport-canvas-redesign.md`

---

## 八、AGENTS.md 产品化信号自检

按本仓库 `AGENTS.md` 的"何时应从产品角度完善能力"清单：

| 信号 | 是否命中 | 说明 |
|---|---|---|
| 共性高 | ✅ | 几乎每个产品页面都有滚动 / sticky |
| 意图与表达落差大 | ✅ | 意图是"长滚动页"，schema 表达只能存"一帧" |
| MCP 测真链路断 | ✅ | AI 截图只能拿首屏 → 测试无效 |
| 可逆 / 协作 | ✅ | sticky / scroll 抬成一等公民才能正式参与 op log |
| 成本结构 | ✅ | 手工对齐反复出错（Music AI Hub Home 页就是案例）|

5 项全中。本方案是**还债**型重构（让实现追上原则），不是新功能堆砌。

---

## 九 · 补丁（2026-04-30 早）：编辑画布与预览的契约切割（中间态）

> 解耦初版上线后，发现自己把"编辑画布要 frame 拉长可滚动浏览"和"预览要模拟真实设备"混在了一起，
> 导致预览模式也变成"长 frame + 外层 overflow:auto"，破坏了原本"屏幕固定 + 底栏在屏幕底"的所见即所得。本节为初次修订。

> ⚠️ 本节的"`node.role` 在编辑画布生效"已被 §10 二次修订废弃 —— role 退化为"编辑器 UI 状态"，不再触达 schema 渲染。请直接看 §10。

### 9.1 关键契约（已被 §10 替换）

| 维度 | 编辑画布（设计期） | 预览（最终设备） |
|---|---|---|
| 容器高度 | Frame 高度（可拉长，方便编辑长内容） | `activeViewport` 高度（=真实设备屏幕） |
| 容器 `overflow` | 由画布自身的平移/缩放表达 | **`hidden`**（屏幕不会自己外滚）|
| 内部滚动 | 画布层不模拟；如需查看长内容靠 Cmd+滚轮缩放 | 由 schema 内显式的 `overflow: auto` 子容器提供（CSS-first）|

→ 编辑画布的"frame 拉长"是**纯设计期辅助**；预览=schema 真实表达。两者解耦，不再相互渗透。

---

## 十 · 修订（2026-04-30 晚）：彻底回归 schema 纯净 + role 退到 editorMetadata

### 10.1 触发的现实

§九 把"长 Frame 编辑能力"通过 `Screen.frame / Screen.defaultViewport / ComponentNode.role` 写进了 schema，引发的连锁反应：

- 预览模式仍按 schema 把根高度拉到内容自然高，`overflow: hidden` 直接把底栏裁出可视区
- 渲染层为了 `role` 在预览/编辑两套行为中各自分支，复杂度蹭蹭涨
- "schema 是真实设计产物"的契约被污染：里面混了编辑器 UI 偏好

### 10.2 一刀切原则

> **schema = 真实设计产物。任何只服务编辑器视图体验的字段都必须放到 `editorMetadata` 命名空间，渲染契约一律不读取。**

由此推出：

| 项 | 处置 |
|---|---|
| `Screen.frame` / `Screen.defaultViewport` | **删除**。viewport 由调用方（Canvas/Preview）显式传入 |
| `ComponentNode.role` | **删除**主字段，下沉为 `node.editorMetadata.role` |
| `editorMetadata` 命名空间 | **新增**。承载未来一切"编辑期辅助、不影响产物"的字段 |
| `SchemaRenderer` / `PreviewRenderer` 的 frame/role 翻译 | **回滚**到 §九 之前的 HEAD 行为 |
| `ViewportContainer` | 简化为 `viewport`（必填）+ `unfoldFrame`（可选，仅控制编辑期"展开 Frame"视觉） |
| 编辑期"长 Frame 浏览长内容"能力 | 保留，但**仅**通过 `ViewportContainer.unfoldFrame=true` 在视图层实现，不写 schema |

### 10.3 渲染契约（最终态）

| 维度 | 编辑画布 | 预览 |
|---|---|---|
| 容器尺寸 | `viewport.width` 固定 + `unfoldFrame=true` → 高度由内容自然撑开（min = viewport.height） | `viewport.width × viewport.height` 固定 |
| 容器 `overflow` | `visible`（让画布看到长内容） | `hidden`（真机屏幕不外滚） |
| 内部滚动来源 | schema 自己的 CSS（如某个 `overflow: auto` 子容器） | 同左 |
| `node.editorMetadata.role` | 编辑器 UI 可读取做"右栏选项"等辅助 | **不读取**，预览渲染等价没有这个字段 |

### 10.4 设计师如何让"长滚动页 + 锁底栏"在最终产品里成立

只有一条路：**在 schema 的 CSS 里直接表达**。例如：

- 主内容区：`{ flex: 1, minHeight: 0, overflow: 'auto' }`
- 底栏：`{ position: 'sticky', bottom: 0 }` 或参与 flex column 末项 + 父容器 `height: 100%`

`role` 已不再参与渲染，纯属编辑器 UI 标签。

### 10.5 为何保留 `editorMetadata.role` 而不是直接删

- 历史 `setNodeRole` op 已经写进若干项目的事件流，硬删会让回放报错
- 给"未来还会出现的编辑器辅助字段"留一个明确命名空间，后续不必再做一次"哪些是辅助"的考古
- 命名空间清晰：`schema` 主体 = 设计产物，`editorMetadata` = 编辑器 UI 偏好，互不污染

---

## 十、本方案与第一性原理的回路

```
第一性原理 (first-principles.md Q3)
   "屏幕选择 = 选择初始视口"
              │
              ▼
   原则蕴含两个命题：
     · Schema 内容范围 ≠ Viewport 尺寸
     · Viewport 是观察手段，不是内容边界
              │
              ▼
   现状实现违反了这两个命题
   （设备框 = 物理边界 = 内容边界）
              │
              ▼
   本方案：把 Frame（内容边界）和 Viewport（观察边界）拆开
   让实现回到原则
              │
              ▼
   附带收益：
     · 长内容编辑可见
     · 多设备对比成立
     · MCP 截图能力升级
     · sticky / scroll 显式语义化
```
