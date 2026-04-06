# DesignUI 项目 - 完整代码库探索报告

**日期**: 2026-04-06  
**范围**: Schema 定义、交互链路、MCP 集成、数据模型

---

## 📋 目录

1. [一、核心架构](#一核心架构)
2. [二、Schema 定义层](#二schema-定义层)
3. [三、操作系统（Operations）](#三操作系统operations)
4. [四、交互链路分析](#四交互链路分析)
5. [五、MCP 服务集成](#五mcp-服务集成)
6. [六、数据流向图](#六数据流向图)
7. [七、关键交互场景](#七关键交互场景)
8. [八、产品逻辑链路](#八产品逻辑链路)

---

## 一、核心架构

### 1.1 整体技术栈

```
┌─────────────────────────────────────────────────────┐
│  apps/                                              │
│  ├── design_front      ← React 前端编辑器           │
│  ├── design-api        ← NestJS 后端 API            │
│  └── design-mcp        ← 🆕 MCP Server (AI)         │
├─────────────────────────────────────────────────────┤
│  features/                                          │
│  ├── design-schema     ← UI Schema 协议（类型+验证）  │
│  ├── design-engine     ← 双层渲染引擎（DOM+Canvas)   │
│  ├── design-operations ← 设计操作集合（核心逻辑）    │
│  └── design-codegen    ← 跨平台代码生成             │
└─────────────────────────────────────────────────────┘
```

### 1.2 包依赖关系

```
design-schema (无依赖)
      ↑
      ├→ design-operations
      ├→ design-engine
      └→ design-codegen
            ↑
      design_front (前端消费)
      design-api (后端消费)
      design-mcp (MCP 包装)
```

### 1.3 运行环境

| 包 | 环境 | 职责 |
|----|------|------|
| design-schema | browser + node | Schema 定义和验证 |
| design-engine | browser | 渲染和编辑交互 |
| design-operations | browser + node | 操作执行逻辑 |
| design-codegen | node | 代码生成 |
| design-mcp | node | MCP 协议包装 |

---

## 二、Schema 定义层

> 📁 位置: `features/design-schema/src/types/`

### 2.1 类型导出清单

```
export types:
  ├── CSSProperties          (CSS 属性类型)
  ├── NodeType               (节点类型)
  │   ├── PrimitiveNodeType  (HTML 标签: div, button, img...)
  │   └── ComponentInstanceType (component:TemplateId)
  ├── ComponentNode          (组件节点)
  ├── ComponentState         (组件状态)
  ├── DomainStateVariable    (领域状态变量)
  ├── DomainStateBinding     (领域状态绑定)
  ├── EnvironmentVariable    (环境变量)
  ├── EnvironmentStateBinding (环境变量绑定)
  ├── DataSource             (数据源)
  ├── DataScenario           (数据场景)
  ├── EventTrigger           (事件触发器)
  ├── ComponentEvent         (组件事件)
  ├── EventAction            (事件动作)
  ├── ComponentTemplate      (组件模板)
  ├── Viewport               (视口预设)
  ├── Screen                 (屏幕/页面)
  └── DesignProject          (设计项目)
```

### 2.2 核心类型详解

#### 2.2.1 ComponentNode（组件节点）

**文件**: `features/design-schema/src/types/node.ts`

```typescript
interface ComponentNode {
  id: string;                              // 唯一标识
  type: NodeType;                          // div | button | component:LoginForm
  name?: string;                           // 设计师命名
  styles: CSSProperties;                   // CSS 样式
  children?: ComponentNode[];              // 子节点
  props: Record<string, unknown>;          // HTML 属性 (src, placeholder...)
  states: ComponentState[];                // 状态集 (hover, pressed, disabled...)
  activeState: string;                     // 当前激活状态
  events: ComponentEvent[];                // 绑定事件
  constraints?: LayoutConstraints;         // 布局约束
  templateRef?: TemplateRef;               // 组件引用（reference/detached）
  locked: boolean;                         // 是否锁定
  visible: boolean;                        // 是否可见
  visibilityWhen?: {                       // 条件可见规则
    variableName: string;
    equals: string;
  };
  
  // 五层状态系统
  domainStates?: DomainStateVariable[];     // 领域状态变量定义
  domainStateBindings?: DomainStateBinding[]; // 领域状态绑定
  environmentBindings?: EnvironmentStateBinding[]; // 环境变量绑定
}
```

**关键特性**:
- 支持组件树嵌套
- 三种节点类型: 原子 HTML + 组件实例 + 注解
- 五层状态系统支持复杂交互
- 条件可见性支持动态显隐

#### 2.2.2 ComponentState（组件状态）

**文件**: `features/design-schema/src/types/state.ts`

```typescript
interface ComponentState {
  name: string;                            // "default" | "hover" | "pressed" | custom
  styles: Partial<CSSProperties>;          // 该状态下的样式覆盖
  props?: Record<string, unknown>;         // 该状态下的属性覆盖
  transition?: {
    duration?: number;                     // 过渡时长 (ms)
    easing?: string;                       // 缓动函数
    properties?: string[];                 // 参与过渡的 CSS 属性
  };
  childrenVisibility?: Record<string, boolean>;  // 子元素可见性
  childrenStates?: Record<string, string>;       // 子元素状态映射
  disabledEvents?: string[];               // 在该状态下禁用的事件
}
```

**内置状态**:
- `default` - 默认状态
- `hover` - 鼠标悬停
- `pressed` - 按下/激活
- `disabled` - 禁用
- 自定义状态

**高级特性**:
- 状态可以定义 CSS 过渡动画
- 支持子元素状态联动（childrenStates）
- 支持状态下的事件禁用

#### 2.2.3 ComponentEvent（事件系统）

**文件**: `features/design-schema/src/types/event.ts`

```typescript
// 事件触发器类型 (11 种)
type EventTrigger =
  | 'click' | 'hover' | 'focus' | 'blur' | 'longPress'        // 用户交互
  | 'screenEnter' | 'screenExit'                              // 页面生命周期
  | 'screenVisible' | 'screenHidden'                          // 屏幕显隐
  | 'scrollReachBottom' | 'scrollReachTop'                    // 滚动触发
  | 'navigateBack';                                            // 导航返回

interface ComponentEvent {
  trigger: EventTrigger;                   // 触发条件
  actions: EventAction[];                  // 执行动作序列
  condition?: EventCondition;              // 执行条件（可选）
  description?: string;                    // 人类可读描述
  disabled?: boolean;                      // 是否禁用
  scrollConfig?: {                         // 滚动触发配置
    threshold?: number;                    // 距离边缘像素数
    debounce?: number;                     // 防抖间隔 (ms)
  };
}
```

**支持的动作类型 (11 种)**:
```typescript
type EventAction =
  | { type: 'navigate'; targetScreenId: string; animation?: TransitionAnimation }
  | { type: 'setState'; targetId: string; state: string; autoRevertMs?: number }
  | { type: 'openUrl'; url: string }
  | { type: 'delay'; duration: number }
  | { type: 'custom'; handler: string }
  | { type: 'setDomainState'; variableName: string; value: string }
  | { type: 'setEnvironmentState'; variableName: string; value: string }
  | { type: 'toggleVisible'; targetId: string }
  | { type: 'showToast'; toastType: ToastType; message: string; ... }
  | { type: 'apiRequest'; requestId: string; onSuccess: []; onFailure: [] }
  | { type: 'cancelApiRequest'; requestId?: string };
```

**事件链特性**:
- 支持多动作序列 (actions 数组)
- 支持延迟 (delay action)
- 支持条件执行 (condition 字段)
- 支持自动还原 (autoRevertMs)
- 支持 API 请求与分支处理

#### 2.2.4 五层状态系统

```
┌─────────────────────────────────────┐
│ 1️⃣  ComponentState (组件状态)        │ 节点自身的视觉状态
│    hover/pressed/disabled/...       │ 维护节点的样式+属性+事件
├─────────────────────────────────────┤
│ 2️⃣  DomainState (领域状态)          │ 容器级业务变量
│    taskStatus/formStep/...          │ 影响多个子节点的联动
├─────────────────────────────────────┤
│ 3️⃣  DataSource + Scenario (数据驱动) │ API 生命周期 & 数据场景
│    loading/loaded/empty/error       │ 自动生成对应的 domain state
├─────────────────────────────────────┤
│ 4️⃣  EnvironmentState (环境变量)      │ 全局变量 (theme/locale)
│    theme/locale/platform/...        │ 跨所有屏幕统一应用
├─────────────────────────────────────┤
│ 5️⃣  Binding System (绑定系统)       │ 条件作用域
│    StateBindings + VisibilityWhen   │ 节点根据状态值应用样式/显隐
└─────────────────────────────────────┘
```

#### 2.2.5 DomainState（领域状态）

**文件**: `features/design-schema/src/types/domainState.ts`

```typescript
interface DomainStateVariable {
  id: string;
  name: string;                           // 状态变量名 (英文标识)
  label: string;                          // 显示标签
  values: Array<{                         // 可选值列表
    value: string;
    label: string;
  }>;
  defaultValue: string;                   // 默认值
  currentPreviewValue?: string;           // 编辑器预览值
  source?: 'manual' | 'dataSource';       // 来源
  dataSourceId?: string;                  // 关联的数据源 ID
}

interface DomainStateBinding {
  variableName: string;                   // 绑定的状态变量
  ownerNodeId?: string;                   // 状态变量定义所有者
  value: string;                          // 绑定的特定值
  styles?: Partial<CSSProperties>;        // 该值下的样式覆盖
  props?: Record<string, unknown>;        // 该值下的属性覆盖
  visible?: boolean;                      // 该值下的可见性
  childrenVisibility?: Record<string, boolean>; // 子元素可见性
  disabledEvents?: string[];              // 在该状态下禁用的事件
}
```

**应用场景**:
- 表单多步骤 (formStep: step1/step2/step3)
- 任务状态 (taskStatus: loading/success/error)
- 列表筛选 (filterType: all/active/completed)
- 模态框 (modalState: closed/opening/open/closing)

#### 2.2.6 DataSource（数据源）

**文件**: `features/design-schema/src/types/dataSource.ts`

```typescript
interface DataSource {
  id: string;
  name: string;                           // 数据源名称
  description?: string;
  lifecycle: 'api' | 'static';            // 类型
  phases: DataSourcePhase[];              // API 生命周期
  activePhase: string;                    // 当前预览阶段
  scenarios: DataScenario[];              // 模拟数据场景
  activeScenarioId: string;               // 当前场景
  schema?: DataSchema;                    // 数据结构定义
}

// API 默认生命周期
const API_DATA_SOURCE_PHASES = [
  { name: 'loading', label: '加载中' },
  { name: 'loaded', label: '已加载' },
  { name: 'empty', label: '无数据' },
  { name: 'error', label: '加载失败' },
];

interface DataScenario {
  id: string;
  name: string;                           // 场景名 (success/error/empty)
  description?: string;
  data: Record<string, unknown>;          // 模拟数据
  isDefault?: boolean;
}
```

**关键机制**:
- API 生命周期自动生成对应的 domain state
- 支持多个模拟数据场景预览
- 场景切换不需重新加载

#### 2.2.7 EnvironmentState（环境变量）

**文件**: `features/design-schema/src/types/environment.ts`

```typescript
interface EnvironmentVariable {
  id: string;
  name: string;                           // 变量名 (theme/locale)
  label: string;                          // 显示标签
  values: Array<{
    value: string;
    label: string;
  }>;
  defaultValue: string;
  currentPreviewValue?: string;           // 编辑器预览值
}

interface EnvironmentStateBinding {
  variableName: string;
  value: string;                          // 绑定的值
  styles?: Partial<CSSProperties>;        // 该值下的样式
  props?: Record<string, unknown>;        // 该值下的属性
  visible?: boolean;                      // 该值下的可见性
}
```

**全局应用**: 与 DomainState 区别在于作用域
- DomainState - 屏幕级或容器级
- EnvironmentState - 项目全局

#### 2.2.8 Screen（屏幕）

**文件**: `features/design-schema/src/types/screen.ts`

```typescript
interface Screen {
  id: string;
  name: string;                           // 屏幕名 (Home/Login/Profile)
  rootNode: ComponentNode;                // 屏幕的根节点
  backgroundColor?: string;               // 背景色
  domainStates: DomainStateVariable[];    // 屏幕级状态变量
  dataSources: DataSource[];              // 屏幕级数据源
  apiEndpoints?: ApiEndpoint[];           // 屏幕级 API 定义
}
```

#### 2.2.9 DesignProject（项目）

**文件**: `features/design-schema/src/types/project.ts`

```typescript
interface DesignProject {
  id: string;
  name: string;
  platform: 'pc' | 'mobile';
  defaultViewport: Viewport;              // 默认视口
  currentViewport: Viewport;              // 当前预览视口
  viewportPresets: Viewport[];            // 快速切换预设
  screens: Screen[];                      // 所有屏幕
  componentAssets: ComponentTemplate[];   // 组件资产库
  environmentStates: EnvironmentVariable[]; // 全局环境变量
  createdAt: string;
  updatedAt: string;
}
```

---

## 三、操作系统（Operations）

> 📁 位置: `features/design-operations/src/`

### 3.1 Operation 定义

**文件**: `features/design-operations/src/types.ts`

```typescript
interface Operation {
  type: string;
  params: Record<string, any>;
  description?: string;
}
```

**关键原则**:
- 所有操作都是原子化的
- 支持 undo/redo
- 参数不含副作用（确定性重放）
- AI 和人类使用同一套操作

### 3.2 操作分类（60+ 种）

#### 🔷 元素操作 (Element Ops) - 7 种

```typescript
// 添加元素
{ type: 'addElement', params: { parentId, tag, styles?, props?, position? } }

// 删除元素
{ type: 'removeElement', params: { elementId } }

// 移动元素
{ type: 'moveElement', params: { elementId, newParentId, position? } }

// 复制元素
{ type: 'duplicateElement', params: { elementId } }

// 插入子树
{ type: 'insertSubtree', params: { parentId, subtree, position? } }

// 重命名
{ type: 'renameNode', params: { nodeId, name } }

// 改变类型
{ type: 'changeElementType', params: { nodeId, newType } }
```

#### 🔷 样式操作 (Style Ops) - 3 种

```typescript
// 更新样式
{ type: 'updateStyle', params: { nodeId, styles } }

// 重置样式
{ type: 'resetStyle', params: { nodeId, properties } }

// 批量更新样式
{ type: 'batchUpdateStyle', params: { updates: [{nodeId, styles}] } }
```

#### 🔷 状态操作 (State Ops) - 5 种

```typescript
// 添加状态
{ type: 'addState', params: { nodeId, stateName, styles?, transition? } }

// 删除状态
{ type: 'removeState', params: { nodeId, stateName } }

// 更新状态
{ type: 'updateState', params: { nodeId, stateName, styles, transition?, childrenStates? } }

// 设置激活状态
{ type: 'setActiveState', params: { nodeId, stateName } }

// 重置状态样式
{ type: 'resetStateStyle', params: { nodeId, stateName, properties } }
```

#### 🔷 事件操作 (Event Ops) - 4 种

```typescript
// 添加事件
{ type: 'addEvent', params: { nodeId, event } }

// 删除事件
{ type: 'removeEvent', params: { nodeId, eventIndex } }

// 更新事件
{ type: 'updateEvent', params: { nodeId, eventIndex, event } }

// 添加导航（快捷）
{ type: 'addNavigation', params: { nodeId, trigger, targetScreenId } }
```

#### 🔷 屏幕操作 (Screen Ops) - 5 种

```typescript
{ type: 'addScreen', params: { name, screenId?, rootNodeId? } }
{ type: 'removeScreen', params: { screenId } }
{ type: 'setActiveScreen', params: { screenId } }
{ type: 'renameScreen', params: { screenId, name } }
{ type: 'reorderScreen', params: { screenId, newIndex } }
```

#### 🔷 组件资产操作 (Asset Ops) - 4 种

```typescript
// 实例化组件
{ type: 'instantiateTemplate', params: { templateId, parentId, position?, mode? } }

// 保存为模板
{ type: 'saveAsTemplate', params: { nodeId, name, category, tags?, scope? } }

// 脱离模板
{ type: 'detachInstance', params: { nodeId } }

// 同步模板
{ type: 'syncInstance', params: { nodeId } }
```

#### 🔷 领域状态操作 (Domain State Ops) - 6 种

```typescript
{ type: 'addDomainState', params: { ownerId, ownerType, name, label, values, defaultValue } }
{ type: 'removeDomainState', params: { ownerId, ownerType, variableName } }
{ type: 'updateDomainState', params: { ownerId, ownerType, variableName, patch } }
{ type: 'setDomainStatePreview', params: { ownerId, ownerType, variableName, value } }
{ type: 'addDomainStateBinding', params: { nodeId, binding } }
{ type: 'updateDomainStateBinding', params: { nodeId, variableName, value, patch } }
```

#### 🔷 环境变量操作 (Environment Ops) - 6 种

```typescript
{ type: 'addEnvironmentState', params: { name, label, values, defaultValue } }
{ type: 'removeEnvironmentState', params: { variableName } }
{ type: 'updateEnvironmentState', params: { variableName, patch } }
{ type: 'setEnvironmentPreview', params: { variableName, value } }
{ type: 'addEnvironmentBinding', params: { nodeId, binding } }
{ type: 'updateEnvironmentBinding', params: { nodeId, variableName, value, patch } }
```

#### 🔷 数据源操作 (Data Source Ops) - 8 种

```typescript
{ type: 'addDataSource', params: { screenId, dataSource } }
{ type: 'removeDataSource', params: { screenId, dataSourceId } }
{ type: 'updateDataSource', params: { screenId, dataSourceId, name?, description? } }
{ type: 'switchDataSourcePhase', params: { screenId, dataSourceId, phase } }
{ type: 'addDataScenario', params: { screenId, dataSourceId, scenario } }
{ type: 'updateDataScenario', params: { screenId, dataSourceId, scenarioId, data?, name? } }
{ type: 'removeDataScenario', params: { screenId, dataSourceId, scenarioId } }
{ type: 'switchDataScenario', params: { screenId, dataSourceId, scenarioId } }
```

#### 🔷 组件属性操作 (Component Props Ops) - 3 种

```typescript
{ type: 'updateComponentProps', params: { nodeId, props } }
{ type: 'addPropDefinition', params: { templateId, definition } }
{ type: 'removePropDefinition', params: { templateId, propKey } }
```

#### 🔷 模板操作 (Template Ops) - 3 种

```typescript
{ type: 'updateTemplate', params: { templateId, patch } }
{ type: 'deleteTemplate', params: { templateId } }
{ type: 'duplicateTemplate', params: { sourceTemplateId, newName? } }
```

#### 🔷 API 端点操作 (API Ops) - 6 种

```typescript
{ type: 'addApiEndpoint', params: { screenId, endpoint } }
{ type: 'removeApiEndpoint', params: { screenId, endpointId } }
{ type: 'updateApiEndpoint', params: { screenId, endpointId, definition } }
{ type: 'addMockScenario', params: { screenId, endpointId, scenario } }
{ type: 'updateMockScenario', params: { screenId, endpointId, scenarioId, changes } }
{ type: 'removeMockScenario', params: { screenId, endpointId, scenarioId } }
```

#### 🔷 其他操作 (Misc Ops) - 10+ 种

```typescript
{ type: 'setNodeLocked', params: { nodeId, locked } }
{ type: 'setNodeVisible', params: { nodeId, visible } }
{ type: 'setNodeVisibilityWhen', params: { nodeId, visibilityWhen } }
{ type: 'wrapInContainer', params: { nodeIds, containerTag?, containerStyles? } }
{ type: 'unwrapContainer', params: { containerId } }
{ type: 'reorderElement', params: { nodeId, parentId, newIndex } }
{ type: 'bindData', params: { nodeId, propKey, expression } }
{ type: 'setChildVisibility', params: { parentNodeId, childNodeId, stateName, visible } }
{ type: 'addAnnotation', params: { parentId, content, author?, styles?, position? } }
{ type: 'removeAnnotation', params: { annotationId } }
```

### 3.3 OperationExecutor（操作执行器）

**文件**: `features/design-operations/src/executor/`

```typescript
class OperationExecutor {
  // 核心方法
  execute(op: Operation): DesignProject;      // 执行单个操作
  executeBatch(ops: Operation[]): DesignProject; // 执行多个操作
  undo(): DesignProject;                       // 撤销
  redo(): DesignProject;                       // 重做
  
  // 获取可用操作列表（给 AI/MCP 用）
  getAvailableOperations(): OperationDescription[];
}
```

---

## 四、交互链路分析

### 4.1 用户交互流程

```
┌─────────────┐
│ 用户在画布上 │
│  进行操作    │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ design_front     │
│ React 编辑器     │
│ (UI 事件监听)    │
└────────┬─────────┘
         │ 转换为 Operation
         ▼
┌──────────────────────────┐
│ design-operations 执行器  │
│ (核心业务逻辑)          │
└────────┬────────────────┘
         │ 返回新 Project
         ▼
┌──────────────────────┐
│ 状态管理 (MobX)      │
│ 更新项目状态         │
└────────┬─────────────┘
         │ 触发 DOM 重新渲染
         ▼
┌──────────────────────┐
│ design-engine        │
│ 重新计算并渲染       │
│ (双层: React + Canvas)
└──────────────────────┘
```

### 4.2 事件到操作的映射

#### 添加元素流程

```
用户操作
  ↓
点击"添加元素"按钮
  ↓
弹出选择菜单 (div/button/img...)
  ↓
选择 "button"
  ↓
生成 Operation:
  {
    type: 'addElement',
    params: {
      parentId: 'container-123',
      tag: 'button',
      styles: { ... 默认样式 },
      props: { ... 默认属性 },
      position: 2
    }
  }
  ↓
执行操作
  ↓
返回新的 Project Schema
  ↓
渲染新的组件树
```

#### 设置事件流程

```
用户选择元素
  ↓
在事件面板中添加事件
  ↓
选择触发器 (e.g. 'click')
  ↓
配置动作 (e.g. navigate to 'login-screen')
  ↓
生成 Operation:
  {
    type: 'addEvent',
    params: {
      nodeId: 'button-456',
      event: {
        trigger: 'click',
        actions: [{
          type: 'navigate',
          targetScreenId: 'screen-login-789',
          animation: { type: 'slide-left', duration: 300 }
        }],
        description: '点击跳转登录页'
      }
    }
  }
  ↓
执行操作
  ↓
Canvas 更新元素的 events 数组
```

#### 状态管理流程

```
用户设置组件状态
  ↓
选择组件，打开状态编辑面板
  ↓
添加 'hover' 状态，配置 hover 下的样式
  ↓
生成 Operation:
  {
    type: 'addState',
    params: {
      nodeId: 'button-456',
      stateName: 'hover',
      styles: {
        backgroundColor: '#0050b3',
        transform: 'scale(1.05)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      },
      transition: {
        duration: 200,
        easing: 'ease-out',
        properties: ['backgroundColor', 'transform', 'boxShadow']
      }
    }
  }
  ↓
执行操作
  ↓
节点的 states 数组中添加新状态
  ↓
编辑器可预览 hover 状态效果
```

### 4.3 预览和交互引擎

**文件**: `features/design-engine/src/preview/`

```
Schema
  ↓
预览引擎 (PreviewController)
  ├─ 渲染 React DOM
  ├─ 监听用户交互 (click, hover, scroll...)
  ├─ 执行事件处理 (EventExecutionEngine)
  │  ├─ 评估条件 (condition)
  │  ├─ 执行动作序列 (actions[])
  │  └─ 处理导航/状态变化
  └─ 实时预览效果

CSS 伪类处理 (CSSPseudoInjector)
  ├─ :hover → setState 'hover'
  ├─ :active → setState 'pressed'
  ├─ :focus → setState 'focus'
  └─ 注入 CSS 规则 (for browser native interactions)
```

---

## 五、MCP 服务集成

> 📁 位置: `apps/design-mcp/`

### 5.1 MCP 架构

```
AI 工具 (Cursor/Claude Code)
  ↓ MCP 协议 (stdio)
  ↓
┌──────────────────┐
│  design-mcp      │
│  MCP Server      │
└────────┬─────────┘
         │
         ├─ Tools (设计操作)
         │  └─ 60+ 个 Operation 工具
         │
         ├─ Resources (读取状态)
         │  └─ 项目/屏幕 Schema JSON
         │
         └─ Prompts (预设提示词)
            └─ 系统提示词 + Few-shot 示例
```

### 5.2 MCP Tools（操作工具）

每个 Operation 类型都映射为一个 MCP Tool:

```typescript
// 查询工具
server.tool('get_project_info', '获取项目基本信息', ...)
server.tool('get_screen_schema', '获取屏幕的完整 Schema', ...)
server.tool('get_available_assets', '列出可用组件资产', ...)
server.tool('list_screens', '列出所有屏幕', ...)
server.tool('list_environment_states', '列出环境变量', ...)
server.tool('list_domain_states', '列出领域状态变量', ...)

// 元素操作工具
server.tool('add_element', '添加 HTML 元素', ...)
server.tool('remove_element', '删除元素', ...)
server.tool('move_element', '移动元素', ...)
server.tool('duplicate_element', '复制元素', ...)
server.tool('change_element_type', '改变元素类型', ...)

// 样式工具
server.tool('update_style', '修改样式', ...)
server.tool('reset_style', '重置样式', ...)
server.tool('batch_update_style', '批量修改样式', ...)

// 状态工具
server.tool('add_state', '添加状态', ...)
server.tool('update_state', '更新状态', ...)
server.tool('remove_state', '删除状态', ...)
server.tool('set_active_state', '设置激活状态', ...)

// 事件工具
server.tool('add_event', '添加事件', ...)
server.tool('update_event', '更新事件', ...)
server.tool('remove_event', '删除事件', ...)
server.tool('add_navigation', '添加导航', ...)

// 屏幕工具
server.tool('add_screen', '添加屏幕', ...)
server.tool('remove_screen', '删除屏幕', ...)
server.tool('set_active_screen', '切换屏幕', ...)
server.tool('rename_screen', '重命名屏幕', ...)

// 组件资产工具
server.tool('instantiate_template', '实例化组件', ...)
server.tool('save_as_template', '保存为模板', ...)
server.tool('detach_instance', '脱离模板', ...)

// 领域状态工具
server.tool('add_domain_state', '添加领域状态', ...)
server.tool('add_domain_state_binding', '添加领域状态绑定', ...)
server.tool('remove_domain_state_binding', '删除领域状态绑定', ...)
server.tool('update_domain_state_binding', '更新领域状态绑定', ...)

// 环境变量工具
server.tool('add_environment_state', '添加环境变量', ...)
server.tool('add_environment_binding', '添加环境变量绑定', ...)
server.tool('update_environment_binding', '更新环境变量绑定', ...)

// 数据源工具
server.tool('add_data_source', '添加数据源', ...)
server.tool('add_data_scenario', '添加数据场景', ...)
server.tool('switch_data_scenario', '切换数据场景', ...)
server.tool('switch_data_source_phase', '切换数据源生命周期', ...)

// 视口工具
server.tool('switch_viewport', '切换视口', ...)
server.tool('add_viewport_preset', '添加视口预设', ...)

// 撤销/重做
server.tool('undo', '撤销上一步', ...)
server.tool('redo', '重做下一步', ...)
```

### 5.3 MCP Resources（资源）

```typescript
// 项目 Schema
server.resource('schema://project/{projectId}', async () => {
  return getCurrentProject();
})

// 屏幕 Schema
server.resource('schema://screen/{projectId}/{screenId}', async () => {
  return getScreen(screenId);
})

// 组件资产列表
server.resource('assets://list', async () => {
  return getAvailableAssets();
})

// 环境变量列表
server.resource('environment://variables', async () => {
  return getEnvironmentStates();
})
```

---

## 六、数据流向图

### 6.1 完整数据流

```
┌─────────────────────────────────────────────────────────────┐
│                    DesignProject                            │
│  (项目最顶层的 Schema 数据结构)                              │
└──────┬────────────────────────────────────────────────────┬─┘
       │                                                    │
       ▼                                                    ▼
   ┌────────┐                                        ┌──────────────┐
   │ Screens│ (10-100 个页面)                        │ Component    │
   └────┬───┘                                        │ Assets       │
        │                                            └──────────────┘
        │ ┌───────────────┐                              │
        ├─┤ ComponentNode │ (每个屏幕都是一个组件树)      │
        │ └───┬───────────┘                              │
        │     │                                          │
        │     ├─ styles: CSSProperties                  │
        │     ├─ props: Record<string, any>             │
        │     ├─ children: ComponentNode[]  ─────────┐  │
        │     │                                       │  │
        │     ├─ states: ComponentState[]             │  │
        │     │  ├─ default                           │  │
        │     │  ├─ hover                             │  │
        │     │  └─ pressed                           │  │
        │     │                                       │  │
        │     ├─ events: ComponentEvent[]             │  │
        │     │  ├─ trigger: 'click'                  │  │
        │     │  ├─ actions: [                        │  │
        │     │  │   { type: 'navigate', ... }        │  │
        │     │  │   { type: 'setState', ... }        │  │
        │     │  │   { type: 'showToast', ... }       │  │
        │     │  │ ]                                  │  │
        │     │  └─ condition: { type: 'domainState' }│  │
        │     │                                       │  │
        │     ├─ domainStates: DomainStateVariable[]  │  │
        │     │  └─ taskStatus: ['pending','done']   │  │
        │     │                                       │  │
        │     ├─ domainStateBindings: [...] ◄─────────┤─┘
        │     │  └─ { variableName: 'taskStatus',    │
        │     │       value: 'pending',               │
        │     │       styles: { opacity: 0.5 } }     │
        │     │                                       │
        │     ├─ environmentBindings: [...]           │
        │     │  └─ { variableName: 'theme',         │
        │     │       value: 'dark',                  │
        │     │       styles: { background: '#000' }}│
        │     │                                       │
        │     └─ templateRef: {                       │
        │        templateId: 'button-123',           │
        │        mode: 'reference'                    │
        │      }                                      │
        │                                             │
        ├─ dataSources: DataSource[]                 │
        │  ├─ id: 'api-users'                        │
        │  ├─ lifecycle: 'api'                       │
        │  ├─ phases: [loading, loaded, empty, error]│
        │  ├─ activePhase: 'loaded'                  │
        │  ├─ scenarios: [                           │
        │  │   { id: 'success', data: {...} },       │
        │  │   { id: 'error', data: {...} }          │
        │  │ ]                                       │
        │  └─ activeScenarioId: 'success'            │
        │                                             │
        ├─ domainStates: DomainStateVariable[]        │
        │  ├─ formStep: ['edit', 'review', 'done']   │
        │  └─ dataSourceId: 'api-users'  (auto-linked)
        │                                             │
        ├─ apiEndpoints: ApiEndpoint[]               │
        │  ├─ id: 'fetch-users'                      │
        │  ├─ method: 'GET'                          │
        │  ├─ url: '/api/users'                      │
        │  └─ mockScenarios: [...]                   │
        │                                             │
        └─ environmentStates: EnvironmentVariable[]   │
           ├─ theme: ['light', 'dark']               │
           └─ locale: ['en', 'zh']                   │


           ├─ viewport: { width: 1920, height: 1080 }
           └─ platform: 'pc'
```

### 6.2 从 Schema 到渲染的链路

```
1️⃣  Schema 定义
    ├─ ComponentNode
    ├─ ComponentState
    ├─ ComponentEvent
    ├─ DomainState
    ├─ DataSource
    └─ EnvironmentState

         │
         ▼
2️⃣  Schema 渲染 (design-engine)
    ├─ resolveStyles(node)
    │  └─ 合并基础样式 + 激活状态样式 + 领域状态绑定样式
    │
    ├─ resolveProps(node)
    │  └─ 合并基础属性 + 激活状态属性 + 领域状态绑定属性
    │
    ├─ resolveActiveState(node)
    │  └─ 获取 activeState 并应用 CSS 过渡
    │
    └─ resolveInstance(node)
       └─ 如果是组件实例，展开模板

         │
         ▼
3️⃣  React DOM 生成
    ├─ SchemaRenderer 递归遍历组件树
    ├─ 每个节点生成一个 React 组件
    ├─ 应用计算后的样式和属性
    └─ 返回完整的 React 元素树

         │
         ▼
4️⃣  Canvas 覆盖层 (编辑交互)
    ├─ 获取 DOM 节点的 BoundingClientRect
    ├─ 映射到 Canvas 坐标系
    ├─ 绘制选区框/hover 高亮/resize 手柄/对齐线
    └─ 监听用户操作 (拖拽/缩放/点击)

         │
         ▼
5️⃣  交互事件处理
    ├─ 用户点击画布上的元素
    ├─ Canvas 捕获事件，定位到对应的 DOM 节点
    ├─ 触发 EventExecutionEngine
    ├─ 评估 event.condition
    ├─ 执行 event.actions[] 序列
    │  ├─ navigate → 切换屏幕
    │  ├─ setState → 改变激活状态
    │  ├─ setDomainState → 改变领域状态值
    │  └─ showToast → 显示提示
    └─ 更新预览状态 → 重新渲染

         │
         ▼
6️⃣  设计编辑流程
    ├─ 用户在编辑器 UI 中修改属性
    ├─ 触发 Operation (e.g. updateStyle)
    ├─ OperationExecutor 执行操作
    ├─ 返回新的 DesignProject
    ├─ MobX 状态管理更新
    └─ React 组件树重新渲染 → 回到步骤 3️⃣
```

---

## 七、关键交互场景

### 场景 1: 添加表单并设置验证状态

```
用户目标: 创建一个带有验证状态的表单

步骤:
1️⃣  添加容器 (div)
    Operation: { type: 'addElement', params: { parentId: 'screen-root', tag: 'div' } }

2️⃣  添加输入框 (input)
    Operation: { type: 'addElement', params: { parentId: 'container-123', tag: 'input', props: { placeholder: 'Email' } } }

3️⃣  添加验证消息 (p)
    Operation: { type: 'addElement', params: { parentId: 'container-123', tag: 'p', props: { textContent: 'Invalid email' } } }

4️⃣  创建领域状态 "formStatus"
    Operation: { type: 'addDomainState', params: { ownerId: 'screen-123', ownerType: 'screen', name: 'formStatus', label: 'Form Status', values: [{value: 'empty'}, {value: 'valid'}, {value: 'invalid'}], defaultValue: 'empty' } }

5️⃣  绑定输入框到 formStatus=empty 状态 (显示空状态)
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'input-456', binding: { variableName: 'formStatus', value: 'empty', styles: { borderColor: '#ccc' }, props: { disabled: false } } } }

6️⃣  绑定输入框到 formStatus=valid 状态 (显示正确状态)
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'input-456', binding: { variableName: 'formStatus', value: 'valid', styles: { borderColor: '#52c41a' }, props: { disabled: false } } } }

7️⃣  绑定输入框到 formStatus=invalid 状态 (显示错误状态)
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'input-456', binding: { variableName: 'formStatus', value: 'invalid', styles: { borderColor: '#ff4d4f' }, props: { disabled: false } } } }

8️⃣  绑定错误消息到 formStatus=invalid 状态 (仅在验证失败时显示)
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'p-789', binding: { variableName: 'formStatus', value: 'invalid', visible: true }, { variableName: 'formStatus', value: 'empty', visible: false }, { variableName: 'formStatus', value: 'valid', visible: false } } } }

9️⃣  为提交按钮添加验证逻辑事件
    Operation: { type: 'addEvent', params: { nodeId: 'button-submit', event: { trigger: 'click', condition: { type: 'domainState', variableName: 'formStatus', value: 'invalid' }, actions: [{ type: 'showToast', toastType: 'error', message: 'Please fix validation errors' }] } } }

🔟 为提交按钮添加成功逻辑事件
    Operation: { type: 'addEvent', params: { nodeId: 'button-submit', event: { trigger: 'click', condition: { type: 'domainState', variableName: 'formStatus', value: 'valid' }, actions: [{ type: 'showToast', toastType: 'success', message: 'Form submitted!' }, { type: 'navigate', targetScreenId: 'success-screen' }] } } }

编辑器预览效果:
• 用户可在状态面板中切换 formStatus 的值来预览不同状态
• 输入框的边框颜色随之改变
• 错误消息随之显示/隐藏
```

### 场景 2: 多步骤流程

```
用户目标: 创建一个三步骤的注册流程 (Step1: 输入信息 → Step2: 验证 → Step3: 成功)

步骤:
1️⃣  为每一步创建屏幕
    Operation: { type: 'addScreen', params: { name: 'SignUp - Step 1' } }
    Operation: { type: 'addScreen', params: { name: 'SignUp - Step 2' } }
    Operation: { type: 'addScreen', params: { name: 'SignUp - Step 3' } }

2️⃣  在每个屏幕上创建导航按钮
    
    在 Step 1 的"下一步"按钮上:
    Operation: { type: 'addEvent', params: { nodeId: 'button-next', event: { trigger: 'click', actions: [{ type: 'navigate', targetScreenId: 'step2-screen', animation: { type: 'slide-left' } }] } } }
    
    在 Step 2 的"下一步"按钮上:
    Operation: { type: 'addEvent', params: { nodeId: 'button-next', event: { trigger: 'click', actions: [{ type: 'navigate', targetScreenId: 'step3-screen', animation: { type: 'slide-left' } }] } } }
    
    在 Step 2 的"返回"按钮上:
    Operation: { type: 'addEvent', params: { nodeId: 'button-back', event: { trigger: 'click', actions: [{ type: 'navigateBack' }] } } }

3️⃣  在 Step 3 的"完成"按钮上添加提交事件
    Operation: { type: 'addEvent', params: { nodeId: 'button-submit', event: { trigger: 'click', actions: [{ type: 'apiRequest', requestId: 'submit-signup', onSuccess: [{ type: 'showToast', toastType: 'success', message: 'Registration successful!' }, { type: 'navigate', targetScreenId: 'home-screen' }], onFailure: [{ type: 'showToast', toastType: 'error', message: 'Registration failed' }] }] } } }

编辑器导航:
• 用户点击各步骤间的按钮进行导航
• Canvas 中显示流程可视化 (通常需额外的流程图组件)
• 预览模式完全支持多步骤交互
```

### 场景 3: 数据驱动的列表

```
用户目标: 创建一个从 API 获取用户列表，支持多个加载状态

步骤:
1️⃣  添加数据源 (API)
    Operation: { type: 'addDataSource', params: { screenId: 'list-screen', dataSource: { id: 'api-users', name: 'Users API', lifecycle: 'api', scenarios: [{ id: 'success', name: 'User List', data: { users: [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}] } }, { id: 'empty', name: 'Empty', data: { users: [] } }, { id: 'error', name: 'Error', data: { error: 'Network error' } }], activeScenarioId: 'success' } } }

2️⃣  自动生成 domain state (由数据源生命周期)
    内部触发:
    Operation: { type: 'addDomainState', params: { ownerId: 'api-users', ownerType: 'node', name: 'apiUsersPhase', label: 'API Phase', values: [{value: 'loading'}, {value: 'loaded'}, {value: 'empty'}, {value: 'error'}], defaultValue: 'loading' } }

3️⃣  创建加载状态的 UI (spinner 等)
    Operation: { type: 'addElement', params: { parentId: 'list-container', tag: 'div', styles: { display: 'flex', justifyContent: 'center' } } }
    (添加 spinner 组件)

4️⃣  绑定 spinner 到 loading 状态
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'spinner', binding: { variableName: 'apiUsersPhase', value: 'loading', visible: true } } }
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'spinner', binding: { variableName: 'apiUsersPhase', value: 'loaded', visible: false } } }

5️⃣  绑定列表到 loaded 状态
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'user-list', binding: { variableName: 'apiUsersPhase', value: 'loaded', visible: true } } }

6️⃣  绑定空状态提示到 empty 状态
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'empty-message', binding: { variableName: 'apiUsersPhase', value: 'empty', visible: true } } }

7️⃣  绑定错误提示到 error 状态
    Operation: { type: 'addDomainStateBinding', params: { nodeId: 'error-message', binding: { variableName: 'apiUsersPhase', value: 'error', visible: true } } }

编辑器预览:
• 在数据源面板中切换 phase (loading/loaded/empty/error)
• 对应的 UI 元素实时显示/隐藏
• 支持在 loaded 状态下切换不同的 scenario (success/empty/error 数据)
```

---

## 八、产品逻辑链路

### 8.1 完整的产品操作流程

```
┌─────────────────────────────────────────────────────────────┐
│                    用户创建项目                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────┐
        │  新建设计项目 (DesignProject) │
        │  ├─ 选择平台 (PC/Mobile)     │
        │  ├─ 选择默认视口             │
        │  └─ 创建第一个屏幕           │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   构建屏幕结构                │
        │   ├─ 添加容器 (div)          │
        │   ├─ 添加内容元素            │
        │   │  ├─ 文本 (p/h1)          │
        │   │  ├─ 按钮 (button)        │
        │   │  ├─ 表单 (input)         │
        │   │  └─ 媒体 (img)           │
        │   └─ 组织层级结构            │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   应用样式和布局              │
        │   ├─ Flexbox 布局            │
        │   ├─ 色彩系统                │
        │   ├─ 排版                    │
        │   ├─ 间距和对齐              │
        │   └─ 响应式约束              │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   定义组件状态                │
        │   ├─ hover 效果              │
        │   ├─ pressed 效果            │
        │   ├─ disabled 状态           │
        │   ├─ 加载动画                │
        │   └─ 自定义状态              │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   配置数据和 API              │
        │   ├─ 添加数据源              │
        │   ├─ 创建模拟数据场景        │
        │   ├─ 定义 API 端点           │
        │   ├─ 配置 mock 响应          │
        │   └─ 预览不同数据场景        │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   定义业务状态和流程          │
        │   ├─ 创建领域状态变量        │
        │   │  (e.g. formStep/taskStatus)
        │   ├─ 绑定到 UI 元素          │
        │   ├─ 配置状态转换规则        │
        │   └─ 预览状态效果            │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   设置交互事件和导航          │
        │   ├─ 按钮 → 状态切换         │
        │   ├─ 按钮 → 屏幕导航         │
        │   ├─ 链接 → 外部 URL         │
        │   ├─ 表单 → API 请求         │
        │   ├─ 列表 → 滚动加载         │
        │   └─ 长按 → 自定义动作       │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   预览和测试                  │
        │   ├─ 切换视口 (PC/Mobile)    │
        │   ├─ 测试所有交互            │
        │   ├─ 切换数据场景            │
        │   ├─ 切换状态值              │
        │   ├─ 播放动画效果            │
        │   └─ 导出截图               │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   创建可复用组件              │
        │   ├─ 选择元素子树            │
        │   ├─ 保存为组件模板          │
        │   ├─ 定义组件属性接口        │
        │   ├─ 添加默认属性绑定        │
        │   └─ 在其他屏幕使用          │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   多屏幕设计                  │
        │   ├─ 创建其他页面            │
        │   ├─ 复用组件模板            │
        │   ├─ 共享全局样式            │
        │   ├─ 统一环境变量            │
        │   └─ 完整用户流程            │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   导出和开发交接              │
        │   ├─ 导出为 React 代码       │
        │   ├─ 导出为 Vue 代码         │
        │   ├─ 导出为 Flutter 代码     │
        │   ├─ 导出为 React Native     │
        │   ├─ 生成项目脚手架          │
        │   └─ 自动生成 API 集成代码   │
        └──────────────┬───────────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │   完成设计 🎉          │
           │   开发开始实现代码    │
           └───────────────────────┘
```

### 8.2 AI 驱动的操作流程

```
AI 用户 (Claude Code / Cursor)
  │
  ├─ 通过 MCP 获取项目信息
  │  └─ get_project_info → 获取项目 Schema
  │
  ├─ 理解设计结构
  │  └─ get_screen_schema → 获取屏幕详细 Schema
  │
  ├─ 发起创建操作
  │  │
  │  ├─ add_element (添加多个元素构建组件树)
  │  │  ├─ add_element (container)
  │  │  ├─ add_element (button)
  │  │  ├─ add_element (label)
  │  │  └─ ...
  │  │
  │  ├─ update_style (批量设置样式)
  │  │  ├─ update_style (margin/padding)
  │  │  ├─ update_style (color/background)
  │  │  └─ ...
  │  │
  │  ├─ add_state (定义交互状态)
  │  │  ├─ add_state (hover)
  │  │  ├─ add_state (pressed)
  │  │  └─ add_state (disabled)
  │  │
  │  ├─ add_event (绑定事件)
  │  │  ├─ add_event (click → navigate)
  │  │  ├─ add_event (hover → setState)
  │  │  └─ add_event (submit → apiRequest)
  │  │
  │  ├─ add_domain_state (定义业务逻辑)
  │  │  ├─ add_domain_state (formStep)
  │  │  └─ add_domain_state_binding (各步骤的 UI 变化)
  │  │
  │  ├─ add_data_source (配置数据)
  │  │  ├─ add_data_source (API 源)
  │  │  └─ add_data_scenario (mock 数据)
  │  │
  │  └─ save_as_template (保存可复用组件)
  │
  ├─ 监听结果反馈
  │  └─ 每个操作返回成功/失败
  │
  ├─ 持续改进
  │  ├─ 获取反馈
  │  ├─ 调整设计
  │  └─ 重复操作
  │
  └─ 完成目标
     └─ 生成设计稿 → 开发团队接收
```

---

## 总结

### 🏗️ 核心架构特点

1. **Schema-First**: 所有设计都以 Schema 数据结构为中心
2. **Operation-Driven**: 所有操作都标准化为 Operation
3. **State Layering**: 五层状态系统支持复杂业务逻辑
4. **AI-Ready**: MCP 协议让 AI 工具无缝集成
5. **Platform-Agnostic**: Schema 可转换为任何平台的代码

### 📊 关键数据结构

| 类型 | 作用 | 示例 |
|------|------|------|
| ComponentNode | 组件树节点 | div, button, component:LoginForm |
| ComponentState | 节点状态 | hover, pressed, disabled |
| ComponentEvent | 交互事件 | click → navigate, hover → setState |
| DomainState | 业务状态 | formStep, taskStatus |
| DataSource | 数据驱动 | API loading/loaded/empty/error |
| EnvironmentState | 全局变量 | theme, locale |

### ⚙️ 操作分类

- **元素操作**: 添加/删除/移动/复制元素
- **样式操作**: 更新/重置/批量修改样式
- **状态操作**: 添加/删除/更新/激活状态
- **事件操作**: 绑定/删除/更新交互事件
- **屏幕操作**: 添加/删除/重命名屏幕
- **资产操作**: 模板实例化/保存/脱离/同步
- **领域状态操作**: 定义和绑定业务状态
- **数据源操作**: 配置和切换数据
- 共 60+ 种操作

### 🔗 核心链路

```
User Input
   ↓
Operation
   ↓
OperationExecutor
   ↓
DesignProject Updated
   ↓
MobX State Updated
   ↓
React Re-render
   ↓
design-engine
   ├─ React DOM (Content)
   └─ Canvas (Overlay)
   ↓
Visual Update in Canvas
```

