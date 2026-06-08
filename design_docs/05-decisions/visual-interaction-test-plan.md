# 设计驱动的交互视觉自动化测试方案

> 状态：草案（v2，2026-06-05 调整）
> 作者：pikun
> 目标：在交互设计和视觉设计完成后，用自动化方式验证每个交互操作是否符合预期，作为设计交付前的最后一环质量关卡。

---

## 1. 背景与动机

### 1.1 现状

当前设计流水线已完成以下环节：

```
product-analyst → theme-generator → interaction-designer → design-planner → design-executor
```

其中 `design-executor` 作为 QA 摄影师，能做**静态截图 + 对照设计文档对账**，但它有两个局限：

1. **只截静态图**：不执行交互操作，无法验证"点击按钮后是否弹出 Modal"、"输入错误密码是否显示错误态"等动态行为。
2. **对账靠人眼**：把截图给 AI 看，AI 对照 self-review.md 描述判断是否符合——这不是自动化测试。

### 1.2 目标

建立一个**设计驱动的交互视觉自动化测试体系**：

- 交互设计 / 视觉设计**各自在完成时沉淀测试用例**（不是最后统一生成）
- 用 Puppeteer 自动执行每个用例（点击、输入、等待、截图）
- 对每个操作后的状态进行**多维度断言**（DOM / 视觉 / AI）
- 输出结构化测试报告，**不符合预期的 case 自动记录并退回设计修复**

### 1.3 与现有基础设施的关系

| 现有能力 | 位置 | 本方案如何利用 |
|---------|------|--------------|
| Puppeteer 会话管理 | `apps/design-mcp/src/puppet/session.ts` | 复用会话池，避免重复启动 Chrome |
| Puppeteer 操作执行 | `apps/design-mcp/src/puppet/actions.ts` | 直接调用已有 `click/input/hover/scroll` 等操作 |
| Puppeteer DOM 检查 | `apps/design-mcp/src/puppet/inspect.ts` | 用于 DOM 断言（元素是否存在、样式是否正确） |
| 独立截图脚本 | `scripts/screenshot-screen.mjs` | 参考其认证+截图模式，扩展为"操作+截图"流程 |
| design-registry | `design-registry/` | 测试用例的语义来源（interaction 层 + design 层） |
| design-executor | `.claude/skills/design-executor/` | 终验时一并验测试通过率 |

---

## 2. 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│  interaction-designer 完成每个任务                                │
│  → 截图对账通过后，按规范写一个 I-*.json 测试用例              │
│  → 文件：test-cases/<projectId>/<screenId>/I-<taskId>.json  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────────┐
│  design-planner-v3 完成每个任务                                │
│  → 截图对账通过后，按规范写一个 V-*.json 测试用例             │
│  → 文件：test-cases/<projectId>/<screenId>/V-<goalId>.json  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              ★ 新增：visual-test-runner                          │
│  输入：test-cases/<projectId>/**/*.json                        │
│  执行：Puppeteer 操作 → 截图 → 多维度断言                    │
│  输出：test-report/*.json + 截图集 + diff 图                    │
│  触发：design-executor 终验时统一调用                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              design-executor 终验                                 │
│  读 test-report，全部通过 → phase=verified                       │
│  有失败 case → 写 qa-issues.md + 退回对应设计角色              │
└─────────────────────────────────────────────────────────────────┘
```

**关键原则**：
- 测试用例由各设计角色**在设计过程中**沉淀，不是最后批量生成
- 测试用例生成后**不立即执行**，等所有屏设计完成、design-executor 终验时统一运行
- 交互测试用例（I-*.json）和视觉测试用例（V-*.json）格式完全统一，由同一个 visual-test-runner 执行

---

## 3. 测试用例生成时机与规范

### 3.1 各角色何时写测试用例

| 角色 | 何时写 case | case 类型 | 规范文件 |
|------|-------------|----------|----------|
| interaction-designer | 每完成一个 operations.md 任务、截图对账通过后 | `I-<taskId>.json` | `.claude/skills/interaction-designer/references/test-case-spec.md` |
| design-planner-v3 | 每完成一个 craft 任务、截图对账通过后 | `V-<goalId>.json` | `.claude/skills/design-planner-v3/references/test-case-spec.md` |
| theme-generator | 主题配置完成后（按需） | `V-theme-<aspect>.json` | 同上 |

**为什么嵌在任务闭环里，而不是最后统一生成？**

第一性原理：测试用例的"预期结果"在设计刚完成时最清晰。设计师刚做完一个任务，脑子里清楚"我这个设计要达到什么效果"——此时写 case 最准确。如果等到所有设计完成后再回头写 case，信息已经丢失，只能靠读 schema 反推，容易漏掉关键验证点。

### 3.2 什么时候写一个 case

每条能机器验证的 successCriteria / operations 描述，都要对应一个 case。

```
interaction-designer 场景：
  "点击提交按钮后，按钮进入 loading 态，页面显示 LoadingBackdrop"
    → ✅ 写 case（可验证：点击 → 检查 disabled + overlay 存在）

design-planner-v3 场景：
  "背景使用极淡蓝灰（#F8FAFB），传达专业洁净感"
    → ✅ 写 case（DOM 可断言 backgroundColor）
  "整体视觉干净、层次分明"
    → ❌ 不写（纯主观，交给 AI 断言）
```

判断标准：这条描述能否翻译成「操作 + DOM 属性检查」或「截图 + 像素/AI 比对」？
- 能 → 写 case
- 不能 → 在 task notes 里留一句"需 AI 目视验收"即可

### 3.3 测试用例 JSON Schema（统一格式）

交互和视觉测试用例使用**完全相同的 JSON 格式**，只是 `source` 字段不同（`interaction` vs `design-goal`）。

```jsonc
{
  // ── 基本信息 ──
  "id": "V-login-G1-appearance",      // 格式：<前缀>-<screenId>-<taskId>
  "name": "登录页 G1 — 背景色验证",
  "description": "背景使用极淡蓝灰 #F8FAFB，传达专业洁净感",
  "screenId": "login-screen",
  "goalId": "G1-professional-trust",  // 视觉 case 必填；交互 case 可选
  "priority": "high",                  // high | medium | low
  "source": "design-goal",            // interaction | design-goal | theme

  // ── 前置条件 ──
  "preconditions": {
    "states": {},                       // 初始 state（按需填）
    "viewport": { "width": 375, "height": 812, "deviceScaleFactor": 2 }
  },

  // ── 操作步骤 ──
  "steps": [
    {
      "action": "hover",                // click | hover | input | wait | scroll | navigate
      "target": "[data-node-id='login-submit-btn']",
      "description": "鼠标悬停在登录按钮上",
      "screenshot": "after"            // before | after | during（可选）
    }
  ],

  // ── 预期结果 ──
  "expected": {
    "domAssertions": [                // DOM 断言（精确验证，优先用这个）
      {
        "selector": "[data-node-id='login-bg']",
        "property": "backgroundColor",
        "operator": "equals",
        "value": "rgb(248, 250, 251)",
        "description": "背景色为极淡蓝灰"
      }
    ],
    "visualAssertions": [             // 视觉断言（语义验证，用 AI）
      {
        "timing": "after",
        "mode": "ai",
        "prompt": "背景色为极淡蓝灰，整体感觉专业洁净，没有刺眼的纯白"
      }
    ]
  },

  // ── 以下字段由 visual-test-runner 填写，生成时留空 ──
  "status": "generated",
  "result": null
}
```

完整字段说明见各技能的 `references/test-case-spec.md`。

---

## 4. visual-test-runner 设计

### 4.1 执行流程

```
┌─────────────────────────────────────────────────┐
│  1. 读取测试用例列表                             │
│     → test-cases/<projectId>/**/*.json         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  2. 启动/复用 Puppeteer 会话                     │
│     → 调用 puppet/session（已有实现）              │
│     → 设置 viewport（从 preconditions.viewport） │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  3. 设置前置条件                                 │
│     → 注入初始 state（通过 page.evaluate）        │
│     → 导航到目标路由                              │
│     → 等待 [data-preview-root] 就绪              │
│     → 截图（baseline：测试前状态）                │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  4. 按步骤执行操作 + 截图                        │
│     for each step:                               │
│       → puppet/actions (click/input/hover/...) │
│       → step.screenshot? → page.screenshot()    │
│       → step.wait? → page.waitForTimeout()      │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  5. 多维度断言                                   │
│     a. DOM 断言：page.$() + getComputedStyle    │
│     b. 视觉断言：                                  │
│        - ai 模式：调用多模态模型判断               │
│        - layout 模式：比对 DOM 布局尺寸位置        │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  6. 记录结果 + 生成报告                           │
│     → 写 result 到测试用例 JSON                   │
│     → 保存截图 + diff 图到 artifacts/             │
│     → 生成 test-report.json + HTML 报告           │
└─────────────────────────────────────────────────┘
```

### 4.2 与现有 Puppeteer 设施的集成

现有 `apps/design-mcp/src/puppet/` 已有三件套，可以直接复用：

```typescript
// actions.ts — 操作执行（直接复用）
export async function executeAction(sessionId: string, action: TestStep) {
  const session = getSession(sessionId);
  const { page } = session;
  switch (action.action) {
    case 'click':
      await page.click(action.target);
      break;
    case 'input':
      await page.type(action.target, action.value ?? '');
      break;
    case 'hover':
      await page.hover(action.target);
      break;
    case 'wait':
      await new Promise((r) => setTimeout(r, action.duration ?? 1000));
      break;
  }
  if (action.screenshot) {
    await takeScreenshot(sessionId, action.screenshot);
  }
}

// inspect.ts — DOM 检查（用于 DOM 断言）
export async function assertDom(sessionId: string, assertion: DomAssertion) {
  const session = getSession(sessionId);
  const { page } = session;
  const element = await page.$(assertion.selector);
  if (assertion.exists !== undefined) {
    return assertion.exists ? element !== null : element === null;
  }
  if (assertion.property) {
    const value = await page.evaluate((sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop as any] : null;
    }, assertion.selector, assertion.property);
    return compare(value, assertion.operator, assertion.value);
  }
  return false;
}
```

### 4.3 视觉断言策略

| 模式 | 实现方式 | 适用场景 | 优缺点 |
|------|---------|---------|--------|
| **ai** | 多模态模型看图+读 description | 复杂语义验证（"感觉专业"） | ✅ 最接近人眼判断；❌ 慢、贵、非确定性 |
| **layout** | 比对关键元素 boundingBox | 布局位置验证 | ✅ 不受渲染差异影响；❌ 不验证视觉样式 |
| **pixel** | pixelmatch 逐像素比对 | 精确视觉还原验证 | ✅ 精准；❌ 抗噪能力差（字体渲染、抗锯齿） |

**推荐组合**：`ai` 做语义判断（默认）+ `layout` 做布局校验（快、稳定），`pixel` 仅用于装饰细节验证（按需）。

---

## 5. 与 design-executor 的集成

### 5.1 扩展 design-executor 职责

当前 design-executor 的职责：
1. 截图（静态）
2. 对账（对照设计文档）
3. 打 bug + 退回
4. integrity 终验

扩展后新增第 5 项：
5. **运行视觉交互测试 + 验通过率**

### 5.2 执行时机

```
所有设计角色完成（interaction-designer + design-planner + theme-generator）
    ↓
design-executor 终验：
    1. 静态截图对账（原有）
    2. 运行测试用例：
       → 读取 test-cases/<projectId>/**/*.json
       → 调用 visual-test-runner（Puppeteer）执行
       → 生成 test-report/<projectId>/summary.json
    3. 判断：
       → 全部通过 → phase=verified → 交付
       → 有失败 → 写 qa-issues.md + 创建 fix 任务退回对应角色
```

### 5.3 失败处理流程

测试用例失败时，根据失败类型退回对应角色：

| 失败类型 | 可能原因 | 退回目标 |
|---------|---------|---------|
| 视觉外观断言失败（DOM 断言不通过） | styles 写得不对 | design-planner（创建 D-X-fix-visual-<nodeId>） |
| 视觉状态断言失败（hover/active 态不对） | visualStates 定义不对 | design-planner（visualStates 相关任务） |
| 交互操作断言失败（点击后状态没变化） | events.actions 写得不对 | interaction-designer（创建 I-X-fix-events-<nodeId>） |
| 素材应用断言失败 | material-painter 导出不对 | design-planner（material 相关任务） |
| 操作执行失败（Puppeteer 报错） | 测试用例本身写得有问题（selector 错误） | 人工介入 review 测试用例 |

---

## 6. 实施方案

### 6.1 Phase 1：定义统一测试用例 Schema（1 天）

- [ ] 确定测试用例 JSON Schema（§3.3）
- [ ] 写 JSON Schema 定义文件（`test-cases/schema.json`）
- [ ] 写参考测试用例（手工写一个 I-*.json 和一个 V-*.json，验证 schema 可行性）

### 6.2 Phase 2：各技能嵌入"沉淀测试用例"步骤（2-3 天）

不新增独立模块，改各技能的 SKILL.md 和 references：

- [ ] **interaction-designer**：在任务执行闭环里嵌入"对账通过后写 I-*.json"，写 `references/test-case-spec.md`（交互版）
- [ ] **design-planner-v3**：在步骤 2 嵌入"对账通过后写 V-*.json"，写 `references/test-case-spec.md`（视觉版）
- [ ] **theme-generator**（按需）：主题配置完成后写 V-theme-*.json

### 6.3 Phase 3：实现 visual-test-runner（3-5 天）

- [ ] 基于现有 `puppet/session.ts` + `puppet/actions.ts` 实现执行引擎
- [ ] 实现 DOM 断言引擎（读 getComputedStyle，支持 pseudo class）
- [ ] 实现 AI 视觉断言（集成多模态模型 API）
- [ ] 实现 layout 断言引擎（boundingBox 比对）
- [ ] 截图管理（before/during/after + diff 图）
- [ ] 测试报告生成（JSON + HTML）
- [ ] 作为 MCP 工具暴露（`testing/run_test_cases`）

### 6.4 Phase 4：集成到 design-executor（1-2 天）

- [ ] 扩展 design-executor SKILL.md，新增"运行视觉交互测试"环节
- [ ] 失败 case 自动创建 fix 任务并退回对应角色
- [ ] 全部通过后设置 `phase=verified`

### 6.5 Phase 5：pixel 视觉断言（可选，后续迭代）

- [ ] 集成 pixelmatch，实现 pixel 模式视觉断言
- [ ] baseline 截图管理（首次自动生成，支持手动更新）
- [ ] threshold 配置（允许 1-2% 像素差异）

---

## 7. 目录结构

```
test-cases/                             # 测试用例（进 git）
├── schema.json                         # 统一测试用例 JSON Schema
└── <projectId>/
    └── <screenId>/
        ├── I-submit-loading.json       # 交互测试用例（interaction-designer 生成）
        ├── I-submit-error.json
        ├── V-G1-appearance.json       # 视觉测试用例（design-planner 生成）
        ├── V-G1-hover.json
        └── V-G2-typography.json

test-artifacts/                         # 测试产物（不进 git，加入 .gitignore）
└── <projectId>/
    └── <caseId>/
        ├── before.png
        ├── after.png
        ├── diff.png                  # AI/layout 模式的差异标注图
        └── result.json               # 执行结果详情

test-reports/                           # 测试报告（design-executor 产出，进 git）
└── <projectId>/
    ├── summary.json                    # 汇总报告
    ├── <screenId>-report.html        # 每屏 HTML 报告
    └── failures.md                   # 失败 case 摘要

apps/design-mcp/src/
├── testing/                          # 新增：测试运行器模块
│   ├── test-runner.ts               # 测试执行引擎
│   ├── assertions/                   # 断言引擎
│   │   ├── dom-assertion.ts
│   │   ├── ai-assertion.ts          # AI 视觉断言
│   │   ├── layout-assertion.ts
│   │   └── pixel-assertion.ts       # 可选，Phase 5
│   ├── reporter.ts                   # 报告生成
│   └── types.ts                     # 类型定义
├── puppet/                           # 已有，扩展
│   ├── session.ts                    # 会话管理（已有，无需改动）
│   ├── actions.ts                    # 操作执行（已有，扩展支持 TestStep）
│   └── inspect.ts                    # DOM 检查（已有，扩展支持断言）
└── tools/
    └── testing-tools.ts              # 新增 MCP 工具注册

scripts/
└── run-visual-tests.mjs              # 新增：CLI 入口（类似 screenshot-screen.mjs）
```

---

## 8. 关键设计决策

### 8.1 为什么测试用例由各角色在设计过程中沉淀，而不是最后统一生成？

**第一性原理**：测试用例的"预期结果"在设计刚完成时最清晰。设计师刚做完一个任务，脑子里清楚"我这个设计要达到什么效果"——此时写 case 最准确。

如果等到所有设计完成后再统一生成测试用例：
- 信息已经丢失，只能靠读 schema 反推，容易漏掉关键验证点
- 生成的测试用例是"schema 有什么"而不是"设计想达到什么"，测试变成循环论证
- 发现问题后回溯成本高（设计角色已经切到别的任务）

### 8.2 为什么需要三种断言模式？

单一断言模式都有盲区：
- 只做 DOM 断言 → 无法验证视觉样式（颜色搭配、层次感、整体氛围）
- 只做 AI 断言 → 慢、贵、非确定性，不适合 CI 高频运行
- 只做 pixel 比对 → 抗噪差，每次字体渲染微调就 fail

三种结合：AI 做语义判断（默认）+ layout 做布局校验（快、稳定），pixel 按需使用。

### 8.3 baseline 截图怎么管理？

- **首次运行**：AI 断言模式不需要 baseline 截图（直接看图+读描述判断）
- **pixel 模式**（可选）：首次运行自动生成 baseline，后续运行比对差异
- **不进 git**：测试产物存本地或对象存储，`.gitignore` 加入 `test-artifacts/`

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Puppeteer 执行不稳定（flaky test） | 测试结果不可信 | 每个失败 case 自动重试 2 次；超时设置；稳定等待策略（waitForSelector 而非 fixed delay） |
| AI 断言慢、贵 | CI 跑不完 | AI 断言只用于语义 case；layout 断言用于布局校验（快、免费）；AI 异步执行，不 block CI |
| 测试用例生成不完整 | 漏测场景 | 各技能 SKILL.md 强制要求：每条能机器验证的 successCriteria 都必须有对应 case；executor 终验时检查覆盖率 |
| 测试用例 selector 失效 | 页面结构变化后 case 跑不通 | selector 统一用 `[data-node-id='...']` 或 `[data-overlay-id='...']`，不依赖 class 或层级选择器 |

---

## 10. 后续演进

1. **并行执行**：多个测试用例并行跑（利用 puppet session 池）
2. **跨屏测试**：支持涉及多个 screen 的测试用例（如"从登录页跳转到首页"）
3. **性能测试**：在交互测试中加入性能指标（FCP、CLS）
4. **无障碍测试**：集成 axe-core，在视觉测试同时做 a11y 检查
5. **移动端适配测试**：在多种 viewport 尺寸下跑同一测试用例

---

## 11. 参考资料

- 现有 Puppeteer 设施：`apps/design-mcp/src/puppet/`
- 现有截图脚本：`scripts/screenshot-screen.mjs`
- interaction-designer 产出规范：`.claude/skills/interaction-designer/SKILL.md`
- design-planner-v3 产出规范：`.claude/skills/design-planner-v3/SKILL.md`
- design-executor 规范：`.claude/skills/design-executor/SKILL.md`
- design-registry 结构：`AGENTS.md` §四
