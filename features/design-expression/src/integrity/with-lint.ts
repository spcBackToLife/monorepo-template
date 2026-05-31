/**
 * Integrity check with Expression Language v1.0 lint —— EXPR-C-3 R-EXPR-01。
 *
 * 增强 design-schema 的 checkProjectIntegrity / checkScreenIntegrity / checkNodeIntegrity：
 * 在原有 R-EVENTS / R-STATUS / R-PHASE / R-PLAN 之外，再叠加 R-EXPR-01：
 *
 *   R-EXPR-01: all-expressions-must-lint-clean
 *
 * 严重度选 **warning**（非 error）：
 *   - integrity 是「事后扫库器」，必须保证「现在合法的 schema 永远红不了」
 *   - spec 演进（v1.0 → v1.1）时旧表达式可能落入 deprecated 区——此时 integrity
 *     应该 warn 提示迁移而不是炸库
 *   - AI 落库门禁由 design-operations 的 ops 层兜底（strict）
 *
 * 设计原则（参见 PLATFORM-ROOT-CAUSE-ANALYSIS §4.3 方向 1）：
 *   - 这是「事后扫库」语义，与 ops 落库门禁强度区分
 *   - 表达式语法的真相源是 spec.json，issues 直接来自 walker → lint 结果
 *
 * 用法：
 *   const report = checkProjectIntegrityWithLint(project);
 *   // 等价于 design-schema.checkProjectIntegrity(project) + R-EXPR-01 lint refs
 */

import type {
  ComponentNode,
  DesignProject,
  IntegrityIssue,
  IntegrityReport,
  Screen,
} from '@globallink/design-schema';
import {
  checkNodeIntegrity,
  checkProjectIntegrity,
  checkScreenIntegrity,
} from '@globallink/design-schema';
import {
  walkExpressionsInNode,
  walkExpressionsInProject,
  walkExpressionsInScreen,
  type ExpressionFieldRef,
} from '../expression/walker';

// ===== refs → IntegrityIssue 映射 =====

function refToIssues(
  ref: ExpressionFieldRef,
  targetKind: 'node' | 'screen' | 'project',
  targetIdFallback: string,
  targetName?: string,
): IntegrityIssue[] {
  // ExpressionFieldRef 已经按字段聚合了多条 LintIssue；这里把每条 lint issue
  // 都拍成 IntegrityIssue（保留 issue 级别），而不是合并成一条
  return ref.issues.map((i) => ({
    severity: i.level === 'error' ? 'warning' : 'warning', // R-EXPR-01 一律 warning
    code: 'R-EXPR-01',
    target: {
      kind: targetKind,
      id: ref.nodeId ?? ref.screenId ?? targetIdFallback,
      ...(targetName ? { name: targetName } : {}),
    },
    path: ref.fieldPath,
    message:
      `[${i.code}] ${i.message}` +
      (i.hint ? ` · hint: ${i.hint}` : '') +
      (i.suggestedFix ? ` · suggestedFix: ${i.suggestedFix}` : '') +
      (i.specRef ? ` · spec: ${i.specRef}` : ''),
  }));
}

// ===== 公共 API =====

/**
 * 校验完整项目 + R-EXPR-01 lint 检查。
 */
export function checkProjectIntegrityWithLint(project: DesignProject): IntegrityReport {
  const base = checkProjectIntegrity(project);
  const refs = walkExpressionsInProject(project);
  const exprIssues: IntegrityIssue[] = [];
  for (const ref of refs) {
    exprIssues.push(...refToIssues(ref, 'project', project.id, project.name));
  }
  return mergeReports(base, exprIssues);
}

/**
 * 仅校验单屏 + R-EXPR-01。
 */
export function checkScreenIntegrityWithLint(screen: Screen): IntegrityReport {
  const base = checkScreenIntegrity(screen);
  const refs = walkExpressionsInScreen(screen);
  const exprIssues: IntegrityIssue[] = [];
  for (const ref of refs) {
    exprIssues.push(...refToIssues(ref, 'screen', screen.id, screen.name));
  }
  return mergeReports(base, exprIssues);
}

/**
 * 仅校验单节点 + R-EXPR-01。
 */
export function checkNodeIntegrityWithLint(node: ComponentNode): IntegrityReport {
  const base = checkNodeIntegrity(node);
  const refs = walkExpressionsInNode(node);
  const exprIssues: IntegrityIssue[] = [];
  for (const ref of refs) {
    exprIssues.push(...refToIssues(ref, 'node', node.id, node.name));
  }
  return mergeReports(base, exprIssues);
}

function mergeReports(base: IntegrityReport, additionalIssues: IntegrityIssue[]): IntegrityReport {
  if (additionalIssues.length === 0) return base;
  const issues = [...base.issues, ...additionalIssues];
  return {
    issues,
    counts: {
      error: issues.filter((i) => i.severity === 'error').length,
      warning: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    },
  };
}
