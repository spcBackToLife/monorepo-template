/**
 * React Adapter — EmitPlan Integration
 *
 * Implements the 5 build*TemplateData methods for React + TypeScript.
 * All React-specific code generation logic lives here.
 */

import type {
  TypesFileContext,
  ServiceFileContext,
  HookFileContext,
  PageFileContext,
  ComponentFileContext,
  ResolvedImports,
} from '../../emit/types';
import type { ReactAdapter } from './index';
import { toPascalCase } from '../../utils/naming';

// ═══════════════════════════════════════════════════════════════════════════════
// Types File
// ═══════════════════════════════════════════════════════════════════════════════

export function buildTypesTemplateData(
  ctx: TypesFileContext,
): Record<string, unknown> {
  return { types: ctx.types };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service File
// ═══════════════════════════════════════════════════════════════════════════════

export function buildServiceTemplateData(
  ctx: ServiceFileContext,
): Record<string, unknown> {
  const { service, resolvedImports } = ctx;

  // Build type import line
  let typeImport = '';
  if (resolvedImports.usedTypeNames.length > 0) {
    const names = resolvedImports.usedTypeNames.join(', ');
    typeImport = `import type { ${names} } from '${resolvedImports.typeImportPath}';`;
  }

  // Build function descriptors
  const functions = service.functions.map(fn => ({
    name: fn.functionName,
    jsdoc: fn.description ? `/** ${fn.description} */` : '',
    params: fn.params && fn.params.length > 0
      ? `params: { ${fn.params.map(p => `${p.name}: ${p.type}`).join('; ')} }`
      : '',
    returnType: fn.responseType || 'unknown',
    method: fn.method,
    path: fn.path,
    dataLine: fn.method !== 'GET' && fn.params && fn.params.length > 0
      ? 'data: params,'
      : '',
  }));

  return { typeImport, functions };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook File (React Custom Hook)
// ═══════════════════════════════════════════════════════════════════════════════

export function buildHookTemplateData(
  ctx: HookFileContext,
  adapter: ReactAdapter,
): Record<string, unknown> | null {
  const { hook, resolvedImports, pageIR } = ctx;
  const imports: string[] = [];

  // Framework imports
  const fwImports = adapter.getFrameworkImports({
    hasState: hook.stateVars.length > 0,
    hasEffect: hook.reason === 'data-fetching',
    hasNavigation: hookHasNavigation(hook),
  });
  imports.push(...fwImports);

  // Service imports
  for (const svc of resolvedImports.serviceImports) {
    imports.push(`import { ${svc.functionName} } from '${svc.relativePath}';`);
  }

  // Type imports
  if (resolvedImports.usedTypeNames.length > 0) {
    const names = resolvedImports.usedTypeNames.join(', ');
    imports.push(`import type { ${names} } from '${resolvedImports.typeImportPath}';`);
  }

  // State declarations
  const stateDecls = hook.stateVars
    .map(v => `  ${adapter.emitStateDeclaration(v)}`)
    .join('\n');

  // Loading state (data-fetching hooks)
  let loadingDecl = '';
  let loadingVarName = '';
  if (hook.dataSource) {
    loadingVarName = `is${toPascalCase(hook.dataSource.name)}Loading`;
    loadingDecl = `  const [${loadingVarName}, set${toPascalCase(loadingVarName)}] = useState(false);`;
  }

  // Fetch effect
  let fetchEffect = '';
  if (hook.dataSource) {
    const ds = hook.dataSource;
    const targetVar = hook.stateVars[0];
    const setter = targetVar ? `set${targetVar.pascalName}` : 'setData';
    fetchEffect = buildFetchEffect(ds.functionName, setter, loadingVarName, ds.name);
  }

  // Handler logic
  let logic = '';
  if (hook.handler) {
    logic = `  ${adapter.emitHandler(hook.handler)}`;
  }

  // Navigation setup
  let navigationSetup = '';
  if (hookHasNavigation(hook)) {
    navigationSetup = `  ${adapter.emitNavigationSetup()}`;
  }

  const allStateDecls = [stateDecls, loadingDecl].filter(Boolean).join('\n');

  return {
    imports: imports.join('\n'),
    hookName: hook.hookName,
    stateDeclarations: allStateDecls,
    navigationSetup,
    fetchEffect,
    logic,
    returnFields: hook.returnFields.join(', '),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page File
// ═══════════════════════════════════════════════════════════════════════════════

export function buildPageTemplateData(
  ctx: PageFileContext,
  adapter: ReactAdapter,
): Record<string, unknown> {
  const { pageIR, plan, resolvedImports, semantics } = ctx;
  const imports: string[] = [];

  // Framework imports
  const hasNavigation = semantics.pageOwnedHandlers.some(h =>
    h.steps.some(s => s.kind === 'navigate' || s.kind === 'navigate-back'),
  );
  const fwImports = adapter.getFrameworkImports({
    hasState: semantics.pageOwnedState.length > 0,
    hasEffect: semantics.pageNeedsOnMount,
    hasNavigation,
  });
  imports.push(...fwImports);

  // Hook imports
  for (const h of resolvedImports.hookImports) {
    imports.push(`import { ${h.hookName} } from '${h.relativePath}';`);
  }

  // Component imports
  for (const c of resolvedImports.componentImports) {
    imports.push(`import { ${c.componentName} } from '${c.relativePath}';`);
  }

  // Type imports
  if (resolvedImports.usedTypeNames.length > 0) {
    const names = resolvedImports.usedTypeNames.join(', ');
    imports.push(`import type { ${names} } from '${resolvedImports.typeImportPath}';`);
  }

  // Style import
  imports.push(adapter.emitStyleImport(resolvedImports.styleRelativePath));

  // State declarations (page-owned only)
  const stateDeclarations = semantics.pageOwnedState
    .map(v => `  ${adapter.emitStateDeclaration(v)}`)
    .join('\n');

  // Hook calls
  const hookCalls = plan.hooks
    .map(h => `  const { ${h.returnFields.join(', ')} } = ${h.hookName}();`)
    .join('\n');

  // Navigation setup
  const navigationSetup = hasNavigation
    ? `  ${adapter.emitNavigationSetup()}\n`
    : '';

  // onMount effect
  const onMountEffect = semantics.pageNeedsOnMount && pageIR.onMount
    ? `  ${adapter.emitOnMount(pageIR.onMount)}\n`
    : '';

  // Handlers (page-owned only)
  const handlers = semantics.pageOwnedHandlers
    .map(h => `  ${adapter.emitHandler(h)}`)
    .join('\n\n');

  // JSX
  const jsx = adapter.renderTree(plan.page.node, 4);

  return {
    imports: imports.join('\n'),
    pageName: pageIR.name,
    stateDeclarations,
    hookCalls,
    navigationSetup,
    onMountEffect,
    handlers,
    jsx,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component File
// ═══════════════════════════════════════════════════════════════════════════════

export function buildComponentTemplateData(
  ctx: ComponentFileContext,
  adapter: ReactAdapter,
): Record<string, unknown> {
  const { comp, resolvedImports } = ctx;
  const imports: string[] = [];

  // Style import
  imports.push(adapter.emitStyleImport(resolvedImports.styleRelativePath));

  // Type imports
  if (resolvedImports.usedTypeNames.length > 0) {
    const names = resolvedImports.usedTypeNames.join(', ');
    imports.push(`import type { ${names} } from '${resolvedImports.typeImportPath}';`);
  }

  // Props interface
  const propsInterface = comp.props.length > 0
    ? `interface ${comp.componentName}Props {\n${comp.props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n')}\n}`
    : '';

  const propsSignature = comp.props.length > 0
    ? `{ ${comp.props.map(p => p.name).join(', ')} }: ${comp.componentName}Props`
    : '';

  const jsx = adapter.renderTree(comp.node, 4);

  return {
    imports: imports.join('\n'),
    componentName: comp.componentName,
    propsInterface,
    propsSignature,
    body: '',
    jsx,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers (React-specific)
// ═══════════════════════════════════════════════════════════════════════════════

function buildFetchEffect(
  serviceFn: string,
  setter: string,
  loadingVar: string,
  description: string,
): string {
  return [
    `  useEffect(() => {`,
    `    const fetchData = async () => {`,
    `      set${toPascalCase(loadingVar)}(true);`,
    `      try {`,
    `        const result = await ${serviceFn}();`,
    `        ${setter}(result);`,
    `      } catch (error) {`,
    `        console.error('Failed to fetch ${description}:', error);`,
    `      } finally {`,
    `        set${toPascalCase(loadingVar)}(false);`,
    `      }`,
    `    };`,
    `    fetchData();`,
    `  }, []);`,
  ].join('\n');
}

function hookHasNavigation(
  hook: HookFileContext['hook'],
): boolean {
  if (!hook.handler) return false;
  return hook.handler.steps.some(
    s => s.kind === 'navigate' || s.kind === 'navigate-back',
  );
}
