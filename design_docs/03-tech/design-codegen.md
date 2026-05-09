# design-codegen — Schema → 产物 编译引擎

> **包名：** `@globallink/design-codegen` · **运行环境：** Node.js (CLI / Server)
>
> **核心理念：Schema 是对产品逻辑的完备形式化描述，Codegen 是确定性编译器。产物不只是代码——PRD、变更日志、类型定义都是产物。**
>
> 相关文档：[整体架构](./architecture.md) | [design-schema](./design-schema.md) | [design-operations](./design-operations.md)

---

## 一、设计哲学

### 这是编译，不是生成

```
高级语言 (Schema)  ──确定性映射──→  目标产物 (Code / PRD / Changelog / Types)
```

- **输入确定 → 输出确定**：同一份 Schema 永远产出同一份产物
- **零边际成本**：编译 1000 个页面和 1 个页面的运行成本相同
- **可测试**：每种转换规则都可以单元测试覆盖
- **不消耗 token**：纯计算，不依赖 LLM（AI 仅在 diff 摘要等辅助场景使用）

### 产物矩阵

Schema 是唯一的"源码"，所有产物都是它的投影：

```
                    ┌→ React / Vue / Flutter 代码（上线运行）
                    │
Schema ─────────────┼→ PRD 文档（产品需求说明）
                    │
                    ┼→ 变更日志（版本 diff 摘要）
                    │
                    ├→ API 文档（接口规格）
                    │
                    └→ 测试用例（交互场景）
```

### Template 的真正含义

Template **不是** "选择哪个 UI 组件库"，而是：**代码怎么写、怎么拆文件、怎么组织目录的规范定义。**

一个 Template Framework = 一套完整的工程规范，它回答：
- 一个页面拆成几个文件？
- 组件内聚还是按职责分层？
- hook 怎么抽？放哪？
- service 函数怎么组织？
- types 怎么定义怎么放？
- 什么逻辑该抽成 util？

---

## 二、产物类型

### 2.1 代码产物（主要产物）

React / Vue / Flutter 等可运行代码，详见后续章节。

### 2.2 PRD 产物

Schema 完整描述了产品逻辑，可确定性地转化为结构化 PRD：

```markdown
# Chat - AI Conversation 页面 PRD

## 页面概述
聊天对话页面，用户与 AI 音乐助手进行实时对话交互。

## 数据模型
- messages: Message[] — 聊天消息列表
  - id: string
  - role: "user" | "assistant"
  - text: string

## 页面状态
- inputDraft: string — 输入框当前草稿文本（默认为空）

## 交互逻辑

### 页面进入时
- 调用 GET /chat/list 获取历史消息
- 将返回数据写入 messages

### 发送消息
- 触发条件：输入框内容长度 > 0
- 调用 POST /chat/send，传参 { text: 当前输入内容 }
- 成功后：
  1. 追加用户消息到列表
  2. 追加 AI 回复到列表
  3. 清空输入框

### 返回导航
- 点击返回按钮 → 跳转到 Home 页面

## API 接口
| 接口 | 方法 | 路径 | 参数 | 返回 |
|---|---|---|---|---|
| 获取历史消息 | GET | /chat/list | - | Message[] |
| 发送消息 | POST | /chat/send | { text } | { userMessage, aiReply } |
```

转换规则：
- `stateInit.view` → 页面状态表
- `stateInit.data` → 数据模型定义
- `dataSources` → API 接口表
- `events` → 交互逻辑描述
- `repeat` → 列表展示说明
- `nav.go` → 页面跳转关系

### 2.3 版本 Diff + 变更日志

**Schema 有版本概念**（通过 design-operations 的事件溯源 + 快照），因此可以：

```
Schema V1 ──diff──→ Schema V2
                       │
                       ▼
              ┌──────────────────────────────┐
              │  确定性 diff 分析引擎          │
              │  (哪些节点增/删/改/移动)       │
              └──────────────┬───────────────┘
                             │
                   ┌─────────┼──────────┐
                   ▼         ▼          ▼
              结构化 diff   AI 摘要    代码 diff
              (机器可读)   (人类可读)  (增量更新)
```

**结构化 Diff（确定性，不消耗 token）**：
```json
{
  "version": { "from": "v1.2.0", "to": "v1.3.0" },
  "changes": [
    { "type": "node_added", "screen": "Chat", "node": "nd_xxx", "description": "新增语音输入按钮" },
    { "type": "style_changed", "screen": "Chat", "node": "nd_yyy", "props": ["background", "borderRadius"] },
    { "type": "event_added", "screen": "Chat", "node": "nd_zzz", "trigger": "click", "action": "effect.fetch" },
    { "type": "state_added", "screen": "Chat", "key": "isRecording", "scope": "view" },
    { "type": "datasource_added", "screen": "Chat", "id": "voice-send", "method": "POST" }
  ]
}
```

**AI 摘要（消耗 token，但仅在 diff 时用一次）**：
```markdown
## v1.3.0 变更日志

### Chat 页面
- 🆕 新增语音输入功能：长按麦克风按钮开始录音，松开发送
- 🎨 消息气泡圆角从 12px 调整为 16px
- 🔧 发送按钮增加 loading 状态，避免重复发送

### Home 页面
- 无变更
```

**代码增量更新**：基于结构化 diff，只重新生成变更涉及的文件，而非全量重编译。

---

## 三、Schema 完整语义模型

```
Screen
├── rootNode (组件树)
│   ├── type: "div" | "input" | "h3" | "p" | "img" | "button" ...
│   ├── styles: { CSS 属性对象 }
│   ├── props: { textContent, placeholder, src ... }
│   ├── children: [子节点...]
│   ├── events: [{ trigger, condition, actions }]
│   ├── states: [视觉状态 hover/pressed/disabled]
│   ├── bind: { path: "view.inputDraft" }  ← 双向绑定
│   ├── repeat: { expression, template }    ← 列表渲染
│   └── visible / locked / visibleWhen
├── stateInit
│   ├── view: { inputDraft: { defaultValue: "" } }   ← UI 临时态
│   └── data: { messages: [...] }                     ← 业务数据
├── dataSources
│   ├── { id, type:"api", endpoint:{method,path,body}, mock }
│   └── { id, type:"static", initial }
└── backgroundColor
```

---

## 四、模板框架引擎 (Template Framework Engine)

> 这是整个系统的核心：它不是"一个模板文件"，而是一套**完整的工程规范声明 + 分发引擎**。

### 4.1 核心问题

一个 Screen 的 Schema 可能包含：
- 20+ 个节点的组件树
- 3 个 view 状态
- 2 个 data 状态
- 2 个 dataSource (API)
- 5 个事件处理函数
- 1 个列表渲染

**问题：这些东西怎么拆分成工程级的多文件结构？**

不是全塞进一个文件。而是像正常工程师一样，按职责拆分（每个组件/页面 = 文件夹 + index.tsx + index.less）：
```
ChatAIConversation/
├── index.tsx                  ← 页面入口（只负责组装）
├── index.less                 ← 页面级样式
├── components/
│   ├── ChatHeader/
│   │   ├── index.tsx          ← 子组件
│   │   └── index.less         ← 子组件样式
│   ├── MessageList/
│   │   ├── index.tsx
│   │   └── index.less
│   ├── MessageBubble/
│   │   ├── index.tsx
│   │   └── index.less
│   └── ChatInputBar/
│       ├── index.tsx
│       └── index.less
├── hooks/
│   ├── useMessages.ts         ← hook：消息数据管理
│   └── useSendMessage.ts      ← hook：发送消息逻辑
└── types/
    └── index.ts               ← 类型定义
```

### 4.2 模板框架 = 脚手架 + 规则 + 写法

一个 Template Framework 是**完整的工程规范声明**，包含三大部分：

1. **Scaffold（脚手架）**：初始化一个基础项目结构（静态文件，不依赖 Schema）
2. **SplittingRules（拆分规则）**：告诉引擎怎么把 Schema 拆分成多文件
3. **CodePatterns（代码写法）**：每种代码具体怎么写

```typescript
interface TemplateFramework {
  name: string;                         // "react-feature-modular"
  description: string;                  // "React 按功能模块化拆分"

  // ── 1. 项目脚手架（初始化时一次性生成的基础结构）──
  scaffold: ProjectScaffold;

  // ── 2. 文件拆分规则（按 Schema 内容决定怎么拆文件）──
  splitting: SplittingRules;

  // ── 3. 代码写法模板（每种代码怎么写）──
  codePatterns: CodePatterns;

  // ── 4. 文件组织规范（文件怎么放、怎么命名）──
  fileOrganization: FileOrganization;

  // ── 5. 命名规范 ──
  conventions: NamingConventions;
}
```

### 4.2.1 Scaffold（脚手架）— 模板框架自带的基础项目结构

**脚手架是模板框架的一部分**。它定义了一个"空项目"应该长什么样——这些文件与 Schema 无关，是项目的固定骨架：

```typescript
interface ProjectScaffold {
  // 脚手架文件列表（模板文件，会被原样复制或简单变量替换）
  files: ScaffoldFile[];

  // 依赖声明
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;

  // 脚本命令
  scripts: Record<string, string>;
}

// 示例：react-feature-modular 的 scaffold
const scaffold: ProjectScaffold = {
  files: [
    // ── 构建配置 ──
    { path: "vite.config.ts",        template: "vite-react-template" },
    { path: "tsconfig.json",         template: "tsconfig-react-template" },
    { path: ".eslintrc.cjs",         template: "eslint-react-template" },
    { path: ".prettierrc",           template: "prettier-template" },

    // ── 入口文件 ──
    { path: "src/main.tsx",          template: "main-entry-template" },
    { path: "src/App.tsx",           template: "app-shell-template" },
    { path: "index.html",            template: "html-entry-template" },

    // ── 基础设施（不依赖 Schema，项目固定需要）──
    { path: "src/utils/request.ts",  template: "http-client-template" },
    { path: "src/router/index.tsx",  template: "router-shell-template" },  // 空壳，内容后续由引擎填充

    // ── 全局样式 ──
    { path: "src/styles/global.less",template: "global-styles-template" },
    { path: "src/styles/reset.less", template: "reset-styles-template" },
    { path: "src/styles/variables.less", template: "css-vars-template" },
  ],

  dependencies: {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0",
  },
  devDependencies: {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.4.0",
    "less": "^4.2.0",
  },
  scripts: {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
  },
};
```

**Pipeline 流程**：

```
Step 1: 初始化脚手架（scaffold）
        └── 生成固定骨架文件（vite.config / tsconfig / request.ts / global.less ...）

Step 2: 编译 Schema → 填充内容
        └── 生成页面组件 / hooks / services / router 内容 → 放入骨架对应位置
```

### 4.2.2 FileOrganization — 文件怎么放、怎么命名

这是你说的 `Folder/index.tsx` + `Folder/index.less` 组织方式的配置位置：

```typescript
interface FileOrganization {
  // ── 页面文件组织 ──
  page: {
    // 页面根目录
    baseDir: string;                    // "src/pages"
    // 页面目录命名
    dirNaming: "PascalCase" | "kebab-case" | "camelCase";
    // 页面入口文件名
    entryFile: string;                  // "index.tsx"
    // 页面样式文件名
    styleFile: string;                  // "index.less"
  };

  // ── 子组件文件组织 ──
  component: {
    // 相对于页面目录的位置
    dir: string;                        // "components"
    // 每个组件的文件组织方式
    filePattern: "folder" | "flat";
    // folder: ComponentName/index.tsx + ComponentName/index.less
    // flat:   ComponentName.tsx (样式写在页面样式文件或 inline)
    entryFile: string;                  // "index.tsx"（folder 模式下）
    styleFile: string;                  // "index.less"（folder 模式下）
  };

  // ── Hook 文件组织 ──
  hook: {
    dir: string;                        // "hooks"
    filePattern: "flat";                // hooks 通常不需要文件夹
    fileNaming: "camelCase";            // "useMessages.ts"
  };

  // ── Service 文件组织 ──
  service: {
    // 全局 service 目录（跨页面共享）
    dir: string;                        // "src/services"
    groupBy: "domain" | "screen";
  };

  // ── 类型文件组织 ──
  types: {
    dir: string;                        // "src/types" 或页面内 "types"
    scope: "global" | "page-local" | "both";
  };

  // ── 样式相关 ──
  style: {
    extension: ".less" | ".scss" | ".css" | ".module.css" | ".module.less";
    // 组件级样式是否用 CSS Modules
    cssModules: boolean;
    // 全局样式目录
    globalDir: string;                  // "src/styles"
  };
}
```

**你要的 `Folder/index.tsx` + `Folder/index.less` 模式，配置如下**：

```typescript
const fileOrg: FileOrganization = {
  page: {
    baseDir: "src/pages",
    dirNaming: "PascalCase",
    entryFile: "index.tsx",             // ← pages/Chat/index.tsx
    styleFile: "index.less",            // ← pages/Chat/index.less
  },
  component: {
    dir: "components",
    filePattern: "folder",              // ← 每个子组件也是文件夹形式
    entryFile: "index.tsx",             // ← components/MessageBubble/index.tsx
    styleFile: "index.less",            // ← components/MessageBubble/index.less
  },
  hook: {
    dir: "hooks",
    filePattern: "flat",
    fileNaming: "camelCase",            // ← hooks/useMessages.ts
  },
  service: {
    dir: "src/services",
    groupBy: "domain",
  },
  types: {
    dir: "types",
    scope: "page-local",               // ← 页面内 types/index.ts
  },
  style: {
    extension: ".less",
    cssModules: true,
    globalDir: "src/styles",
  },
};
```

**产出目录结构**：

```
src/
├── styles/                             ← scaffold 生成的全局样式
│   ├── global.less
│   ├── reset.less
│   └── variables.less
├── utils/                              ← scaffold 生成的基础设施
│   └── request.ts
├── services/                           ← 按 domain 聚合的 API（引擎填充）
│   └── chat.ts
├── router/                             ← 路由配置（引擎填充）
│   └── index.tsx
├── pages/                              ← 页面（引擎填充）
│   ├── WelcomeOnboarding/
│   │   ├── index.tsx                   ← 页面入口
│   │   ├── index.less                  ← 页面样式
│   │   └── components/
│   │       └── HeroSection/
│   │           ├── index.tsx
│   │           └── index.less
│   ├── HomeMusicAIHub/
│   │   ├── index.tsx
│   │   ├── index.less
│   │   ├── components/
│   │   │   ├── MusicCard/
│   │   │   │   ├── index.tsx
│   │   │   │   └── index.less
│   │   │   └── FeatureGrid/
│   │   │       ├── index.tsx
│   │   │       └── index.less
│   │   ├── hooks/
│   │   │   └── useMusicList.ts
│   │   └── types/
│   │       └── index.ts
│   └── ChatAIConversation/
│       ├── index.tsx                   ← 页面入口（纯组装）
│       ├── index.less                  ← 页面级样式
│       ├── components/
│       │   ├── ChatHeader/
│       │   │   ├── index.tsx
│       │   │   └── index.less
│       │   ├── MessageList/
│       │   │   ├── index.tsx
│       │   │   └── index.less
│       │   ├── MessageBubble/
│       │   │   ├── index.tsx
│       │   │   └── index.less
│       │   └── ChatInputBar/
│       │       ├── index.tsx
│       │       └── index.less
│       ├── hooks/
│       │   ├── useMessages.ts
│       │   └── useSendMessage.ts
│       └── types/
│           └── index.ts
├── App.tsx                             ← scaffold 生成
├── main.tsx                            ← scaffold 生成
├── vite.config.ts                      ← scaffold 生成
├── tsconfig.json                       ← scaffold 生成
└── package.json                        ← scaffold 生成 + 引擎追加依赖
```

### 4.2.3 完整 Pipeline: Scaffold 先行 → 引擎填充

```
┌──────────────────────────────────────────────────────────┐
│  Step 1: SCAFFOLD（一次性，与 Schema 无关）                 │
│                                                          │
│  读取 framework.scaffold → 生成基础骨架                    │
│  - vite.config.ts / tsconfig.json / .eslintrc            │
│  - src/main.tsx / src/App.tsx / index.html               │
│  - src/utils/request.ts                                  │
│  - src/styles/global.less / reset.less / variables.less  │
│  - package.json（基础依赖）                               │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Step 2: COMPILE（基于 Schema，按规则拆分 + 填充）          │
│                                                          │
│  对每个 Screen:                                           │
│  ├── 匹配 splitting rules → 决定拆成哪些文件              │
│  ├── 按 fileOrganization → 决定每个文件放哪、叫什么        │
│  ├── 按 codePatterns → 决定每个文件内的代码怎么写          │
│  └── emit → 写入对应位置                                  │
│                                                          │
│  全局:                                                    │
│  ├── 汇总所有 Screen → 生成 router/index.tsx              │
│  ├── 汇总所有 dataSource → 生成 services/*.ts             │
│  └── 追加 package.json 依赖（如果有额外需要）              │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Step 3: FORMAT & VALIDATE                               │
│                                                          │
│  - Prettier 格式化                                        │
│  - ESLint --fix                                          │
│  - tsc --noEmit（类型检查）                               │
└──────────────────────────────────────────────────────────┘
```

### 4.3 文件拆分规则 (SplittingRules)

**引擎如何决定"什么时候拆组件"？** 靠规则：

```typescript
interface SplittingRules {
  // ── 子组件拆分规则 ──
  component: {
    // 策略：什么时候把节点子树拆成独立组件
    splitWhen: ComponentSplitRule[];
    // 拆出去的组件放哪
    outputPath: string;                 // "components/{ComponentName}.tsx"
    // 组件 props 怎么推导
    propsStrategy: "explicit" | "passthrough";
  };

  // ── Hook 拆分规则 ──
  hook: {
    // 策略：什么时候把逻辑抽成 hook
    splitWhen: HookSplitRule[];
    // 放哪
    outputPath: string;                 // "hooks/use{Name}.ts"
  };

  // ── Service 拆分规则 ──
  service: {
    // 按什么维度聚合 service 函数
    groupBy: "domain" | "screen" | "single-file";
    outputPath: string;                 // "services/{domain}.ts"
  };

  // ── Types 拆分规则 ──
  types: {
    outputPath: string;                 // "types/{domain}.ts"
    // 类型推导策略
    inferFrom: "dataSource-response" | "stateInit-shape" | "both";
  };

  // ── Utils 拆分规则 ──
  utils: {
    // 什么逻辑抽成 util
    splitWhen: UtilSplitRule[];
    outputPath: string;                 // "@/utils/{name}.ts" (全局共享)
  };
}
```

**组件拆分规则示例**：

```typescript
const componentSplitRules: ComponentSplitRule[] = [
  {
    // 规则1: 有独立语义名称的容器节点 → 拆组件
    name: "named-container",
    match: (node) => node.name && node.children.length > 0,
    // 用节点的 name 属性作为组件名
    componentName: (node) => toPascalCase(node.name),
  },
  {
    // 规则2: repeat 的 template → 拆成列表项组件
    name: "repeat-item",
    match: (node) => node.repeat != null,
    componentName: (node) => `${toPascalCase(node.name || 'Item')}List`,
    // template 子树拆成 ItemComponent
    childComponent: (node) => `${toPascalCase(node.name || 'Item')}Item`,
  },
  {
    // 规则3: 子节点超过 N 个的容器 → 拆组件
    name: "complex-container",
    match: (node) => countDescendants(node) > 8,
    componentName: (node) => toPascalCase(node.name || inferName(node)),
  },
  {
    // 规则4: 有事件的交互区域 → 拆组件
    name: "interactive-region",
    match: (node) => node.events.length > 0 && node.children.length > 2,
    componentName: (node) => toPascalCase(node.name || inferName(node)),
  },
];
```

**Hook 拆分规则示例**：

```typescript
const hookSplitRules: HookSplitRule[] = [
  {
    // 规则1: effect.fetch + 相关状态 → useXxxData hook
    name: "data-fetching",
    match: (screen) => screen.dataSources.filter(ds => ds.type === 'api').length > 0,
    // 每个 dataSource 对应一个 hook（或相关联的合并为一个）
    hookName: (dataSource) => `use${toPascalCase(dataSource.name)}`,
    // hook 包含：fetch 函数 + 关联的 state + loading/error 状态
    includes: ["fetchFunction", "relatedState", "loadingState"],
  },
  {
    // 规则2: 复杂的 event handler（含 3+ actions）→ 抽 hook
    name: "complex-handler",
    match: (event) => event.actions.length >= 3,
    hookName: (event, node) => `use${toPascalCase(node.name)}${toPascalCase(event.trigger)}`,
  },
  {
    // 规则3: 多个节点共享同一状态 → 抽 hook
    name: "shared-state",
    match: (stateKey, references) => references.length > 2,
    hookName: (stateKey) => `use${toPascalCase(stateKey)}`,
  },
];
```

### 4.4 分发引擎 (Dispatch Engine)

引擎的工作流程：**遍历 Schema → 匹配规则 → 决定拆分 → 分发到对应模板**

```typescript
class DispatchEngine {
  constructor(private framework: TemplateFramework) {}

  compile(screen: ScreenSchema): GeneratedFileSet {
    // 1. 分析阶段：遍历 Schema，收集所有"可拆分点"
    const splits = this.analyze(screen);

    // 2. 分发阶段：按规则将 Schema 片段分发到不同模板
    const files: GeneratedFile[] = [];

    // 2a. 类型定义
    files.push(...this.emitTypes(splits.types));

    // 2b. Service 层
    files.push(...this.emitServices(splits.services));

    // 2c. Hooks
    files.push(...this.emitHooks(splits.hooks));

    // 2d. 子组件（自底向上，先生成叶子组件）
    files.push(...this.emitComponents(splits.components));

    // 2e. 页面主组件（组装层）
    files.push(this.emitPageComponent(screen, splits));

    // 2f. 样式文件
    files.push(...this.emitStyles(splits.styles));

    return { files, dependencies: splits.dependencies };
  }

  private analyze(screen: ScreenSchema): SplitResult {
    const result: SplitResult = { components: [], hooks: [], services: [], types: [], styles: [] };

    // 遍历组件树，逐层匹配拆分规则
    walkTree(screen.rootNode, (node, depth, parent) => {
      for (const rule of this.framework.splitting.component.splitWhen) {
        if (rule.match(node, { depth, parent, screen })) {
          result.components.push({ node, rule, componentName: rule.componentName(node) });
          break; // 一个节点只匹配一个组件规则
        }
      }
    });

    // 分析 hook 拆分
    for (const rule of this.framework.splitting.hook.splitWhen) {
      if (rule.match(screen)) {
        result.hooks.push(rule.extract(screen));
      }
    }

    // 分析 service 拆分
    for (const ds of screen.dataSources) {
      result.services.push({ dataSource: ds, domain: inferDomain(ds) });
    }

    // 分析类型推导
    result.types = this.inferTypes(screen);

    return result;
  }
}
```

### 4.5 以 Chat 页面为例：完整拆分产出

输入 Schema → 引擎匹配规则 → 拆分产出：

```
src/pages/ChatAIConversation/
├── index.tsx                    ← 页面入口（纯组装，无业务逻辑）
├── index.less                   ← 页面级样式
├── components/
│   ├── ChatHeader/
│   │   ├── index.tsx            ← 拆分原因：有语义名 + 含导航事件
│   │   └── index.less
│   ├── MessageList/
│   │   ├── index.tsx            ← 拆分原因：repeat 节点
│   │   └── index.less
│   ├── MessageBubble/
│   │   ├── index.tsx            ← 拆分原因：repeat.template 子树
│   │   └── index.less
│   └── ChatInputBar/
│       ├── index.tsx            ← 拆分原因：交互区域(bind + events)
│       └── index.less
├── hooks/
│   ├── useMessages.ts           ← 拆分原因：fetch + state 关联
│   └── useSendMessage.ts        ← 拆分原因：复杂 handler(3+ actions)
└── types/
    └── index.ts                 ← 从 dataSource 响应推导

src/services/
└── chat.ts                      ← 按 domain 聚合的 API 函数
```

**各文件的内容**：

```tsx
// ═══ src/pages/ChatAIConversation/index.tsx ═══
// 页面入口：纯组装，不含业务逻辑

import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInputBar } from './components/ChatInputBar';
import { useMessages } from './hooks/useMessages';
import { useSendMessage } from './hooks/useSendMessage';
import styles from './index.less';

export function ChatAIConversation() {
  const { messages } = useMessages();
  const { inputDraft, setInputDraft, handleSend } = useSendMessage();

  return (
    <div className={styles.root}>
      <ChatHeader />
      <MessageList messages={messages} />
      <ChatInputBar
        value={inputDraft}
        onChange={setInputDraft}
        onSend={handleSend}
      />
    </div>
  );
}
```

```tsx
// ═══ src/pages/ChatAIConversation/components/MessageBubble/index.tsx ═══
// 来自 repeat.template 的子树拆分

import type { Message } from '../../types';
import styles from './index.less';

interface MessageBubbleProps {
  item: Message;
}

export function MessageBubble({ item }: MessageBubbleProps) {
  return (
    <div
      className={styles.messageRow}
      style={{ flexDirection: item.role === 'user' ? 'row-reverse' : 'row' }}
    >
      <div
        className={styles.avatar}
        style={{
          background: item.role === 'user'
            ? 'linear-gradient(135deg, #f472b6, #fb923c)'
            : '#1f1f2e',
        }}
      />
      <div
        className={styles.bubble}
        style={{
          background: item.role === 'user'
            ? 'linear-gradient(135deg, #f472b6, #fb923c)'
            : 'rgba(255,255,255,0.08)',
          borderTopLeftRadius: item.role === 'user' ? '16px' : '4px',
          borderBottomRightRadius: item.role === 'user' ? '4px' : '16px',
        }}
      >
        <p className={styles.messageText}>{item.text}</p>
      </div>
    </div>
  );
}
```

```less
// ═══ src/pages/ChatAIConversation/components/MessageBubble/index.less ═══

.messageRow {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: flex-end;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bubble {
  padding: 12px 16px;
  max-width: 70%;
  border-top-right-radius: 16px;
  border-bottom-left-radius: 16px;
}

.messageText {
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  color: #ffffff;
}
```

```tsx
// ═══ src/pages/ChatAIConversation/hooks/useMessages.ts ═══
// 来自 hook 拆分规则：dataSource "chat-list" + state "data.messages"

import { useState, useEffect } from 'react';
import { chatList } from '@/services/chat';
import type { Message } from '../types';

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    chatList()
      .then(res => setMessages(res))
      .finally(() => setLoading(false));
  }, []);

  const appendMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  return { messages, setMessages, appendMessage, loading };
}
```

```tsx
// ═══ src/pages/ChatAIConversation/hooks/useSendMessage.ts ═══
// 来自 hook 拆分规则：复杂 handler（3+ actions）

import { useState } from 'react';
import { chatSend } from '@/services/chat';
import { useMessages } from './useMessages';

export function useSendMessage() {
  const [inputDraft, setInputDraft] = useState('');
  const { appendMessage } = useMessages();

  const handleSend = async () => {
    if (!(inputDraft.length > 0)) return;

    const result = await chatSend({ text: inputDraft });
    appendMessage(result.userMessage);
    appendMessage(result.aiReply);
    setInputDraft('');
  };

  return { inputDraft, setInputDraft, handleSend };
}
```

```tsx
// ═══ src/pages/ChatAIConversation/types/index.ts ═══
// 从 dataSource 的 mock responseBody 推导

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatSendResponse {
  userMessage: Message;
  aiReply: Message;
}
```

```tsx
// ═══ src/services/chat.ts ═══
// 按 domain 聚合（"chat-list" + "chat-send" 都是 chat 域）

import { request } from '@/utils/request';
import type { Message, ChatSendResponse } from '@/pages/ChatAIConversation/types';

export async function chatList(): Promise<Message[]> {
  return request({ method: 'GET', url: '/chat/list' });
}

export async function chatSend(params: { text: string }): Promise<ChatSendResponse> {
  return request({ method: 'POST', url: '/chat/send', data: { text: params.text } });
}
```

### 4.6 模板框架是可定制可替换的

同一份 Schema，换一套模板框架 = 换一种工程风格（脚手架 + 文件组织 + 代码写法全变）：

**模板 A: "react-feature-modular"（上面的例子）**
```
scaffold: vite + react + less + react-router
pages/Chat/
├── index.tsx (组装)
├── index.less
├── components/
│   ├── ChatHeader/index.tsx + index.less
│   └── MessageBubble/index.tsx + index.less
├── hooks/useMessages.ts
└── types/index.ts
```

**模板 B: "react-flat-simple"（小项目/快速原型）**
```
scaffold: vite + react + css
pages/Chat/
├── index.tsx (所有逻辑在一个文件)
└── index.css
```

**模板 C: "react-layer-separation"（大型团队/DDD 风格）**
```
scaffold: vite + react + less + zustand + react-router
src/
├── views/Chat/index.tsx              (纯 UI 展示层)
├── containers/Chat/index.tsx         (逻辑连接层)
├── domain/chat/
│   ├── hooks/useMessages.ts          (领域 hook)
│   ├── services/chat.ts              (API 层)
│   ├── models/message.ts             (领域模型)
│   └── store/chatStore.ts            (状态管理)
└── shared/utils/request.ts
```

**模板 D: "next-app-router"（Next.js App Router 风格）**
```
scaffold: next + tailwind + server-actions
app/
├── chat/
│   ├── page.tsx                      (Server Component 外壳)
│   ├── _components/
│   │   ├── ChatClient.tsx            (Client Component)
│   │   └── MessageList.tsx
│   ├── _actions/chat.ts             (Server Actions)
│   └── loading.tsx
```

**切换模板只需改配置，不需要修改 Schema**：

```yaml
# 只换这一行，整个产出结构就变了（包括脚手架骨架 + 文件组织 + 代码写法）
framework: react-feature-modular
# → 改为
framework: react-layer-separation
```

### 4.7 模板框架注册机制

```typescript
// 模板框架注册表
const frameworkRegistry = new Map<string, TemplateFramework>();

// 内置框架
frameworkRegistry.register('react-feature-modular', reactFeatureModular);
frameworkRegistry.register('react-flat-colocation', reactFlatColocation);
frameworkRegistry.register('react-layer-separation', reactLayerSeparation);
frameworkRegistry.register('next-app-router', nextAppRouter);
frameworkRegistry.register('vue-composition-modular', vueCompositionModular);

// 企业自定义框架（继承 + 覆盖）
const myCompanyFramework = extendFramework('react-feature-modular', {
  // 覆盖部分规则
  splitting: {
    hook: {
      splitWhen: [
        ...reactFeatureModular.splitting.hook.splitWhen,
        // 加一条企业规则：所有 fetch 必须用公司的 useRequest hook
        { name: "company-request", match: ..., hookName: ... },
      ]
    }
  },
  codePatterns: {
    service: {
      // 公司用 ofetch 而非 axios
      template: "ofetch-module",
      baseUrl: "import.meta.env.VITE_API_BASE",
    }
  }
});
frameworkRegistry.register('my-company', myCompanyFramework);
```

---

## 五、Code Patterns（代码写法模板）

模板框架中的 `codePatterns` 定义每种代码"怎么写"：

### 5.1 组件写法

```typescript
codePatterns: {
  component: {
    style: "function",              // "function" | "arrow" | "class"
    exportStyle: "named",           // "named" | "default"
    propsStyle: "destructured",     // "destructured" | "props-object"
    // 模板：
    // function → export function Xxx({ prop1, prop2 }: XxxProps) { ... }
    // arrow   → export const Xxx: FC<XxxProps> = ({ prop1, prop2 }) => { ... }
  },
```

### 5.2 状态写法

```typescript
  state: {
    pattern: "useState",            // "useState" | "zustand" | "redux-toolkit" | "valtio" | "jotai"
    // useState 模板：
    //   const [xxx, setXxx] = useState<Type>(defaultValue);
    // zustand 模板：
    //   export const useXxxStore = create<XxxState>((set) => ({ ... }));
  },
```

### 5.3 Hook 写法

```typescript
  hook: {
    returnStyle: "object",          // "object" | "tuple" | "named-tuple"
    // object → return { data, loading, error, refetch }
    // tuple  → return [data, { loading, error, refetch }]
    loadingPattern: "boolean",      // "boolean" | "status-enum" | "none"
    errorPattern: "try-catch",      // "try-catch" | "error-state" | "error-boundary"
  },
```

### 5.4 Service 写法

```typescript
  service: {
    httpClient: "axios",            // "axios" | "fetch" | "ky" | "ofetch"
    responseUnwrap: "data",         // 自动解包 response.data
    typingSource: "interface",      // "interface" | "zod" | "io-ts"
    // 产出模板：
    //   export async function chatSend(params: Params): Promise<Response> {
    //     return request({ method: 'POST', url: '/chat/send', data: params });
    //   }
  },
```

### 5.5 样式写法

```typescript
  style: {
    pattern: "less-modules",            // "less-modules" | "css-modules" | "tailwind" | "styled" | "inline" | "scss-modules"
    dynamicStrategy: "inline-merge",    // 动态样式处理策略
    classNaming: "camelCase",           // CSS Module 的 class 命名
    staticExtraction: true,             // 静态样式是否提取为 class
    extension: ".less",                 // 样式文件后缀
  },
```

### 5.6 路由写法

```typescript
  router: {
    pattern: "react-router-v6",     // "react-router-v6" | "next-pages" | "next-app" | "vue-router"
    pathStyle: "kebab-case",
    lazyLoading: true,              // 是否路由懒加载
  },
```

### 5.7 异步/逻辑写法

```typescript
  logic: {
    asyncPattern: "async-await",    // "async-await" | "promise-then"
    handlerNaming: "handleXxx",     // "handleXxx" | "onXxx"
    guardStyle: "early-return",     // "early-return" | "if-wrap"
    // early-return → if (!condition) return;
    // if-wrap     → if (condition) { ...all logic... }
  },
}
```

---

## 六、表达式编译器

Schema 中所有 `{{ ... }}` 表达式的编译规则：

| 表达式 | 上下文 | 产出 |
|---|---|---|
| `{{ state.view.inputDraft }}` | 任意 | `inputDraft` |
| `{{ state.data.messages }}` | 任意 | `messages` |
| `{{ item.role }}` | repeat template | `item.role` |
| `{{ item.role === 'user' ? A : B }}` | 动态值 | `item.role === 'user' ? A : B` |
| `{{ $last.userMessage }}` | onSuccess | `result.userMessage` |
| `{{ params.text }}` | endpoint.body | `params.text` |

```typescript
function compileExpression(raw: string, context: ExpressionContext): string {
  const inner = raw.replace(/^\{\{\s*|\s*\}\}$/g, '').trim();
  let result = inner
    .replace(/state\.view\.(\w+)/g, '$1')
    .replace(/state\.data\.(\w+)/g, '$1')
    .replace(/\$last\./g, 'result.');
  return result;
}
```

---

## 七、Adapter 层（跨框架适配）

Adapter 不改变语义逻辑，只改变代码语法：

| 概念 | React Adapter | Vue Adapter | Flutter Adapter |
|---|---|---|---|
| 双向绑定 | `value={x} onChange={...}` | `v-model="x"` | `controller + onChanged` |
| 列表渲染 | `{list.map(item => ...)}` | `v-for="item in list"` | `ListView.builder(...)` |
| 页面进入 | `useEffect(() => {}, [])` | `onMounted(() => {})` | `initState()` |
| 状态声明 | `useState(init)` | `ref(init)` | `setState(() => ...)` |
| 事件绑定 | `onClick={handler}` | `@click="handler"` | `onTap: handler` |
| 条件渲染 | `{cond && <Comp/>}` | `v-if="cond"` | `if(cond) Widget()` |
| 样式 | CSS / inline style | `<style scoped>` | `BoxDecoration / TextStyle` |

---

## 八、整体配置文件

```yaml
# codegen.config.yaml

# ══ 选择模板框架（决定脚手架 + 文件组织 + 拆分规则 + 代码写法）══
framework: react-feature-modular

# ══ 覆盖框架内的具体写法（可选，不写则用框架默认值）══
codePatterns:
  state: zustand                       # 覆盖默认的 useState → zustand
  service: axios-module
  style: less-modules
  router: react-router-v6
  logic:
    asyncPattern: async-await
    handlerNaming: handleXxx

# ══ 覆盖文件组织（可选）══
fileOrganization:
  page:
    entryFile: index.tsx
    styleFile: index.less
  component:
    filePattern: folder                # folder = ComponentName/index.tsx + index.less
    entryFile: index.tsx
    styleFile: index.less

# ══ 覆盖拆分规则阈值（可选）══
splitting:
  component:
    minDescendantsToSplit: 6
  hook:
    minActionsToSplit: 2               # 2+ actions 就拆 hook

# ══ 命名规范 ══
conventions:
  fileNaming: PascalCase
  componentNaming: PascalCase
  hookNaming: useCamelCase
  serviceNaming: camelCase
  dirNaming: PascalCase

# ══ 输出 ══
output:
  dir: ./generated
  typescript: true
  prettier: true

# ══ 产物选择 ══
artifacts:
  code: true
  prd: true
  changelog: true
  apiDocs: true
```

---

## 九、转换流水线 (Pipeline)

```
1. Load Config
   │  读取 codegen.config.yaml → 加载对应 TemplateFramework
   │
2. Scaffold（初始化基础项目骨架，与 Schema 无关）
   ├── 生成 vite.config.ts / tsconfig.json / .eslintrc
   ├── 生成 src/main.tsx / src/App.tsx / index.html
   ├── 生成 src/utils/request.ts
   ├── 生成 src/styles/global.less / reset.less / variables.less
   ├── 生成 package.json（基础依赖 + scripts）
   └── 生成 src/router/index.tsx（空壳，待后续填充）
   │
3. Load Schema
   │  读取项目所有 Screens 的完整 Schema
   │
4. Analyze（分析阶段）
   ├── 遍历每个 Screen 的组件树 → 匹配组件拆分规则 → 标记拆分点
   ├── 分析状态依赖图 → 匹配 hook 拆分规则
   ├── 收集 dataSources → 推导 service 分组
   ├── 解析 {{ expression }} → 标记静态/动态
   └── 推导类型定义 (从 mock/endpoint 推导)
   │
5. Split & Dispatch（拆分分发）
   │  按 SplittingRules 将 Schema 切分为：
   │  components[] / hooks[] / services[] / types[] / styles[]
   │  按 FileOrganization 确定每个产物的输出路径
   │
6. Emit（代码发射，填充到骨架中）
   ├── types → types/index.ts
   ├── services → src/services/{domain}.ts
   ├── hooks → hooks/{hookName}.ts
   ├── components → components/{Name}/index.tsx + index.less
   ├── page → pages/{Screen}/index.tsx + index.less
   └── router → 填充 src/router/index.tsx 的路由表
   │
7. Format & Validate
   ├── Prettier 格式化所有生成文件
   ├── ESLint --fix
   └── tsc --noEmit（可选：类型检查确保无错误）
```

---

## 十、版本 Diff 引擎

### 10.1 Schema 版本机制

Schema 通过 design-operations 的事件溯源保持版本历史：
- 每次编辑 = 一个 Operation（原子操作）
- 多次 Operation 可以打 tag（标记版本）
- 任意两个版本间可以计算 diff

### 10.2 结构化 Diff

```typescript
interface SchemaDiff {
  from: string;                        // 版本号/tag
  to: string;
  screens: ScreenDiff[];
}

interface ScreenDiff {
  screenId: string;
  screenName: string;
  changes: Change[];
}

type Change =
  | { type: "node_added"; nodeId: string; parentId: string; nodeType: string; name?: string }
  | { type: "node_removed"; nodeId: string; nodeType: string; name?: string }
  | { type: "node_moved"; nodeId: string; from: string; to: string }
  | { type: "style_changed"; nodeId: string; properties: string[] }
  | { type: "event_added"; nodeId: string; trigger: string; actionTypes: string[] }
  | { type: "event_removed"; nodeId: string; trigger: string }
  | { type: "event_changed"; nodeId: string; trigger: string; diff: string }
  | { type: "state_added"; key: string; scope: "view" | "data" }
  | { type: "state_removed"; key: string; scope: "view" | "data" }
  | { type: "datasource_added"; id: string; type: string; method?: string; path?: string }
  | { type: "datasource_removed"; id: string }
  | { type: "datasource_changed"; id: string; changedFields: string[] }
  | { type: "repeat_added"; nodeId: string; expression: string }
  | { type: "repeat_removed"; nodeId: string }
  | { type: "bind_changed"; nodeId: string; from?: string; to?: string };
```

### 10.3 用途

| 用途 | 方式 | 消耗 token |
|---|---|---|
| 结构化变更清单 | 确定性 diff 算法 | ❌ 不消耗 |
| 人类可读的变更日志 | AI 基于结构化 diff 做摘要 | ✅ 少量 |
| 增量代码更新 | 只重新编译受影响的文件 | ❌ 不消耗 |
| PRD diff | "相比上个版本，新增了 XX 功能" | ✅ 少量 |
| 代码 Review 辅助 | AI 解释代码变更的业务含义 | ✅ 少量 |

---

## 十一、建设路径

| Phase | 范围 | 核心交付 |
|---|---|---|
| **P0** | 单页面→单文件 | 组件树 + 样式 → 一个 .tsx + .css |
| **P1** | 文件拆分引擎 | SplittingRules + DispatchEngine |
| **P2** | 状态 + Hook 拆分 | state/hook 模板 + 自动拆分 |
| **P3** | 数据层 | service 拆分 + 类型推导 |
| **P4** | 列表 + 条件渲染 | repeat/visibleWhen 翻译 |
| **P5** | 多页面 + 路由 | 多 Screen → 多页面 + router |
| **P6** | 完整工程脚手架 | package.json / vite / tsconfig |
| **P7** | 模板框架注册 | 可切换/可定制的框架机制 |
| **P8** | PRD 产物 | Schema → 结构化 PRD 文档 |
| **P9** | 版本 Diff | 结构化 diff + AI 变更摘要 |
| **P10** | 多框架 Adapter | Vue / Flutter 适配 |

---

## 十二、验证策略

1. **Snapshot Testing**: 固定 Schema → 对比输出代码快照
2. **Build Validation**: `npm install && npm run build` 通过
3. **Visual Regression**: 生成代码渲染 vs 设计软件预览截图对比
4. **Template Swap Test**: 同一 Schema 切换模板框架，两种产出都能通过 build
5. **Diff Accuracy**: 已知变更的 Schema 版本对 → 验证 diff 输出正确性

---

**本质总结**：

```
Template Framework（一套完整的工程规范）
├── Scaffold           ← "空项目长什么样"（脚手架骨架文件）
├── FileOrganization   ← "文件怎么放、怎么命名"（Folder/index.tsx + index.less）
├── SplittingRules     ← "什么时候拆文件"（规则引擎）
├── CodePatterns       ← "代码怎么写"（状态/hook/service/组件 的写法模板）
└── Conventions        ← "命名规范"

引擎的工作 = 先立骨架(scaffold) → 再按规则拆分 Schema → 按模板生成代码 → 填入骨架
整套框架可替换 = 同一份 Schema，换一种工程风格，产出完全不同的项目结构
```
