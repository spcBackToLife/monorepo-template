// ═══════════════════════════════════════════════════════════════════════════════
// Expression Compiler
// Translates {{ }} template expressions from design schema to JS expressions.
//
// Key transformations:
//   {{ state.view.inputDraft }}           → inputDraft
//   {{ state.data.messages }}             → messages
//   {{ item.role }}                       → item.role (repeat context)
//   {{ item.role === 'user' ? A : B }}    → item.role === 'user' ? A : B
//   {{ $last.userMessage }}               → result.userMessage (onSuccess)
//   {{ $last.data }}                      → result.data
//   {{ state.view.inputDraft.length > 0 }}→ inputDraft.length > 0
//   "Hello {{ name }}"                   → `Hello ${name}`
// ═══════════════════════════════════════════════════════════════════════════════

import type { ExpressionIR } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExpressionScope = 'component' | 'repeat-template' | 'on-success';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Regex matching a single `{{ ... }}` expression block */
const EXPR_BLOCK_RE = /\{\{\s*(.*?)\s*\}\}/g;

/** Regex matching if a string contains at least one `{{ }}` expression */
const HAS_EXPR_RE = /\{\{.*?\}\}/;

/** State path prefixes to strip during compilation (ordered longest-first) */
const STATE_PREFIXES = [
  'state.view.',
  'state.data.',
  'state.',
] as const;

/** $last prefix replacement (maps to on-success result variable) */
const LAST_REPLACEMENT = 'result.';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if a value is a string containing `{{ }}` expression syntax.
 */
export function isExpressionString(value: unknown): boolean {
  return typeof value === 'string' && HAS_EXPR_RE.test(value);
}

/**
 * Compile a raw expression string (possibly containing {{ }}) to an ExpressionIR.
 *
 * Handles:
 * - Pure expression: `{{ state.view.inputDraft }}` → `inputDraft`
 * - Expression with operators: `{{ state.view.x.length > 0 }}` → `x.length > 0`
 * - Ternaries: `{{ item.role === 'user' ? 'right' : 'left' }}` → `item.role === 'user' ? 'right' : 'left'`
 * - Mixed template: `Hello {{ name }}` → `` `Hello ${name}` ``
 * - On-success scope: `{{ $last.data }}` → `result.data`
 * - Plain text (no expressions): returns as-is with empty dependencies
 */
export function compileExpression(raw: string, scope: ExpressionScope = 'component'): ExpressionIR {
  // No expression markers — treat as plain text
  if (!isExpressionString(raw)) {
    return { raw, compiled: raw, dependencies: [] };
  }

  const trimmed = raw.trim();

  // Check if it's a single pure expression (entire string is one {{ ... }})
  // Use [\s\S] instead of . to handle multiline expressions
  const pureMatch = trimmed.match(/^\{\{\s*([\s\S]*?)\s*\}\}$/);

  if (pureMatch) {
    // Single expression: compile the inner content directly
    const inner = pureMatch[1];
    const compiled = compileInnerExpression(inner, scope);
    const dependencies = extractDependencies(compiled);
    return { raw, compiled, dependencies };
  }

  // Mixed template: contains text + one or more {{ }} blocks
  // Convert to template literal
  const compiled = compileTemplateString(trimmed, scope);
  const dependencies = extractDependenciesFromTemplate(trimmed, scope);
  return { raw, compiled, dependencies };
}

/**
 * Extract state/data variable dependencies from a compiled expression.
 * Returns variable names that the expression reads from (for reactivity tracking).
 *
 * Examples:
 *   "inputDraft.length > 0" → ["inputDraft"]
 *   "messages"              → ["messages"]
 *   "item.role"             → [] (item is a loop variable)
 *   "`Hello ${name}`"       → ["name"]
 */
export function extractDependencies(compiled: string): string[] {
  const deps = new Set<string>();

  // Extract top-level identifiers (skip object property access after dot,
  // skip known globals, skip repeat context vars)
  const identifierRe = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
  let match: RegExpExecArray | null;

  while ((match = identifierRe.exec(compiled)) !== null) {
    const ident = match[1];

    // Skip JS keywords, literals, and built-in globals
    if (SKIP_IDENTIFIERS.has(ident)) continue;

    // Skip repeat iteration variables
    if (ident === 'item' || ident === 'index') continue;

    // Skip `result` (on-success scope variable)
    if (ident === 'result') continue;

    // Check it's not a property access (preceded by a dot)
    const beforeIdx = match.index - 1;
    if (beforeIdx >= 0 && compiled[beforeIdx] === '.') continue;

    deps.add(ident);
  }

  return Array.from(deps);
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Compile the inner part of a single {{ ... }} expression.
 * Applies scope-aware transformations:
 * - Strips state.view. and state.data. prefixes (all scopes)
 * - Replaces $last. with result. (primarily on-success, but applied unconditionally
 *   since $last only appears in onSuccess contexts)
 * - item.xxx and index are kept as-is (repeat-template context)
 */
function compileInnerExpression(inner: string, scope: ExpressionScope): string {
  let result = inner;

  // Handle $last.xxx → result.xxx
  // Applied unconditionally since $last only appears in onSuccess contexts,
  // and applying it regardless of scope makes the compiler more forgiving
  if (result.includes('$last.')) {
    result = result.replace(/\$last\./g, LAST_REPLACEMENT);
  }

  // Strip state prefixes: state.view.x → x, state.data.y → y
  result = stripStatePrefixes(result);

  return result;
}

/**
 * Compile a mixed template string to a JS template literal.
 * "Hello {{ state.view.name }}" → "`Hello ${name}`"
 */
function compileTemplateString(template: string, scope: ExpressionScope): string {
  const parts: string[] = [];
  let lastIndex = 0;
  const re = new RegExp(EXPR_BLOCK_RE.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = re.exec(template)) !== null) {
    // Text before this expression
    const textBefore = template.slice(lastIndex, match.index);
    if (textBefore) {
      parts.push(escapeTemplateLiteral(textBefore));
    }

    // The expression part
    const inner = match[1];
    const compiled = compileInnerExpression(inner, scope);
    parts.push(`\${${compiled}}`);

    lastIndex = match.index + match[0].length;
  }

  // Text after last expression
  const textAfter = template.slice(lastIndex);
  if (textAfter) {
    parts.push(escapeTemplateLiteral(textAfter));
  }

  return '`' + parts.join('') + '`';
}

/**
 * Extract dependencies from all expressions within a mixed template string.
 */
function extractDependenciesFromTemplate(template: string, scope: ExpressionScope): string[] {
  const allDeps = new Set<string>();
  const re = new RegExp(EXPR_BLOCK_RE.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = re.exec(template)) !== null) {
    const inner = match[1];
    const compiled = compileInnerExpression(inner, scope);
    const deps = extractDependencies(compiled);
    for (const dep of deps) {
      allDeps.add(dep);
    }
  }

  return Array.from(allDeps);
}

/**
 * Strip state path prefixes from an expression.
 * Processes longest prefixes first to avoid partial matches.
 *
 * "state.view.inputDraft.length > 0" → "inputDraft.length > 0"
 * "state.data.messages.filter(...)"  → "messages.filter(...)"
 * "state.view.a + state.data.b"      → "a + b"
 */
function stripStatePrefixes(expr: string): string {
  let result = expr;

  // Process longest prefixes first to avoid partial matches
  for (const prefix of STATE_PREFIXES) {
    // Use a regex to match the prefix only when it appears as a word boundary start
    // (not preceded by an alphanumeric or dot)
    const escaped = prefix.replace(/\./g, '\\.');
    const re = new RegExp(`(?<![a-zA-Z0-9_$.])${escaped}`, 'g');
    result = result.replace(re, '');
  }

  return result;
}

/**
 * Escape backticks and `${` in template literal text segments.
 */
function escapeTemplateLiteral(text: string): string {
  return text.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// ─── Skip List ───────────────────────────────────────────────────────────────

/** Identifiers to skip when extracting dependencies */
const SKIP_IDENTIFIERS = new Set([
  // JS keywords & literals
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
  'if', 'else', 'return', 'const', 'let', 'var', 'new', 'typeof', 'instanceof',
  'void', 'delete', 'this', 'super', 'class', 'function', 'async', 'await',
  'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch', 'finally',
  'in', 'of', 'with', 'yield', 'import', 'export', 'default', 'from',

  // Built-in globals
  'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'console', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'Promise', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Error', 'TypeError', 'RangeError', 'RegExp',
  'Intl', 'Proxy', 'Reflect',

  // Common method/property names that appear as identifiers in chained expressions
  'length', 'toString', 'valueOf', 'hasOwnProperty',
  'filter', 'map', 'reduce', 'find', 'findIndex', 'some', 'every',
  'includes', 'indexOf', 'slice', 'splice', 'concat', 'join',
  'push', 'pop', 'shift', 'unshift', 'sort', 'reverse',
  'keys', 'values', 'entries', 'trim', 'split', 'replace',
  'startsWith', 'endsWith', 'padStart', 'padEnd', 'repeat',
  'toUpperCase', 'toLowerCase', 'charAt', 'charCodeAt', 'substring',
  'toFixed', 'toPrecision', 'toLocaleString',
  'flat', 'flatMap', 'fill', 'copyWithin', 'at',
  'assign', 'freeze', 'create', 'defineProperty',
  'stringify', 'parse',
  'now', 'getTime', 'toISOString',
  'abs', 'ceil', 'floor', 'round', 'max', 'min', 'random', 'pow', 'sqrt',
  'log', 'log2', 'log10', 'sign', 'trunc',

  // Common callback parameter names
  'prev', 'next', 'acc', 'cur', 'val', 'el', 'cb', 'fn', 'arg', 'args',
  'e', 'event', 'err', 'error',
]);
