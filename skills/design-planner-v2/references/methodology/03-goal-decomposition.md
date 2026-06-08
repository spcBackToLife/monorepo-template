# 03 — 目标 → 元素拆解（Phase C 核心）

> 必读时机：执行 `D-X-G<N>-decompose` 任务时（每个 designGoal 一份）。
> 输入：design-goals.md（特别是当前 G<N> 的 5 字段）+ 当前 screen_schema 全节点。
> 输出：`design/<screenId>/goals/G<N>.md` + `screen.meta.design.goalElementMap[]` 中对应该 goal 的一项。
>
> 任务目的：把抽象的 designGoal 翻译成"涉及哪些元素 + 各元素需要做哪些维度的改动 + 元素之间如何协同 + 如何衡量达成"。这是后续 Phase F craft 任务的执行说明书。

---

## 1. 6 步拆解法

```
Step 1: 涉及元素扫描       从全屏节点中筛出服务于本 goal 的元素（≥ 2 个）
Step 2: 元素角色分配       为每元素标"主体 / 主角 / 配角 / 邻居 / 父容器 / 装饰"
Step 3: 5 维 changes 列举  每元素的 styles / structure / materials / visualStates / layout 改动清单
Step 4: 权重分配           本 goal 内各元素的视觉权重 (0-10)
Step 5: 协同关系明确化     coordination 4 角色（主体 / 邻居 / 父容器 / 装饰）
Step 6: 达成判据           snapshotCheck + refSimilarity + forbiddenSignals
```

---

## 2. Step 1 — 涉及元素扫描

### 2.1 扫描原则

```
对全屏节点遍历,问每个节点：
  "这个节点改动会影响 G<N> 的 successCriteria 吗？"
  
  影响 → 加入 involvedElements
  不影响 → 跳过（可能被其他 goal 或 coverage-fallback 覆盖）
```

### 2.2 数量规则

- **≥ 2 个**：单元素的"目标"实际是 css 微调 → R-GOAL-DECOMPOSE 拒
- **典型 2-6 个**：多于 6 个说明 goal 太宽,考虑拆成 2 个目标
- **可与其他 goal 重叠**：同一元素可被多个 goal 涉及（取最高权重 - Phase D 处理）

### 2.3 扫描举例

```
G1: "让用户进登录页 0.5 秒感受到清晨教室般的温度"

全屏节点:
  - screen (屏底)            → 影响：屏底色温是 mood 的 60% 载体     ✅ 涉及
  - Root (容器)              → 影响：上方 padding 给 Logo 视觉呼吸    ✅ 涉及
  - HeaderArea               → 影响：BrandLogo + Slogan 区域氛围     ✅ 涉及
  - BrandLogo                → 影响：第一视觉锚点 + 品牌温度         ✅ 涉及
  - BrandSlogan              → 影响：辅助传递温度（字色字重）         ⚠️ 可选
  - FormCard                 → 影响：阴影偏暖 / 卡片色相不能与温度冲突 ✅ 涉及（邻居）
  - PhoneInput / Label / ... → 影响：输入控件视觉偏冷会破坏温度       ⚠️ 可选(配角)
  - SubmitBtn                → 主色 CTA,与 mood 温度可能冲突 → 让位给 G2 处理
  - BgBlobTopRight           → 影响：装饰直接承载温度氛围             ✅ 涉及（装饰）
  - BgBlobBottomLeft         → 同上,可能新建                         ✅ 涉及（装饰）

最终 involvedElements: [screen, Root, HeaderArea, BrandLogo, FormCard, BgBlobTopRight, BgBlobBottomLeft]
共 7 个 → 可能略多,考虑拆出 BrandSlogan / PhoneInput 给其他 goal
```

---

## 3. Step 2 — 元素角色分配

### 3.1 6 种角色

| role | 含义 | 数量 |
|---|---|---|
| `主体` | 大面积视觉载体（屏底 / 大背景区域）| 0-1 |
| `主角` | goal 内最突出的元素（视觉锚点）| 1 |
| `配角` | 重要但非主角（信息容器 / 主要内容）| 0-3 |
| `邻居` | 必须协调但不抢戏的元素 | 0-3 |
| `父容器` | 提供视觉呼吸 / 留白的容器 | 0-1 |
| `装饰` | 强化氛围（装饰节点 / 角落溢出）| 0-2 |

### 3.2 角色分配规则

- **每 goal 必有 ≥1 个主角** —— 没主角 = 没视觉重点
- **主体最多 1 个** —— 多个主体 = 视觉撕裂
- **角色服务于 goal,不是绝对的** —— SubmitBtn 在 G1 mood 里是邻居,在 G2 cta-clarity 里是主角

### 3.3 分配示例

```
G1 mood-warmth 的角色分配:
  screen:           主体 (屏底色温载体)
  BrandLogo:        主角 (第一视觉温度信号)
  HeaderArea:       配角 (品牌区氛围)
  FormCard:         邻居 (不冲突温度的卡片)
  Root:             父容器 (上方留白给 Logo 呼吸)
  BgBlobTopRight:   装饰
  BgBlobBottomLeft: 装饰

G2 cta-clarity 的角色分配（同一项目里同一些元素）:
  SubmitBtn:        主角 (CTA)
  GetCodeBtn:       邻居 (不抢戏)
  RegisterLink/ForgotLink: 邻居 (弱化字色)
  FormCard:         父容器 (CTA 的视觉舞台)
  PolicyRow:        配角 (CTA 上方的紧邻态)
```

---

## 4. Step 3 — 5 维 changes 列举（最关键）

### 4.1 5 维度

```
changes: {
  styles: [...]        // node.styles 改动
  structure: [...]     // 结构调整 (element/add 装饰节点 / wrap)
  materials: [...]     // 调 material-painter brief
  visualStates: [...]  // node.states[] 改动
  layout: [...]        // 布局调整 (element/move / 容器 padding)
}
```

### 4.2 5 维 changes 强制规则

- **必须涵盖 ≥ 2 维度** —— 单维度 goal 实际是字段微调 → R-GOAL-DIMENSION 拒
- **每个维度可空** —— 不是每个 goal 都涉及 5 维（mood 可能没 visualStates,trust 可能没装饰）
- **每个改动必含 nodeId**（structure 例外,涉及新建节点）

### 4.3 styles 改动写法

```jsonc
changes.styles: [
  {
    nodeId: "screen",
    patch: {
      backgroundColor: "$token:colors.warmCanvas"  // 引用 token
      // 而不是 backgroundColor: "#F8F4EE" (硬编码) — 必须 $token: 引用
    },
    rationale: "服务 G1: 屏底偏暖,RGB 与 #FFFFFF 距离 ≥ 5pt"
  },
  {
    nodeId: "FormCard",
    patch: {
      boxShadow: "$token:shadows.warmSoft"
    },
    rationale: "服务 G1: 卡片阴影偏暖与屏底协调"
  }
]
```

⚠️ **若 token 池缺所需 token（如 `colors.warmCanvas` / `shadows.warmSoft`）**：

- 选项 A：用现有 token 的近似替代（如 `colors.background` 已是温调 → 直接用）
- 选项 B：发 UpstreamChallenge 让 theme-generator 补 token
- ❌ 禁止硬编码 hex

### 4.4 structure 改动写法

```jsonc
changes.structure: [
  {
    action: "element/add",
    parent: "screen",
    node: {
      name: "BgBlobBottomLeft",
      type: "div",
      meta: {
        design: {
          kind: "decoration",
          servingGoals: ["G1"],   // 必填
          summary: "左下温暖渐变光斑装饰,服务 G1 校园温度"
        }
      }
    },
    rationale: "对角配重 + 强化温度氛围"
  },
  {
    action: "element/wrap",
    targets: ["PolicyCheckbox", "PolicyText"],
    wrapper: { name: "PolicyCheckLabel", type: "label", ... },
    rationale: "服务 G3 协议降焦虑: label 整体可点击 + 视觉容器"
  }
]
```

### 4.5 materials 改动写法（只给 brief,不给施工图）

```jsonc
changes.materials: [
  {
    nodeId: "BrandLogo",
    brief: {
      visualGoal: "服务 G1 校园温度: 让校园用户感受到清晨教室的轻量品牌识别",
      conceptKeywords: ["暖白米", "大圆角柔和", "单色光斑节制"],
      themeIntent: "minimal+flat+neutral",
      decorationSystem: "soft-glow",
      colorRoleIn603010: "10% 强调",  // 主色 logo 在 10% 强调位
      nodeSize: "120x120",
      contextHint: "屏顶 safe-area 内, 屏底偏暖, 不能与屏底融合",
      tokenPool: ["primary", "primaryLight", "background", "textInverse"],
      failureCase: "1.5px 边框在 #FCFCFD 屏底几乎不可见 → 请避免",
      whatPainterDecides: [
        "概念隐喻（字标 vs 图形）",
        "构成规划（要不要边框/阴影/光晕）",
        "笔触粗细 / safe-zone / 构图层数",
        "如何避免与屏底融合"
      ]
    }
  }
]
```

⚠️ brief 不能含 pathData / 具体坐标 / hex 色值 / 构图层数 —— 详见 `methodology/10-material-brief.md`。

### 4.6 visualStates 改动写法

```jsonc
changes.visualStates: [
  {
    nodeId: "SubmitBtn",
    states: [
      {
        name: "loading",
        styleOverrides: { /* 主色保持饱和不变灰禁用样,加内嵌 spinner */ },
        childrenStates: [{ nodeId: "SubmitSpinner", state: "visible" }],
        rationale: "服务 G2 cta-clarity: loading 时主角不黯淡"
      },
      {
        name: "pressed",
        styleOverrides: { transform: "scale(0.98)" },
        rationale: "服务 G2: 按下反馈"
      }
      // ... 5 态全列
    ]
  }
]
```

### 4.7 layout 改动写法

```jsonc
changes.layout: [
  {
    nodeId: "Root",
    patch: {
      paddingTop: "$token:spacing.2xl"  // 从 lg(24) → 2xl(48)
    },
    rationale: "服务 G1: BrandLogo 上方留白加大,给品牌呼吸 → mood 0.5 秒视觉感受"
  }
]
```

⚠️ **layout 改动必须服务于某 goal**。孤立的 padding/margin 微调被 R-GOAL-COVERAGE 拒。

---

## 5. Step 4 — 权重分配（本 goal 内）

### 5.1 权重 0-10 标尺

```
10 - 唯一主角（极少用,通常仅 hero / 关键 CTA）
8-9  - 主角 (CTA / 品牌锚点 / 第一视觉信号)
6-7  - 重要配角 (关键信息容器)
4-5  - 配角 (字段 / 链接)
2-3  - 邻居 (退后但有视觉)
0-1  - 装饰 / 父容器 (大面积低密度)
```

### 5.2 权重分配示例

```
G1 mood-warmth 权重:
  BrandLogo:        7    // 主角 (品牌温度第一信号)
  screen:           5    // 主体 (大面积色温)
  HeaderArea:       6    // 配角
  FormCard:         4    // 邻居
  BgBlobTopRight:   3    // 装饰
  BgBlobBottomLeft: 3    // 装饰
  Root:             1    // 父容器

G2 cta-clarity 权重:
  SubmitBtn:        9    // 主角 (CTA)
  GetCodeBtn:       3    // 邻居 (弱化)
  RegisterLink:     2    // 邻居
  ForgotLink:       2    // 邻居
  FormCard:         4    // 父容器 (舞台)
  PolicyRow:        4    // 配角
```

### 5.3 权重金字塔约束（goal 内）

```
- 主角与配角 weight 差 ≥ 2
- 配角与邻居 weight 差 ≥ 1
- 装饰最高 ≤ 3 (避免装饰抢戏)
- 总和 ≤ 25 (单 goal 内,避免每个元素都很重要 = 都不重要)
```

跨 goal 取最高权重的逻辑见 `methodology/05-cross-goal-audit.md`。

---

## 6. Step 5 — 协同关系明确化

### 6.1 coordination 4 角色

```jsonc
coordination: {
  主体: "screen",                              // 大面积视觉载体
  主角: "BrandLogo",                           // 第一视觉锚点
  邻居: ["FormCard"],                          // 配合,不抢戏
  父容器: "Root",                              // 提供视觉呼吸 / 留白
  装饰: ["BgBlobTopRight", "BgBlobBottomLeft"] // 强化氛围
}
```

### 6.2 7 种典型协同模式（详见 methodology/04）

按 impactMode 选 1 种典型协同模式：

| impactMode | 协同模式 |
|---|---|
| mood-conveyance | 屏底 + Logo + 装饰协同（4 元素以上）|
| cta-clarity | CTA + 周围邻居权重再分配（3-5 元素）|
| trust-signal | 主体控件 + 错误态 + 微动效（2-4 元素）|
| hierarchy | 标题 + 副标 + 正文字号梯度（3-5 元素）|
| state-feedback | 状态切换前后 N 元素 visualState 联动（2-5 元素）|
| brand-recognition | Logo + 主色应用 + 品牌字 / 装饰呼应（3-5 元素）|
| decoration-storytelling | 装饰群 ≥ 2 + 主屏元素呼应（3-6 元素）|

详见 `methodology/04-multi-element-coordination.md` 7 种模式细节。

---

## 7. Step 6 — 达成判据（measure）

### 7.1 measure 必填三段

```jsonc
measure: {
  snapshotCheck: "...",          // 一句话: 截图怎么看
  refSimilarity: 0.6,            // 可选: 与 visualReferences 色彩气质相似度阈值
  forbiddenSignals: [            // 反例: 出现这些信号即 fail
    "...",
    "..."
  ]
}
```

### 7.2 与 designGoal.successCriteria 的关系

```
designGoal.successCriteria  = 整 goal 的 ≥ 3 条判据
goalElementMap.measure      = 本 goal 在元素层面如何 verify 这些判据

例：
  goal.successCriteria 第 1 条: "首屏视线热点落在 BrandLogo + 屏底偏暖区"
       ↓
  goalElementMap.measure.snapshotCheck: 
    "Bash 调 screenshot-screen.mjs <projectId> <screenId> + Read 截图,
     人工对照: BrandLogo 是否清晰可见 (非占位虚线) + 屏底是否偏暖 (非纯白)"
```

---

## 8. ★ 沉淀到 schema 的结论（必填）

```jsonc
// MCP: meta/set_screen
{
  projectId: "<projectId>",
  screenId: "<screenId>",
  patch: {
    design: {
      goalElementMap: [   // 注意: 是 array,本任务只追加 / 更新当前 G<N> 一项
        // ... 其他已 done 的 goal 项不动
        {
          goalId: "G1",
          involvedElements: [
            { nodeId: "screen", role: "主体", weightInGoal: 5 },
            { nodeId: "BrandLogo", role: "主角", weightInGoal: 7 },
            { nodeId: "HeaderArea", role: "配角", weightInGoal: 6 },
            { nodeId: "FormCard", role: "邻居", weightInGoal: 4 },
            { nodeId: "Root", role: "父容器", weightInGoal: 1 },
            { nodeId: "BgBlobTopRight", role: "装饰", weightInGoal: 3 },
            { nodeId: "BgBlobBottomLeft", role: "装饰", weightInGoal: 3 }
          ],
          changes: {
            styles: [...],
            structure: [...],
            materials: [...],
            visualStates: [],
            layout: [...]
          },
          coordination: {
            主体: "screen",
            主角: "BrandLogo",
            邻居: ["FormCard"],
            父容器: "Root",
            装饰: ["BgBlobTopRight", "BgBlobBottomLeft"]
          },
          measure: {
            snapshotCheck: "...",
            refSimilarity: 0.6,
            forbiddenSignals: [...]
          }
        }
      ]
    }
  }
}
```

---

## 9. 自检（任务 done 前）

- [ ] involvedElements ≥ 2
- [ ] 每元素 role ∈ 6 类枚举
- [ ] 主角 ≥ 1
- [ ] changes 涵盖 ≥ 2 维度（styles / structure / materials / visualStates / layout）
- [ ] 所有 styles patch 用 $token: 引用,无硬编码
- [ ] structure 新建节点都挂 `meta.design.kind` + `servingGoals: ["G<N>"]`
- [ ] materials brief 不含 pathData / 坐标 / hex 色 / 构图层数
- [ ] weightAllocation 总和 ≤ 25
- [ ] coordination 4 角色非空
- [ ] measure.snapshotCheck 具体可视
- [ ] measure.forbiddenSignals ≥ 2 条
- [ ] 末尾「★ 沉淀到 schema 的结论」段落与 MCP 调用 1:1

任一未通过 → md 不达,任务不能 done。

---

## 10. 一句话总结

> **目标→元素拆解 = 把抽象 goal 翻译成"哪些元素 + 各元素改什么 + 怎么协同 + 怎么衡量"。后续 craft 任务直接拿 goalElementMap[goalId] 当施工说明书。**
