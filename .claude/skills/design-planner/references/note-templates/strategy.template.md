> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{X}-strategy（每屏 Phase C 必做）
> 对应 schema 字段：screen.meta.design.visualStrategy（v3 新增）
> 必读方法论：`references/methodology/03-color.md` + `04-typography.md` + `05-shape.md` + `06-decoration.md` + `07-rhythm.md`

---

# {taskId} — 视觉策略 (Visual Strategy)

## 0. 上游输入

- briefing.userMood：xxx
- visualConcept.soulSentence：xxx
- visualConcept.styleKeywords：xxx / xxx / xxx
- theme.intent：xxx
- theme.tokens 全集（已 read）

---

## 1. 色彩策略 (Color Strategy)

### 1.1 60-30-10 调色

| 占比 | token | 用途 |
|:---:|---|---|
| **60** | `colors.background` (#FCFCFD) | 整屏底色（screen.backgroundColor）|
| **30** | `colors.surfaceElevated` (#FFFFFF) + `colors.textPrimary` (#1F2937) | 卡片底 + 主文字 |
| **10** | `colors.primary` (#5B6CFF) | CTA 主色 + active 高亮 + focus 边色 + 装饰光斑（极淡） |

### 1.2 强调色出现位置（10% 用法清单）

- SubmitBtn.backgroundColor（主用）
- ModeToggle.active 字色 + TabIndicator 底色
- PolicyCheckVisual.checked 填充 + 边色
- PhoneInput.focus borderColor
- BgBlobTopRight 极淡光斑（primaryLight + opacity 0.4）

### 1.3 错误色 / 成功色 / 警告色（按需）

| 语义 | token | 用途 |
|---|---|---|
| error | `colors.error` (#E16A6A 暖珊瑚红) | PhoneError / PolicyText error 态 / Toast error |
| warning | `colors.warning` | Toast warning |
| success | `colors.success` | Toast success（本屏可能不用） |

---

## 2. 字号节奏 (Typography Strategy)

### 2.1 字号梯度

| token | px | 用途 |
|---|---|---|
| `typography.display.fontSize` | 28 | （本屏不用）|
| `typography.h2.fontSize` | 22 | （本屏不用）|
| `typography.h4.fontSize` | 18 | 字段 label |
| `typography.body-lg.fontSize` | 16 | input fontSize（避免 iOS 自动放大）|
| `typography.body.fontSize` | 14 | 多数文字 |
| `typography.caption.fontSize` | 12 | error 提示 / footer 辅助 |

### 2.2 字重对比

| 用途 | weight |
|---|---|
| body 默认 | 400 |
| label / Tab inactive | 500 |
| Tab active | 700 |
| SubmitBtn | 600 |
| 标题（display / h2）| 600（不要 700+，避免严苛）|

### 2.3 行高 / 字距

- 默认 lineHeight: 1.5（body 用 token typography.body.lineHeight）
- 按钮 lineHeight: 1.2（紧凑）
- 标题 letterSpacing: 0.02em

---

## 3. 形状语言 (Shape Strategy)

### 3.1 圆角梯度（统一族）

| 元素 | radius token | px |
|---|---|---|
| card / formCard / hero | `radius.xl` | 16 |
| button (primary CTA) | `radius.lg` | 12 |
| input | `radius.md` | 8 |
| icon-button / chip | `radius.sm` | 4 |
| checkbox visual / 小标签 | `radius.sm` | 4 |
| 圆形（avatar / radio dot）| `radius.full` | 9999 |

### 3.2 形状基调

- ✅ 全屏统一**柔和圆角**风（与「极简 + 单色温度」概念契合）
- ❌ 不混用直角 + 圆角（除非 strategy 明确给"形状基调=直角理性"）

---

## 4. 装饰系统 (Decoration Strategy)

### 4.1 装饰系统单一族

> 必读 `recipes/decoration-systems/<system>.md`

| 决策 | 内容 |
|---|---|
| 装饰系统 | **soft-glow（光斑系）**（与「暖白 + 极简 + 单色温度」契合）|
| 密度 | 节制（1-2 处装饰节点）|
| 实例位置 | 1) BgBlobTopRight（右上溢出光斑） 2)（可选）FormCard 顶部极淡渐变线 |

### 4.2 否决其他系统

- ❌ geometric-line：太理性，与「温度」冲突
- ❌ illustration：太重，登录页不需要插画
- ❌ texture：太复杂，与「极简」冲突
- ❌ organic-curve：太自由，与「极简 + 工具」冲突

---

## 5. 间距 + 动效律 (Rhythm Strategy)

### 5.1 间距梯度（呼吸型）

| token | px | 用途 |
|---|---|---|
| `spacing.2xs` | 2 | error 提示间距 |
| `spacing.xs` | 4 | label-input |
| `spacing.sm` | 8 | 小型间距 |
| `spacing.md` | 16 | 字段间 / card 内 |
| `spacing.lg` | 24 | screen padding / card padding |
| `spacing.xl` | 32 | 区块间（HeaderArea 与 FormCard）|
| `spacing.2xl` | 48 | screen 顶部留白 |

### 5.2 动效律

| 切换类型 | duration | easing |
|---|---|---|
| hover 反馈 | `transitions.fast.value` (150ms) | ease-out |
| pressed 反馈 | 80ms | ease-in |
| 状态切换（active / focus）| `transitions.normal.value` (200ms) | ease-out |
| Modal / Drawer 进出 | 300ms | ease-in-out |

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_node
{
  nodeId: "screen.meta.design",
  patch: {
    visualStrategy: {
      color: {
        ratio: { background: 60, surfaceAndText: 30, accent: 10 },
        primary: "$token:colors.primary",
        background: "$token:colors.background",
        accentUsage: ["SubmitBtn.bg", "ModeToggle.active", "TabIndicator", "PolicyCheckVisual.checked", "PhoneInput.focus", "BgBlob"]
      },
      typography: {
        sizeScale: ["caption(12)", "body(14)", "body-lg(16)", "h4(18)", "h2(22)", "display(28)"],
        weightScale: { body: 400, label: 500, btn: 600, active: 700 },
        lineHeight: { default: 1.5, btn: 1.2 }
      },
      shape: {
        baseRadius: "soft",
        radiusMap: { card: "xl(16)", button: "lg(12)", input: "md(8)", small: "sm(4)" }
      },
      decoration: {
        system: "soft-glow",                              // 单一族
        density: "节制",                                  // 极少 / 节制 / 丰富
        instances: [
          { position: "右上溢出", role: "氛围-装饰", weight: 2 },
          { position: "FormCard 顶部渐变线（可选）", role: "氛围-装饰", weight: 1 }
        ],
        rejectedSystems: ["geometric-line", "illustration", "texture", "organic-curve"]
      },
      rhythm: {
        spacingScale: ["2xs(2)", "xs(4)", "sm(8)", "md(16)", "lg(24)", "xl(32)", "2xl(48)"],
        motionTimings: { hover: "150ms ease-out", pressed: "80ms ease-in", state: "200ms ease-out", modal: "300ms ease-in-out" }
      }
    }
  }
}
```

---

## 7. 自检

- [ ] 5 维全部填齐（色 / 字 / 形 / 饰 / 律）
- [ ] 装饰系统**单选 1 个**（不混杂）+ 给出否决其他系统的理由
- [ ] 60-30-10 调色比例明确，强调色出现位置 ≤ 6 处（避免散）
- [ ] 形状基调统一（不混直角 + 圆角，除非明确论证）
- [ ] 间距 + 动效梯度对应 token，不硬编码
- [ ] schema 字段 visualStrategy 已写入

任一未通过 → 不能进 D-X-task-planning。
