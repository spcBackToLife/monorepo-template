// ═══════════════════════════════════════════════════════════════════════════════
// Core IR (Intermediate Representation) Types
// Framework-agnostic — these don't know about React/Vue/Flutter.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Page IR ─────────────────────────────────────────────────────────────────

/** IR for a full page (screen) */
export interface PageIR {
  name: string;                    // PascalCase component name
  slug: string;                    // kebab-case URL path segment
  screenId: string;

  viewState: ViewStateIR[];
  dataState: DataStateIR[];
  dataSources: DataSourceIR[];
  rootNode: NodeIR;
  handlers: HandlerIR[];
  onMount?: HandlerIR;
}

export interface ViewStateIR {
  name: string;                    // "inputDraft"
  pascalName: string;              // "InputDraft" (for setter)
  type: string;                    // "string"
  defaultValue: string;            // JSON serialized: "''" or "[]"
}

export interface DataStateIR {
  name: string;
  pascalName: string;
  type: string;                    // "Message[]"
  defaultValue: string;            // "[]"
}

// ─── Data Source IR ──────────────────────────────────────────────────────────

export interface DataSourceIR {
  id: string;
  name: string;                    // "chat-list"
  functionName: string;            // "chatList"
  description?: string;
  method: string;                  // "GET" | "POST"
  path: string;                    // "/chat/list"
  params?: ParamIR[];              // for POST body params
  responseType?: string;           // inferred TS type
  domain: string;                  // "chat" (for file grouping)
}

export interface ParamIR {
  name: string;
  type: string;
}

// ─── Node IR ─────────────────────────────────────────────────────────────────

export interface NodeIR {
  id: string;
  tag: string;                     // "div" | "input" | "h3" ...
  name?: string;                   // designer-given semantic name

  staticStyles: Record<string, string>;
  dynamicStyles: DynamicStyleIR[];

  textContent?: TextContentIR;
  children: NodeIR[];

  events: EventBindingIR[];
  bind?: BindIR;
  repeat?: RepeatIR;
  visibleWhen?: ExpressionIR;

  // Component boundary / instance metadata (from schema)
  componentBoundary?: boolean;
  isComponentInstance?: boolean;
  templateId?: string;

  // Splitter fills these:
  splitAs?: 'component';
  splitComponentName?: string;
}

export interface DynamicStyleIR {
  property: string;                // CSS property name (camelCase)
  expression: ExpressionIR;        // compiled expression
}

export interface TextContentIR {
  isExpression: boolean;
  raw: string;                     // original value
  compiled: string;                // if expression: compiled JS; else: plain text
}

export interface ExpressionIR {
  raw: string;                     // "{{ state.view.inputDraft }}"
  compiled: string;                // "inputDraft"
  dependencies: string[];          // ["inputDraft"]
}

export interface EventBindingIR {
  trigger: string;                 // "click" | "screenEnter" etc.
  handlerName: string;             // "handleSendClick"
}

export interface BindIR {
  variable: string;                // "inputDraft"
  setter: string;                  // "setInputDraft"
}

export interface RepeatIR {
  dataExpression: ExpressionIR;    // "{{ state.data.messages }}" → "messages"
  template: NodeIR;                // the template node tree
  itemName: string;                // "item" (default)
  indexName: string;               // "index" (default)
}

// ─── Handler / Action IR ─────────────────────────────────────────────────────

export interface HandlerIR {
  name: string;                    // "handleSendClick"
  trigger: string;                 // "click"
  isAsync: boolean;
  guard?: ExpressionIR;            // condition.when compiled
  steps: ActionStepIR[];
  ownerNodeId: string;
}

export type ActionStepIR =
  | { kind: 'state-set'; variable: string; setter: string; value: string }
  | { kind: 'state-append'; variable: string; setter: string; value: string }
  | { kind: 'state-toggle'; variable: string; setter: string }
  | { kind: 'state-remove'; variable: string; setter: string; predicate?: string; index?: number }
  | { kind: 'fetch'; serviceName: string; params: string; resultVar: string; onSuccess: ActionStepIR[]; onError?: ActionStepIR[] }
  | { kind: 'navigate'; path: string }
  | { kind: 'navigate-back' }
  | { kind: 'toast'; toastType: string; message: string; duration?: number }
  | { kind: 'delay'; ms: number };

// ═══════════════════════════════════════════════════════════════════════════════
// Split Plan Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface SplitPlan {
  page: PageSplit;
  childComponents: ComponentSplit[];
  hooks: HookSplit[];
  services: ServiceSplit[];
  types: TypeSplit[];
}

export interface PageSplit {
  componentName: string;
  node: NodeIR;                    // root node (with split children replaced by placeholders)
  hookImports: string[];
  componentImports: string[];
}

export interface ComponentSplit {
  componentName: string;
  node: NodeIR;
  reason: 'named-container' | 'repeat-template' | 'complex-container' | 'interactive-region';
  props: PropDefinition[];
  hasStyle: boolean;
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
}

export interface HookSplit {
  hookName: string;
  reason: 'data-fetching' | 'complex-handler';
  dataSource?: DataSourceIR;
  handler?: HandlerIR;
  stateVars: string[];             // variables this hook manages
  returnFields: string[];          // what it returns
}

export interface ServiceSplit {
  domain: string;                  // "chat" → services/chat.ts
  functions: DataSourceIR[];
}

export interface TypeSplit {
  typeName: string;
  fields: TypeFieldIR[];
}

export interface TypeFieldIR {
  name: string;
  type: string;
  optional?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Framework Config Types (read from framework.yaml)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FrameworkConfig {
  name: string;
  description: string;
  adapter: string;                 // "react" | "vue"

  fileOrganization: FileOrganization;
  splitting: SplittingRules;
  codeStyle: CodeStyle;
  conventions: Conventions;
}

export interface FileOrganization {
  page: { baseDir: string; dirNaming: string; entryFile: string; styleFile: string };
  component: { dir: string; filePattern: 'folder' | 'flat'; entryFile: string; styleFile: string };
  hook: { dir: string; fileNaming: string };
  service: { dir: string; groupBy: 'domain' | 'screen' | 'single-file' };
  types: { dir: string; entryFile: string; scope: 'page-local' | 'global' };
}

export interface SplittingRules {
  respectExplicitBoundary?: boolean;
  respectComponentAssets?: boolean;
  params?: Record<string, unknown>;
  enabledStrategies?: string[];
  component: {
    minDescendantsToSplit: number;
    splitRepeatTemplate: boolean;
    splitInteractiveRegions: boolean;
    splitNamedContainers: boolean;
  };
  hook: {
    minActionsToSplit: number;
    splitDataFetching: boolean;
  };
}

export interface CodeStyle {
  component: { declaration: 'function' | 'arrow'; export: 'named' | 'default'; propsStyle: 'destructured' | 'props-object' };
  state: { pattern: 'useState' | 'zustand' | 'redux-toolkit' };
  logic: { async: 'async-await' | 'promise-then'; handlerNaming: 'handleXxx' | 'onXxx'; guardStyle: 'early-return' | 'if-wrap' };
  style: { preprocessor: 'less' | 'scss' | 'css'; modules: boolean; dynamicStrategy: 'inline-merge' | 'css-vars' };
  router: { lib: 'react-router-v6' | 'next-app' | 'vue-router'; lazyLoading: boolean };
  service: { httpClient: 'axios' | 'fetch' | 'ky'; typing: 'interface' | 'type' | 'zod' };
}

export interface Conventions {
  fileNaming: 'PascalCase' | 'kebab-case' | 'camelCase';
  componentNaming: 'PascalCase';
  hookNaming: 'useCamelCase';
  serviceNaming: 'camelCase';
  dirNaming: 'PascalCase' | 'kebab-case' | 'camelCase';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Splitting Strategy Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Splitting strategy interface — each strategy is a function */
export interface SplitStrategy {
  name: string;
  description?: string;
  evaluate(node: NodeIR, context: SplitContext): string | null;
}

export interface SplitContext {
  depth: number;
  parent?: NodeIR;
  page: PageIR;
  params: Record<string, unknown>;
}
