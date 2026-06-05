# 视觉测试用例沉淀规范

> 适用时机：步骤 2 每轮截图对账通过后，按本规范写一个测试用例 JSON 文件。
> 文件保存位置：`test-cases/<projectId>/<screenId>/V-<goalId>-<aspect>.json`

---

## 1. 什么时候写一个 case

截图对账时，每一条**能机器验证的** successCriteria，都要对应一个 case。

```
successCriteria 示例                      → 是否写 case？          → case 类型
"背景使用极淡蓝灰，传达专业感"       → ✅ 是（DOM 可断言）  → V-G1-appearance
"主按钮 hover 时边框高亮"              → ✅ 是（操作+DOM）     → V-G1-hover
"整体视觉干净、层次分明"               → ❌ 否（AI 看图判断）  → 不写，交给 AI 断言
"卡片 16px 圆角，呼应有机形态"        → ✅ 是（DOM 可断言）  → V-G1-border-radius
```

**判断标准**：这条 criteria 能否翻译成「操作 + DOM 属性检查」或「截图 + 像素/AI 比对」？
- 能 → 写 case
- 不能（纯主观感受）→ 不写，在 task notes 里留一句"需 AI 目视验收"即可

---

## 2. case 文件格式

```jsonc
{
  // ── 基本信息 ──
  "id": "V-login-G1-appearance",      // 格式：V-<screenId>-<goalId>-<aspect>
  "name": "登录页 G1 — 背景色验证",
  "description": "背景使用极淡蓝灰 #F8FAFB，传达专业洁净感",
  "screenId": "login-screen",
  "goalId": "G1-professional-trust",
  "priority": "high",                  // high | medium | low
  "source": "successCriteria",          // 来自哪条 successCriteria

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
    "domAssertions": [                  // DOM 断言（精确验证，优先用这个）
      {
        "selector": "[data-node-id='login-bg']",
        "property": "backgroundColor",
        "operator": "equals",
        "value": "rgb(248, 250, 251)",
        "description": "背景色为极淡蓝灰"
      }
    ],
    "visualAssertions": [               // 视觉断言（语义验证，用 AI）
      {
        "timing": "after",
        "mode": "ai",
        "prompt": "背景色为极淡蓝灰，整体感觉专业洁净，没有刺眼的纯白"
      }
    ]
  },

  // ── 以下字段由 test-runner 填写，生成时留空 ──
  "status": "generated",
  "result": null
}
```

---

## 3. 各字段填写指南

### `steps[].action`

| 值 | 何时用 | 示例 |
|---|---|---|
| `hover` | 验证 hover 态样式 | 悬停按钮 → 检查边框色变化 |
| `click` | 验证点击后状态变化 | 点击提交 → 检查 loading 态 |
| `input` | 验证输入后样式变化 | 输入错误手机号 → 检查 error 态 |
| `wait` | 等待异步状态变化 | 提交后等 500ms → 检查 loading 遮罩 |
| `scroll` | 验证滚动后样式 | 滚动页面 → 检查 header 背景变化 |
| 不填 steps | 静态样式验证（不需要操作） | 直接截当前屏验证背景色 |

### `expected.domAssertions[]`

最可靠的断言方式，优先用。

```jsonc
// 验证样式属性
{ "selector": "[data-node-id='btn']", "property": "backgroundColor", "operator": "equals", "value": "rgb(0, 120, 212)" }
{ "selector": "[data-node-id='card']", "property": "borderRadius", "operator": "equals", "value": "16px" }
{ "selector": "[data-node-id='title']", "property": "fontSize", "operator": "equals", "value": "24px" }

// 验证伪类（hover/active/focus）
{ "selector": "[data-node-id='btn']", "pseudo": ":hover", "property": "borderColor", "operator": "matches", "value": "var(--colorPrimary)" }

// 验证元素存在/不存在
{ "selector": "[data-overlay-id='loading']", "exists": true, "description": "loading 遮罩已显示" }
{ "selector": "[data-node-id='error-msg']", "exists": false, "description": "错误提示未显示" }
```

`operator` 可选值：`equals` | `matches` | `contains` | `gt` | `lt` | `exists`

### `expected.visualAssertions[]`

用于 DOM 断言无法覆盖的语义验证（如"整体感觉专业"）。

```jsonc
// AI 模式（推荐，灵活）
{ "timing": "after", "mode": "ai", "prompt": "按钮 hover 时有明显的高亮反馈，用户能感知到可点击" }

// pixel 模式（精确，但抗噪差）
{ "timing": "after", "mode": "pixel", "threshold": 0.01, "baseline": "baseline/login-hover.png" }

// layout 模式（验证位置/尺寸）
{ "timing": "after", "mode": "layout", "focusArea": "[data-node-id='btn']", "check": ["position", "size"] }
```

---

## 4. 常见场景模板

### 场景 A：验证静态样式（不需要操作）

```jsonc
{
  "id": "V-<screenId>-G< N>-appearance",
  "name": "<屏名> G<N> — 背景样式验证",
  "steps": [],                              // 空数组，不操作直接验证
  "expected": {
    "domAssertions": [
      { "selector": "[data-node-id='screen-root']", "property": "backgroundColor", "operator": "equals", "value": "..." }
    ]
  }
}
```

### 场景 B：验证 hover 态

```jsonc
{
  "id": "V-<screenId>-G< N>-hover",
  "name": "<屏名> G<N> — 按钮 hover 态验证",
  "steps": [
    { "action": "hover", "target": "[data-node-id='...']", "description": "...", "screenshot": "after" }
  ],
  "expected": {
    "domAssertions": [
      { "selector": "...", "pseudo": ":hover", "property": "borderColor", "operator": "matches", "value": "var(--colorPrimary)" }
    ]
  }
}
```

### 场景 C：验证 loading 态（点击 → 等待 → 检查）

```jsonc
{
  "id": "V-<screenId>-G< N>-loading",
  "name": "<屏名> G<N> — 提交 loading 态验证",
  "steps": [
    { "action": "click", "target": "[data-node-id='submit-btn']", "description": "点击提交", "screenshot": "during" },
    { "action": "wait", "duration": 500 }
  ],
  "expected": {
    "domAssertions": [
      { "selector": "[data-node-id='submit-btn']", "property": "disabled", "operator": "equals", "value": true },
      { "selector": "[data-overlay-id='loading-backdrop']", "exists": true }
    ]
  }
}
```

---

## 5. 写入位置

```
test-cases/<projectId>/<screenId>/
├── V-G1-appearance.json       # 目标 G1 静态外观
├── V-G1-hover.json            # 目标 G1 hover 态
├── V-G2-typography.json      # 目标 G2 排版
└── ...
```

- 目录不存在时先 `mkdir -p`
- 文件名格式：`V-<goalId>-<aspect>.json`（aspect 用 kebab-case）
- `test-cases/` **进 git**（测试用例是设计契约的一部分）

---

## 6. 自检

写完一个 case 后，快速检查：

- [ ] `id` 格式正确（`V-<screenId>-<goalId>-<aspect>`）
- [ ] `selector` 用的是 `[data-node-id='...']` 或 `[data-overlay-id='...']`（不用 class 或随意选择器）
- [ ] `domAssertions` 有实际可检查的属性（不是空数组）
- [ ] 如果 steps 里有操作，`screenshot` 字段已填（before/after/during）
- [ ] `description` 字段用中文，描述具体（不用"样式正确"这种套话）
- [ ] 文件已写到 `test-cases/<projectId>/<screenId>/` 下
