> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-task-planning
> 对应 schema 字段：N/A（task-planning 不直接写 schema 字段，但通过 meta/add_plan_tasks 挂出 craft 任务）
> 必读方法论：00-design-thinking.md（创作权 3：视觉任务自创权）

---

# D-00-login-task-planning — 自创 craft 任务清单（Phase D）

## 0. 输入

| 来源 | 关键产物 |
|---|---|
| briefing.md | 4 个 craft 视觉容器/素材需求（TabIndicator / PolicyCheckLabel-Visual / BrandLogo PNG / BgBlobTopRight rebalance）|
| concept.md | 灵魂句「像清晨教室的光，温暖但不打扰」+ 风格关键词「暖白米/大圆角柔和/单色光斑节制」|
| strategy.md | 5 维：色 60-30-10 / 字 5 档 / 形柔和 / 饰 soft-glow（v3 新增 BottomLeft 配重）/ 律呼吸型 |
| system/known-issues.md | 7 项 P0~P3 ISSUE，其中 4 项需 craft 任务解决 |

---

## 1. craft 任务清单（按优先级）

### 1.1 必做 4 个 craft（解决 P0~P1 ISSUE）

| ID | 视觉目标 | 解决 ISSUE | 涉及节点 | renderHint | 最大耗时 |
|---|---|---|---|---|---|
| **D-00-login-craft-brandlogo** | 调 material-painter 画 BrandLogo 240×240 字标"C" PNG + applyMaterialDesign 写入 materialProjectId → 首屏品牌感成立 | ISSUE-2 P0 | BrandLogo (nd_d7d8b56e2d934187bbb9b) | png | 中 |
| **D-00-login-craft-decoration-rebalance** | BgBlobTopRight 浓度提到 primary @ 12% alpha + 新增 BgBlobBottomLeft secondary @ 8% alpha 配重 → 装饰 weight=3（节制）成立 | ISSUE-3 P2 | BgBlobTopRight (nd_9b9fdb30935f42338f086) + 新增 BgBlobBottomLeft | css-gradient | 小 |
| **D-00-login-craft-tab-indicator** | element/add TabIndicator 视觉容器（2px 高 × 端点圆滑 × 主色填充）+ activeWhen=loginMode 状态 + transition 滑动 → ModeToggle 状态可识别 | ISSUE-5 P1 | ModeToggle (nd_edee969db25d4440b9169) + 新增 TabIndicator | css-only | 中 |
| **D-00-login-craft-checkbox** | element/wrap PolicyCheckLine + element/add PolicyCheckLabel + PolicyCheckVisual（wrapper-label workaround） + 4 visualState（unchecked/checked/focused/error） → 政策勾选视觉权重正确 | ISSUE-7 P2 | PolicyCheckbox (nd_42b79eb04cfe4a51bc3e2) + PolicyText 等 + 新增 PolicyCheckLabel/Visual | css-only | 大 |

### 1.2 选做 1 个 craft（解决 v2→v3 字重升级）

| ID | 视觉目标 | 解决 ISSUE | 涉及节点 |
|---|---|---|---|
| **D-00-login-craft-typography-refresh** | 全屏字重 700→600 调整（BrandSlogan / LockedTitle / SubmitBtn 字 / Tab active 字） + BrandSlogan 字号 v2 display 28 → v3 h4 20（更克制）+ FooterLinks 视觉断裂用 typography 软化（textTertiary + 字号 caption 12） | v2→v3 字重升级 + ISSUE-4 typography 软化解决 | BrandSlogan / LockedTitle / SubmitBtn 子文字 / CodeModeBtn / PasswordModeBtn / RegisterLink / ForgotLink |

### 1.3 跳过的候选 craft（论证）

| 候选 | 跳过理由 |
|---|---|
| D-00-login-craft-submit-feedback | SubmitBtn 的 hover scale 1.02 / pressed scale 0.98 / focus ring 已在 v2 visualStates 写完且符合 stateSpec，无需单独 craft；如自审时发现"主角 weight=8 但视觉浮起感不足"再补 |
| D-00-login-craft-error-soft | strategy.md 已决策 error 色维持，软化策略走 typography/位置/时序，无需独立 craft；与 craft-typography-refresh 合并即可 |
| D-00-login-craft-locked-temperature | LockedView 在 v2 已落齐 styles + states，仅 LockedIcon 用 warning 锁需通过 material-painter 画；可作为 craft-brandlogo 同批处理（但实际 v2 materialSpec 已写 svg 锁，且 craft-brandlogo 之外不再调 material-painter 节省工时）|

---

## 2. 各 craft 任务的 expectedArtifacts 设计

| 任务 | 期望产物指纹 |
|---|---|
| craft-brandlogo | `nodeMaterialApplied { nodeId: "nd_d7d8b56e2d934187bbb9b", check: "$.materialProjectId nonEmpty" }`（待 service 端实现）；备选 `nonEmpty path: rootNode.children[0].children[0].materialProjectId` |
| craft-decoration-rebalance | `arrayMin path: rootNode.children min: 4`（含 NormalFormView/LockedView/BgBlobTopRight/BgBlobBottomLeft）|
| craft-tab-indicator | `nodeExists { name: 'TabIndicator' }`；`visualStateDistinctness { nodeId: 'TabIndicator', stateName: 'active', minOverrides: 1 }`（待 service 端实现）|
| craft-checkbox | `nodeExists { name: 'PolicyCheckLabel' }`；`nodeExists { name: 'PolicyCheckVisual' }`；4 个 visualState 落库 |
| craft-typography-refresh | `arrayMin path: rootNode min: 1`（不刚性指纹，靠自审判断）|

> ⚠️ v3 新指纹种类（如 nodeMaterialApplied / visualStateDistinctness）若 service 端尚未实现，先用 `nonEmpty` 兜底；自审段保证质量。

---

## 3. 执行顺序

```
D-00-login-craft-brandlogo  (P0 优先解决虚线占位最显眼问题)
       ↓
D-00-login-craft-decoration-rebalance  (背景装饰先就位，后续 craft 都基于这个底)
       ↓
D-00-login-craft-tab-indicator  (FormCard 内最显眼缺口)
       ↓
D-00-login-craft-checkbox  (FormCard 内次要缺口)
       ↓
D-00-login-craft-typography-refresh  (整屏字重调整收尾)
       ↓
D-00-login-self-review  (Phase F 整屏 5 维评分)
```

---

## 4. 与 v2 已落库的对接策略

| v2 已 done 的任务 | v3 craft 是否覆盖 / 调整 |
|---|---|
| D-00-login-styles | 不推翻；v3 通过 craft-typography-refresh 微调字重 + craft-decoration-rebalance 微调装饰浓度 |
| D-00-login-states | 不推翻；v3 通过 craft-tab-indicator + craft-checkbox 在 ModeToggle/PolicyCheckbox 增量加 visualState |
| D-00-login-materials | 部分推翻：v2 仅写了 materialSpec **没真画 BrandLogo PNG**（ISSUE-2 v2 素材债）→ craft-brandlogo 真画 + applyMaterialDesign |
| D-00-login-meta | 不推翻；v3 增量在 craft 任务执行时给新增节点（TabIndicator/PolicyCheckLabel/PolicyCheckVisual/BgBlobBottomLeft）补 meta.design |

---

## 5. ★ 沉淀到 schema 的结论

通过 `mcp/meta/add_plan_tasks` 挂下列 5 个 craft 任务（屏级 plan）：

```jsonc
[
  {
    "id": "D-00-login-craft-brandlogo",
    "title": "v3 craft: 调 material-painter 画 BrandLogo 240×240 字标 C PNG + applyMaterialDesign",
    "stage": "design", "status": "pending",
    "expectedArtifacts": [
      { "kind": "nonEmpty", "path": "rootNode" }
    ]
  },
  {
    "id": "D-00-login-craft-decoration-rebalance",
    "title": "v3 craft: BgBlobTopRight 浓度提到 12% + 新增 BgBlobBottomLeft 配重 secondary 8%",
    "stage": "design", "status": "pending",
    "expectedArtifacts": [
      { "kind": "arrayMin", "path": "rootNode.children", "min": 4 }
    ]
  },
  {
    "id": "D-00-login-craft-tab-indicator",
    "title": "v3 craft: element/add TabIndicator 视觉容器 + activeWhen + transition 滑动",
    "stage": "design", "status": "pending",
    "expectedArtifacts": [
      { "kind": "nonEmpty", "path": "rootNode" }
    ]
  },
  {
    "id": "D-00-login-craft-checkbox",
    "title": "v3 craft: element/wrap PolicyCheckLabel + element/add PolicyCheckVisual（wrapper-label workaround） + 4 visualState",
    "stage": "design", "status": "pending",
    "expectedArtifacts": [
      { "kind": "nonEmpty", "path": "rootNode" }
    ]
  },
  {
    "id": "D-00-login-craft-typography-refresh",
    "title": "v3 craft: 全屏字重 700→600 + BrandSlogan 字号 28→20 + FooterLinks 软化",
    "stage": "design", "status": "pending",
    "expectedArtifacts": [
      { "kind": "nonEmpty", "path": "rootNode" }
    ]
  }
]
```

---

## 6. 自检

- [x] 自创任务 ≥ 3 个（实际 5 个）
- [x] 每个任务有清晰视觉目标 + 涉及节点 + renderHint
- [x] 优先级排序合理（P0/P1 必做、P2 必做、字重升级选做）
- [x] 与 v2 已 done 任务的对接策略明确
- [x] expectedArtifacts 设计（含 service 端未实现指纹的兜底方案）
- [x] 即将调 meta/add_plan_tasks 挂任务
