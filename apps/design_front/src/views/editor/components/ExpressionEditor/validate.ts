/**
 * 表达式字段校验器。
 *
 * 两种编辑模式：
 *   - 'template'   —— 允许混合文本和 `{{ ... }}` 插值段（URL / 文案）
 *   - 'expression' —— 允许裸表达式或 `{{ ... }}` 单段（state.set 的 value、predicate、path 等）
 *
 * 校验只使用 parse（结构合法即可），不执行求值。
 */

import {
  parseExpression,
  parseTemplate,
  parseSingleExpression,
  ExpressionParseError,
} from '@globallink/design-engine';

export type ExpressionMode = 'template' | 'expression';

export interface ExpressionValidation {
  ok: boolean;
  /** 首个错误信息（UI 展示用） */
  error?: string;
  /** 语法是否包含至少一个 `{{ ... }}` 段（纯字面量也算合法） */
  hasDynamic: boolean;
}

export function validateExpressionField(
  input: string,
  mode: ExpressionMode,
): ExpressionValidation {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: true, hasDynamic: false };

  try {
    if (mode === 'template') {
      const segs = parseTemplate(input);
      const hasDynamic = segs.some((s) => s.kind === 'expr');
      return { ok: true, hasDynamic };
    }

    // expression 模式：
    // 1) 整串是 `{{ ... }}` → 当作单表达式校验
    // 2) 不带 `{{}}` → 当作裸表达式
    // 3) 其它（混合文本 + 多个插值） → 按 template 校验
    const singleAst = parseSingleExpression(trimmed);
    if (singleAst) return { ok: true, hasDynamic: true };
    if (!trimmed.includes('{{')) {
      parseExpression(trimmed);
      return { ok: true, hasDynamic: false };
    }
    const segs = parseTemplate(input);
    return { ok: true, hasDynamic: segs.some((s) => s.kind === 'expr') };
  } catch (err) {
    if (err instanceof ExpressionParseError) {
      return { ok: false, error: err.message, hasDynamic: false };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      hasDynamic: false,
    };
  }
}
