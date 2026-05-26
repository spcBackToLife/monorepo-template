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
  // Reset synthetic ID counter for each screen
  syntheticIdCounter = 0;

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

  // 4b. Post-process root node: ensure full-screen flex containers have explicit height.
  // In the design editor, canvas has a fixed height so `minHeight: 100%` works.
  // In a real page, flex children with `flex: 1` need the parent to have a definite
  // height — otherwise the container collapses to content height and the bottom
  // bar floats up instead of sticking to the viewport bottom.
  normalizeRootNodeHeight(rootNode);

  // 5. Extract onMount (screenEnter event on rootNode)
  const onMount = extractOnMount(screen.rootNode, dataSources);

  // 6. Filter out screenEnter from handler list (it's separate in IR)
  const handlers = handlerCollector.filter(
    (h) => h.trigger !== 'screenEnter' && h.trigger !== 'screenExit',
  );

  // 7. Infer TypeScript interfaces from data shapes
  const inferredTypes = inferTypesFromSchema(screen);

  // 8. Mark readonly state variables — those not mutated by any handler
  const mutatedVars = collectMutatedStateVars([...handlers, ...(onMount ? [onMount] : [])]);
  for (const v of viewState) {
    v.isReadonly = !mutatedVars.has(v.name);
  }
  for (const d of dataState) {
    d.isReadonly = !mutatedVars.has(d.name);
  }

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
    let actualValue = value;

    // Phase 9f: Handle JSON string values (some screens store data as JSON strings)
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) {
          actualValue = parsed;
        }
      } catch {
        // Not JSON — regular string value
      }
    }

    // STRICT: Types must come from schema's explicit dataTypes annotation.
    // If missing, this is a data quality issue — NOT a codegen concern to guess.
    const annotation = dataTypes?.[key];
    if (annotation) {
      type = annotation.isArray ? `${annotation.typeName}[]` : annotation.typeName;
    } else {
      // No type annotation in schema — log warning, mark as unknown.
      // Root cause: state.data_set_init should have been called with typeAnnotation,
      // or dataSource.typeDef should define response types. Fix at schema level, not here.
      console.warn(
        `[codegen] WARNING: screen "${screen.name}" data key "${key}" has no dataTypes annotation. ` +
        `Schema writes must include type information. Falling back to 'unknown'.`,
      );
      type = 'unknown';
    }

    return {
      name: key,
      pascalName: toPascalCase(key),
      type,
      // Phase 9c: Use serializeDefaultValue instead of hardcoded '[]'
      defaultValue: serializeDefaultValue(actualValue),
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
  // Priority 1: explicit typeDef (designer-specified)
  if (ds.typeDef) {
    const { responseName, responseShape } = ds.typeDef;
    return responseShape === 'array' ? `${responseName}[]` : responseName;
  }

  // Priority 2: endpoint.responseSchema (OpenAPI JSON Schema format)
  const rs = ds.endpoint?.responseSchema;
  if (rs && typeof rs === 'object' && !Array.isArray(rs)) {
    const schema = rs as Record<string, unknown>;
    if (schema.type === 'array' && schema.items) {
      const items = schema.items as Record<string, unknown>;
      if (typeof items.$ref === 'string') {
        return extractTypeName(items.$ref) + '[]';
      }
      if (items.type) {
        return mapJsonSchemaType(items.type as string) + '[]';
      }
      return 'unknown[]';
    }
    if (schema.type === 'object' || schema.properties) {
      // Object response: generate a typed name from data source name
      const typeName = toPascalCase(ds.name) + 'Response';
      return typeName;
    }
  }

  // Priority 3: fallback to mock responseBody shape inference
  const activeMock = ds.mock?.scenarios?.find(
    (s) => s.id === ds.mock?.activeScenarioId,
  );
  if (activeMock?.responseBody) {
    const body = activeMock.responseBody;
    if (Array.isArray(body)) {
      return 'unknown[]';
    }
    if (typeof body === 'object' && body !== null) {
      return toPascalCase(ds.name) + 'Response';
    }
  }

  return 'unknown';
}

/** Extract type name from a $ref like '#/components/schemas/ChatMessage' */
function extractTypeName(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1] || ref;
}

/** Map JSON Schema primitive types to TypeScript types */
function mapJsonSchemaType(schemaType: string): string {
  const map: Record<string, string> = {
    string: 'string', number: 'number', integer: 'number',
    boolean: 'boolean', array: 'unknown[]', object: 'Record<string, unknown>',
  };
  return map[schemaType] || 'unknown';
}

// ─── Node Tree Parsing ──────────────────────────────────────────────────────

// Counter for generating synthetic node IDs when schema nodes lack them
let syntheticIdCounter = 0;

function parseNode(
  node: ComponentNode,
  dataSources: DataSourceIR[],
  handlerCollector: HandlerIR[],
  scope: ExpressionScope = 'component',
): NodeIR {
  // Ensure node has an ID (some schema nodes may lack it)
  const nodeId = node.id || `syn_${++syntheticIdCounter}`;

  // Determine tag
  const tag = resolveTag(node.type);

  // Separate static vs dynamic styles
  const { staticStyles, dynamicStyles } = parseStyles(node.styles, scope);

  // Parse text content
  const textContent = parseTextContent(node.props, scope);

  // Parse HTML element attributes (src, placeholder, href, alt, type, etc.)
  const htmlProps = parseHtmlProps(node.props, scope);

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
    id: nodeId,
    tag,
    name: node.name,
    staticStyles,
    dynamicStyles,
    textContent,
    htmlProps,
    children,
    events,
    bind,
    repeat,
    visibleWhen,
    componentBoundary: node.componentBoundary,
    isComponentInstance: isComponentInstanceNode(node),
    templateId: resolveTemplateId(node),
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

/**
 * Determine if a node is a component instance.
 * Supports two conventions:
 *   1. type starts with "component:" (explicit component type)
 *   2. templateRef with mode "reference" (instantiated from asset library)
 */
function isComponentInstanceNode(node: ComponentNode): boolean {
  if (node.type.startsWith('component:')) return true;
  if (node.templateRef && node.templateRef.mode === 'reference') return true;
  return false;
}

/**
 * Extract the template ID from a component instance node.
 */
function resolveTemplateId(node: ComponentNode): string | undefined {
  if (node.type.startsWith('component:')) {
    return node.type.slice('component:'.length);
  }
  if (node.templateRef && node.templateRef.mode === 'reference') {
    return node.templateRef.templateId;
  }
  return undefined;
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

// ─── HTML Props Parsing (Phase 6) ──────────────────────────────────────────

/**
 * Standard HTML attributes that should be passed through to JSX elements.
 * textContent/children are handled separately by parseTextContent.
 *
 * @see design_docs/03-tech/codegen-quality-fix.md — Phase 6
 */
const HTML_PROP_WHITELIST = new Set([
  'src', 'alt', 'href', 'target', 'placeholder', 'type', 'disabled',
  'readOnly', 'maxLength', 'minLength', 'pattern', 'autoFocus',
  'autoComplete', 'name', 'id', 'title', 'role', 'tabIndex',
  'aria-label', 'aria-hidden', 'aria-expanded',
  'rel', 'download', 'action', 'method', 'accept',
  'min', 'max', 'step', 'value', 'checked', 'multiple',
  'rows', 'cols', 'wrap', 'spellCheck', 'autoPlay', 'controls',
  'loop', 'muted', 'poster', 'preload',
]);

function parseHtmlProps(
  props: Record<string, unknown>,
  scope: ExpressionScope,
): Record<string, string | ExpressionIR> | undefined {
  if (!props) return undefined;

  const result: Record<string, string | ExpressionIR> = {};
  let hasAny = false;

  for (const [key, value] of Object.entries(props)) {
    // Skip text content (handled separately)
    if (key === 'textContent' || key === 'children') continue;
    // Only pass through known HTML attributes
    if (!HTML_PROP_WHITELIST.has(key)) continue;
    if (value === null || value === undefined) continue;

    const strValue = String(value);
    if (isExpressionString(strValue)) {
      result[key] = compileExpression(strValue, scope);
    } else {
      result[key] = strValue;
    }
    hasAny = true;
  }

  return hasAny ? result : undefined;
}

// ─── Event Parsing ──────────────────────────────────────────────────────────

function parseEvents(
  node: ComponentNode,
  dataSources: DataSourceIR[],
  handlerCollector: HandlerIR[],
): EventBindingIR[] {
  if (!node.events || node.events.length === 0) return [];

  // Deduplicate by trigger: last event with the same trigger wins
  // (later bindings override earlier ones — handles schema dirty data from
  // multiple add_navigation calls)
  const dedupedByTrigger = new Map<string, typeof node.events[number]>();
  for (const event of node.events) {
    if (event.disabled) continue;
    if (event.trigger === 'screenEnter' || event.trigger === 'screenExit') continue;
    dedupedByTrigger.set(event.trigger, event); // last one wins
  }

  const bindings: EventBindingIR[] = [];

  for (const [, event] of dedupedByTrigger) {
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

/**
 * Generate a semantic handler name from a node + trigger.
 *
 * Priority:
 *   1. node.name (designer-assigned semantic name)
 *   2. Role-based heuristic from tag + CSS class patterns
 *   3. Generic fallback: handle{Trigger}Click / handle{Trigger}Change — NEVER use raw node ID
 */
function generateHandlerName(node: ComponentNode, trigger: string): string {
  if (node.name) {
    return `handle${toPascalCase(node.name)}${toPascalCase(trigger)}`;
  }

  // Semantic fallback: infer role from tag + first CSS class
  const role = inferNodeRole(node);
  if (role) {
    return `handle${role}${toPascalCase(trigger)}`;
  }

  // Ultimate generic fallback — no IDs, just trigger
  return `handle${toPascalCase(trigger)}`;
}

/**
 * Infer a short PascalCase role name from a node's tag and styles.
 * e.g. <button> with class ".skipButton" → "Skip",
 *      <div> with class ".tabMessages" → "TabMessages"
 */
function inferNodeRole(node: ComponentNode): string | null {
  // ComponentNode uses 'type' for the HTML tag (not 'tag' — that's NodeIR)
  const tag = resolveTag(node.type).toLowerCase();
  // For interactive elements, try to extract a name from CSS classes
  const styles = node.styles as Record<string, unknown> | undefined;
  const classes = (styles?.className ?? '') as string;
  if (classes && typeof classes === 'string') {
    // Pick the most descriptive class token (longest one that isn't purely numeric)
    const tokens = classes.split(/\s+/).filter(t => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(t));
    if (tokens.length > 0) {
      // Skip generic class names that are likely auto-generated
      const meaningful = tokens.find(t =>
        !/^node[a-f0-9]{6}$/i.test(t) && t.length > 2,
      );
      if (meaningful) {
        return toPascalCase(meaningful);
      }
    }
  }

  // Tag-based fallback for common interactive elements
  if (tag === 'button' || tag === 'a') return 'Button';
  if (tag === 'input' || tag === 'textarea') return 'Input';
  if (tag === 'img' || tag === 'image') return 'Image';

  return null;
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
    ownerNodeId: node.id || 'unknown',
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
  // For arrays and objects, serialize the full initial value to preserve schema data
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return JSON.stringify(value);
}

// ─── Type Inference from Schema Data ────────────────────────────────────────

/**
 * Infer TypeScript interfaces by examining:
 * 1. dataSource.typeDef (explicit type definitions — highest priority)
 * 2. dataSource endpoint.responseSchema + mock.responseBody (API response shape)
 * 3. stateInit.dataTypes + stateInit.data (type annotation name + initial value shape)
 *
 * Produces named interfaces like "Message", "ChatSendResponse" etc.
 */
function inferTypesFromSchema(screen: Screen): InferredTypeIR[] {
  const types: InferredTypeIR[] = [];
  const seen = new Set<string>();

  // Source 1: 从 dataSource.typeDef 读取（最高优先级）
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

  // Source 2: 从 endpoint.responseSchema / mock.responseBody 推断 API 响应包装类型
  for (const ds of screen.dataSources) {
    if (ds.type !== 'api') continue;
    const apiDs = ds as ApiDataSource;

    // Skip if typeDef already handled this
    if (apiDs.typeDef?.responseName && seen.has(apiDs.typeDef.responseName)) continue;

    const rs = apiDs.endpoint?.responseSchema;
    const typeName = toPascalCase(apiDs.name) + 'Response';

    if (rs && typeof rs === 'object' && !Array.isArray(rs)) {
      const schema = rs as Record<string, unknown>;
      if ((schema.type === 'object' || schema.properties) && !seen.has(typeName)) {
        seen.add(typeName);
        const fields = inferFieldsFromResponseSchema(schema);
        types.push({ name: typeName, fields });
      }
      continue;
    }

    // Fallback: infer from mock responseBody
    if (!seen.has(typeName)) {
      const activeMock = apiDs.mock?.scenarios?.find(
        (s) => s.id === apiDs.mock?.activeScenarioId,
      );
      if (activeMock?.responseBody && typeof activeMock.responseBody === 'object' &&
          !Array.isArray(activeMock.responseBody)) {
        seen.add(typeName);
        types.push({
          name: typeName,
          fields: inferFieldsFromObject(activeMock.responseBody as Record<string, unknown>),
        });
      }
    }
  }

  // Source 3: 从 stateInit.dataTypes + stateInit.data 推断
  // dataTypes 提供类型名，data 提供初始值结构（用于推断 fields）
  const dataTypes = screen.stateInit?.dataTypes;
  const dataValues = screen.stateInit?.data;
  if (dataTypes && dataValues) {
    for (const [key, annotation] of Object.entries(dataTypes)) {
      const typeName = annotation.typeName;
      if (seen.has(typeName)) continue; // 已被 dataSource.typeDef 覆盖

      const rawValue = dataValues[key];
      if (rawValue === undefined || rawValue === null) continue;

      // 取样本对象：数组取第一个元素，对象直接用
      let sampleObj: Record<string, unknown> | undefined;
      if (annotation.isArray && Array.isArray(rawValue) && rawValue.length > 0) {
        const first = rawValue[0];
        if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
          sampleObj = first as Record<string, unknown>;
        }
      } else if (!annotation.isArray && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        sampleObj = rawValue as Record<string, unknown>;
      }

      if (sampleObj) {
        seen.add(typeName);
        types.push({
          name: typeName,
          fields: inferFieldsFromObject(sampleObj),
        });
      }
    }
  }

  return types;
}

/**
 * Infer TypeScript fields from an OpenAPI JSON Schema responseSchema.
 * Handles $ref references to extract type names.
 */
function inferFieldsFromResponseSchema(schema: Record<string, unknown>): InferredTypeIR['fields'] {
  const properties = schema.properties as Record<string, unknown> | undefined;
  if (!properties || typeof properties !== 'object') return [];

  return Object.entries(properties).map(([key, propSchema]) => {
    const prop = propSchema as Record<string, unknown> | undefined;
    if (!prop) return { name: key, type: 'unknown' };

    // Handle $ref: { "$ref": "#/components/schemas/ChatMessage" }
    if (typeof prop.$ref === 'string') {
      return { name: key, type: extractTypeName(prop.$ref) };
    }

    // Handle inline type: { "type": "string" } or { "type": "array", "items": {...} }
    if (prop.type) {
      let tsType = mapJsonSchemaType(prop.type as string);
      // Array with items ref
      if (tsType === 'unknown[]' && prop.items) {
        const items = prop.items as Record<string, unknown>;
        if (typeof items.$ref === 'string') {
          tsType = extractTypeName(items.$ref) + '[]';
        }
      }
      return { name: key, type: tsType };
    }

    return { name: key, type: 'unknown' };
  });
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

// ─── Readonly State Detection ───────────────────────────────────────────────

/**
 * Scan all handler steps to find which state variables are mutated
 * (state-set, state-append, state-toggle, state-remove).
 *
 * State variables NOT in this set are readonly — their setter is not needed.
 */
function collectMutatedStateVars(handlers: HandlerIR[]): Set<string> {
  const mutated = new Set<string>();
  for (const handler of handlers) {
    collectMutatedVarsFromSteps(handler.steps, mutated);
  }
  return mutated;
}

function collectMutatedVarsFromSteps(steps: ActionStepIR[], mutated: Set<string>): void {
  for (const step of steps) {
    switch (step.kind) {
      case 'state-set':
      case 'state-append':
      case 'state-toggle':
      case 'state-remove':
        mutated.add(step.variable);
        break;
      case 'fetch':
        if (step.onSuccess) collectMutatedVarsFromSteps(step.onSuccess, mutated);
        if (step.onError) collectMutatedVarsFromSteps(step.onError, mutated);
        break;
    }
  }
}

// ─── Root Node Height Normalization ─────────────────────────────────────────

/**
 * Ensure full-screen flex page containers have a definite height.
 *
 * Problem: In the design editor, the canvas constrains height, so
 * `minHeight: 100%` on the root + `flex: 1` on a child works perfectly.
 * In a real browser, the root is a normal block/flex element whose height
 * is determined by content unless explicitly set. Without `height: 100%`,
 * `flex: 1` children cannot expand to fill remaining space, causing
 * sticky footers / bottom bars to float up.
 *
 * Fix: If root has `minHeight: 100%` + `display: flex` but no explicit
 * `height`, inject `height: 100%`.
 */
function normalizeRootNodeHeight(rootNode: NodeIR): void {
  const s = rootNode.staticStyles;
  const hasMinHeight100 = s.minHeight === '100%' || s.minHeight === '100vh';
  const isFlex = s.display === 'flex';
  const hasNoHeight = !s.height;

  if (hasMinHeight100 && isFlex && hasNoHeight) {
    s.height = '100%';
  }
}
