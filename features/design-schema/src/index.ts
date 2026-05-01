// ===== Version =====
export const DESIGN_SCHEMA_VERSION = '0.2.0';

// ===== Types =====
export type {
  CSSProperties,
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
  ComponentState,
  DomainStateValue,
  DomainStateVariable,
  DomainStateBinding,
  EnvironmentVariable,
  EnvironmentStateBinding,
  DataField,
  DataSchema,
  DataSourcePhase,
  DataScenario,
  DataSource,
  EventTrigger,
  TransitionAnimation,
  NavigateAction,
  SetStateAction,
  OpenUrlAction,
  DelayAction,
  CustomAction,
  SetDomainStateAction,
  SetEnvironmentStateAction,
  ToggleVisibleAction,
  ToastPosition,
  ToastType,
  ShowToastAction,
  ApiRequestAction,
  EventAction,
  EventCondition,
  ComponentEvent,
  HttpMethod,
  RequestDefinition,
  MockScenario,
  ApiEndpoint,
  Platform,
  Viewport,
  Screen,
  EditorRole,
  NodeEditorMetadata,
  TemplateScope,
  TemplateKind,
  ComponentTemplate,
  PropType,
  ComponentPropDefinition,
  PropBinding,
  DesignProject,
  OperationEnvelope,
} from './types';

export { API_DATA_SOURCE_PHASES } from './types';

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
  DomainStateVariableSchema,
  DomainStateBindingSchema,
  EnvironmentVariableSchema,
  EnvironmentStateBindingSchema,
  ComponentPropDefinitionSchema,
  PropBindingSchema,
  PropTypeSchema,
} from './validators/props';

export {
  DataSourceSchema,
  DataScenarioSchema,
  DataSourcePhaseSchema,
  DataFieldSchema,
  DataSchemaSchema,
} from './validators/data';

export { OperationEnvelopeSchema } from './validators/envelope';

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
