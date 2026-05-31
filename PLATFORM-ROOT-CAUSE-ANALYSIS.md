# 平台根因分析：表达式系统的工程化欠债

> 起点：00-login demo 出现 PhoneError 不显示 / PolicyText 文案消失 / SubmitBtn 无反应
>
> 终点：意识到这不是"几个 bug"，是**整个表达式子系统从未被作为系统化工程对待**
>
> 作者：AI（pikun 协作）· 2026-05-31 · v0.2（按 pikun 反馈"不擦屁股、要从根因杜绝"重写）

---

## 0. 全文骨架

本文回答四个递进的问题：

1. **业界怎么做**？同类问题在工程界已有什么标杆方案？
2. **我们现在怎么做**？我们的实现处在什么状态？
3. **为什么会变成这样**？这种状态是怎么一步步演化出来的（根因层）？
4. **怎么从根上杜绝**？怎么让这件事永远不会再发生（机制层）？

最后才谈具体改造路线。**核心观点**：

> 我们不是「写漏了几个 bug」，是**「把表达式当成 string 来处理」**这个最初的抽象选错了。所有派生问题都是这个错误抽象的必然产物。

---

## 1. 业界怎么做？—— 三个量级、四个标杆

### 1.1 "运行时表达式"是个老问题，业界已分化出 4 类方案

| 类别 | 代表方案 | 表达力 | 安全性 | 学习成本 | 适用场景 |
|---|---|---|---|---|---|
| **A. 字符串 eval 派** | 早期 jQuery 模板 / 危险 `new Function()` | 极强（全 JS）| ❌ 极差（可执行任意代码）| 0（就是 JS） | 仅内部信任工具 |
| **B. JS 子集解释器派** | **Vue 模板表达式 / Formily / 我们当前方案** | 中（JS 子集，自己定义边界）| 中（自己实现沙盒）| 低（看着像 JS）| 前端 UI 引擎 |
| **C. 独立 DSL 派** | **Google CEL / JEXL / JSONata / SpEL / Aviator** | 中-高（精确定义的小语言）| ✅ 高（语言级保证）| 中（要学新语法）| K8s/Cloud 配置 / 规则引擎 / 后端服务 |
| **D. JSON 化派** | **JSON Logic / JSON Schema rules** | 低（嵌套对象表达逻辑）| ✅ 极高（无 parse 阶段）| 高（写起来像 LISP）| 跨语言规则下发 / 表单条件 |

### 1.2 标杆 1：Google CEL —— 工业级标准长什么样

CEL（Common Expression Language）是 Google 把这件事**做到极致**的版本：

> CEL is a non-Turing complete language designed for simplicity, speed, safety, and portability. CEL evaluates expressions in **nanoseconds to microseconds** with predictable costs.

**关键设计决策**：
1. **非图灵完备** —— 故意阉割（无循环、无递归、无函数定义），换来"任何表达式必定终止 + 可静态分析"
2. **三阶段架构**（这是教科书级别的设计）：
   ```
   Parse 阶段（编辑期/部署期一次）：text → AST
   Check 阶段（编辑期/部署期一次）：AST + Type Schema → typed AST + 错误清单
   Eval  阶段（运行期 N 次）：typed AST + 数据 → 结果
   ```
   **AST 进库存档，运行期不再 parse**——表达式从字符串变成了"可序列化数据结构"
3. **类型系统** —— 表达式有真正的静态类型（`bool` / `int` / `string` / `list<T>` / `map<K,V>` / 用户定义的 protobuf message），编辑期就能查出 `phone.length > "0"` 这种类型不匹配
4. **可扩展白名单** —— 内置函数集（`size()` / `matches()` / 时间/字符串）通过 declarations 显式注册，不允许调用未声明函数
5. **跨语言 SDK** —— Go / Java / TypeScript / Python，AST 是 protobuf，跨语言互通

**用在哪**：Kubernetes 的 ValidatingAdmissionPolicy / Istio 策略 / Cloud IAM Conditions / Firestore 安全规则。**亿级 QPS 场景的工业标准**。

### 1.3 标杆 2：Formily（阿里前端） —— UI 引擎的实用妥协

Formily 跟我们最像。它的处理是：

```ts
// Formily 的方式
{
  "x-component": "Input",
  "x-reactions": {
    "dependencies": ["form.values.country"],
    "fulfill": {
      "state": {
        "visible": "{{ $deps[0] === 'CN' }}"  // ← 字符串表达式
      }
    }
  }
}
```

- 用 `{{ }}` 包字符串（跟我们一样）
- **scope 显式声明**：`{{ }}` 内可见的变量、函数都通过 `scope` 注入（如 `$form`, `$deps`, 自定义 helper）
- **统一规约**：所有 `x-*` 字段的动态值都得用 `{{ }}`，不允许混
- **有官方文档** Scope 章节列清"什么能用、什么不能用"
- **没做编辑期 parse 校验**，运行时才报错（与 CEL 差距大）

**Formily 对应我们的状态**：业界中等水平。用着不出大事，但不是工业级。

### 1.4 标杆 3：JSONata —— 数据流领域的 DSL

```
$$.book[price > 30].title
```

完全独立 DSL（像 XPath/JsonPath 进化版），AST 100% 数据化。可视化编辑器都是基于 AST 拖出来的。**学习曲线陡，但一旦学会，工具链强大**。

### 1.5 标杆 4：JSON Logic —— 极端安全派

```json
{ "and": [
  { ">": [{ "var": "age" }, 18] },
  { "==": [{ "var": "country" }, "CN"] }
]}
```

**没有 parse 阶段** —— 表达式本身就是 JSON。代价是写起来反人类，但跨语言传输 / 数据库存储 / 可视化编辑天然友好。

### 1.6 业界共识：5 条不变的原则

不管 A/B/C/D 哪一派，工业级方案都遵守：

| 原则 | 含义 |
|---|---|
| **P1 表达式有自己的语法定义文档** | 不能让 user/AI 靠猜 |
| **P2 Parse 与 Eval 分离** | Parse 是编辑期/部署期一次性的，错误能在那时报出 |
| **P3 Scope 显式声明** | 表达式作用域里有什么变量、什么函数，是声明出来的，不是默认 JS 全局 |
| **P4 类型 / Schema 检查** | 至少能查"未知 identifier"、最好能查类型不匹配 |
| **P5 错误信息是结构化的** | 含 line/col/hint，不是 console.warn 一句话 |

**我们违反了这 5 条中的几条？答案是：5 条全部违反**。

---

## 2. 我们现在怎么做？—— 一份"半成品 B 派"的考古

### 2.1 类型层：Brand 类型，但只是个 `string`

```ts
// features/design-schema/src/types/expression.ts
export type Expression<T = unknown> = string & {
  readonly __brand: 'Expression';
  readonly __returns?: T;
};
```

**brand 是好的**——给了 TypeScript 一点点能力让 `Expression<boolean>` 跟 `string` 不同型。但本质仍是 `string`：
- ✅ TS 编译期：稍有保护
- ❌ 运行时：仍然是字符串
- ❌ Schema 序列化：JSON 里就是普通字符串
- ❌ Parse / Eval：每次运行时重新 parse（没缓存 AST）

### 2.2 Parser：手写、不完整、无规约文档

```ts
// features/design-engine/src/expression/Parser.ts
/**
 * 支持的语法（受限子集）：
 *   - 字面值：number / string / boolean / null / undefined
 *   - 标识符：state / item / index / parent / $last / $
 *   - 成员访问：a.b.c / a['b'] / arr[0]
 *   - 函数调用：$.length(x)
 *   - 一元、二元、三元、默认值
 *
 * 不支持：赋值、函数声明、循环、try/catch、globalThis/window/Function
 * 不支持：模板字面量、解构、扩展运算符、可选链
 */
```

**问题**：
- "支持/不支持" 写在**源码注释**里——SKILL 文档作者读不到、AI 训练数据接触不到、编辑器也读不到
- 关键 JS 子集**真的没支持**：
  - 正则字面量 `/^.../` ❌
  - 数组字面量 `[1,2,3]` ❌
  - 对象字面量 `{a:1}` ❌
  - 可选链 `a?.b` ❌
  - 数组方法 `arr.map()` ❌
- 全局对象**全部被禁**：`Date.now()` `Math.floor()` `Number()` 都跑不了
- 但 SKILL 模板里大量教 AI 写 `Date.now() + 30*60*1000` —— **教与做完全脱钩**

### 2.3 Evaluator：白名单识 6 个 identifier，违反则 swallowed

```ts
// features/design-engine/src/expression/Evaluator.ts
case 'identifier':
  if (ast.name === 'state') return ctx.state;
  if (ast.name === 'item') return ctx.item;
  if (ast.name === 'index') return ctx.index;
  if (ast.name === 'parent') return ctx.parent;
  if (ast.name === '$last') return ctx.$last;
  if (ast.name === '$') return ctx.$ ?? builtinFunctions;
  // 未定义的 identifier → undefined（不抛错）
  return undefined;
```

**问题**：
- "未知 identifier 静默返回 undefined" ——`globalView.x` 静默返 `undefined`，`Date.now()` 走 call 节点抛错被上层 swallow
- BuiltinFunctions 只有 9 个：`length` `upper` `lower` `format` `includes` `first` `last` `isEmpty` `not` `defaultTo` ——**完全不能覆盖业务需求**（没 now、没 matches、没数学运算）
- 没有 `Date` `Math` `Number` `String` 等 namespace

### 2.4 校验：zod 只校 string，不 parse

```ts
// features/design-schema/src/validators/expression.ts
export const ExpressionSchema = z
  .string()
  .regex(/\{\{[^}]+\}\}/, { message: 'expression must contain {{ ... }}' })
  .transform((s) => s as Expression);
```

zod 只查"是不是字符串 + 是否含 `{{ }}`"。**parseable / runnable 都没查**。

### 2.5 错误传播：3 处静默吞

| 位置 | 行为 | 后果 |
|---|---|---|
| `PreviewRenderer.shouldFireEvent` | 表达式抛错 → console.warn → **default return true** | 错误的 condition 当作满足 |
| `Dispatcher.run` 调用方 | async 不 await，错误进 unhandled rejection | 用户点了没反应 |
| `Reducer.setByPath` | 路径写错自动补字段 | 拼错 path 不报错 |

### 2.6 编辑器：纯 string `<input>`

`apps/design_front/.../ExpressionEditor` 是个普通输入框。无：
- 语法高亮
- 自动补全
- 实时 lint
- AST 可视化

### 2.7 AI/SKILL 协作：示例驱动 + 静默错误

SKILL 给的示例本身就**有错的**（用了 `/regex/` `Date.now()`），AI 看示例学习——schema 落库不报错——运行时静默吞——**永远学不会真正的语法子集**。

### 2.8 我们处在业界什么位置

把我们映射到 §1 的 5 条原则：

| 原则 | 我们 | 评分 |
|---|---|---|
| P1 语法定义文档 | 仅在 Parser.ts 注释里，且与实际不符（注释说支持的实际不支持，注释没说的实际抛错）| ❌ |
| P2 Parse 与 Eval 分离 | 每次运行时 parse；AST 不进库 | ❌ |
| P3 Scope 显式声明 | identifier 白名单硬编码在 Evaluator 里；运行时 ctx.state 等动态注入；AI 看不到 | ❌ |
| P4 类型 / Schema 检查 | 完全没有 | ❌ |
| P5 结构化错误 | console.warn + Error.message | ❌ |

**结论：我们在业界处于"A 派与 B 派之间的灰色地带"——既不是危险但灵活的 eval 派，也不是工业级的 B/C/D 派。是个**半成品**。**

---

## 3. 为什么会变成这样？—— 4 层根因（按时间顺序）

### 3.1 第 1 层：抽象起步时把"表达式"当成了"模板字符串"

最初的设计决策是：

> "我们要支持 `{{ state.x }}` 这种动态值，所以加一个 `Expression` 类型 = string + brand。"

**这个起点埋了所有后续问题**：
- 把"表达式"等价于"含模板的字符串" → 类型系统失去抓手
- 选 `string` 是因为 JSON 容易序列化 → 真正该序列化的是 **AST**
- brand 类型给人"已经类型安全了"的错觉 → 实际是空壳

类比：这就像**把 SQL 当成 string 处理而不是当成 AST 处理**——SQL 注入和我们这里的"语法不对静默错"是同源问题。

### 3.2 第 2 层：Parser/Evaluator 是为了"让 demo 能跑"快速堆出来的

读 Parser.ts 第 1-16 行注释能看出来：

```
/**
 * Expression Parser — 把 `{{ ... }}` 表达式字符串解析成 AST。
 * 支持的语法（受限子集）：
 *   - 字面值 / 标识符 / 成员访问 / 函数调用 / 一元 / 二元 / 三元
 * 不支持：赋值、函数声明、循环 ...
 */
```

**这是「说够用就够用」式的快速实现** ——
- 写的时候只想着"够 demo 用就行"
- 没立"这是 vM.N 版本的语言定义"的版本概念
- 没想"未来 AI 会写出我没设想过的语法"

### 3.3 第 3 层：演化期间，三方各加各的，没有共享真相

随着 SKILL 体系铺开 / 编辑器迭代 / AI 生成内容增多：

```
                  时间线
                    │
  v1: Parser 写出       SKILL 立项写示例       编辑器加输入框
       (只支持 X)       (示例用 Y 子集)        (任意填)
                    │              │              │
                    ↓              ↓              ↓
              X ⊂ JS子集      Y ⊂ JS子集      用户填 Z
              X ≠ Y ≠ Z；三方各看一面墙；没人对账
```

**这是 R3「无真相源」的本质**——不是"忘记建真相源"，是**没人意识到需要真相源**。因为类型系统给了"已经类型安全"的错觉。

### 3.4 第 4 层：错误反馈链是断的，所以问题永远暴露不出来

设想一个完整的反馈链应该是：

```
AI 写错表达式 → 落库时 lint 失败 → MCP 返回 hint → AI 看 hint 立刻改
              ↓
         SKILL 文档发现自己教错
              ↓
         平台维护者发现 Parser 应该扩展
```

我们的实际反馈链：

```
AI 写错表达式 → 落库成功（zod 通过）
              ↓
         运行时静默吞错
              ↓
         没人看到错
              ↓
         一年后 demo 跑起来才撞出来
```

**断链的根因不是"忘了建反馈"，是表达式从未被当作"需要反馈"的一等公民**。

### 3.5 4 层根因合起来 = 1 个元根因

> **元根因**：表达式被当成了"刚好用 string 装的 ad-hoc 实现细节"，而不是"平台的第二个 DSL（仅次于 schema 本身）"。
>
> 一切派生问题——类型空壳、Parser 残缺、Scope 隐式、错误吞噬、AI 学不会——都是这个抽象错位的必然产物。

类比：
- 数据库不会把"SQL 语句"当 string 存，会构造 AST → 我们不该把表达式当 string
- 编程语言不会让"未声明变量"静默返 undefined（除了 JS 这个反例），会编译期报错 → 我们的 Evaluator 也不该
- 工业级 DSL（CEL/JSONata）一定有版本号 + 规约文档 + 跨语言 AST → 我们一个都没有

---

## 4. 怎么从根上杜绝？—— 把表达式做成"平台第二 DSL"

### 4.1 心智模型转变

| 旧心智 | 新心智 |
|---|---|
| 表达式是"含 `{{ }}` 的字符串" | 表达式是**一段 AST**，字符串只是它的源码形态 |
| Parser 是"运行时工具" | Parser 是**编辑期 / 落库期工具**，AST 进库 |
| Scope 是"运行时注入的几个变量" | Scope 是**编辑期就声明好的语言契约** |
| 表达式语法 ≈ JS 子集 | 表达式语法 = **明确定义的小语言（Expression Language v1.0）** |
| AI 学表达式 = 看 SKILL 示例 | AI 学表达式 = 读**单一权威规约 + lint 反馈** |

### 4.2 为什么不直接抄 CEL？

CEL 是工业标杆，我们应该**借鉴其设计哲学**而非全盘照搬：

| 借鉴 | 不照搬的原因 |
|---|---|
| ✅ 三阶段架构（Parse/Check/Eval） | — |
| ✅ AST 进库 | — |
| ✅ 显式 Scope 声明 + 类型推导 | — |
| ✅ 非图灵完备（无循环/递归） | — |
| ❌ 完全独立语法（`size(x)` 不是 `x.length`） | 我们的表达式是 web 前端语境，写 `state.x.length` 比 `size(state.x)` 自然得多；AI 训练数据 95% 是 JS，不要刻意远离 |
| ❌ Protobuf AST | JSON AST 即可，我们是 web 体系 |
| ❌ 多语言 SDK | 我们只有 TS |

**结论**：我们要做"**JS 子集 + CEL 工程化**"——表面像 JS，工程内核像 CEL。

### 4.3 五大改造方向（按优先级）

#### 方向 1：立 **Expression Language v1.0 规约**（先这个，没它后面都白做）

这是**真相源**，不是文档而是**机读 + 人读 + 自动生成代码**的单一来源：

```jsonc
// features/design-schema/expression-lang/spec.json（新建）
{
  "version": "1.0",
  "syntax": {
    "literals": ["string", "number", "boolean", "null", "undefined", "regex", "array", "object"],
    "operators": {
      "binary": ["+","-","*","/","%","===","!==","==","!=","<","<=",">",">=","&&","||"],
      "unary":  ["!","-","+"],
      "ternary": true
    },
    "memberAccess": { "dot": true, "bracket": true, "optionalChain": true },
    "callForm": "any-function",
    "forbidden": ["assignment", "function-declaration", "loop", "try-catch", "template-string", "spread"]
  },
  "scope": {
    "contextual": {
      "state":  { "type": "ScreenState", "scope": "always" },
      "item":   { "type": "any",         "scope": "inside-list-render" },
      "index":  { "type": "number",      "scope": "inside-list-render" },
      "parent": { "type": "any",         "scope": "inside-nested-list" },
      "$last":  { "type": "EffectStatus","scope": "inside-onSuccess/onError" }
    },
    "globals": {
      "Date":    { "members": ["now", "parse", "UTC"] },
      "Math":    { "members": ["floor","ceil","round","min","max","abs","pow","sqrt","random"] },
      "Number":  { "callable": true, "members": ["isFinite","isNaN","isInteger","parseInt","parseFloat"] },
      "String":  { "callable": true },
      "Boolean": { "callable": true },
      "JSON":    { "members": ["stringify","parse"] },
      "Object":  { "members": ["keys","values","entries"] },
      "Array":   { "members": ["isArray","from"] }
    },
    "builtins": {
      "$": {
        "length":    { "args": ["any"],          "returns": "number" },
        "matches":   { "args": ["string","string|RegExp"], "returns": "boolean" },
        "now":       { "args": [],               "returns": "number" },
        "format":    { "args": ["string","..."], "returns": "string" },
        ...
      }
    },
    "instanceMethods": {
      "string": ["length","slice","substring","includes","startsWith","endsWith","toLowerCase","toUpperCase","trim","split","replace","padStart","padEnd"],
      "number": ["toFixed","toString"],
      "array":  ["length","includes","indexOf","map","filter","find","some","every","slice","join","concat"],
      "object": [],
      "regex":  ["test","exec"]
    }
  },
  "errorCodes": {
    "E001": "unexpected character",
    "E002": "unknown identifier `{name}`",
    "E003": "forbidden member call `{obj}.{method}`",
    "E004": "type mismatch: expected {expected}, got {actual}",
    "E005": "unsupported syntax `{syntax}` (see EXPR-LANG-SPEC §3)"
  }
}
```

**这一份 JSON 派生**：
- TypeScript types（codegen）
- Parser tokenizer 规则（codegen）
- Evaluator scope checker（codegen）
- SKILL 文档「允许的语法表」（codegen）
- 编辑器自动补全数据（直接 import）
- lint 错误码（直接 import）

**改动一处，五处自动同步**——这是杜绝"三方猜想"的真正解法。

#### 方向 2：AST 进 schema（一次性迁移）

```ts
// 旧
export type Expression<T = unknown> = string & { __brand: ... };

// 新
export type Expression<T = unknown> =
  | { kind: 'literal'; value: T }                    // 字面量值
  | { kind: 'template'; segments: TemplateSegment[] }// "hello {{x}}"
  | { kind: 'expr'; ast: ExpressionAst; source: string }  // "{{ x.y }}"，source 留作可读形态

// schema 序列化形态
{ "value": { "kind": "expr", "source": "{{ state.view.x }}",
             "ast": { "kind": "member", "object": ..., "property": "x" } } }
```

**好处**：
- 序列化 = 已 parse；运行时 0 parse 开销
- 编辑器不必重 parse 就能可视化
- 严格违反 AGENTS.md §九「无双版本」 → 一次性脚本迁移所有 schema 数据
- 老 schema 字段 `string` 自动通过 lazy parser fallback

#### 方向 3：三阶段流水线（CEL 思想）

```
   编辑期        落库期           运行期
     │              │                 │
   人/AI 写       MCP/Editor       PreviewRenderer
   text         ───→ Parse ───→     Eval
                ───→ Check ───→
                AST + 错误清单
                ↑
                spec.json（真相源）
```

每阶段产出明确：
- **Parse 阶段**：text → AST（语法层错）
- **Check 阶段**：AST + Scope + Type → typed AST + 类型/作用域错
- **Eval 阶段**：typed AST + data → result

**关键**：Parse + Check **强制在落库前完成**——MCP 工具拒绝写入 parse 不通过的 schema。

#### 方向 4：错误是结构化、给 AI 看的

```ts
type LintError = {
  code: 'E002';
  message: 'unknown identifier `Date`';
  pos: { line: 1, col: 4 };
  hint: 'globals.Date 未在 spec v1.0 注册；如需当前时间用 `$.now()`';
  spec: 'EXPR-LANG-SPEC v1.0 §scope.globals';
  suggestedFix?: { from: 'Date.now()', to: '$.now()' };
};
```

错误**直接是 AI 的修复指南**——给 hint 给 spec 引用给 suggested fix。这跟"console.warn 一句话"差距是天上地下。

#### 方向 5：编辑器/SKILL/AI 共享同一组工具

| 角色 | 工具 |
|---|---|
| **AI** | MCP 工具内嵌 lint，落库前自动检 |
| **编辑器人类用户** | ExpressionEditor 实时 lint + 自动补全 + AST 可视化 |
| **SKILL 文档** | 从 spec.json 自动生成「允许语法表」+ 「禁用语法表」+ 示例必通过 lint |
| **integrity check** | 扫所有 expression 字段 lint，作为屏完成度门禁 |

---

## 5. 改造路线图

### 5.1 阶段划分（按"先立规约、再补门禁"原则，反对事后擦屁股）

| Phase | 主题 | 工作量 | 产出 | 是否阻塞 demo |
|---|---|---|---|---|
| **EXPR-A 立规约** | spec.json + EXPR-LANG-SPEC.md 写出来 | 1 天 | 单一真相源 | demo 阻塞继续 |
| **EXPR-B 重写 Parser/Evaluator 按 spec** | tokenizer 加 regex/array/object literal；evaluator scope 走 spec.globals/builtins/instanceMethods | 2 天 | demo 立刻能跑 + 老表达式无需改 | demo 解锁 |
| **EXPR-C 加 lint 工具链** | `lintExpression(src) → LintResult`；MCP 工具内嵌；integrity 检查 | 1 天 | AI 落库门禁 | — |
| **EXPR-D AST 进 schema（迁移）** | Expression 类型从 string 改成 union；写一次性迁移脚本 | 2 天 | 工程化飞跃 | 一次性窗口 |
| **EXPR-E 编辑器 ExpressionEditor 升级** | 实时 lint + 自动补全 + 错误高亮 | 2 天 | 人也享受 lint | — |
| **EXPR-F SKILL 改写** | 删现有手写示例；从 spec 自动生成允许/禁用语法 + 修复模板 | 1 天 | AI 不再瞎猜 | — |
| **EXPR-G STAGE-CONTRACT v2.7 沉淀** | 把"表达式契约"立成第二 DSL | 0.5 天 | 体系完整 | — |

**总计**：约 9.5 人天

### 5.2 我建议的执行顺序

按你"先理解再杜绝"的精神：
- **必须先做 EXPR-A**（立规约）——没规约后面都是擦屁股
- **EXPR-B 紧跟**（按规约重写 Parser/Evaluator）—— 让规约真生效
- 之后 EXPR-C/D/E/F/G 可并行

只有这个顺序符合"从根因杜绝"。任何"先扩 Parser 让 demo 跑、再补规约"的顺序都是回到擦屁股模式。

### 5.3 与 v2.6 NetworkPolicy 改造的关系

v2.6 的成功路径：
```
约定层（事实上有）→ schema 层缺字段 → 平台一等公民化 → 五层闭环
```

EXPR 改造完全同构：
```
约定层（"JS 子集"约定）→ 没有真相源 → 平台第二 DSL 化 → 七大产物（spec/types/parser/evaluator/lint/editor/skill）闭环
```

建议命名 **STAGE-CONTRACT v2.7 = 表达式语言一等公民**，与 v2.6 NetworkPolicy 平级并列。

---

## 6. 写在最后：这次撞出的洞比 v2.6 大一个量级

| 维度 | v2.6 NetworkPolicy | v2.7 ExpressionLang |
|---|---|---|
| 缺失的层 | 1 个字段 | 1 个完整 DSL |
| 影响面 | 数据源 | 所有动态行为（events / visibleWhen / repeat / props 表达式 / styles 表达式 / condition / state.value...）|
| 复杂度 | 五层闭环 | 七大产物 + 规约 + 工具链 + AI 反馈循环 |
| 量级 | 半天 | 一周 |

**但本质相同**：都是把"约定"提升为"平台一等公民契约"。

> 做 demo 的过程不是"做 demo"，是把平台的隐形约定挨个撞成显式契约。
>
> 这次撞出的"表达式没被当 DSL"是 demo 模式下能撞到的最大一个洞。撞完之后，平台从"半工程化"跨向"全工程化"。

—— END
