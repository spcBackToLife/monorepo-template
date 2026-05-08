/**
 * Expression Parser — 把 `{{ ... }}` 表达式字符串解析成 AST。
 *
 * 支持的语法（受限子集）：
 *   - 字面值：number / string('...' or "...") / boolean / null / undefined
 *   - 标识符：state / item / index / parent / $last / $（受限根作用域）
 *   - 成员访问：a.b.c / a['b'] / arr[0]
 *   - 函数调用：$.length(x) / $.format("hi {0}", name)
 *   - 一元：!x / -x
 *   - 二元：+ - * / % === !== == != < <= > >= && ||
 *   - 三元：cond ? a : b
 *   - 默认值：a || "fallback"（用 || 表达，不引入额外语法）
 *
 * 不支持：赋值、函数声明、循环、try/catch、`globalThis`/`window`/`Function`
 * 不支持：模板字面量、解构、扩展运算符、可选链
 */

export type Ast =
  | { kind: 'literal'; value: string | number | boolean | null | undefined }
  | { kind: 'identifier'; name: string }
  | { kind: 'member'; object: Ast; property: string; computed: false }
  | { kind: 'index'; object: Ast; index: Ast }
  | { kind: 'call'; callee: Ast; args: Ast[] }
  | { kind: 'unary'; op: '!' | '-' | '+'; operand: Ast }
  | { kind: 'binary'; op: BinaryOp; left: Ast; right: Ast }
  | { kind: 'ternary'; test: Ast; consequent: Ast; alternate: Ast };

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '%'
  | '===' | '!==' | '==' | '!='
  | '<' | '<=' | '>' | '>='
  | '&&' | '||';

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
  | 'punct' | 'op' | 'keyword';

interface Token {
  kind: TokenKind;
  value: string;
  pos: number;
}

const KEYWORDS = new Set(['true', 'false', 'null', 'undefined']);

const MULTI_CHAR_OPS = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||'];
const SINGLE_CHAR_OPS = new Set(['+', '-', '*', '/', '%', '<', '>', '!', '?', ':']);
const PUNCT = new Set(['(', ')', '[', ']', ',', '.']);

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
          value += src[i];
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
    // number
    if (isDigit(c) || (c === '.' && i + 1 < src.length && isDigit(src[i + 1]))) {
      const start = i;
      while (i < src.length && (isDigit(src[i]) || src[i] === '.')) {
        i += 1;
      }
      tokens.push({ kind: 'number', value: src.slice(start, i), pos: start });
      continue;
    }
    // identifier
    if (isIdentStart(c)) {
      const start = i;
      while (i < src.length && isIdentPart(src[i])) {
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
    // multi-char operator
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
    if (SINGLE_CHAR_OPS.has(c)) {
      tokens.push({ kind: 'op', value: c, pos: i });
      i += 1;
      continue;
    }
    if (PUNCT.has(c)) {
      tokens.push({ kind: 'punct', value: c, pos: i });
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
    const t = this.tokens[this.idx];
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
    const test = this.parseLogicalOr();
    if (this.match('op', '?')) {
      const consequent = this.parseTernary();
      this.expect('op', ':');
      const alternate = this.parseTernary();
      return { kind: 'ternary', test, consequent, alternate };
    }
    return test;
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
    return this.parsePostfix();
  }

  private parsePostfix(): Ast {
    let node = this.parsePrimary();
    while (true) {
      if (this.match('punct', '.')) {
        const id = this.expect('identifier');
        node = { kind: 'member', object: node, property: id.value, computed: false };
      } else if (this.match('punct', '[')) {
        const index = this.parseTernary();
        this.expect('punct', ']');
        node = { kind: 'index', object: node, index };
      } else if (this.match('punct', '(')) {
        const args: Ast[] = [];
        if (this.peek().value !== ')') {
          args.push(this.parseTernary());
          while (this.match('punct', ',')) {
            args.push(this.parseTernary());
          }
        }
        this.expect('punct', ')');
        node = { kind: 'call', callee: node, args };
      } else {
        break;
      }
    }
    return node;
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
    if (t.kind === 'keyword') {
      this.advance();
      if (t.value === 'true') return { kind: 'literal', value: true };
      if (t.value === 'false') return { kind: 'literal', value: false };
      if (t.value === 'null') return { kind: 'literal', value: null };
      return { kind: 'literal', value: undefined };
    }
    if (t.kind === 'identifier') {
      this.advance();
      return { kind: 'identifier', name: t.value };
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
}
