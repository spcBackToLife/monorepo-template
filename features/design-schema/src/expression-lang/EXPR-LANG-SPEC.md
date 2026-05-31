# Design Expression Language v1.0 —— 平台第二 DSL 规约

> 单一真相源（机读）：[`./spec.json`](./spec.json)
> TypeScript 接口：[`./index.ts`](./index.ts)
> 本文件：人读说明 + AI 学习指南
>
> **任何 SKILL 文档 / 编辑器 UI / Parser / Evaluator / Lint 工具讨论"什么语法/标识符/方法被支持"时，必须以本文件 + spec.json 为准。其他地方的"我以为"全部作废**。

---

## 0. 这是什么

**Design Expression Language（DEL）** 是 design-platform 用于表达「运行时动态值」的小型表达式语言，是**仅次于 schema 本身的平台第二 DSL**。

凡 schema 中标注为 `Expression<T>` 或 `Expression | unknown` 的字段，其字符串值（含 `{{ ... }}`）都按本规约求值：

```jsonc
{
  "visibleWhen": "{{ !!state.view.errors.phone }}",                 // 单表达式
  "props": {
    "textContent": "你好 {{ state.view.user.name }}！",             // 模板（文本 + 多个 {{}}）
    "disabled": "{{ state.view.submitting }}"                       // 单表达式（保留原生类型）
  },
  "actions": [
    { "type": "state.set", "path": "view.lockedUntil",
      "value": "{{ $.now() + 30 * 60 * 1000 }}" }                  // 计算表达式
  ]
}
```

### 设计哲学（参考 Google CEL）

1. **非图灵完备** —— 故意阉割（无函数定义 / 无循环 / 无递归），保证任何表达式必定终止
2. **三阶段** —— Parse / Check / Eval。前两阶段在编辑期 / 落库期完成；运行时只 Eval（AST 已编译/缓存）
3. **Scope 显式声明** —— 哪些变量、哪些方法可用，全在 spec.json，不允许在代码里硬编码
4. **错误结构化** —— 每条错误都有 `code` / `hint` / `suggestedFix`，给 AI 看的，不是 console.warn

---

## 1. 表达式形态（三种）

### 1.1 字面量（不含 `{{ }}`）

```jsonc
"value": "hello"      // 字符串字面量
"value": 42           // 数字字面量
"value": true         // 布尔字面量
```

不进入 Parser，原样使用。

### 1.2 单表达式（整个值就是一个 `{{ }}`）

```jsonc
"value": "{{ state.view.x + 1 }}"
```

Eval 后保留**原生类型**（数组、对象、null、boolean 都不丢类型）。

### 1.3 模板（混合文本 + 多个 `{{ }}`）

```jsonc
"textContent": "已选择 {{ state.view.count }} 项 共 {{ state.data.total }} 项"
```

Eval 后是**字符串**（每个 `{{}}` 内部值通过 `String(v)` 转换并拼接，`null/undefined` 转空串）。

---

## 2. 语法（受限 JS 子集）

### 2.1 字面量

| 类别 | 写法 | 示例 |
|---|---|---|
| 字符串 | `'...' \| "..."` | `'hello'` |
| 数字 | `123` `0.5` | `42` |
| 布尔 | `true` `false` | `true` |
| null/undefined | `null` `undefined` | `null` |
| **正则** ★ | `/pattern/flags` | `/^1[3-9]\d{9}$/` |
| **数组** ★ | `[expr, expr, ...]` | `[1, 2, state.x]` |
| **对象** ★ | `{ k: expr, 'sk': expr, [c]: expr }` | `{ user: state.view.x }` |

★ = v1.0 新支持

### 2.2 运算符

| 类别 | 运算符 |
|---|---|
| 算术 | `+ - * / %` |
| 比较 | `=== !== == != < <= > >=` |
| 逻辑 | `&& \|\| !` |
| **空合并** ★ | `??` |
| 一元 | `! - +` `typeof` |
| 三元 | `cond ? a : b` |

### 2.3 成员访问 / 调用

| 形式 | 写法 |
|---|---|
| 点访问 | `a.b.c` |
| 中括号访问 | `a['b']` `arr[0]` |
| **可选链** ★ | `a?.b` `a?.['b']` `f?.(...)` |
| 函数调用 | `f(arg1, arg2, ...)` |

### 2.4 ⛔ 禁止语法（spec.syntax.forbidden）

不允许（lint 报 `E005 forbidden syntax`）：

- 赋值 `=` `+=` ... → 表达式不应改 state，state 改动只能通过 `state.set` action
- 函数声明 `function f() {}` `() => {}` → 用 `$.xxx` 内置替代
- 循环 `for/while/do` → 用 `$.map` 等内置（v1.1 路线）
- `try/catch/throw` → 用 `?.` / `??` 防空
- 模板字符串 ``` `hi ${x}` ``` → 用 `'hi ' + x` 或外层模板 `"hi {{x}}"`
- 扩展运算符 `...arr` → 用 `arr.concat(...)`
- 解构 `{ a } = x` → 用直接访问 `x.a`
- `new` 表达式 → 不允许（包括 `new Date()`，请用 `$.now()`）
- `delete`
- `yield / await / async`

---

## 3. Scope（作用域）—— 表达式里能引用什么

### 3.1 contextual（上下文变量，always-in-scope）

| 名称 | 类型 | 何时可用 | 说明 |
|---|---|---|---|
| `state` | `ScreenState` | 始终 | 屏级运行时状态 `{ data, view, effects }` |
| `globalView` | `GlobalView` | 始终（v1.0 ★） | 项目级共享上下文 `{ session, network, nav, preferences, fallback, ... }` |
| `item` | any | 列表渲染中 | 当前 list 迭代项（由 ListRenderer 注入） |
| `index` | number | 列表渲染中 | 当前迭代下标 |
| `parent` | any | 嵌套列表中 | 外层 item |
| `$last` | EffectStatus | onSuccess / onError / onComplete | 上次 effect.fetch 的最终状态 |

⚠️ 在不正确的作用域使用（如 `idle` 态访问 `$last`）→ Eval 返回 `undefined`，不报错

### 3.2 globals（受控全局对象，仅静态方法/属性）

| Namespace | 可调用 (callable) | 允许的成员 |
|---|---|---|
| `Date` | ❌ | `now()` `parse()` `UTC()` |
| `Math` | ❌ | `floor` `ceil` `round` `abs` `min` `max` `pow` `sqrt` `random` `sign` `trunc` |
| `Number` | ✅ `Number(x)` | `isFinite` `isNaN` `isInteger` `parseInt` `parseFloat` `MAX_SAFE_INTEGER` `MIN_SAFE_INTEGER` |
| `String` | ✅ `String(x)` | （仅可调用） |
| `Boolean` | ✅ `Boolean(x)` | （仅可调用） |
| `JSON` | ❌ | `stringify` `parse` |
| `Object` | ❌ | `keys` `values` `entries` |
| `Array` | ❌ | `isArray` `from` |

⚠️ **不允许 `new Date()` `new RegExp(...)`** —— 构造函数禁用。

⛔ 被显式禁的全局（`E007`）：
```
globalThis  window  self  Function  eval  process  require  import
document  fetch  XMLHttpRequest  localStorage  sessionStorage
WebSocket  Worker
```

### 3.3 builtins（平台内置函数，挂在 `$` 命名空间下）

```js
$.length(x)          // 字符串/数组/对象长度
$.upper(s)           // 转大写
$.lower(s)           // 转小写
$.format(t, ...args) // 模板替换 "hi {0}, {name}"
$.includes(arr, x)   // 数组/字符串包含
$.first(arr)         // 取首元素
$.last(arr)          // 取末元素
$.isEmpty(x)         // 是否为空（null/undefined/""/[]/{}）
$.not(x)             // !x
$.defaultTo(x, fb)   // x ?? fb（兼容老写法）
$.now()              // 当前时间戳，等价 Date.now()，前端推荐
$.matches(s, re)     // 正则匹配，re 接受 string 或 RegExp 字面量
```

**v1.0 推荐：**
- 时间戳：`$.now()` ≥ `Date.now()`（语义清晰，避开 Date 整个名字空间）
- 正则匹配：`$.matches(state.x, '^1[3-9]\\d{9}$')` ≥ `/^1[3-9]\d{9}$/.test(state.x)` （字符串 pattern 不用转义反斜杠两次）

但二者**都被支持**——选 AI 训练数据更友好的写法。

### 3.4 instanceMethods（实例方法白名单）

| 类型 | 允许的方法/属性 |
|---|---|
| **string** | `length` / `slice` `substring` / `indexOf` `lastIndexOf` `includes` `startsWith` `endsWith` / `toLowerCase` `toUpperCase` / `trim` `trimStart` `trimEnd` / `split` `replace` `replaceAll` / `padStart` `padEnd` `repeat` `concat` / `charAt` `charCodeAt` / `match` |
| **number** | `toFixed` `toString` |
| **array** | `length` `includes` `indexOf` `lastIndexOf` `slice` `concat` `join` `reverse` `flat` |
| **regex** | `test` `exec` `source` `flags` |

⚠️ array 的高阶方法（`map / filter / find / some / every / findIndex`）**v1.0 暂不支持**——它们需要函数参数，超出受限子集。请用 `$.xxx` 内置或重新设计 schema。

⚠️ string 的 `toLocaleString / valueOf / Symbol.iterator` 等不在白名单——禁用。

---

## 4. 错误码（E001 ~ E007）

完整定义见 [`spec.json#errorCodes`](./spec.json)。

| Code | 类别 | 例子 |
|---|---|---|
| **E001** | 语法错误 | `unexpected character ^`（用了 `/regex/` 但 v0 没支持，v1.0 已修） |
| **E002** | 未知 identifier | `globalView` 未注册（v0 现象）（v1.0 已注册）|
| **E003** | 禁止的全局成员调用 | `Date.constructor()` |
| **E004** | 禁止的实例方法 | `'hello'.toLocaleString()` |
| **E005** | 禁止的语法 | `function() {}` 在 actions 里 |
| **E006** | 类型不匹配（warning） | `state.view.x.length > '0'`（length 是 number，跟 string 比）|
| **E007** | 危险全局 | `window.location` `eval(...)` |

每条错误返回结构：

```ts
{
  code: 'E002',
  message: 'unknown identifier `Date`',
  pos: { line: 1, col: 4 },
  hint: '可用：state, globalView, item, index, parent, $last, $；如需 Date.now()，spec v1.0 已支持',
  spec: 'EXPR-LANG-SPEC v1.0 §3.2',
  suggestedFix: { from: 'Date.now()', to: '$.now()' }   // optional
}
```

---

## 5. AI 教学速查表

> 本节是给 SKILL 模板和 AI 自学使用。任何 SKILL events.template.md 等示例文件**应直接 link 本节，而不是自己列示例**。

### ✅ 推荐写法（v1.0 全部 lint 通过）

```js
// 校验
"{{ /^1[3-9]\\d{9}$/.test(state.view.form.phone) }}"
"{{ $.matches(state.view.form.phone, '^1[3-9]\\\\d{9}$') }}"

// 时间
"{{ $.now() + 30 * 60 * 1000 }}"           // 推荐
"{{ Date.now() + 30 * 60 * 1000 }}"        // 也合法

// 数学
"{{ Math.floor(state.view.lockedCountdown / 60) }}"
"{{ Math.max(0, state.view.x - 1) }}"

// 字符串拼接（用 + 或模板）
"{{ '已选 ' + state.view.count + ' 项' }}"
"已选 {{ state.view.count }} 项"          // 推荐：模板形式

// 布尔合成
"{{ !!state.view.errors.phone }}"
"{{ state.view.form.policy && !state.view.submitting }}"

// 全局态访问
"{{ globalView.session.status === 'active' }}"
"{{ globalView.network.status !== 'offline' }}"

// effect 状态
"{{ state.effects['ds-login'].status === 'pending' }}"
"{{ $last.response.user }}"                  // 仅在 onSuccess 内
"{{ $last.error.code }}"                     // 仅在 onError 内
```

### ❌ 错误写法（v1.0 lint 拒绝）

```js
"{{ new Date() }}"                  // E005: 禁 new；用 $.now()
"{{ window.localStorage.x }}"       // E007: 危险全局
"{{ eval('1+1') }}"                  // E007: 危险全局
"{{ arr.map(x => x.foo) }}"         // E005: 禁箭头函数；重设计或用 $.* 替代
"{{ `hi ${name}` }}"                 // E005: 禁模板字符串；用 'hi ' + name
"{{ x = 1 }}"                       // E005: 禁赋值
"{{ for (const x of arr) ... }}"   // E005: 禁循环
"{{ throw new Error('x') }}"       // E005: 禁 throw
"{{ x.toLocaleString() }}"          // E004: 不在 string 实例白名单
"{{ Date.constructor() }}"          // E003: Date 不允许 constructor
```

### 🟡 易踩坑

```js
// 易踩坑 1：模板字符串 vs 表达式拼接
"hi {{ name }}"                  // ✅ 模板形式
"{{ 'hi ' + name }}"             // ✅ 表达式拼接
"{{ `hi ${name}` }}"             // ❌ 禁

// 易踩坑 2：数组方法选择
"{{ arr.includes(x) }}"          // ✅ includes 在 v1.0 白名单
"{{ arr.indexOf(x) >= 0 }}"      // ✅ 也行
"{{ $.includes(arr, x) }}"       // ✅ 内置形式

// 易踩坑 3：null 防护
"{{ state.data.user.name }}"     // 风险：data.user 为 null 时静默 undefined
"{{ state.data.user?.name }}"    // ✅ v1.0 支持可选链
"{{ state.data.user && state.data.user.name }}" // ✅ 也行

// 易踩坑 4：item 在 onSuccess 里访问
"{{ item.id }}"                  // ❌ onSuccess 不在列表渲染上下文，item 为 undefined
"{{ $last.response.id }}"        // ✅ onSuccess 用 $last
```

---

## 6. 版本与演进

### v1.0（本版本，2026-05-31）

**新增**（相对 v0 实现）：
- 正则字面量 `/.../`
- 数组字面量 `[...]`
- 对象字面量 `{...}`
- 可选链 `?.`
- 空合并 `??`
- `Date / Math / Number / String / Boolean / JSON / Object / Array` 全局对象（受控成员）
- `globalView` contextual identifier
- 实例方法白名单（string / number / array / regex）
- builtin `$.now()` / `$.matches()`
- 错误码体系 E001-E007
- knownMigrations 迁移建议

**与 v0 的兼容性**：
- v0 写出来的合法表达式 100% 兼容
- v0 写出来的"看起来对但不能跑"的表达式（如 `Date.now()` `globalView.x`）现在能跑了——bug 修复，不破坏

### v1.1 路线（候选）

- 高阶函数：`arr.map(x => x.foo)` —— 需要受限的 lambda 子集
- 类型推导：增强 E006 type-mismatch 检查
- 跨命名空间常量：`Math.PI`

### 演化原则

- 版本号通过 `spec.version` 字段维护
- 老 schema 标 `expressionLangVersion: "1.0"`，runtime 按版本切 Parser
- 任何破坏性更改 → 大版本 +1（v2.0），并提供一次性迁移脚本（AGENTS.md §九）

---

## 7. 给 SKILL 维护者的指南

请遵循：

1. **不要在 SKILL 文档里抄表达式语法表**——直接 link 到本文件
2. **示例必须能 lint 通过**——SKILL CI 应自动跑 lint，错的示例直接 fail
3. **禁止"看起来像 JS 就行"的描述**——必须明确"在 spec v1.x 中支持"
4. **每个 SKILL 阶段（product / interaction / design）的 forbidden-fields 文档**应 link 本文件 §3.1 contextual scope，明确"本阶段能用哪些 ctx"
5. **interaction-designer 的 events.template.md** 应大量引用本文件 §5 推荐写法

---

## 8. 与 schema 的关系

| 维度 | schema 本身 | Expression Language |
|---|---|---|
| 是什么 | 平台第一 DSL（结构语言） | 平台第二 DSL（动态值语言） |
| 序列化 | JSON | string（含 `{{}}`），v2.0 路线考虑 AST 进库 |
| 校验 | zod validators | spec-driven Parser + Checker |
| 整全性 | integrity R-* 规则 | lint E001-E007 + 落库门禁 |
| 版本 | v0.3 → v2.6 NetworkPolicy | v1.0（本规约）|
| 真相源 | TypeScript types | spec.json + 本文件 |
| AI 教学 | SKILL 5 套 | 本文件 §5 |
| 编辑器 | NodeTree / PropEditor / DataTab... | ExpressionEditor（v1.0 路线）|

二者**通过 schema 中标 `Expression<T>` 的字段衔接**。schema 的 zod validator 不查表达式内容，由 Expression Lang 工具链单独负责。

### 8.1 ★ path 字段 vs Expression scope —— 两套写法,一字之差(易错点)

`bind.path` / `state.set.path` / `state.append.path` 等 schema 字段使用的是
**ScreenState 根相对路径**,与 Expression 内部 `state.xxx` 的 scope 写法**不同**。

| 字段 / 上下文 | 写法 | 含义 | 是哪个 DSL |
|---|---|---|---|
| `bind.path` | `"view.form.phone"` | 直接访问 `ScreenState.view.form.phone` | schema |
| `state.set.path` | `"data.messages[2].text"` | 直接访问 `ScreenState.data.messages[2].text` | schema |
| `state.append.path` | `"data.todos"` | 直接访问 `ScreenState.data.todos` | schema |
| Expression 内部访问同一字段 | `"{{ state.view.form.phone }}"` | 必须带 `state.` 前缀 | Expression Lang(本文档) |

**为什么不同**:
- Store(`features/design-engine/src/state/Store.ts`)的 path 解析器以 `ScreenState`
  整体(含 `data`/`view`/`effects` 三命名空间)为根,所以 `path` 字段直接从 data/view/effects
  开始写。
- 表达式内部把整个 `ScreenState` 绑在 `state` 标识符上(由 spec.json
  `scope.contextual.state` 声明),所以表达式必须 `state.xxx` 才能访问 `xxx`。

**常见错误**:

```diff
# ❌ 多了一层 "state." 前缀,实际写到 ScreenState.state.view.x
- { type: "state.set", path: "state.view.x", value: "{{ ... }}" }
# ✅
+ { type: "state.set", path: "view.x", value: "{{ ... }}" }

# ❌ bind.path 同样不要带 "state."
- bind: { path: "state.view.form.phone" }
# ✅
+ bind: { path: "view.form.phone" }

# ❌ 反过来,表达式里少了 "state." 会触发 E002 (unknown identifier)
- visibleWhen: "{{ view.form.phone === '' }}"
# ✅
+ visibleWhen: "{{ state.view.form.phone === '' }}"
```

> 真相源:`features/design-schema/src/types/action.ts` `StateSetAction.path` JSDoc 与
> `features/design-schema/src/types/node.ts` `bind.path` JSDoc 都明确写了这条边界。
> integrity 暂未检测此类错误(因 path 是 string,无法静态判定根),靠 SKILL 教学 +
> Expression lint(E002 在表达式侧拦反向错误)双向兜底。

---

## 附录 A：与业界的对照

| 维度 | Google CEL | Formily | JSON Logic | **本规约 v1.0** |
|---|---|---|---|---|
| 语法形态 | 独立 DSL | JS 子集（`{{}}`）| JSON | JS 子集（`{{}}`）|
| 类型系统 | 静态强类型 | 无 | 无 | best-effort 类型推断 |
| 三阶段（Parse/Check/Eval）| ✅ 完整 | ❌ 仅运行时 | N/A | ✅（v1.0 起）|
| AST 序列化 | Protobuf | 无 | JSON 即 AST | string（v2.0 路线 → AST）|
| Scope 显式声明 | ✅ | ✅ | N/A | ✅ |
| 类似业界水平 | 工业级 | 中等 | 极简 | **介于 Formily 和 CEL 之间** |

---

> 维护者：design-platform 维护团队
> 创建：2026-05-31（v1.0）
> 单一真相源：`./spec.json`
