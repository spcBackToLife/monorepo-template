/**
 * 表达式引擎 — v2 state/action/expression 模型的求值核心。
 *
 * 使用：
 *   import { evaluateExpression, compileExpression, extractDeps } from '@globallink/design-engine/expression';
 *
 *   evaluateExpression("{{ state.view.inputDraft }}", { state: screenState });
 *   evaluateExpression("{{ item.role === 'user' ? '#667eea' : '#fff' }}", { state, item });
 *
 * 语法详见 Parser.ts；内置函数清单见 BuiltinFunctions.ts；安全保证见 Evaluator.ts。
 */

export type {
  Ast,
  BinaryOp,
  TemplateSegment,
} from './Parser';

export {
  parseExpression,
  parseTemplate,
  parseSingleExpression,
  ExpressionParseError,
} from './Parser';

export type {
  EvalContext,
} from './Evaluator';

export {
  evaluateAst,
  evaluateExpression,
  compileExpression,
  extractDeps,
  ExpressionEvaluationError,
} from './Evaluator';

export type { BuiltinFunctions } from './BuiltinFunctions';
export { builtinFunctions, FORBIDDEN_GLOBALS } from './BuiltinFunctions';

// ===== EXPR-C: Lint 工具链 =====
//
// Lint 阶段（CEL 三阶段中的 Check 阶段）：在编辑期 / 落库期完成 spec 一致性校验，
// 输出结构化 LintIssue 直接喂给 AI / 编辑器。
//
// 真相源：features/design-schema/src/expression-lang/spec.json
export type {
  LintIssue,
  LintResult,
  LintErrorCode,
  FieldStrength,
  ExpressionMode,
} from './Linter';

export {
  lintExpression,
  lintExpressionField,
} from './Linter';

export type {
  ExpressionFieldRef,
  WalkOptions,
} from './walker';

export {
  walkExpressionsInNode,
  walkExpressionsInEvent,
  walkExpressionsInActionChain,
  walkExpressionsInDataSource,
  walkExpressionsInScreen,
  walkExpressionsInProject,
} from './walker';
