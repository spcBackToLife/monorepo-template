/**
 * Expression Linter — Expression Language v1.0 落库门禁。
 *
 * 真相源：features/design-schema/src/expression-lang/spec.json
 * 规约：features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md
 *
 * 设计要点（spec v1.0）：
 *   - 复用 Parser → 拿到 AST → 后序遍历，spec-driven 检查 identifier / call / member
 *   - 输出**结构化** LintIssue（含 errorCode / hint / suggestedFix / specRef），
 *     直接喂给 AI / 编辑器，让错误是「修复指南」而不是「console.warn 一句话」
 *   - 三层强度（required / literal-or-expr / template）覆盖 9 个 expression 字段语义
 *
 * 用法：
 *   const r = lintExpression('{{ Date.foo() }}', 'expression');
 *   if (!r.ok) console.error(r.issues);  // → [{ code:'E003', message:..., hint:..., suggestedFix:... }]
 *
 *   lintExpressionField('hello', 'literal-or-expr');  // → ok（字面量字段允许纯字面量）
 *   lintExpressionField('hello', 'required');         // → !ok（必须 {{ }}）
 *
 * 设计哲学（参考 Google CEL）：
 *   Lint 阶段 = Check 阶段。在编辑期/落库期完成 spec 一致性校验，
 *   不再让运行时 swallow error 静默吞掉违规表达式。
 */

import type { Ast } from './Parser';
import {
  parseExpression,
  parseSingleExpression,
  parseTemplate,
  ExpressionParseError,
} from './Parser';
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
  listGlobalMembers,
  listBuiltinFunctions,
  findMigrationHint,
  type ExprLangErrorCode,
  type TypeName,
} from '@globallink/design-schema';

// ===== 类型 =====

/** spec.errorCodes 中可由 lint 阶段产出的错误码（排除 E006 静态类型推断警告） */
export type LintErrorCode = Exclude<ExprLangErrorCode, 'E006'>;

/** 单条 lint 问题（结构化，可机读） */
export interface LintIssue {
  /** 错误码，对应 spec.errorCodes */
  code: LintErrorCode;
  /** error / warning 由 spec 决定 */
  level: 'error' | 'warning';
  /** 人读消息（已渲染好） */
  message: string;
  /** 在原 src 中的位置（best-effort，pos.start === pos.end 表示无精确位置） */
  pos?: { start: number; end: number };
  /** 引用的 spec 章节（如 'EXPR-LANG-SPEC v1.0 §3.2'） */
  specRef?: string;
  /** 修复提示（人读，来自 spec.errorCodes[code].hintTemplate） */
  hint?: string;
  /** 建议替换字符串（来自 spec.knownMigrations，可直接 onChange 应用） */
  suggestedFix?: string;
}

export interface LintResult {
  ok: boolean;
  issues: LintIssue[];
}

/**
 * 字段强度：决定 lint 如何处理一个字段值。
 *   - 'required'        → 必须是字符串 + 必须含 `{{...}}`，否则 E001
 *   - 'literal-or-expr' → 字符串且含 `{{...}}` 才 lint，否则视为字面量直接放行
 *   - 'template'        → 总是按 template 走 parseTemplate（混合文本 + `{{...}}`）
 */
export type FieldStrength = 'required' | 'literal-or-expr' | 'template';

/** 表达式编辑模式（与 Editor / validate.ts 对齐） */
export type ExpressionMode = 'expression' | 'template';

// ===== 主入口 =====

/**
 * Lint 一个表达式字符串。
 *
 *   - mode='expression': 当作裸表达式或单段 `{{...}}`
 *   - mode='template':   当作可能含多段 `{{...}}` 和文本的模板
 */
export function lintExpression(src: string, mode: ExpressionMode = 'expression'): LintResult {
  const issues: LintIssue[] = [];

  if (typeof src !== 'string') {
    return {
      ok: false,
      issues: [
        makeIssue('E001', `expected string, got ${typeof src}`, undefined, '§1.1 literals'),
      ],
    };
  }

  const trimmed = src.trim();
  if (trimmed === '') return { ok: true, issues: [] };

  try {
    if (mode === 'template') {
      const segments = parseTemplate(src);
      for (const seg of segments) {
        if (seg.kind === 'expr') {
          checkAst(seg.ast, src, issues);
        }
      }
    } else {
      // expression 模式：单段 / 裸表达式 / 混合模板
      const single = parseSingleExpression(src);
      if (single !== undefined) {
        checkAst(single, src, issues);
      } else if (!trimmed.includes('{{')) {
        const ast = parseExpression(trimmed);
        checkAst(ast, src, issues);
      } else {
        const segments = parseTemplate(src);
        for (const seg of segments) {
          if (seg.kind === 'expr') {
            checkAst(seg.ast, src, issues);
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof ExpressionParseError) {
      issues.push(makeIssue('E001', err.message.replace(/^\[expression\]\s*/, ''), undefined, '§1 syntax'));
    } else {
      issues.push(
        makeIssue(
          'E001',
          err instanceof Error ? err.message : String(err),
          undefined,
          '§1 syntax',
        ),
      );
    }
  }

  return { ok: issues.every((i) => i.level !== 'error'), issues };
}

/**
 * Lint 一个**字段值**，按 FieldStrength 处理三种情况。
 *
 * - 非字符串 → ok（视为字面量）
 * - 'required' 强度：必须含 `{{...}}`，否则 E001
 * - 'literal-or-expr'：含 `{{...}}` 才走 lint，纯字面量放行
 * - 'template'：走模板解析
 */
export function lintExpressionField(value: unknown, strength: FieldStrength): LintResult {
  if (value === null || value === undefined) return { ok: true, issues: [] };
  if (typeof value !== 'string') return { ok: true, issues: [] };
  const trimmed = value.trim();
  if (trimmed === '') return { ok: true, issues: [] };

  const hasInterp = /\{\{[\s\S]+?\}\}/.test(value);

  if (strength === 'required') {
    if (!hasInterp) {
      return {
        ok: false,
        issues: [
          makeIssue(
            'E001',
            `field requires an expression (must contain {{...}}); got bare string ${JSON.stringify(value).slice(0, 50)}`,
            undefined,
            '§1 syntax',
            '把字段写成 `{{ <expr> }}` 形式；如要清空请传空字符串而不是字面量',
          ),
        ],
      };
    }
    return lintExpression(value, 'expression');
  }

  if (strength === 'literal-or-expr') {
    if (!hasInterp) return { ok: true, issues: [] };
    return lintExpression(value, 'expression');
  }

  // template
  return lintExpression(value, 'template');
}

// ===== AST 检查器 =====

/**
 * AST 后序遍历，对每个节点做 spec-driven 检查。
 * 把 issue 累加到外部 issues 数组，不抛错（一个表达式可能有多个问题）。
 */
function checkAst(ast: Ast, src: string, issues: LintIssue[]): void {
  switch (ast.kind) {
    case 'literal':
    case 'regex':
      return;

    case 'array':
      for (const e of ast.elements) checkAst(e, src, issues);
      return;

    case 'object':
      for (const p of ast.properties) {
        if (p.key.kind === 'computed') checkAst(p.key.expr, src, issues);
        checkAst(p.value, src, issues);
      }
      return;

    case 'identifier': {
      const name = ast.name;
      if (isForbiddenGlobal(name)) {
        issues.push(
          makeIssue(
            'E007',
            `access to \`${name}\` is forbidden`,
            findIdent(src, name),
            '§3.2 globals (blocked)',
            `\`${name}\` 是被禁全局；可用全局：${listAllowedGlobals().join(', ')}`,
          ),
        );
        return;
      }
      if (
        isContextualIdentifier(name) ||
        isBuiltinNamespace(name) ||
        isAllowedGlobal(name)
      ) {
        return;
      }
      // 未声明 identifier
      issues.push(
        makeIssue(
          'E002',
          `unknown identifier \`${name}\``,
          findIdent(src, name),
          '§3.1 contextual / §3.2 globals',
          `可用：contextual=${listContextualIdentifiers().join(', ')} | globals=${listAllowedGlobals().join(', ')} | builtin=$.* (${listBuiltinFunctions('$').slice(0, 6).join(', ')}...)`,
          findMigrationHint(name + '()') ?? findMigrationHint(name),
        ),
      );
      return;
    }

    case 'member':
    case 'index': {
      // 只检 object；property/key 是字面量或表达式（递归）
      checkAst(ast.object, src, issues);
      if (ast.kind === 'index') {
        checkAst(ast.index, src, issues);
      } else {
        // member 形式：检测 globalNs.memberNotInWhitelist（如 Date.foo）
        if (ast.object.kind === 'identifier' && isAllowedGlobal(ast.object.name)) {
          const ns = ast.object.name;
          const memberSpec = getGlobalMember(ns, ast.property);
          if (!memberSpec) {
            issues.push(
              makeIssue(
                'E003',
                `\`${ns}.${ast.property}\` is not allowed`,
                findIdent(src, `${ns}.${ast.property}`),
                '§3.2 globals',
                `\`${ns}\` 允许的成员：${listGlobalMembers(ns).join(', ') || '(none)'}`,
                findMigrationHint(`${ns}.${ast.property}()`),
              ),
            );
          }
        }
      }
      return;
    }

    case 'call': {
      const callee = ast.callee;
      // 1. callable global: Number(x) / String(x) / Boolean(x)
      if (callee.kind === 'identifier') {
        const name = callee.name;
        if (isForbiddenGlobal(name)) {
          issues.push(
            makeIssue(
              'E007',
              `call to \`${name}\` is forbidden`,
              findIdent(src, name),
              '§3.2 globals (blocked)',
            ),
          );
        } else if (isAllowedGlobal(name)) {
          const ns = EXPR_LANG_SPEC.scope.globals[name];
          if (!ns?.callable) {
            issues.push(
              makeIssue(
                'E003',
                `\`${name}\` is a namespace, not a callable`,
                findIdent(src, name),
                '§3.2 globals',
                `\`${name}\` 不可直接调用；如需访问成员请用 \`${name}.member\` 形式`,
              ),
            );
          }
        } else if (
          !isContextualIdentifier(name) &&
          !isBuiltinNamespace(name)
        ) {
          issues.push(
            makeIssue(
              'E002',
              `unknown function \`${name}\``,
              findIdent(src, name),
              '§3 scope',
              `可用 callable globals：Number / String / Boolean | 内置函数请用 $.fn() 形式`,
              findMigrationHint(`${name}()`),
            ),
          );
        }
        // contextual identifier 调用（如 state()）—— 默默放行（运行时会拒）
      }
      // 2/3/4. member 调用
      else if (callee.kind === 'member') {
        // 2. $.xxx —— builtin
        if (callee.object.kind === 'identifier' && isBuiltinNamespace(callee.object.name)) {
          const ns = callee.object.name;
          const def = getBuiltinFunction(ns, callee.property);
          if (!def) {
            issues.push(
              makeIssue(
                'E002',
                `unknown builtin \`${ns}.${callee.property}\``,
                findIdent(src, `${ns}.${callee.property}`),
                '§3.3 builtins',
                `可用：${listBuiltinFunctions(ns).join(', ')}`,
                findMigrationHint(`${ns}.${callee.property}()`),
              ),
            );
          }
        }
        // 3. Global.member —— 全局静态方法
        else if (callee.object.kind === 'identifier' && isAllowedGlobal(callee.object.name)) {
          const globalName = callee.object.name;
          const memberSpec = getGlobalMember(globalName, callee.property);
          if (!memberSpec) {
            issues.push(
              makeIssue(
                'E003',
                `\`${globalName}.${callee.property}\` is not allowed`,
                findIdent(src, `${globalName}.${callee.property}`),
                '§3.2 globals',
                `\`${globalName}\` 允许的成员：${listGlobalMembers(globalName).join(', ') || '(none)'}`,
                findMigrationHint(`${globalName}.${callee.property}()`),
              ),
            );
          } else if ('kind' in memberSpec && memberSpec.kind === 'constant') {
            issues.push(
              makeIssue(
                'E003',
                `\`${globalName}.${callee.property}\` is a constant, not callable`,
                findIdent(src, `${globalName}.${callee.property}`),
                '§3.2 globals',
              ),
            );
          } else {
            // ★ E008: 合法但 deprecated 的用法（如 Date.now() → $.now()）
            const source = `${globalName}.${callee.property}()`;
            const recommended = findMigrationHint(source);
            if (recommended) {
              issues.push(
                makeIssue(
                  'E008',
                  `\`${source}\` is deprecated; recommend \`${recommended.split(' ')[0]}\``,
                  findIdent(src, `${globalName}.${callee.property}`),
                  '§7 knownMigrations',
                  recommended,
                  recommended.split(' ')[0],
                ),
              );
            }
          }
        }
        // 4. instance.method —— 实例方法白名单
        //    lint 阶段没有运行时类型；只检测能从字面量节点静态推断的
        else {
          const inferred = inferStaticType(callee.object);
          if (inferred) {
            const memberSpec = getInstanceMember(inferred, callee.property);
            if (!memberSpec) {
              issues.push(
                makeIssue(
                  'E004',
                  `type \`${inferred}\` does not allow method \`.${callee.property}()\``,
                  findIdent(src, `.${callee.property}`),
                  '§3.4 instanceMethods',
                  `\`${inferred}\` 允许的方法：${listInstanceMethodsForType(inferred).join(', ')}`,
                ),
              );
            }
          }
          // 推不出类型 → 放行（运行时 Evaluator 会再查一次白名单）
        }
        // 调用前，递归检查 callee.object（可能本身有问题，如 Date.foo.bar()）
        checkAst(callee.object, src, issues);
      }
      // 5. callee = call/literal/index 等 —— 递归检查 callee 自己
      else {
        checkAst(callee, src, issues);
      }
      // 检查 args
      for (const a of ast.args) checkAst(a, src, issues);
      return;
    }

    case 'unary':
      checkAst(ast.operand, src, issues);
      return;

    case 'binary':
      checkAst(ast.left, src, issues);
      checkAst(ast.right, src, issues);
      return;

    case 'ternary':
      checkAst(ast.test, src, issues);
      checkAst(ast.consequent, src, issues);
      checkAst(ast.alternate, src, issues);
      return;
  }
}

// ===== 工具 =====

/** 静态类型推断：仅对字面量节点能推断出 spec instance type */
function inferStaticType(ast: Ast): TypeName | null {
  if (ast.kind === 'literal') {
    if (typeof ast.value === 'string') return 'string';
    if (typeof ast.value === 'number') return 'number';
    if (typeof ast.value === 'boolean') return 'boolean';
    return null;
  }
  if (ast.kind === 'regex') return 'regex';
  if (ast.kind === 'array') return 'array';
  if (ast.kind === 'object') return 'object';
  return null;
}

/** 从 spec.scope.instanceMethods 列出某类型可用方法名（spec/index.ts 的 listInstanceMembers 重命名包） */
function listInstanceMethodsForType(type: TypeName): string[] {
  const t = EXPR_LANG_SPEC.scope.instanceMethods[type];
  if (!t) return [];
  return Object.keys(t).filter((k) => !k.startsWith('_'));
}

/** 在 src 中粗略定位 identifier 字符串的位置（best-effort，无精确 AST pos） */
function findIdent(src: string, ident: string): { start: number; end: number } | undefined {
  const idx = src.indexOf(ident);
  if (idx < 0) return undefined;
  return { start: idx, end: idx + ident.length };
}

/** 构造一个 LintIssue，自动从 spec 取 level，渲染 hint 模板 */
function makeIssue(
  code: LintErrorCode,
  message: string,
  pos: { start: number; end: number } | undefined,
  specRefSection: string,
  hint?: string,
  suggestedFix?: string,
): LintIssue {
  const def = EXPR_LANG_SPEC.errorCodes[code];
  const issue: LintIssue = {
    code,
    level: def?.level ?? 'error',
    message: `[${code}] ${message}`,
    specRef: `EXPR-LANG-SPEC v${EXPR_LANG_SPEC.version} ${specRefSection}`,
  };
  if (pos) issue.pos = pos;
  if (hint) issue.hint = hint;
  if (suggestedFix) issue.suggestedFix = suggestedFix;
  return issue;
}
