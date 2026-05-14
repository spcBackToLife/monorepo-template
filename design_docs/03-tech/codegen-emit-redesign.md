# Codegen Emit 阶段重新设计

## Context

当前 emit 阶段的根本问题：**每个文件的生成是孤立的，不知道整体上下文**。导致类型没 import、hook 和 page 重复逻辑、组件 props 类型是 unknown 等系统性问题。

需要从第一性原理重新设计 emit 阶段。

## 第一性原理分析

生成一个页面的代码，本质上是在做：

```
一个 Screen 的完整语义 → 一组相互引用的文件
```

关键洞察：**这不是"分别生成 N 个独立文件"，而是"生成一个文件集合，它们形成一个连贯的模块图"。**

文件之间的关系：
```
types/index.ts ← 定义所有类型
    ↑ import
services/chat.ts ← 使用类型作为返回值/参数
    ↑ import  
hooks/useMessages.ts ← 调用 service 函数，管理 state（有类型）
    ↑ import
components/MessageList/index.tsx ← props 用类型
    ↑ import
pages/Chat/index.tsx ← 使用 hooks，渲染 components
```

**所以正确的做法是：先规划整个模块图（文件清单 + 各文件需要什么 import + 各文件的内容），然后一次性输出。不是一个个文件独立生成。**

## 新设计：EmitPlan

在 SplitPlan 之后、实际写文件之前，增加一个 **EmitPlan** 阶段。EmitPlan 描述了所有文件、它们的路径、它们之间的 import 关系、以及每个文件需要 Adapter 生成的内容。

```
Pipeline Flow:

Schema → Parse → PageIR → Split → SplitPlan → Plan Emit → EmitPlan → Render → Files
                                                    ↑
                                              新增阶段：
                                              计算所有文件的
                                              路径 + imports + 内容上下文
```

### EmitPlan 数据结构

```typescript
/** 一个页面的完整发射计划 */
interface ScreenEmitPlan {
  /** 所有要生成的文件 */
  files: FileEmitPlan[];
}

interface FileEmitPlan {
  /** 输出路径 */
  outputPath: string;
  /** 使用哪个 pattern 模板 */
  pattern: string;  // "page.tsx.ejs" | "component.tsx.ejs" | "hook.ts.ejs" | ...
  /** 传给 pattern 模板的完整数据 */
  templateData: Record<string, unknown>;
}
```

关键设计：**templateData 包含了渲染该文件所需的 ALL 信息，包括完整的 import 列表。** import 列表在 EmitPlan 阶段就计算好了，不是在模板渲染时临时拼。

### 具体实现方案

#### 核心改造：`planScreenEmit()` 函数

```typescript
/**
 * 将 SplitPlan 转化为 EmitPlan
 * 
 * 这个函数的职责：
 * 1. 确定每个文件的输出路径
 * 2. 计算文件间的 import 关系
 * 3. 为每个文件准备完整的 template 数据
 */
function planScreenEmit(
  pageIR: PageIR,
  plan: SplitPlan,
  org: FileOrganization,
  adapter: FrameworkAdapter,
): ScreenEmitPlan {
  const pageName = pageIR.name;
  const files: FileEmitPlan[] = [];
  
  // ── Step 1: 确定所有文件路径 ──
  const paths = {
    types: pathResolver.resolveTypesEntry(pageName, org),
    services: plan.services.map(s => ({
      domain: s.domain,
      path: pathResolver.resolveServiceEntry(s.domain, org),
    })),
    hooks: plan.hooks.map(h => ({
      hookName: h.hookName,
      path: pathResolver.resolveHookEntry(pageName, h.hookName, org),
    })),
    components: plan.childComponents.map(c => ({
      componentName: c.componentName,
      entryPath: pathResolver.resolveComponentEntry(pageName, c.componentName, org),
      stylePath: pathResolver.resolveComponentStyle(pageName, c.componentName, org),
    })),
    page: {
      entryPath: pathResolver.resolvePageEntry(pageName, org),
      stylePath: pathResolver.resolvePageStyle(pageName, org),
    },
  };

  // ── Step 2: 确定类型名集合（所有文件共享） ──
  const typeNames = plan.types.map(t => t.typeName);  // ["Message", "ChatSendResponse", "ChatSendParams"]
  const typesImportPath = paths.types;  // "src/pages/Chat/types/index.ts"

  // ── Step 3: 生成各文件的 EmitPlan ──

  // 3a. Types file — 不依赖其他文件
  if (plan.types.length > 0) {
    files.push({
      outputPath: paths.types,
      pattern: 'types.ts.ejs',
      templateData: { types: plan.types },
    });
  }

  // 3b. Service files — import types
  for (const svc of plan.services) {
    const svcPath = paths.services.find(s => s.domain === svc.domain)!.path;
    // 计算 service 需要 import 的类型
    const usedTypes = svc.relatedTypes.filter(t => typeNames.includes(t));
    const typeImportPath = computeRelativeImport(svcPath, typesImportPath);
    
    files.push({
      outputPath: svcPath,
      pattern: 'service.ts.ejs',
      templateData: {
        typeImport: usedTypes.length > 0 
          ? `import type { ${usedTypes.join(', ')} } from '${typeImportPath}';`
          : '',
        functions: svc.functions.map(fn => ({...})),
      },
    });
  }

  // 3c. Hooks — import service + types，拥有明确的状态和逻辑
  for (const hook of plan.hooks) {
    const hookPath = paths.hooks.find(h => h.hookName === hook.hookName)!.path;
    
    // Hook 需要的 imports
    const imports: string[] = [];
    imports.push(adapter.getFrameworkImports({...}).join('\n'));
    
    // Import service function
    if (hook.dataSource) {
      const svcDomain = hook.dataSource.domain;
      const svcPath = paths.services.find(s => s.domain === svcDomain)!.path;
      const svcImport = computeRelativeImport(hookPath, svcPath);
      imports.push(`import { ${hook.dataSource.functionName} } from '${svcImport}';`);
    }
    
    // Import types
    const usedTypes = hook.stateVars
      .map(v => extractTypeName(v.type))
      .filter(Boolean)
      .filter(t => typeNames.includes(t));
    if (usedTypes.length > 0) {
      const typeImport = computeRelativeImport(hookPath, typesImportPath);
      imports.push(`import type { ${usedTypes.join(', ')} } from '${typeImport}';`);
    }

    files.push({
      outputPath: hookPath,
      pattern: 'hook.ts.ejs',
      templateData: {
        imports: imports.join('\n'),
        hookName: hook.hookName,
        stateDeclarations: hook.stateVars.map(v => 
          adapter.emitStateDeclaration(v)
        ).join('\n'),
        logic: hook.handler ? adapter.emitHandler(hook.handler) : '',
        fetchEffect: hook.dataSource ? ... : '',
        returnFields: hook.returnFields.join(', '),
      },
    });
  }

  // 3d. Components — import types + styles，接收 props
  for (const comp of plan.childComponents) {
    const compPath = paths.components.find(c => c.componentName === comp.componentName)!;
    
    const imports: string[] = [];
    imports.push(`import styles from './${org.component.styleFile}';`);
    
    // Import types used in props
    const usedTypes = comp.props
      .map(p => extractTypeName(p.type))
      .filter(Boolean)
      .filter(t => typeNames.includes(t));
    if (usedTypes.length > 0) {
      const typeImport = computeRelativeImport(compPath.entryPath, typesImportPath);
      imports.push(`import type { ${usedTypes.join(', ')} } from '${typeImport}';`);
    }

    files.push({
      outputPath: compPath.entryPath,
      pattern: 'component.tsx.ejs',
      templateData: {
        imports: imports.join('\n'),
        componentName: comp.componentName,
        propsInterface: comp.props.length > 0 ? generatePropsInterface(comp) : '',
        propsSignature: comp.props.length > 0 ? `{ ${comp.props.map(p => p.name).join(', ')} }` : '',
        jsx: adapter.renderTree(comp.node, 4),
      },
    });
    
    // Style file
    files.push({
      outputPath: compPath.stylePath,
      pattern: null,  // 直接输出，不用模板
      templateData: { content: generateLessFile(comp.node) },
    });
  }

  // 3e. Page component — import hooks + components + types + services + styles
  {
    const imports: string[] = [];
    
    // Framework imports
    imports.push(...adapter.getFrameworkImports({
      hasState: pageIR.viewState.length > 0 || pageIR.dataState.length > 0,
      hasEffect: !!pageIR.onMount,
      hasNavigation: hasNavigation(pageIR),
    }));
    
    // Service imports (only if page directly uses them, not through hooks)
    // ...
    
    // Hook imports
    for (const hook of plan.hooks) {
      const hookPath = paths.hooks.find(h => h.hookName === hook.hookName)!.path;
      const rel = computeRelativeImport(paths.page.entryPath, hookPath);
      imports.push(`import { ${hook.hookName} } from '${rel}';`);
    }
    
    // Component imports
    for (const comp of plan.childComponents) {
      const compEntry = paths.components.find(c => c.componentName === comp.componentName)!.entryPath;
      const rel = computeRelativeImport(paths.page.entryPath, compEntry);
      imports.push(`import { ${comp.componentName} } from '${rel}';`);
    }
    
    // Type imports
    // ...
    
    // Style import
    imports.push(adapter.emitStyleImport(`./${org.page.styleFile}`));

    files.push({
      outputPath: paths.page.entryPath,
      pattern: 'page.tsx.ejs',
      templateData: {
        imports: imports.join('\n'),
        pageName: pageIR.name,
        // 只包含 hook 没覆盖的状态
        stateDeclarations: ...,
        hookCalls: plan.hooks.map(h => `const { ${h.returnFields.join(', ')} } = ${h.hookName}();`).join('\n'),
        handlers: pageIR.handlers.filter(h => !isHandlerInHook(h, plan.hooks)).map(...),
        onMountEffect: ...,
        jsx: adapter.renderTree(plan.page.node, 4),
      },
    });
  }

  return { files };
}
```

### 关键设计决策

#### 1. Hook 和 Page 不重复逻辑

**规则：如果一个 handler 被拆到了 hook 里，page 不再重复定义它。**

```typescript
// Page 只定义没被 hook 拿走的 handlers
const pageHandlers = pageIR.handlers.filter(
  h => !plan.hooks.some(hook => hook.handler?.name === h.name)
);

// Page 通过 hook 的返回值使用被拆出去的逻辑
// const { messages, handleSendClick } = useChatSend();
```

#### 2. 每个文件的 imports 在 EmitPlan 阶段就完整计算

不再让模板或 adapter 自己算 import。EmitPlan 阶段掌握所有文件的路径信息，它来计算相对路径。

#### 3. 类型贯穿所有文件

Types 文件是"源头"，所有其他文件按需 import 它。EmitPlan 阶段知道每个文件用了什么类型（从 props type、state type、service return type 中提取），自动添加 import。

#### 4. Component 的 JSX 必须有根元素

Adapter 的 `renderTree` 保证输出的 JSX 总有一个根包裹元素。如果组件是 repeat 的 template，wrap 在 fragment 或 div 中。

## 需要重写的文件

1. **`src/pipeline.ts`** — `emitScreen()` 改为两步：`planScreenEmit()` + `renderEmitPlan()`
2. **`src/core/types.ts`** — 新增 `ScreenEmitPlan`、`FileEmitPlan` 类型；`HookSplit.stateVars` 改为带完整类型信息
3. **`src/core/splitter.ts`** — `HookSplit` 输出要包含完整的状态定义（type 从 page.dataState 获取）；`ServiceSplit` 要包含 relatedTypes
4. **`src/adapter/react/index.ts`** — `renderTree` 保证根元素存在；hook/component 生成不再自己算 import
5. **EJS 模板** — 简化，只负责骨架，所有 imports/内容由 templateData 提供

## 验证标准

生成代码满足：
1. 每个文件的 import 都正确指向真实路径
2. 类型文件定义了所有 interface，被其他文件 import
3. Hook 拥有自己管理的状态（带正确类型），不和 page 重复
4. Page 通过 `const { ... } = useXxx()` 使用 hook 返回值
5. Component 的 props interface 引用正确类型
6. Service 文件 import 自己使用的类型
7. 所有 JSX 组件有根元素
8. 生成项目 `tsc --noEmit` 无错误
