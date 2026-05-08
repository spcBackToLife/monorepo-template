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
} from './state';

// ===== Visual State (节点视觉态) =====
export type { VisualState } from './visualState';

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
} from './node';
export type { Screen } from './screen';
export type { DesignProject } from './project';

// ===== Template / Props =====
export type { TemplateScope, TemplateKind, ComponentTemplate } from './template';
export type { PropType, ComponentPropDefinition, PropBinding } from './props';

// ===== Envelope =====
export type { OperationEnvelope } from './envelope';
