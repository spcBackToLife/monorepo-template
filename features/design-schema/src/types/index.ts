// ===== Base types =====
export type { CSSProperties } from './css';
export type { Platform, Viewport } from './viewport';

// ===== Expression & State (v2 core) =====
export type {
  Expression,
  ExpressionMeta,
} from './expression';
export { expr, isExpression, normalizeExpression } from './expression';

export type {
  EffectStatus,
  ScreenState,
  ScreenStateInit,
  ViewVariableDef,
  GlobalStateInit,
  ExpressionContext,
  BuiltinFunctions,
  DataTypeAnnotation,
} from './state';

// ===== Visual State (节点视觉态) =====
export type { VisualState, AnimationDef, PresetAnimation } from './visualState';

// ===== Action (v2 动词联合) =====
export type {
  EventTrigger,
  EventCondition,
  ComponentEvent,
  NavTransitionAnimation,
  ToastType,
  ToastPosition,
  // Action 子类型
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
  UiAnimateAction,
  UiShowOverlayAction,
  UiHideOverlayAction,
  LogicIfAction,
  LogicSwitchCaseBranch,
  LogicSwitchAction,
  CustomAction,
  // 联合
  Action,
  ActionType,
} from './action';

// ===== Data Source (v2 endpoint+mock 共存) =====
export type {
  HttpMethod,
  ApiEndpoint,
  MockScenario,
  MockConfig,
  StaticDataSource,
  ApiDataSource,
  DataSource,
  TypeField,
  DataSourceTypeDef,
} from './dataSource';

// ===== Node / Screen / Project =====
export type {
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
} from './node';
export type { Screen, OverlayNode, OverlayType, OverlayAnimation } from './screen';
export type { DesignProject } from './project';

// ===== Meta (设计意图 / 溯源 / 完成度 — Schema-First) =====
export type {
  DesignPhase,
  NodeStatus,
  ExtremeCase,
  PlanTask,
  NodeMeta,
  ScreenMeta,
  ProjectMeta,
} from './meta';

// ===== Template / Props =====
export type { TemplateScope, TemplateKind, ComponentTemplate } from './template';
export type { PropType, ComponentPropDefinition, PropBinding } from './props';

// ===== Envelope =====
export type { OperationEnvelope } from './envelope';

// ===== Theme =====
export type {
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
  ThemeVariant,
  ColorScheme,
  ThemeDefinition,
  BackgroundRule,
  DecorationRules,
  ComponentStateSpec,
  ThemeConfig,
} from './theme';
