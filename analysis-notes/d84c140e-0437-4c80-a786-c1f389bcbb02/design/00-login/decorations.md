> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-decorations
> 对应 schema 字段：装饰节点（element/add）+ 节点 meta.design.materialSpec + componentBudgets 中占位 nodeId 替换

# D-00-login-decorations — 装饰决策

## 1. 主题风格匹配

- theme.intent: `aesthetics:[minimal, flat] / decoration:minimal / colorTemperature:neutral / seedColors:[#5B6CFF]`
- 本屏情感目标（emotion.md）: 简洁 / 友好 / 可信
- 本屏可用装饰预算（budget.md）: weight = 2

按 methodology/04 主题匹配表：
- 极简 + 校园温度 →
  - **主装饰**：几何（细线/点）或 有机（光斑/圆/blob）
  - **辅装饰**：光效（微妙渐变）
  - **不要**：纹理（噪点过头）/ 符号（星星/心 易俗）/ 数学（贝塞尔过专业）/ 多色（违反 single seedColor）

→ 本屏只能选 1 个装饰类（预算太紧），最佳候选：**有机类-blob（裁剪溢出 blob 单色径向渐变）**

## 2. 装饰用量决策树

| Q | 答 |
|---|----|
| Q1 核心内容是什么？ | 表单（简单 + 中央卡片占主视觉，留白多）|
| Q2 情感需求？ | 品牌表达 + 友好氛围（少量精致装饰 2-4 weight）|
| Q3 主次关系？ | 1 主装饰，0 辅，0 微（预算只够 1 个）|
| Q4 删去任何 1 个装饰，氛围有损？ | 是——纯白背景过 SaaS / 缺校园温度 |

→ 推荐用量：**1 个装饰节点**（与"少 2-4"档下限对齐，符合 minimal 主题）

## 3. 候选装饰对比

### 方案 A：右上角蓝紫 blob（采用）★

| 装饰节点 | 类别 | 位置 | 透明度 | 视觉重量 | weight |
|---------|------|------|--------|---------|:------:|
| BgBlobTopRight | 有机-blob 裁剪溢出（光效辅） | 右上角溢出 | 12% | 主 | 2 |

- 视觉手段：单色径向渐变（primaryLight 中心 → transparent 边缘），不带 blur（与 minimal+flat 对齐）
- 位置：top:-40px / right:-60px / 200×200，伸出画面右上角
- 优点：
  - **承接情绪**：从 BrandLogo 视线引导到 FormCard 顶部（FormCard 紧贴 BrandLogo 下方，blob 在它们身后形成空间感）
  - **品牌识别**：使用 `colors.primaryLight` 即蓝紫淡色，与 seedColor 1:1 对齐
  - **极简契合**：单色 + 单层渐变 + 0 个装饰额外元素 → 与 `aesthetics:minimal+flat` 100% 一致
- ✅ 总 weight=2 = 装饰预算上限（2/2）

### 方案 B：右上 + 左下 双 blob（构图平衡）

| 装饰节点 | 类别 | weight |
|---------|------|:------:|
| BgBlobTopRight | 蓝紫 blob | 2 |
| BgBlobBottomLeft | 淡紫 blob 微小 | 1 |

总 weight=3 ❌ 超装饰预算（≤2）→ 必须从业务侧再削 1 → 削无可削（FooterLinks=1 / Brand 等都已最低）
- ❌ **否决**：超预算；构图平衡可以靠卡片下方的 FooterLinks 配合 padding 实现

### 方案 C：分割装饰 OrnamentSeparator（FormCard 内部）

- 卡片内部 PolicyRow 与 SubmitBtn 之间加一条装饰分割线
- ❌ **否决**：
  1. 违反 §5 红线（装饰节点放进 FormCard 内会影响 FormCard 布局）
  2. minimal 风格不需要分割花纹；FormCard 内 gap 已足够分隔
  3. 增加视觉噪音

### 方案 D：纯 CSS 背景渐变（不建独立装饰节点）

- 把 BgBlobTopRight 的渐变直接写到 rootNode.styles.background
- ❌ **否决**：
  1. 与 `screen.backgroundColor = $token:colors.background` 冲突（background-color 是简单值，不是 background shorthand）
  2. 装饰渲染时机与背景色不可控（渐变溢出难精确控制）
  3. 失去"装饰节点"作为可独立调试 / 截图核对的实体

→ **采用方案 A**

## 4. 与视觉预算的关系

- 业务节点总 weight = 28（来自 budget.md：8+5+4+1+2+2+2+1+1+1+1）
- 装饰预算剩余 = 30 - 28 = 2
- 方案 A 装饰 weight = 2 = 剩余 ✅
- componentBudgets 装饰角色总和 = 2 ≤ 8 ✅

## 5. 配色与层次

| 装饰 | 主色 | 透明度 | 视觉手段 | 颜色与内容的关系 |
|------|------|:------:|----------|----------------|
| BgBlobTopRight | `$token:colors.primaryLight` (#EBEDFA) | ~ 80% (中心) → 0% (边缘) | 单色径向渐变 | 比内容淡数倍（primaryLight 本身就是蓝紫淡底），永远不会抢 textPrimary 的对比度 |

⚠️ 注意：渐变色实际是 primaryLight 本身（已经很淡），不需要再叠 opacity 12%——浏览器渲染时 primaryLight rgba 等同于 opacity 自然过渡。stop 设置：`primaryLight 0%, transparent 70%` 实现"中央实色→边缘消失"的 blob 视觉。

## 6. 装饰节点结构

### BgBlobTopRight

| 字段 | 值 |
|------|----|
| 父节点 | `Root` (nd_6a7f2492b59b4e7eab7e1) — 屏 rootNode 平级 |
| name | `BgBlobTopRight` |
| label | `右上角蓝紫光斑装饰` |
| type | `div` |
| position | absolute, top: -40px, right: -60px |
| size | 200×200 |
| borderRadius | full（圆形容器，配合 radial-gradient 形成软边 blob）|
| background | `radial-gradient(circle at 50% 50%, $token:colors.primaryLight 0%, transparent 70%)` |
| zIndex | 0 |
| pointerEvents | none |
| renderHint | `css-gradient`（CSS 实现，executor 跳过素材绘制）|

⚠️ **建到 Root 而非 NormalFormView/LockedView 内**——因为它在两种状态下都呈现（NormalFormView 主态需要它营造氛围；LockedView 也需要轻装饰避免锁定页过 desolate）。LockedView 状态下它依然在背景层，不抢 LockedIcon 焦点。

## 7. ★ 沉淀到 schema 的结论

```jsonc
// Step 1: element/add 创建装饰节点
element/add {
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  parentId: "nd_6a7f2492b59b4e7eab7e1",   // Root
  name: "BgBlobTopRight",
  label: "右上角蓝紫光斑装饰",
  type: "div",
  styles: {
    position: "absolute",
    top: "-40px",
    right: "-60px",
    width: "200px",
    height: "200px",
    borderRadius: "9999px",
    background: "radial-gradient(circle at 50% 50%, $token:colors.primaryLight 0%, transparent 70%)",
    zIndex: 0,
    pointerEvents: "none"
  },
  props: {}
}
// → 返回新建节点 id（如 nd_xxxxx）

// Step 2: meta/set_node 写 design 字段
meta/set_node {
  projectId,
  nodeId: "<新建装饰 id>",
  patch: {
    design: {
      summary: "右上角蓝紫光斑（CSS 径向渐变），承接 BrandLogo→FormCard 视线",
      rationale: "对照视觉预算 weight=2 / 氛围-装饰 / 仅允许单色径向渐变（v11 削减后限定 minimal 风格，无 blur）。位置溢出右上 -40/-60 让边缘自然裁切，营造空间感而非闭合视觉。",
      visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
      materialSpec: {
        kind: "decoration",
        renderHint: "css-gradient",
        referenceFrame: { width: 200, height: 200 },
        background: "transparent",
        composition: "径向渐变圆，中心 primaryLight 0% 到 70% transparent",
        notes: "renderHint=css-gradient 时 styles.background 已表达全部，executor 不需要画 PNG"
      }
    }
  }
}

// Step 3: 把 componentBudgets 中的 PENDING_BgBlobTopRight 替换为真实 id
meta/set_screen {
  ...
  patch: { design: { componentBudgets: [...同 budget.md §7 但 BgBlobTopRight nodeId 写真实 id...] } }
}
```

⚠️ **expectedArtifacts 补声明（update_plan_task done 时）**：
- 装饰节点已建：`{ kind: 'arrayMin', path: 'rootNode.children', min: 3 }` （现有 NormalFormView + LockedView + 新建 BgBlobTopRight = 3）

## 8. 不需要装饰的特例论证

不适用——本屏需要装饰（见 §2 Q4 + §3 方案 D 否决理由），不走 skipped。

**自检**：
- ✅ 装饰类型 ≤ 1 大类（仅有机-blob 单一）
- ✅ 同类装饰 ≤ 2 种变体（仅 1 个）
- ✅ 装饰透明度 < 100%（渐变自然过渡）
- ✅ 装饰颜色（primaryLight）比内容（textPrimary）淡很多
- ✅ 装饰放 z=0
- ✅ pointerEvents:none
- ✅ position:absolute
- ✅ 候选方案 ≥ 3 + 否决理由
- ✅ 总 weight 2 = 剩余装饰预算
