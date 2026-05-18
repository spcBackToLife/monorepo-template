// ═══════════════════════════════════════════════════════════════════════════════
// Splitter — PageIR → SplitPlan
//
// Takes a flat PageIR and applies SplittingRules to decide how to break it
// into smaller pieces: child components, custom hooks, service files, and
// inferred types.
//
// Three-level priority:
//   1. componentBoundary === true → split (if respectExplicitBoundary !== false)
//   2. isComponentInstance === true → split (if respectComponentAssets !== false)
//   3. Run through strategies array in order, first match wins
//   Fallback: old rule-based logic (SplittingRules.component.*)
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  PageIR,
  NodeIR,
  DataSourceIR,
  HandlerIR,
  ActionStepIR,
  SplittingRules,
  SplitPlan,
  PageSplit,
  ComponentSplit,
  HookSplit,
  HookStateDef,
  ServiceSplit,
  TypeSplit,
  TypeFieldIR,
  PropDefinition,
  SplitStrategy,
  SplitContext,
} from './types';

import {
  toPascalCase,
  countDescendants,
} from '../utils/naming';

// ─── Main Entry ─────────────────────────────────────────────────────────────

/**
 * Take a PageIR and SplittingRules, produce a SplitPlan that describes
 * how the page should be decomposed into multiple files/components/hooks.
 *
 * If strategies are provided, they are used for level-3 evaluation.
 * Otherwise, falls back to the old rule-based logic using rules.component.* fields.
 */
export function splitPage(
  page: PageIR,
  rules: SplittingRules,
  strategies?: SplitStrategy[],
): SplitPlan {
  // 1. Walk the NodeIR tree and mark nodes for splitting
  const splitNodes = identifySplitNodes(page.rootNode, rules, true /* isRoot */, strategies, page);

  // 2. Build child component definitions
  const childComponents = buildChildComponents(splitNodes, page);

  // 3. Analyze hooks
  const hooks = analyzeHooks(page, rules);

  // 4. Group services by domain
  const services = groupServices(page.dataSources);

  // 5. Infer types from data sources
  const types = inferTypes(page.dataSources, page);

  // 6. Build page split (root component info)
  const pageSplit = buildPageSplit(page, childComponents, hooks);

  return {
    page: pageSplit,
    childComponents,
    hooks,
    services,
    types,
  };
}

// ─── Node Split Identification ──────────────────────────────────────────────

interface SplitCandidate {
  node: NodeIR;
  reason: ComponentSplit['reason'];
  /** repeat 模板拆分时，父节点 repeat.dataExpression.compiled（即 data state 变量名） */
  repeatDataVar?: string;
}

/**
 * Walk the node tree and identify nodes that should be split into
 * their own components based on the rules and strategies.
 */
function identifySplitNodes(
  node: NodeIR,
  rules: SplittingRules,
  isRoot: boolean,
  strategies?: SplitStrategy[],
  page?: PageIR,
  depth = 0,
  parent?: NodeIR,
): SplitCandidate[] {
  const candidates: SplitCandidate[] = [];

  // Don't split the root node itself
  if (!isRoot) {
    const reason = shouldSplit(node, rules, strategies, page, depth, parent);
    if (reason) {
      // Mark the node
      node.splitAs = 'component';
      node.splitComponentName = generateComponentName(node);
      candidates.push({ node, reason });
      // Don't recurse into split children to avoid double-splitting
      return candidates;
    }
  }

  // Recurse into children
  for (const child of node.children) {
    const childCandidates = identifySplitNodes(child, rules, false, strategies, page, depth + 1, node);
    candidates.push(...childCandidates);
  }

  // Also check repeat template (if not itself being split)
  if (node.repeat && rules.component.splitRepeatTemplate) {
    const templateNode = node.repeat.template;
    templateNode.splitAs = 'component';
    templateNode.splitComponentName = generateComponentName(templateNode, 'Item');
    candidates.push({
      node: templateNode,
      reason: 'repeat-template',
      repeatDataVar: node.repeat.dataExpression.compiled,
    });
  }

  return candidates;
}

/**
 * Determine if a node should be split based on the three-level priority:
 *   1. Explicit componentBoundary
 *   2. Component instance from asset library
 *   3. Strategy evaluation (or fallback to old rules)
 */
function shouldSplit(
  node: NodeIR,
  rules: SplittingRules,
  strategies?: SplitStrategy[],
  page?: PageIR,
  depth = 0,
  parent?: NodeIR,
): ComponentSplit['reason'] | null {
  // Level 1: Explicit component boundary
  if (rules.respectExplicitBoundary !== false && node.componentBoundary) {
    return 'named-container';
  }

  // Level 2: Component instance from asset library
  if (rules.respectComponentAssets !== false && node.isComponentInstance) {
    return 'named-container';
  }

  // Level 3: Strategy-based evaluation
  if (strategies && strategies.length > 0 && page) {
    // Filter strategies by enabledStrategies if specified
    const enabledNames = rules.enabledStrategies;
    const activeStrategies = enabledNames
      ? strategies.filter(s => enabledNames.includes(s.name))
      : strategies;

    const ctx: SplitContext = {
      depth,
      parent,
      page,
      params: rules.params || {},
    };

    for (const strategy of activeStrategies) {
      const result = strategy.evaluate(node, ctx);
      if (result) {
        // Map strategy result to a ComponentSplit reason
        return mapStrategyResultToReason(result);
      }
    }

    return null;
  }

  // Fallback: old rule-based logic
  return shouldSplitLegacy(node, rules);
}

/**
 * Map a strategy result string to a ComponentSplit reason.
 */
function mapStrategyResultToReason(result: string): ComponentSplit['reason'] {
  switch (result) {
    case 'repeat-template':
      return 'repeat-template';
    case 'interactive-region':
      return 'interactive-region';
    case 'depth-exceeded':
    case 'children-exceeded':
      return 'complex-container';
    default:
      return 'complex-container';
  }
}

/**
 * Legacy rule-based splitting logic (backward compatibility).
 * Used when no strategies are loaded.
 */
function shouldSplitLegacy(
  node: NodeIR,
  rules: SplittingRules,
): ComponentSplit['reason'] | null {
  const { component: compRules } = rules;

  // Rule: split named containers
  if (
    compRules.splitNamedContainers &&
    node.name &&
    node.children.length > 0
  ) {
    return 'named-container';
  }

  // Rule: split interactive regions (has events AND children.length > 2)
  if (
    compRules.splitInteractiveRegions &&
    node.events.length > 0 &&
    node.children.length > 2
  ) {
    return 'interactive-region';
  }

  // Rule: split complex containers (by descendant count)
  if (compRules.minDescendantsToSplit > 0) {
    const descendants = countDescendants(node);
    if (descendants >= compRules.minDescendantsToSplit) {
      return 'complex-container';
    }
  }

  return null;
}

/**
 * Generate a PascalCase component name for a split node.
 * Avoids double-suffix: if base already ends with the suffix, don't append again.
 * E.g., node "MessageItem" + suffix "Item" → "MessageItem" (not "MessageItemItem")
 */
function generateComponentName(node: NodeIR, suffix?: string): string {
  const base = node.name
    ? toPascalCase(node.name)
    : toPascalCase(node.id.slice(-8));

  if (suffix && base.endsWith(suffix)) {
    return base;
  }

  return suffix ? `${base}${suffix}` : base;
}

// ─── Child Component Building ───────────────────────────────────────────────

function buildChildComponents(
  candidates: SplitCandidate[],
  page: PageIR,
): ComponentSplit[] {
  return candidates.map((candidate) => {
    const props = inferComponentProps(candidate.node, page, candidate.repeatDataVar);
    const hasStyle = hasNonEmptyStyles(candidate.node);

    // Store inferred props on the node so the adapter can emit a component reference
    candidate.node.splitProps = props;

    return {
      componentName: candidate.node.splitComponentName || generateComponentName(candidate.node),
      node: candidate.node,
      reason: candidate.reason,
      props,
      hasStyle,
    };
  });
}

/**
 * Infer what props a split component needs based on what data flows into it.
 * A component needs a prop if:
 * - It reads a state variable (from dynamic styles, text content, visibleWhen)
 * - It has events that reference parent state
 * - It has a bind to a parent state variable
 * - It's in a repeat and needs item/index
 */
function inferComponentProps(node: NodeIR, page: PageIR, repeatDataVar?: string): PropDefinition[] {
  const props: PropDefinition[] = [];
  const seenNames = new Set<string>();

  // Collect all dependencies from the node tree
  const deps = collectDependencies(node);

  // Each dependency that refers to a page-level state variable becomes a prop
  const pageStateVars = new Set([
    ...page.viewState.map((v) => v.name),
    ...page.dataState.map((d) => d.name),
  ]);

  for (const dep of deps) {
    if (pageStateVars.has(dep) && !seenNames.has(dep)) {
      seenNames.add(dep);
      const viewVar = page.viewState.find((v) => v.name === dep);
      const dataVar = page.dataState.find((d) => d.name === dep);
      const type = viewVar?.type || dataVar?.type || 'unknown';

      props.push({
        name: dep,
        type,
        required: true,
      });
    }
  }

  // If the node has a bind, add setter prop
  if (node.bind) {
    const setterName = node.bind.setter;
    if (!seenNames.has(setterName)) {
      seenNames.add(setterName);
      props.push({
        name: setterName,
        type: '(value: string) => void',
        required: true,
      });
    }
  }

  // Collect event handlers from the ENTIRE subtree (not just root node)
  const allHandlerNames = collectHandlerNames(node);
  for (const handlerName of allHandlerNames) {
    if (!seenNames.has(handlerName)) {
      seenNames.add(handlerName);
      props.push({
        name: handlerName,
        type: '() => void',
        required: true,
      });
    }
  }

  // If inside a repeat context, add item/index props
  // Resolve item type from the repeat's data source array type
  if (hasRepeatContextReference(node)) {
    if (!seenNames.has('item')) {
      seenNames.add('item');
      const itemType = resolveRepeatItemType(repeatDataVar, page);
      props.push({ name: 'item', type: itemType, required: true });
    }
    if (!seenNames.has('index')) {
      seenNames.add('index');
      props.push({ name: 'index', type: 'number', required: true });
    }
  }

  return props;
}

/**
 * Recursively collect all event handler names from a node and its descendants.
 */
function collectHandlerNames(node: NodeIR): Set<string> {
  const handlers = new Set<string>();

  for (const event of node.events) {
    handlers.add(event.handlerName);
  }

  for (const child of node.children) {
    const childHandlers = collectHandlerNames(child);
    for (const h of childHandlers) {
      handlers.add(h);
    }
  }

  // Also check repeat template
  if (node.repeat) {
    const templateHandlers = collectHandlerNames(node.repeat.template);
    for (const h of templateHandlers) {
      handlers.add(h);
    }
  }

  return handlers;
}

/**
 * Collect all expression dependencies from a node tree.
 */
function collectDependencies(node: NodeIR): Set<string> {
  const deps = new Set<string>();

  // Dynamic styles
  for (const ds of node.dynamicStyles) {
    for (const dep of ds.expression.dependencies) {
      deps.add(dep);
    }
  }

  // Text content
  if (node.textContent?.isExpression) {
    const textExpr = compileTextDependencies(node.textContent.raw);
    for (const dep of textExpr) {
      deps.add(dep);
    }
  }

  // VisibleWhen
  if (node.visibleWhen) {
    for (const dep of node.visibleWhen.dependencies) {
      deps.add(dep);
    }
  }

  // Bind variable
  if (node.bind) {
    deps.add(node.bind.variable);
  }

  // Repeat data expression
  if (node.repeat) {
    for (const dep of node.repeat.dataExpression.dependencies) {
      deps.add(dep);
    }
    // Recurse into template
    const templateDeps = collectDependencies(node.repeat.template);
    for (const dep of templateDeps) {
      deps.add(dep);
    }
  }

  // Recurse into children
  for (const child of node.children) {
    const childDeps = collectDependencies(child);
    for (const dep of childDeps) {
      deps.add(dep);
    }
  }

  return deps;
}

/**
 * Simple extraction of dependencies from a raw text expression string.
 * We look for state.view.X / state.data.X patterns.
 */
function compileTextDependencies(raw: string): string[] {
  const deps: string[] = [];
  const re = /state\.(?:view|data)\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    deps.push(match[1]);
  }
  return deps;
}

/**
 * Resolve the item type for a repeat template component.
 * Given the repeat's data variable name (e.g. "messages"), look up the
 * corresponding dataState or viewState type (e.g. "Message[]") and
 * extract the element type (e.g. "Message").
 */
function resolveRepeatItemType(repeatDataVar: string | undefined, page: PageIR): string {
  if (!repeatDataVar) return 'unknown';

  // Look up in dataState first, then viewState
  const dataVar = page.dataState.find((d) => d.name === repeatDataVar);
  const viewVar = page.viewState.find((v) => v.name === repeatDataVar);
  const arrayType = dataVar?.type || viewVar?.type;

  if (!arrayType) return 'unknown';

  // Strip trailing "[]" to get the element type
  if (arrayType.endsWith('[]')) {
    return arrayType.slice(0, -2);
  }

  // Handle Array<T> generic syntax
  const genericMatch = arrayType.match(/^Array<(.+)>$/);
  if (genericMatch) {
    return genericMatch[1];
  }

  return 'unknown';
}

/**
 * Check if a node or its descendants reference repeat context (item/index).
 */
function hasRepeatContextReference(node: NodeIR): boolean {
  // Check dynamic styles
  for (const ds of node.dynamicStyles) {
    if (ds.expression.raw.includes('item.') || ds.expression.raw.includes('index')) {
      return true;
    }
  }

  // Check text content
  if (node.textContent?.isExpression && node.textContent.raw.includes('item.')) {
    return true;
  }

  // Check children
  for (const child of node.children) {
    if (hasRepeatContextReference(child)) return true;
  }

  return false;
}

/**
 * Check if a node tree has non-empty styles (static or dynamic).
 */
function hasNonEmptyStyles(node: NodeIR): boolean {
  if (Object.keys(node.staticStyles).length > 0) return true;
  if (node.dynamicStyles.length > 0) return true;
  for (const child of node.children) {
    if (hasNonEmptyStyles(child)) return true;
  }
  return false;
}

// ─── Hook Analysis ──────────────────────────────────────────────────────────

function analyzeHooks(page: PageIR, rules: SplittingRules): HookSplit[] {
  const hooks: HookSplit[] = [];

  // ── Data-fetching hooks ────────────────────────────────────────────────────
  // ONLY create data-fetching hooks for data sources used in onMount/screenEnter.
  // A POST endpoint triggered by user click is NOT a "data-fetching" pattern —
  // it's a mutation that belongs in a handler hook or stays in the page.
  if (rules.hook.splitDataFetching && page.onMount) {
    // Find which data sources are fetched on mount
    const onMountServiceNames = collectFetchServiceNamesFromSteps(page.onMount.steps);

    for (const ds of page.dataSources) {
      // Only create data-fetching hook if this DS is auto-fetched on mount
      if (!onMountServiceNames.has(ds.functionName)) continue;

      const hookName = `use${toPascalCase(ds.name)}`;

      // Find state variables populated by this fetch (from onMount's onSuccess)
      const relatedStateVars = findRelatedStateVars(ds, page);
      const relatedStateVarSet = new Set(relatedStateVars);

      // Find handlers that also mutate the same state (e.g., a send handler that appends to messages)
      // These should be co-located in this hook to have access to setters
      const relatedHandler = page.handlers.find(h => {
        if (h.trigger === 'screenEnter') return false;
        const handlerVars = extractHandlerStateVars(h);
        return handlerVars.some(v => relatedStateVarSet.has(v));
      });

      // If a related handler also manages additional state vars, include them
      let allStateVars = [...relatedStateVars];
      if (relatedHandler) {
        const handlerVars = extractHandlerStateVars(relatedHandler);
        for (const v of handlerVars) {
          if (!allStateVars.includes(v)) {
            allStateVars.push(v);
          }
        }
      }

      hooks.push({
        hookName,
        reason: 'data-fetching',
        dataSource: ds,
        handler: relatedHandler,
        stateVars: allStateVars.map(varName => {
          const viewVar = page.viewState.find(v => v.name === varName);
          const dataVar = page.dataState.find(d => d.name === varName);
          const baseVar = viewVar || dataVar;
          return {
            name: varName,
            pascalName: baseVar?.pascalName || toPascalCase(varName),
            type: baseVar?.type || 'unknown',
            defaultValue: baseVar?.defaultValue || 'undefined',
          };
        }),
        returnFields: buildHookReturnFields(ds, allStateVars, relatedHandler),
      });
    }
  }

  // ── Complex handler hooks ──────────────────────────────────────────────────
  // Handlers with many actions get extracted into their own hook.
  // They bring their state variables (the ones they set) with them.
  if (rules.hook.minActionsToSplit > 0) {
    // Don't re-extract handlers that are already covered by onMount
    const onMountHandlerName = page.onMount?.name;

    for (const handler of page.handlers) {
      // Skip the screenEnter handler (it's covered by data-fetching hooks)
      if (handler.trigger === 'screenEnter') continue;
      if (handler.name === onMountHandlerName) continue;

      if (handler.steps.length >= rules.hook.minActionsToSplit) {
        const hookName = `use${toPascalCase(handler.name.replace(/^handle/, ''))}`;

        // Find state vars this handler manages
        const handlerVarNames = extractHandlerStateVars(handler);

        // Don't steal state variables already managed by a data-fetching hook
        const hookManagedVars = new Set<string>();
        for (const h of hooks) {
          for (const sv of h.stateVars) {
            hookManagedVars.add(sv.name);
          }
        }

        const stateVars = handlerVarNames.filter(v => !hookManagedVars.has(v));

        hooks.push({
          hookName,
          reason: 'complex-handler',
          handler,
          stateVars: stateVars.map(varName => {
            const viewVar = page.viewState.find(v => v.name === varName);
            const dataVar = page.dataState.find(d => d.name === varName);
            const baseVar = viewVar || dataVar;
            return {
              name: varName,
              pascalName: baseVar?.pascalName || toPascalCase(varName),
              type: baseVar?.type || 'unknown',
              defaultValue: baseVar?.defaultValue || 'undefined',
            };
          }),
          returnFields: [...stateVars, handler.name],
        });
      }
    }
  }

  return hooks;
}

/**
 * Collect all service function names from fetch steps (non-recursive into success/error).
 */
function collectFetchServiceNamesFromSteps(steps: ActionStepIR[]): Set<string> {
  const names = new Set<string>();
  for (const step of steps) {
    if (step.kind === 'fetch') {
      names.add(step.serviceName);
    }
  }
  return names;
}

/**
 * Find state variables that a data source populates (via onSuccess chains in handlers).
 */
function findRelatedStateVars(ds: DataSourceIR, page: PageIR): string[] {
  const vars = new Set<string>();

  // Check all handlers for fetch steps targeting this data source
  const allHandlers = [...page.handlers];
  if (page.onMount) allHandlers.push(page.onMount);

  for (const handler of allHandlers) {
    collectFetchTargetVars(handler.steps, ds.functionName, vars);
  }

  return Array.from(vars);
}

function collectFetchTargetVars(
  steps: ActionStepIR[],
  serviceName: string,
  vars: Set<string>,
): void {
  for (const step of steps) {
    if (step.kind === 'fetch' && step.serviceName === serviceName) {
      // Look at onSuccess chain for state.set / state.append
      for (const successStep of step.onSuccess) {
        if (
          successStep.kind === 'state-set' ||
          successStep.kind === 'state-append'
        ) {
          vars.add(successStep.variable);
        }
      }
      if (step.onError) {
        for (const errorStep of step.onError) {
          if (
            errorStep.kind === 'state-set' ||
            errorStep.kind === 'state-append'
          ) {
            vars.add(errorStep.variable);
          }
        }
      }
    }
  }
}

function extractHandlerStateVars(handler: HandlerIR): string[] {
  const vars = new Set<string>();
  for (const step of handler.steps) {
    if (
      step.kind === 'state-set' ||
      step.kind === 'state-append' ||
      step.kind === 'state-toggle' ||
      step.kind === 'state-remove'
    ) {
      vars.add(step.variable);
    }
    if (step.kind === 'fetch') {
      for (const successStep of step.onSuccess) {
        if (
          successStep.kind === 'state-set' ||
          successStep.kind === 'state-append'
        ) {
          vars.add(successStep.variable);
        }
      }
    }
  }
  return Array.from(vars);
}

function buildHookReturnFields(
  ds: DataSourceIR,
  stateVars: string[],
  handler?: HandlerIR,
): string[] {
  const fields: string[] = [...stateVars];

  // Add setters for state vars (needed when JSX binds to these vars)
  for (const varName of stateVars) {
    fields.push(`set${toPascalCase(varName)}`);
  }

  // Add loading state
  fields.push(`is${toPascalCase(ds.name)}Loading`);

  // NOTE: We intentionally do NOT expose ds.functionName in returnFields.
  // The raw service function (e.g., "chatList") is an internal implementation
  // detail of the hook. Exposing it:
  //   1. Shadows the imported service function name, causing variable conflicts
  //   2. Leaks implementation details to the consuming component
  // If the consuming component needs to trigger a refetch, expose a named
  // wrapper like `refetch${PascalCase(ds.name)}` instead.

  // If there's a related handler, include it
  if (handler) {
    fields.push(handler.name);
  }

  return fields;
}

// ─── Service Grouping ───────────────────────────────────────────────────────

function groupServices(dataSources: DataSourceIR[]): ServiceSplit[] {
  const domainMap = new Map<string, DataSourceIR[]>();

  for (const ds of dataSources) {
    const domain = ds.domain;
    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
    }
    domainMap.get(domain)!.push(ds);
  }

  return Array.from(domainMap.entries()).map(([domain, functions]) => {
    // Extract related types from response types of functions in this domain
    const relatedTypes = new Set<string>();
    for (const fn of functions) {
      if (fn.responseType && fn.responseType !== 'unknown' && fn.responseType !== 'any') {
        // Remove array suffix (e.g., "Message[]" → "Message")
        const baseType = fn.responseType.replace(/\[\]$/, '');
        relatedTypes.add(baseType);
      }
    }

    return {
      domain,
      functions,
      relatedTypes: Array.from(relatedTypes),
    };
  });
}

// ─── Type Inference ─────────────────────────────────────────────────────────

function inferTypes(dataSources: DataSourceIR[], page: PageIR): TypeSplit[] {
  const types: TypeSplit[] = [];

  // Use the parser's inferred types directly — they're derived from real data shapes
  for (const inferredType of page.inferredTypes) {
    types.push({
      typeName: inferredType.name,
      fields: inferredType.fields.map(f => ({
        name: f.name,
        type: f.type,
        optional: f.optional,
      })),
    });
  }

  // If we have params, create a params type too
  for (const ds of dataSources) {
    if (ds.params && ds.params.length > 0) {
      const paramsTypeName = `${toPascalCase(ds.name)}Params`;
      const existing = types.find(t => t.typeName === paramsTypeName);
      if (!existing) {
        const paramFields: TypeFieldIR[] = ds.params.map((p) => ({
          name: p.name,
          type: p.type,
          optional: false,
        }));
        types.push({ typeName: paramsTypeName, fields: paramFields });
      }
    }
  }

  return types;
}

/**
 * Infer TypeScript fields from a data source's mock response.
 * In practice, the mock data gives us the best type hints.
 */
function inferFieldsFromDataSource(ds: DataSourceIR): TypeFieldIR[] {
  // We use the responseType as a hint; in a real implementation we'd
  // parse the mock response body shape. For now, return a basic shape.
  if (!ds.responseType) return [];

  // If the response is an array, try to infer item type
  if (ds.responseType.endsWith('[]')) {
    return [
      { name: 'data', type: ds.responseType, optional: false },
    ];
  }

  return [
    { name: 'data', type: ds.responseType, optional: false },
  ];
}

// ─── Page Split Building ────────────────────────────────────────────────────

function buildPageSplit(
  page: PageIR,
  childComponents: ComponentSplit[],
  hooks: HookSplit[],
): PageSplit {
  return {
    componentName: page.name,
    node: page.rootNode,
    hookImports: hooks.map((h) => h.hookName),
    componentImports: childComponents.map((c) => c.componentName),
  };
}
