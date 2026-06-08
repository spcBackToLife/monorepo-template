> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{screenId}-design-goals
> 对应 schema 字段：screen.meta.design.designGoals[]
> 必读方法论：methodology/02-goal-extraction.md
> 必读 schema-spec：schema-spec/screen-meta-design.md §designGoals + schema-spec/goal-success-criteria.md

# D-{screenId}-design-goals — 设计目标提取（Phase B 核心）

## 1. 候选目标列表（Step 1：先广后窄）

故意写多（≥ 5 个）,后面 Step 2 收敛。

| 候选 ID | 候选 statement | 来源（positioning 哪段）| 候选 impactMode |
|---|---|---|---|
| C1 | ... | positioning.product.differentiation | mood-conveyance |
| C2 | ... | positioning.page.visualTiming.fiveSec | cta-clarity |
| C3 | ... | positioning.userScenario.psychOnEnter | trust-signal |
| C4 | ... | interaction.state.view 业务态 | state-feedback |
| C5 | ... | positioning.product.brandVoice | brand-recognition |
| ... | | | |

---

## 2. 收敛过程（Step 2：按 impactMode 分类 → 每类至多 1 个）

### 2.1 同类合并

| impactMode | 候选合并 | 理由 |
|---|---|---|
| mood-conveyance | C1 + C8 → G1 | 都是温度氛围相关 |
| cta-clarity | C2 → G2 | 单独保留,核心动作 |
| trust-signal | C3 → G3 | 合规红线 |
| state-feedback | C4 + C7 → G4 | 锁定 + 倒计时合并 |
| brand-recognition | C5 → G5 | 登录页是品牌门面 |
| hierarchy | (跳过) | 模式切换权重不如 CTA |
| decoration-storytelling | (本屏暂无强需求) | |

### 2.2 优先级分配

| Goal | 优先级 | 理由 |
|---|---|---|
| G1 mood | P0 | 用户带防备入屏,降焦虑是注册前置条件 |
| G2 cta | P0 | 登录是核心动作,不清晰 = 流失 |
| G3 trust | P1 | 合规红线但非主要矛盾 |
| G4 state | P1 | 锁定态非主流场景 |
| G5 brand | P0 | 登录页是品牌门面,Logo 真画必须 |

总数 5 个 (≥3 ≤7) ✅,P0=3 (≤3) ✅。

---

## 3. 每个目标的 5 字段

### Goal G1 (P0) — mood-conveyance

| 字段 | 内容 |
|---|---|
| **statement** | <含动词+主体+视觉机制+具体感觉+价值产出, ≤80 字> |
| **whyMatters** | <为何对产品有价值, ≤100 字> |
| **impactMode** | mood-conveyance |
| **priority** | P0 |
| **measureMethod** | <如何客观测量, 通常是"Bash 调 screenshot-screen.mjs + Read 截图,人工对照 successCriteria 逐条"> |

#### successCriteria（强制 ≥ 3 条,全部可视判据）

1. <可视判据 1>
2. <可视判据 2>
3. <可视判据 3>
4. <可选第 4 条>

#### forbiddenSignals（推荐 ≥ 2 条反例）

1. <出现这个信号即 fail>
2. <...>

### Goal G2 (P0) — cta-clarity

[同上结构]

### Goal G3 (P1) — trust-signal

[同上结构]

### Goal G4 (P1) — state-feedback

[同上结构]

### Goal G5 (P0) — brand-recognition

[同上结构]

---

## 4. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId: "<projectId>",
  screenId: "<screenId>",
  patch: {
    design: {
      designGoals: [
        {
          id: "G1",
          statement: "...",
          whyMatters: "...",
          impactMode: "mood-conveyance",
          successCriteria: [
            "...",
            "...",
            "..."
          ],
          priority: "P0",
          measureMethod: "...",
          forbiddenSignals: ["...", "..."]
        },
        // G2, G3, G4, G5
      ]
    }
  }
}
```

---

## 5. 自检

- [ ] designGoals 数量 ≥ 3 ≤ 7
- [ ] P0 ≥ 1 且 ≤ 3
- [ ] 每个 goal 5 字段齐全
- [ ] 每个 goal statement 含动词+主体+视觉机制+具体感觉+价值产出
- [ ] 每个 goal successCriteria ≥ 3 条
- [ ] successCriteria 全部可视判据,无"主题契合 / 现代化 / 舒服"等抽象描述
- [ ] impactMode ∈ 7 类枚举
- [ ] 末尾「★ 沉淀到 schema 的结论」与 MCP 调用 1:1
