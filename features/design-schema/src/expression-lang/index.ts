/**
 * Expression Language v1.0 — Spec 类型定义
 *
 * 这是 design-platform 的第二个 DSL（仅次于 schema 本身）。
 *
 * 设计哲学（参考 Google CEL）：
 *   - 三阶段架构：Parse / Check / Eval（前两阶段在编辑期/落库期完成）
 *   - 表达式 AST 进 schema（v1.0 暂仍以 string 形态序列化，但 Parse 失败必拒）
 *   - Scope 显式声明：本文件就是唯一真相源
 *   - 错误结构化：有 errorCode + hint + suggestedFix，给 AI 看的
 *
 * 真相源：
 *   - 机读：./spec.json
 *   - 人读：./EXPR-LANG-SPEC.md
 *   - 类型：本文件
 *
 * 约束：
 *   - Parser / Evaluator / Lint / Editor / SKILL 全部从本文件 import 真相
 *   - 改 spec.json 必须同步本文件类型
 *   - 所有"我支持哪些语法/标识符/方法"的判断走本文件，不允许在其他地方硬编码
 */

import specJson from './spec.json';

// ===== Spec 类型定义 =====

export interface ExpressionLangSpec {
  $schema?: string;
  version: string;
  name: string;
  description: string;
  syntax: SyntaxSpec;
  scope: ScopeSpec;
  errorCodes: Record<ErrorCode, ErrorCodeDef>;
  knownMigrations: Record<string, string>;
}

export interface SyntaxSpec {
  literals: {
    string: { supported: boolean; delimiters: string[] };
    number: { supported: boolean; form: string };
    boolean: { supported: boolean; values: string[] };
    null: { supported: boolean };
    undefined: { supported: boolean };
    regex: { supported: boolean; form: string; flags: string[] };
    array: { supported: boolean; form: string };
    object: { supported: boolean; form: string };
  };
  operators: {
    binary: string[];
    unary: string[];
    ternary: boolean;
  };
  memberAccess: {
    dot: boolean;
    bracket: boolean;
    optionalChain: boolean;
    _note?: string;
  };
  callForm: { supported: boolean; _note?: string };
  forbidden: string[];
}

export interface ScopeSpec {
  contextual: Record<string, ContextualIdentifier>;
  globals: Record<string, GlobalNamespace>;
  builtins: Record<string, BuiltinNamespace>;
  instanceMethods: Record<TypeName, Record<string, InstanceMember>> & {
    _description?: string;
  };
}

export interface ContextualIdentifier {
  type: string;
  scope: 'always' | string;
  description: string;
  shape?: string;
}

export interface GlobalNamespace {
  kind: 'namespace';
  callable: boolean;
  callDescription?: string;
  members: Record<string, GlobalMember>;
  description?: string;
}

export type GlobalMember =
  | { args: string[]; returns: string; description?: string; _warning?: string }
  | { kind: 'constant'; type: string };

export interface BuiltinNamespace {
  _description?: string;
  [funcName: string]:
    | { args: string[]; returns: string; description?: string; _warning?: string }
    | string
    | undefined;
}

export type TypeName = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'regex';

export type InstanceMember =
  | { args: string[]; returns: string; description?: string; _warning?: string }
  | { kind: 'property'; type: string };

export type ErrorCode = 'E001' | 'E002' | 'E003' | 'E004' | 'E005' | 'E006' | 'E007' | 'E008';

export interface ErrorCodeDef {
  summary: string;
  description: string;
  level: 'error' | 'warning';
  examples?: string[];
  hintTemplate?: string;
  blockedList?: string[];
}

// ===== Spec 实例（运行时唯一真相源） =====

export const spec = specJson as unknown as ExpressionLangSpec;

// ===== 便利访问器（避免散落使用方各自从 spec 里摸路径） =====

/** 当前 spec 版本号 */
export const SPEC_VERSION: string = spec.version;

/** 是否是 contextual identifier（state / globalView / item / index / parent / $last） */
export function isContextualIdentifier(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(spec.scope.contextual, name);
}

/** 是否是 builtin namespace 引用（默认就 `$`） */
export function isBuiltinNamespace(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(spec.scope.builtins, name);
}

/** 是否是允许的 global namespace（Date / Math / Number / String / Boolean / JSON / Object / Array） */
export function isAllowedGlobal(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(spec.scope.globals, name);
}

/** 是否是被禁全局（window / eval / Function / process ...） */
export function isForbiddenGlobal(name: string): boolean {
  const blocked = spec.errorCodes.E007.blockedList ?? [];
  return blocked.includes(name);
}

/** 取 builtin 函数定义；不存在返回 undefined */
export function getBuiltinFunction(
  ns: string,
  fn: string,
): { args: string[]; returns: string; description?: string } | undefined {
  const namespace = spec.scope.builtins[ns];
  if (!namespace) return undefined;
  if (!Object.prototype.hasOwnProperty.call(namespace, fn)) return undefined;
  const member = namespace[fn];
  if (!member || typeof member === 'string') return undefined;
  return member as { args: string[]; returns: string; description?: string };
}

/** 取 global namespace 上的方法/常量定义 */
export function getGlobalMember(ns: string, member: string): GlobalMember | undefined {
  const g = spec.scope.globals[ns];
  if (!g) return undefined;
  if (!Object.prototype.hasOwnProperty.call(g.members, member)) return undefined;
  return g.members[member];
}

/** 取实例方法/属性定义（按运行时类型） */
export function getInstanceMember(
  type: TypeName,
  member: string,
): InstanceMember | undefined {
  const t = spec.scope.instanceMethods[type];
  if (!t) return undefined;
  if (!Object.prototype.hasOwnProperty.call(t, member)) return undefined;
  return t[member];
}

/** 列出所有可用的 contextual identifier 名（给错误提示用） */
export function listContextualIdentifiers(): string[] {
  return Object.keys(spec.scope.contextual);
}

/** 列出所有可用的 global namespace 名 */
export function listAllowedGlobals(): string[] {
  return Object.keys(spec.scope.globals);
}

/** 列出某 global namespace 下允许的成员 */
export function listGlobalMembers(ns: string): string[] {
  const g = spec.scope.globals[ns];
  return g ? Object.keys(g.members) : [];
}

/** 列出某实例类型允许的方法/属性名 */
export function listInstanceMembers(type: TypeName): string[] {
  const t = spec.scope.instanceMethods[type];
  return t ? Object.keys(t).filter((k) => !k.startsWith('_')) : [];
}

/** 列出所有 builtin 函数名（用于编辑器自动补全） */
export function listBuiltinFunctions(ns = '$'): string[] {
  const n = spec.scope.builtins[ns];
  if (!n) return [];
  return Object.keys(n).filter((k) => !k.startsWith('_'));
}

/** 取 errorCode 定义 */
export function getErrorDef(code: ErrorCode): ErrorCodeDef {
  return spec.errorCodes[code];
}

/** 取已知迁移建议（用于 lint suggestedFix） */
export function findMigrationHint(source: string): string | undefined {
  return spec.knownMigrations[source];
}
