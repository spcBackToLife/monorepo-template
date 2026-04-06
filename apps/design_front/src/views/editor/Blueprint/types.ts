import type {
  _DesignProject,
  Screen,
  ComponentNode,
  _ComponentState,
  _ComponentEvent,
  _EventAction,
  EventTrigger,
  DomainStateVariable,
  _DomainStateBinding,
  EnvironmentVariable,
  _EnvironmentStateBinding,
  _DataSource,
  _ApiEndpoint,
  ComponentTemplate,
  _CSSProperties,
} from '@globallink/design-schema';

// ===== Top-level Analysis =====

export interface BlueprintAnalysis {
  overview: ProjectOverview;
  globals: GlobalsAnalysis;
  screens: ScreenAnalysis[];
  indices: BlueprintIndices;
}

export interface ProjectOverview {
  name: string;
  platform: string;
  viewport: { width: number; height: number };
  stats: ProjectStats;
}

export interface ProjectStats {
  screenCount: number;
  componentCount: number;
  eventCount: number;
  stateVarCount: number;
  apiCount: number;
  dataSourceCount: number;
  envStateCount: number;
  templateCount: number;
}

export interface GlobalsAnalysis {
  envStates: EnvStateAnalysis[];
  templates: TemplateAnalysis[];
}

export interface EnvStateAnalysis {
  variable: EnvironmentVariable;
  consumerCount: number;
  consumersByScreen: { screenName: string; nodeNames: string[] }[];
}

export interface TemplateAnalysis {
  template: ComponentTemplate;
  usageCount: number;
  usedInScreens: string[];
}

// ===== Screen Analysis =====

export interface ScreenAnalysis {
  screen: Screen;
  modules: ModuleSpec[];
  stateAnalysis: StateVarAnalysis[];
  eventSummary: EventSummaryEntry[];
  incomingNavs: NavEdge[];
  outgoingNavs: NavEdge[];
  nodeCount: number;
  eventCount: number;
}

// ===== Module = 产品功能模块 =====

export interface ModuleSpec {
  /** 模块名称，如「顶部区域」「表单区域」「操作区域」 */
  name: string;
  /** 模块根节点（用于渲染截图） */
  rootNode: ComponentNode;
  /** 模块内所有元素的详细描述 */
  elements: ElementSpec[];
}

// ===== Element = 模块内单个元素的完整产品描述 =====

export interface ElementSpec {
  nodeId: string;
  name: string;
  type: string;
  node: ComponentNode;
  /** 产品化描述（如"品牌标识，48×48px，居中展示"） */
  description: string;
  /** 功能点列表 — 每个功能点是一行 key-value */
  features: FeatureRow[];
  /** 视觉状态描述（产品语言） */
  stateDescriptions: { name: string; description: string }[];
  /** 交互流程描述（产品语言，完整叙事） */
  interactionFlow: string | null;
  /** 该元素是否值得单独展开详情（有交互/多状态/数据绑定的元素） */
  isDetailed: boolean;
}

export interface FeatureRow {
  label: string;
  value: string;
}

// ===== State Variable Analysis =====

export interface StateVarAnalysis {
  variable: DomainStateVariable;
  writers: StateWriter[];
  readers: StateReader[];
}

export interface StateWriter {
  nodeName: string;
  nodeId: string;
  trigger: EventTrigger;
  value: string;
}

export interface StateReader {
  nodeName: string;
  nodeId: string;
  value: string;
  effect: string;
}

// ===== Navigation Edges =====

export interface NavEdge {
  fromScreenId: string;
  fromScreenName: string;
  toScreenId: string;
  toScreenName: string;
  triggerNodeId: string;
  triggerNodeName: string;
  trigger: EventTrigger;
  /** 产品语言标签，如 "登录成功 → 跳转首页" */
  label: string;
  edgeId: string;
}

// ===== Event Summary =====

export interface EventSummaryEntry {
  nodeName: string;
  nodeId: string;
  trigger: EventTrigger;
  /** 产品语言摘要 */
  description: string;
  edgeId: string;
}

// ===== Indices =====

export interface BlueprintIndices {
  events: EventSummaryEntry[];
  stateVars: IndexedStateVar[];
  apis: IndexedApi[];
  dataBindings: IndexedDataBinding[];
}

export interface IndexedStateVar {
  name: string;
  label: string;
  scope: string;
  values: string[];
  writerCount: number;
  readerCount: number;
}

export interface IndexedApi {
  screenName: string;
  name: string;
  method: string;
  path: string;
  callerNodes: string[];
}

export interface IndexedDataBinding {
  screenName: string;
  nodeName: string;
  propKey: string;
  expression: string;
}

// ===== Flow Graph =====

export interface FlowGraphData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: 'screen' | 'domainState' | 'envState' | 'api';
  label: string;
  screenId?: string;
  metadata: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: FlowEdgeType;
  /** 产品语言标签 */
  label: string;
  trigger?: EventTrigger;
  metadata: Record<string, unknown>;
}

export type FlowEdgeType =
  | 'navigation'
  | 'state-write'
  | 'state-read'
  | 'env-write'
  | 'env-read'
  | 'api-call';
