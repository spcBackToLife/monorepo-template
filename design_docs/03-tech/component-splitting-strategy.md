# 组件拆分策略改造方案（v2）

## 核心设计：声明式规则 + 函数式插件

```
templates/react-feature-modular/
├── framework.yaml              ← 声明式规则（阈值、开关）
└── splitting/                  ← 函数式策略（JS/TS 文件，任意逻辑）
    ├── index.ts                ← 策略注册表（声明启用哪些 + 顺序 + 参数）
    ├── repeat-container.ts     ← 策略：列表容器拆分
    ├── deep-nesting.ts         ← 策略：嵌套过深拆分
    ├── many-children.ts        ← 策略：子节点过多拆分
    └── interactive-region.ts   ← 策略：交互区域拆分
```

**规则**：
- 简单阈值类规则 → 在 `framework.yaml` 里声明（`maxDepth: 5`）
- 需要函数逻辑判断的复杂规则 → 在 `splitting/` 目录下写 `.ts` 文件
- 两者统一注册在 `splitting/index.ts`，引擎按注册顺序依次执行

---

## 一、策略接口定义

```typescript
// src/core/types.ts — 新增

/**
 * 拆分策略接口
 * 
 * 每个策略是一个函数：接收节点 + 上下文 → 返回是否应该拆分
 * 策略可以访问节点的任何数据做判断
 */
export interface SplitStrategy {
  /** 策略名称（唯一标识） */
  name: string;
  
  /** 策略描述 */
  description?: string;
  
  /**
   * 判断函数：给定一个节点和上下文，决定是否拆分
   * 
   * @returns 返回 reason string 表示应该拆，返回 null 表示不拆
   */
  evaluate(node: NodeIR, context: SplitContext): string | null;
}

/** 策略执行时的上下文信息 */
export interface SplitContext {
  /** 当前节点在树中的深度 (根 = 0) */
  depth: number;
  /** 父节点 */
  parent?: NodeIR;
  /** 整个页面 IR（可以访问全局信息） */
  page: PageIR;
  /** 策略参数（从 framework.yaml 或 index.ts 传入） */
  params: Record<string, unknown>;
}
```

---

## 二、策略注册表（templates 内）

```typescript
// templates/react-feature-modular/splitting/index.ts
//
// 策略注册表：声明启用哪些策略 + 执行顺序 + 参数
// 引擎加载此文件，按顺序执行每个策略

import type { SplitStrategy } from '@globallink/design-codegen';
import { repeatContainer } from './repeat-container';
import { deepNesting } from './deep-nesting';
import { manyChildren } from './many-children';
import { interactiveRegion } from './interactive-region';

/**
 * 策略列表（按优先级从高到低排列）
 * 
 * 节点匹配第一个命中的策略即停止（不会重复匹配）
 * 新增策略：写一个 .ts 文件，实现 SplitStrategy，加到这里即可
 */
export const strategies: SplitStrategy[] = [
  // 列表容器：有 repeat 的节点 → template 拆为独立组件
  repeatContainer,

  // 嵌套过深：DOM 层级超过阈值
  deepNesting,

  // 子节点过多：直接子节点超过阈值
  manyChildren,

  // 交互区域：有事件 + 多子节点
  interactiveRegion,
];

/** 策略默认参数（可被 framework.yaml 覆盖） */
export const defaultParams: Record<string, unknown> = {
  maxDepth: 5,
  maxDirectChildren: 6,
  minDescendantsToSplit: 8,
};
```

---

## 三、具体策略实现示例

### `splitting/repeat-container.ts`

```typescript
import type { SplitStrategy, NodeIR, SplitContext } from '@globallink/design-codegen';

/**
 * 列表容器策略：
 * 有 repeat 绑定的节点 → 其 template 应该拆为独立组件
 */
export const repeatContainer: SplitStrategy = {
  name: 'repeat-container',
  description: '列表容器的 template 拆为独立组件',

  evaluate(node: NodeIR, ctx: SplitContext): string | null {
    if (node.repeat) {
      return 'repeat-template';
    }
    return null;
  },
};
```

### `splitting/deep-nesting.ts`

```typescript
import type { SplitStrategy, NodeIR, SplitContext } from '@globallink/design-codegen';

/**
 * 嵌套过深策略：
 * 从当前节点往下数，如果子树最大深度超过阈值 → 拆分
 */
export const deepNesting: SplitStrategy = {
  name: 'deep-nesting',
  description: 'DOM 嵌套层级过深时拆分',

  evaluate(node: NodeIR, ctx: SplitContext): string | null {
    const maxDepth = (ctx.params.maxDepth as number) || 5;
    const nodeDepth = getMaxChildDepth(node);
    
    if (nodeDepth > maxDepth) {
      return 'depth-exceeded';
    }
    return null;
  },
};

function getMaxChildDepth(node: NodeIR, current = 0): number {
  if (node.children.length === 0) return current;
  return Math.max(...node.children.map(c => getMaxChildDepth(c, current + 1)));
}
```

### `splitting/many-children.ts`

```typescript
import type { SplitStrategy, NodeIR, SplitContext } from '@globallink/design-codegen';

/**
 * 子节点过多策略：
 * 直接子节点数量超过阈值 → 拆分
 */
export const manyChildren: SplitStrategy = {
  name: 'many-children',
  description: '直接子节点超过阈值时拆分',

  evaluate(node: NodeIR, ctx: SplitContext): string | null {
    const max = (ctx.params.maxDirectChildren as number) || 6;
    
    if (node.children.length > max) {
      return 'children-exceeded';
    }
    return null;
  },
};
```

### `splitting/interactive-region.ts`

```typescript
import type { SplitStrategy, NodeIR, SplitContext } from '@globallink/design-codegen';

/**
 * 交互区域策略：
 * 节点自身有事件绑定 + 子节点数 > 2 → 视为独立交互区域
 */
export const interactiveRegion: SplitStrategy = {
  name: 'interactive-region',
  description: '有事件且子节点较多的交互区域拆分',

  evaluate(node: NodeIR, ctx: SplitContext): string | null {
    if (node.events.length > 0 && node.children.length > 2) {
      return 'interactive-region';
    }
    return null;
  },
};
```

---

## 四、framework.yaml 中的策略参数

```yaml
# templates/react-feature-modular/framework.yaml

splitting:
  # 三级优先级（固定逻辑，不可配）
  respectExplicitBoundary: true      # Level 1: componentBoundary 标记
  respectComponentAssets: true       # Level 2: component:xxx 资产引用

  # Level 3 策略参数（传给 splitting/ 目录下的函数）
  params:
    maxDepth: 5                      # deep-nesting 策略的阈值
    maxDirectChildren: 6             # many-children 策略的阈值
    minDescendantsToSplit: 8         # 后代总数阈值（如果有策略需要）

  # 启用的策略列表 + 顺序（引用 splitting/ 目录下的文件名）
  # 如果不配置此字段，默认使用 splitting/index.ts 的导出
  # 如果配置，可以选择性禁用或调整顺序
  enabledStrategies:
    - repeat-container
    - deep-nesting
    - many-children
    - interactive-region
```

---

## 五、引擎 Splitter 的改造

```typescript
// src/core/splitter.ts — 核心逻辑改造

import type { SplitStrategy, SplitContext, NodeIR, PageIR, SplittingRules } from './types';

/**
 * 加载策略：从 templates/{name}/splitting/ 目录动态导入
 */
async function loadStrategies(templateDir: string, rules: SplittingRules): Promise<SplitStrategy[]> {
  const splittingDir = join(templateDir, 'splitting');
  
  if (existsSync(join(splittingDir, 'index.ts')) || existsSync(join(splittingDir, 'index.js'))) {
    // 动态导入策略注册表
    const mod = await import(join(splittingDir, 'index'));
    let strategies: SplitStrategy[] = mod.strategies || [];
    
    // 如果 yaml 里配了 enabledStrategies，按它过滤 + 排序
    if (rules.enabledStrategies) {
      strategies = rules.enabledStrategies
        .map(name => strategies.find(s => s.name === name))
        .filter(Boolean) as SplitStrategy[];
    }
    
    return strategies;
  }
  
  // 没有 splitting/ 目录 → 返回空（不做规则推断拆分）
  return [];
}

/**
 * 改造后的 shouldSplit —— 三级优先级
 */
function shouldSplit(
  node: NodeIR,
  context: SplitContext,
  strategies: SplitStrategy[],
  rules: SplittingRules,
): string | null {
  
  // ═══ Level 1: 显式标记（最高优先级）═══
  if (rules.respectExplicitBoundary !== false && node.componentBoundary) {
    return 'explicit-boundary';
  }

  // ═══ Level 2: 已沉淀的组件资产 ═══
  if (rules.respectComponentAssets !== false && node.isComponentInstance) {
    return 'component-asset';
  }

  // ═══ Level 3: 策略函数依次执行 ═══
  for (const strategy of strategies) {
    const reason = strategy.evaluate(node, context);
    if (reason !== null) {
      return reason;
    }
  }

  return null;
}
```

---

## 六、扩展方式

### 场景 A：新增一个简单阈值规则

只需在 `framework.yaml` 的 `params` 里加一个参数，然后在已有策略函数里引用：

```yaml
params:
  maxEventCount: 5    # 新增：事件数超过 5 个 → 拆
```

```typescript
// 在 interactive-region.ts 中扩展
evaluate(node, ctx) {
  const maxEvents = (ctx.params.maxEventCount as number) || 5;
  if (node.events.length > maxEvents) return 'too-many-events';
  // ...
}
```

### 场景 B：新增一个全新的复杂策略

1. 在 `templates/xxx/splitting/` 下新建文件：

```typescript
// splitting/form-container.ts
export const formContainer: SplitStrategy = {
  name: 'form-container',
  description: '包含多个表单元素的容器拆为 Form 组件',

  evaluate(node, ctx) {
    // 复杂逻辑：统计子树中有多少个 bind 节点
    const bindCount = countBindsInSubtree(node);
    if (bindCount >= 3) {
      return 'form-container';
    }
    return null;
  },
};
```

2. 在 `splitting/index.ts` 中注册：

```typescript
import { formContainer } from './form-container';

export const strategies = [
  repeatContainer,
  formContainer,      // ← 新增
  deepNesting,
  manyChildren,
  interactiveRegion,
];
```

**不需要改引擎代码。** 引擎从 `templates/xxx/splitting/` 动态加载。

### 场景 C：企业自定义策略

复制一份 template 目录 → 修改 `splitting/` 里的文件 → 调整 `framework.yaml` 里的参数 → 完成。

```
templates/my-company/
├── framework.yaml
├── scaffold/
├── patterns/
└── splitting/                  ← 企业自定义策略
    ├── index.ts
    ├── repeat-container.ts     ← 复用默认
    ├── company-card.ts         ← 企业特有：识别公司的 Card 组件模式
    └── biz-module.ts           ← 企业特有：业务模块边界识别
```

---

## 七、与声明式的关系

| 类型 | 定义位置 | 能力范围 | 适用场景 |
|---|---|---|---|
| **声明式参数** | `framework.yaml` 的 `splitting.params` | 阈值、开关、简单配置 | `maxDepth: 5`、`maxDirectChildren: 6` |
| **函数式策略** | `templates/xxx/splitting/*.ts` | 任意 JS 逻辑 | 复杂判断、组合条件、子树分析 |
| **启用/顺序控制** | `framework.yaml` 的 `enabledStrategies` | 选择启用哪些策略 + 执行顺序 | 企业定制时禁用/增加/重排策略 |

```
framework.yaml (配什么参数、启用什么策略)
       │
       ▼
splitting/index.ts (注册策略 + 默认参数)
       │
       ▼
splitting/*.ts (每个策略的具体逻辑)
       │
       ▼
引擎 Splitter (加载策略 → 按序执行 → 取第一个命中的)
```

---

## 八、实施步骤

| 步骤 | 改动范围 | 内容 |
|---|---|---|
| 1 | `design-schema` | `ComponentNode` 新增 `componentBoundary?: boolean` |
| 2 | `design-operations` + MCP | `element.add` 新增 `componentBoundary` 可选参数 |
| 3 | `design-codegen/src/core/types.ts` | 新增 `SplitStrategy`、`SplitContext` 接口 |
| 4 | `design-codegen/src/core/splitter.ts` | 改为三级优先级 + 动态加载策略 |
| 5 | `templates/react-feature-modular/splitting/` | 创建策略文件目录 + 4 个默认策略 |
| 6 | `framework.yaml` | 新增 `splitting.params` + `enabledStrategies` |
| 7 | `design-codegen/src/core/parser.ts` | 传递 `componentBoundary` + `isComponentInstance` |
| 8 | `AI_RULES.md` | 新增 `componentBoundary` 决策指引 |
