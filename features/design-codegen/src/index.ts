/**
 * @globallink/design-codegen
 *
 * Schema → Code 确定性编译引擎
 *
 * 核心架构：
 * - Parser (Schema → IR) — 与目标框架无关
 * - Splitter (IR → SplitPlan) — 读 framework.yaml 规则配置
 * - Adapter (接口 + React/Vue/Flutter 实现) — 目标语言语法
 * - Blueprint (EJS patterns) — 代码文件骨架
 * - Scaffold (真实文件目录) — 项目基础结构
 * - Pipeline (编排器) — 协调以上所有
 */

// ── Pipeline (主入口) ──
export { generate, getAdapter, listAvailableTemplates, loadTemplate } from './pipeline';
export type { GenerateInput, GenerateOutput, ResolvedTemplate, CodegenUserConfig } from './config/types';
export type { TemplateMeta } from './config/loader';

// ── Core Types (IR) ──
export type {
  PageIR,
  NodeIR,
  ExpressionIR,
  HandlerIR,
  ActionStepIR,
  ViewStateIR,
  DataStateIR,
  DataSourceIR,
  SplitPlan,
  ComponentSplit,
  HookSplit,
  ServiceSplit,
  TypeSplit,
  FrameworkConfig,
  FileOrganization,
  SplittingRules,
  CodeStyle,
  Conventions,
  SplitStrategy,
  SplitContext,
} from './core/types';

// ── Adapter Interface ──
export type { FrameworkAdapter } from './adapter/interface';
export { ReactAdapter } from './adapter/react';

// ── Compiler Utilities ──
export { compileExpression, isExpressionString, extractDependencies } from './core/expression-compiler';

// ── Naming Utilities ──
export { toPascalCase, toCamelCase, toKebabCase, inferDomain } from './utils/naming';
