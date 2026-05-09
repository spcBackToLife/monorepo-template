# design-codegen 实现设计（Implementation Design）

> 本文档是落地实现方案，不是概念讨论。每一个设计决策都具体到"放在哪个文件、接口怎么定义、怎么跑"。

---

## 第一性原理

**问题本质**：Schema（完备的产品逻辑描述）→ Code（可运行的工程化项目）。

这是一个编译器。编译器的经典架构是：

```
Source (Schema)
    │
    ▼
Frontend (Parse → IR)      ← 理解输入
    │
    ▼
Middle (Transform IR)       ← 按规则拆分/优化
    │
    ▼
Backend (Emit → Target)    ← 输出目标语言
```

对应到我们的场景：
- **Frontend** = Schema Parser：读 Schema JSON，建立内部 IR
- **Middle** = Splitter：按规则决定怎么拆文件（组件/hook/service/types）
- **Backend** = Adapter + Emitter：按目标框架语法输出代码

三者的分界线很清晰：
- Parser 只关心"理解 Schema 结构"，不知道目标是 React 还是 Vue
- Splitter 只关心"怎么拆"，不知道具体代码怎么写
- Adapter 只关心"这个语义用目标语言怎么表达"，不知道原始 Schema 长什么样

---

## 包内目录结构

```
features/design-codegen/
├── package.json
├── tsconfig.json
├── tsup.config.ts
│
├── src/
│   ├── index.ts                      ← 公开 API 导出
│   ├── cli.ts                        ← CLI 入口 (bin)
│   │
│   ├── core/                         ← 与目标框架无关的核心逻辑
│   │   ├── types.ts                  ← IR 类型定义
│   │   ├── parser.ts                 ← Schema → IR
│   │   ├── splitter.ts               ← IR → SplitPlan (按规则决定拆分)
│   │   └── expression-compiler.ts    ← {{ expr }} → JS 表达式
│   │
│   ├── adapter/                      ← Adapter 接口 + 各框架实现
│   │   ├── interface.ts              ← FrameworkAdapter 抽象接口
│   │   ├── react/                    ← React Adapter
│   │   │   ├── index.ts
│   │   │   ├── emit-component.ts     ← 组件怎么写
│   │   │   ├── emit-hook.ts          ← hook 怎么写
│   │   │   ├── emit-service.ts       ← service 怎么写
│   │   │   ├── emit-style.ts         ← 样式怎么写
│   │   │   ├── emit-router.ts        ← 路由怎么写
│   │   │   └── emit-types.ts         ← 类型定义怎么写
│   │   └── vue/                      ← (未来) Vue Adapter
│   │       └── index.ts
│   │
│   ├── pipeline.ts                   ← 编排器：Scaffold → Parse → Split → Emit
│   │
│   └── config/                       ← 配置加载
│       ├── types.ts                  ← 用户配置类型 (codegen.config.yaml)
│       ├── loader.ts                 ← 加载+合并配置
│       └── defaults.ts               ← 默认值
│
├── templates/                        ← 真实文件目录，不是字符串！
│   └── react-feature-modular/       ← 一套模板框架 = 一个目录
│       ├── manifest.yaml             ← 框架元信息 + 规则配置
│       ├── scaffold/                 ← 脚手架：真实项目骨架文件
│       │   ├── vite.config.ts
│       │   ├── tsconfig.json
│       │   ├── index.html
│       │   ├── .eslintrc.cjs
│       │   ├── .env
│       │   ├── src/
│       │   │   ├── main.tsx
│       │   │   ├── App.tsx
│       │   │   ├── utils/
│       │   │   │   └── request.ts
│       │   │   └── styles/
│       │   │       ├── global.less
│       │   │       └── variables.less
│       │   └── package.json.tpl      ← .tpl 文件 = 需要变量替换
│       └── blueprints/               ← 代码片段模板 (EJS)
│           ├── page.tsx.ejs          ← 页面组件模板
│           ├── component.tsx.ejs     ← 子组件模板
│           ├── hook.ts.ejs           ← hook 模板
│           ├── service.ts.ejs        ← service 函数模板
│           ├── router.tsx.ejs        ← 路由文件模板
│           └── types.ts.ejs          ← 类型定义模板
│
└── tests/
    ├── fixtures/                     ← 真实 Schema JSON 用于测试
    │   └── chat-screen.json
    └── pipeline.test.ts
```

---

## 核心设计

### 1. IR（中间表示）— `src/core/types.ts`

Parser 把 Schema 翻译成 IR，IR 是与"目标框架无关"的抽象描述：

```typescript
/** 一个页面的中间表示 */
interface PageIR {
  name: string;
  slug: string;                          // URL path: "chat-ai-conversation"

  // 状态声明
  viewState: ViewStateIR[];              // UI 临时变量
  dataState: DataStateIR[];              // 业务数据变量

  // 数据源
  dataSources: DataSourceIR[];           // API 定义

  // 组件树（已标记拆分点）
  rootNode: NodeIR;

  // 事件处理器
  handlers: HandlerIR[];                 // 所有提取出来的事件处理函数

  // 生命周期
  onMount?: HandlerIR;                   // screenEnter 事件
}

/** 节点 IR */
interface NodeIR {
  id: string;
  tag: string;                           // "div" | "input" | "h3" ...
  name?: string;                         // 设计师给的语义名

  // 样式
  staticStyles: Record<string, string>;  // 可提取为 class 的静态样式
  dynamicStyles: DynamicStyleIR[];       // 含表达式的动态样式

  // 内容
  textContent?: string | ExpressionIR;   // 文本（纯文本或表达式）
  children: NodeIR[];

  // 交互
  events: EventBindingIR[];              // onClick={xxx}
  bind?: BindIR;                         // 双向绑定

  // 列表
  repeat?: RepeatIR;

  // 条件渲染
  visibleWhen?: ExpressionIR;

  // 拆分标记（Splitter 填充）
  splitAs?: 'component';                 // 如果标记了，表示这个子树要拆成独立组件
  splitComponentName?: string;
}

/** 表达式 IR */
interface ExpressionIR {
  raw: string;                           // 原始 "{{ state.view.xxx }}"
  compiled: string;                      // 编译后 "xxx" 或 "item.role === 'user' ? ..."
  dependencies: string[];                // 引用了哪些变量
}

/** 事件处理器 IR */
interface HandlerIR {
  name: string;                          // "handleSendClick"
  trigger: string;                       // "click"
  isAsync: boolean;
  guard?: ExpressionIR;                  // 前置条件
  steps: ActionStepIR[];                 // 执行步骤
  ownerNodeId: string;                   // 属于哪个节点
}

/** Action 步骤 IR（已编译为伪代码级别） */
type ActionStepIR =
  | { kind: 'state-set'; variable: string; value: ExpressionIR | unknown }
  | { kind: 'state-append'; variable: string; value: ExpressionIR | unknown }
  | { kind: 'state-toggle'; variable: string }
  | { kind: 'fetch'; serviceName: string; params?: Record<string, ExpressionIR | unknown>; resultVar: string; onSuccess: ActionStepIR[] }
  | { kind: 'navigate'; path: string }
  | { kind: 'navigate-back' }
  | { kind: 'toast'; type: string; message: ExpressionIR | string }
  | { kind: 'delay'; ms: number };
```

**为什么要 IR？**
- Adapter 只需要读 IR，不需要理解 Schema 的 `{{ $last.xxx }}` 语法
- 表达式已经编译好了，Adapter 直接插入
- 拆分决策已经标记了，Adapter 只管按标记生成文件
- 新增 Vue/Flutter adapter 时，不需要重新写一遍 Schema 解析

### 2. Adapter 接口 — `src/adapter/interface.ts`

```typescript
/**
 * FrameworkAdapter — 每个目标框架实现一套
 *
 * Adapter 的职责：把 IR 翻译成目标语言的代码字符串
 * 它不关心文件放哪、目录怎么组织（那是模板框架的事）
 */
interface FrameworkAdapter {
  name: string;                          // "react" | "vue" | "flutter"

  /** 生成组件文件内容 */
  emitComponent(ir: ComponentEmitInput): string;

  /** 生成 hook 文件内容 */
  emitHook(ir: HookEmitInput): string;

  /** 生成 service 文件内容 */
  emitService(ir: ServiceEmitInput): string;

  /** 生成样式文件内容 */
  emitStyle(ir: StyleEmitInput): string;

  /** 生成路由文件内容 */
  emitRouter(ir: RouterEmitInput): string;

  /** 生成类型定义文件内容 */
  emitTypes(ir: TypesEmitInput): string;
}

/** 组件生成输入 */
interface ComponentEmitInput {
  componentName: string;
  isPage: boolean;                       // 是页面组件还是子组件
  // 页面组件特有
  viewState?: ViewStateIR[];
  dataState?: DataStateIR[];
  onMount?: HandlerIR;
  handlers?: HandlerIR[];
  // 通用
  node: NodeIR;                          // 要渲染的节点树
  imports: ImportDeclaration[];          // 需要的 import
  styleImport?: string;                  // 样式文件引用路径
  childComponents?: string[];            // 引用的子组件名
}

/** Hook 生成输入 */
interface HookEmitInput {
  hookName: string;
  // data fetching hook
  fetchService?: { serviceName: string; stateVariable: string };
  // handler hook
  handler?: HandlerIR;
  // 返回值
  returnFields: { name: string; type: string }[];
}

/** Service 生成输入 */
interface ServiceEmitInput {
  functions: ServiceFunctionIR[];
  types: TypeDefinitionIR[];
}

/** Router 生成输入 */
interface RouterEmitInput {
  routes: { path: string; componentName: string; importPath: string }[];
}
```

**Adapter 只做一件事：把 IR → 代码字符串。** 它不决定文件路径、不管目录结构。

### 3. 模板框架 — `templates/xxx/manifest.yaml`

模板框架 = Scaffold 真实文件 + Blueprint EJS 模板 + 规则配置

```yaml
# templates/react-feature-modular/manifest.yaml

name: react-feature-modular
description: "React 按功能模块化拆分，Folder/index.tsx + index.less"
adapter: react                            # 对应哪个 Adapter

# ── 文件组织规范 ──
fileOrganization:
  page:
    baseDir: src/pages
    dirNaming: PascalCase
    entryFile: index.tsx
    styleFile: index.less
  component:
    dir: components                       # 相对于页面目录
    filePattern: folder                   # folder = ComponentName/index.tsx + index.less
    entryFile: index.tsx
    styleFile: index.less
  hook:
    dir: hooks                            # 相对于页面目录
    fileNaming: camelCase                 # useMessages.ts
  service:
    dir: src/services                     # 项目全局
    groupBy: domain                       # 按领域分文件
  types:
    dir: types                            # 相对于页面目录
    entryFile: index.ts

# ── 拆分规则 ──
splitting:
  component:
    minDescendantsToSplit: 6             # 后代节点超过 6 个 → 拆组件
    splitRepeatTemplate: true            # repeat 的 template → 独立组件
    splitInteractiveRegions: true        # 有事件+子节点 > 2 → 拆
    splitNamedContainers: true           # 有语义 name 的容器 → 拆
  hook:
    minActionsToSplit: 3                 # event handler 有 3+ 个 action → 拆 hook
    splitDataFetching: true              # 每个 API dataSource → 独立 hook

# ── 代码风格 ──
codeStyle:
  component:
    declaration: function                # function XxxPage() {} 而不是 arrow
    export: named                        # export function 而不是 export default
    propsStyle: destructured             # ({ prop1, prop2 }: Props)
  state:
    pattern: useState                    # useState | zustand | redux-toolkit
  hook:
    returnStyle: object                  # return { data, loading, ... }
  logic:
    async: async-await
    handlerNaming: handleXxx             # handleSendClick
    guardStyle: early-return             # if (!cond) return;
  style:
    preprocessor: less
    modules: true                        # CSS Modules
    dynamicStrategy: inline-merge        # 动态样式用 inline style
  router:
    lib: react-router-v6
    lazyLoading: false
  service:
    httpClient: axios
    typing: interface
```

### 4. Scaffold 目录 — 真实的项目骨架

```
templates/react-feature-modular/scaffold/
├── vite.config.ts                 ← 真实文件，直接 copy
├── tsconfig.json                  ← 真实文件
├── .eslintrc.cjs                  ← 真实文件
├── .env                           ← 真实文件
├── index.html                     ← 真实文件（含 {{projectName}} 占位符）
├── package.json.tpl               ← 模板文件（.tpl 后缀 = 需要变量替换）
└── src/
    ├── main.tsx                   ← 真实文件
    ├── App.tsx                    ← 真实文件（或 .tpl，含 router import）
    ├── utils/
    │   └── request.ts             ← 真实文件
    └── styles/
        ├── global.less            ← 真实文件
        └── variables.less         ← 真实文件
```

**规则**：
- 无后缀扩展名的文件 → 直接 copy（不做任何处理）
- `.tpl` 后缀 → 读取后做变量替换（`{{projectName}}`、`{{routerImport}}`），输出时去掉 `.tpl`
- Scaffold 目录的完整文件树就是输出项目的基础骨架

### 5. Blueprint 模板 — EJS 代码片段

```
templates/react-feature-modular/blueprints/
├── page.tsx.ejs               ← 页面组件的代码模板
├── component.tsx.ejs          ← 子组件的代码模板
├── hook.ts.ejs                ← hook 的代码模板
├── service.ts.ejs             ← service 函数的代码模板
├── router.tsx.ejs             ← 路由配置的代码模板
└── types.ts.ejs               ← 类型定义的代码模板
```

示例 `page.tsx.ejs`：

```ejs
<% /* 页面组件模板 */ -%>
<%= imports %>

export function <%= componentName %>() {
<% for (const s of viewState) { -%>
  const [<%= s.name %>, set<%= s.pascalName %>] = useState(<%= s.defaultValue %>);
<% } -%>
<% for (const s of dataState) { -%>
  const [<%= s.name %>, set<%= s.pascalName %>] = useState<<%= s.type %>>(<%= s.defaultValue %>);
<% } -%>
<% if (hasNavigation) { -%>

  const navigate = useNavigate();
<% } -%>
<% if (onMount) { -%>

  useEffect(() => {
<%= onMount.body %>
  }, []);
<% } -%>
<% for (const handler of handlers) { -%>

  const <%= handler.name %> = <%= handler.isAsync ? 'async ' : '' %>() => {
<%= handler.body %>
  };
<% } -%>

  return (
<%= jsx %>
  );
}
```

**为什么用 EJS？**
- Adapter 生成的是代码片段（imports 字符串、handler body 字符串、JSX 字符串）
- Blueprint 模板负责把这些片段按照"代码怎么组织"的结构组装起来
- 想换一种组件写法（比如 arrow function）？只需改 blueprint 模板，不需要改 Adapter

### 6. Pipeline（编排器）— `src/pipeline.ts`

```typescript
/**
 * Pipeline 流程
 *
 * 输入: DesignProject (或单个 Screen[]) + 模板框架名
 * 输出: 完整的项目目录 (写入磁盘)
 */
async function generate(input: GenerateInput): Promise<GenerateOutput> {
  const { schema, templateName, outputDir } = input;

  // 1. 加载模板框架
  const template = loadTemplate(templateName);
  //    - 读取 manifest.yaml → 解析为 TemplateConfig
  //    - 定位 scaffold/ 和 blueprints/ 目录

  // 2. 初始化脚手架
  await copyScaffold(template.scaffoldDir, outputDir, { projectName: schema.name });
  //    - 遍历 scaffold/ 目录
  //    - 普通文件 → copy
  //    - .tpl 文件 → 替换变量 → 写入（去掉 .tpl）

  // 3. 获取 Adapter
  const adapter = getAdapter(template.config.adapter);  // "react" → ReactAdapter

  // 4. 逐 Screen 编译
  for (const screen of schema.screens) {
    // 4a. Parse: Schema → IR
    const ir = parse(screen);

    // 4b. Split: 按规则标记拆分点
    const splitPlan = split(ir, template.config.splitting);

    // 4c. Emit: 按 splitPlan 生成各文件
    //     对每个"拆出来的组件"→ adapter.emitComponent() → blueprint 渲染 → 写文件
    //     对每个"拆出来的 hook" → adapter.emitHook() → blueprint 渲染 → 写文件
    //     service → adapter.emitService() → blueprint 渲染 → 写文件
    //     styles → adapter.emitStyle() → 写文件
    //     page 主组件 → adapter.emitComponent(isPage=true) → blueprint 渲染 → 写文件
    await emitScreen(screen, ir, splitPlan, adapter, template, outputDir);
  }

  // 5. 生成路由文件
  const routerContent = adapter.emitRouter({ routes: ... });
  await renderBlueprint('router.tsx.ejs', { ... }, outputPath);

  // 6. 更新 package.json（追加根据 Screen 分析出的额外依赖）
  await patchPackageJson(outputDir, extraDeps);

  return { outputDir, fileCount: ... };
}
```

### 7. CLI — `src/cli.ts`

```bash
# 从本地 Schema JSON 文件生成
npx design-codegen generate --input ./schema.json --output ./my-app

# 从后端 API 拉取项目 Schema 生成
npx design-codegen generate --project-id 833478e8-... --output ./my-app

# 指定模板框架
npx design-codegen generate --input ./schema.json --output ./my-app --template react-feature-modular

# 列出可用模板
npx design-codegen templates

# 初始化配置文件
npx design-codegen init
```

配置文件 `codegen.config.yaml`（可选，放在项目根目录覆盖默认值）：

```yaml
template: react-feature-modular
output: ./generated

# 覆盖模板框架的部分规则
overrides:
  splitting:
    component:
      minDescendantsToSplit: 4        # 更激进的拆分
  codeStyle:
    state:
      pattern: zustand                # 换成 zustand
```

---

## Adapter 与 Blueprint 的分工

| 概念 | 谁负责 | 举例 |
|---|---|---|
| **"双向绑定用什么语法"** | Adapter | React: `value={x} onChange={e => setX(e.target.value)}` / Vue: `v-model="x"` |
| **"一个组件文件长什么样"** | Blueprint | function 声明？arrow？import 放哪？state 放哪？return 放哪？ |
| **"这个节点要不要拆成独立组件"** | Splitter + 规则配置 | `manifest.yaml` 里的 splitting rules |
| **"文件放哪、叫什么"** | FileOrganization 配置 | `manifest.yaml` 里的 fileOrganization |
| **"项目基础结构"** | Scaffold 目录 | `templates/xxx/scaffold/` 里的真实文件 |

```
Schema ──→ Parser ──→ IR ──→ Splitter(规则) ──→ SplitPlan
                                                     │
                                                     ▼
                                            Adapter(框架语法)
                                                     │
                                                     ▼
                                           Blueprint(组织结构)
                                                     │
                                                     ▼
                                              写入磁盘文件
```

---

## 以 Chat 页面为例的完整流程

### Input: Schema JSON（从设计软件导出/API 拉取）

### Step 1: Parse → IR

```
PageIR {
  name: "ChatAIConversation",
  slug: "chat",
  viewState: [{ name: "inputDraft", type: "string", default: "" }],
  dataState: [{ name: "messages", type: "Message[]", default: [] }],
  dataSources: [
    { id: "chat-list", method: "GET", path: "/chat/list", ... },
    { id: "chat-send", method: "POST", path: "/chat/send", params: ["text"], ... },
  ],
  rootNode: { tag: "div", children: [...], ... },
  handlers: [
    { name: "handleSendClick", trigger: "click", isAsync: true, guard: "inputDraft.length > 0", steps: [...] }
  ],
  onMount: { steps: [{ kind: "fetch", serviceName: "chatList", ... }] }
}
```

### Step 2: Split → SplitPlan

按 manifest.yaml 规则分析后：

```
SplitPlan {
  pageComponent: "ChatAIConversation",
  childComponents: [
    { name: "ChatHeader", node: ..., reason: "named-container" },
    { name: "MessageList", node: ..., reason: "repeat-item" },
    { name: "MessageBubble", node: ..., reason: "repeat-template" },
    { name: "ChatInputBar", node: ..., reason: "interactive-region" },
  ],
  hooks: [
    { name: "useMessages", reason: "data-fetching", dataSource: "chat-list" },
    { name: "useSendMessage", reason: "complex-handler", handler: "handleSendClick" },
  ],
  services: [
    { functionName: "chatList", dataSource: "chat-list", domain: "chat" },
    { functionName: "chatSend", dataSource: "chat-send", domain: "chat" },
  ],
  types: [
    { name: "Message", fields: [{name:"id",type:"string"}, {name:"role",type:"string"}, {name:"text",type:"string"}] }
  ]
}
```

### Step 3: Emit → 文件

按 fileOrganization 配置输出到磁盘：

```
my-app/                                 ← outputDir
├── vite.config.ts                      ← scaffold copy
├── tsconfig.json                       ← scaffold copy
├── package.json                        ← scaffold .tpl 渲染
├── index.html                          ← scaffold copy
├── src/
│   ├── main.tsx                        ← scaffold copy
│   ├── utils/request.ts               ← scaffold copy
│   ├── styles/global.less             ← scaffold copy
│   ├── router/index.tsx               ← blueprint router.tsx.ejs 渲染
│   ├── services/
│   │   └── chat.ts                    ← blueprint service.ts.ejs 渲染
│   └── pages/
│       └── ChatAIConversation/
│           ├── index.tsx              ← blueprint page.tsx.ejs 渲染
│           ├── index.less             ← adapter.emitStyle() 输出
│           ├── types/
│           │   └── index.ts           ← blueprint types.ts.ejs 渲染
│           ├── components/
│           │   ├── ChatHeader/
│           │   │   ├── index.tsx      ← blueprint component.tsx.ejs 渲染
│           │   │   └── index.less
│           │   ├── MessageList/
│           │   │   ├── index.tsx
│           │   │   └── index.less
│           │   ├── MessageBubble/
│           │   │   ├── index.tsx
│           │   │   └── index.less
│           │   └── ChatInputBar/
│           │       ├── index.tsx
│           │       └── index.less
│           └── hooks/
│               ├── useMessages.ts     ← blueprint hook.ts.ejs 渲染
│               └── useSendMessage.ts
```

---

## 如何新增一套模板框架

1. 创建 `templates/my-company-standard/` 目录
2. 写 `manifest.yaml`（配置规则 + 文件组织）
3. 放 `scaffold/`（真实的基础项目骨架）
4. 放 `blueprints/`（EJS 代码模板）
5. 运行 `npx design-codegen generate --template my-company-standard`

**不需要改任何引擎代码。** 模板框架是纯配置 + 文件，引擎按 manifest 规则执行。

## 如何新增一个目标框架（如 Vue）

1. 实现 `src/adapter/vue/index.ts`（实现 FrameworkAdapter 接口）
2. 创建 `templates/vue-composition-modular/` 模板目录
3. manifest.yaml 中声明 `adapter: vue`

---

## 建设顺序

| Phase | 交付 | 验收标准 |
|---|---|---|
| P0 | core/parser + core/expression-compiler | 能把真实 Schema JSON parse 为 IR |
| P1 | core/splitter + manifest.yaml 规则读取 | 能输出正确的 SplitPlan |
| P2 | adapter/react（全部 emit 方法）| 能输出所有类型的代码字符串 |
| P3 | blueprints EJS + scaffold 真实文件 | 模板文件就位 |
| P4 | pipeline 编排 + 写磁盘 | 端到端：Schema → 完整项目目录 |
| P5 | CLI | `npx design-codegen generate` 可用 |
| P6 | 对接后端 API 拉取 Schema | --project-id 模式可用 |
| P7 | 完善拆分规则 + 边界 case | 复杂页面也能正确生成 |

---

## 依赖

```json
{
  "dependencies": {
    "@globallink/design-schema": "workspace:*",
    "ejs": "^3.1.10",
    "yaml": "^2.4.0",
    "fs-extra": "^11.2.0",
    "commander": "^12.0.0",
    "prettier": "^3.3.0"
  }
}
```
