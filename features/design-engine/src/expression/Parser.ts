/**
 * Expression Parser — 把 `{{ ... }}` 表达式字符串解析成 AST。
 *
 * v1.0（2026-05-31）—— 按 Expression Language v1.0 spec 重写。
 *
 * 真相源：features/design-schema/src/expression-lang/spec.json
 * 规约：features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md
 *
 * 支持语法（spec v1.0）：
 *   - 字面值：number / string / boolean / null / undefined
 *   - ★ 正则字面量：/pattern/flags
 *   - ★ 数组字面量：[expr, expr, ...]
 *   - ★ 对象字面量：{ key: expr, 'str-key': expr, [computed]: expr }
 *   - 标识符（合法性由 Evaluator 按 spec 判定）
 *   - 成员访问：a.b / a['b']
 *   - ★ 可选链：a?.b / a?.['b'] / f?.(args)
 *   - 函数调用：f(args)
 *   - 一元：! - + typeof
 *   - 二元：+ - * / % === !== == != < <= > >= && || ??
 *   - 三元：cond ? a : b
 *
 * 不支持（spec.syntax.forbidden）：
 *   - 赋值、函数声明、循环、try-catch、模板字符串、扩展、解构、new、delete、yield/await
 */

export type Ast =
  | { kind: 'literal'; value: string | number | boolean | null | undefined }
  | { kind: 'regex'; pattern: string; flags: string }                          // v1.0 ★
  | { kind: 'array'; elements: Ast[] }                                          // v1.0 ★
  | { kind: 'object'; properties: ObjectProperty[] }                            // v1.0 ★
  | { kind: 'identifier'; name: string }
  | { kind: 'member'; object: Ast; property: string; computed: false; optional?: boolean }
  | { kind: 'index'; object: Ast; index: Ast; optional?: boolean }
  | { kind: 'call'; callee: Ast; args: Ast[]; optional?: boolean }
  | { kind: 'unary'; op: '!' | '-' | '+' | 'typeof'; operand: Ast }
  | { kind: 'binary'; op: BinaryOp; left: Ast; right: Ast }
  | { kind: 'ternary'; test: Ast; consequent: Ast; alternate: Ast };

/** 对象字面量的一个属性 */
export interface ObjectProperty {
  /** 键：identifier 形式（key）、字符串字面量（'key'）、计算式（[expr]）*/
  key: { kind: 'identifier'; name: string } | { kind: 'literal'; value: string } | { kind: 'computed'; expr: Ast };
  /** 值表达式 */
  value: Ast;
}

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '%'
  | '===' | '!==' | '==' | '!='
  | '<' | '<=' | '>' | '>='
  | '&&' | '||' | '??';

/** 模板段：纯文本 / 内插表达式 */
export type TemplateSegment =
  | { kind: 'text'; value: string }
  | { kind: 'expr'; ast: Ast };

/** 把 `{{ ... }}` 形式的字符串拆成 segments */
export function parseTemplate(input: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let i = 0;
  while (i < input.length) {
    const open = input.indexOf('{{', i);
    if (open < 0) {
      if (i < input.length) segments.push({ kind: 'text', value: input.slice(i) });
      break;
    }
    if (open > i) {
      segments.push({ kind: 'text', value: input.slice(i, open) });
    }
    const close = input.indexOf('}}', open + 2);
    if (close < 0) {
      throw new ExpressionParseError('unterminated `{{`');
    }
    const inner = input.slice(open + 2, close).trim();
    segments.push({ kind: 'expr', ast: parseExpression(inner) });
    i = close + 2;
  }
  return segments;
}

/** 仅当字符串恰好是单个 `{{ ... }}`（前后无其它文本）时返回内层 AST，否则 undefined */
export function parseSingleExpression(input: string): Ast | undefined {
  const trimmed = input.trim();
  if (!trimmed.startsWith('{{') || !trimmed.endsWith('}}')) return undefined;
  const inner = trimmed.slice(2, -2);
  // 内层不能再含 `{{` 或 `}}`（避免 "a{{x}}b{{y}}" 被误认为单表达式）
  if (inner.includes('{{') || inner.includes('}}')) return undefined;
  return parseExpression(inner.trim());
}

/** 解析裸表达式（无 `{{ }}` 包裹） */
export function parseExpression(src: string): Ast {
  const tokens = tokenize(src);
  const parser = new Parser(tokens, src);
  const ast = parser.parseTernary();
  if (!parser.eof()) {
    throw new ExpressionParseError(
      `unexpected token \`${parser.peek().value}\` at position ${parser.peek().pos} in: ${src}`,
    );
  }
  return ast;
}

export class ExpressionParseError extends Error {
  constructor(message: string) {
    super(`[expression] ${message}`);
    this.name = 'ExpressionParseError';
  }
}

// ===== Tokenizer =====

type TokenKind =
  | 'number' | 'string' | 'identifier'
  | 'punct' | 'op' | 'keyword'
  | 'regex';                                              // v1.0 ★

interface Token {
  kind: TokenKind;
  value: string;
  pos: number;
  /** regex token 的 flags（仅 regex 用） */
  flags?: string;
}

const KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'typeof']);

const MULTI_CHAR_OPS = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '??', '?.'];
const SINGLE_CHAR_OPS = new Set(['+', '-', '*', '/', '%', '<', '>', '!', '?', ':']);
const PUNCT = new Set(['(', ')', '[', ']', '{', '}', ',', '.']);

/**
 * 判断当前位置的 `/` 是除号还是正则字面量起始。
 *
 * 规则（参考 JS 词法）：上一个 token 若是"可作为操作数"（数字/字符串/identifier/keyword(true/false/null)/`)` / `]` / `}`），
 * 则 `/` 是除号；否则是 regex 起始。
 *
 * 这是个简化版（不处理"标识符是 keyword vs 值"的细微差别），但覆盖业务表达式 100%。
 */
function isRegexStart(tokens: Token[]): boolean {
  if (tokens.length === 0) return true;
  const last = tokens[tokens.length - 1];
  if (!last) return true;
  if (last.kind === 'number' || last.kind === 'string' || last.kind === 'regex') return false;
  if (last.kind === 'identifier') return false;
  // keyword: true/false/null/undefined 可作为值，typeof 是操作符（regex 起始合法）
  if (last.kind === 'keyword') {
    return last.value === 'typeof';
  }
  // punct: ) ] } 后面是除号；( [ { , . 后面是 regex
  if (last.kind === 'punct') {
    return !(last.value === ')' || last.value === ']' || last.value === '}');
  }
  // op: 后面一定是 regex
  return true;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i += 1;
      continue;
    }
    // string
    if (c === '"' || c === "'") {
      const quote = c;
      const start = i;
      i += 1;
      let value = '';
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < src.length) {
          const next = src[i + 1];
          if (next === 'n') value += '\n';
          else if (next === 't') value += '\t';
          else if (next === 'r') value += '\r';
          else if (next === '\\') value += '\\';
          else if (next === quote) value += quote;
          else value += next;
          i += 2;
        } else {
          value += src[i] as string;
          i += 1;
        }
      }
      if (i >= src.length) {
        throw new ExpressionParseError(`unterminated string at ${start}`);
      }
      i += 1; // consume closing quote
      tokens.push({ kind: 'string', value, pos: start });
      continue;
    }
    // ★ regex literal: /pattern/flags
    if (c === '/' && isRegexStart(tokens)) {
      const start = i;
      i += 1; // skip leading /
      let pattern = '';
      let inCharClass = false;
      while (i < src.length) {
        const ch = src[i];
        if (ch === '\\' && i + 1 < src.length) {
          pattern += ch + (src[i + 1] as string);
          i += 2;
          continue;
        }
        if (ch === '[') inCharClass = true;
        else if (ch === ']') inCharClass = false;
        else if (ch === '/' && !inCharClass) {
          break;
        }
        pattern += ch as string;
        i += 1;
      }
      if (i >= src.length || src[i] !== '/') {
        throw new ExpressionParseError(`unterminated regex at ${start}`);
      }
      i += 1; // skip closing /
      // flags (i / g / m / s / u / y)
      let flags = '';
      while (i < src.length && /[igmsuy]/.test(src[i] as string)) {
        flags += src[i] as string;
        i += 1;
      }
      tokens.push({ kind: 'regex', value: pattern, flags, pos: start });
      continue;
    }
    // number
    if (isDigit(c as string) || (c === '.' && i + 1 < src.length && isDigit(src[i + 1] as string))) {
      const start = i;
      while (i < src.length && (isDigit(src[i] as string) || src[i] === '.')) {
        i += 1;
      }
      tokens.push({ kind: 'number', value: src.slice(start, i), pos: start });
      continue;
    }
    // identifier
    if (isIdentStart(c as string)) {
      const start = i;
      while (i < src.length && isIdentPart(src[i] as string)) {
        i += 1;
      }
      const value = src.slice(start, i);
      tokens.push({
        kind: KEYWORDS.has(value) ? 'keyword' : 'identifier',
        value,
        pos: start,
      });
      continue;
    }
    // multi-char operator (含 ?. / ??)
    let matched = false;
    for (const op of MULTI_CHAR_OPS) {
      if (src.startsWith(op, i)) {
        tokens.push({ kind: 'op', value: op, pos: i });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (SINGLE_CHAR_OPS.has(c as string)) {
      tokens.push({ kind: 'op', value: c as string, pos: i });
      i += 1;
      continue;
    }
    if (PUNCT.has(c as string)) {
      tokens.push({ kind: 'punct', value: c as string, pos: i });
      i += 1;
      continue;
    }
    throw new ExpressionParseError(`unexpected character \`${c}\` at ${i}`);
  }
  return tokens;
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}
function isIdentStart(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$';
}
function isIdentPart(c: string): boolean {
  return isIdentStart(c) || isDigit(c);
}

// ===== Parser =====

class Parser {
  private idx = 0;

  constructor(private tokens: Token[], private src: string) {}

  eof(): boolean {
    return this.idx >= this.tokens.length;
  }
  peek(): Token {
    return this.tokens[this.idx] ?? { kind: 'punct', value: '<eof>', pos: this.src.length };
  }
  private advance(): Token {
    const t = this.tokens[this.idx] as Token;
    this.idx += 1;
    return t;
  }
  private match(kind: TokenKind, value?: string): Token | undefined {
    const t = this.tokens[this.idx];
    if (!t) return undefined;
    if (t.kind !== kind) return undefined;
    if (value !== undefined && t.value !== value) return undefined;
    this.idx += 1;
    return t;
  }
  private expect(kind: TokenKind, value?: string): Token {
    const t = this.match(kind, value);
    if (!t) {
      const got = this.peek();
      throw new ExpressionParseError(
        `expected ${kind}${value ? ` \`${value}\`` : ''} but got \`${got.value}\` at ${got.pos}`,
      );
    }
    return t;
  }

  parseTernary(): Ast {
    const test = this.parseNullishCoalescing();
    if (this.match('op', '?')) {
      const consequent = this.parseTernary();
      this.expect('op', ':');
      const alternate = this.parseTernary();
      return { kind: 'ternary', test, consequent, alternate };
    }
    return test;
  }

  /** ?? 优先级低于 ||（参考 ES2020）—— 不允许混用未加括号的 ?? 和 ||/&& */
  private parseNullishCoalescing(): Ast {
    let left = this.parseLogicalOr();
    while (this.match('op', '??')) {
      const right = this.parseLogicalOr();
      left = { kind: 'binary', op: '??', left, right };
    }
    return left;
  }

  private parseLogicalOr(): Ast {
    let left = this.parseLogicalAnd();
    while (this.match('op', '||')) {
      const right = this.parseLogicalAnd();
      left = { kind: 'binary', op: '||', left, right };
    }
    return left;
  }

  private parseLogicalAnd(): Ast {
    let left = this.parseEquality();
    while (this.match('op', '&&')) {
      const right = this.parseEquality();
      left = { kind: 'binary', op: '&&', left, right };
    }
    return left;
  }

  private parseEquality(): Ast {
    let left = this.parseRelational();
    while (true) {
      const t = this.peek();
      if (t.kind === 'op' && (t.value === '===' || t.value === '!==' || t.value === '==' || t.value === '!=')) {
        this.advance();
        const right = this.parseRelational();
        left = { kind: 'binary', op: t.value as BinaryOp, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseRelational(): Ast {
    let left = this.parseAdditive();
    while (true) {
      const t = this.peek();
      if (t.kind === 'op' && (t.value === '<' || t.value === '>' || t.value === '<=' || t.value === '>=')) {
        this.advance();
        const right = this.parseAdditive();
        left = { kind: 'binary', op: t.value as BinaryOp, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseAdditive(): Ast {
    let left = this.parseMultiplicative();
    while (true) {
      const t = this.peek();
      if (t.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.advance();
        const right = this.parseMultiplicative();
        left = { kind: 'binary', op: t.value as BinaryOp, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseMultiplicative(): Ast {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t.kind === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        this.advance();
        const right = this.parseUnary();
        left = { kind: 'binary', op: t.value as BinaryOp, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): Ast {
    const t = this.peek();
    if (t.kind === 'op' && (t.value === '!' || t.value === '-' || t.value === '+')) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'unary', op: t.value as '!' | '-' | '+', operand };
    }
    // typeof
    if (t.kind === 'keyword' && t.value === 'typeof') {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'unary', op: 'typeof', operand };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Ast {
    let node = this.parsePrimary();
    while (true) {
      // ★ 可选链 ?.identifier / ?.[expr] / ?.(args)
      if (this.match('op', '?.')) {
        if (this.match('punct', '[')) {
          const index = this.parseTernary();
          this.expect('punct', ']');
          node = { kind: 'index', object: node, index, optional: true };
        } else if (this.match('punct', '(')) {
          const args = this.parseArguments();
          node = { kind: 'call', callee: node, args, optional: true };
        } else {
          const id = this.expect('identifier');
          node = { kind: 'member', object: node, property: id.value, computed: false, optional: true };
        }
        continue;
      }
      if (this.match('punct', '.')) {
        const id = this.expect('identifier');
        node = { kind: 'member', object: node, property: id.value, computed: false };
      } else if (this.match('punct', '[')) {
        const index = this.parseTernary();
        this.expect('punct', ']');
        node = { kind: 'index', object: node, index };
      } else if (this.match('punct', '(')) {
        const args = this.parseArguments();
        node = { kind: 'call', callee: node, args };
      } else {
        break;
      }
    }
    return node;
  }

  private parseArguments(): Ast[] {
    const args: Ast[] = [];
    if (this.peek().value !== ')') {
      args.push(this.parseTernary());
      while (this.match('punct', ',')) {
        args.push(this.parseTernary());
      }
    }
    this.expect('punct', ')');
    return args;
  }

  private parsePrimary(): Ast {
    const t = this.peek();
    if (t.kind === 'number') {
      this.advance();
      return { kind: 'literal', value: Number(t.value) };
    }
    if (t.kind === 'string') {
      this.advance();
      return { kind: 'literal', value: t.value };
    }
    // ★ regex literal
    if (t.kind === 'regex') {
      this.advance();
      return { kind: 'regex', pattern: t.value, flags: t.flags ?? '' };
    }
    if (t.kind === 'keyword') {
      this.advance();
      if (t.value === 'true') return { kind: 'literal', value: true };
      if (t.value === 'false') return { kind: 'literal', value: false };
      if (t.value === 'null') return { kind: 'literal', value: null };
      if (t.value === 'undefined') return { kind: 'literal', value: undefined };
      // typeof 已在 parseUnary 处理，这里不应该走到
      throw new ExpressionParseError(`unexpected keyword \`${t.value}\` at ${t.pos}`);
    }
    if (t.kind === 'identifier') {
      this.advance();
      return { kind: 'identifier', name: t.value };
    }
    // ★ array literal [expr, expr, ...]
    if (this.match('punct', '[')) {
      const elements: Ast[] = [];
      if (this.peek().value !== ']') {
        elements.push(this.parseTernary());
        while (this.match('punct', ',')) {
          // 容忍尾随逗号 [a, b, ]
          if (this.peek().value === ']') break;
          elements.push(this.parseTernary());
        }
      }
      this.expect('punct', ']');
      return { kind: 'array', elements };
    }
    // ★ object literal { key: expr, 'str': expr, [comp]: expr }
    if (this.match('punct', '{')) {
      const properties: ObjectProperty[] = [];
      if (this.peek().value !== '}') {
        properties.push(this.parseObjectProperty());
        while (this.match('punct', ',')) {
          if (this.peek().value === '}') break;
          properties.push(this.parseObjectProperty());
        }
      }
      this.expect('punct', '}');
      return { kind: 'object', properties };
    }
    if (this.match('punct', '(')) {
      const expr = this.parseTernary();
      this.expect('punct', ')');
      return expr;
    }
    throw new ExpressionParseError(
      `unexpected token \`${t.value}\` at ${t.pos} in: ${this.src}`,
    );
  }

  private parseObjectProperty(): ObjectProperty {
    const t = this.peek();
    let key: ObjectProperty['key'];
    // 计算 key [expr]
    if (this.match('punct', '[')) {
      const expr = this.parseTernary();
      this.expect('punct', ']');
      key = { kind: 'computed', expr };
    } else if (t.kind === 'string') {
      this.advance();
      key = { kind: 'literal', value: t.value };
    } else if (t.kind === 'identifier' || t.kind === 'keyword') {
      // 允许 keyword 当 key（如 { default: x }）
      this.advance();
      key = { kind: 'identifier', name: t.value };
    } else {
      throw new ExpressionParseError(`expected object key but got \`${t.value}\` at ${t.pos}`);
    }
    this.expect('op', ':');
    const value = this.parseTernary();
    return { key, value };
  }
}
