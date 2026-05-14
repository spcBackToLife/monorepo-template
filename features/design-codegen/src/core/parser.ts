// ═══════════════════════════════════════════════════════════════════════════════
// Parser — Schema → PageIR
//
// The "frontend" of the codegen compiler. Reads a design-schema Screen and
// produces a framework-agnostic PageIR that downstream passes (Splitter,
// Adapters) can consume without understanding the Schema format.
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Screen,
  ComponentNode,
  ComponentEvent,
  Action,
  ApiDataSource,
  EffectFetchAction,
  StateSetAction,
  StateAppendAction,
  StateRemoveAction,
  StateToggleAction,
  NavGoAction,
  UiShowToastAction,
  UiDelayAction,
  Expression,
} from '@globallink/design-schema';

import type {
  PageIR,
  ViewStateIR,
  DataStateIR,
  DataSourceIR,
  NodeIR,
  DynamicStyleIR,
  TextContentIR,
  EventBindingIR,
  BindIR,
  RepeatIR,
  ExpressionIR,
  HandlerIR,
  ActionStepIR,
  ParamIR,
  InferredTypeIR,
} from './types';

import {
  compileExpression,
  isExpressionString,
  type ExpressionScope,
} from './expression-compiler';

import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
  inferDomain,
} from '../utils/naming';

// ─── Main Entry ─────────────────────────────────────────────────────────────

/**
 * Parse a design-schema Screen into a framework-agnostic PageIR.
 */
export function parseScreen(screen: Screen): PageIR {
  const componentName = toPascalCase(screen.name);
  const slug = toKebabCase(screen.name);

  // 1. Extract view state
  const viewState = extractViewState(screen);

  // 2. Extract data state
  const dataState = extractDataState(screen);

  // 3. Extract data sources (api only)
  const dataSources = extractDataSources(screen);

  // 4. Walk the component tree → build NodeIR tree
  // Collect handlers during the walk
  const handlerCollector: HandlerIR[] = [];
  const rootNode = parseNode(screen.rootNode, dataSources, handlerCollector);

  // 5. Extract onMount (screenEnter event on rootNode)
  const onMount = extractOnMount(screen.rootNode, dataSources);

  // 6. Filter out screenEnter from handler list (it's separate in IR)
  const handlers = handlerCollector.filter(
    (h) => h.trigger !== 'screenEnter' && h.trigger !== 'screenExit',
  );

  // 7. Infer TypeScript interfaces from data shapes
  const inferredTypes = inferTypesFromSchema(screen);

  return {
    name: componentName,
    slug,
    screenId: screen.id,
    viewState,
    dataState,
    dataSources,
    rootNode,
    handlers,
    onMount,
    inferredTypes,
  };
}

// ─── View State Extraction ──────────────────────────────────────────────────

function extractViewState(screen: Screen): ViewStateIR[] {
  const viewDefs = screen.stateInit?.view;
  if (!viewDefs) return [];

  return Object.entries(viewDefs).map(([key, def]) => {
    const name = def.name || key;
    return {
      name,
      pascalName: toPascalCase(name),
      type: inferTypeFromValue(def.defaultValue),
      defaultValue: serializeDefaultValue(def.defaultValue),
    };
  });
}

// ─── Data State Extraction ──────────────────────────────────────────────────

function extractDataState(screen: Screen): DataStateIR[] {
  const dataInit = screen.stateInit?.data;
  if (!dataInit) return [];

  const dataTypes = (screen.stateInit as Record<string, unknown>)?.dataTypes as Record<string, { typeName: string; isArray: boolean }> | undefined;

  return Object.entries(dataInit).map(([key, value]) => {
    let type: string;

    // 只从显式 dataTypes 注解读取，不推断
    const annotation = dataTypes?.[key];
    if (annotation) {
      type = annotation.isArray ? `${annotation.typeName}[]` : annotation.typeName;
    } else {
      // 没有类型注解 → 标记为 TODO，后续由 AI 补全
      type = 'unknown';
    }

    return {
      name: key,
      pascalName: toPascalCase(key),
      type,
      defaultValue: '[]',
    };
  });
}

// ─── Data Source Extraction ─────────────────────────────────────────────────

function extractDataSources(screen: Screen): DataSourceIR[] {
  return screen.dataSources
    .filter((ds): ds is ApiDataSource => ds.type === 'api')
    .map((ds) => {
      const params = extractParamsFromEndpoint(ds);
      return {
        id: ds.id,
        name: ds.name,
        functionName: toCamelCase(ds.name),
        description: ds.description,
        method: ds.endpoint.method,
        path: ds.endpoint.path,
        params: params.length > 0 ? params : undefined,
        responseType: inferResponseType(ds),
        domain: inferDomain(ds.name),
      };
    });
}

function extractParamsFromEndpoint(ds: ApiDataSource): ParamIR[] {
  const params: ParamIR[] = [];

  // Extract from body (POST/PUT/PATCH)
  if (ds.endpoint.body && typeof ds.endpoint.body === 'object' && !isExpressionString(ds.endpoint.body)) {
    const body = ds.endpoint.body as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      params.push({
        name: key,
        type: inferTypeFromValue(value),
      });
    }
  }

  // Extract from query params
  if (ds.endpoint.query) {
    for (const [key, value] of Object.entries(ds.endpoint.query)) {
      params.push({
        name: key,
        type: inferTypeFromValue(value),
      });
    }
  }

  // Extract from defaultParams
  if (ds.defaultParams) {
    for (const [key, value] of Object.entries(ds.defaultParams)) {
      // Avoid duplicates
      if (!params.some((p) => p.name === key)) {
        params.push({
          name: key,
          type: inferTypeFromValue(value),
        });
      }
    }
  }

  return params;
}

function inferResponseType(ds: ApiDataSource): string | undefined {
  // 只从显式 typeDef 读取，不推断
  if (ds.typeDef) {
    const { responseName, responseShape } = ds.typeDef;
    return responseShape === 'array' ? `${responseName}[]` : responseName;
  }
  // 没有 typeDef → 返回 unknown，后续由 AI 补全
  return 'unknown';
}

// ─── Node Tree Parsing ──────────────────────────────────────────────────────

function parseNode(
  node: ComponentNode,
  dataSources: DataSourceIR[],
  handlerCollector: HandlerIR[],
  scope: ExpressionScope = 'component',
): NodeIR {
  // Determine tag
  const tag = resolveTag(node.type);

  // Separate static vs dynamic styles
  const { staticStyles, dynamicStyles } = parseStyles(node.styles, scope);

  // Parse text content
  const textContent = parseTextContent(node.props, scope);

  // Parse events → EventBindingIR (references to handlers)
  const events = parseEvents(node, dataSources, handlerCollector);

  // Parse bind
  const bind = parseBind(node.bind);

  // Parse repeat
  const repeat = parseRepeat(node.repeat, dataSources, handlerCollector);

  // Parse visibleWhen
  const visibleWhen = parseVisibleWhen(node.visibleWhen, scope);

  // Recursively parse children
  const children = (node.children || []).map((child) =>
    parseNode(child, dataSources, handlerCollector, scope),
  );

  return {
    id: node.id,
    tag,
    name: node.name,
    staticStyles,
    dynamicStyles,
    textContent,
    children,
    events,
    bind,
    repeat,
    visibleWhen,
    componentBoundary: node.componentBoundary,
    isComponentInstance: node.type.startsWith('component:'),
    templateId: node.type.startsWith('component:') ? node.type.slice('component:'.length) : undefined,
  };
}

function resolveTag(type: string): string {
  // Component instances: "component:xyz" → "div" (will be resolved by splitter/adapter)
  if (type.startsWith('component:')) {
    return 'div';
  }
  // Primitive HTML tags pass through directly
  return type;
}

// ─── Style Parsing ──────────────────────────────────────────────────────────

function parseStyles(
  styles: Record<string, unknown>,
  scope: ExpressionScope,
): { staticStyles: Record<string, string>; dynamicStyles: DynamicStyleIR[] } {
  const staticStyles: Record<string, string> = {};
  const dynamicStyles: DynamicStyleIR[] = [];

  if (!styles) return { staticStyles, dynamicStyles };

  for (const [property, value] of Object.entries(styles)) {
    if (value === null || value === undefined) continue;

    const strValue = String(value);

    if (isExpressionString(strValue)) {
      // Dynamic style — contains {{ }}
      const expression = compileExpression(strValue, scope);
      dynamicStyles.push({ property, expression });
    } else {
      // Static style
      staticStyles[property] = strValue;
    }
  }

  return { staticStyles, dynamicStyles };
}

// ─── Text Content Parsing ───────────────────────────────────────────────────

function parseTextContent(
  props: Record<string, unknown>,
  scope: ExpressionScope,
): TextContentIR | undefined {
  // textContent can be in props.textContent or props.children (string form)
  const raw = (props?.textContent ?? props?.children) as string | undefined;

  if (raw === undefined || raw === null || typeof raw !== 'string') {
    return undefined;
  }

  if (isExpressionString(raw)) {
    const compiled = compileExpression(raw, scope);
    return {
      isExpression: true,
      raw,
      compiled: compiled.compiled,
    };
  }

  return {
    isExpression: false,
    raw,
    compiled: raw,
  };
}

// ─── Event Parsing ──────────────────────────────────────────────────────────

function parseEvents(
  node: ComponentNode,
  dataSources: DataSourceIR[],
  handlerCollector: HandlerIR[],
): EventBindingIR[] {
  if (!node.events || node.events.length === 0) return [];

  const bindings: EventBindingIR[] = [];

  for (const event of node.events) {
    // Skip disabled events
    if (event.disabled) continue;

    // Skip screenEnter/screenExit — handled separately as onMount
    if (event.trigger === 'screenEnter' || event.trigger === 'screenExit') continue;

    // Generate handler name
    const handlerName = generateHandlerName(node, event.trigger);

    // Build full HandlerIR and collect it
    const handler = buildHandler(node, event, handlerName, dataSources);
    handlerCollector.push(handler);

    bindings.push({
      trigger: event.trigger,
      handlerName,
    });
  }

  return bindings;
}

function generateHandlerName(node: ComponentNode, trigger: string): string {
  const nodePart = node.name
    ? toPascalCase(node.name)
    : toPascalCase(node.id.slice(-6));
  const triggerPart = toPascalCase(trigger);
  return `handle${nodePart}${triggerPart}`;
}

// ─── Bind Parsing ───────────────────────────────────────────────────────────

function parseBind(
  bind: ComponentNode['bind'],
): BindIR | undefined {
  if (!bind) return undefined;

  // bind.path: "view.inputDraft" → variable: "inputDraft", setter: "setInputDraft"
  const pathParts = bind.path.split('.');
  const variable = pathParts[pathParts.length - 1];
  const setter = `set${toPascalCase(variable)}`;

  return { variable, setter };
}

// ─── Repeat Parsing ─────────────────────────────────────────────────────────

function parseRepeat(
  repeat: ComponentNode['repeat'],
  dataSources: DataSourceIR[],
  handlerCollector: HandlerIR[],
): RepeatIR | undefined {
  if (!repeat) return undefined;

  const dataExpression = compileExpression(
    repeat.expression as string,
    'component',
  );

  // Parse the template node tree in repeat-template scope
  const template = parseNode(
    repeat.template,
    dataSources,
    handlerCollector,
    'repeat-template',
  );

  return {
    dataExpression,
    template,
    itemName: 'item',
    indexName: 'index',
  };
}

// ─── VisibleWhen Parsing ────────────────────────────────────────────────────

function parseVisibleWhen(
  visibleWhen: ComponentNode['visibleWhen'],
  scope: ExpressionScope,
): ExpressionIR | undefined {
  if (!visibleWhen) return undefined;

  return compileExpression(visibleWhen as string, scope);
}

// ─── Handler Building ───────────────────────────────────────────────────────

function buildHandler(
  node: ComponentNode,
  event: ComponentEvent,
  handlerName: string,
  dataSources: DataSourceIR[],
): HandlerIR {
  // Determine if async (contains fetch or delay)
  const isAsync = hasAsyncAction(event.actions);

  // Compile condition guard
  const guard = event.condition?.when
    ? compileExpression(event.condition.when as string, 'component')
    : undefined;

  // Translate actions to steps
  const steps = translateActions(event.actions, dataSources, 'component');

  return {
    name: handlerName,
    trigger: event.trigger,
    isAsync,
    guard,
    steps,
    ownerNodeId: node.id,
  };
}

function hasAsyncAction(actions: Action[]): boolean {
  for (const action of actions) {
    if (action.type === 'ui.delay') return true;
    if (action.type === 'effect.fetch') {
      // The fetch itself is async
      // Also check nested onSuccess/onError chains
      const fetch = action as EffectFetchAction;
      if (fetch.onSuccess && hasAsyncAction(fetch.onSuccess)) return true;
      if (fetch.onError && hasAsyncAction(fetch.onError)) return true;
      return true;
    }
  }
  return false;
}

function translateActions(
  actions: Action[],
  dataSources: DataSourceIR[],
  scope: ExpressionScope,
): ActionStepIR[] {
  return actions.map((action) => translateAction(action, dataSources, scope));
}

function translateAction(
  action: Action,
  dataSources: DataSourceIR[],
  scope: ExpressionScope,
): ActionStepIR {
  switch (action.type) {
    case 'state.set':
      return translateStateSet(action, scope);
    case 'state.append':
      return translateStateAppend(action, scope);
    case 'state.remove':
      return translateStateRemove(action, scope);
    case 'state.toggle':
      return translateStateToggle(action);
    case 'effect.fetch':
      return translateEffectFetch(action, dataSources);
    case 'nav.go':
      return translateNavGo(action);
    case 'nav.back':
      return { kind: 'navigate-back' };
    case 'ui.showToast':
      return translateShowToast(action, scope);
    case 'ui.delay':
      return translateDelay(action);
    default:
      // Fallback for unsupported actions — treat as no-op state set
      return { kind: 'state-set', variable: '_noop', setter: 'set_Noop', value: 'undefined' };
  }
}

// ─── State Action Translators ───────────────────────────────────────────────

function translateStateSet(action: StateSetAction, scope: ExpressionScope): ActionStepIR {
  const { variable, setter } = parseStatePath(action.path);
  const value = compileActionValue(action.value, scope);

  return {
    kind: 'state-set',
    variable,
    setter,
    value,
  };
}

function translateStateAppend(action: StateAppendAction, scope: ExpressionScope): ActionStepIR {
  const { variable, setter } = parseStatePath(action.path);
  const value = compileActionValue(action.value, scope);

  return {
    kind: 'state-append',
    variable,
    setter,
    value,
  };
}

function translateStateRemove(action: StateRemoveAction, scope: ExpressionScope): ActionStepIR {
  const { variable, setter } = parseStatePath(action.path);

  const step: ActionStepIR = {
    kind: 'state-remove',
    variable,
    setter,
  };

  if (action.index !== undefined) {
    (step as Extract<ActionStepIR, { kind: 'state-remove' }>).index = action.index;
  }

  if (action.predicate) {
    const predicateExpr = compileExpression(action.predicate as string, scope);
    (step as Extract<ActionStepIR, { kind: 'state-remove' }>).predicate = predicateExpr.compiled;
  }

  return step;
}

function translateStateToggle(action: StateToggleAction): ActionStepIR {
  const { variable, setter } = parseStatePath(action.path);

  return {
    kind: 'state-toggle',
    variable,
    setter,
  };
}

/**
 * Parse a state path like "view.inputDraft" or "data.messages" into
 * the variable name and setter function name.
 */
function parseStatePath(path: string): { variable: string; setter: string } {
  // path examples: "view.inputDraft", "data.messages", "data.messages[2].text"
  const parts = path.split('.');

  // Strip the namespace prefix (view/data)
  let variablePath: string;
  if (parts[0] === 'view' || parts[0] === 'data') {
    variablePath = parts.slice(1).join('.');
  } else {
    variablePath = parts.join('.');
  }

  // The "root" variable name is the first token
  const rootVar = variablePath.split('.')[0].replace(/\[.*\]/, '');
  const setter = `set${toPascalCase(rootVar)}`;

  return { variable: variablePath, setter };
}

// ─── Effect Fetch Translator ────────────────────────────────────────────────

function translateEffectFetch(
  action: EffectFetchAction,
  dataSources: DataSourceIR[],
): ActionStepIR {
  // Find the matching data source
  const ds = dataSources.find((d) => d.id === action.dataSourceId);
  const serviceName = ds?.functionName || toCamelCase(action.dataSourceId);

  // Compile params
  const params = compileParams(action.params);

  // Generate a result variable name — must match expression compiler's $last → result mapping
  const resultVar = 'result';

  // Translate onSuccess chain (in on-success scope)
  const onSuccess = action.onSuccess
    ? translateActions(action.onSuccess, dataSources, 'on-success')
    : [];

  // Translate onError chain
  const onError = action.onError
    ? translateActions(action.onError, dataSources, 'on-success')
    : undefined;

  return {
    kind: 'fetch',
    serviceName,
    params,
    resultVar,
    onSuccess,
    onError,
  };
}

function compileParams(
  params: Record<string, Expression | unknown> | undefined,
): string {
  if (!params || Object.keys(params).length === 0) return '{}';

  const entries: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    const strValue = String(value);
    if (isExpressionString(strValue)) {
      const compiled = compileExpression(strValue, 'component');
      entries.push(`${key}: ${compiled.compiled}`);
    } else {
      entries.push(`${key}: ${JSON.stringify(value)}`);
    }
  }

  return `{ ${entries.join(', ')} }`;
}

// ─── Navigation Translator ──────────────────────────────────────────────────

function translateNavGo(action: NavGoAction): ActionStepIR {
  // The targetScreenId will be resolved to a path by the pipeline later.
  // For now, store the screen ID as the path placeholder.
  return {
    kind: 'navigate',
    path: action.targetScreenId,
  };
}

// ─── Toast Translator ───────────────────────────────────────────────────────

function translateShowToast(action: UiShowToastAction, scope: ExpressionScope): ActionStepIR {
  const messageStr = String(action.message);
  let message: string;
  if (isExpressionString(messageStr)) {
    const compiled = compileExpression(messageStr, scope);
    message = compiled.compiled;
  } else {
    message = JSON.stringify(action.message);
  }

  return {
    kind: 'toast',
    toastType: action.toastType,
    message,
    duration: action.duration,
  };
}

// ─── Delay Translator ───────────────────────────────────────────────────────

function translateDelay(action: UiDelayAction): ActionStepIR {
  return {
    kind: 'delay',
    ms: action.duration,
  };
}

// ─── onMount Extraction ─────────────────────────────────────────────────────

function extractOnMount(
  rootNode: ComponentNode,
  dataSources: DataSourceIR[],
): HandlerIR | undefined {
  if (!rootNode.events || rootNode.events.length === 0) return undefined;

  const screenEnterEvent = rootNode.events.find(
    (e) => e.trigger === 'screenEnter' && !e.disabled,
  );

  if (!screenEnterEvent) return undefined;

  const isAsync = hasAsyncAction(screenEnterEvent.actions);
  const guard = screenEnterEvent.condition?.when
    ? compileExpression(screenEnterEvent.condition.when as string, 'component')
    : undefined;
  const steps = translateActions(screenEnterEvent.actions, dataSources, 'component');

  return {
    name: 'onMount',
    trigger: 'screenEnter',
    isAsync,
    guard,
    steps,
    ownerNodeId: rootNode.id,
  };
}

// ─── Value Compilation Helper ───────────────────────────────────────────────

/**
 * Compile an action value (Expression | unknown) into a JS expression string.
 */
function compileActionValue(value: Expression | unknown, scope: ExpressionScope): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  const strValue = String(value);

  if (isExpressionString(strValue)) {
    const compiled = compileExpression(strValue, scope);
    return compiled.compiled;
  }

  // For object/array values, serialize to JSON
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // For primitives, serialize directly
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  return String(value);
}

// ─── Type Inference Helpers ─────────────────────────────────────────────────

function inferTypeFromValue(value: unknown): string {
  if (value === null || value === undefined) return 'unknown';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const first = value[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      // Array of objects → use interface name (will be resolved by type inference pass)
      return '__INFER_ITEM__[]';
    }
    const itemType = inferTypeFromValue(first);
    return `${itemType}[]`;
  }
  if (typeof value === 'object') return '__INFER_OBJ__';
  return 'unknown';
}

function inferComplexType(value: unknown): string {
  if (value === null || value === undefined) return 'unknown';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const first = value[0];
    if (typeof first === 'object' && first !== null) {
      return '__INFER_ITEM__[]';
    }
    return `${inferTypeFromValue(first)}[]`;
  }
  if (typeof value === 'object') {
    return '__INFER_OBJ__';
  }
  return inferTypeFromValue(value);
}

function serializeDefaultValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // For arrays and objects, just use [] or {} as initial (real data comes from API)
  if (Array.isArray(value)) return '[]';
  if (typeof value === 'object') return JSON.stringify(value);
  return JSON.stringify(value);
}

// ─── Type Inference from Schema Data ────────────────────────────────────────

/**
 * Infer TypeScript interfaces by examining:
 * 1. dataSource.typeDef (explicit type definitions — highest priority)
 * 2. stateInit.data values (initial data shapes)
 * 3. dataSource mock responseBody shapes (fallback)
 *
 * Produces named interfaces like "Message", "ChatSendResponse" etc.
 */
function inferTypesFromSchema(screen: Screen): InferredTypeIR[] {
  const types: InferredTypeIR[] = [];
  const seen = new Set<string>();

  // 只从显式 typeDef 读取，不做任何推断
  for (const ds of screen.dataSources) {
    if (ds.type !== 'api') continue;
    const apiDs = ds as ApiDataSource;
    if (!apiDs.typeDef) continue;

    const { responseName, responseFields, paramsName, paramsFields } = apiDs.typeDef;

    if (!seen.has(responseName)) {
      seen.add(responseName);
      types.push({
        name: responseName,
        fields: responseFields.map((f) => ({
          name: f.name,
          type: f.type,
          optional: f.optional,
          description: f.description,
        })),
      });
    }

    if (paramsName && paramsFields && !seen.has(paramsName)) {
      seen.add(paramsName);
      types.push({
        name: paramsName,
        fields: paramsFields.map((f) => ({
          name: f.name,
          type: f.type,
          optional: f.optional,
          description: f.description,
        })),
      });
    }
  }

  return types;
}

/**
 * Infer TypeScript fields from an object's shape.
 * { id: "1", role: "user", text: "hello" } → [{name:"id",type:"string"}, {name:"role",type:"string"}, {name:"text",type:"string"}]
 */
function inferFieldsFromObject(obj: Record<string, unknown>): InferredTypeIR['fields'] {
  return Object.entries(obj).map(([key, value]) => {
    let type: string;
    if (value === null || value === undefined) {
      type = 'unknown';
    } else if (typeof value === 'string') {
      // Check if it looks like an enum-like field
      type = 'string';
    } else if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (Array.isArray(value)) {
      type = value.length > 0 ? `${inferTypeFromValue(value[0])}[]` : 'unknown[]';
    } else if (typeof value === 'object') {
      type = 'Record<string, unknown>';
    } else {
      type = 'unknown';
    }
    return { name: key, type };
  });
}

/**
 * Derive a type name from a state key or data source name.
 * 不做复数→单数变换（不靠谱），用稳定的命名规则：
 * - 数组类型的 state key: "messages" → "MessagesItem"
 * - dataSource name: "chat-list" → "ChatListItem" (数组响应), "chat-send" → "ChatSendResponse" (对象响应)
 */
function deriveItemTypeName(key: string): string {
  return toPascalCase(key) + 'Item';
}

function deriveResponseTypeName(dsName: string): string {
  return toPascalCase(dsName) + 'Response';
}
