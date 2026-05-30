# Schema-First 架构改造方案

> 让 design-api 的 **schema 成为唯一事实源（SSOT）**；产品 / 交互 / 视觉 / 执行四阶段不再产出平行的 registry JSON + md，而是**分阶段、原位地往同一棵 schema 树上补充信息**；md 从"信息源"降级为 schema 的**只读派生视图**。
>
> 起草：2026-05-29 ｜ 关联：`DESIGN_FLOW_ANALYSIS.md`（问题实证）

> ⚠️ **历史文档说明（v2.4 更新）**：本文是 v2.0 起草的方案记录。文中提及的 **R-EVENTS-01** 已于 **v2.4 删除**——它原本用 `meta.interaction.summary` 关键词正则启发式猜交互意图，对输入框 blur 校验、纯展示派生节点持续误报。屏级"有没有真交互"已改由 `I-X-events` 任务的 `expectedArtifacts: [{ kind: 'anyNodeHasEvents', path: 'rootNode' }]` 守（结构判断零误报）。最新红线全集见 `STAGE-CONTRACT.md` §7。本文正文保留原貌作历史档案，**不改写**。

---

## 0. 一句话

> 当前设计链路有**三套平行真相**（schema / registry JSON / md），同一份信息被表达 2–3 次，最终靠 executor 在末端"翻译"回 schema——翻译有损，`events` 全丢就是铁证。
> 改造目标：**schema 是源头，不是末端译文**。设计过程 = 逐阶段往 schema 上补信息；schema 描述不了的，就**扩展 schema**，而不是另起炉灶。

---

## 1. 问题诊断：信息在哪一环损失（第一性）

### 1.1 当前数据流（主从颠倒）

```
product-analyst   ──写──▶  registry/_index.json + product-analysis/*.md
interaction-designer ─写─▶  registry/*.json(interaction层) + interaction-design/*.md
design-planner    ──写──▶  registry/*.json(design层)      + design-plan/*.md
                                      │
                                      │  （三套平行真相已成型，schema 仍是空的）
                                      ▼
design-executor   ──读 registry+md──▶ 【翻译】──▶ design-api schema  ◀── 真正的产物
                                      ▲
                                   信息在此处损失
```

schema 本应是源头，却沦为最后一步被"翻译"出来的末端产物。

### 1.2 三套平行真相

| 信息 | 在 schema 里 | 在 registry JSON 里 | 在 md 里 |
|------|:----------:|:-----------------:|:-------:|
| 触发类型 | `event.trigger`（枚举） | `interaction.trigger`（枚举） | 操作清单"触发"列 |
| **交互动作** | `event.actions[]`（22 动词） | ❌ **无字段**，只有 `summary` 自然语言 | 操作清单自然语言 |
| 前置条件 | `event.condition.when` | `interaction.condition`（表达式） | "前置"列 |
| 状态变量 | `stateInit.view` | `interaction.states`（字符串数组） | 状态机 |
| 样式 | `node.styles`（完整） | `design.keyStyles`（子集） | visual.md §6 全表 |
| 视觉态 | `node.states[]` | `design.visualStates`（简写） | visual.md |

**致命点在第 2 行**：`event.actions` 在 schema 里是一等结构化字段，在 registry 里**根本没有对应字段**，只能靠 `interaction.summary`（如 `"click→切换验证码/密码 mode"`）这句自然语言 + `ref` 指针承载。

### 1.3 实证：events 为什么会丢（来自真实文件）

`registry/pages/00-login/mode-toggle.json` 的 interaction 层：

```jsonc
"interaction": {
  "summary": "click→切换验证码/密码 mode",          // 自然语言
  "ref": "interaction-design/pages/00-login.md#操作清单:1",
  "trigger": "click",                              // ✅ 结构化
  "flows": { "success": { "summary": "...", "ref": "..." } },  // 半结构化
  "states": ["code-mode", "password-mode"]          // ✅ 结构化
  //  ❌ 没有 actions 字段 —— "点了要 state.set(loginMode)" 无处安放
}
```

全链路里，`trigger / condition / styles / states` 都是上游已结构化、executor 只需**搬运**的信息；唯独 `actions` 需要 executor 在 Step 1c **现场把 md 自然语言翻译成结构化 action**。翻译比搬运脆弱得多，且数据模型里**没有一个空的 `actions` 字段提醒它"这里还没填"**——于是 executor 写了条件样式（视觉响应）后，误以为交互闭环已完成，`events` 留空，`checklist.events` 却标 `true`。

### 1.4 根因

> **主从颠倒**：schema 本是 SSOT，却被设计成"最后翻译出来的产物"。一个本该在 interaction-designer 阶段就固化成结构化 `action` 的决策，被推迟到 executor 让 LLM 即兴翻译——它经常翻不出，或以为不用翻。
>
> registry 的存在，本质是给 schema 造了一个**低保真的影子**。影子与本体不同步，就是一切"丢失/假完成"的温床。

---

## 2. 关键事实：schema 已经足够（带证据）

| 维度 | schema 能力 | 证据（类型定义） |
|------|------------|----------------|
| **行为/交互** | `ComponentEvent{ trigger, actions[], condition, description, disabled }` + 22 种 `Action` 动词（state/effect/nav/ui/logic/custom） | `types/action.ts` |
| **状态** | `ScreenStateInit{ data, view, dataTypes }` + `GlobalStateInit` + `dataSources[]` + `overlays[]` | `types/state.ts` `types/screen.ts` |
| **视觉** | `ExpressionStyles`（表达式样式）+ `node.states[]`（visualState）+ `themeConfig` | `types/node.ts` `types/theme.ts` |
| **导航** | `nav.go{ targetScreenId, animation }` / `nav.back` | `types/action.ts` |
| **设计意图（先例！）** | `ThemeDefinition.intent`（v1.0：在 `themeConfig.themes[active].intent`，不是 ThemeConfig 顶层）、`node.editorMetadata`、`ComponentEvent.description` —— schema **早已有"挂非运行时信息"的位置** | `types/theme.ts` `types/node.ts` |

**结论**：
- **A 类信息（能成为运行时产物）**：schema 100% 能装，且大多已是一等字段。registry 对这类信息是纯粹的重复弱表达。
- **B 类信息（产品需求 / 设计意图 / 推理依据 / 溯源）**：不进运行时，但 schema 目前只有零散先例（theme.intent / editorMetadata），缺一个**标准化的 `meta` 命名空间**来系统承载。

→ 真正要补的，只有 B 类的"家"。补上之后，registry 就没有存在理由。

---

## 3. 改造目标

1. **单一事实源**：schema = SSOT。所有读写围绕 schema。
2. **信息分层**：
   - **A 类** → schema **一等字段**（events.actions / stateInit / styles / states / dataSources / overlays / navigation）。
   - **B 类** → schema **`meta` 命名空间**（产品溯源 / 设计意图 / 推理 / 完成度）。渲染契约**不读** meta。
3. **零翻译**：A、B 都按 `nodeId` 挂在同一棵树上，阶段间增量补充，无跨载体翻译。
4. **md 降级**：从"信息源"变为 **schema → md 的单向派生视图**（给人看的叙事报告）。
5. **废弃 registry**：消灭平行真相（遵循 `AGENTS.md` 第九章"无双版本"）。

---

## 4. Schema 扩展设计（B 类信息的家）

### 4.1 节点级 `meta`

```typescript
// features/design-schema/src/types/meta.ts （新增）

/** 完成度追踪（取代 registry 的 implementation 层） */
export interface NodeStatus {
  phase: 'analyzed' | 'interaction-defined' | 'designed' | 'built' | 'verified';
  /** 各维度是否就绪（取代 registry checklist；但由 schema 校验器自动核验，非人工自报） */
  ready?: { structure?: boolean; styles?: boolean; events?: boolean; visualStates?: boolean; materials?: boolean };
  notes?: string;
}

/** 设计意图 / 溯源（B 类） */
export interface NodeMeta {
  /** 产品层：该节点承担的需求、来源模块、业务规则 */
  product?: { summary?: string; fromModules?: string[]; rules?: string[]; ref?: string };
  /** 交互层：状态机叙事、流程说明（结论性，actions 已在 events 里结构化，这里只放"为什么"） */
  interaction?: { summary?: string; states?: string[]; flows?: Record<string, string>; ref?: string };
  /** 视觉层：设计理由、配色意图、素材说明 */
  design?: { summary?: string; rationale?: string; ref?: string };
  /** 边界场景分析 */
  extremeCases?: { scenario: string; handling: string }[];
  /** 完成度 */
  status?: NodeStatus;
}
```

```typescript
// types/node.ts — ComponentNode 增加（向后兼容，纯增字段）
export interface ComponentNode {
  // ... 现有字段 ...
  /** 设计意图 / 溯源 / 完成度（B 类，渲染契约不读） */
  meta?: NodeMeta;
}
```

### 4.2 屏幕级 / 项目级 `meta`

```typescript
// types/screen.ts — Screen 增加
meta?: {
  product?: { summary?: string; fromModules?: string[]; rules?: string[]; ref?: string };
  interaction?: { states?: string[]; operations?: { op: string; triggerNodePath: string }[]; ref?: string };
  design?: { summary?: string; palette?: string[]; ref?: string };
  status?: NodeStatus;
};

// types/project.ts — DesignProject 增加
meta?: {
  targetUser?: { summary: string; ref?: string };
  coreScenarios?: { id: string; summary: string; ref?: string }[];
  styleDirection?: { summary: string; ref?: string };
  constraints?: { decisions: { id: string; summary: string; ref?: string }[] };
  modules?: Record<string, { name: string; priority: string; summary: string; ref?: string }>;
  /** navigation 流转图（A 类的导航补充：每条 flow 对应一个 nav.go action 的溯源） */
  navigation?: { tabBar: string[]; flows: { from: string; to: string; trigger: string; transition: string }[] };
};
```

> 这三个 `meta` 块，正好一一对应当前 `registry/_index.json`、`_page.json`、节点 JSON 的 product/interaction/design 层。**registry 的全部内容都能无损搬进 schema.meta**。

### 4.3 渲染契约保持纯净

`meta` 与现有 `editorMetadata` 同属"渲染不读"命名空间。建议：`editorMetadata`（编辑画布锚定，已存在）保持不动；新增 `meta`（设计意图/溯源/完成度）。codegen / SchemaRenderer / PreviewRenderer 一律忽略 `meta`。

---

## 5. 阶段职责重定义（四技能直接写 schema）

> 核心切换：四个技能不再产出 `design-registry/*.json` 和 `*-design/*.md` 作为"信息源"，而是**每完成一步分析/决策就立刻通过 MCP 把该步结果写入 schema**。md（如果还要留）由生成器从 schema 派生。

### 5.1 总览

| 阶段 | 写入 schema 的 **A 类（一等字段）** | 写入 schema 的 **B 类（meta）** | 关键变化 |
|------|----------------------------------|------------------------------|---------|
| **product-analyst** | `query/create_project` 建项目；`screen/add` 建每个屏幕骨架 | `meta/set_project`（targetUser/coreScenarios/styleDirection/constraints/modules/navigation）+ 每屏 `meta/set_screen.product` | 不再产出 `_index.json` / `_page.json` / `product-analysis/*.md` |
| **interaction-designer** | `state/view_add` 落 view 变量；`data_source/add` 落数据源；**`event/add` 落 events.actions（★根治点）**；`screen/add_overlay` 落 modal/sheet/toast | 每节点 `meta/set_node.interaction`（状态机叙事/flows summary）+ 每屏 `meta/set_screen.interaction` | actions 在此阶段就以 22 种 v2 动词结构化落库，executor 无翻译环节 |
| **design-planner** | `element/add`+`style/update` 创建节点 + 全量样式；`visual_state/add` 落 visualStates；`theme/set_theme_tokens` 落主题（v1.0）| 每节点 `meta/set_node.design`（配色理由/visualRef）+ 每屏 `meta/set_screen.design` | 直接写全量样式，废弃 keyStyles 子集；废弃 visual.md §6 作为"全量样式权威"的角色 |
| **design-executor** | 仅剩素材：`material-painter` 通过 `canvas.export_and_apply` 写槽位；结构微调通过 `element/*` | 每节点 `meta/set_node_status`（status.phase + ready，**ready 不再人工自报，由 integrity 自动核验**） | 收敛为"补素材 + 校验 + 截图"；不再翻译结构/样式/事件 |

### 5.2 各阶段产出协议（必须按此顺序调用 MCP）

#### 5.2.1 product-analyst

**输入**：用户的产品诉求自然语言描述。
**输出**：一个已建好屏幕骨架、已填好 `project.meta` / 每屏 `screen.meta.product` 的 schema。**不产生任何 md / json 文件**。

调用顺序：

```
1.  query/create_project { name, platform }
    → 拿到 projectId

2.  对每个识别出的模块 / 用户场景 / 关键决策，整理为 ProjectMeta 结构：
    meta/set_project {
      projectId,
      patch: {
        targetUser: { summary, ref? },
        coreScenarios: [{ id, summary, ref? }, ...],
        styleDirection: { summary, ref? },
        constraints: { decisions: [{ id, summary }, ...] },
        modules: { M1: { name, priority, summary }, ... },
        navigation: { tabBar: [...], flows: [{ from, to, trigger, transition }, ...] }
      }
    }

3.  对 navigation.flows 中出现的每个 screenId，screen/add 建空白屏幕骨架：
    screen/add { projectId, screenId: "00-login", name: "登录页", ... }

4.  对每个屏幕填写产品层叙事：
    meta/set_screen {
      projectId, screenId,
      patch: {
        product: {
          summary: "...",
          fromModules: ["M5"],
          rules: ["..."],
          ref?: "schema://meta/.../product"   // 仅当确实有外部权威文档时用，否则省略
        },
        status: { phase: "analyzed" }
      }
    }
```

**禁止**：产出 `_index.json`、`_page.json`、`product-analysis/*.md`。

#### 5.2.2 interaction-designer

**输入**：上一步的 schema（含 `project.meta` + 每屏 `screen.meta.product`）。
**输出**：每屏的 `stateInit`、`dataSources`、关键节点的 `events.actions[]`、`overlays`，以及每节点 `meta.interaction` 叙事。

调用顺序（对每个屏幕）：

```
1.  query/screen_schema → 读当前 schema

2.  状态变量：对每个 view 状态调用
    state/view_add { projectId, screenId, variable: { name: "loginMode", defaultValue: "code", enum: [...] } }

3.  数据源：对每个 api / static
    data_source/add { projectId, screenId, type: "api"|"static", name, endpoint?, initial?, mock? }

4.  交互节点的事件（★ 根治点）—— 对操作清单中每条操作：
    a. 先 element/add 创建该交互节点（如未存在）—— 这一步即使在 designer 阶段也允许；
       interaction 阶段建好的节点骨架，让 planner 阶段填样式（增量补全，不是阶段独占）。
    b. event/add {
         projectId, nodeId,
         trigger: "click" | "change" | ...,
         actions: [
           { type: "state.set", path: "view.loginMode", value: "..." },
           { type: "effect.fetch", dataSourceId: "...", onSuccess: [...] },
           ...
         ],
         condition?: { when: "..." },
         description: "切换验证码/密码登录方式"
       }

5.  Modal/Sheet/Toast：screen 的 overlays[]（如 modal 形态的"忘记密码/异地登录确认"）
    screen/add_overlay { projectId, screenId, overlay: { id, name, type, rootNode, showWhen? } }

6.  叙事写入：对每个写了 events 的节点
    meta/set_node {
      projectId, nodeId,
      patch: {
        interaction: {
          summary: "click→切换验证码/密码 mode",
          states: ["code-mode", "password-mode"],
          flows: { success: "...", error: "...", boundary: "..." }
        }
      }
    }

7.  屏幕级叙事：
    meta/set_screen { ..., patch: { interaction: { summary, states, operations: [{op, triggerNodePath}] }, status: { phase: "interaction-defined" } } }

8.  ⛔ 该屏结束前必须自检：
    query/integrity { projectId, screenId }
    → 若 R-EVENTS-01 / R-EVENTS-02 报错（节点声明了交互意图但 events 没结构化）必须修；
    → 0 error 方算完成。
```

**禁止**：产出 `interaction-design/*.md` 作为信息源。如要给人读，由 `schema → md` 生成器派生。

#### 5.2.3 design-planner

**输入**：已含 stateInit/events 的 schema + 用户的视觉风格描述（或 product.styleDirection）。
**输出**：每个节点的完整 `styles`、`states[]`（visualStates）、`themeConfig`、每节点 `meta.design` 叙事。

调用顺序（对每个屏幕）：

```
1.  theme/check → 若未定制，先用 theme-generator
2.  theme/set_theme_tokens / set_theme_intent → 落主题（v1.0，写到 themes[active] 内）
3.  query/screen_schema → 读 interaction-designer 阶段建好的节点骨架

4.  对节点树补全（widening 模式 — 不破坏已建结构）：
    a. element/add 补充纯装饰/容器节点（interaction 阶段没建的）
    b. style/update { nodeId, styles: { ...全量 CSS } }    — 全量样式，含 fontFamily/lineHeight/transition 等
    c. visual_state/add { nodeId, name: "hover", styleOverrides: {...} }
       对所有 visualState 逐个 add

5.  meta/set_node {
      patch: {
        design: { summary: "...", rationale: "粉色暖白主调贴合青春治愈风", ref?: "..." }
      }
    }

6.  meta/set_screen { patch: { design: { summary, palette }, status: { phase: "designed" } } }

7.  自检：query/integrity（R-STATUS-02/03 检查 ready.styles/visualStates 与真实数据是否一致）
```

**禁止**：产出 `design-plan/*.md` 作为 styles 的"权威全表"。AI 后续读样式直接 `query/screen_schema`。

#### 5.2.4 design-executor

**输入**：已含完整结构 + 样式 + events + visualStates 的 schema。
**输出**：素材应用、整体校验通过、生成快照。

调用顺序：

```
1.  query/screen_schema → 读完整 schema
2.  对每个有素材的节点，Skill("material-painter")（已有流程，写入 node_material_slots）
3.  每个节点收尾：
    meta/set_node_status {
      projectId, nodeId,
      status: { phase: "verified" }    — ⚠️ ready 字段不再人工标，由 integrity 自动核验
    }
4.  query/integrity { projectId } → 必须 0 error 才算交付
5.  generate_snapshots → 出图给用户/QA 看
```

**executor 不再做的事**：
- ❌ 读 registry JSON / md 翻译成 events（events 已在 interaction 阶段结构化进 schema）
- ❌ 读 visual.md §6 翻译成 styles（styles 已在 planner 阶段结构化进 schema）
- ❌ 自报 `checklist.events: true`（由 integrity 真实对账）

### 5.3 阶段间增量补全规则

| 现象 | 处理 |
|------|------|
| interaction 阶段发现 product 阶段漏了某场景 | 直接补 `meta.set_project` 增量字段（merge 模式）；不需要"回到上一阶段重跑" |
| planner 阶段发现 interaction 漏建一个节点 | 直接 `element/add` + `event/add` 补；同时回填 `meta.set_node.interaction` |
| executor 阶段发现某节点缺 hover 态 | 直接 `visual_state/add`，**不退回 planner** |

阶段是**职责定义**，不是**门禁锁**——AI 可以越阶补，只要最后 integrity 通过即可。

### 5.4 与 events 丢失问题的闭环

```
旧流程：
  registry.interaction.summary（"click→切换"自然语言）
    → executor 翻译 → event/add（经常翻不出）

新流程：
  interaction-designer 直接 → event/add（结构化落库）
    → executor 无翻译环节
    → integrity 在 designer 阶段就检查 R-EVENTS-01/02
```

`actions` 一旦在上游结构化落库，executor 只需"已存在、无需动作"，根本没有"翻译"环节可丢失。

---

## 6. 工具层改造

| 能力 | 现状 | 改造 |
|------|------|------|
| **切片读** | `query/screen_schema` 已支持按屏读 | 保留 |
| **切片写** | 只能整 project 操作（registry 存在的部分理由） | 增加按 `screenId` / `subtree` 的局部写 MCP，避免整树 IO |
| **完成度追踪** | registry `implementation.checklist`（人工自报） | 并入 `node.meta.status`，由校验器**自动核验**而非自报 |
| **校验（对账内建）** | 外部 `validate.ts` 只查 registry 内部自洽 | schema 内建校验器：`trigger 存在 ⇒ actions 非空`、`status=verified ⇒ 关键字段齐备`。**直接读真实 schema，无平行真相可造假** |
| **md 视图** | md 是源 | 新增 `schema → md` 单向生成器（产出 visual.md / interaction.md 给人看），md 不再被回读 |

> 校验内建到 schema 这一步，正好把 `DESIGN_FLOW_ANALYSIS.md` 里"假完成"的事后兜底也一并解决——因为不再有 registry 让 LLM 自报，校验器直接对真实 schema 算账。

---

## 7. 迁移路径（分步、可回滚）

| 阶段 | 动作 | 风险 | 回滚 |
|:----:|------|------|------|
| **P0** | schema 增加 `meta` 命名空间（node/screen/project）+ `NodeStatus`。纯增字段，向后兼容 | 极低 | 删字段 |
| **P1** | 工具：切片写 MCP + schema 内建校验器 + `schema→md` 生成器 | 低 | 工具独立，可禁用 |
| **P2** | **改造 interaction-designer 先行**（最大收益：events 不再丢） | 中 | 技能文件独立 |
| **P3** | 改造 product-analyst / design-planner / design-executor | 中 | 逐个技能切换 |
| **P4** | 一次性迁移脚本：现有 `registry/**` → `schema.meta`（按 nodeId 对齐回填） | 中 | 迁移脚本幂等可重跑 |
| **P5** | 删除 `design-registry/` + `create-node.ts/write-node.ts/validate.ts/task-gen.ts` 等 registry 脚本（`AGENTS.md` §9 无双版本） | 中 | git revert |

**先做 P0 + P1 + P2** 就能根治"events 丢失"这个最痛的问题，且不破坏现有链路（registry 仍可并存于过渡期，但仅 P5 前）。

---

## 8. 取舍与风险

| 顾虑 | 回应 |
|------|------|
| schema 变大、不好整体读写 | 切片读写 MCP（P1）解决——这本是 registry 唯一站得住的理由，补上后 registry 失去存在意义 |
| meta 膨胀 | meta 内仍可用 `summary + ref` 精简表达；`ref` 指向**派生 md**（视图），不是源 |
| 人类可读性下降 | `schema→md` 生成器（P1）保证：人看 md，机器读 schema，单向不回流 |
| 长篇产品推理（如 key-decisions 头脑风暴） | 属纯过程叙事，留 md 作 `meta.*.ref` 附件即可；但**不进 executor 读取链路**（executor 只读 schema） |
| 迁移成本 | P4 一次性脚本，按 `implementation.nodeId`（registry 已存了真实 nodeId）对齐回填，幂等可重跑 |

---

## 9. 与 `DESIGN_FLOW_ANALYSIS.md` 既有问题的映射

| 既有问题 | 本方案如何**根治**（非补丁） |
|---------|---------------------------|
| events 全空但标 completed | interaction 阶段直接写 `schema.events.actions`；executor 无翻译环节；校验器读真实 schema 核验 |
| 验证形同虚设（自我指涉） | 校验内建 schema，无 registry 可自报造假 |
| 条件样式 ≠ 事件 的认知混淆 | `actions` 是 schema 一等字段，空着即可见缺口；不再靠 LLM"以为做完了" |
| page-builder 默认样式污染 | design 阶段写**全量** styles 进 schema；可移除 `inferPracticalDefaults` 的启发式猜测 |
| visual.md §6 颗粒度不足 | design 阶段直接写 `node.styles` 全量，md 反过来由 schema 派生，不存在"颗粒度不够" |
| 节点 label/name 双字段 | schema 已加 `label`（2026-05-29 完成），与本方案方向一致 |

---

## 10. 落地清单（Checklist）

- [x] **P0-1** `types/meta.ts`：`NodeMeta` / `ScreenMeta` / `ProjectMeta` / `NodeStatus`（2026-05-29）
- [x] **P0-2** `ComponentNode.meta` / `Screen.meta` / `DesignProject.meta`（2026-05-29）
- [x] **P0-3** 删除 v1→v2 迁移层（无历史负债），序列化天然透传 `meta`（2026-05-29）
- [x] **P1-1** MCP `meta/*` 4 个 action + 后端 op 链路（2026-05-29）
- [x] **P1-2** schema 内建 integrity checker（R-EVENTS-01/02、R-STATUS-01/02/03、R-PHASE-01）+ API endpoint + MCP `query/integrity`（2026-05-29）
- [x] **P2.1** `v2-actions-cheatsheet.md` 速查表（2026-05-29）
- [x] **P2.2** `product-analyst/SKILL.md` 重写为 Schema-First（2026-05-29）
- [x] **P2.3** `interaction-designer/SKILL.md` 重写为 Schema-First — ★ 根治 events 丢失（2026-05-29）
- [x] **P2.4** `design-planner/SKILL.md` 重写为 Schema-First（2026-05-29）
- [x] **P2.5** `design-executor/SKILL.md` 大幅瘦身为"素材+校验+截图"（2026-05-29）
- [x] **P2.6/7** 删除 `.claude/skills/common/scripts/`（全部 8 个 registry 脚本 + tsconfig + README）+ `common/references/stage-gate.md` + design-planner/executor 下旧 references + `.claude/rules/design-pipeline-standards.mdc` + 根目录 `design-registry-proposal.md`（2026-05-29）
- [ ] P1-3 `schema → md` 单向视图生成器（**可选**，给人看的派生视图；不影响主链路）
- [ ] P4 删除现有 `.design-workspaces/*/design-registry/` 目录（按 AGENTS.md §9 "无双版本"——但这是项目数据目录，由用户自行决定何时清空）

---

## 11. 技能改造执行手册（P2）

> 这是 P2 的具体落地清单——每个技能怎么改、改完长什么样、产物变成什么。
> 改造遵循 `AGENTS.md` §9 "无双版本"：旧流程直接删，不留兼容分支。

### 11.0 改造涉及的文件总览

```
.claude/skills/
├── product-analyst/SKILL.md         ← 重写（§11.1）
├── interaction-designer/SKILL.md    ← 重写（§11.2）
├── design-planner/SKILL.md          ← 重写（§11.3）
├── design-executor/SKILL.md         ← 大幅瘦身（§11.4）
├── common/scripts/
│   ├── create-node.ts               ← 删除（registry 专用）
│   ├── write-node.ts                ← 删除
│   ├── validate.ts                  ← 删除（被 integrity API 取代）
│   ├── task-gen.ts                  ← 删除（EXECUTOR-PLAN.md 不再需要）
│   ├── stats.ts                     ← 删除
│   ├── query.ts                     ← 删除（被 MCP query/* 取代）
│   └── stage-gate.ts                ← 重写为基于 integrity API（§11.5）
└── common/references/               ← 保留（通用规则文档，与流程无关）
```

工作区目录改造：

```
.design-workspaces/<project>/
├── design-registry/                 ← P4 删除
└── product-analysis/*.md            ← 这些可保留作"给人读的派生视图"，但
    interaction-design/*.md            **不再被 AI 流程读取**——AI 只读 schema。
    design-plan/*.md
```

### 11.1 product-analyst 改造

**旧产物**：`product-analysis/*.md` + `design-registry/_index.json` + `design-registry/pages/*/​_page.json`（只填 product 层）

**新产物**：只有 schema 上的 `project.meta` + `screen.meta.product`，无任何文件。

**SKILL.md 主体重写要点**：

```
触发 / 不触发：保留

Phase 1：理解需求（不变）

Phase 2：分析产出（重写）
  以前：write-node.ts 写 registry 三层文件 + 产 md
  现在：按 §5.2.1 的调用顺序，全程 MCP：
    Step 1: query/create_project
    Step 2: meta/set_project（一次性塞整个 ProjectMeta 结构）
    Step 3: 每个屏幕：screen/add + meta/set_screen（product 层）

Phase 3：交付门禁（重写）
  以前：脚本 validate.ts
  现在：query/integrity（不要 R-EVENTS-01/02，因为还没到交互阶段）
       期望：仅出现 W: "节点缺 interaction/design"（正常，下一阶段补）
       不应出现：E 级 R-PHASE-01 / R-STATUS-* 不一致

⛔ SKILL.md 必须显式声明：不允许写任何文件到工作区
```

### 11.2 interaction-designer 改造（★ 根治 events 丢失）

**旧产物**：`interaction-design/*.md` + `registry/*.json` 的 interaction 层

**新产物**：
- schema A 类：`stateInit.view/data`、`dataSources`、`overlays`、**`node.events[].actions[]`**
- schema B 类：每节点 `meta.interaction`（叙事）+ 每屏 `meta.screen.interaction`

**SKILL.md 主体重写要点**：

```
Phase 0：环境准备
  - read_file: .claude/skills/common/references/v2-actions-cheatsheet.md
    （★ 新建参考文档 — 22 种 Action 动词的速查表，确保不靠记忆而靠对照）

Phase 1：交互建模（每屏一轮，按 §5.2.2 调用顺序）

Step 1：读 schema
  query/screen_schema → 拿到 product-analyst 阶段建好的屏幕骨架

Step 2：状态变量
  对每个 view 变量：state/view_add（不再用 registry 的 interaction.states 字符串数组）

Step 3：数据源
  对每个 api/static：data_source/add + 至少一个 mock 场景

Step 4：节点 + 事件（核心）
  操作清单：用户的每条"操作描述"必须翻译成两步 MCP：
    a. element/add 创建触发节点（如 mode-toggle 不存在）
    b. event/add 写入完整 actions 链 — ★ 必须列出每个 action 的精确动词
  
  ★ Skill 必须给 LLM 提供"句式 → action 链"的模板，例如：
    "click→切换 A/B"     => state.set { path, value: 三元表达式 }
    "click→submit 表单"  => 校验 condition + effect.fetch + onSuccess/onError 链
    "input→记录字符"     => bind: { path } （非 event）
    "click→跳页"         => nav.go { targetScreenId }

Step 5：覆盖层（Modal/Sheet/Toast）
  screen/add_overlay

Step 6：叙事（B 类）
  每个节点 / 每屏 meta/set_node + meta/set_screen 的 interaction 层

Step 7：自检（强制门禁）
  query/integrity { screenId }
  → R-EVENTS-01/02 必须 0
  → 出 error 必须立即修，不允许走下一屏

⛔ 禁止写任何 .md / .json 文件
```

新增参考文件：`.claude/skills/common/references/v2-actions-cheatsheet.md`（22 种动词速查 + 常见交互句式 → action 链映射）。

### 11.3 design-planner 改造

**旧产物**：`design-plan/pages/*/visual.md` §6 全量样式表 + `registry/*.json` 的 design 层

**新产物**：直接 `style/update` 写全量 styles + `visual_state/add` 写 visualStates + `meta/set_node.design` 叙事。

**SKILL.md 主体重写要点**：

```
Phase 0：theme 门禁（已有，保留）

Phase 1：按屏处理（每屏一轮，按 §5.2.3 调用顺序）

Step 1：读 schema
  query/screen_schema → 拿到 interaction-designer 建好的节点 + events

Step 2：补结构（widening 模式）
  对纯装饰 / 容器节点：element/add（interaction 阶段没建的，这里补；不破坏已有 events）

Step 3：全量样式（★ 不再有 keyStyles 子集概念）
  对每个节点：style/update { nodeId, styles: {...全部 CSS} }
  → 必须含 layout / typography / color / spacing / transition / shadow 等所有相关属性
  → 不允许"只写关键样式，留给 executor 补"——一次到位

Step 4：visualStates
  visual_state/add { nodeId, name: "hover" | "pressed" | ..., styleOverrides }

Step 5：叙事
  meta/set_node { patch: { design: { summary, rationale, ref? } } }

Step 6：自检
  query/integrity { screenId }
  → R-STATUS-02/03 必须 0
  → 应自动通过：ready.styles 由 integrity 直接对账 (Object.keys(styles).length > 0)

⛔ 禁止写 design-plan/*.md 作为 AI 后续要读取的"权威全表"
   如想给设计师/QA 看派生 md，由 schema→md 生成器产出（P1-3，非必需）
```

### 11.4 design-executor 改造（大幅瘦身）

**旧 SKILL.md**：333 行，8 个 G1-G8 硬约束，Step 1-5 + Phase 1.5 / 2 / 3 复杂流程。

**新 SKILL.md**：预计 100 行内，只做三件事：素材 + 校验 + 截图。

**改造前**：

```
Phase 0: 上游门禁 + 任务生成 + EXECUTOR-PLAN.md
Phase 1: 逐节点 Step 1-5（读 JSON → 提取规格 → 委托 page-builder → 验证 → 回写 registry）
Phase 1.5: 阶段截图
Phase 2: 页面级 validate.ts
Phase 3: stage-gate.ts 收尾门禁
```

**改造后**：

```
Phase 0：环境检查
  query/project_info → 项目存在
  query/integrity → 拿到 product/interaction/design 阶段遗留的问题清单
                    （应该已经 0 error；如果有 → 退回上一阶段）

Phase 1：素材绘制（每屏）
  query/screen_schema
  对节点 meta 中声明了 material 的节点：Skill("material-painter")
  （material-painter 内部已经在做槽位绑定 / canvas 绘制 / export_and_apply）

Phase 2：完成度回写
  每屏完成后：
    对该屏每个节点：meta/set_node_status { phase: "verified" }
    ⚠️ 不传 ready，由 integrity 自动核验

Phase 3：终验
  query/integrity { projectId }   → 必须 0 error
  generate_snapshots               → 出图

⛔ executor 不再：
  - 读 registry / md 翻译
  - 调 page-builder（结构/样式/事件已在 planner/designer 阶段完成）
  - 写 EXECUTOR-PLAN.md / 自报 checklist
```

**page-builder 的归属变更**：原 executor 通过 page-builder 委托 structure/style/event 操作。新流程中：
- structure 由 design-planner 直接调 `element/*` 完成
- style 由 design-planner 直接调 `style/*` 完成
- event 由 interaction-designer 直接调 `event/*` 完成

→ **page-builder 子技能从 executor 链路移到 designer/planner 链路**（或者直接废弃，由 SKILL.md 中的句式模板取代）。具体保留与否在 P2 实施时根据复杂度决定。

### 11.5 common 脚本改造

| 脚本 | 状态 | 原因 |
|------|:----:|------|
| `create-node.ts` | ❌ 删 | registry 节点创建，被 MCP `screen/add` + `element/add` 取代 |
| `write-node.ts` | ❌ 删 | registry 层级写入，被 MCP `meta/*` + `style/*` + `event/*` 取代 |
| `validate.ts` | ❌ 删 | 自我指涉式校验，被 schema 内建 integrity 取代 |
| `task-gen.ts` | ❌ 删 | EXECUTOR-PLAN.md 不再存在，executor 直接对 schema 工作 |
| `stats.ts` | ❌ 删 | 从 registry 统计完成度，被 `query/integrity` 取代 |
| `query.ts` | ❌ 删 | registry 查询，被 MCP `query/*` 取代 |
| `stage-gate.ts` | 🔁 重写 | 改为基于 `query/integrity` 的 entry/exit 门禁判定 |

`stage-gate.ts` 新签名：

```
npx ts-node stage-gate.ts \
  --projectId <id> --stage interaction|design|implementation --mode entry|exit
```

内部直接调 design-api 的 `/integrity` 端点，按阶段约定的"必过规则"判定，无外部 registry 依赖。

### 11.6 改造执行顺序

为了**让每一步都可独立验证、可回滚**：

```
P2.1  写 v2-actions-cheatsheet.md（参考文档先行）
P2.2  改 product-analyst/SKILL.md
        → 用一个新空项目跑端到端测试，验证 project.meta + screen.meta.product 都进了 schema
P2.3  改 interaction-designer/SKILL.md
        → 在 P2.2 的输出上继续跑，验证 events.actions / stateInit / overlays 都进了 schema
        → query/integrity 应该 0 error
P2.4  改 design-planner/SKILL.md
        → 验证 styles + visualStates + themeConfig
P2.5  改 design-executor/SKILL.md
        → 验证 material 应用 + 终验 0 error + 快照成功
P2.6  改 stage-gate.ts
P2.7  删除 registry 脚本 + （可选）删除工作区已有 registry 目录
```

每一步都用同一个测试项目（推荐新建一个简单"待办应用"，3-5 屏）端到端跑，保留之前的 campus-geo-social 不动作为对照，确认无回归。

---

> **一句话收尾**：不是"schema 不够所以要 registry"，而是"registry 把 schema 降级成了译文"。把 schema 重新立为源头，缺什么就给 schema 加什么（meta 命名空间），翻译层自然消失，信息损失随之消失。
