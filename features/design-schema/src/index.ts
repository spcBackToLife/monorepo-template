// ===== Version =====
/**
 * design-schema 版本。
 *
 * v0.4.0 = expression-lang v1.0（平台第二 DSL 立约 / 2026-05-31）
 * v0.3.0 = state/action/expression 模型（RFC 2026-05-08）
 * v0.2.0 = v1 的 domainState/environmentState 模型（已废弃）
 */
export const DESIGN_SCHEMA_VERSION = '0.4.0';

// ===== Expression Language v1.0（平台第二 DSL） =====
//
// 真相源：./expression-lang/spec.json
// 人读规约：./expression-lang/EXPR-LANG-SPEC.md
//
// 任何讨论"表达式什么语法/标识符/方法被支持"，必须 import 本 barrel 的工具，
// 不允许在使用方代码里硬编码语法白名单。
export {
  spec as EXPR_LANG_SPEC,
  SPEC_VERSION as EXPR_LANG_VERSION,
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
  listInstanceMembers,
  listBuiltinFunctions,
  getErrorDef,
  findMigrationHint,
} from './expression-lang';

export type {
  ExpressionLangSpec,
  SyntaxSpec,
  ScopeSpec,
  ContextualIdentifier,
  GlobalNamespace,
  GlobalMember,
  BuiltinNamespace,
  TypeName,
  InstanceMember,
  ErrorCode as ExprLangErrorCode,
  ErrorCodeDef as ExprLangErrorCodeDef,
} from './expression-lang';

// ===== Types =====
export type {
  CSSProperties,
  Platform,
  Viewport,
  // v2 expression
  Expression,
  ExpressionMeta,
  // v2 state
  EffectStatus,
  ScreenState,
  ScreenStateInit,
  ViewVariableDef,
  GlobalStateInit,
  ExpressionContext,
  BuiltinFunctions,
  DataTypeAnnotation,
  // v2 visualState
  VisualState,
  // v2 action
  EventTrigger,
  EventCondition,
  ComponentEvent,
  NavTransitionAnimation,
  ToastType,
  ToastPosition,
  StateSetAction,
  StateAppendAction,
  StateRemoveAction,
  StateMergeAction,
  StateToggleAction,
  EffectFetchAction,
  EffectCancelAction,
  NavGoAction,
  NavBackAction,
  NodeSetVisualStateAction,
  UiShowToastAction,
  UiOpenUrlAction,
  UiDelayAction,
  UiStartTimerAction,
  UiStopTimerAction,
  UiResetTimerAction,
  LogicIfAction,
  LogicSwitchCaseBranch,
  LogicSwitchAction,
  CustomAction,
  Action,
  ActionType,
  // v2 data source
  HttpMethod,
  ApiEndpoint,
  ErrorCode,
  NetworkPolicy,
  MockScenario,
  MockConfig,
  StaticDataSource,
  ApiDataSource,
  DataSource,
  TypeField,
  DataSourceTypeDef,
  // Node / Screen / Project
  PrimitiveNodeType,
  ComponentInstanceType,
  NodeType,
  LayoutConstraints,
  TemplateRef,
  ComponentNode,
  CSSKeyframeSchema,
  CSSAnimationConfigSchema,
  ExternalAnimationConfigSchema,
  AnimationConfig,
  EditorRole,
  NodeEditorMetadata,
  ExpressionStyles,
  RepeatBinding,
  Screen,
  OverlayNode,
  OverlayType,
  OverlayAnimation,
  DesignProject,
  // Meta (Schema-First — 设计意图 / 溯源 / 完成度)
  DesignPhase,
  NodeStatus,
  ExtremeCase,
  PlanTask,
  UpstreamChallengeRef,
  NodeMeta,
  ScreenMeta,
  ProjectMeta,
  // Template / Props
  TemplateScope,
  TemplateKind,
  ComponentTemplate,
  PropType,
  ComponentPropDefinition,
  PropBinding,
  // Envelope
  OperationEnvelope,
  // Theme
  AestheticTag,
  StyleIntent,
  ColorToken,
  SpacingToken,
  RadiusToken,
  TypographyToken,
  ShadowToken,
  TransitionToken,
  CustomToken,
  ColorTokenGroup,
  DesignTokenSet,
  TokenOverrides,
  ColorScheme,
  ThemeDefinition,
  BackgroundRule,
  DecorationRules,
  IconSpec,
  ComponentStateSpec,
  ThemeConfig,
} from './types';

// Expression 运行期工具（既是类型也是 runtime）
export { expr, isExpression, normalizeExpression } from './types';

// ===== Theme =====
export { DEFAULT_THEME_CONFIG } from './presets/theme-defaults';
export {
  createEmptyThemeConfig,
  createDefaultTheme,
  deriveThemeFromBase,
  createColorScheme,
  deriveDarkSchemeOverrides,
} from './theme/factories';
export {
  validateThemeConfig,
  apcaContrast,
  type ThemeValidationReport,
  type ThemeViolation,
} from './theme/validation';
export {
  applyThemeOp,
  findTheme,
  findScheme,
  normalizeColorKey,
  normalizeTypographyKey,
  COLOR_NAME_ALIAS,
  TYPOGRAPHY_NAME_ALIAS,
  type ThemeOp,
  type TokenKind,
  type ApplyThemeOpResult,
} from './theme/operations';

// ===== Viewport Presets =====
export {
  // Individual presets
  IPHONE_SE,
  IPHONE_14,
  IPHONE_14_PRO,
  IPHONE_14_PRO_MAX,
  IPHONE_15,
  IPHONE_15_PRO,
  IPHONE_15_PRO_MAX,
  IPHONE_16,
  IPHONE_16_PRO,
  IPHONE_16_PRO_MAX,
  PIXEL_7,
  PIXEL_8,
  PIXEL_8_PRO,
  SAMSUNG_S24,
  SAMSUNG_S24_ULTRA,
  IPAD_MINI,
  IPAD_AIR,
  IPAD_PRO_11,
  IPAD_PRO_13,
  SAMSUNG_TAB_S9,
  PC_1366_768,
  PC_1440_900,
  PC_1080P,
  PC_1440P,
  PC_4K,
  MACBOOK_AIR_13,
  MACBOOK_PRO_16,
  // Collections
  MOBILE_VIEWPORTS,
  TABLET_VIEWPORTS,
  DESKTOP_VIEWPORTS,
  ALL_VIEWPORTS,
  // Helpers
  getDefaultViewport,
  getViewportsByPlatform,
} from './presets/viewports';

// ===== Primitives Registry =====
export type { PrimitiveCategory, PrimitiveDescriptor } from './registry/primitives';
export {
  getAllPrimitives,
  getPrimitive,
  getPrimitivesByCategory,
  getPrimitiveCategories,
  isPrimitiveType,
  isComponentInstanceType,
  getDefaultStyles,
  getAllowedProps,
} from './registry/primitives';

// ===== Element Props Registry =====
export type { ElementPropDefinition, ElementPropRegistry } from './registry/element-props';
export { ELEMENT_PROP_REGISTRY, getElementProps } from './registry/element-props';

// ===== Validators =====
export type { ValidationResult } from './validators';
export {
  ComponentNodeSchema,
  ScreenSchema,
  ViewportSchema,
  ComponentTemplateSchema,
  DesignProjectSchema,
  ComponentEventSchema,
  validateNode,
  validateScreen,
  validateProject,
  validateViewport,
  validateTemplate,
} from './validators';

export {
  ComponentPropDefinitionSchema,
  PropBindingSchema,
  PropTypeSchema,
} from './validators/props';

export {
  DataSourceSchema,
  ApiDataSourceSchema,
  StaticDataSourceSchema,
  ApiEndpointSchema,
  ErrorCodeSchema,
  NetworkPolicySchema,
  MockScenarioSchema,
  MockConfigSchema,
  HttpMethodSchema,
} from './validators/data';

export {
  ActionSchema,
  EventTriggerSchema,
  EventConditionSchema,
} from './validators/action';

export {
  ExpressionSchema,
  ExpressionOrValueSchema,
} from './validators/expression';

export {
  EffectStatusSchema,
  ScreenStateSchema,
  ScreenStateInitSchema,
  ViewVariableDefSchema,
  GlobalStateInitSchema,
} from './validators/state';

export { OperationEnvelopeSchema } from './validators/envelope';

// ===== Integrity Checker (Schema-First 完成度对账) =====
export type {
  IntegritySeverity,
  IntegrityIssue,
  IntegrityReport,
} from './integrity';
export {
  checkProjectIntegrity,
  checkScreenIntegrity,
  checkNodeIntegrity,
} from './integrity';
export type { ArtifactVerifyResult } from './integrity/verify-artifact';
export { verifyArtifact, verifyArtifacts, resolvePath } from './integrity/verify-artifact';

// ===== Asset Utilities =====
export {
  instantiateTemplate,
  saveAsTemplate,
  detachInstance,
  syncInstance,
  countTemplateNodes,
  countSubtreeNodes,
} from './assets';
export type { InstantiateOptions } from './assets';

// ===== Serialization =====
export {
  deepClone,
  normalizeNode,
  toJSON,
  fromJSON,
  nodeToJSON,
  nodeFromJSON,
  screenToJSON,
  screenFromJSON,
} from './serialization';

// ===== ID Generators =====
export {
  generateNodeId,
  generateScreenId,
  generateTemplateId,
  generateProjectId,
  generateId,
} from './utils/id';
