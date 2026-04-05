# Toast 与交互过程组件：基于状态系统的画布设计方案

> **核心命题：Toast 等交互过程组件可以且应该画在画布上——但它只在特定状态下可见。通过现有的"自定义状态"机制，让这些组件与画布和谐共存。**

---

## 一、第一性原理重构：上个方案哪里错了？

### 1.1 上个方案的逻辑

```
上一版的推导路径：

  画布 = 空间维度 → Toast = 时间维度 → 两者不兼容 → Toast 不该画在画布上

这个推导有一个隐含假设：画布只有一种"时间切片"——始终可见的默认态。

但我们的编辑器已经有了"状态系统"——
  画布实际上可以表达多个"时间切片"。
```

### 1.2 被忽视的关键能力：状态 = 时间切片

```
我们的编辑器已有的状态体系：

  ┌────────────────────────────────────────────────────────┐
  │ 内置交互态                                             │
  │   default ← 默认时间切片                               │
  │   hover   ← 鼠标悬停的时间切片                         │
  │   pressed ← 按下瞬间的时间切片                         │
  │   focus   ← 聚焦时的时间切片                           │
  │                                                        │
  │ 自定义状态                                              │
  │   loading   ← 加载中的时间切片                          │
  │   success   ← 成功时的时间切片                          │
  │   error     ← 失败时的时间切片                          │
  │   empty     ← 空数据时的时间切片                        │
  │   登陆成功  ← 登录成功后的时间切片                       │
  │   任意名称... ← 任何业务场景的时间切片                   │
  └────────────────────────────────────────────────────────┘

  每个状态就是画布的一个"时空分身"——
  在不同状态下，同一个画布可以呈现完全不同的 UI。
  这正是"Toast 等临时组件"需要的：
    default 状态 → 没有 Toast → 正常 UI
    登陆成功状态 → 有一个 Toast 浮层 → 出现 3 秒后回到 default
```

### 1.3 修正后的第一性原理

```
❌ 旧结论：Toast 不该画在画布上，因为它是"时间维度"的产物
✅ 新结论：Toast 应该画在画布上，但画在特定状态的"时间切片"里

  画布 + 状态系统 = 空间维度 × 时间维度

  画布不只是空间的，它在状态系统的加持下已经是"时空"的了。
  每个自定义状态就是一个时间维度的切片。
  Toast 画在"登陆成功"状态里 ≠ Toast 画在默认画布上。
  它只在该状态激活时才存在，切回 default 就消失了。

核心优势：
  1. 设计师可以用画布的全部能力来设计 Toast 的外观
  2. Toast 不会污染默认状态的画布（因为它只存在于特定状态）
  3. 显示条件天然确定（状态何时激活，Toast 就何时显示）
  4. 完全复用现有的状态系统，无需发明新概念
  5. 代码生成直接映射：{ currentState === '登陆成功' && <Toast /> }
```

### 1.4 为什么这比"纯配置 showToast"更好

```
┌──────────────────┬──────────────────────────┬──────────────────────────┐
│ 维度             │ 纯配置 showToast（旧方案）│ 状态 + 画布绘制（新方案）  │
├──────────────────┼──────────────────────────┼──────────────────────────┤
│ 设计自由度       │ ❌ 只能选类型和填文本      │ ✅ 完整画布能力任意设计    │
│ 品牌一致性       │ ❌ 内置样式无法自定义      │ ✅ 设计师完全控制外观      │
│ 学习成本         │ ⚠️ 新概念"事件行为"       │ ✅ 复用已有的状态系统      │
│ 画布污染         │ ✅ 不在画布上              │ ✅ 只在对应状态里可见      │
│ 多种布局支持     │ ❌ 只有顶部/底部几种位置   │ ✅ 任意定位、大小、层叠    │
│ 可扩展性         │ ❌ 每种反馈要新增 action   │ ✅ 任何组件都能状态绑定    │
│ 代码生成映射     │ ⚠️ 需额外 toast API 映射  │ ✅ 标准条件渲染           │
│ 真实度           │ ❌ 内置渲染器风格固定      │ ✅ 所见即所得             │
│ 设计系统对齐     │ ❌ 脱离设计系统            │ ✅ 复用设计系统组件/模板   │
└──────────────────┴──────────────────────────┴──────────────────────────┘

一句话：给设计师一支笔，比给设计师一个下拉菜单，永远更有创造力。
```

---

## 二、产品设计：基于状态系统的交互反馈

### 2.1 统一心智模型

```
一个核心认知：组件 + 状态 = 完整的交互 UI

  ┌────────────────────────────────────────────────────────────┐
  │                                                            │
  │  组件（what）× 状态（when）= 交互 UI                       │
  │                                                            │
  │  • 按钮 × default = 正常按钮                               │
  │  • 按钮 × hover   = 悬停态按钮                             │
  │  • 按钮 × loading  = 加载中按钮（菊花图标）                 │
  │  • Toast × 登陆成功 = 成功提示浮层                          │
  │  • Toast × 登陆失败 = 错误提示浮层                          │
  │  • Skeleton × loading = 骨架屏加载占位                      │
  │  • Modal × 确认删除 = 确认弹窗                              │
  │                                                            │
  │  所有的"交互过程 UI"都是：                                   │
  │    "某个组件"在"某个状态"下的存在。                           │
  │                                                            │
  │  不需要为 Toast 发明 showToast，                             │
  │  不需要为 Loading 发明 showLoading，                         │
  │  不需要为 Modal 发明 showConfirm——                           │
  │  它们都是"组件 + 状态可见性"的实例。                          │
  │                                                            │
  └────────────────────────────────────────────────────────────┘
```

### 2.2 完整用户流程（登录页 Toast 示例）

```
━━━ 步骤 1: 创建自定义状态 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  选中页面根节点（Root）
  右侧状态栏 → 自定义 → [+] → 输入"登陆成功"
  再添加一个"登陆失败"

  状态栏显示：
  ┌───────┬──────┬──────┬──────┬──────┬──────────┬──────────┐
  │ 默认  │ 悬停 │ 按下 │ 聚焦 │ 禁用 │ 登陆成功  │ 登陆失败  │
  └───────┴──────┴──────┴──────┴──────┴──────────┴──────────┘


━━━ 步骤 2: 切到"登陆成功"状态，画 Toast ━━━━━━━━━━━

  点击"登陆成功"标签 → 画布切换到该状态

  顶部提示：● 正在编辑「登陆成功」状态  覆盖值以蓝色标记

  在画布上绘制 Toast 组件：
  ┌──────────────────────────────────────┐
  │                                      │
  │      ┌───────────────────────┐      │
  │      │ ✅ {{response.message}} │     │  ← 成功 Toast
  │      └───────────────────────┘      │     position: absolute
  │                                      │     top: 16px, 居中
  │      ┌────────────────────┐          │     z-index: 1000
  │      │   邮箱输入框       │          │
  │      │   密码输入框       │          │
  │      │   [登录按钮]       │          │
  │      └────────────────────┘          │
  │                                      │
  └──────────────────────────────────────┘

  标记 Toast 组件：仅在当前状态可见 ✓
  （在默认状态下，这个 Toast 组件不会显示）


━━━ 步骤 3: 切到"登陆失败"状态，画错误 Toast ━━━━━━

  点击"登陆失败"标签

  在画布上绘制错误 Toast：
  ┌──────────────────────────────────────┐
  │                                      │
  │    ┌──────────────────────────┐     │
  │    │ ❌ {{response.message}}   │     │  ← 错误 Toast
  │    └──────────────────────────┘     │     红色风格
  │                                      │     同样 absolute 定位
  │      ┌────────────────────┐          │
  │      │   邮箱输入框       │          │
  │      │   密码输入框       │          │
  │      │   [登录按钮]       │          │
  │      └────────────────────┘          │
  │                                      │
  └──────────────────────────────────────┘

  标记 Toast 组件：仅在当前状态可见 ✓


━━━ 步骤 4: 切回"默认"状态确认画布干净 ━━━━━━━━━━━

  点击"默认"标签

  ┌──────────────────────────────────────┐
  │                                      │
  │      ┌────────────────────┐          │
  │      │   邮箱输入框       │          │  ← 干净的画布
  │      │   密码输入框       │          │     没有任何 Toast
  │      │   [登录按钮]       │          │
  │      └────────────────────┘          │
  │                                      │
  └──────────────────────────────────────┘


━━━ 步骤 5: 配置事件链 ━━━━━━━━━━━━━━━━━━━━━━━━━━━

  选中 LoginButton → 行为面板 → 添加事件

  触发: 点击
  行为链:
    ① 发送请求 → 用户登录 POST /api/auth/login
       ├── ✅ 成功:
       │   └── 设置状态 → Root → "登陆成功"  (3000ms 后自动回退)
       └── ❌ 失败:
           └── 设置状态 → Root → "登陆失败"  (3000ms 后自动回退)


━━━ 步骤 6: 预览验证 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  切换 Mock 场景 → "登录成功" → 点击登录按钮

  效果：
    1. 发送请求（Mock 延迟 800ms）
    2. 收到成功响应
    3. Root 状态变为"登陆成功"
    4. 成功 Toast 出现（设计师画的那个！）
    5. 3 秒后自动回退到"默认" → Toast 消失

  切换 Mock 场景 → "密码错误" → 再次点击

  效果：
    1. 发送请求（Mock 延迟 500ms）
    2. 收到失败响应
    3. Root 状态变为"登陆失败"
    4. 错误 Toast 出现（红色的那个！）
    5. 3 秒后自动回退 → Toast 消失
```

### 2.3 显示条件如何绑定：两层机制

```
问：Toast 怎么知道何时显示？
答：两层机制，各司其职。

  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │  第一层：组件可见性 ← "在什么状态下存在"                  │
  │  ─────────────────                                      │
  │  Toast 组件设置：仅在状态"登陆成功"可见                   │
  │  → 只要 Root 不在"登陆成功"状态，Toast 就不存在          │
  │  → 这是"空间"维度的控制                                  │
  │                                                         │
  │  第二层：事件链 ← "什么时候切换到该状态"                  │
  │  ─────────────                                          │
  │  事件配置：apiRequest → onSuccess → setState("登陆成功") │
  │  → 请求成功时，Root 切换到"登陆成功"状态                  │
  │  → 这是"时间"维度的控制                                  │
  │                                                         │
  │  两层结合：                                              │
  │    请求成功 → Root 进入"登陆成功"状态 → Toast 变可见      │
  │    3 秒后自动回退 → Root 回到"默认"状态 → Toast 消失      │
  │                                                         │
  │  不需要给 Toast 单独配条件。                              │
  │  状态系统天然提供了条件能力。                              │
  │                                                         │
  └─────────────────────────────────────────────────────────┘
```

### 2.4 架构优势：同一模式覆盖所有场景

```
这个模式不止适用于 Toast，它是通用的：

  ┌───────────────────────────────────────────────────────────────┐
  │ 场景                    │ 状态名       │ 画布上画什么          │
  ├─────────────────────────┼──────────────┼───────────────────────┤
  │ 登录成功提示             │ 登陆成功     │ 成功 Toast 浮层       │
  │ 登录失败提示             │ 登陆失败     │ 错误 Toast 浮层       │
  │ 页面加载中               │ 加载中       │ 骨架屏 / Loading 遮罩 │
  │ 空数据                   │ 空数据       │ "暂无数据" 空状态插图  │
  │ 删除确认弹窗             │ 确认删除     │ Modal 确认弹窗        │
  │ 表单提交成功             │ 提交成功     │ 成功页面 / 打勾动画    │
  │ 网络断开                 │ 离线         │ 离线提示条            │
  │ 下拉菜单展开             │ 菜单展开     │ 下拉浮层              │
  └───────────────────────────────────────────────────────────────┘

  所有这些都是同一个模式：
    1. 创建状态
    2. 在该状态的画布上画对应的 UI
    3. 通过事件链触发状态切换

  零个新概念，零个新 action 类型。
  只是把已有的状态系统用到位了。
```

---

## 三、需要补齐的能力

### 3.1 现有系统盘点

```
已有但完整的：
  ✅ ComponentState 定义 — states[].name, styles, props, transition
  ✅ 自定义状态创建/删除 — StateContextBar 的 "+" 按钮
  ✅ 状态切换编辑 — 点击状态标签切到对应态编辑样式
  ✅ 事件系统 setState — 切换组件的 activeState
  ✅ 预览时 runtimeNodeStates — 事件触发的动态状态切换
  ✅ apiRequest 事件动作 — 发送请求并分支处理

已有但未接入引擎的：
  ⚠️ childrenVisibility — Schema 中 ComponentState 上已有字段
     定义: childrenVisibility?: Record<string, boolean>
     含义: 在此状态下，哪些子节点可见/隐藏
     现状: 类型存在，渲染引擎未读取此字段

  ⚠️ visibilityWhen — ComponentNode 上的字段
     含义: 组件的显示条件（绑定全局状态变量）
     现状: 注释中列为 resolveNodeProps 第 5 层，但未实现

完全缺失的：
  ❌ setState 自动回退 — 状态激活 N 秒后自动回到上一状态
  ❌ 状态绑定的可见性 UI — 设计师标记"此组件仅在 X 状态可见"
  ❌ 画布状态编辑态的可视提示 — 仅在特定状态可见的组件，
     在其他状态下应以虚影/透明方式显示（而非完全消失）
```

### 3.2 需要实现的四项核心能力

```
能力 1: 状态条件可见性（childrenVisibility 接入渲染）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Schema 已有：ComponentState.childrenVisibility

  需要做的：
  • 在 resolveNodeProps 或 SchemaRenderer 的渲染流程中
    读取父节点当前 activeState 的 childrenVisibility
  • 若 childrenVisibility[childId] === false → 不渲染该子节点
  • 若 childrenVisibility[childId] === true 或 undefined → 正常渲染
  • PreviewRenderer 同理（使用 runtimeNodeStates 动态态）

  效果：
    Root 在 default 态 → childrenVisibility[toastId] = false → Toast 不渲染
    Root 在 登陆成功 态 → childrenVisibility[toastId] = true → Toast 渲染


能力 2: setState 自动回退
━━━━━━━━━━━━━━━━━━━━━━━━

  Schema 扩展：SetStateAction 增加 autoRevertMs 字段

  interface SetStateAction {
    type: 'setState';
    targetId: string;
    state: string;
    autoRevertMs?: number;   // ← 新增：N 毫秒后自动回退到上一状态
  }

  引擎实现：
  • EventExecutionEngine 执行 setState 时记录 previousState
  • 若 autoRevertMs > 0，启动 setTimeout
  • 超时后自动执行 setState(targetId, previousState)

  效果：
    setState("登陆成功", autoRevertMs: 3000)
    → Toast 出现
    → 3 秒后自动回退到 default
    → Toast 消失


能力 3: 可见性编辑 UI
━━━━━━━━━━━━━━━━━━━━

  位置：选中一个组件 → 右侧属性面板 → 新增"显示条件"区

  ┌────────────────────────────────────────┐
  │ 显示条件                               │
  ├────────────────────────────────────────┤
  │                                        │
  │ (●) 始终显示                           │  ← 默认
  │ ( ) 仅在以下状态显示:                   │
  │     ☐ 默认                             │
  │     ☐ 悬停                             │
  │     ☑ 登陆成功                         │  ← 勾选
  │     ☐ 登陆失败                         │
  │                                        │
  └────────────────────────────────────────┘

  保存方式：
  修改父节点各状态的 childrenVisibility[thisNodeId]：
    default 态    → childrenVisibility[toastId] = false
    登陆成功态    → childrenVisibility[toastId] = true
    其余态        → childrenVisibility[toastId] = false


能力 4: 画布编辑态的可视提示
━━━━━━━━━━━━━━━━━━━━━━━━━━━

  问题：在"默认"状态下编辑时，那些仅在其他状态可见的组件
        应该怎么显示？完全隐藏会让设计师忘记它们的存在。

  方案：以"虚影"模式显示

  当编辑"默认"状态时：
    ┌──────────────────────────────────────┐
    │                                      │
    │      ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐      │
    │        ✅ 登录成功              ← 虚影  │  opacity: 0.3
    │      └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘      │  dashed border
    │                                      │  标签: 👁 登陆成功
    │      ┌────────────────────┐          │
    │      │   邮箱输入框       │          │
    │      │   密码输入框       │          │
    │      │   [登录按钮]       │          │
    │      └────────────────────┘          │
    │                                      │
    └──────────────────────────────────────┘

  虚影组件：
    • opacity: 0.3 + 虚线边框
    • 右上角标签显示所属状态
    • 点击可选中并编辑（自动切换到对应状态）
    • 可在设置中关闭虚影显示（pure clean 模式）

  当编辑"登陆成功"状态时：
    Toast 正常显示（opacity: 1.0），可完整编辑
```

---

## 四、与 apiRequest 事件链的整合

### 4.1 简化后的事件链

```
原方案（复杂）：
  click → apiRequest → onSuccess → showToast("成功", "{{response.message}}")

新方案（简洁）：
  click → apiRequest → onSuccess → setState(Root, "登陆成功", autoRevert: 3000ms)

新方案中：
  • 不需要 showToast action 类型
  • Toast 的外观由画布决定，不由事件配置决定
  • 事件只负责"切换状态"，状态负责"展示什么 UI"

  职责分离更清晰：
    事件系统 = 控制流（什么时候发生什么变化）
    状态系统 = 视图层（不同状态下 UI 长什么样）
    画布     = 设计工具（设计每个状态下的 UI 外观）
```

### 4.2 事件链编辑器中 apiRequest 的嵌套子链路

```
事件配置面板中，apiRequest 的成功/失败子链路：

  ┌──────────────────────────────────────────────────┐
  │ 触发: 点击                                       │
  │                                                  │
  │ 动作链:                                          │
  │  1. [发送请求 ▾] → 用户登录                      │
  │     ┌── ✅ 成功时执行 ────────────────────────┐ │
  │     │  1. [设置状态 ▾] Root → "登陆成功"      │ │
  │     │     ☑ 自动回退  [3000] ms               │ │
  │     │  [+ 添加]                               │ │
  │     └─────────────────────────────────────────┘ │
  │     ┌── ❌ 失败时执行 ────────────────────────┐ │
  │     │  1. [设置状态 ▾] Root → "登陆失败"      │ │
  │     │     ☑ 自动回退  [3000] ms               │ │
  │     │  [+ 添加]                               │ │
  │     └─────────────────────────────────────────┘ │
  │  [+ 添加动作步骤]                                │
  └──────────────────────────────────────────────────┘

  子链路可以组合多个动作：
    成功: setState("登陆成功") → delay(500) → navigate("主页")
    失败: setState("登陆失败")
```

### 4.3 showToast action 的定位调整

```
showToast 仍可保留，但定位为"快捷方式"：

  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │  主要方式（推荐）：状态 + 画布绘制                     │
  │  ────────────────                                    │
  │  适用：需要自定义设计的 Toast、Loading、Modal 等       │
  │  优点：完整的设计自由度，所见即所得                     │
  │  流程：创建状态 → 画 UI → 事件切换状态                 │
  │                                                      │
  │  快捷方式（可选）：showToast action                   │
  │  ────────────────                                    │
  │  适用：只需要一行文字提示的简单场景                     │
  │  优点：快、不需要画 UI                                │
  │  缺点：样式固定，无法自定义设计                        │
  │  流程：事件链中直接添加 showToast 动作                 │
  │                                                      │
  │  两者可共存，设计师按需选择。                           │
  │  但产品引导应优先推荐状态方式。                         │
  │                                                      │
  └──────────────────────────────────────────────────────┘
```

---

## 五、技术实现方案

### 5.1 架构总览

```
涉及修改的模块：

  features/design-schema
    └─ types/event.ts         → SetStateAction 增加 autoRevertMs

  features/design-engine
    ├─ renderer/SchemaRenderer.tsx
    │   → 渲染子节点前检查父节点的 childrenVisibility
    ├─ preview/PreviewRenderer.tsx
    │   → 同上（使用 runtimeNodeStates）
    ├─ preview/EventExecutionEngine.ts
    │   → setState 支持 autoRevertMs（定时器回退）
    └─ styles/resolveProps.ts
        → 可选：实现 visibilityWhen 第 5 层

  features/design-operations
    └─ operations/state.ts
        → 新增 setChildVisibility operation

  apps/design_front
    ├─ panels/RightPanel/
    │   └─ VisibilityConditionSection.tsx   → NEW: "显示条件"编辑 UI
    ├─ panels/tabs/InteractionsTab/
    │   └─ index.tsx                        → apiRequest 嵌套子链路 UI
    │                                         + setState autoRevert 选项
    └─ views/editor/Canvas/
        └─ index.tsx / SchemaRenderer        → 虚影模式渲染
```

### 5.2 childrenVisibility 渲染接入

```typescript
// SchemaRenderer.tsx — 渲染子节点时检查可见性

function shouldRenderChild(
  parentNode: ComponentNode,
  childNode: ComponentNode,
  globalStates: Record<string, string>,
): boolean {
  // 1. 基础可见性
  if (childNode.visible === false) return false;

  // 2. 检查父节点当前激活状态的 childrenVisibility
  const parentState = parentNode.states?.find(s => s.name === parentNode.activeState);
  if (parentState?.childrenVisibility) {
    const vis = parentState.childrenVisibility[childNode.id];
    if (vis === false) return false;
  }

  return true;
}

// PreviewRenderer.tsx — 同理，但使用 runtimeNodeStates
function shouldRenderChildPreview(
  parentNode: ComponentNode,
  childNode: ComponentNode,
  runtimeStates: Map<string, string>,
  previewHiddenIds: Set<string>,
): boolean {
  if (previewHiddenIds.has(childNode.id)) return false;
  if (childNode.visible === false) return false;

  const runtimeState = runtimeStates.get(parentNode.id) ?? parentNode.activeState;
  const parentState = parentNode.states?.find(s => s.name === runtimeState);
  if (parentState?.childrenVisibility) {
    const vis = parentState.childrenVisibility[childNode.id];
    if (vis === false) return false;
  }

  return true;
}
```

### 5.3 setState 自动回退

```typescript
// EventExecutionEngine.ts

case 'setState': {
  const targetId = action.targetId ?? action.nodeId;
  const stateName = action.state ?? action.stateName;
  if (targetId && stateName && context.onSetState) {
    // 记录当前状态（用于回退）
    const previousState = context.getNodeState?.(targetId) ?? 'default';

    context.onSetState(targetId, stateName);

    // 自动回退
    const autoRevertMs = (action as { autoRevertMs?: number }).autoRevertMs;
    if (autoRevertMs && autoRevertMs > 0) {
      setTimeout(() => {
        context.onSetState!(targetId, previousState);
      }, autoRevertMs);
    }
  }
  break;
}
```

### 5.4 虚影渲染（编辑态）

```typescript
// SchemaRenderer.tsx — 编辑态下，状态隐藏的组件以虚影显示

function renderChildInEditor(
  parentNode: ComponentNode,
  childNode: ComponentNode,
): React.ReactNode {
  const parentState = parentNode.states?.find(s => s.name === parentNode.activeState);
  const isHiddenInCurrentState =
    parentState?.childrenVisibility?.[childNode.id] === false;

  if (isHiddenInCurrentState) {
    // 虚影模式：降低透明度 + 虚线边框 + 状态标签
    return (
      <div style={{ opacity: 0.25, pointerEvents: 'auto' }} data-ghost="true">
        <NodeRenderer node={childNode} ... />
        <GhostLabel
          stateNames={getVisibleStateNames(parentNode, childNode.id)}
        />
      </div>
    );
  }

  return <NodeRenderer node={childNode} ... />;
}

// 找出该子节点在哪些状态中可见
function getVisibleStateNames(parent: ComponentNode, childId: string): string[] {
  return (parent.states ?? [])
    .filter(s => s.childrenVisibility?.[childId] !== false)
    .map(s => s.name);
}
```

---

## 六、实施任务拆解

```
Phase A: childrenVisibility 渲染接入（核心能力） — 2d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  A-1. SchemaRenderer 接入 childrenVisibility (0.5d)
       • 渲染子节点前检查父节点当前状态的 childrenVisibility
       • 若 false → 编辑态以虚影显示，预览/导出不渲染
       • 保证向后兼容（无 childrenVisibility 字段时行为不变）

  A-2. PreviewRenderer 接入 childrenVisibility (0.5d)
       • 使用 runtimeNodeStates 获取父节点运行时状态
       • 同 A-1 逻辑，但完全隐藏（无虚影）

  A-3. 虚影渲染 + GhostLabel 组件 (1d)
       • 虚影样式：opacity 0.25 + dashed border + 状态标签
       • 点击虚影可选中组件
       • 双击虚影自动切换到对应状态编辑


Phase B: setState 自动回退 — 1d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  B-1. Schema 扩展 SetStateAction.autoRevertMs (0.25d)
       • types/event.ts 增加 autoRevertMs 可选字段
       • 重新 build design-schema

  B-2. EventExecutionEngine 实现自动回退 (0.5d)
       • 执行 setState 时记录 previousState
       • 设置 setTimeout 定时回退
       • 清理逻辑：组件卸载时清除定时器

  B-3. PreviewRenderer 传入 getNodeState 回调 (0.25d)
       • PreviewContext 增加 getNodeState 方法
       • 从 runtimeNodeStates 中读取当前状态


Phase C: "显示条件" 编辑 UI — 2d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  C-1. VisibilityConditionSection 组件 (1d)
       • 选中组件后在右侧面板显示"显示条件"区
       • 读取父节点的所有自定义状态
       • 单选：始终显示 / 仅在以下状态显示
       • 多选勾选具体状态名
       • 保存时修改父节点各状态的 childrenVisibility

  C-2. Operation: setChildVisibility (0.5d)
       • 新增 operation：批量更新父节点多个状态的 childrenVisibility
       • 支持 undo/redo

  C-3. 集成到 RightPanel (0.5d)
       • 在"内容"区域下方添加"显示条件"折叠区
       • 仅当组件有父节点且父节点有自定义状态时显示


Phase D: apiRequest 嵌套子链路 UI — 2d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  D-1. SubActionChainEditor 组件 (1d)
       • 可复用的子链路编辑器
       • 支持：添加子动作、删除、排序、类型切换、参数配置
       • 限制：子链路内不允许嵌套 apiRequest

  D-2. InteractionsTab 集成嵌套 UI (0.5d)
       • apiRequest 动作展开后显示 ✅成功 / ❌失败 子链路
       • 使用 SubActionChainEditor 组件

  D-3. setState autoRevert UI (0.5d)
       • setState 配置区增加"自动回退"复选框 + 时长输入
       • handleSave 序列化 autoRevertMs 字段


Phase E: 预览控制条 Mock 场景切换 — 1d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  E-1. MockScenarioSwitcher 组件 (0.5d)
       • Popover 浮层：按接口分组，场景单选切换
       • 切换时通知 MockExecutor

  E-2. 集成到预览控制条 (0.5d)
       • 预览工具栏增加"接口场景"按钮
       • 仅当页面有 apiEndpoints 时显示


Phase F: 端到端验证 + 交互反馈总览 — 1d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  F-1. 全链路验证 (0.5d)
       • 创建自定义状态 → 画 Toast → 设置 childrenVisibility
       • 配置事件链 → 预览验证 Toast 出现/消失
       • 验证 autoRevert 定时回退

  F-2. 交互反馈总览面板（可选，锦上添花） (0.5d)
       • 遍历 Screen 收集所有 childrenVisibility 相关组件
       • 展示列表：组件名 + 所属状态 + 快速定位
```

### 总工期

```
  Phase A: childrenVisibility 渲染接入      2d
  Phase B: setState 自动回退                1d
  Phase C: "显示条件" 编辑 UI               2d
  Phase D: apiRequest 嵌套子链路 UI          2d
  Phase E: 预览控制条 Mock 场景切换          1d
  Phase F: 端到端验证 + 总览面板             1d
  ─────────────────────────────────────────────
  总计                                      ~9d

  优先级排序：A → B → C → D → E → F
  MVP 最小可用：A + B + D = 5d
```

---

## 七、总结

```
回答用户的三个核心问题：

Q: Toast 怎么画？
A: 画在自定义状态里。创建"登陆成功"状态 → 在该状态的画布上
   画一个 absolute 定位的 Toast → 拥有画布的全部设计能力。
   切回"默认"状态，Toast 就看不见了（以虚影提示存在）。

Q: 有很多流程元素会不会重叠混乱？
A: 不会。每个流程元素只存在于它对应的状态里。
   默认状态下看到的是干净的画布。
   想编辑哪个流程元素，切到对应状态即可。
   这和"按钮的 hover 态有不同样式"是完全一样的心智模型。

Q: 显示条件和请求结果怎么绑定？
A: 两步走：
   1. 标记组件"仅在 XX 状态可见"（显示条件 UI）
   2. 事件链中 apiRequest → onSuccess → setState("XX")
   状态切换时，组件自然出现；状态回退时，组件自然消失。
   autoRevertMs 参数让状态 N 秒后自动回退（Toast 效果）。
```
