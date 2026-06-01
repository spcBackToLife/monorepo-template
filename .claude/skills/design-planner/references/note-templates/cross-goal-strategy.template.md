> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{screenId}-cross-goal-strategy
> 对应 schema 字段：screen.meta.design.visualStrategy
> 必读方法论：methodology/05-cross-goal-audit.md + methodology/06-decoration-system.md

# D-{screenId}-cross-goal-strategy — 跨目标统筹（Phase D）

## 0. 上游输入

| 来源 | 内容 |
|---|---|
| screen.meta.design.designGoals | 所有 goal 的 5 字段 |
| screen.meta.design.goalElementMap | 所有 goal 涉及元素 + changes + 权重 + 协同 |
| theme.tokens | 可用 token 池 |
| theme.intent | aesthetics / decoration / colorTemperature / brightness |

---

## 1. Step 1 — 元素 × 目标 矩阵

| 元素 / Goal | G1 | G2 | G3 | G4 | G5 |
|---|---|---|---|---|---|
| <node1> | <角色/权重> | - | - | - | <角色/权重> |
| <node2> | - | <角色/权重> | - | - | - |
| <node3> | <角色/权重> | <角色/权重> | - | - | - |
| ... | | | | | |

### 1.1 冲突检测

| 类型 | 触发 | 解决 |
|---|---|---|
| 双主角 (同元素 ≥ 2 goal 想做主角) | ❌ 无 / ✅ 触发,详见 §X | 让一个 goal 让出主角位 / 走 challenge |
| 装饰族冲突 (不同 goal 偏好不同族) | ❌ 无 / ✅ 触发 | 按 §3 规则取一个 / 走 challenge |
| 权重差 ≥ 4 | ❌ 无 / ✅ 触发 | md 解释累积理由 |

---

## 2. Step 2 — 元素权重终值（取最高）

| 元素 | sources | finalWeight | layer |
|---|---|---|---|
| <node1> | G1=7, G5=9 | **9** | 主角 |
| <node2> | G2=9 | **9** | 主角 |
| <node3> | G2=3, G4=7 | **7** | 配角 |
| ... | | | |

### 2.1 全屏权重金字塔

| 层 | 元素列表 | 数量 |
|---|---|---|
| 主角 (8-10) | <list> | <N> |
| 配角 (5-7) | <list> | <N> |
| 工具 (2-4) | <list> | <N> |
| 氛围 (0-1) | <list> | <N> |

**金字塔约束验证**:
- 主角 1-2: <验证>
- 配角 3-6: <验证>
- 工具 ≥ 5: <验证>
- 主角与配角差 ≥ 2: <验证>
- 总 weight ≤ 100: <验证>

---

## 3. Step 3 — 装饰系统单一族选定

### 3.1 各 goal 装饰需求统计

| Goal | 装饰需求族 | 涉及元素数 |
|---|---|---|
| G1 mood | soft-glow | 2 |
| G7 storytelling | illustration | 3 |
| ... | | |

### 3.2 选定逻辑

- 频次最高的族: <族>
- 与 theme.intent.aesthetics 兼容性: <兼容 / 冲突>
- 与 theme.decoration 密度上限兼容性: <兼容 / 冲突>
- **选定**: <族>
- **决策理由**: <一段话>

### 3.3 跨族冲突的 UpstreamChallenge

如有冲突 → 走 challenge: <详见 challenge md>

---

## 4. Step 4 — 60-30-10 调色累积

| 比例 | token 引用 | sourceGoal | role |
|---|---|---|---|
| 60% | $token:colors.<X> | G<N> | <主导色用途> |
| 30% | $token:colors.<X> | G<N> | <次要色用途> |
| 10% | $token:colors.<X> | G<N> | <强调色用途> |

### 4.1 强调色出现位置（10% 用法清单）

| 位置 | token | 视觉强度 |
|---|---|---|
| 1. <position> | <token> | 主用 / 中 / 弱 |
| 2. ... | | |
| ... | | |

**约束**: ≤ 6 处 (超量 = 强调失效)

---

## 5. Step 5 — 形状 / 字号 / 律动累积

### 5.1 形状语言

| 元素类型 | radius |
|---|---|
| card | $token:radius.lg |
| button-primary | $token:radius.lg |
| input | $token:radius.md |
| ... | |

**基调**: <soft / sharp / organic / geometric>

### 5.2 字号节奏

本屏使用档位（克制·只用 5 档）:

| 档 | px | 用途 |
|---|---|---|
| caption | 12 | 错误 / 链接 |
| body | 14 | label / 正文 |
| body-lg | 16 | 输入 / CTA |
| h4 | 20 | 副标 |
| h2 | 28 | 主标 (如有) |

字重梯度: 600 (主标) → 500 (label) → 400 (正文)

### 5.3 律动节奏

间距档位: 2xs(2) → xs(4) → sm(8) → md(16) → lg(24) → xl(32) → 2xl(48)

动效:
- fast 150ms - hover / focus
- normal 250ms - 状态切换
- slow 400ms - <用 / 不用>

缓动: cubic-bezier(0.4, 0, 0.2, 1) 默认

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId: "<projectId>",
  screenId: "<screenId>",
  patch: {
    design: {
      visualStrategy: {
        weightPyramid: [
          { nodeId: "...", finalWeight: 9, sources: ["G1=7", "G5=9"], layer: "主角" },
          // ...
        ],
        decorationSystem: {
          family: "...",
          density: "...",
          derivedFromGoals: ["G1", "G7"],
          rationale: "..."
        },
        colorRatio: {
          sixty: { token: "$token:colors.X", sourceGoal: "G1", role: "..." },
          thirty: { token: "$token:colors.Y", sourceGoal: "G2", role: "..." },
          ten: { token: "$token:colors.Z", sourceGoal: "G2", role: "..." }
        },
        accentUsage: ["...", "...", ...],
        shapeLanguage: {
          baseRadius: "soft",
          radiusMap: { ... }
        },
        typographyScale: {
          sizes: [...],
          weights: { ... }
        },
        rhythmTimings: {
          spacing: [...],
          motion: { ... },
          easing: "..."
        }
      }
    }
  }
}
```

---

## 7. 自检

- [ ] 元素 × 目标矩阵已构建
- [ ] 冲突检测跑过
- [ ] 全屏权重金字塔成立 (主角 1-2 / 配角 3-6 / 工具 ≥ 5)
- [ ] 装饰系统单一族选定 + 与 theme 兼容
- [ ] 60-30-10 三色都来自 token + 标 sourceGoal
- [ ] accentUsage ≤ 6 处
- [ ] 形状 / 字号 / 律动从 theme + goal 偏好累积有溯源
- [ ] 末尾「★ 沉淀到 schema 的结论」与 MCP 调用 1:1
