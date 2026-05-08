import type { Ast, TemplateSegment } from './Parser';
import { parseTemplate, parseSingleExpression, parseExpression, ExpressionParseError } from './Parser';
import { builtinFunctions, FORBIDDEN_GLOBALS, type BuiltinFunctions } from './BuiltinFunctions';

/**
 * 表达式运行时作用域（与 design-schema `ExpressionContext` 对齐）。
 *
 * Evaluator 只读这些 key。任何其它 identifier（如 `window`, `Function`）都会抛 EvaluationError。
 */
export interface EvalContext {
  state?: unknown;
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
 * 在受限 ctx 下安全求值一个 AST。
 *
 * 安全保证：
 *   - identifier 只能是 ctx 显式白名单里的 key（state/item/index/parent/$last/$）
 *   - `$` 只能解析到内置函数白名单
 *   - 不通过任何 `with` / `new Function` / `eval`
 *   - 访问不存在字段返回 undefined，不抛
 *   - 函数调用：callee 必须是 `$.xxx`（内置函数），禁止调用其它对象上的方法
 */
export function evaluateAst(ast: Ast, ctx: EvalContext): unknown {
  switch (ast.kind) {
    case 'literal':
      return ast.value;

    case 'identifier':
      if (FORBIDDEN_GLOBALS.has(ast.name)) {
        throw new ExpressionEvaluationError(`access to \`${ast.name}\` is forbidden`);
      }
      if (ast.name === 'state') return ctx.state;
      if (ast.name === 'item') return ctx.item;
      if (ast.name === 'index') return ctx.index;
      if (ast.name === 'parent') return ctx.parent;
      if (ast.name === '$last') return ctx.$last;
      if (ast.name === '$') return ctx.$ ?? builtinFunctions;
      // 未定义的 identifier → undefined（与 JS 变量未声明不同，我们不抛错，方便渐进式绑定）
      return undefined;

    case 'member': {
      const obj = evaluateAst(ast.object, ctx);
      return safeGet(obj, ast.property);
    }

    case 'index': {
      const obj = evaluateAst(ast.object, ctx);
      const idx = evaluateAst(ast.index, ctx);
      if (typeof idx === 'number') {
        return safeGet(obj, idx);
      }
      if (typeof idx === 'string') {
        return safeGet(obj, idx);
      }
      return undefined;
    }

    case 'call': {
      // 仅支持 `$.xxx(args)` 这种调用；callee 必须是 member
      if (ast.callee.kind !== 'member') {
        throw new ExpressionEvaluationError(
          'only `$.xxx(...)` builtin calls are allowed',
        );
      }
      const receiver = evaluateAst(ast.callee.object, ctx);
      const builtins = ctx.$ ?? builtinFunctions;
      if (receiver !== builtins) {
        throw new ExpressionEvaluationError(
          'only builtin `$.xxx` calls are allowed; direct method calls on state/item are forbidden',
        );
      }
      const fn = (builtins as unknown as Record<string, unknown>)[ast.callee.property];
      if (typeof fn !== 'function') {
        throw new ExpressionEvaluationError(
          `unknown builtin function \`$.${ast.callee.property}\``,
        );
      }
      const args = ast.args.map((a) => evaluateAst(a, ctx));
      return (fn as (...a: unknown[]) => unknown)(...args);
    }

    case 'unary': {
      const v = evaluateAst(ast.operand, ctx);
      if (ast.op === '!') return !v;
      if (ast.op === '-') return -(v as number);
      if (ast.op === '+') return +(v as number);
      return undefined;
    }

    case 'binary': {
      // 短路处理 &&, ||
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
      const l = evaluateAst(ast.left, ctx);
      const r = evaluateAst(ast.right, ctx);
      switch (ast.op) {
        case '+': return (l as number) + (r as number);
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

function safeGet(obj: unknown, key: string | number): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== 'object' && typeof obj !== 'string') return undefined;
  // 禁止原型链逸出
  if (typeof key === 'string' && (key === '__proto__' || key === 'constructor' || key === 'prototype')) {
    return undefined;
  }
  // 字符串 index 访问合法
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
 *   "{{ item.role === 'user' ? 'a' : 'b' }}"    → ['item.role']
 *
 * 只收集 `state.*` / `item.*` / `$last.*` 之类 ctx key 开头的路径；忽略纯字面值 / `$` 调用。
 */
export function extractDeps(expr: string): string[] {
  if (typeof expr !== 'string' || !/\{\{[\s\S]+?\}\}/.test(expr)) return [];
  const deps = new Set<string>();

  const visitAst = (node: Ast): void => {
    switch (node.kind) {
      case 'identifier':
        if (['state', 'item', 'parent', '$last'].includes(node.name)) {
          deps.add(node.name);
        }
        break;
      case 'member': {
        const path = stringifyPath(node);
        if (path) deps.add(path);
        else visitAst(node.object);
        break;
      }
      case 'index':
        visitAst(node.object);
        visitAst(node.index);
        break;
      case 'call':
        visitAst(node.callee);
        node.args.forEach(visitAst);
        break;
      case 'unary':
        visitAst(node.operand);
        break;
      case 'binary':
        visitAst(node.left);
        visitAst(node.right);
        break;
      case 'ternary':
        visitAst(node.test);
        visitAst(node.consequent);
        visitAst(node.alternate);
        break;
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
  if (cur.kind === 'identifier' && ['state', 'item', 'parent', '$last'].includes(cur.name)) {
    parts.unshift(cur.name);
    return parts.join('.');
  }
  return undefined;
}

// 暴露 Parse 错误供调用方处理
export { ExpressionParseError };
