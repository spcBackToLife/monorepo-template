/**
 * @globallink/design-expression — Expression Language v1.0 实现
 *
 * 设计哲学：
 *   - **纯函数包**：零 React、零 DOM 依赖；前端编辑器、后端 NestJS、CLI、测试都能用
 *   - **三阶段架构（参考 Google CEL）**：Parse / Check (Lint) / Eval
 *   - **真相源**：features/design-schema/src/expression-lang/spec.json
 *
 * 包边界：
 *   - 上游：@globallink/design-schema（提供类型 + spec 真相源）
 *   - 下游：@globallink/design-engine（运行时 Eval）
 *           @globallink/design-operations（落库期 Lint 门禁）
 *           apps/design-api（HTTP integrity 校验）
 *           apps/design_front（编辑器实时 Lint）
 *
 * 详见 PLATFORM-ROOT-CAUSE-ANALYSIS.md §4 与 STAGE-CONTRACT v2.7 包边界一等公民。
 */

// ===== Expression Engine =====
// Parser / Evaluator / BuiltinFunctions / Linter / Walker
export type {
  Ast,
  BinaryOp,
  TemplateSegment,
  EvalContext,
  BuiltinFunctions,
  LintIssue,
  LintResult,
  LintErrorCode,
  FieldStrength,
  ExpressionMode,
  ExpressionFieldRef,
  WalkOptions,
} from './expression';

export {
  // Parse 阶段
  parseExpression,
  parseSingleExpression,
  parseTemplate,
  ExpressionParseError,
  // Eval 阶段
  evaluateAst,
  evaluateExpression,
  compileExpression,
  extractDeps,
  ExpressionEvaluationError,
  // 内置 / 禁用清单
  builtinFunctions,
  FORBIDDEN_GLOBALS,
  // Check 阶段（Lint）
  lintExpression,
  lintExpressionField,
  // Schema 子树扫描器
  walkExpressionsInNode,
  walkExpressionsInEvent,
  walkExpressionsInActionChain,
  walkExpressionsInDataSource,
  walkExpressionsInScreen,
  walkExpressionsInProject,
} from './expression';

// ===== Integrity with Expression Lint (EXPR-C-3 R-EXPR-01) =====
// 在 design-schema 的 base integrity 之上叠加 R-EXPR-01 表达式 lint warning
export {
  checkProjectIntegrityWithLint,
  checkScreenIntegrityWithLint,
  checkNodeIntegrityWithLint,
} from './integrity/with-lint';
