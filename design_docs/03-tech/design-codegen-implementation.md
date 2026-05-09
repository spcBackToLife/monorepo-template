# design-codegen 实现架构

> **这是 design-codegen 包的代码实现设计文档**，描述包内部如何组织、每个模块的职责、模块间如何协作。
>
> 设计哲学和产物规格见 [design-codegen.md](./design-codegen.md)
>
> 核心原则来自 [下一步想法.md](../下一步想法.md)：
> - 建设 adapters 层来处理转换差异
> - 通过各种场景模板（组件、api、逻辑等）来适配不同的代码转换诉求
> - 模板可定制化配置，基于模板快速完成代码转化

---

## 一、第一性原理回顾

Schema 描述了完整的产品逻辑。将它转化为代码的本质是**编译**：

```
源语言(Schema) ──→ 编译器 ──→ 目标语言(React/Vue/Flutter)
```

一个编译器有三个核心维度需要解决：

1. **目标语言差异** — React 和 Vue 和 Flutter 的语法完全不同
   → 需要 **Adapter**（每种目标语言一个实现）

2. **工程规范差异** — 同样是 React，不同团队/项目的代码组织方式不同
   → 需要 **Template Framework**（一套可替换的工程规范定义）

3. **编译流程本身** — 遍历输入、分析依赖、分发到各个输出单元
   → 需要 **Pipeline**（固定的编译流水线）

这三者的关系：

```
Pipeline (编译流程) 是不变的骨架
    │
    ├── 调用 Adapter (处理 React/Vue/Flutter 语法差异)
    │
    └── 读取 Template Framework (处理工程组织差异)
            │
            ├── scaffold/        → 基础项目骨架（真实文件）
            ├── rules.yaml       → 拆分规则/文件组织/命名规范
            └── patterns/        → 各类代码写法片段模板
```

---

## 二、design-codegen 包的完整目录结构

```
features/design-codegen/
├── package.json
├── tsconfig.json
├── tsup.config.ts
│
├── bin/
│   └── codegen.ts                    ← CLI 入口（npx @globallink/design-codegen）
│
├── src/
│   ├── index.ts                      ← 包导出
│   │
│   ├── types/                        ← 核心类型定义
│   │   ├── adapter.ts                ← Adapter 接口
│   │   ├── framework.ts              ← TemplateFramework 类型
│   │   ├── pipeline.ts               ← Pipeline 中间产物类型
│   │   └── index.ts
│   │
│   ├── pipeline/                     ← 编译流水线（不变的骨架）
│   │   ├── index.ts                  ← Pipeline 主入口
│   │   ├── 1-load-config.ts          ← Step 1: 加载配置
│   │   ├── 2-scaffold.ts             ← Step 2: 复制脚手架文件
│   │   ├── 3-load-schema.ts          ← Step 3: 加载 Schema
│   │   ├── 4-analyze.ts              ← Step 4: 分析 Schema
│   │   ├── 5-split.ts               ← Step 5: 拆分分发
│   │   ├── 6-emit.ts                ← Step 6: 代码发射（调用 Adapter）
│   │   └── 7-format.ts              ← Step 7: 格式化
│   │
│   ├── adapter/                      ← Adapter 层
│   │   ├── interface.ts              ← Adapter 抽象接口
│   │   ├── react/                    ← React Adapter 实现
│   │   │   ├── index.ts
│   │   │   ├── emit-component.ts     ← 发射组件代码
│   │   │   ├── emit-hook.ts          ← 发射 Hook 代码
│   │   │   ├── emit-service.ts       ← 发射 Service 代码
│   │   │   ├── emit-style.ts         ← 发射样式文件
│   │   │   ├── emit-router.ts        ← 发射路由配置
│   │   │   └── emit-types.ts         ← 发射类型定义
│   │   ├── vue/                      ← Vue Adapter（后续实现）
│   │   │   └── index.ts
│   │   └── flutter/                  ← Flutter Adapter（后续实现）
│   │       └── index.ts
│   │
│   ├── compiler/                     ← 编译器核心（与目标语言无关）
│   │   ├── expression.ts             ← {{ }} 表达式编译
│   │   ├── analyzer.ts               ← Schema 分析（遍历树、收集依赖）
│   │   ├── splitter.ts               ← 拆分引擎（读取规则，决定拆分）
│   │   └── path-resolver.ts          ← 路径计算（读取 FileOrganization，算输出路径）
│   │
│   └── utils/                        ← 工具函数
│       ├── naming.ts                 ← 命名转换（PascalCase/camelCase/kebab）
│       ├── fs.ts                     ← 文件操作
│       └── schema-loader.ts          ← Schema 数据加载（API / 文件）
│
├── templates/                        ← 模板框架集合（每个框架一个目录）
│   │
│   ├── react-feature-modular/        ← 默认模板框架
│   │   ├── framework.yaml            ← 框架配置（规则 + 文件组织 + 命名 + 模式声明）
│   │   ├── scaffold/                 ← 脚手架（真实文件，直接 copy）
│   │   │   ├── vite.config.ts
│   │   │   ├── tsconfig.json
│   │   │   ├── index.html
│   │   │   ├── .eslintrc.cjs
│   │   │   ├── .prettierrc
│   │   │   ├── .env
│   │   │   └── src/
│   │   │       ├── main.tsx
│   │   │       ├── App.tsx
│   │   │       ├── utils/
│   │   │       │   └── request.ts
│   │   │       └── styles/
│   │   │           ├── global.less
│   │   │           └── variables.less
│   │   └── patterns/                 ← 代码片段模板（EJS）
│   │       ├── component.tsx.ejs     ← 组件壳子模板
│   │       ├── hook.ts.ejs           ← Hook 壳子模板
│   │       ├── service.ts.ejs        ← Service 函数模板
│   │       ├── router.tsx.ejs        ← Router 配置模板
│   │       ├── types.ts.ejs          ← 类型定义模板
│   │       └── page.tsx.ejs          ← 页面入口组件模板
│   │
│   └── react-flat-simple/            ← 另一套模板框架（简单版）
│       ├── framework.yaml
│       ├── scaffold/
│       └── patterns/
│
└── codegen.config.yaml               ← 用户配置文件示例
```

---

## 三、核心接口设计

### 3.1 Adapter 接口

**Adapter 解决什么问题？** 同一个 Schema 语义（"声明一个状态"、"绑定一个事件"、"渲染一个列表"），在不同目标语言中的写法完全不同。Adapter 把这些差异封装起来。

```typescript
// src/adapter/interface.ts

/**
 * 框架适配器 —— 每种目标语言实现一个
 *
 * Adapter 只关心"一段代码怎么写"，不关心"文件怎么组织"。
 * 文件组织由 TemplateFramework 的 rules 决定。
 */
export interface FrameworkAdapter {
  /** 适配器名称 */
  readonly name: string;  // "react" | "vue" | "flutter"

  // ═══ 组件结构 ═══

  /** 生成组件定义壳子（import + function + export） */
  emitComponentShell(ctx: ComponentShellContext): string;

  /** 生成 JSX/Template 的单个元素 */
  emitElement(node: ElementContext): string;

  // ═══ 状态 ═══

  /** 生成状态声明 */
  emitStateDeclaration(state: StateDeclarationContext): string;

  /** 生成状态更新语句 */
  emitStateUpdate(action: StateUpdateContext): string;

  // ═══ 事件 ═══

  /** 生成事件绑定属性（写在元素上的） */
  emitEventBinding(trigger: string, handlerName: string): string;

  /** 生成事件处理函数体 */
  emitEventHandler(ctx: EventHandlerContext): string;

  // ═══ 列表渲染 ═══

  /** 生成列表渲染代码 */
  emitRepeat(ctx: RepeatContext): string;

  // ═══ 条件渲染 ═══

  /** 生成条件渲染代码 */
  emitConditional(ctx: ConditionalContext): string;

  // ═══ 双向绑定 ═══

  /** 生成双向绑定代码 */
  emitBind(ctx: BindContext): string;

  // ═══ 生命周期 ═══

  /** 生成页面进入逻辑 */
  emitOnMount(ctx: OnMountContext): string;

  // ═══ 导航 ═══

  /** 生成导航代码 */
  emitNavigation(ctx: NavigationContext): string;

  // ═══ 样式 ═══

  /** 生成样式导入语句 */
  emitStyleImport(stylePath: string): string;

  /** 生成 className 绑定 */
  emitClassName(className: string): string;

  /** 生成 inline style */
  emitInlineStyle(entries: Record<string, string>): string;
}
```

**为什么是这些方法？** 因为 Schema 的每种语义都需要一个对应的代码输出方式。一一对应：

| Schema 语义 | Adapter 方法 | React 输出 | Vue 输出 |
|---|---|---|---|
| 节点 type=div | `emitElement` | `<div>` | `<div>` |
| stateInit.view | `emitStateDeclaration` | `useState('')` | `ref('')` |
| state.set action | `emitStateUpdate` | `setX(v)` | `x.value = v` |
| event click | `emitEventBinding` | `onClick={fn}` | `@click="fn"` |
| repeat | `emitRepeat` | `{list.map(...)}` | `v-for="..."` |
| bind | `emitBind` | `value={x} onChange={...}` | `v-model="x"` |
| screenEnter | `emitOnMount` | `useEffect(fn, [])` | `onMounted(fn)` |
| nav.go | `emitNavigation` | `navigate(path)` | `router.push(path)` |
| styles | `emitStyleImport` | `import styles from './index.less'` | `<style scoped>` |

### 3.2 TemplateFramework 配置

**TemplateFramework 不是代码**，是一个配置 + 文件夹。它告诉引擎"工程怎么组织"。

```yaml
# templates/react-feature-modular/framework.yaml

name: react-feature-modular
description: "React 功能模块化，Folder/index.tsx + index.less"
adapter: react                          # 使用哪个 Adapter

# ═══ 文件组织 ═══
fileOrganization:
  page:
    baseDir: src/pages
    dirNaming: PascalCase
    entryFile: index.tsx
    styleFile: index.less
  component:
    dir: components
    filePattern: folder                 # folder = Name/index.tsx + index.less
    entryFile: index.tsx
    styleFile: index.less
  hook:
    dir: hooks
    fileNaming: camelCase               # useMessages.ts
  service:
    dir: src/services
    groupBy: domain                     # chat-list + chat-send → services/chat.ts
  types:
    dir: types
    scope: page-local                   # 类型文件放在页面目录下
  style:
    extension: .less
    cssModules: true
    globalDir: src/styles

# ═══ 拆分规则 ═══
splitting:
  component:
    minDescendantsToSplit: 6            # 后代节点 > 6 拆组件
    splitRepeatTemplate: true           # repeat template 拆为独立组件
    splitInteractiveRegions: true       # 有事件+多子节点 → 拆组件
    splitNamedContainers: true          # 有 name 属性的容器 → 拆组件
  hook:
    minActionsToSplit: 3                # 3+ actions 的 handler 拆为 hook
    splitDataFetching: true             # 每个 api dataSource 拆为独立 hook
  service:
    groupBy: domain

# ═══ 代码写法 ═══
codePatterns:
  component:
    style: function                     # function Component() vs const Component = () =>
    exportStyle: named                  # export function vs export default
    propsStyle: destructured
  state:
    pattern: useState                   # useState | zustand | redux-toolkit
  logic:
    asyncPattern: async-await
    handlerNaming: handleXxx            # handleXxxClick vs onXxxClick
    guardStyle: early-return
  router:
    pattern: react-router-v6
    lazyLoading: false

# ═══ 命名规范 ═══
conventions:
  fileNaming: PascalCase
  componentNaming: PascalCase
  hookNaming: useCamelCase
  serviceNaming: camelCase
  dirNaming: PascalCase
```

### 3.3 Scaffold = 真实文件目录

`templates/react-feature-modular/scaffold/` 就是一个**真实的、可以直接运行的 React 空项目**。引擎做的就是把这个目录 copy 到输出位置，然后往里面填充生成的代码。

```
templates/react-feature-modular/scaffold/
├── vite.config.ts                      ← 真实文件，直接 copy
├── tsconfig.json                       ← 真实文件
├── index.html                          ← 真实文件（含 {{projectName}} 占位符）
├── .eslintrc.cjs                       ← 真实文件
├── .prettierrc                         ← 真实文件
├── .env                                ← 真实文件
├── package.json.ejs                    ← 需要渲染的（项目名、依赖可变）
└── src/
    ├── main.tsx                         ← 真实文件（固定入口）
    ├── App.tsx                          ← 真实文件（RouterProvider 壳子）
    ├── utils/
    │   └── request.ts                   ← 真实文件（axios 封装）
    └── styles/
        ├── global.less                  ← 真实文件
        └── variables.less               ← 真实文件
```

规则：
- 普通文件 → 直接 copy
- `.ejs` 后缀文件 → EJS 渲染后去掉 `.ejs` 后缀写入
- 文件内的 `{{projectName}}` → 简单字符串替换

### 3.4 Patterns = 代码片段模板

`templates/react-feature-modular/patterns/` 下是**代码片段模板**，Adapter 在发射代码时读取它们来组装输出。

```ejs
<%# patterns/component.tsx.ejs — 组件壳子模板 %>
<% for (const imp of imports) { %>
import <%= imp.clause %> from '<%= imp.path %>';
<% } %>

export function <%= componentName %>(<%= propsSignature %>) {
<%= body %>
}
```

```ejs
<%# patterns/hook.ts.ejs — Hook 壳子模板 %>
<% for (const imp of imports) { %>
import <%= imp.clause %> from '<%= imp.path %>';
<% } %>

export function <%= hookName %>(<%= params %>) {
<%= stateDeclarations %>

<%= logic %>

  return <%= returnStatement %>;
}
```

```ejs
<%# patterns/page.tsx.ejs — 页面入口组件模板 %>
<% for (const imp of imports) { %>
import <%= imp.clause %> from '<%= imp.path %>';
<% } %>

export function <%= pageName %>() {
<%= hookCalls %>

  return (
<%= jsx %>
  );
}
```

**为什么用 EJS？** 因为代码片段有固定骨架（import 区、函数签名、return），但内部内容是动态计算的。EJS 处理骨架，Adapter 计算内容。

---

## 四、Pipeline 流程详解

Pipeline 是**固定的、不随模板变化的编译流程**。它协调 Adapter 和 TemplateFramework 完成转换。

```
┌─────────────────────────────────────────────────────────────────┐
│  Pipeline (不变)                                                 │
│                                                                 │
│  1. loadConfig(configPath)                                      │
│     → 读取 codegen.config.yaml                                  │
│     → 定位并加载 TemplateFramework（scaffold/ + framework.yaml） │
│     → 实例化对应 Adapter                                         │
│                                                                 │
│  2. scaffold(outputDir, framework)                              │
│     → copy scaffold/ 目录到 outputDir                            │
│     → 渲染 .ejs 文件                                            │
│                                                                 │
│  3. loadSchema(source)                                          │
│     → 从 API 或 JSON 文件加载完整 DesignProject                  │
│                                                                 │
│  4. analyze(project, framework.splitting)                       │
│     → 遍历每个 Screen 的组件树                                   │
│     → 匹配拆分规则，标记拆分点                                   │
│     → 收集 dataSource / state / event 依赖关系                   │
│     → 产出 AnalysisResult（IR 中间表示）                         │
│                                                                 │
│  5. split(analysisResult, framework.fileOrganization)           │
│     → 按规则将 Schema 切分为多个 EmitUnit                        │
│     → 按 FileOrganization 计算每个 unit 的输出路径               │
│                                                                 │
│  6. emit(units, adapter, framework.patterns)                    │
│     → 对每个 EmitUnit：                                         │
│        ├── 用 Adapter 生成代码内容                               │
│        ├── 用 Pattern 模板组装完整文件                            │
│        └── 写入输出路径                                          │
│                                                                 │
│  7. format(outputDir)                                           │
│     → prettier --write                                          │
│     → eslint --fix (可选)                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline 与 Adapter / Framework 的调用关系

```
Pipeline.emit(unit)
    │
    ├── 调 adapter.emitStateDeclaration(...)  → 得到状态声明代码
    ├── 调 adapter.emitOnMount(...)           → 得到页面进入逻辑
    ├── 调 adapter.emitEventHandler(...)      → 得到事件处理函数
    ├── 调 adapter.emitRepeat(...)            → 得到列表渲染代码
    ├── 调 adapter.emitElement(...)           → 得到每个元素的标记
    │
    └── 将上述结果填入 framework.patterns/page.tsx.ejs 模板
        → 渲染得到最终文件内容
```

**关键洞察**：
- **Adapter** 负责"代码片段的语法"（一行一行怎么写）
- **Pattern 模板** 负责"文件的骨架"（import 在哪、function 签名、return 结构）
- **FileOrganization** 负责"文件放哪"（路径计算）
- **SplittingRules** 负责"怎么拆"（哪些东西应该成为独立文件）

四者各司其职，互不耦合。

---

## 五、EmitUnit（发射单元）

Split 阶段将 Schema 拆分为多个 EmitUnit，每个 unit 对应一个输出文件：

```typescript
type EmitUnit =
  | PageUnit          // 页面入口组件
  | ComponentUnit     // 子组件
  | HookUnit          // Hook
  | ServiceUnit       // API Service
  | TypeUnit          // 类型定义
  | StyleUnit         // 样式文件
  | RouterUnit        // 路由配置
```

每个 unit 携带：
- **输出路径**（由 PathResolver 根据 FileOrganization 计算）
- **所需数据**（节点子树 / 事件 / 状态 / dataSource）
- **上下文**（当前 screen / 依赖的其他 unit）

```typescript
interface PageUnit {
  kind: 'page';
  outputPath: string;                    // "src/pages/ChatAIConversation/index.tsx"
  screenName: string;
  hookImports: string[];                 // 本页面要 import 的 hooks
  componentImports: string[];            // 本页面要 import 的子组件
  rootNode: ComponentNode;               // 去掉已拆分节点后的骨架树
}

interface ComponentUnit {
  kind: 'component';
  outputPath: string;                    // "src/pages/Chat/components/MessageBubble/index.tsx"
  styleOutputPath: string;               // "src/pages/Chat/components/MessageBubble/index.less"
  componentName: string;
  props: PropDefinition[];
  node: ComponentNode;                   // 该组件的节点子树
}

interface HookUnit {
  kind: 'hook';
  outputPath: string;                    // "src/pages/Chat/hooks/useMessages.ts"
  hookName: string;
  stateDeclarations: StateInfo[];
  effects: EffectInfo[];
  handlers: HandlerInfo[];
  returnFields: string[];
}

interface ServiceUnit {
  kind: 'service';
  outputPath: string;                    // "src/services/chat.ts"
  functions: ServiceFunctionInfo[];
}
```

---

## 六、CLI 设计

```bash
# 初始化配置
npx @globallink/design-codegen init
# → 在当前目录生成 codegen.config.yaml

# 从 API 拉取 Schema 并编译
npx @globallink/design-codegen generate --project-id <id> --output ./my-app

# 从本地 JSON 文件编译
npx @globallink/design-codegen generate --input schema.json --output ./my-app

# 仅生成脚手架（不编译 Schema）
npx @globallink/design-codegen scaffold --output ./my-app

# 列出可用模板框架
npx @globallink/design-codegen frameworks

# 校验配置
npx @globallink/design-codegen validate
```

---

## 七、数据来源

Schema 数据有两种获取方式，CLI 两种都支持：

### 7.1 从 API 获取（在线模式）

```typescript
// src/utils/schema-loader.ts
async function loadFromAPI(projectId: string, apiBase: string): Promise<DesignProject> {
  // 调用后端接口拿到完整的 DesignProject（含所有 Screen）
  const res = await fetch(`${apiBase}/projects/${projectId}/export`);
  return res.json();
}
```

### 7.2 从 JSON 文件获取（离线模式）

设计软件提供"导出 Schema JSON"功能，导出完整的 DesignProject JSON。CLI 直接读取：

```typescript
async function loadFromFile(filePath: string): Promise<DesignProject> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}
```

---

## 八、Adapter 如何扩展

添加一个新的目标语言（比如 Vue）：

1. 在 `src/adapter/vue/` 下实现 `FrameworkAdapter` 接口
2. 在 `templates/` 下新建 `vue-composition-modular/` 目录（scaffold + patterns + framework.yaml）
3. 注册 adapter：`adapterRegistry.set('vue', new VueAdapter())`

**不需要改 Pipeline**。Pipeline 只通过接口调用 Adapter，不关心具体实现。

---

## 九、Template Framework 如何扩展

添加一种新的工程规范（比如 "react-layer-separation"）：

1. 在 `templates/` 下新建 `react-layer-separation/` 目录
2. 写 `framework.yaml`（不同的 fileOrganization + splitting 规则）
3. 提供 `scaffold/`（不同的项目骨架）
4. 提供 `patterns/`（可能与默认相同，也可能有差异）

**不需要改代码**。Pipeline 读取 `framework.yaml` 作为配置，一切行为由配置驱动。

---

## 十、与方案文档的对应关系

| 方案文档中的概念 | 代码中的实体 |
|---|---|
| Adapter 层 | `src/adapter/interface.ts` + `src/adapter/react/` |
| Template Framework | `templates/{name}/framework.yaml` |
| Scaffold | `templates/{name}/scaffold/` 目录（真实文件） |
| FileOrganization | `framework.yaml` 中的 `fileOrganization` 节 |
| SplittingRules | `framework.yaml` 中的 `splitting` 节 + `src/compiler/splitter.ts` |
| CodePatterns | `framework.yaml` 中的 `codePatterns` 节 + `templates/{name}/patterns/` |
| Conventions | `framework.yaml` 中的 `conventions` 节 |
| Expression 编译器 | `src/compiler/expression.ts` |
| Pipeline | `src/pipeline/` |
| CLI | `bin/codegen.ts` |
| codegen.config.yaml | 用户配置，允许覆盖 framework 默认值 |

---

## 十一、建设步骤

| 步 | 做什么 | 验证标准 |
|---|---|---|
| 1 | 定义 Adapter 接口 + 类型 | 类型编译通过 |
| 2 | 实现 React Adapter（全部方法） | 能产出语法正确的 React 代码片段 |
| 3 | 创建 `react-feature-modular` 模板目录（scaffold 真实文件 + framework.yaml + patterns） | scaffold 目录 `npm install && npm run dev` 能跑 |
| 4 | 实现 Pipeline 各步骤 | 输入真实 Schema → 输出完整可运行项目 |
| 5 | 实现 CLI | `npx codegen generate --input schema.json --output ./out` 跑通 |
| 6 | 用真实项目 Schema 端到端验证 | 生成代码 build 通过 |

---

## 十二、设计约束

1. **Adapter 不读配置** — Adapter 只接收上下文参数，输出代码字符串。它不知道文件怎么组织。
2. **Pipeline 不写死任何框架** — Pipeline 通过接口调用 Adapter，通过配置驱动行为。
3. **Scaffold 是可运行的** — `templates/{name}/scaffold/` 本身就是一个可以 `npm install && npm run dev` 的空项目。
4. **Pattern 模板是可选的** — Adapter 可以不用 Pattern 模板，直接拼字符串。Pattern 只是为了让输出更可读可定制。
5. **所有路径由 PathResolver 计算** — 没有任何地方硬编码路径字符串。路径全部由 `framework.yaml` 的 `fileOrganization` 配置推导。
