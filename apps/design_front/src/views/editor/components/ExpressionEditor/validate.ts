/**
 * 表达式字段校验器（EXPR-E-1：升级到 spec-driven lint）。
 *
 * 两种编辑模式：
 *   - 'template'   —— 允许混合文本和 `{{ ... }}` 插值段（URL / 文案）
 *   - 'expression' —— 允许裸表达式或 `{{ ... }}` 单段（state.set 的 value、predicate、path 等）
 *
 * v1.0 升级：
 *   - 不再仅依赖 parse 通过；调用 design-expression 的 lintExpression（spec-driven 检查
 *     identifier / call / member 是否在 EXPR-LANG-SPEC v1.0 白名单内）
 *   - 返回结构化 issues[]（含 errorCode / hint / suggestedFix / specRef）
 *   - UI 层据此渲染 block-style 错误信息 + 「应用建议」按钮
 *
 * 真相源：features/design-schema/src/expression-lang/spec.json
 */

import {
  lintExpression as lintExpr,
  parseTemplate,
  ExpressionParseError,
  type LintIssue,
  type ExpressionMode,
} from '@globallink/design-expression';

export type { ExpressionMode };

export interface ExpressionValidation {
  ok: boolean;
  /** 首个错误信息（UI 单行 fallback 展示用，向后兼容） */
  error?: string;
  /** 语法是否包含至少一个 `{{ ... }}` 段（纯字面量也算合法） */
  hasDynamic: boolean;
  /**
   * ★ EXPR-E-1：结构化 lint issues（来自 design-engine 的 lintExpression）。
   * UI 层据此渲染：[E003] msg · spec ref · hint · 应用建议按钮。
   */
  issues: LintIssue[];
}

export function validateExpressionField(
  input: string,
  mode: ExpressionMode,
): ExpressionValidation {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: true, hasDynamic: false, issues: [] };

  try {
    // 1. 先 parse 一道判断 hasDynamic（mode='template' 下混合文本可空）
    let hasDynamic = false;
    if (mode === 'template') {
      const segs = parseTemplate(input);
      hasDynamic = segs.some((s) => s.kind === 'expr');
    } else {
      hasDynamic = trimmed.includes('{{');
    }

    // 2. 跑 spec-driven lint（含 parse 错误聚合到 LintIssue）
    const r = lintExpr(input, mode);

    if (r.ok) {
      return { ok: true, hasDynamic, issues: r.issues };
    }

    // 3. lint 失败：返回结构化 issues + 单行 fallback
    const firstErr = r.issues.find((i) => i.level === 'error') ?? r.issues[0];
    return {
      ok: false,
      hasDynamic,
      issues: r.issues,
      error: firstErr ? firstErr.message : 'expression lint failed',
    };
  } catch (err) {
    // 兜底：lint 内部已捕获 ExpressionParseError 并转换为 E001 LintIssue，
    // 这里只在极少数 panic 场景兜底
    if (err instanceof ExpressionParseError) {
      return {
        ok: false,
        hasDynamic: false,
        issues: [],
        error: err.message,
      };
    }
    return {
      ok: false,
      hasDynamic: false,
      issues: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
