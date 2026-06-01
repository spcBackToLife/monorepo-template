> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{screenId}-positioning
> 对应 schema 字段：screen.meta.design.positioning
> 必读方法论：methodology/00-design-thinking.md + methodology/01-positioning.md

# D-{screenId}-positioning — 三层定位（Phase A）

## 1. Layer 1 — 产品定位

| 项 | 内容 | 来源 |
|---|---|---|
| 核心价值主张 | <≤60 字,从 project.meta.coreValue + targetUser 提炼> | project.meta |
| 目标用户 | <来自 project.meta.targetUser.summary + dailyApps + visualVernacular> | project.meta |
| 视觉差异化机会 | <"比 X 更 Y / 比 Z 更 W" 句式陈述> | 推理 |
| 用户视觉期待 | <≤30 字调性> | project.meta.styleDirection |

### 1.1 竞品视觉对照（强制 ≥ 2 个）

⚠️ 若 project.meta.targetUser.dailyApps 缺位 → 不允许凭印象写,立刻发 UpstreamChallenge 退回 product-analyst。

| 竞品 | 视觉特征 |
|---|---|
| <竞品 1（来自 dailyApps）> | <≥3 个具体特征,如"白底 + 黄黑配色 / 圆角卡片 + 大字 / 标签云 + 表情包文化"> |
| <竞品 2> | <同上> |

### 1.2 视觉差异化陈述

> <本产品在视觉上能站什么位 — "比 X 更 Y / 比 Z 更 W,差异化点 = ..."> 

---

## 2. Layer 2 — 页面定位

| 项 | 内容 |
|---|---|
| 屏在用户旅程的位置 | <从哪来 → 到哪去, ≤50 字> |
| 用户核心收益 | <≤30 字> |
| 产品核心目标 | <≤30 字> |

### 2.1 visualTiming 三档

| 时机 | 用户应看到 / 理解 / 决策什么 |
|---|---|
| 0.5 秒 | <用户进屏 0.5 秒看到 X 元素的 Y 信号> |
| 5 秒 | <用户 5 秒能理解 Z 操作 / 流程> |
| 30 秒 | <用户 30 秒能完成 W 决策> |

---

## 3. Layer 3 — 用户场景

| 项 | 内容 |
|---|---|
| 进屏心理状态 | <≤30 字,如"好奇 + 略防备 + 急迫想跳过"> |
| 紧迫度 | <low / medium / high,枚举> |
| 离屏心理期望 | <≤30 字,如"已加入校园圈层的预感"> |

### 3.1 紧迫度对设计目标的提示

<根据 urgency 写一段:high → 提示后续 goal 偏 cta-clarity / urgency;medium → 偏 hierarchy / state-feedback;low → 偏 mood-conveyance / decoration-storytelling>

---

## 4. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId: "<projectId>",
  screenId: "<screenId>",
  patch: {
    design: {
      positioning: {
        product: {
          coreValue: "...",
          differentiation: "...",
          visualExpectation: "...",
          competitorVisualReferences: [
            { product: "...", visualTraits: ["...", "..."] },
            { product: "...", visualTraits: ["...", "..."] }
          ]
        },
        page: {
          role: "...",
          userBenefit: "...",
          productGoal: "...",
          visualTiming: {
            zeroPointFiveSec: "...",
            fiveSec: "...",
            thirtySec: "..."
          }
        },
        userScenario: {
          psychOnEnter: "...",
          urgency: "low | medium | high",
          psychOnExit: "..."
        }
      }
    }
  }
}
```

---

## 5. 自检

- [ ] product / theme / interaction 三个上游产物都已 read
- [ ] competitorVisualReferences ≥ 2 项,每项 ≥ 3 visualTraits
- [ ] 视觉差异化陈述含"比 X 更 Y"对照,不空泛
- [ ] page.userBenefit ≤ 30 字 / page.productGoal ≤ 30 字
- [ ] visualTiming 三档全填
- [ ] urgency ∈ {low, medium, high}
- [ ] 末尾「★ 沉淀到 schema 的结论」与 MCP 调用 1:1
