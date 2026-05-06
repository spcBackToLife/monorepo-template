# AGENTS.md — 本仓库 Agent 编程约束（所有 AI 编码助手通用）

> 本文件是 **CodeBuddy / Cursor / Claude Code / Copilot** 等所有 AI 编码助手的统一规范。
> 若各引擎有专属文件（如 `CURSOR.md`、`CLAUDE.md`），内容须与本文件保持一致或为子集。

---

## 一、TypeScript 类型纪律（红线）

### 1.1 禁止 `any`

```typescript
// ❌ 错误
const data: any = fetchData();
function process(obj: any) { return obj.foo; }

// ✅ 正确：用具体类型、泛型、工具类型或 unknown + 收窄
interface ApiResponse<T> { code: number; data: T; }
async function fetchData<T>(): Promise<ApiResponse<T>> { /* ... */ }

// 不得已时用 unknown + typeof / in 守卫收窄
function safeProcess(obj: unknown): string {
  if (typeof obj === 'object' && obj !== null && 'foo' in obj) {
    return String((obj as Record<string, unknown>).foo);
  }
  throw new Error('Invalid shape');
}
```

**例外**（需注释说明理由）：
- 第三方库类型定义缺失且无法补充 `.d.ts` 时
- JSON 反序列化入口点在运行时校验之前

### 1.2 禁止类型断言 `as`（优先类型守卫/推断）

```typescript
// ❌ 错误：盲目断言，编译通过但运行时可能崩
const el = document.getElementById('foo') as HTMLInputElement;
const result = JSON.parse(str) as MyType;

// ✅ 正确：用类型守卫、Zod/Joi 校验、或泛型推断
const el = document.getElementById<HTMLInputElement>('foo');
// 或
function assertIsHTMLInputElement(el: Element): asserts el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) throw new TypeError('Expected input');
}

// JSON 场景：用 Zod 等 schema 校验
import { z } from 'zod';
const Schema = z.object({ name: z.string(), age: z.number() });
const result = Schema.parse(JSON.parse(str)); // 推断出正确类型
```

**例外**：
- DOM API 返回值断言（如 `as HTMLElement`）——但优先用泛型重载
- 测试代码中的 mock 数据构造

---

## 二、模块导入纪律（红线）

### 2.1 禁止动态 `import()`

```typescript
// ❌ 错误：动态 import，隐藏依赖关系、破坏 tree-shaking、增加调试难度
const api = await import('../../api-client.js');
const mod = await import('some-lib');

// ✅ 正确：静态 import 置于文件顶部
import { apiClient } from '../../api-client.js';
import * as someLib from 'some-lib';
```

**例外**（需 code review 批准）：
- 路由级懒加载（Next.js `dynamic import()` / React.lazy）
- 条件加载可选平台模块（且有 fallback）

### 2.2 导入顺序约定

```
1. Node 内置（'fs', 'path', ...）
2. 外部第三方包（'react', 'zod', ...）
3. 内部 workspace 包别名（@jarvis/*, @globallink/*）
4. 项目内相对路径（./, ../）
5. 类型-only 导入（import type）放对应分类末尾
```

---

## 三、问题解决方法论（核心哲学）

### 3.1 第一性原理驱动 — 禁止「打补丁式修复」

**原则**：每遇到一个问题，必须追溯到 **根本原因（root cause）**，从源头修复。

```
❌ 补丁思维（禁止）：
  "报错了 → 加个 try-catch → 又报错 → 再加个条件判断 → 越堆越乱"

✅ 第一性原理（必须）：
  "为什么这里会报错？→ 数据流哪一步产生的？→ 为什么会产生这个值？
   → 是类型定义不对？还是业务逻辑缺陷？还是架构设计问题？
   → 从根源修复 → 验证全链路"
```

**实践清单**：
1. **先定位根因**：用 debugger / log / type check 定位问题发生的精确位置
2. **理解完整数据流**：不要只看报错点，追踪数据从产生到消费的全路径
3. **评估修复方案**：列出所有可行方案，选择 **结构最简洁、覆盖最完整** 的
4. **不计短期成本**：即使重构范围大，只要是从根本上解决问题就执行
5. **验证无回归**：确认修复后没有引入新问题或破坏其他功能

### 3.2 禁止臆想和猜测

- 不确定的行为 → **查文档 / 读源码 / 写验证测试**，不要猜
- 不确定的类型 → **看 .d.ts / 用 infer 推导**，不要 `as any` 过去
- 不确定的数据格式 → **打日志看实际值**，不要假设

---

## 四、DRY 与抽象纪律

### 4.1 禁止重复实现

发现重复代码时，按以下优先级抽象：

| 重复模式 | 抽象方式 |
|----------|----------|
| 相同 JSX 结构 | 抽象 **组件**（纯 UI 组件优先函数组件） |
| 相同的状态操作逻辑 | 抽象 **Custom Hook** |
| 相同的数据转换逻辑 | 抽象 **工具函数 / 纯函数** |
| 相同的配置/常量模式 | 抽象 **工厂函数 / 配置对象** |
| 跨组件共享状态 | 用 Context / Zustand / Jotai 等状态管理 |

**判断标准**：相同或高度相似的逻辑出现 **≥ 2 次** 就必须抽象。

### 4.2 文件行数限制 — 单文件不超过 300 行

```
✅ 推荐：100-200 行（最佳可读性）
⚠️ 警告：200-300 行（可接受，考虑拆分）
❌ 禁止：> 300 行（必须拆分）
```

**拆分策略**：
- 多 handler → 按领域拆到独立文件
- 大组件 → 拆子组件 + 自定义 hook
- 工具函数集 → 按职责拆模块
- 类型定义 → 单独 types.ts / *.types.ts

### 4.3 函数复杂度限制

- 单函数不超过 **50 行**
- 嵌套层级不超过 **4 层**
- 单个函数参数不超过 **5 个**（超出则用 options 对象）

---

## 五、错误处理纪律

### 5.1 禁止空 catch / 吞错误

```typescript
// ❌ 错误
try { risky(); } catch (_) { /* ignore */ }

// ✅ 正确：至少记录原因
try {
  risky();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[module] risky() failed:', message);
  // 根据场景：向上抛出 / 返回 fallback / 重试
}
```

### 5.2 异步错误必须有边界

- 所有 async 函数的调用方必须 **await + catch** 或 **.catch()**
- React 组件中用 **ErrorBoundary** 包裹可能抛错的子树
- Express/Fastify 路由必须有 **统一错误处理中间件**

---

## 六、命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `use-auth-hook.ts`, `api-client.ts` |
| 组件名 | PascalCase | `UserAvatar.tsx`, `DataTable.tsx` |
| Hook 名 | camelCase + use 前缀 | `useAuth.ts`, `useDataSource.ts` |
| 工具函数 | camelCase 动词开头 | `formatDate()`, `parseSchema()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 接口/类型 | PascalCase + I 前缀(可选) 或直接描述 | `IUserInfo`, `ApiResponse<T>` |
| 私有方法/属性 | _ 前缀 | `_internalCalc()`, `_cache: Map` |
| boolean 变量 | is/can/has/should 前缀 | `isVisible`, `canEdit`, `hasError` |

---

## 七、Git & 提交纪律

### 7.1 提交信息规范

```
<type>(<scope>): <subject>

[optional body]

type: feat | fix | refactor | docs | style | test | chore | perf
scope: 文件/模块简写（如 canvas, mcp, schema, ui）
subject: 中文或英文，简短描述做了什么
```

### 7.2 禁止的提交行为

- 一个 PR 混合多个不相关改动（如"修 typo + 重构模块 + 加 feature"）
- 提交包含 `console.log` / debugger 残留
- 直接 push 到 main/master（必须走 PR）
- 提交信息为空或无意义（如 "update", "fix bug", "wip"）

---

## 八、项目特定红线（继承自 CURSOR.md）

以下规则来自本仓库的业务特性，与上述通用规范同等重要：

### 8.1 素材与画布能力必须通过 MCP 验证

凡涉及 **素材编辑器 / 画布几何 / 导出到设计节点**，**必须**走 **design-mcp** 工具链。禁止绕过 MCP 手写 SVG/PNG 再填 URL。

### 8.2 设计节点 ↔ 素材工程必须走素材槽

必须在 `node_material_slots` 上建立绑定。仅调用 `applyMaterialDesign` 写样式不算完成绑定。

### 8.3 槽位 cssTarget 与样式写入一致

应用/导出只按当前槽位的 `cssTarget` 写入 CSS，不得隐式修改槽位类型。

---

## 九、ESLint 配置建议（应同步更新）

当前 `.eslintrc.js` 中 `no-explicit-any` 为 `'off'`，**建议改为 `'error'`**：

```js
rules: {
  '@typescript-eslint/no-explicit-any': ['error', {
    // 以下场景允许（需注释说明）
    ignoreRestArgs: false,
  }],
  // 新增：禁止不必要的类型断言
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
}
```

---

> 最后更新：2026-05-06
> 维护者：@pikun
