---
name: interaction-designer
description: 交互细节设计技能。在产品需求分析（product-analyst）之后、UI 搭建（design-from-reference）之前触发。为每个页面/模块设计完整的交互规格：状态机、操作反馈、加载策略、错误处理、微交互动效。产出可直接指导 UI 实现的交互规格表。触发词："设计交互"、"交互细节"、"状态怎么处理"、"失败怎么办"、"加载策略"等涉及 UI 行为设计的请求。
---

# 交互设计 Skill

将产品需求（业务逻辑）转化为精确的 UI 交互规格。回答的不是"做什么"（product-analyst 的职责），而是"用户操作后 UI 怎么响应"。

---

## 定位：链路中的位置

```
product-analyst      → interaction-designer    → design-planner / design-from-reference
 输出: 业务规则         输出: 交互规格表          消费: 精确执行交互
 "登录失败返回401"      "按钮→loading→           "event: click→state.set
                        shake+红字3s→            →effect.fetch→onError
                        聚焦密码框"              →showToast+clearPwd"
```

---

## 核心原则

### 1. 每个用户操作必须有明确的 UI 响应

用户的每一次操作（点击/输入/滑动/等待）都必须有视觉反馈。沉默 = 产品坏了。

### 2. 交互设计是状态机，不是流程图

流程图只描述"正确路径"。交互设计必须覆盖**所有状态**和**所有转换**，包括异常、边界、并发。

### 3. 反馈的层级必须匹配操作的重要性

小操作（点赞）→ 微反馈（图标动画）
中操作（提交表单）→ 中反馈（loading + 结果提示）
大操作（删除账户）→ 强反馈（确认弹窗 + 倒计时）

---

## 工作流

### Phase 1: 页面状态机设计

为每个页面/组件定义完整的状态机：

```
输入: product-analyst 的模块分析（业务流程 + 规则）
输出: 每个页面的状态机图
```

#### 状态机三要素

1. **状态集合** — 页面可能处于的所有状态
2. **转换条件** — 什么操作/事件触发状态切换
3. **转换效果** — 切换时 UI 发生什么变化

#### 示例：登录页状态机

```
States:
  idle        → 初始态，表单空白，按钮可点
  inputting   → 用户正在输入，实时校验
  validating  → 前端校验中（如密码强度）
  submitting  → 请求发送中，按钮 loading
  success     → 登录成功，准备跳转
  error       → 登录失败，显示错误
  locked      → 多次失败，账户临时锁定

Transitions:
  idle → inputting:        用户聚焦任意输入框
  inputting → validating:  输入满足提交条件（非空）
  inputting → idle:        清空所有输入
  validating → submitting: 点击登录按钮
  submitting → success:    API 返回 200
  submitting → error:      API 返回 401/500/timeout
  error → inputting:       用户修改输入
  error → locked:          连续失败 >= 5 次

Effects:
  → submitting: 按钮显示 spinner + 禁用 + 文字变"登录中..."
  → success:    按钮变绿 ✓ + 0.5s 后跳转主页
  → error:      按钮恢复 + 表单 shake + 错误文字淡入 + 密码框清空并聚焦
  → locked:     全表单禁用 + 显示"请 X 分钟后再试" + 倒计时
```

---

### Phase 2: 操作反馈设计

为每个用户操作设计完整的反馈链。详细规范表见 `references/interaction-patterns.md`。

核心要求：
- 每个操作必须覆盖 5 层反馈: 触发条件 → 即时反馈(L0) → 进行中(L3) → 成功 → 失败
- 边界情况必填: 重复点击/超时/离开页面
- 反馈层级匹配操作重要性(L0~L5)

---

### Phase 3: 加载策略设计

为每个数据加载场景设计策略。详见 `references/interaction-patterns.md#加载策略`。

核心: 首次/刷新/加载更多/按钮请求/静默刷新 各自有加载态+失败恢复方案。

---

### Phase 4: 错误处理模式设计

按错误类型设计 UI 响应。详见 `references/interaction-patterns.md#错误处理模式`。

核心: 6类错误(校验/业务/权限/网络/服务/未知) → 各有对应 UI 模式和用户操作。
表单校验 4 个时机: onChange/onBlur/onSubmit/debounce。

---

### Phase 5: 微交互 & 转场设计

定义页面转场和组件微交互。详见 `references/interaction-patterns.md#微交互与转场`。

产出写入 `interaction-design/overview.md`，供所有页面引用。

---

## 产出物格式

每个页面/模块的交互规格存入 `.design-workspaces/<task>/interaction-design/`：

```
.design-workspaces/<task>/
├── interaction-design/
│   ├── overview.md              ← 全局交互规范（反馈层级/加载策略/转场规则）
│   ├── pages/
│   │   ├── login.md             ← 登录页交互规格
│   │   ├── register.md          ← 注册页交互规格
│   │   ├── home-feed.md         ← 主页Feed交互规格
│   │   └── ...
│   └── components/
│       ├── form-input.md        ← 表单输入组件交互规格
│       ├── action-button.md     ← 操作按钮组件交互规格
│       └── ...
```

### 单页交互规格模板

```markdown
# [页面名] 交互规格

## 状态机
States: (所有状态列表+含义)
Transitions: (所有转换条件)
Effects: (每个转换的UI响应描述)

## 操作清单（穷举该页面上所有用户可执行的操作）
| # | 操作 | 触发方式 | 前置条件 | 即时反馈 | 进行中 | 成功反馈 | 失败反馈 | 边界处理 |
|---|------|---------|---------|---------|-------|---------|---------|---------|
| 1 | 提交表单 | click 按钮 | 校验通过 | 按钮loading | 表单禁用 | ✓+跳转 | shake+红字 | 重复点击忽略 |
| ... | | | | | | | | |

## 加载策略
(首次/刷新/加载更多 各自的策略+失败恢复)

## 错误处理
(按错误类型的响应方案)

## 边界情况
(重复操作/并发/离线/超时/中途退出 等)

## 组件级交互需求（识别出足够复杂需要独立设计的子模块）
| 组件 | 触发场景 | 交互复杂度 | 独立文档? |
|------|---------|:---------:|:-------:|
| VisibilitySheet | 点击可见性行 | 高(多选项+子面板) | ✅ |

★ 高复杂度组件需要单独一份交互规格文档(写入 components/ 目录)
```

---

## 执行节奏

### 启动门禁（★ 必须先跑，跑挂了就回上游修）

```bash
SCRIPTS=".cursor/skills/common/scripts"
REGISTRY=".design-workspaces/<task>/design-registry"
WORKSPACE=".design-workspaces/<task>"

# 1. 上游门禁：必须 product 阶段已通过
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage interaction --mode entry
# 退出码 0/2 才能继续；退出码 1 → 回 product-analyst 补完缺项

# 2. 生成本阶段任务清单（PLAN.md），覆盖每页所有任务
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/plan-gen.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage interaction
# 产物：interaction-design/PLAN.md

# 3. 看待分析任务列表
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/task-gen.ts \
  --registry $REGISTRY --for interaction
# 输出: 所有有 product 但无 interaction 的页面列表
```

### 工作纪律

- **PLAN.md 是真理之源**：每完成一项必须把 `[ ]` 改成 `[x]`，不可跳过
- **逐页面分析，逐页面打勾**：一个页面 4 项任务（写 md / 写 _page.json interaction 层 / 创建子节点 / 跑收尾门禁）必须全部完成才能进下一页
- **绝不允许 operations 写成字符串数组**：必须是 `[{ "op": "...", "triggerNodePath": "<block>/<element>" }]`，且每个 triggerNodePath 必须对应到真实节点文件

### 每个页面的执行步骤

```
Step 1: 读取产品层信息
  - read_file design-registry/pages/<id>/_page.json → product 层 summary + ref
  - read_file product.ref 指向的产品模块 md → 获取完整流程/规则/异常

Step 2: 分析交互（产出 md 文档）
  - 状态机设计（States + Transitions + Effects）
  - 操作清单（穷举所有交互）
  - 加载策略 + 错误处理 + 边界情况
  - 组件识别（哪些交互足够复杂需要独立组件文档）
  - 写入 interaction-design/pages/<page>.md

Step 3: 写入 design-registry（★ 通过脚本，不可跳过）

  SCRIPTS=".cursor/skills/common/scripts"
  REGISTRY=".design-workspaces/<task>/design-registry"

  a. 更新 _page.json 追加 interaction 层（operations 必须是结构化对象数组）:
     execute_command: npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
       --registry $REGISTRY \
       --path pages/<page>/_page \
       --layer interaction \
       --data '{
         "summary": "...",
         "ref": "interaction-design/pages/<page>.md",
         "states": ["loading", "idle", "submitting", ...],
         "operations": [
           { "op": "点击发布按钮", "triggerNodePath": "nav-bar/publish-btn" },
           { "op": "输入文字", "triggerNodePath": "editor-section/textarea" },
           { "op": "选择可见性", "triggerNodePath": "editor-section/visibility-row" }
         ]
       }'

     ❌ 严禁: "operations": ["点击发布", "输入文字"] (字符串数组)
     ✅ 正确: 每条 operation 必须有 triggerNodePath，且对应到下面 b 步创建的节点

  b. 构建 children 骨架节点（★ 每个 operation 的 triggerNodePath 都必须真实存在）:

     遍历 md 中的「操作清单」表格，每一行至少创建 2 个节点（区块 + 元素）：

     # 创建区块容器
     execute_command: npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/create-node.ts \
       --registry $REGISTRY \
       --path pages/<page>/<block>/_block \
       --data '{ "id": "<block>", "type": "block", "name": "<显示名>", "interaction": {...} }'

     # 创建触发元素（从「操作清单」逐行映射）
     execute_command: npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/create-node.ts \
       --registry $REGISTRY \
       --path pages/<page>/<block>/<element> \
       --data '{
         "id": "publish-btn",
         "type": "element",
         "name": "发布按钮",
         "interaction": {
           "summary": "click(条件)→loading→success/error",
           "ref": "interaction-design/pages/<page>.md#操作清单:点击发布",
           "trigger": "click",
           "condition": "{{ ... }}",
           "flows": {
             "success": { "summary": "...", "ref": "..." },
             "error": { "summary": "...", "ref": "..." }
           },
           "states": ["disabled", "active", "loading"]
         }
       }'

     每个非基准状态的独立UI区域（如 ErrorBanner / EmptyState） → 也是节点文件
     识别为组件的（md 中标记"独立文档=✅"） → 创建组件目录:
     execute_command: npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/create-node.ts \
       --registry $REGISTRY \
       --path pages/<page>/<component>/_block \
       --data '{ "id": "...", "type": "component", "name": "...", "interaction": {...} }'

  c. 更新全局交互规范引用到 _index.json (仅首次):
     execute_command: npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
       --registry $REGISTRY --path _index \
       --field interactionSystemRef --value '"interaction-design/overview.md"'

  d. 在 PLAN.md 把该页 4 个任务全部 [x]

Step 4: 暂停确认后继续下一个页面
```

### 收尾门禁（★ 全部页面分析完后必跑，未通过不准移交 design-planner）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage interaction --mode exit
```

**必须 0 ❌**，否则 design-planner 启动时会被拒绝。常见 ❌：

| 报错 | 含义 | 修复 |
|------|------|------|
| `pages/<id>/: 没有任何子节点文件` | 该页只写了 _page.json 没建节点骨架 | 回 Step 3.b 补 create-node |
| `operations[N] 是字符串而非对象` | 偷懒用字符串数组 | 回 Step 3.a 重写 _page.json |
| `operation 引用的节点文件不存在` | triggerNodePath 写错或对应节点未建 | 检查路径，create-node 补上 |
| `缺 interaction 层` | 整个页面跳过了 | 必须分析该页 |

### Design Registry 写入规则

**写入的 interaction 层结构示例：**

```jsonc
// 节点 .json 中的 interaction 层
{
  "interaction": {
    "summary": "click(条件)→loading→success/error",
    "ref": "interaction-design/pages/02-publish-moment.md#操作清单:点击发布",
    "trigger": "click",
    "condition": "{{ content || images.length > 0 }}",
    "flows": {
      "success": { "summary": "按钮✓+粒子飘落+返回", "ref": "同上#Effects→success" },
      "error": { "summary": "恢复+Toast+表单可编辑", "ref": "同上#Effects→error" },
      "timeout": { "summary": "15s恢复+Toast超时", "ref": "同上#边界情况" },
      "boundary": { "summary": "重复点击忽略", "ref": "同上#边界情况" }
    },
    "states": ["disabled", "active", "loading"]
  }
}
```

**写入原则：**
- 节点文件中已有的 `product` 层 **不可修改不可删除**
- 只追加 `interaction` 层
- 如果发现需要新节点（产品层未预见的UI区域）→ 通过 `create-node.ts` 创建新文件
- 每个非基准状态如果需要独立UI容器 → 必须创建对应节点文件（不能只写在 md 里不写 registry）

### 产品需求覆盖验证

每个页面分析完后，必须检查：

```
遍历 product-analysis 中该模块的:
  - 每个异常故事(E1~En) → 是否都有对应的状态或错误处理
  - 每个业务规则 → 是否都在操作清单的某行被覆盖
  - 每个流程节点 → 是否都有交互反馈设计

不通过 → 补充遗漏的交互设计
```

---

## 与其他技能的衔接

| 上游 | 提供给本技能 | 本技能输出 | 下游消费 |
|------|------------|-----------|---------|
| product-analyst | Registry 中的 product 层 + md 详情 | interaction 层 + md 文档 | design-planner 消费 |
| theme-generator | motion strategy + transitions | 动画时长/缓动参考 | design-planner 引用 |

---

## 详细参考（按需加载）

- `references/interaction-patterns.md` — ★ 全局交互规范（反馈层级/操作模板/加载策略/错误处理/微交互/转场）
- `references/feedback-patterns.md` — 常见产品的反馈模式案例库
- `references/state-machine-examples.md` — 典型页面状态机设计案例
- `references/error-handling-patterns.md` — 错误处理最佳实践
