// ═══════════════════════════════════════════════════════════════════════════════
// Splitter — PageIR → SplitPlan
//
// Takes a flat PageIR and applies SplittingRules to decide how to break it
// into smaller pieces: child components, custom hooks, service files, and
// inferred types.
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
  ServiceSplit,
  TypeSplit,
  TypeFieldIR,
  PropDefinition,
} from './types';

import {
  toPascalCase,
  countDescendants,
} from '../utils/naming';

// ─── Main Entry ─────────────────────────────────────────────────────────────

/**
 * Take a PageIR and SplittingRules, produce a SplitPlan that describes
 * how the page should be decomposed into multiple files/components/hooks.
 */
export function splitPage(page: PageIR, rules: SplittingRules): SplitPlan {
  // 1. Walk the NodeIR tree and mark nodes for splitting
  const splitNodes = identifySplitNodes(page.rootNode, rules, true /* isRoot */);

  // 2. Build child component definitions
  const childComponents = buildChildComponents(splitNodes, page);

  // 3. Analyze hooks
  const hooks = analyzeHooks(page, rules);

  // 4. Group services by domain
  const services = groupServices(page.dataSources);

  // 5. Infer types from data sources
  const types = inferTypes(page.dataSources);

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
}

/**
 * Walk the node tree and identify nodes that should be split into
 * their own components based on the rules.
 */
function identifySplitNodes(
  node: NodeIR,
  rules: SplittingRules,
  isRoot: boolean,
): SplitCandidate[] {
  const candidates: SplitCandidate[] = [];

  // Don't split the root node itself
  if (!isRoot) {
    const reason = shouldSplit(node, rules);
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
    const childCandidates = identifySplitNodes(child, rules, false);
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
    });
  }

  return candidates;
}

/**
 * Determine if a node should be split based on rules.
 * Returns the reason or null if no split is needed.
 */
function shouldSplit(
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
 */
function generateComponentName(node: NodeIR, suffix?: string): string {
  const base = node.name
    ? toPascalCase(node.name)
    : toPascalCase(node.id.slice(-8));

  return suffix ? `${base}${suffix}` : base;
}

// ─── Child Component Building ───────────────────────────────────────────────

function buildChildComponents(
  candidates: SplitCandidate[],
  page: PageIR,
): ComponentSplit[] {
  return candidates.map((candidate) => {
    const props = inferComponentProps(candidate.node, page);
    const hasStyle = hasNonEmptyStyles(candidate.node);

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
function inferComponentProps(node: NodeIR, page: PageIR): PropDefinition[] {
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

  // If the node has events, add handler props
  for (const event of node.events) {
    if (!seenNames.has(event.handlerName)) {
      seenNames.add(event.handlerName);
      props.push({
        name: event.handlerName,
        type: '() => void',
        required: true,
      });
    }
  }

  // If inside a repeat context, add item/index props
  // (detected by checking if any expression references "item" or "index")
  if (hasRepeatContextReference(node)) {
    if (!seenNames.has('item')) {
      seenNames.add('item');
      props.push({ name: 'item', type: 'unknown', required: true });
    }
    if (!seenNames.has('index')) {
      seenNames.add('index');
      props.push({ name: 'index', type: 'number', required: true });
    }
  }

  return props;
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

  // Data fetching hooks
  if (rules.hook.splitDataFetching) {
    for (const ds of page.dataSources) {
      const hookName = `use${toPascalCase(ds.name)}`;

      // Find related state variables (data that this fetch populates)
      const relatedStateVars = findRelatedStateVars(ds, page);

      // Find handlers that use this data source
      const relatedHandler = page.handlers.find((h) =>
        h.steps.some(
          (s) => s.kind === 'fetch' && s.serviceName === ds.functionName,
        ),
      );

      hooks.push({
        hookName,
        reason: 'data-fetching',
        dataSource: ds,
        handler: relatedHandler,
        stateVars: relatedStateVars,
        returnFields: buildHookReturnFields(ds, relatedStateVars, relatedHandler),
      });
    }
  }

  // Complex handler hooks
  if (rules.hook.minActionsToSplit > 0) {
    const alreadyInHook = new Set(
      hooks.filter((h) => h.handler).map((h) => h.handler!.name),
    );

    for (const handler of page.handlers) {
      if (alreadyInHook.has(handler.name)) continue;
      if (handler.steps.length >= rules.hook.minActionsToSplit) {
        const hookName = `use${toPascalCase(handler.name.replace(/^handle/, ''))}`;

        // Find state vars this handler manages
        const stateVars = extractHandlerStateVars(handler);

        hooks.push({
          hookName,
          reason: 'complex-handler',
          handler,
          stateVars,
          returnFields: [...stateVars, handler.name],
        });
      }
    }
  }

  return hooks;
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

  // Add loading state
  fields.push(`is${toPascalCase(ds.name)}Loading`);

  // Add the fetch function name
  fields.push(ds.functionName);

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

  return Array.from(domainMap.entries()).map(([domain, functions]) => ({
    domain,
    functions,
  }));
}

// ─── Type Inference ─────────────────────────────────────────────────────────

function inferTypes(dataSources: DataSourceIR[]): TypeSplit[] {
  const types: TypeSplit[] = [];

  for (const ds of dataSources) {
    // Try to infer from response type
    // We look at mock data for shape inference
    const typeName = `${toPascalCase(ds.name)}Response`;
    const fields = inferFieldsFromDataSource(ds);

    if (fields.length > 0) {
      types.push({ typeName, fields });
    }

    // If we have params, create a params type too
    if (ds.params && ds.params.length > 0) {
      const paramsTypeName = `${toPascalCase(ds.name)}Params`;
      const paramFields: TypeFieldIR[] = ds.params.map((p) => ({
        name: p.name,
        type: p.type,
        optional: false,
      }));
      types.push({ typeName: paramsTypeName, fields: paramFields });
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
