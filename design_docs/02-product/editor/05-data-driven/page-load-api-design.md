# 页面加载时自动请求 API — 产品方案设计

> **需求**：进入主页后自动调用接口获取用户信息，数据返回后渲染到 UI 上；加载中显示骨架屏/loading，失败显示错误提示。
>
> **本质问题**：之前的 API 请求都由用户操作（点击按钮）触发，现在需要支持"页面进入时自动触发"的请求。这是一个全新的触发时机。
>
> 相关文档：
> - [05-数据驱动系统](./README.md) — DataSource 与数据绑定
> - [API 请求绑定 + Toast + 跳转](../../../04-roadmap/api-request-toast-navigation.md) — ApiEndpoint 技术方案
> - [09-交互与事件系统](../09-interaction-bindding/README.md) — 事件模型
> - [04-状态管理系统](../04-state-system/README.md) — 页面状态
> - [10-预览与测试](../10-preview-mode/README.md) — 预览执行
> - [第一性原理](../../../01-vision/first-principles.md) — 核心设计哲学

---

## 一、第一性原理分析

### 1.1 从两种场景对比推导

```
场景 A（已实现）：点击登录按钮 → 发送登录请求 → 根据结果反馈
场景 B（本需求）：进入主页 → 自动获取用户信息 → 渲染到页面上

A 和 B 的本质区别是什么？

  ┌───────────────────────────────┬──────────────────────────────────┐
  │  场景 A: 交互触发的请求        │  场景 B: 页面加载触发的请求        │
  ├───────────────────────────────┼──────────────────────────────────┤
  │ 触发时机: 用户操作（click）     │ 触发时机: 页面进入（onMount）     │
  │ 请求目的: 执行动作（登录）      │ 请求目的: 获取数据（用户信息）    │
  │ 响应处理: 反馈+跳转（Toast）    │ 响应处理: 填充 UI（数据绑定）    │
  │ 失败时: Toast 提示，留在原页    │ 失败时: 显示错误页/重试按钮     │
  │ 数据去向: 仅 action 链内使用    │ 数据去向: 驱动整个页面渲染       │
  │ 载体: ApiEndpoint（事件系统）   │ 载体: ？                        │
  └───────────────────────────────┴──────────────────────────────────┘

关键洞察：
  场景 B 的本质不是"事件系统的扩展"，而是"数据驱动系统的扩展"。
  因为响应数据要填充到整个页面的 UI 上——这正是 DataSource 的职责。
```

### 1.2 回到 DataSource 的本质

```
DataSource 当前的两种 lifecycle：

  static（静态）:
    · 数据在设计时手动填写（JSON 编辑器）
    · 不涉及请求，数据永远存在
    · 切换场景 = 切换不同的 Mock JSON

  api（API）:
    · 已有 phases: loading → loaded → empty → error
    · 已有 scenarios: 多套 Mock 数据
    · 已有 switchDataSourcePhase: 可以手动切换阶段
    · 但！目前 API 类型只是"声明"，没有真正绑定请求

  缺失的一环：
    api 类型的 DataSource 知道自己有 loading/loaded/error 等阶段，
    但不知道"请求是什么"——没有关联到具体的 ApiEndpoint。

  补上这一环后：
    DataSource(api) + ApiEndpoint = 完整的"页面进入时自动请求"能力
    · DataSource 负责：数据是什么、数据怎么渲染、数据有哪些阶段
    · ApiEndpoint 负责：请求是什么、Mock 返回什么
    · 两者关联后：页面进入 → 自动执行请求 → 响应数据填充 DataSource → UI 更新
```

### 1.3 核心洞察

```
"页面加载时自动请求"不需要发明新系统——
它是 DataSource(api) 和 ApiEndpoint 两个已有概念的"连接"。

  当前状态：
    DataSource(api) ←──── 有 phases，无请求绑定
    ApiEndpoint     ←──── 有请求定义，只被 event action 引用

  目标状态：
    DataSource(api) ───关联──→ ApiEndpoint
        │                         │
        │                         │
        ▼                         ▼
    页面进入时自动执行       Mock 数据填充到 DataSource
    phases 自动流转          响应数据 = DataSource.data

新增的东西（最小增量）：
  1. DataSource 新增 apiEndpointId 字段 — 关联哪个接口
  2. 预览引擎新增"页面进入时自动执行关联请求"逻辑
  3. 响应数据自动写入 DataSource 的当前数据 — UI 通过 {{data.xxx}} 渲染

不需要：
  · 新的 EventTrigger（不用 "onMount"）
  · 新的 Action 类型
  · 新的数据流机制
  · 新的 Schema 概念
```

---

## 二、产品概念模型

### 2.1 DataSource(api) + ApiEndpoint 的完整关系

```
┌──────────────────────────────────────────────────────────────────┐
│  Screen "主页"                                                    │
│                                                                  │
│  dataSources:                                                    │
│    ┌──────────────────────────────────────────────────────┐      │
│    │  DataSource "用户信息"                                │      │
│    │  lifecycle: "api"                                    │      │
│    │  apiEndpointId: "get-user-info"  ← NEW: 关联请求     │      │
│    │                                                      │      │
│    │  phases:   loading → loaded → empty → error          │      │
│    │  activePhase: "loaded"                               │      │
│    │                                                      │      │
│    │  scenarios:                                          │      │
│    │    ┌─ "正常数据": { user: { name:"张三", ... } }     │      │
│    │    ├─ "新用户":   { user: { name:"", tasks:[] } }   │      │
│    │    └─ "VIP用户":  { user: { name:"王五", vip:true } }│      │
│    └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  apiEndpoints:                                                   │
│    ┌──────────────────────────────────────────────────────┐      │
│    │  ApiEndpoint "获取用户信息"                           │      │
│    │  definition:                                         │      │
│    │    id: "get-user-info"                               │      │
│    │    method: GET                                       │      │
│    │    path: /api/user/profile                           │      │
│    │                                                      │      │
│    │  scenarios:                                          │      │
│    │    ┌─ "成功": { status:200, body:{ user:... } }     │      │
│    │    └─ "未认证": { status:401, body:{ msg:"..." } }  │      │
│    └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  rootNode:                                                       │
│    <h1>欢迎, {{data.用户信息.user.name}}</h1>                     │
│    <span>任务数: {{data.用户信息.user.taskCount}}</span>           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 页面加载时的自动请求流程

```
预览模式下进入"主页"：

  ┌──────────────────────────────────────────────────────────┐
  │  Step 1: 扫描页面的所有 DataSource                        │
  │                                                          │
  │  找到 DataSource "用户信息"                               │
  │    lifecycle: "api"                                      │
  │    apiEndpointId: "get-user-info"                        │
  │                                                          │
  │  → 需要自动执行请求                                       │
  └────────────────────┬─────────────────────────────────────┘
                       ▼
  ┌──────────────────────────────────────────────────────────┐
  │  Step 2: 切换到 loading 阶段                              │
  │                                                          │
  │  DataSource.activePhase = "loading"                      │
  │  UI 渲染：骨架屏 / 加载动画 / loading 指示器              │
  │  （设计师在 "loading" 阶段的画布上已设计好 loading UI）    │
  └────────────────────┬─────────────────────────────────────┘
                       ▼
  ┌──────────────────────────────────────────────────────────┐
  │  Step 3: 执行 Mock 请求                                   │
  │                                                          │
  │  MockExecutor.execute("get-user-info")                   │
  │  → 等待 Mock 延迟（如 800ms）                             │
  │  → 返回当前激活场景的响应数据                              │
  └────────────────────┬─────────────────────────────────────┘
                       ▼
  ┌──────────────────────────────────────────────────────────┐
  │  Step 4: 根据响应结果切换阶段 + 填充数据                   │
  │                                                          │
  │  成功 (2xx):                                             │
  │    DataSource.activePhase = "loaded"                     │
  │    DataSource 当前场景的 data = 响应数据                   │
  │    UI 渲染：用真实数据填充（{{data.xxx}} 解析）            │
  │                                                          │
  │  成功但数据为空:                                          │
  │    DataSource.activePhase = "empty"                      │
  │    UI 渲染：空状态占位图                                   │
  │                                                          │
  │  失败 (非 2xx / 超时):                                    │
  │    DataSource.activePhase = "error"                      │
  │    UI 渲染：错误提示 + 重试按钮                            │
  │                                                          │
  └──────────────────────────────────────────────────────────┘
```

### 2.3 与已有 DataSource phases 的完美对应

```
DataSource(api) 的 phases 设计时就考虑了这个场景！

  API_DATA_SOURCE_PHASES = [
    { name: 'loading', label: '加载中' },
    { name: 'loaded',  label: '已加载' },
    { name: 'empty',   label: '无数据' },
    { name: 'error',   label: '加载失败' },
  ]

这些 phases 之前需要手动切换（switchDataSourcePhase）来预览不同阶段的 UI。

现在有了 apiEndpointId 关联后：
  · 手动切换仍然有效（编辑模式下设计各阶段的 UI）
  · 预览模式下自动流转（loading → loaded/empty/error）
  · 两种方式互补：
    设计时 → 手动切 phase → 画每个阶段的 UI
    预览时 → 自动执行请求 → phases 自动流转 → 验证真实效果
```

---

## 三、设计师操作流程

### 3.1 完整流程（以主页获取用户信息为例）

```
━━━ 步骤 1: 创建 API 类型的 DataSource ━━━━━━━━━━━━━━━

  左侧面板 → 数据视图 → [+ 新建数据源]
  名称: "用户信息"
  类型: API（选择后自动生成 loading/loaded/empty/error 四个阶段）

  创建后，在数据源配置中：
    添加场景 "正常数据":
    {
      "user": {
        "name": "张三",
        "avatar": "https://example.com/avatar.jpg",
        "taskCount": 5,
        "vip": false
      }
    }

    添加场景 "空数据":
    {
      "user": null
    }


━━━ 步骤 2: 关联 API 接口 ━━━━━━━━━━━━━━━━━━━━━━━━━

  在数据源配置面板中，新增"关联接口"区域：

  ┌──────────────────────────────────────┐
  │  数据源: 用户信息 (API)               │
  ├──────────────────────────────────────┤
  │                                      │
  │  关联接口: [获取用户信息 ▾]           │  ← NEW
  │    GET /api/user/profile             │
  │    [新建接口...]                      │
  │                                      │
  │  加载时机: [页面进入时自动加载 ▾]     │  ← NEW
  │    · 页面进入时自动加载（默认）       │
  │    · 手动触发（需要通过事件触发）      │
  │                                      │
  └──────────────────────────────────────┘

  如果还没有接口，可以直接新建：
    名称: "获取用户信息"
    方法: GET
    路径: /api/user/profile
    Mock 场景:
      成功: { status: 200, body: { user: { name: "张三", ... } } }
      未认证: { status: 401, body: { msg: "请先登录" } }


━━━ 步骤 3: 设计各阶段的 UI ━━━━━━━━━━━━━━━━━━━━━━━

  顶部控制条切换数据源阶段：

  [用户信息 ▾]  [loaded ▾]  [正常数据 ▾]
                  ↑ 切换 phase 设计不同阶段的 UI

  Phase: loading
  ┌──────────────────────────┐
  │  ┌────────────────────┐  │
  │  │  ████  ████████    │  │  ← 骨架屏
  │  │  ████████████████  │  │
  │  │  ████  ████        │  │
  │  └────────────────────┘  │
  └──────────────────────────┘

  Phase: loaded
  ┌──────────────────────────┐
  │  [头像]  张三             │  ← {{data.用户信息.user.name}}
  │  任务数: 5               │  ← {{data.用户信息.user.taskCount}}
  │  ┌──── 任务列表 ────┐    │
  │  │  任务1  任务2 ... │    │
  │  └──────────────────┘    │
  └──────────────────────────┘

  Phase: empty
  ┌──────────────────────────┐
  │                          │
  │    🕳️  暂无数据          │  ← 空状态插图
  │    请先完善个人资料       │
  │                          │
  └──────────────────────────┘

  Phase: error
  ┌──────────────────────────┐
  │                          │
  │    ⚠️  加载失败           │  ← 错误提示
  │    网络异常，请稍后重试   │
  │    [重试]                │  ← 重试按钮（点击重新请求）
  │                          │
  └──────────────────────────┘


━━━ 步骤 4: 数据绑定 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  选中文本元素 → 属性面板 → 绑定数据:
    用户名: {{data.用户信息.user.name}}
    头像:   {{data.用户信息.user.avatar}}
    任务数: {{data.用户信息.user.taskCount}}


━━━ 步骤 5: 预览验证 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  进入预览模式 → 从登录页跳转到主页

  观察效果：
  1. 进入主页瞬间 → 骨架屏 (loading phase)
  2. 800ms 后 Mock 返回 → 骨架屏消失，数据填充 (loaded phase)
  3. 看到 "张三"、头像、任务数等信息

  切换 Mock 场景到 "未认证":
  1. 重新进入主页
  2. 骨架屏
  3. 请求失败 → 错误提示页 (error phase)
```

### 3.2 Phase 切换与状态系统的关系

```
DataSource 的 phase 切换如何影响 UI？

两种方案（可共存）：

方案 A: Phase 绑定领域态变量（自动桥接）
─────────────────────────────────────────

  创建 api 类型的 DataSource 时，系统自动创建一个同名的领域态变量：

    domainState: {
      name: "用户信息_phase",
      values: ["loading", "loaded", "empty", "error"],
      defaultValue: "loading"
    }

  phase 切换时自动更新此领域态变量。
  设计师通过领域态绑定来控制不同 phase 下的 UI 可见性：
    骨架屏组件 → visibleWhen: 用户信息_phase == "loading"
    数据内容  → visibleWhen: 用户信息_phase == "loaded"
    空状态    → visibleWhen: 用户信息_phase == "empty"
    错误提示  → visibleWhen: 用户信息_phase == "error"

  优点：完全复用现有的领域态/条件可见性系统
  缺点：需要手动给每个组件绑条件


方案 B: Phase 绑定 Root 自定义状态（状态即视图）
──────────────────────────────────────────────────

  与 Toast 方案相同的模式：
    Root 的自定义状态: "用户信息-loading" / "用户信息-loaded" / "用户信息-error"
    
    childrenVisibility:
      "用户信息-loading" 态: 骨架屏可见, 内容隐藏
      "用户信息-loaded" 态:  骨架屏隐藏, 内容可见
      "用户信息-error" 态:   骨架屏隐藏, 内容隐藏, 错误提示可见

  优点：与 Toast 方案一致的心智模型
  缺点：一个页面有多个 DataSource 时，Root 的状态可能爆炸


推荐：方案 A（领域态自动桥接）
─────────────────────────────

  理由：
  1. 多个 DataSource 可以独立管理各自的 phase
  2. 不污染 Root 的状态列表
  3. 与数据驱动系统的设计哲学一致（数据驱动 UI，不是状态驱动 UI）
  4. 已有的领域态/条件可见性/domainStateBinding 可以完美支撑
```

---

## 四、Schema 扩展设计

### 4.1 DataSource 新增字段

```typescript
interface DataSource {
  // ... 已有字段 ...
  
  /** 关联的 API 接口 ID（仅 lifecycle: "api" 时有意义） */
  apiEndpointId?: string;
  
  /** 加载时机 */
  loadTiming?: 'onMount' | 'manual';
  // onMount: 页面进入时自动加载（默认）
  // manual: 需要通过事件手动触发加载
  
  /** 判空逻辑：响应数据满足什么条件时切换到 "empty" phase */
  emptyCondition?: {
    type: 'null' | 'emptyArray' | 'custom';
    path?: string;    // 检查的字段路径，如 "user" 或 "list"
  };
}
```

### 4.2 自动桥接的领域态变量

```typescript
// 当 DataSource.lifecycle === 'api' 时，系统自动维护：

domainState: {
  name: `${dataSource.name}_phase`,    // 如 "用户信息_phase"
  ownerType: 'screen',
  ownerId: screenId,
  values: [
    { value: 'loading', label: '加载中' },
    { value: 'loaded',  label: '已加载' },
    { value: 'empty',   label: '无数据' },
    { value: 'error',   label: '加载失败' },
  ],
  defaultValue: 'loading',
}

// 这个领域态变量与 DataSource.activePhase 双向同步：
//   切换 phase → 自动更新领域态变量
//   切换领域态变量 → 自动更新 phase（编辑模式下）
```

### 4.3 完整 Schema 示例

```json
{
  "screen": {
    "id": "home-page",
    "name": "主页",
    "dataSources": [
      {
        "id": "ds-user-info",
        "name": "用户信息",
        "lifecycle": "api",
        "apiEndpointId": "get-user-info",
        "loadTiming": "onMount",
        "emptyCondition": { "type": "null", "path": "user" },
        "phases": [
          { "name": "loading", "label": "加载中" },
          { "name": "loaded", "label": "已加载" },
          { "name": "empty", "label": "无数据" },
          { "name": "error", "label": "加载失败" }
        ],
        "activePhase": "loaded",
        "scenarios": [
          {
            "id": "normal",
            "name": "正常数据",
            "isDefault": true,
            "data": {
              "user": {
                "name": "张三",
                "avatar": "https://example.com/avatar.jpg",
                "taskCount": 5
              }
            }
          },
          {
            "id": "empty-user",
            "name": "空数据",
            "data": { "user": null }
          }
        ],
        "activeScenarioId": "normal"
      }
    ],
    "apiEndpoints": [
      {
        "definition": {
          "id": "get-user-info",
          "name": "获取用户信息",
          "method": "GET",
          "path": "/api/user/profile"
        },
        "scenarios": [
          {
            "id": "success",
            "name": "成功",
            "statusCode": 200,
            "delay": 800,
            "responseBody": {
              "user": {
                "name": "张三",
                "avatar": "https://example.com/avatar.jpg",
                "taskCount": 5
              }
            }
          },
          {
            "id": "unauthorized",
            "name": "未认证",
            "statusCode": 401,
            "delay": 300,
            "responseBody": { "msg": "请先登录" }
          }
        ],
        "activeScenarioId": "success"
      }
    ],
    "domainStates": [
      {
        "name": "用户信息_phase",
        "ownerType": "screen",
        "values": [
          { "value": "loading", "label": "加载中" },
          { "value": "loaded", "label": "已加载" },
          { "value": "empty", "label": "无数据" },
          { "value": "error", "label": "加载失败" }
        ],
        "defaultValue": "loading"
      }
    ]
  }
}
```

---

## 五、预览引擎实现

### 5.1 页面进入时的自动请求逻辑

```typescript
/**
 * 预览模式下，页面进入时扫描并自动执行 API DataSource 的请求。
 * 在 PreviewInteractiveShell 中调用。
 */
async function executePageLoadRequests(
  screen: Screen,
  mockExecutor: MockExecutor,
  context: PreviewContext,
): Promise<void> {
  const apiDataSources = screen.dataSources.filter(
    ds => ds.lifecycle === 'api'
      && ds.apiEndpointId
      && ds.loadTiming !== 'manual'  // 排除手动触发的
  );

  // 并行执行所有页面加载请求
  await Promise.all(apiDataSources.map(async (ds) => {
    // Step 1: 切换到 loading phase
    context.setDataSourcePhase(ds.id, 'loading');
    // 同步更新领域态变量
    context.setDomainStatePreview(`${ds.name}_phase`, 'loading');

    // Step 2: 执行 Mock 请求
    const response = await mockExecutor.execute(ds.apiEndpointId!);

    // Step 3: 根据结果切换 phase + 填充数据
    if (response.success) {
      // 检查是否为空数据
      const isEmpty = checkEmpty(response.data, ds.emptyCondition);
      if (isEmpty) {
        context.setDataSourcePhase(ds.id, 'empty');
        context.setDomainStatePreview(`${ds.name}_phase`, 'empty');
      } else {
        // 将响应数据填充为 DataSource 的当前数据
        context.updateDataSourceData(ds.id, response.data);
        context.setDataSourcePhase(ds.id, 'loaded');
        context.setDomainStatePreview(`${ds.name}_phase`, 'loaded');
      }
    } else {
      context.setDataSourcePhase(ds.id, 'error');
      context.setDomainStatePreview(`${ds.name}_phase`, 'error');
    }
  }));
}

function checkEmpty(
  data: unknown,
  condition?: DataSource['emptyCondition'],
): boolean {
  if (!condition) return data == null;
  
  switch (condition.type) {
    case 'null':
      return getNestedValue(data, condition.path ?? '') == null;
    case 'emptyArray':
      const val = getNestedValue(data, condition.path ?? '');
      return Array.isArray(val) && val.length === 0;
    case 'custom':
      return data == null;
    default:
      return data == null;
  }
}
```

### 5.2 页面跳转时触发

```typescript
// PreviewInteractiveShell.tsx

// 当预览模式下页面跳转（navigate action）完成后：
async function onScreenNavigated(newScreenId: string) {
  const screen = getScreen(newScreenId);
  
  // 注册 DOM 事件（已有逻辑）
  eventEngine.reactivate(screen);
  
  // 执行页面加载请求（新增）
  await executePageLoadRequests(screen, mockExecutor, previewContext);
}

// 预览模式首次进入时也触发：
async function onPreviewEnter(screenId: string) {
  const screen = getScreen(screenId);
  await executePageLoadRequests(screen, mockExecutor, previewContext);
}
```

### 5.3 重试按钮的实现

```
错误页面上的"重试"按钮：

  设计师在 error phase 的画布上画一个按钮
  给按钮绑定事件：
    trigger: click
    actions:
      - type: "reloadDataSource"         ← NEW action type
        dataSourceId: "ds-user-info"

  reloadDataSource action 的执行：
    1. 重新走一遍 loading → 请求 → loaded/error 流程
    2. 等于"重新进入页面"时的数据加载逻辑
```

---

## 六、编辑器 UI 设计

### 6.1 DataSource 配置面板扩展

```
API 类型 DataSource 的配置面板：

┌──────────────────────────────────────────┐
│  数据源: 用户信息                   [API] │
├──────────────────────────────────────────┤
│                                          │
│  ── 关联接口 ─────────────────────────  │
│                                          │
│  接口: [获取用户信息 GET /api/user/... ▾]│
│    (从当前页面的 apiEndpoints 中选择)    │
│    [+ 新建接口...]                       │
│                                          │
│  加载时机: [● 页面进入时  ○ 手动触发]    │
│                                          │
│  判空条件: [字段为 null ▾] 路径: [user]  │
│    · 字段为 null                         │
│    · 数组为空                            │
│    · 自定义                              │
│                                          │
│  ── 阶段预览 ─────────────────────────  │
│                                          │
│  [loading ✓] [loaded ✓] [empty ✓] [error ✓] │
│   当前: loaded                           │
│                                          │
│  ── 数据场景 ─────────────────────────  │
│                                          │
│  ● 正常数据 (默认)                       │
│  ○ 空数据                                │
│  [+ 添加场景]                            │
│                                          │
│  ── JSON 编辑器 ──────────────────────  │
│  { "user": { "name": "张三", ... } }    │
│                                          │
└──────────────────────────────────────────┘
```

### 6.2 顶部控制条的阶段切换

```
编辑模式下，顶部控制条显示 API DataSource 的阶段切换：

┌──────────────────────────────────────────────────────────┐
│  登录页 ▾  │  用户信息 [loaded ▾]  [正常数据 ▾]          │
│            │           ↑ phase 切换   ↑ scenario 切换   │
└──────────────────────────────────────────────────────────┘

切换 phase → 画布重渲染 → 设计师看到对应阶段的 UI
切换 scenario → 数据变化 → 设计师看到不同数据下的 UI
```

---

## 七、与现有系统的对比与集成

### 7.1 DataSource 与 ApiEndpoint 的职责重新定义

```
修正后的职责边界：

┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  DataSource（数据源）                                             │
│  ───────────────────                                             │
│  职责：管理"页面上需要什么数据"以及"数据的各种状态"               │
│                                                                  │
│    static 类型：设计时手动填写的 Mock 数据                        │
│      · 不涉及请求，数据永远存在                                  │
│      · 适合：静态页面、文章详情、配置项                          │
│                                                                  │
│    api 类型：需要通过 API 获取的数据                              │
│      · 有 loading/loaded/empty/error 生命周期                    │
│      · 关联一个 ApiEndpoint（数据来自哪个接口）                   │
│      · 适合：用户信息、列表数据、统计数据                        │
│                                                                  │
│  ApiEndpoint（接口定义）                                          │
│  ─────────────────────                                           │
│  职责：描述"一个 API 接口的契约"（方法/路径/参数/Mock）          │
│                                                                  │
│  使用方式 1: 被 DataSource(api) 关联 → 页面加载时自动执行         │
│  使用方式 2: 被事件 action(apiRequest) 引用 → 用户操作触发        │
│                                                                  │
│  两种使用方式共享同一个接口定义和 Mock 场景。                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 一个 ApiEndpoint 可以被多处引用

```
同一个 ApiEndpoint "获取用户信息" 可以：

  1. 被主页的 DataSource 关联 → 页面加载时自动请求
  2. 被"刷新"按钮的事件引用  → 点击时重新请求

  两者共享同一份接口定义和 Mock 场景。
  切换 Mock 场景 → 两处都受影响 → 一致性。
```

---

## 八、设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 页面加载请求用什么机制？ | DataSource + ApiEndpoint 关联 | 比新增 "onMount" EventTrigger 更语义化；数据本就该属于 DataSource |
| Phase 如何影响 UI？ | 自动桥接领域态变量 | 复用已有的 domainState + 条件可见性；不污染 Root 自定义状态 |
| 多个 DataSource 能否并行加载？ | 能，Promise.all 并行 | 真实产品也是并行请求；各 DataSource 独立管理 phase |
| 响应数据存在哪？ | 填充到 DataSource 的当前 scenario data | 复用已有的 {{data.xxx}} 绑定机制；无需新的数据流 |
| 需要新的 EventTrigger 吗？ | 不需要 | "页面加载"是数据层概念，不是交互层概念；放在 DataSource 上更自然 |
| 需要新的 Action 类型吗？ | 只需 reloadDataSource | 用于"重试"按钮场景；其他逻辑自动执行 |
| 编辑模式下如何设计 loading UI？ | 手动切换 phase 到 loading | 与切换 DataSource scenario 一样的操作模式 |
| emptyCondition 是否必要？ | 是 | 区分"请求成功但无数据" vs "请求成功有数据"是常见业务需求 |

---

## 九、边界情况

| 场景 | 预期行为 |
|------|---------|
| DataSource(api) 没有关联接口 | 编辑时正常（手动切换 phase）；预览时停留在当前 phase（不自动请求） |
| 关联的接口被删除 | 数据源配置显示 ⚠️ "关联接口不存在"；预览时不自动请求 |
| 页面有多个 api DataSource | 并行执行所有请求；各自独立管理 phase |
| 两个 DataSource 关联同一个接口 | 允许（各自独立请求和管理 phase）；Mock 结果相同但 phase 独立 |
| 请求超时 | 走 error phase；超时时长由 Mock 场景的 isTimeout 控制 |
| 预览中手动切换 Mock 场景 | 下次进入页面/重试时使用新场景；当前页面不自动刷新 |
| 跳转到已加载过的页面（后退） | 不重新请求（数据已缓存）；如需刷新可点"重试" |
| loadTiming: manual | 不自动请求；需要通过 reloadDataSource action 手动触发 |

---

## 十、实施路线

```
Phase 1: Schema + 配置 UI（预计 3d）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1.1 DataSource 类型扩展
      · 新增 apiEndpointId / loadTiming / emptyCondition 字段
      · design-schema types 更新
      · design-operations 兼容

  1.2 DataSource 配置面板 UI
      · "关联接口"下拉选择
      · "加载时机"切换
      · "判空条件"配置

  1.3 领域态自动桥接
      · 创建 api DataSource 时自动创建同名领域态变量
      · phase 切换与领域态变量双向同步


Phase 2: 预览引擎集成（预计 2d）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2.1 executePageLoadRequests 实现
      · 页面进入时扫描 api DataSource
      · loading → 请求 → loaded/empty/error 自动流转

  2.2 PreviewInteractiveShell 集成
      · onPreviewEnter 调用
      · onScreenNavigated 调用

  2.3 reloadDataSource action
      · 新 Action 类型
      · 事件编辑 UI 支持


Phase 3: 端到端验证（预计 1d）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3.1 主页场景验证
      · 创建 api DataSource + 关联接口
      · 设计 loading/loaded/error 各阶段 UI
      · 预览验证完整流程

  3.2 多 DataSource 并行验证
      · 一个页面两个 api DataSource
      · 验证并行请求 + 独立 phase

总计: ~6d
```

---

## 十一、总结

```
一句话方案：
  让 DataSource(api) 关联一个 ApiEndpoint，
  页面进入时自动执行关联请求，
  响应数据填充到 DataSource，phases 自动流转，
  UI 通过已有的数据绑定 + 领域态条件可见性渲染各阶段。

核心价值：
  · 零个新"系统"——DataSource 和 ApiEndpoint 都已存在
  · 只是在两者之间建立了一个"关联"
  · 预览引擎增加了"页面进入时自动执行"的逻辑
  · 设计师的心智模型：数据源 = 数据从哪来 + 数据长什么样 + 数据的各种状态

与点击触发请求的对比：
  · 点击触发：事件系统 → apiRequest action → onSuccess/onFailure
  · 页面加载：数据系统 → DataSource(api) + ApiEndpoint → phases 自动流转

  两条路径，各司其职：
    事件系统管"交互后做什么"
    数据系统管"页面需要什么数据"
```
