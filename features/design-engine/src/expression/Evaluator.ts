/**
 * Expression Evaluator — Expression Language v1.0 求值器。
 *
 * 真相源：features/design-schema/src/expression-lang/spec.json
 * 规约：features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md
 *
 * 设计要点（spec v1.0）：
 *   - identifier 解析 spec-driven：contextual / globals / builtins / forbidden
 *     全部从 spec 决策，不在此处硬编码白名单
 *   - call 节点支持三类：
 *       1. `$.xxx(args)` builtin 调用（从 spec.scope.builtins 白名单）
 *       2. `Global.method(args)` 全局静态方法（从 spec.scope.globals 白名单）
 *       3. `instance.method(args)` 实例方法（按运行时类型从 spec.scope.instanceMethods 白名单）
 *       4. `Type(x)` 类型转换（Number/String/Boolean 等 callable globals）
 *   - regex 字面量 → JS RegExp 对象
 *   - array / object 字面量 → 原生 JS Array / Object
 *   - 可选链 `?.` → null/undefined 短路返回 undefined
 *   - ?? 空合并 → 左侧 null/undefined 才用右侧（与 || 不同）
 */

import type { Ast, ObjectProperty, TemplateSegment } from './Parser';
import { parseTemplate, parseSingleExpression, parseExpression, ExpressionParseError } from './Parser';
import { builtinFunctions, type BuiltinFunctions } from './BuiltinFunctions';
import {
  EXPR_LANG_SPEC,
  isContextualIdentifier,
  isBuiltinNamespace,
  isAllowedGlobal,
  isForbiddenGlobal,
  getBuiltinFunction,
  getGlobalMember,
  getInstanceMember,
  listContextualIdentifiers,
  listAllowedGlobals,
} from '@globallink/design-schema';

/**
 * 表达式运行时作用域（与 spec v1.0 contextual 对齐）。
 *
 * 所有 contextual identifier 都从这里取。任何不在此处也不在 spec.globals/builtins
 * 的 identifier 视为 unknown identifier。
 */
export interface EvalContext {
  state?: unknown;
  /** ★ v1.0 新增：项目级 globalView（session / network / nav / preferences ...） */
  globalView?: unknown;
  item?: unknown;
  index?: number;
  parent?: unknown;
  $last?: unknown;
  $?: BuiltinFunctions;
}

export class ExpressionEvaluationError extends Error {
  constructor(message: string) {
    super(`[expression] ${message}`);
    this.name = 'ExpressionEvaluationError';
  }
}

/**
 * spec v1.0 内置的 global namespace 实现表（仅静态方法/常量）。
 *
 * 注意：键名必须与 spec.scope.globals 中声明的成员严格对齐——
 * spec 是白名单，本表是实现；spec 没声明的方法即使本表有也不调用。
 */
const GLOBAL_NAMESPACES: Record<string, Record<string, unknown>> = {
  Date: {
    now: () => Date.now(),
    parse: (s: string) => Date.parse(s),
    UTC: (...args: number[]) => Date.UTC(...(args as [number, number?, number?, number?, number?, number?, number?])),
  },
  Math: {
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    sqrt: Math.sqrt,
    random: Math.random,
    sign: Math.sign,
    trunc: Math.trunc,
    PI: Math.PI,
    E: Math.E,
  },
  Number: {
    isFinite: Number.isFinite,
    isNaN: Number.isNaN,
    isInteger: Number.isInteger,
    parseInt: (s: string, radix?: number) => Number.parseInt(s, radix),
    parseFloat: Number.parseFloat,
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
  },
  String: {},
  Boolean: {},
  JSON: {
    stringify: (v: unknown, r?: unknown, s?: unknown) => JSON.stringify(v, r as never, s as never),
    parse: (s: string) => JSON.parse(s),
  },
  Object: {
    keys: Object.keys,
    values: Object.values,
    entries: Object.entries,
  },
  Array: {
    isArray: Array.isArray,
    from: Array.from,
  },
};

/**
 * Callable globals 的转换函数（spec.scope.globals[X].callable=true 时使用）。
 */
const CALLABLE_GLOBALS: Record<string, (v: unknown) => unknown> = {
  Number: (v: unknown) => Number(v),
  String: (v: unknown) => String(v),
  Boolean: (v: unknown) => Boolean(v),
};

/**
 * 推断运行时值的 spec instanceMethods 类型键。
 */
function inferInstanceType(v: unknown): 'string' | 'number' | 'array' | 'object' | 'regex' | null {
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  if (v instanceof RegExp) return 'regex';
  if (Array.isArray(v)) return 'array';
  if (v && typeof v === 'object') return 'object';
  return null;
}

/**
 * 实例方法白名单调用器：按 spec.scope.instanceMethods 白名单匹配。
 * 不在白名单 → 抛 ExpressionEvaluationError(E004)。
 */
function callInstanceMethod(
  obj: unknown,
  method: string,
  args: unknown[],
): unknown {
  const type = inferInstanceType(obj);
  if (!type) {
    throw new ExpressionEvaluationError(
      `cannot call \`.${method}()\` on ${obj === null ? 'null' : typeof obj}`,
    );
  }
  const spec = getInstanceMember(type, method);
  if (!spec) {
    throw new ExpressionEvaluationError(
      `[E004] type \`${type}\` does not allow method \`.${method}()\`; see EXPR-LANG-SPEC v${EXPR_LANG_SPEC.version} §3.4`,
    );
  }
  // 调用原生方法（已确认在白名单内）
  const fn = (obj as Record<string, unknown>)[method];
  if (typeof fn !== 'function') {
    throw new ExpressionEvaluationError(
      `\`.${method}\` declared in spec but missing on runtime value (type=${type})`,
    );
  }
  return (fn as (...a: unknown[]) => unknown).apply(obj, args);
}

/**
 * 在受限 ctx 下安全求值一个 AST。
 */
export function evaluateAst(ast: Ast, ctx: EvalContext): unknown {
  switch (ast.kind) {
    case 'literal':
      return ast.value;

    case 'regex':
      return new RegExp(ast.pattern, ast.flags);

    case 'array':
      return ast.elements.map((e) => evaluateAst(e, ctx));

    case 'object': {
      const out: Record<string, unknown> = {};
      for (const prop of ast.properties) {
        const keyName = resolveObjectKey(prop, ctx);
        out[keyName] = evaluateAst(prop.value, ctx);
      }
      return out;
    }

    case 'identifier': {
      const name = ast.name;
      // 优先级 1：危险全局 → 抛错
      if (isForbiddenGlobal(name)) {
        throw new ExpressionEvaluationError(
          `[E007] access to \`${name}\` is forbidden (spec v${EXPR_LANG_SPEC.version} §3.2)`,
        );
      }
      // 优先级 2：contextual identifier
      if (isContextualIdentifier(name)) {
        if (name === 'state') return ctx.state;
        if (name === 'globalView') return ctx.globalView;
        if (name === 'item') return ctx.item;
        if (name === 'index') return ctx.index;
        if (name === 'parent') return ctx.parent;
        if (name === '$last') return ctx.$last;
        return undefined;
      }
      // 优先级 3：builtin namespace（`$`）
      if (isBuiltinNamespace(name)) {
        return ctx.$ ?? builtinFunctions;
      }
      // 优先级 4：allowed global namespace
      if (isAllowedGlobal(name)) {
        return GLOBAL_NAMESPACES[name] ?? {};
      }
      // 未声明 → undefined（保留软失败容错，便于渐进式绑定。lint 阶段会报 E002）
      return undefined;
    }

    case 'member': {
      const obj = evaluateAst(ast.object, ctx);
      // 可选链短路
      if (ast.optional && (obj === null || obj === undefined)) {
        return undefined;
      }
      return safeGet(obj, ast.property);
    }

    case 'index': {
      const obj = evaluateAst(ast.object, ctx);
      if (ast.optional && (obj === null || obj === undefined)) {
        return undefined;
      }
      const idx = evaluateAst(ast.index, ctx);
      if (typeof idx === 'number' || typeof idx === 'string') {
        return safeGet(obj, idx);
      }
      return undefined;
    }

    case 'call':
      return evaluateCall(ast, ctx);

    case 'unary': {
      const v = evaluateAst(ast.operand, ctx);
      if (ast.op === '!') return !v;
      if (ast.op === '-') return -(v as number);
      if (ast.op === '+') return +(v as number);
      if (ast.op === 'typeof') return typeof v;
      return undefined;
    }

    case 'binary': {
      // 短路：&& || ??
      if (ast.op === '&&') {
        const l = evaluateAst(ast.left, ctx);
        if (!l) return l;
        return evaluateAst(ast.right, ctx);
      }
      if (ast.op === '||') {
        const l = evaluateAst(ast.left, ctx);
        if (l) return l;
        return evaluateAst(ast.right, ctx);
      }
      if (ast.op === '??') {
        const l = evaluateAst(ast.left, ctx);
        if (l !== null && l !== undefined) return l;
        return evaluateAst(ast.right, ctx);
      }
      const l = evaluateAst(ast.left, ctx);
      const r = evaluateAst(ast.right, ctx);
      switch (ast.op) {
        case '+':
          // JS 语义：任一是 string 走拼接
          if (typeof l === 'string' || typeof r === 'string') {
            return String(l ?? '') + String(r ?? '');
          }
          return (l as number) + (r as number);
        case '-': return (l as number) - (r as number);
        case '*': return (l as number) * (r as number);
        case '/': return (l as number) / (r as number);
        case '%': return (l as number) % (r as number);
        case '===': return l === r;
        case '!==': return l !== r;
        case '==': return l == r;
        case '!=': return l != r;
        case '<': return (l as number) < (r as number);
        case '<=': return (l as number) <= (r as number);
        case '>': return (l as number) > (r as number);
        case '>=': return (l as number) >= (r as number);
      }
      return undefined;
    }

    case 'ternary': {
      const t = evaluateAst(ast.test, ctx);
      return evaluateAst(t ? ast.consequent : ast.alternate, ctx);
    }
  }
}

function resolveObjectKey(prop: ObjectProperty, ctx: EvalContext): string {
  const k = prop.key;
  if (k.kind === 'identifier') return k.name;
  if (k.kind === 'literal') return k.value;
  // computed
  const v = evaluateAst(k.expr, ctx);
  return String(v);
}

/**
 * 求值 call 节点。按 callee 分支：
 *   1. callee = identifier 且是 callable global（Number / String / Boolean）→ 类型转换调用
 *   2. callee = member(builtin '$', method) → builtin 调用（必须在 spec.builtins['$'] 白名单）
 *   3. callee = member(global, method) → 全局静态方法（必须在 spec.globals[X].members 白名单）
 *   4. callee = member(instance, method) / index(instance, expr) → 实例方法（按运行时类型走 spec.instanceMethods 白名单）
 *   5. callee = call/identifier/literal 等 → 抛错（不允许）
 */
function evaluateCall(
  ast: Extract<Ast, { kind: 'call' }>,
  ctx: EvalContext,
): unknown {
  const callee = ast.callee;
  const args = ast.args.map((a) => evaluateAst(a, ctx));

  // 1. callable global: Number(x) / String(x) / Boolean(x)
  if (callee.kind === 'identifier') {
    const name = callee.name;
    if (isForbiddenGlobal(name)) {
      throw new ExpressionEvaluationError(
        `[E007] call to \`${name}\` is forbidden (spec v${EXPR_LANG_SPEC.version})`,
      );
    }
    if (isAllowedGlobal(name)) {
      const ns = EXPR_LANG_SPEC.scope.globals[name];
      if (ns?.callable && CALLABLE_GLOBALS[name]) {
        return CALLABLE_GLOBALS[name](args[0]);
      }
      throw new ExpressionEvaluationError(
        `[E003] \`${name}\` is not callable (spec v${EXPR_LANG_SPEC.version} §3.2)`,
      );
    }
    // 未知 identifier 调用
    throw new ExpressionEvaluationError(
      `[E002] unknown function \`${name}\`; available identifiers: ${listContextualIdentifiers().concat(listAllowedGlobals(), ['$']).join(', ')}`,
    );
  }

  // 2/3/4. member 调用
  if (callee.kind === 'member') {
    const receiver = evaluateAst(callee.object, ctx);
    // 可选调用 ?.()
    if (ast.optional && (receiver === null || receiver === undefined)) {
      return undefined;
    }
    const method = callee.property;

    // 2. $.xxx —— builtin
    if (callee.object.kind === 'identifier' && isBuiltinNamespace(callee.object.name)) {
      const ns = callee.object.name;
      const def = getBuiltinFunction(ns, method);
      if (!def) {
        throw new ExpressionEvaluationError(
          `[E002] unknown builtin \`${ns}.${method}\` (spec v${EXPR_LANG_SPEC.version} §3.3)`,
        );
      }
      const builtins = ctx.$ ?? builtinFunctions;
      const fn = (builtins as unknown as Record<string, unknown>)[method];
      if (typeof fn !== 'function') {
        throw new ExpressionEvaluationError(
          `builtin \`${ns}.${method}\` declared in spec but missing in runtime`,
        );
      }
      return (fn as (...a: unknown[]) => unknown)(...args);
    }

    // 3. Global.member —— 全局静态方法
    if (callee.object.kind === 'identifier' && isAllowedGlobal(callee.object.name)) {
      const globalName = callee.object.name;
      const memberSpec = getGlobalMember(globalName, method);
      if (!memberSpec) {
        throw new ExpressionEvaluationError(
          `[E003] global \`${globalName}.${method}\` is not allowed (spec v${EXPR_LANG_SPEC.version} §3.2)`,
        );
      }
      // member 是 constant 不能调用
      if ('kind' in memberSpec && memberSpec.kind === 'constant') {
        throw new ExpressionEvaluationError(
          `[E003] \`${globalName}.${method}\` is a constant, not callable`,
        );
      }
      const fn = GLOBAL_NAMESPACES[globalName]?.[method];
      if (typeof fn !== 'function') {
        throw new ExpressionEvaluationError(
          `global \`${globalName}.${method}\` declared in spec but missing in runtime`,
        );
      }
      return (fn as (...a: unknown[]) => unknown)(...args);
    }

    // 4. instance.method —— 实例方法白名单
    return callInstanceMethod(receiver, method, args);
  }

  // 5. callee = index/call/literal —— 极少见，按"未知函数"拒绝
  throw new ExpressionEvaluationError(
    `[E005] unsupported call form (callee kind: ${callee.kind}); see EXPR-LANG-SPEC v${EXPR_LANG_SPEC.version} §2.3`,
  );
}

function safeGet(obj: unknown, key: string | number): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== 'object' && typeof obj !== 'string') {
    // 允许 number 上的属性访问（如字符串字面量的 length），但只对内置属性返回
    if (typeof obj === 'number' && (key === 'toFixed' || key === 'toString')) {
      // 返回方法本身（用于后续 call 节点判断）
      return (obj as unknown as Record<string | number, unknown>)[key];
    }
    return undefined;
  }
  // 禁止原型链逸出
  if (typeof key === 'string' && (key === '__proto__' || key === 'constructor' || key === 'prototype')) {
    return undefined;
  }
  // 字符串/数组的内置属性访问（length 等）允许
  return (obj as Record<string | number, unknown>)[key];
}

/**
 * 在 ctx 下求值一个**完整的字段值**：
 *   - 非字符串 → 原样返回
 *   - 字符串但不含 `{{ }}` → 原样返回字符串
 *   - 单个 `{{ expr }}` → 返回 expr 的原生类型值（数组/数字/布尔/对象 都保留）
 *   - 模板字符串（文本 + 多个 `{{ }}`）→ 拼成字符串返回
 */
export function evaluateExpression(input: unknown, ctx: EvalContext): unknown {
  if (typeof input !== 'string') return input;
  if (!/\{\{[\s\S]+?\}\}/.test(input)) return input;

  // 先尝试单表达式模式（保留原生类型）
  const single = parseSingleExpression(input);
  if (single !== undefined) {
    return evaluateAst(single, prepareCtx(ctx));
  }

  // 否则按模板拼字符串
  const segments = parseTemplate(input);
  const preparedCtx = prepareCtx(ctx);
  let out = '';
  for (const seg of segments) {
    if (seg.kind === 'text') {
      out += seg.value;
    } else {
      const v = evaluateAst(seg.ast, preparedCtx);
      out += v === undefined || v === null ? '' : String(v);
    }
  }
  return out;
}

/**
 * 编译并缓存一个表达式字符串（避免重复 parse）。
 * 返回一个 evaluator：给 ctx 就吐值。
 */
export function compileExpression(expr: string): (ctx: EvalContext) => unknown {
  // 判断是纯表达式还是模板
  const single = parseSingleExpression(expr);
  if (single !== undefined) {
    return (ctx) => evaluateAst(single, prepareCtx(ctx));
  }
  // 模板
  if (/\{\{[\s\S]+?\}\}/.test(expr)) {
    const segments = parseTemplate(expr);
    return (ctx) => concatSegments(segments, prepareCtx(ctx));
  }
  // 既不是模板也不是单表达式：当成裸表达式解析（如 `state.x`，供 EventCondition.when 用）
  const ast = parseExpression(expr);
  return (ctx) => evaluateAst(ast, prepareCtx(ctx));
}

function concatSegments(segments: TemplateSegment[], ctx: EvalContext): string {
  let out = '';
  for (const seg of segments) {
    if (seg.kind === 'text') {
      out += seg.value;
    } else {
      const v = evaluateAst(seg.ast, ctx);
      out += v === undefined || v === null ? '' : String(v);
    }
  }
  return out;
}

function prepareCtx(ctx: EvalContext): EvalContext {
  if (ctx.$) return ctx;
  return { ...ctx, $: builtinFunctions };
}

/**
 * 提取表达式中用到的顶层依赖路径（编辑器 reactivity 追踪 / 静态检查用）。
 *
 * 例：
 *   "{{ state.data.messages }}"                 → ['state.data.messages']
 *   "{{ state.view.x + state.data.y }}"         → ['state.view.x', 'state.data.y']
 *   "{{ globalView.session.status }}"           → ['globalView.session.status']
 *   "{{ item.role === 'user' ? 'a' : 'b' }}"    → ['item.role']
 */
export function extractDeps(expr: string): string[] {
  if (typeof expr !== 'string' || !/\{\{[\s\S]+?\}\}/.test(expr)) return [];
  const deps = new Set<string>();
  const contextual = listContextualIdentifiers();

  const visitAst = (node: Ast): void => {
    switch (node.kind) {
      case 'literal':
      case 'regex':
        return;
      case 'identifier':
        if (contextual.includes(node.name)) {
          deps.add(node.name);
        }
        return;
      case 'array':
        node.elements.forEach(visitAst);
        return;
      case 'object':
        for (const p of node.properties) {
          if (p.key.kind === 'computed') visitAst(p.key.expr);
          visitAst(p.value);
        }
        return;
      case 'member': {
        const path = stringifyPath(node);
        if (path) deps.add(path);
        else visitAst(node.object);
        return;
      }
      case 'index':
        visitAst(node.object);
        visitAst(node.index);
        return;
      case 'call':
        visitAst(node.callee);
        node.args.forEach(visitAst);
        return;
      case 'unary':
        visitAst(node.operand);
        return;
      case 'binary':
        visitAst(node.left);
        visitAst(node.right);
        return;
      case 'ternary':
        visitAst(node.test);
        visitAst(node.consequent);
        visitAst(node.alternate);
        return;
    }
  };

  try {
    const single = parseSingleExpression(expr);
    if (single !== undefined) {
      visitAst(single);
    } else {
      for (const seg of parseTemplate(expr)) {
        if (seg.kind === 'expr') visitAst(seg.ast);
      }
    }
  } catch {
    // 解析失败时返回空依赖集（编辑器层可单独处理语法错误）
  }

  return [...deps];
}

function stringifyPath(node: Ast): string | undefined {
  const parts: string[] = [];
  let cur: Ast = node;
  while (cur.kind === 'member') {
    parts.unshift(cur.property);
    cur = cur.object;
  }
  if (cur.kind === 'identifier' && isContextualIdentifier(cur.name)) {
    parts.unshift(cur.name);
    return parts.join('.');
  }
  return undefined;
}

// 暴露 Parse 错误供调用方处理
export { ExpressionParseError };
