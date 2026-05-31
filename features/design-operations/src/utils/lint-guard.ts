/**
 * Expression lint 门禁 —— ops 层落库前的硬校验。
 *
 * 用法：在每个含 expression 字段的 op 内部，normalize 之后调一次：
 *
 *   const lintFail = checkExpressionLint(walkExpressionsInEvent(event));
 *   if (lintFail) return failResultWithIssues(lintFail, '...');
 *
 * 设计原则（参见 PLATFORM-ROOT-CAUSE-ANALYSIS §4.3 方向 1）：
 *   - 表达式语法的真相源是 spec.json，门禁直接消费 walker → lint 的结果
 *   - error 级 issue 一律拒（reject the op；用户得到结构化错误立即可改）
 *   - warning 级 issue 不拒（让 op 继续，但带在 result.issues 里）
 *   - 不"擦屁股"：写错的表达式不允许悄悄落库
 */

import type { ExpressionFieldRef } from '@globallink/design-expression';
import type { OperationResult, InverseData } from '../types';

/**
 * 检查 walker 输出的 ExpressionFieldRef[] 是否包含 error 级 issue。
 * - 含 error → 返回这些 refs（仅含 error，warning 过滤掉），让调用方拒 op
 * - 不含 error → 返回 undefined，调用方继续；可把含 warning 的 refs 挂到 success result.issues
 */
export function findLintErrors(refs: ExpressionFieldRef[]): ExpressionFieldRef[] | undefined {
  const errs: ExpressionFieldRef[] = [];
  for (const r of refs) {
    const errIssues = r.issues.filter((i) => i.level === 'error');
    if (errIssues.length) {
      errs.push({ ...r, issues: errIssues });
    }
  }
  return errs.length ? errs : undefined;
}

/**
 * 构造一个"lint 失败"的 ops 结果（success=false + issues 结构化挂载）。
 *
 * description 包含人读摘要："expression lint failed: 3 issue(s) in events[0].condition.when, ..."
 */
export function buildLintFailResult(
  errs: ExpressionFieldRef[],
  affectedNodeIds: string[],
  opLabel: string,
): { project: never; result: OperationResult; inverse: InverseData } {
  const sample = errs.slice(0, 3).map((r) => `${r.fieldPath}: ${r.issues[0]?.message}`).join('; ');
  const more = errs.length > 3 ? ` (+${errs.length - 3} more)` : '';
  return {
    project: undefined as never, // 调用方会用原 project（不可变）
    result: {
      success: false,
      description: `${opLabel}: expression lint failed (${errs.length} issue(s)) — ${sample}${more}`,
      affectedNodeIds,
      issues: errs.map((r) => ({
        nodeId: r.nodeId,
        screenId: r.screenId,
        fieldPath: r.fieldPath,
        rawValue: r.rawValue,
        issues: r.issues.map((i) => ({
          code: i.code,
          level: i.level,
          message: i.message,
          ...(i.pos ? { pos: i.pos } : {}),
          ...(i.specRef ? { specRef: i.specRef } : {}),
          ...(i.hint ? { hint: i.hint } : {}),
          ...(i.suggestedFix ? { suggestedFix: i.suggestedFix } : {}),
        })),
      })),
    },
    inverse: { type: 'noop', params: {} },
  };
}

/**
 * 把 lint warnings（非阻塞）合并到一个 success result 上。
 * - refs 全空 → 直接返回原 result
 * - refs 含 warning → result.issues 增量挂载
 */
export function attachLintWarnings(
  result: OperationResult,
  refs: ExpressionFieldRef[],
): OperationResult {
  if (!refs.length) return result;
  const issues = refs.map((r) => ({
    nodeId: r.nodeId,
    screenId: r.screenId,
    fieldPath: r.fieldPath,
    rawValue: r.rawValue,
    issues: r.issues.map((i) => ({
      code: i.code,
      level: i.level,
      message: i.message,
      ...(i.pos ? { pos: i.pos } : {}),
      ...(i.specRef ? { specRef: i.specRef } : {}),
      ...(i.hint ? { hint: i.hint } : {}),
      ...(i.suggestedFix ? { suggestedFix: i.suggestedFix } : {}),
    })),
  }));
  return { ...result, issues: [...(result.issues ?? []), ...issues] };
}
