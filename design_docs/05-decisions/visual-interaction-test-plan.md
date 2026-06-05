# 设计驱动的交互视觉自动化测试方案

> 状态：草案
> 作者：pikun
> 日期：2026-06-05
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

- 交互设计完成后，**自动从设计产物中提取测试用例**
- 用 Puppeteer 自动执行每个用例（点击、输入、等待、截图）
- 对每个操作后的状态进行**多维度断言**（状态/DOM/视觉）
- 输出结构化测试报告，**不符合预期的 case 自动记录并退回设计修复**

### 1.3 与现有基础设施的关系

| 现有能力 | 位置 | 本方案如何利用 |
|---------|------|--------------|
| Puppeteer 会话管理 | `apps/design-mcp/src/puppet/session.ts` | 复用会话池，避免重复启动 Chrome |
| Puppeteer 操作执行 | `apps/design-mcp/src/puppet/actions.ts` | 直接调用已有 `click/input/hover/scroll` 等操作 |
| Puppeteer DOM 检查 | `apps/design-mcp/src/puppet/inspect.ts` | 用于 DOM 断言（元素是否存在、样式是否正确） |
| 独立截图脚本 | `scripts/screenshot-screen.mjs` | 参考其认证+截图模式，扩展为"操作+截图"流程 |
| interaction-designer 产物 | `design-registry` + `analysis-notes` | 测试用例的语义来源 |
| design-executor | `.claude/skills/design-executor/` | 终验时一并验测试通过率 |

---

## 2. 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    设计产物（语义来源）                            │
│  design-registry  (interaction 层)                              │
│  analysis-notes/<projectId>/interaction/*.md                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              ★ 新增：test-case-generator                          │
│  输入：design-registry interaction 层 + events.actions           │
│  输出：test-cases/*.json（结构化测试用例）                        │
│  触发：interaction-designer 完成后自动触发                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              ★ 新增：visual-test-runner                          │
│  输入：test-cases/*.json                                         │
│  执行：Puppeteer 操作 → 截图 → 多维度断言                        │
│  输出：test-report/*.json + 截图集 + diff 图                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              design-executor 扩展（终验环节）                     │
│  读 test-report，全部通过 → phase=verified                       │
│  有失败 case → 写 qa-issues.md + 退回 design-planner            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 测试用例 Schema 设计

### 3.1 测试用例来源分析

从 `interaction-designer` 的产物中，可以提取四类测试用例：

| 类型 | 来源 | 示例 |
|------|------|------|
| **状态转换测试** | `statemachine.md` + `screen.meta.interaction.states` | 初始→loading→success→error 每个转换是否渲染正确视图 |
| **用户操作测试** | `events.actions` + `operations.md` | 点击提交按钮 → 是否触发 loading 态 → 是否跳转 |
| **数据态测试** | `datasources.md` + `dataSources.mock` | 列表为空 → 显示 empty 视图；请求失败 → 显示 error 视图 |
| **边界条件测试** | `boundaries.md` + `view-*-feedback.md` | 重复点击、超时、网络断开、极值输入 |

### 3.2 测试用例 JSON Schema

```jsonc
// test-cases/<projectId>/<screenId>/<caseId>.json
{
  // ─── 基本信息 ───
  "id": "TC-login-submit-loading",           // 唯一 ID
  "name": "登录提交后显示 loading 态",         // 可读名称
  "description": "点击登录按钮后，按钮进入 loading 状态，页面显示 LoadingBackdrop",
  "screenId": "login-screen",
  "priority": "critical",                     // critical | high | medium | low
  "source": "events.actions",                 // 用例来源：statemachine | events | datasources | boundaries

  // ─── 前置条件 ───
  "preconditions": {
    "states": {                               // 初始状态
      "form": { "phone": "", "password": "" },
      "uiState": "idle"
    },
    "route": "/editor/<projectId>?preview=1&screen=login-screen",
    "mockData": {                             // 可选的 mock 数据覆盖
      "loginApi": { "delay": 2000, "status": "pending" }
    },
    "viewport": { "width": 375, "height": 812, "deviceScaleFactor": 2 }
  },

  // ─── 操作步骤 ───
  "steps": [
    {
      "action": "input",
      "target": "[data-node-id='login-phone-input'] input",
      "value": "13800138000",
      "description": "输入手机号"
    },
    {
      "action": "input",
      "target": "[data-node-id='login-pwd-input'] input",
      "value": "wrongpassword",
      "description": "输入密码"
    },
    {
      "action": "click",
      "target": "[data-node-id='login-submit-btn']",
      "description": "点击登录按钮",
      "screenshot": "before"                 // 操作前截图
    },
    {
      "action": "wait",
      "duration": 500,                       // 等待 500ms（loading 态持续时间）
      "screenshot": "during"                 // 过程中截图（捕获 loading 态）
    }
  ],

  // ─── 预期结果（多维度） ───
  "expected": {
    // 1. 状态断言（检查 runtime state 值）
    "stateAssertions": [
      { "path": "uiState", "operator": "equals", "value": "loading" }
    ],
    // 2. DOM 断言（检查 DOM 元素状态）
    "domAssertions": [
      { "selector": "[data-node-id='login-submit-btn']", "property": "disabled", "value": true },
      { "selector": "[data-overlay-id='loading-backdrop']", "exists": true },
      { "selector": "[data-node-id='login-submit-btn'] .ant-btn-loading", "exists": true, "description": "按钮显示 loading 图标" }
    ],
    // 3. 视觉断言（截图比对）
    "visualAssertions": [
      {
        "timing": "during",                  // 对应 step 中 screenshot="during" 的截图
        "mode": "pixel",                    // pixel | ai | layout
        "threshold": 0.01,                  // pixel 模式：允许 1% 像素差异
        "focusArea": {                       // 可选：只比对关注区域
          "selector": "[data-node-id='login-submit-btn']"
        },
        "baseline": "baseline/login-submit-loading.png"  // 基准图（首次运行自动生成）
      }
    ],
    // 4. 自然语言描述（用于 AI 视觉判断）
    "naturalLanguage": "登录按钮处于 loading 状态（按钮文字变为 loading 图标，按钮不可点击），页面中央显示 LoadingBackdrop 半透明遮罩"
  },

  // ─── 执行结果（runner 填充） ───
  "result": {
    "status": "pass",                       // pass | fail | error | skip
    "screenshots": {
      "before": "artifacts/<caseId>/before.png",
      "during": "artifacts/<caseId>/during.png",
      "after": "artifacts/<caseId>/after.png"
    },
    "assertionResults": [
      { "type": "state", "pass": true },
      { "type": "dom", "pass": true, "details": "所有 DOM 断言通过" },
      { "type": "visual", "pass": false, "diff": "artifacts/<caseId>/diff.png", "pixelDiffRatio": 0.05 }
    ],
    "aiReview": "AI 判断：按钮 loading 态正确，但 LoadingBackdrop 位置偏下 8px",
    "executedAt": "2026-06-05T17:00:00Z",
    "durationMs": 3200
  }
}
```

### 3.3 测试用例与设计产物的映射

`test-case-generator` 需要从 design-registry 中自动提取信息生成上述 JSON：

```
design-registry/pages/<screenId>/_page.json (interaction 层)
    │
    ├── meta.interaction.triggers[]     → 用户操作测试用例（每个 trigger 生成 1 个用例）
    ├── meta.interaction.flows[]        → 状态转换测试用例（每个 flow 生成 1 个用例）
    ├── states[]                        → 状态覆盖测试用例（每个 state 生成 1 个用例）
    └── meta.interaction.feedback       → 反馈层级测试用例
    
design-registry/pages/<screenId>/<nodeId>.json (interaction 层)
    ├── interaction.trigger             → 节点触发测试用例
    ├── interaction.states[]           → 节点状态测试用例
    └── logic.enableCondition          → 条件启用测试用例

dataSources[].mock                          → 数据态测试用例（idle/pending/empty/error 各 1 个）
screen.overlays[]                           → overlay 显示/隐藏测试用例
```

---

## 4. visual-test-runner 设计

### 4.1 执行流程

```
┌─────────────────────────────────────────────────┐
│  1. 读取测试用例列表                             │
│     → test-cases/<projectId>/<screenId>/*.json │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  2. 启动/复用 Puppeteer 会话                     │
│     → 调用 puppet/begin（已有实现）               │
│     → 设置 viewport（从 preconditions.viewport） │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  3. 设置前置条件                                 │
│     → 注入初始 state（通过 page.evaluate）        │
│     → 设置 mock 数据（通过 API mock 或 state）    │
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
│     a. 状态断言：读 runtime state → 比对          │
│     b. DOM 断言：page.$() + getComputedStyle    │
│     c. 视觉断言：                                  │
│        - pixel 模式：pixelmatch 比对 baseline     │
│        - ai 模式：调用多模态模型判断               │
│        - layout 模式：比对 DOM 布局尺寸位置        │
│     d. 自然语言：AI 看图 + 读 description → 判断 │
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

现有 `apps/design-mcp/src/puppet/` 已有三件套：

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
    case 'scroll':
      await page.evaluate((sel) => {
        document.querySelector(sel)?.scrollIntoView();
      }, action.target);
      break;
    case 'wait':
      await new Promise((r) => setTimeout(r, action.duration ?? 1000));
      break;
    case 'navigate':
      await page.goto(action.value!);
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
    return value === assertion.value;
  }
  return false;
}
```

### 4.3 视觉断言策略

| 模式 | 实现方式 | 适用场景 | 优缺点 |
|------|---------|---------|--------|
| **pixel** | pixelmatch 逐像素比对 | 精确视觉还原验证 | ✅ 精准；❌ 抗噪能力差（字体渲染、抗锯齿） |
| **layout** | 比对关键元素 boundingBox | 布局位置验证 | ✅ 不受渲染差异影响；❌ 不验证视觉样式 |
| **ai** | 多模态模型看图+读描述 | 复杂语义验证 | ✅ 最接近人眼判断；❌ 慢、贵、非确定性 |

**推荐组合**：`layout` 做布局校验（快、稳定）+ `ai` 做最终语义判断（慢、精准），`pixel` 仅用于装饰细节验证。

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
design-planner 完成（styles + material + self-review）
    ↓
【新增】test-case-generator 生成测试用例
    ↓
【新增】visual-test-runner 跑测试用例
    ↓
design-executor 终验：
    - 静态截图对账（原有）
    - 测试用例全部通过？（新增）
      - 全部通过 → phase=verified → 交付
      - 有失败 → 写 qa-issues.md + 创建 D-X-fix-<caseId> 退回 design-planner
```

### 5.3 失败处理流程

```
visual-test-runner 发现失败 case
    ↓
写 test-report/<caseId>-failure.md
    ↓
design-executor 读报告 → 分类失败原因：
    ├── 视觉差异（pixel diff > threshold）
    │     → 可能是 design-planner 的 styles 有问题
    │     → 创建 D-X-fix-visual-<nodeId>
    ├── DOM 断言失败（元素不存在/属性不对）
    │     → 可能是 interaction-designer 的 events.actions 有问题
    │     → 创建 I-X-fix-events-<nodeId> 退回 interaction-designer
    ├── 状态断言失败（runtime state 不对）
    │     → 可能是 product-analyst 的 rules 或 stateInit 有问题
    │     → 创建 P-X-fix-state-<screenId> 退回 product-analyst
    └── 操作执行失败（Puppeteer 报错）
          → 可能是测试用例本身写得有问题
          → 人工介入 review 测试用例
```

---

## 6. 实施方案

### 6.1 Phase 1：定义 Schema + 参考实现（1-2 天）

- [ ] 确定测试用例 JSON Schema（本节 3.2）
- [ ] 写 JSON Schema 定义文件（`test-cases/schema.json`）
- [ ] 写一个简单的参考测试用例（手工写一个，验证 schema 可行性）

### 6.2 Phase 2：实现 test-case-generator（2-3 天）

- [ ] 读取 design-registry interaction 层
- [ ] 从 `events.actions` 提取用户操作测试用例
- [ ] 从 `states` + `flows` 提取状态转换测试用例
- [ ] 从 `dataSources.mock` 提取数据态测试用例
- [ ] 输出 `test-cases/<projectId>/<screenId>/*.json`
- [ ] 作为 MCP 工具暴露（`testing/generate_test_cases`）

### 6.3 Phase 3：实现 visual-test-runner（3-5 天）

- [ ] 基于现有 `puppet/session.ts` + `puppet/actions.ts` 实现执行引擎
- [ ] 实现三种断言引擎（state/DOM/visual）
- [ ] 实现 pixel 视觉比对（集成 pixelmatch）
- [ ] 实现 layout 视觉比对（boundingBox 比对）
- [ ] 截图管理（before/during/after + diff 图）
- [ ] 测试报告生成（JSON + HTML）
- [ ] 作为 MCP 工具暴露（`testing/run_test_cases`）

### 6.4 Phase 4：集成到 design-executor（1-2 天）

- [ ] 扩展 design-executor SKILL.md，新增"运行视觉交互测试"环节
- [ ] 失败 case 自动创建 fix 任务并退回对应角色
- [ ] 全部通过后设置 `phase=verified`

### 6.5 Phase 5：AI 视觉判断（可选，后续迭代）

- [ ] 集成多模态模型（如 GPT-4V、Claude 3.5 Sonnet）
- [ ] 输入：截图 + `expected.naturalLanguage` 描述
- [ ] 输出：pass/fail + 原因描述
- [ ] 作为 visual 断言的 `ai` 模式

---

## 7. 目录结构

```
design-registry/
├── test-cases/                          # 测试用例（新增）
│   ├── schema.json                      # 测试用例 JSON Schema
│   └── <projectId>/
│       └── <screenId>/
│           ├── TC-login-submit-loading.json
│           ├── TC-login-submit-error.json
│           ├── TC-login-submit-success.json
│           └── ...
├── test-artifacts/                      # 测试产物（新增，gitignore）
│   └── <projectId>/
│       └── <caseId>/
│           ├── before.png
│           ├── during.png
│           ├── after.png
│           ├── diff.png                 # pixel 模式的差异图
│           └── result.json              # 执行结果详情
└── test-reports/                        # 测试报告（新增）
    └── <projectId>/
        ├── summary.json                 # 汇总报告
        ├── <screenId>-report.html       # 每屏 HTML 报告
        └── failures.md                  # 失败 case 摘要

apps/design-mcp/src/
├── testing/                             # 新增：测试运行器模块
│   ├── test-case-generator.ts           # 测试用例生成器
│   ├── test-runner.ts                   # 测试执行引擎
│   ├── assertions/                      # 断言引擎
│   │   ├── state-assertion.ts
│   │   ├── dom-assertion.ts
│   │   ├── pixel-assertion.ts
│   │   ├── layout-assertion.ts
│   │   └── ai-assertion.ts             # 可选
│   ├── reporter.ts                      # 报告生成
│   └── types.ts                         # 类型定义
├── puppet/                              # 已有，扩展
│   ├── session.ts                       # 会话管理（已有）
│   ├── actions.ts                       # 操作执行（已有，扩展支持 TestStep）
│   └── inspect.ts                       # DOM 检查（已有，扩展支持断言）
└── tools/
    └── testing-tools.ts                 # 新增 MCP 工具注册

scripts/
└── run-visual-tests.mjs                 # 新增：CLI 入口（类似 screenshot-screen.mjs）
```

---

## 8. 关键设计决策

### 8.1 为什么测试用例不从代码生成，而从设计产物生成？

**第一性原理**：测试的目的是验证"设计意图是否被正确实现"。设计意图在 `interaction-designer` 的产出中已经完整表达（events.actions / states / flows）。从这些产物生成的测试用例，才是**真正验证设计意图**的测试。

如果从代码生成测试用例（如传统的 E2E 测试生成方式），测的是"代码行为是否符合代码"——这是循环论证，不能发现"设计意图 → 代码实现"的偏差。

### 8.2 为什么需要三种断言模式？

单一断言模式都有盲区：
- 只做 pixel 比对 → 抗噪差，每次字体渲染微调就 fail
- 只做 DOM 断言 → 无法验证视觉样式（颜色、圆角、阴影）
- 只做 AI 断言 → 慢、贵、非确定性，不适合 CI 高频运行

三种结合：DOM 做快速健全性检查 + pixel/layout 做视觉验证 + AI 做复杂语义判断（人工 review 时触发）。

### 8.3 baseline 截图怎么管理？

- **首次运行**：自动生成 baseline 截图，存 `test-cases/baselines/<caseId>.png`
- **后续运行**：与 baseline 比对，差异超过 threshold → fail
- **更新 baseline**：design-planner 有意修改设计后，手动触发 `testing/update_baselines`
- **不进 git**：baseline 截图存本地或对象存储，不进 git（太大）

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Puppeteer 执行不稳定（flaky test） | 测试结果不可信 | 每个失败 case 自动重试 2 次；超时设置；稳定等待策略（waitForSelector 而非 fixed delay） |
| 视觉基线维护成本高 | 设计微调导致大量 false positive | threshold 设置合理（1-2%）；支持 focusArea 局部比对；提供"一键更新 baseline"工具 |
| AI 断言慢、贵 | CI 跑不完 | AI 断言只用于复杂语义 case；普通 case 用 DOM + layout 断言；AI 异步执行，不 block CI |
| 测试用例生成不完整 | 漏测场景 | interaction-designer 产出时强制覆盖所有 states + events；generator 有覆盖率报告（多少 state/event 有对应测试用例） |

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
- design-executor 规范：`.claude/skills/design-executor/SKILL.md`
- design-registry 结构：`AGENTS.md` §四
