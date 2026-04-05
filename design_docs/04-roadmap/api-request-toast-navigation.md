# API 请求绑定 + Toast 反馈 + 页面跳转 — 技术方案与实施路线

> **一句话定位：让设计师在编辑器中完整描述"按钮点击 → 发送请求 → 根据结果展示 Toast 并跳转页面"这一真实交互链路，并在预览模式中通过 Mock 数据即时验证成功/失败两条路径。**
>
> 相关文档：
> - [09-交互与事件系统](../02-product/editor/09-interaction-bindding/README.md) — 现有事件模型
> - [10-预览与测试](../02-product/editor/10-preview-mode/README.md) — 预览执行引擎
> - [05-数据驱动系统](../02-product/editor/05-data-driven/README.md) — 数据源与场景
> - [01-第一性原理](../01-vision/first-principles.md) — 核心设计哲学

---

## 一、第一性原理分析：这个需求的本质是什么？

### 1.1 从用户故事到本质推导

```
用户故事：
  设计师完成了登录页面设计，想在预览时：
  - 点击"登录"按钮 → 发起登录请求
  - 请求失败 → 展示错误 Toast（如"用户名或密码错误"）
  - 请求成功 → 展示成功 Toast（如"登录成功"）+ 跳转到主页

这个故事的本质是什么？

  真实产品中一个按钮点击后发生的事情：
    1. 收集表单数据（输入框的值）
    2. 发起网络请求（POST /api/login, body: { username, password }）
    3. 等待响应
    4. 分支处理：
       成功 → 展示成功反馈 → 跳转
       失败 → 展示错误反馈 → 停留当前页

  当前事件系统能表达的：
    ✅ 点击触发
    ✅ 页面跳转 (navigate)
    ✅ 状态切换 (setState)
    ❌ 发起请求 (apiRequest) — 不存在
    ❌ 展示 Toast (showToast) — 不存在
    ❌ 基于请求结果分支 (条件链路) — 不存在
    ❌ 请求的定义与管理 — 不存在
    ❌ 请求的 Mock 数据管理 — 不存在
```

### 1.2 从第一性原理出发的五个关键问题

```
Q1: 请求是什么？
  请求 = 一次"与外部系统的数据交换"
  本质是：方法 + 路径 + 参数 → 响应数据
  它是交互链路中的"数据获取节点"，不是独立的系统

Q2: 请求定义应该存在哪里？
  Schema 是一切的真相 →
  请求定义应该是 Schema 的一部分 →
  它是页面级别的"接口契约" →
  存在 Screen 级别（与 DataSource 平行但职责不同）

Q3: 预览时请求怎么处理？
  预览 ≠ 真实发请求（没有后端服务）
  预览 = 基于请求定义执行 Mock
  Mock 规则 = 同一个请求路径可返回不同场景（成功/失败/超时/...）
  设计师通过切换场景来验证不同路径的 UI 表现

Q4: Toast 是什么？
  Toast 不是一个独立的 UI 组件 → 它是一个"全局反馈行为"
  与 navigate 平行 → 它是事件链中的一个 Action
  在 Schema 中声明式定义 → 导出代码时生成对应的 notification 调用

Q5: 如何表达"成功走 A 路径，失败走 B 路径"？
  当前事件链是线性的：action1 → action2 → action3
  需要扩展为带分支的：action1 → [成功: action2a, action3a] [失败: action2b]
  apiRequest 是唯一天然需要分支的 Action →
  分支应该内嵌在 apiRequest 定义中，不需要改变整体事件链模型
```

### 1.3 核心洞察

```
API 请求不是一个新的"系统"——它是事件系统的自然延伸。

  当前：click → [navigate]
  扩展：click → [apiRequest → 成功: showToast + navigate / 失败: showToast]

新增三个东西即可完整表达：
  1. ApiRequestAction — 新的事件行为类型（带内嵌的成功/失败子链路）
  2. ShowToastAction — 新的事件行为类型（轻量消息反馈）
  3. RequestDefinition — 页面级接口定义 + Mock 场景管理

它们都是对现有 Schema 和事件系统的最小增量扩展，不是独立的新系统。
```

---

## 二、产品交互逻辑设计

### 2.1 概念模型

```
三个新概念及其在现有体系中的位置：

┌─────────────────────────────────────────────────────────┐
│ Screen                                                   │
│                                                          │
│  rootNode: ComponentNode                                 │
│    └─ events[]                                           │
│         └─ actions[]                                     │
│              ├─ navigate (已有)                           │
│              ├─ setState (已有)                           │
│              ├─ showToast ← NEW                          │
│              └─ apiRequest ← NEW                         │
│                   ├─ requestId → 引用 RequestDefinition  │
│                   ├─ onSuccess: Action[] ← 成功链路      │
│                   └─ onFailure: Action[] ← 失败链路      │
│                                                          │
│  dataSources[] (已有，数据驱动系统)                        │
│                                                          │
│  apiDefinitions[] ← NEW 页面级接口定义                    │
│    ├─ RequestDefinition (方法/路径/参数/头)               │
│    └─ MockScenario[] (成功/失败/超时等场景)               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 RequestDefinition（接口定义）

```
一个 RequestDefinition 完整描述一个 API 接口：

  名称:     "用户登录"
  方法:     POST
  路径:     /api/auth/login
  请求头:   { "Content-Type": "application/json" }
  请求体:   {
              "username": "{{formData.username}}",  ← 支持数据绑定表达式
              "password": "{{formData.password}}"
            }
  响应结构: {
              "code": "number",
              "message": "string",
              "data": {
                "token": "string",
                "user": { "name": "string", "avatar": "string" }
              }
            }

设计价值：
  1. 设计稿即接口文档 — 前后端对齐的唯一来源
  2. 导出代码时直接生成 API 调用函数
  3. 预览时基于路径+方法匹配 Mock 响应
```

### 2.3 MockScenario（Mock 场景）

```
每个 RequestDefinition 可定义多个 MockScenario：

  接口: "用户登录" POST /api/auth/login

  场景 1（默认激活）:
    名称:     "登录成功"
    状态码:   200
    延迟:     800ms        ← 模拟网络延迟
    响应体:   {
                "code": 0,
                "message": "登录成功",
                "data": { "token": "mock-token-xxx", "user": { "name": "张三" } }
              }

  场景 2:
    名称:     "密码错误"
    状态码:   401
    延迟:     500ms
    响应体:   {
                "code": 10001,
                "message": "用户名或密码错误"
              }

  场景 3:
    名称:     "网络超时"
    状态码:   0 (超时)
    延迟:     5000ms
    响应体:   null

设计师在预览前/预览中切换激活场景 → 看到不同结果下的 UI 表现
```

### 2.4 事件链完整流程（登录按钮示例）

```
设计师配置的事件：

  触发器: click
  行为链:
    ① setState → 自身 → "loading"           (按钮变为加载状态)
    ② apiRequest → "用户登录"
         成功链路:
           → showToast → "success" → "{{response.message}}"
           → delay → 500ms
           → navigate → "主页" → slideLeft
         失败链路:
           → showToast → "error" → "{{response.message}}"
           → setState → 自身 → "default"    (按钮恢复正常)

预览时的执行效果（场景: 登录成功）：
  1. 点击登录 → 按钮变为 loading 状态
  2. 等待 800ms（Mock 延迟）
  3. 收到成功响应
  4. 弹出成功 Toast "登录成功"
  5. 等待 500ms
  6. 页面向左滑动跳转到"主页"

预览时的执行效果（场景: 密码错误）：
  1. 点击登录 → 按钮变为 loading 状态
  2. 等待 500ms（Mock 延迟）
  3. 收到失败响应
  4. 弹出错误 Toast "用户名或密码错误"
  5. 按钮恢复正常状态

两条路径，一套配置，通过切换 Mock 场景即可预览验证。
```

### 2.5 编辑器 UI：接口定义管理面板

```
位置：左侧面板 → 数据视图 → "接口定义" Tab（与数据源 Tab 并列）

┌──────────────────────────────────────┐
│  接口定义                             │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🌐 POST /api/auth/login      │  │
│  │  用户登录                      │  │
│  │  场景: 登录成功 ✅ ▾           │  │   ← 激活场景下拉切换
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🌐 GET /api/user/profile      │  │
│  │  获取用户信息                   │  │
│  │  场景: 正常数据 ✅ ▾           │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🌐 POST /api/user/register   │  │
│  │  用户注册                      │  │
│  │  场景: 注册成功 ✅ ▾           │  │
│  └────────────────────────────────┘  │
│                                      │
│  [+ 新建接口]                         │
│                                      │
└──────────────────────────────────────┘
```

### 2.6 编辑器 UI：接口详情编辑

```
点击某个接口卡片 → 展开详情面板 / 弹出 Overlay：

┌──────────────────────────────────────────────┐
│  编辑接口定义                         [×]     │
├──────────────────────────────────────────────┤
│                                              │
│  ── 基本信息 ──────────────────────────────  │
│                                              │
│  接口名称: [用户登录                      ]  │
│  请求方式: [POST ▾]                         │
│  请求路径: [/api/auth/login               ]  │
│                                              │
│  ── 请求头 ──────────────────────────────── │
│                                              │
│  ┌──────────────┬────────────────────────┐  │
│  │ Content-Type  │ application/json       │  │
│  │ Authorization │ Bearer {{token}}       │  │
│  │ [+ 添加请求头]                         │  │
│  └──────────────┴────────────────────────┘  │
│                                              │
│  ── 请求体 ──────────────────────────────── │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ {                                    │   │
│  │   "username": "{{formData.username}}",│   │
│  │   "password": "{{formData.password}}" │   │
│  │ }                                    │   │
│  └──────────────────────────────────────┘   │
│  ℹ️ 支持 {{}} 数据绑定表达式                  │
│                                              │
│  ── Mock 场景管理 ─────────────────────────  │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ ● 登录成功 (200)           [✅活跃] [⋮]│ │
│  │   延迟: 800ms                          │ │
│  │   { "code": 0, "message": "登录成功",  │ │
│  │     "data": { "token": "xxx" } }       │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ ○ 密码错误 (401)                  [⋮] │ │
│  │   延迟: 500ms                          │ │
│  │   { "code": 10001,                     │ │
│  │     "message": "用户名或密码错误" }     │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ ○ 网络超时                        [⋮] │ │
│  │   延迟: 5000ms    超时: true           │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [+ 添加场景]                                │
│                                              │
│                        [取消]  [保存]         │
└──────────────────────────────────────────────┘
```

### 2.7 编辑器 UI：事件行为配置（apiRequest 类型）

```
在事件配置面板中，选择行为类型 "发送请求" 时：

── 发送请求 (apiRequest) ──

  选择接口: [用户登录 POST /api/auth/login ▾]
    (列出当前页面定义的所有接口)

  ── 成功时执行 (onSuccess) ──────────
    ① → 行为类型: [展示提示 ▾]
         类型: [成功 ▾]   内容: [{{response.message}} ]
    ② → 行为类型: [延时等待 ▾]
         时长: [500] ms
    ③ → 行为类型: [跳转页面 ▾]
         目标: [主页 ▾]   动画: [向左滑入 ▾]
    [+ 添加成功行为]

  ── 失败时执行 (onFailure) ──────────
    ① → 行为类型: [展示提示 ▾]
         类型: [错误 ▾]   内容: [{{response.message}} ]
    ② → 行为类型: [切换状态 ▾]
         目标: [当前元素 ▾]   状态: [default ▾]
    [+ 添加失败行为]
```

### 2.8 编辑器 UI：Toast Action 配置

```
── 展示提示 (showToast) ──

  提示类型: [成功 ▾]
    成功 (success) / 错误 (error) / 警告 (warning) / 信息 (info)
  提示内容: [操作成功                       ]
    支持 {{}} 表达式绑定
  持续时间: [3] 秒
  位置:     [顶部居中 ▾]
    顶部居中 / 底部居中 / 顶部右侧
```

### 2.9 预览控制条的 Mock 场景切换

```
预览模式下，控制条增加 "接口场景" 按钮：

┌─────────────────────────────────────────────────────────────────────┐
│ [■ 退出] │ 📱 登录页 │ [← 后退] │ [全局状态▾] [数据集▾] [接口场景▾] │
└─────────────────────────────────────────────────────────────────────┘

点击 [接口场景▾] 弹出面板：

┌──────────────────────────────────────┐
│  接口场景切换                         │
├──────────────────────────────────────┤
│                                      │
│  🌐 用户登录 POST /api/auth/login    │
│    (●) 登录成功 ✅                   │  ← 单选切换
│    ( ) 密码错误                       │
│    ( ) 网络超时                       │
│                                      │
│  🌐 获取用户信息 GET /api/user/...    │
│    (●) 正常数据 ✅                   │
│    ( ) 空数据                         │
│                                      │
└──────────────────────────────────────┘

切换后再次触发请求 → 返回新场景的 Mock 数据。
无需退出预览即可快速验证不同接口结果。
```

### 2.10 预览中的 Toast 展示

```
预览模式下 Toast 的渲染位置与样式：

┌──────────────────────────────────────┐
│  预览控制条                           │
├──────────────────────────────────────┤
│                                      │
│        ┌──────────────────┐          │
│        │ ✅ 登录成功       │          │  ← Toast 浮层
│        └──────────────────┘          │     位于视口内顶部
│                                      │
│      ┌──────────────────────┐        │
│      │                      │        │
│      │    视口内容            │        │
│      │                      │        │
│      └──────────────────────┘        │
│                                      │
└──────────────────────────────────────┘

Toast 样式（与最终产品一致）：
  · 成功: 绿色图标 ✅ + 白色背景 + 阴影
  · 错误: 红色图标 ❌ + 白色背景 + 阴影
  · 警告: 橙色图标 ⚠️ + 白色背景 + 阴影
  · 信息: 蓝色图标 ℹ️ + 白色背景 + 阴影
  · 出现: 从顶部滑入 (200ms ease-out)
  · 消失: 向上淡出 (200ms ease-in)
  · 持续: 默认 3 秒
  · 堆叠: 多条 Toast 纵向排列，间距 8px

Toast 渲染在视口内（不是编辑器全局） → 导出代码时位置一致。
```

---

## 三、Schema 扩展设计

### 3.1 新增类型定义

```typescript
// ========== 接口定义 (Screen 级别) ==========

/** HTTP 请求方法 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 一个 API 接口的完整定义 */
interface RequestDefinition {
  id: string;
  name: string;
  description?: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown> | string;
  /** 响应数据结构描述（用于编辑器提示和 codegen） */
  responseSchema?: Record<string, unknown>;
}

/** 一个 Mock 场景 */
interface MockScenario {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  statusCode: number;
  delay: number;            // ms
  isTimeout?: boolean;
  responseBody: unknown;
}

/** 完整的接口定义 + Mock 场景 */
interface ApiEndpoint {
  definition: RequestDefinition;
  scenarios: MockScenario[];
  activeScenarioId: string;
}

// Screen 扩展
interface Screen {
  // ... 已有字段 ...
  /** 页面级 API 接口定义与 Mock */
  apiEndpoints?: ApiEndpoint[];
}
```

### 3.2 新增 EventAction 类型

```typescript
// ========== 新增事件行为 ==========

/** Toast 展示位置 */
type ToastPosition = 'top-center' | 'bottom-center' | 'top-right';

/** Toast 类型 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/** 展示 Toast 消息 */
interface ShowToastAction {
  type: 'showToast';
  toastType: ToastType;
  message: string;          // 支持 {{response.xxx}} 表达式
  duration?: number;        // ms, 默认 3000
  position?: ToastPosition; // 默认 'top-center'
}

/** 发起 API 请求（带成功/失败分支链路） */
interface ApiRequestAction {
  type: 'apiRequest';
  /** 引用 Screen.apiEndpoints[].definition.id */
  requestId: string;
  /** 请求参数覆盖（运行时动态值） */
  paramOverrides?: Record<string, string>;
  /** 请求成功时执行的行为链 */
  onSuccess: EventAction[];
  /** 请求失败时执行的行为链 */
  onFailure: EventAction[];
}

// 更新 EventAction 联合类型
type EventAction =
  | NavigateAction
  | SetStateAction
  | OpenUrlAction
  | DelayAction
  | CustomAction
  | SetDomainStateAction
  | SetEnvironmentStateAction
  | ToggleVisibleAction
  | ShowToastAction       // ← NEW
  | ApiRequestAction;     // ← NEW
```

### 3.3 Schema 示例：登录按钮的完整定义

```json
{
  "screen": {
    "id": "login-page",
    "name": "登录页",
    "apiEndpoints": [
      {
        "definition": {
          "id": "login-api",
          "name": "用户登录",
          "method": "POST",
          "path": "/api/auth/login",
          "headers": { "Content-Type": "application/json" },
          "body": {
            "username": "{{formData.username}}",
            "password": "{{formData.password}}"
          }
        },
        "scenarios": [
          {
            "id": "success",
            "name": "登录成功",
            "isActive": true,
            "statusCode": 200,
            "delay": 800,
            "responseBody": {
              "code": 0,
              "message": "登录成功",
              "data": { "token": "mock-token", "user": { "name": "张三" } }
            }
          },
          {
            "id": "wrong-password",
            "name": "密码错误",
            "isActive": false,
            "statusCode": 401,
            "delay": 500,
            "responseBody": {
              "code": 10001,
              "message": "用户名或密码错误"
            }
          }
        ],
        "activeScenarioId": "success"
      }
    ],
    "rootNode": {
      "id": "login-btn",
      "type": "button",
      "events": [
        {
          "trigger": "click",
          "actions": [
            { "type": "setState", "targetId": "login-btn", "state": "loading" },
            {
              "type": "apiRequest",
              "requestId": "login-api",
              "onSuccess": [
                { "type": "showToast", "toastType": "success", "message": "{{response.message}}" },
                { "type": "delay", "duration": 500 },
                { "type": "navigate", "targetScreenId": "home-page", "animation": { "type": "slide-left" } }
              ],
              "onFailure": [
                { "type": "showToast", "toastType": "error", "message": "{{response.message}}" },
                { "type": "setState", "targetId": "login-btn", "state": "default" }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

### 3.4 与 DataSource 的关系定义

```
DataSource（已有）vs ApiEndpoint（新增）的职责边界：

┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  DataSource (数据源)                                         │
│  ─────────────────                                           │
│  职责：管理"页面上需要什么数据"以及"数据的各种状态"           │
│                                                              │
│    static 类型：设计时手动填写的 Mock 数据                    │
│      · 不涉及请求，数据永远存在                              │
│      · 适合：静态页面、文章详情、配置项                      │
│                                                              │
│    api 类型：需要通过 API 获取的数据                          │
│      · 有 loading/loaded/empty/error 生命周期                │
│      · 关联一个 ApiEndpoint（数据来自哪个接口）               │
│      · 页面进入时自动执行请求，phases 自动流转               │
│      · 适合：用户信息、列表数据、统计数据                    │
│      → 详细方案见 02-product/editor/05-data-driven/          │
│        page-load-api-design.md                               │
│                                                              │
│  ApiEndpoint (接口定义)                                      │
│  ─────────────────────                                       │
│  职责：描述"一个 API 接口的契约"（方法/路径/参数/Mock）      │
│                                                              │
│  使用方式 1: 被 DataSource(api) 关联                         │
│    → 页面加载时自动执行，响应填充 DataSource                 │
│  使用方式 2: 被事件 action(apiRequest) 引用                  │
│    → 用户操作触发，走 onSuccess/onFailure 分支               │
│                                                              │
│  两种使用方式共享同一个接口定义和 Mock 场景。                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 四、技术实现设计

### 4.1 架构总览

```
涉及修改/新增的模块：

  features/design-schema
    ├─ types/event.ts         → 新增 ShowToastAction, ApiRequestAction
    ├─ types/screen.ts        → Screen 新增 apiEndpoints 字段
    └─ types/api.ts           → NEW: RequestDefinition, MockScenario, ApiEndpoint

  features/design-operations
    └─ operations/api.ts      → NEW: addApiEndpoint, updateApiEndpoint,
                                      removeApiEndpoint, addMockScenario, etc.

  features/design-engine
    ├─ preview/
    │   ├─ EventExecutionEngine.ts → 支持 showToast + apiRequest 两种新 Action
    │   ├─ MockExecutor.ts         → NEW: 根据激活场景返回 Mock 响应
    │   └─ ToastRenderer.tsx       → NEW: 预览内 Toast 渲染组件
    └─ preview/PreviewRenderer.tsx → 集成 ToastRenderer + MockExecutor

  apps/design_front
    ├─ views/editor/panels/
    │   └─ ApiEndpointPanel/       → NEW: 接口定义管理面板
    ├─ views/editor/PropertyPanel/
    │   └─ InteractionTab/         → 扩展: apiRequest 和 showToast 行为配置 UI
    └─ views/editor/PreviewBar/    → 扩展: Mock 场景切换控件
```

### 4.2 MockExecutor 实现

```typescript
/**
 * MockExecutor 负责在预览模式下模拟 API 请求。
 * 根据 requestId 查找 ApiEndpoint，返回当前激活场景的 Mock 数据。
 */
export class MockExecutor {
  private endpoints: Map<string, ApiEndpoint> = new Map();

  load(apiEndpoints: ApiEndpoint[]): void {
    this.endpoints.clear();
    for (const ep of apiEndpoints) {
      this.endpoints.set(ep.definition.id, ep);
    }
  }

  async execute(requestId: string): Promise<MockResponse> {
    const endpoint = this.endpoints.get(requestId);
    if (!endpoint) {
      return { success: false, status: 404, data: null, message: '接口未定义' };
    }

    const scenario = endpoint.scenarios.find(s => s.id === endpoint.activeScenarioId)
      ?? endpoint.scenarios[0];
    if (!scenario) {
      return { success: false, status: 500, data: null, message: '无可用场景' };
    }

    // 模拟网络延迟
    if (scenario.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, scenario.delay));
    }

    // 模拟超时
    if (scenario.isTimeout) {
      return { success: false, status: 0, data: null, message: '请求超时' };
    }

    const success = scenario.statusCode >= 200 && scenario.statusCode < 300;
    return {
      success,
      status: scenario.statusCode,
      data: scenario.responseBody,
      message: typeof scenario.responseBody === 'object'
        ? (scenario.responseBody as Record<string, unknown>)?.message as string ?? ''
        : '',
    };
  }

  switchScenario(requestId: string, scenarioId: string): void {
    const ep = this.endpoints.get(requestId);
    if (ep) {
      ep.activeScenarioId = scenarioId;
    }
  }
}

interface MockResponse {
  success: boolean;
  status: number;
  data: unknown;
  message: string;
}
```

### 4.3 EventExecutionEngine 扩展

```typescript
// 在 EventExecutionEngine.executeAction 中新增两个 case：

case 'showToast': {
  if (context.onShowToast) {
    const msg = this.resolveExpression(action.message, context);
    context.onShowToast(action.toastType, msg, action.duration ?? 3000, action.position);
  }
  break;
}

case 'apiRequest': {
  if (context.onApiRequest) {
    const response = await context.onApiRequest(action.requestId, action.paramOverrides);
    const branch = response.success ? action.onSuccess : action.onFailure;
    // 将 response 注入表达式上下文供子行为使用
    const childContext = { ...context, responseData: response.data };
    for (const childAction of branch ?? []) {
      if (childAction.type === 'delay') {
        await new Promise(r => setTimeout(r, Number(childAction.duration) || 0));
        continue;
      }
      this.executeAction(childAction, childContext);
    }
  }
  break;
}

// PreviewContext 扩展
interface PreviewContext {
  // ... 已有字段 ...
  onShowToast?: (type: ToastType, message: string, duration: number, position?: ToastPosition) => void;
  onApiRequest?: (requestId: string, paramOverrides?: Record<string, string>) => Promise<MockResponse>;
  /** 当前请求响应数据（在 apiRequest 的子行为中可用） */
  responseData?: unknown;
}
```

### 4.4 ToastRenderer 组件

```typescript
/**
 * 预览模式内的 Toast 渲染器。
 * 在视口内部渲染，与最终产品 Toast 位置一致。
 */
interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

export function ToastRenderer({ toasts, onDismiss }: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  // 顶部居中定位的 Toast 列表
  // 每个 Toast 自动计时消失
  // 进入/退出动画
  // 最多同时显示 3 条，多余的排队
}
```

### 4.5 代码导出映射

```typescript
// apiRequest → 导出为 async 函数
async function handleLoginClick() {
  setLoginState("loading");
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (response.ok) {
      toast.success(data.message);
      await new Promise(r => setTimeout(r, 500));
      router.push("/home");
    } else {
      toast.error(data.message);
      setLoginState("default");
    }
  } catch (error) {
    toast.error("网络错误");
    setLoginState("default");
  }
}

// showToast → 根据目标框架生成对应调用
// React:  import { toast } from 'react-hot-toast' / antd message
// Vue:    ElMessage.success(...)
```

---

## 五、与现有系统的集成点

### 5.1 Operations 接口

```typescript
// 接口定义 CRUD
executor.execute({
  type: "addApiEndpoint",
  params: { screenId, endpoint: { definition: {...}, scenarios: [...] } }
});

executor.execute({
  type: "updateApiEndpoint",
  params: { screenId, endpointId, changes: { definition: {...} } }
});

executor.execute({
  type: "removeApiEndpoint",
  params: { screenId, endpointId }
});

// Mock 场景管理
executor.execute({
  type: "addMockScenario",
  params: { screenId, endpointId, scenario: {...} }
});

executor.execute({
  type: "switchMockScenario",
  params: { screenId, endpointId, scenarioId }
});

executor.execute({
  type: "updateMockScenario",
  params: { screenId, endpointId, scenarioId, changes: {...} }
});

executor.execute({
  type: "removeMockScenario",
  params: { screenId, endpointId, scenarioId }
});
```

### 5.2 MCP 工具扩展

```typescript
// 为 AI 提供的 MCP 工具
addApiEndpoint     → AI 可以定义接口
updateApiEndpoint  → AI 可以修改接口
addMockScenario    → AI 可以添加 Mock 场景
switchMockScenario → AI 可以切换当前场景
bindApiRequest     → AI 可以将接口绑定到按钮事件
addToastAction     → AI 可以在事件链中添加 Toast
```

### 5.3 与 DataSource 的表达式共享

```
apiRequest 的响应数据可通过 {{response.xxx}} 在后续行为中使用：

  表达式上下文层级：
  ┌─────────────────────────────────────────────┐
  │ {{data.xxx}}      → DataSource 数据         │  (已有)
  │ {{formData.xxx}}  → 表单输入值               │  (新增，远期)
  │ {{response.xxx}}  → API 响应数据             │  (新增)
  │ {{globalState.xxx}} → 全局状态变量           │  (已有)
  └─────────────────────────────────────────────┘

  "{{response.message}}" → 从 Mock 响应中取 message 字段
  "{{response.data.user.name}}" → 从 Mock 响应中取嵌套字段

  resolveExpression 需要扩展支持 response 命名空间。
```

---

## 六、边界情况与异常处理

| 场景 | 预期行为 |
|------|---------|
| apiRequest 引用的接口 ID 不存在 | 事件卡片显示 ⚠️ "接口不存在"；预览时跳过该 action |
| 接口无任何 Mock 场景 | 事件卡片显示 ⚠️ "无 Mock 场景"；预览时返回 500 |
| Mock 延迟极长（> 10s） | 预览中显示 loading 指示器；超时后走 onFailure |
| onSuccess / onFailure 为空数组 | 静默完成，不执行后续行为 |
| apiRequest 嵌套 apiRequest | 允许（如：登录成功后获取用户信息）；最大嵌套深度 3 层 |
| 表达式 `{{response.xxx}}` 取值为 undefined | 解析为空字符串，Toast 显示空内容 |
| 多个 Toast 同时触发 | 纵向堆叠显示，先进先出，最多 3 条可见 |
| 快速连续点击按钮 | apiRequest 行为加 debounce 300ms，避免重复请求 |
| 预览中删除/修改了接口定义 | 不可能——预览模式不产生 Operation |
| 接口被事件引用后被删除 | 编辑模式下事件卡片显示警告；删除确认时提示"有 N 个事件引用" |

---

## 七、核心设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 请求定义存在哪里？ | Screen.apiEndpoints[]（页面级） | 接口是页面交互的一部分；不同页面可能有不同接口；全局接口可通过共享/引用解决 |
| 是否复用 custom Action？ | 否，新增 apiRequest 类型 | custom 是万能但无结构的；apiRequest 有明确的语义、可编辑的 UI、可导出的代码 |
| 分支逻辑放在哪？ | 内嵌在 apiRequest 的 onSuccess/onFailure | 避免改变整体事件链的线性模型；分支只在 apiRequest 这一种场景下需要 |
| Toast 是组件还是 Action？ | Action（showToast） | Toast 是"做一件事"不是"放一个元素"；它是事件链中的一步，不是 UI 树的一个节点 |
| 预览时发真实请求吗？ | 否，纯 Mock | 无后端依赖、结果可控、场景可切换；设计阶段关注的是"如果请求成功/失败 UI 怎么表现" |
| Mock 延迟有必要吗？ | 有 | 延迟让设计师看到 loading 状态的真实效果；验证 loading 动画和交互体验 |
| 表单数据如何传给请求？ | {{formData.xxx}} 表达式（远期） | MVP 阶段请求参数静态定义即可；表单绑定是后续增强 |
| 响应数据如何传给后续行为？ | {{response.xxx}} 表达式注入 | 最小改动：在 apiRequest 子行为的表达式上下文中注入 response 对象 |

---

## 八、实施路线图（Roadmap）

### Phase 1：Schema 基础 + Toast Action（预计 1 周）

**目标**：完成类型定义 + Toast 行为的全链路（Schema → Engine → 预览 → 编辑 UI）

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 1.1 | 定义 `ShowToastAction` 类型 | design-schema | `types/event.ts` 新增 `showToast` 到联合类型 | 0.5h |
| 1.2 | 定义 `ApiRequestAction` 类型 | design-schema | `types/event.ts` 新增 `apiRequest`（含 onSuccess/onFailure） | 0.5h |
| 1.3 | 定义 `RequestDefinition` / `MockScenario` / `ApiEndpoint` 类型 | design-schema | 新建 `types/api.ts`，`Screen` 类型添加 `apiEndpoints` 可选字段 | 1h |
| 1.4 | Engine: `showToast` action 执行 | design-engine | `EventExecutionEngine.ts` 新增 `showToast` case + `PreviewContext.onShowToast` | 1h |
| 1.5 | 实现 `ToastRenderer` 组件 | design-engine | `preview/ToastRenderer.tsx`：Toast 列表 + 动画 + 自动消失 | 3h |
| 1.6 | `PreviewRenderer` 集成 Toast | design-engine | `PreviewInteractiveShell` 持有 Toast state + 传入 ToastRenderer | 1h |
| 1.7 | 事件编辑 UI: showToast 行为配置 | design_front | `InteractionTab` 中 showToast 的类型/内容/时长配置表单 | 2h |
| 1.8 | Operations: addEvent 支持新 action 类型 | design-operations | 确保现有 addEvent/updateEvent 兼容新 action 类型（无需额外改动，类型扩展即可） | 0.5h |

**Phase 1 交付物**：设计师可以给按钮绑定 `click → showToast("success", "操作成功")`，预览时点击按钮可看到 Toast 弹出。

---

### Phase 2：接口定义 + Mock 系统（预计 1.5 周）

**目标**：完成接口定义的全链路管理 + Mock 执行

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 2.1 | 实现 `MockExecutor` | design-engine | `preview/MockExecutor.ts`：加载 apiEndpoints、按场景返回数据、模拟延迟 | 3h |
| 2.2 | Engine: `apiRequest` action 执行 | design-engine | `EventExecutionEngine.ts` 新增 `apiRequest` case：调用 MockExecutor → 分支执行 | 3h |
| 2.3 | 表达式系统: `response` 命名空间 | design-engine | `resolveExpression.ts` 扩展支持 `{{response.xxx}}` 在 action 子链路中 | 2h |
| 2.4 | `PreviewRenderer` 集成 MockExecutor | design-engine | `PreviewInteractiveShell` 初始化 MockExecutor + 传入 PreviewContext | 1.5h |
| 2.5 | Operations: apiEndpoint CRUD | design-operations | `operations/api.ts`：add/update/remove ApiEndpoint 和 MockScenario | 4h |
| 2.6 | 左侧面板: 接口定义列表 | design_front | `ApiEndpointPanel/` 接口卡片列表 + 新建/删除 | 4h |
| 2.7 | 接口详情编辑 Overlay | design_front | 方法/路径/请求头/请求体表单 + JSON 编辑器 | 6h |
| 2.8 | Mock 场景管理 UI | design_front | 场景列表 + 新增/编辑/切换/删除 + 响应体 JSON 编辑 | 4h |

**Phase 2 交付物**：设计师可以定义接口（如 POST /api/login）、配置多个 Mock 场景，预览时 apiRequest 根据激活场景返回 Mock 数据。

---

### Phase 3：完整交互链路 + 事件编辑 UI（预计 1 周）

**目标**：apiRequest 的事件配置 UI + 预览控制条场景切换 + 端到端完整体验

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 3.1 | 事件编辑 UI: apiRequest 行为配置 | design_front | 选择接口 + 成功/失败子链路配置（嵌套 action 列表） | 6h |
| 3.2 | 预览控制条: 接口场景切换 | design_front | PreviewBar 新增 [接口场景▾] 按钮 + 场景切换面板 | 3h |
| 3.3 | 接口引用检查 | design-operations | 删除接口时检查事件引用 + 事件卡片无效接口警告 | 2h |
| 3.4 | apiRequest 嵌套支持 | design-engine | 支持 onSuccess 中嵌套另一个 apiRequest（最大深度 3） | 1.5h |
| 3.5 | debounce 防重复触发 | design-engine | apiRequest 执行时自动 debounce 300ms | 0.5h |
| 3.6 | 端到端测试 | 全链路 | 登录流程完整测试：定义接口 → 绑定事件 → 预览 → 切换场景 → 验证 Toast + 跳转 | 3h |

**Phase 3 交付物**：完整的"登录按钮点击 → 发请求 → 成功 Toast + 跳转 / 失败 Toast + 恢复"预览体验。

---

### Phase 4：增强与打磨（预计 1 周）

**目标**：表单数据绑定、MCP 工具、代码导出、体验优化

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 4.1 | `{{formData.xxx}}` 表达式支持 | design-engine | 预览中收集 input 元素 value 作为 formData 上下文 | 4h |
| 4.2 | MCP 工具: 接口定义 + Mock | design-mcp | addApiEndpoint / addMockScenario / switchMockScenario 等 | 3h |
| 4.3 | 代码导出: apiRequest → fetch 代码 | design-codegen | apiRequest 导出为 async function + try/catch + toast 调用 | 4h |
| 4.4 | 代码导出: showToast → 框架 toast | design-codegen | showToast 导出为 antd message / react-hot-toast 等 | 2h |
| 4.5 | 接口复用: 跨页面引用 | design-schema | 项目级 apiEndpoints 定义 + 页面引用，避免重复定义 | 3h |
| 4.6 | Toast 样式主题 | design-engine | Toast 支持跟随项目主题（配色、圆角、字体） | 2h |
| 4.7 | 请求 loading 指示器 | design-engine | apiRequest 执行期间视口内显示加载条/蒙层 | 2h |

---

### 里程碑总览

```
Phase 1 (W1)     Phase 2 (W2-W3)      Phase 3 (W4)        Phase 4 (W5)
   │                  │                    │                   │
   ▼                  ▼                    ▼                   ▼
┌────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Toast  │    │ 接口定义     │    │ 完整链路     │    │ 增强打磨     │
│ Action │───→│ + Mock 系统  │───→│ + 事件 UI    │───→│ + Codegen    │
│ 可预览 │    │ 可执行       │    │ 可配置       │    │ 可导出       │
└────────┘    └──────────────┘    └──────────────┘    └──────────────┘

每个 Phase 交付后都是可独立使用的增量价值。
```

---

## 九、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 事件链嵌套复杂度导致编辑 UI 难用 | 中 | apiRequest 的子链路用折叠面板简化；限制嵌套深度为 3 |
| Mock JSON 编辑体验差 | 低 | 集成 Monaco Editor / CodeMirror 做 JSON 编辑；支持 JSON Schema 校验 |
| 表达式 `{{response.xxx}}` 与 `{{data.xxx}}` 冲突 | 低 | 命名空间隔离：response 只在 apiRequest 子行为上下文中可用 |
| 接口定义过多导致左侧面板拥挤 | 低 | 支持搜索/折叠/分组；远期支持项目级接口库 |
| 与真实后端联调时 Mock 数据不准确 | 中 | 远期支持从 Swagger/OpenAPI 导入接口定义 + 响应示例 |

---

## 附录：与当前 `custom` Action 的关系

```
当前 custom action：
  { type: "custom", handler: "loginSubmit" }
  → window.dispatchEvent(new CustomEvent("design-custom-action", { detail: { handler: "loginSubmit" } }))

这是一个"逃生舱"——万能但无结构。

apiRequest 不应该用 custom 实现，因为：
  1. custom 没有请求元信息（方法/路径/头/体）→ 无法导出代码
  2. custom 没有 Mock 机制 → 预览无法验证
  3. custom 没有成功/失败分支 → 无法描述完整交互链路
  4. custom 的 handler 是自由字符串 → 编辑器无法提供结构化配置 UI

apiRequest 是对 custom 在"请求"这一细分领域的结构化替代。
custom 仍保留作为真正无法用已有行为类型表达的"高级逃生舱"。
```
