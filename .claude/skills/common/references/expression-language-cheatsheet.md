<!-- AUTO-GENERATED FROM features/design-schema/src/expression-lang/spec.json -->
<!-- spec hash: 2b8ed7c0 -->
<!-- DO NOT EDIT MANUALLY: any change here will be overwritten by `pnpm gen:cheatsheet` -->

# Expression Language v1.0.0 速查表

> Design Platform Expression Language — schema-first 体系的第二 DSL，描述运行时动态值（visibleWhen / repeat / props / styles / state.set value / condition / action params 等）。

**真相源**：`features/design-schema/src/expression-lang/spec.json` · **人读规约**：`features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md`

**版本**：1.0.0 · **规约名**：design-expression-language

## 1. 允许语法

### 1.1 字面量

| 类型 | 支持 | 形式 |
|------|------|------|
| `string` | ✅ | `'...' / "..."` |
| `number` | ✅ | `decimal | float (no scientific yet)` |
| `boolean` | ✅ | `true / false` |
| `null` | ✅ | `-` |
| `undefined` | ✅ | `-` |
| `regex` | ✅ | `/pattern/flags` |
| `array` | ✅ | `[expr, expr, ...]` |
| `object` | ✅ | `{ key: expr, 'str-key': expr, [computed]: expr }` |

### 1.2 操作符

- **二元**：`+` `-` `*` `/` `%` `===` `!==` `==` `!=` `<` `<=` `>` `>=` `&&` `||` `??`
- **一元**：`!` `-` `+` `typeof`
- **三元**：✅ `cond ? a : b`

### 1.3 成员访问 / 调用

- 点访问 `a.b`：✅
- 方括号 `a['b']` / `arr[0]`：✅
- 可选链 `a?.b` / `a?.['b']` / `f?.()`：✅
- a.b / a['b'] / a?.b / a?.['b'] / arr[0]
- 函数调用：✅ — f(arg1, arg2, ...) — callee 必须在 spec.scope 允许列表内

### 1.4 禁用语法

- ❌ assignment (=, +=, ...)
- ❌ function-declaration (function / arrow)
- ❌ loop (for / while / do)
- ❌ try-catch / throw
- ❌ template-string (`hello ${x}`)
- ❌ spread/rest (...x)
- ❌ destructuring
- ❌ new expression (new Date())
- ❌ delete operator
- ❌ yield / await / async

## 2. Contextual Identifiers（运行期由宿主注入）

| 名称 | 类型 | 作用域 | 说明 |
|------|------|--------|------|
| `state` | `ScreenState` | always | 屏级运行时状态。等价 `store.getState()`，含 data / view / effects 三命名空间。 |
| `globalView` | `GlobalView` | always | 项目级共享上下文（v1.0 ★ 新增到 ctx）：session / network / nav / preferences / fallback。等价 `project.globalStateInit.view`，由宿主在每次 ctx 构造时注入。 |
| `item` | `any` | inside-list-render | 列表渲染时当前迭代项（由 ListRenderer 注入）。 |
| `index` | `number` | inside-list-render | 列表渲染时当前迭代下标（从 0 开始）。 |
| `parent` | `any` | inside-nested-list | 嵌套列表外层 item。 |
| `$last` | `EffectStatus` | inside-onSuccess|onError|onComplete | 上一次 effect.fetch 的最终状态，含 .response / .error / .startedAt / .finishedAt。 |

**state shape**：`{ data: Record<string,unknown>, view: Record<string,unknown>, effects: Record<string,EffectStatus> }`

**globalView shape**：`Record<string, unknown>`

**$last shape**：`{ status: 'success'|'error'|'idle', response?: unknown, error?: { code, message, ... }, startedAt: number, finishedAt?: number }`

## 3. Globals（受限静态命名空间）

> 仅以下 7 个全局可用；其他全局（`window` / `eval` / `Function` / `process` / `document` / `fetch` / `localStorage` 等）**全部禁止**（见 §6 E007）。

### 3.1 `Date` (不可直接调用)

> 时间相关静态方法。⚠️ 不允许 `new Date()`（构造函数禁用）；如需 Date 对象操作，请用 $.formatDate 等内置。

| 成员 | 签名 | 说明 |
|------|------|------|
| `Date.now` | `() → number` | 当前 UTC 时间戳（ms）。 |
| `Date.parse` | `(string) → number` | 解析时间字符串为 ms 时间戳。 |
| `Date.UTC` | `(number, number?, number?, number?, number?, number?, number?) → number` |  |

### 3.2 `Math` (不可直接调用)

| 成员 | 签名 | 说明 |
|------|------|------|
| `Math.floor` | `(number) → number` |  |
| `Math.ceil` | `(number) → number` |  |
| `Math.round` | `(number) → number` |  |
| `Math.abs` | `(number) → number` |  |
| `Math.min` | `(...number) → number` |  |
| `Math.max` | `(...number) → number` |  |
| `Math.pow` | `(number, number) → number` |  |
| `Math.sqrt` | `(number) → number` |  |
| `Math.random` | `() → number` |  |
| `Math.sign` | `(number) → number` |  |
| `Math.trunc` | `(number) → number` |  |

### 3.3 `Number` (**callable**：Number(x) — 转数字)

| 成员 | 签名 | 说明 |
|------|------|------|
| `Number.isFinite` | `(any) → boolean` |  |
| `Number.isNaN` | `(any) → boolean` |  |
| `Number.isInteger` | `(any) → boolean` |  |
| `Number.parseInt` | `(string, number?) → number` |  |
| `Number.parseFloat` | `(string) → number` |  |
| `MAX_SAFE_INTEGER` | (常量) | type: `number` |
| `MIN_SAFE_INTEGER` | (常量) | type: `number` |

### 3.4 `String` (**callable**：String(x) — 转字符串)

_（无成员）_

### 3.5 `Boolean` (**callable**：Boolean(x) — 转布尔)

_（无成员）_

### 3.6 `JSON` (不可直接调用)

| 成员 | 签名 | 说明 |
|------|------|------|
| `JSON.stringify` | `(any, any?, any?) → string` |  |
| `JSON.parse` | `(string) → any` |  |

### 3.7 `Object` (不可直接调用)

| 成员 | 签名 | 说明 |
|------|------|------|
| `Object.keys` | `(any) → string[]` |  |
| `Object.values` | `(any) → any[]` |  |
| `Object.entries` | `(any) → [string,any][]` |  |

### 3.8 `Array` (不可直接调用)

| 成员 | 签名 | 说明 |
|------|------|------|
| `Array.isArray` | `(any) → boolean` |  |
| `Array.from` | `(any, any?) → any[]` |  |

## 4. Builtins（平台内置纯函数命名空间）

### `$` 命名空间

> 平台内置纯函数命名空间，挂在表达式作用域 `$` 下。所有函数都是纯函数 + 容错（参数错返合理默认，不抛错）。

| 函数 | 签名 | 说明 |
|------|------|------|
| `$.length` | `(any) → number` | 字符串/数组/对象的长度（对象按 keys 数） |
| `$.upper` | `(string) → string` |  |
| `$.lower` | `(string) → string` |  |
| `$.format` | `(string, ...any) → string` | format("hi {0}, {name}", "world", { name: 'tom' }) |
| `$.includes` | `(string|any[], any) → boolean` |  |
| `$.first` | `(any[]) → any` |  |
| `$.last` | `(any[]) → any` |  |
| `$.isEmpty` | `(any) → boolean` |  |
| `$.not` | `(any) → boolean` |  |
| `$.defaultTo` | `(any, any) → any` |  |
| `$.now` | `() → number` | 等价 Date.now()；推荐前端首选 |
| `$.matches` | `(string, string|RegExp) → boolean` | $.matches(state.x, '^1[3-9]\\d{9}$')；接受字符串 pattern 或 RegExp 字面量 |

## 5. Instance Methods（按运行时类型查白名单）

> 实例方法白名单。表达式中 `obj.method(args)` 形式调用时，必须先匹配 obj 的运行时类型，再查 method 是否在白名单。其他实例方法（如 .toString / .toLocaleString / .valueOf 等）默认禁用。

### `string` 实例方法/属性

| 成员 | 签名 | 说明 |
|------|------|------|
| `.length` | (属性) | type: `number` |
| `.slice()` | `(number, number?) → string` |  |
| `.substring()` | `(number, number?) → string` |  |
| `.indexOf()` | `(string, number?) → number` |  |
| `.lastIndexOf()` | `(string, number?) → number` |  |
| `.includes()` | `(string) → boolean` |  |
| `.startsWith()` | `(string, number?) → boolean` |  |
| `.endsWith()` | `(string, number?) → boolean` |  |
| `.toLowerCase()` | `() → string` |  |
| `.toUpperCase()` | `() → string` |  |
| `.trim()` | `() → string` |  |
| `.trimStart()` | `() → string` |  |
| `.trimEnd()` | `() → string` |  |
| `.split()` | `(string|RegExp, number?) → string[]` |  |
| `.replace()` | `(string|RegExp, string) → string` |  |
| `.replaceAll()` | `(string|RegExp, string) → string` |  |
| `.padStart()` | `(number, string?) → string` |  |
| `.padEnd()` | `(number, string?) → string` |  |
| `.repeat()` | `(number) → string` |  |
| `.concat()` | `(...string) → string` |  |
| `.charAt()` | `(number) → string` |  |
| `.charCodeAt()` | `(number) → number` |  |
| `.match()` | `(string|RegExp) → string[]|null` |  |

### `number` 实例方法/属性

| 成员 | 签名 | 说明 |
|------|------|------|
| `.toFixed()` | `(number?) → string` |  |
| `.toString()` | `(number?) → string` |  |

### `array` 实例方法/属性

| 成员 | 签名 | 说明 |
|------|------|------|
| `.length` | (属性) | type: `number` |
| `.includes()` | `(any) → boolean` |  |
| `.indexOf()` | `(any, number?) → number` |  |
| `.lastIndexOf()` | `(any, number?) → number` |  |
| `.slice()` | `(number?, number?) → any[]` |  |
| `.concat()` | `(...any) → any[]` |  |
| `.join()` | `(string?) → string` |  |
| `.find()` | `(function) → any` |  ⚠️ 函数参数当前不在表达式语法范围内，请用 $.* 替代或重新设计 schema |
| `.findIndex()` | `(function) → number` |  ⚠️ 同上 |
| `.filter()` | `(function) → any[]` |  ⚠️ 同上 |
| `.map()` | `(function) → any[]` |  ⚠️ 同上 |
| `.some()` | `(function) → boolean` |  ⚠️ 同上 |
| `.every()` | `(function) → boolean` |  ⚠️ 同上 |
| `.reverse()` | `() → any[]` |  |
| `.flat()` | `(number?) → any[]` |  |

### `regex` 实例方法/属性

| 成员 | 签名 | 说明 |
|------|------|------|
| `.test()` | `(string) → boolean` |  |
| `.exec()` | `(string) → string[]|null` |  |
| `.source` | (属性) | type: `string` |
| `.flags` | (属性) | type: `string` |

## 6. Error Codes

| 错误码 | 级别 | 摘要 | 说明 |
|--------|------|------|------|
| **E001** | error | Syntax error | Tokenizer/Parser 发现非法字符或非法语法结构 |
| **E002** | error | Unknown identifier | 标识符不在 spec.scope.contextual 也不在 spec.scope.globals 也不在 spec.scope.builtins |
| **E003** | error | Forbidden member call | 对全局对象调用了未在白名单内的方法 |
| **E004** | error | Forbidden instance method | 对实例值调用了未在白名单内的方法 |
| **E005** | error | Forbidden syntax | 使用了 spec.syntax.forbidden 中的语法 |
| **E006** | warning | Type mismatch (best-effort warning) | 静态推断发现类型与期望不符（best-effort，不抛 error 仅 warn） |
| **E007** | error | Forbidden global | 访问 spec 中未声明且属于浏览器/Node 环境危险全局 |
| **E008** | warning | Deprecated usage | 用法语法/语义合法但已被 knownMigrations 标记为 deprecated；建议按 suggestedFix 迁移到推荐写法 |

### E007 黑名单（forbidden globals）

`globalThis` · `window` · `self` · `Function` · `eval` · `process` · `require` · `import` · `document` · `fetch` · `XMLHttpRequest` · `localStorage` · `sessionStorage` · `WebSocket` · `Worker`

## 7. Known Migrations（旧写法 → 推荐写法）

> Lint 工具会在 issue 中带 `suggestedFix`，编辑器可一键应用。

| 旧写法 | 推荐写法 |
|--------|----------|
| `Date.now()` | $.now() |
| `new Date()` | $.now()  /* 注意：新写法返回时间戳 number，不是 Date 对象 */ |
| `globalView.x.y` | globalView.x.y  /* 已合法，spec v1.0 起 globalView 在 ctx 中可用 */ |
| `case.when` | case.match  /* logic.switch case 字段名是 match，不是 when */ |
| `/regex/.test(x)` | /regex/.test(x)  /* 已合法，spec v1.0 支持正则字面量 */ |
| `arr.map(x => x.foo)` | arr.find(...) 等高阶函数当前不支持函数参数，请重新设计 schema 或用 $.* 内置 |

## 8. 常见错误样例

| ❌ 写法 | ✅ 正确 | 错码 |
|---------|---------|------|
| `{{ Date.fooNotExist() }}` | `{{ Date.now() }}` 或 `{{ $.now() }}` | E003 |
| `{{ window.alert('x') }}` | （删除，Web 全局禁用） | E007 |
| `{{ unknownVar }}` | `{{ state.view.unknownVar }}` | E002 |
| `state.view.x` | `{{ state.view.x }}`（必须 `{{ }}` 包裹） | E001 |
| `{{ "hello".notExist() }}` | `{{ "hello".toUpperCase() }}` | E004 |
| `{{ new Date() }}` | `{{ Date.now() }}`（无 `new`） | E005 |
| `{{ arr.map(x => x.foo) }}` | （函数参数当前不支持，重新设计 schema） | E005 |

---

## 速查链接

- **完整 spec**：[../../../features/design-schema/src/expression-lang/spec.json](../../../features/design-schema/src/expression-lang/spec.json)
- **人读规约**：[../../../features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md](../../../features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md)
- **STAGE-CONTRACT v2.7**：[../../../STAGE-CONTRACT.md](../../../STAGE-CONTRACT.md) §0.1.12
- **根因分析（如何走到第二 DSL）**：[../../../PLATFORM-ROOT-CAUSE-ANALYSIS.md](../../../PLATFORM-ROOT-CAUSE-ANALYSIS.md)
