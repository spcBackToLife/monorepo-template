/**
 * Pipeline — Main Orchestrator
 *
 * Coordinates: Config Loading → Scaffold Copy → Parse → Split → Emit → Format
 *
 * This is the ONLY place that knows about all the pieces.
 * It does NOT contain any framework-specific logic (that's in Adapter).
 * It does NOT hardcode any paths (that's from FileOrganization config).
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import * as ejs from 'ejs';
import type { DesignProject, Screen } from '@globallink/design-schema';
import type { FrameworkConfig, SplitPlan, PageIR, ActionStepIR, SplitStrategy } from './core/types';
import type { FrameworkAdapter } from './adapter/interface';
import type { GenerateInput, GenerateOutput, ResolvedTemplate } from './config/types';
import { loadTemplate, listAvailableTemplates } from './config/loader';
import { ReactAdapter } from './adapter/react';
import * as pathResolver from './utils/path-resolver';
import { toPascalCase, toKebabCase, toCamelCase } from './utils/naming';

// ═══════════════════════════════════════════════════════════════
// Adapter Registry
// ═══════════════════════════════════════════════════════════════

const adapterRegistry = new Map<string, FrameworkAdapter>();
adapterRegistry.set('react', new ReactAdapter());

export function getAdapter(name: string): FrameworkAdapter {
  const adapter = adapterRegistry.get(name);
  if (!adapter) {
    throw new Error(`Adapter "${name}" not found. Available: ${Array.from(adapterRegistry.keys()).join(', ')}`);
  }
  return adapter;
}

// ═══════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a complete project from Schema.
 */
export async function generate(input: GenerateInput): Promise<GenerateOutput> {
  const { outputDir, templateName, overrides } = input;

  // 1. Load template framework
  const template = loadTemplate(templateName, overrides);
  const config = template.config;

  // 2. Load adapter
  const adapter = getAdapter(config.adapter);

  // 3. Load Schema
  const schema = await loadSchema(input);
  const projectName = input.projectName || schema.name || 'my-app';

  // 4. Copy scaffold
  ensureDir(outputDir);
  copyScaffold(template.scaffoldDir, outputDir, { projectName });

  // 5. Compile each screen
  const generatedFiles: string[] = [];

  // Lazy-import parser and splitter (they may not exist yet during build)
  const { parseScreen } = await import('./core/parser');
  const { splitPage } = await import('./core/splitter');

  // Load splitting strategies from template directory (if available)
  let strategies: SplitStrategy[] | undefined;
  const splittingDir = join(template.templateDir, 'splitting');
  if (existsSync(join(splittingDir, 'index.ts')) || existsSync(join(splittingDir, 'index.js'))) {
    try {
      const mod = await import(splittingDir);
      strategies = mod.strategies;
    } catch {
      // If loading fails, fall back to legacy rule-based splitting
      strategies = undefined;
    }
  }

  const screenPathMap = buildScreenPathMap(schema.screens);

  for (const screen of schema.screens) {
    // 5a. Parse: Schema → IR
    const pageIR = parseScreen(screen);

    // 5a-post: Resolve screenIds to paths in navigate actions
    resolveNavigationPaths(pageIR, screenPathMap);

    // 5b. Split: IR → SplitPlan
    const plan = splitPage(pageIR, config.splitting, strategies);

    // 5c. Emit: Generate files for this screen
    const files = emitScreen(pageIR, plan, adapter, template, outputDir, screenPathMap);
    generatedFiles.push(...files);
  }

  // 6. Generate router
  const routerFiles = emitRouter(schema.screens, adapter, template, outputDir, screenPathMap);
  generatedFiles.push(...routerFiles);

  // 7. Format (optional)
  // await formatOutput(outputDir);

  return {
    outputDir,
    fileCount: generatedFiles.length,
    files: generatedFiles,
  };
}

// ═══════════════════════════════════════════════════════════════
// Step 2: Scaffold Copy
// ═══════════════════════════════════════════════════════════════

function copyScaffold(scaffoldDir: string, outputDir: string, vars: Record<string, string>): void {
  if (!existsSync(scaffoldDir)) return;
  copyDirRecursive(scaffoldDir, outputDir, vars);
}

function copyDirRecursive(srcDir: string, destDir: string, vars: Record<string, string>): void {
  ensureDir(destDir);
  const entries = readdirSync(srcDir);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, join(destDir, entry), vars);
    } else if (entry.endsWith('.ejs')) {
      // EJS template file → render and write without .ejs extension
      const content = readFileSync(srcPath, 'utf-8');
      const rendered = renderEjs(content, vars);
      const destName = entry.slice(0, -4); // remove .ejs
      writeFileSafe(join(destDir, destName), rendered);
    } else if (entry.endsWith('.tpl')) {
      // Simple template → variable replacement, remove .tpl
      const content = readFileSync(srcPath, 'utf-8');
      const rendered = replaceVars(content, vars);
      const destName = entry.slice(0, -4); // remove .tpl
      writeFileSafe(join(destDir, destName), rendered);
    } else {
      // Regular file → copy as-is
      const destPath = join(destDir, entry);
      ensureDir(dirname(destPath));
      copyFileSync(srcPath, destPath);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Step 3: Load Schema
// ═══════════════════════════════════════════════════════════════

async function loadSchema(input: GenerateInput): Promise<DesignProject> {
  if (input.schemaSource.type === 'file') {
    const content = readFileSync(input.schemaSource.path, 'utf-8');
    return JSON.parse(content) as DesignProject;
  }

  // API mode
  const { projectId, apiBase } = input.schemaSource;
  const url = `${apiBase}/projects/${projectId}/export`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch schema from ${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as DesignProject;
}

// ═══════════════════════════════════════════════════════════════
// Step 5c: Emit Screen Files
// ═══════════════════════════════════════════════════════════════

function emitScreen(
  pageIR: PageIR,
  plan: SplitPlan,
  adapter: FrameworkAdapter,
  template: ResolvedTemplate,
  outputDir: string,
  screenPathMap: Map<string, string>,
): string[] {
  const config = template.config;
  const org = config.fileOrganization;
  const files: string[] = [];

  const pageName = pageIR.name;

  // 5c-1: Types
  if (plan.types.length > 0) {
    const typesPath = pathResolver.resolveTypesEntry(pageName, org);
    const typesContent = renderPattern(template.patternsDir, 'types.ts.ejs', {
      types: plan.types,
    });
    writeFileSafe(join(outputDir, typesPath), typesContent);
    files.push(typesPath);
  }

  // 5c-2: Services (grouped by domain)
  for (const svc of plan.services) {
    const servicePath = pathResolver.resolveServiceEntry(svc.domain, org);
    const serviceContent = renderPattern(template.patternsDir, 'service.ts.ejs', {
      functions: svc.functions.map(fn => ({
        name: fn.functionName,
        description: fn.description || '',
        method: fn.method,
        path: fn.path,
        params: fn.params && fn.params.length > 0
          ? `params: { ${fn.params.map(p => `${p.name}: ${p.type}`).join('; ')} }`
          : '',
        returnType: fn.responseType || 'unknown',
        hasData: fn.method !== 'GET' && fn.params && fn.params.length > 0,
        dataMapping: fn.params ? `{ ${fn.params.map(p => `${p.name}: params.${p.name}`).join(', ')} }` : '{}',
      })),
      typeImports: '',
    });
    writeFileSafe(join(outputDir, servicePath), serviceContent);
    files.push(servicePath);
  }

  // 5c-3: Hooks
  for (const hook of plan.hooks) {
    const hookPath = pathResolver.resolveHookEntry(pageName, hook.hookName, org);
    const hookContent = renderPattern(template.patternsDir, 'hook.ts.ejs', {
      imports: adapter.getFrameworkImports({ hasState: true, hasEffect: hook.reason === 'data-fetching', hasNavigation: false }).join('\n'),
      hookName: hook.hookName,
      stateDeclarations: hook.stateVars.map(v => adapter.emitStateDeclaration({ name: v, pascalName: toPascalCase(v), type: 'unknown', defaultValue: 'undefined' })).join('\n'),
      effects: hook.dataSource
        ? `  useEffect(() => {\n    ${hook.dataSource.functionName}().then(res => set${toPascalCase(hook.stateVars[0] || 'data')}(res));\n  }, []);`
        : '',
      logic: hook.handler ? adapter.emitHandler(hook.handler) : '',
      returnFields: hook.returnFields.join(', '),
    });
    writeFileSafe(join(outputDir, hookPath), hookContent);
    files.push(hookPath);
  }

  // 5c-4: Child Components
  for (const comp of plan.childComponents) {
    const compEntryPath = pathResolver.resolveComponentEntry(pageName, comp.componentName, org);
    const compStylePath = pathResolver.resolveComponentStyle(pageName, comp.componentName, org);

    // Component code
    const styleRelative = `./${org.component.styleFile}`;
    const compContent = renderPattern(template.patternsDir, 'component.tsx.ejs', {
      imports: adapter.emitStyleImport(styleRelative),
      componentName: comp.componentName,
      propsInterface: comp.props.length > 0
        ? `interface ${comp.componentName}Props {\n${comp.props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n')}\n}`
        : '',
      propsSignature: comp.props.length > 0
        ? `{ ${comp.props.map(p => p.name).join(', ')} }: ${comp.componentName}Props`
        : '',
      body: '',
      jsx: adapter.renderTree(comp.node, 4),
    });
    writeFileSafe(join(outputDir, compEntryPath), compContent);
    files.push(compEntryPath);

    // Component style
    if (comp.hasStyle) {
      const styleContent = generateLessFile(comp.node);
      writeFileSafe(join(outputDir, compStylePath), styleContent);
      files.push(compStylePath);
    }
  }

  // 5c-5: Page component
  const pageEntryPath = pathResolver.resolvePageEntry(pageName, org);
  const pageStylePath = pathResolver.resolvePageStyle(pageName, org);

  const pageContent = renderPattern(template.patternsDir, 'page.tsx.ejs', {
    imports: buildPageImports(pageIR, plan, adapter, template, screenPathMap),
    pageName,
    stateDeclarations: buildStateDeclarations(pageIR, adapter),
    navigationSetup: pageIR.handlers.some(h => h.steps.some(s => s.kind === 'navigate' || s.kind === 'navigate-back'))
      ? `  ${adapter.emitNavigationSetup()}\n`
      : '',
    onMountEffect: pageIR.onMount ? `  ${adapter.emitOnMount(pageIR.onMount)}\n` : '',
    handlers: pageIR.handlers
      .filter(h => h.trigger !== 'screenEnter')
      .map(h => `  ${adapter.emitHandler(h)}`)
      .join('\n\n'),
    jsx: adapter.renderTree(plan.page.node, 4),
  });
  writeFileSafe(join(outputDir, pageEntryPath), pageContent);
  files.push(pageEntryPath);

  // Page style
  const pageStyleContent = generateLessFile(pageIR.rootNode);
  if (pageStyleContent.trim()) {
    writeFileSafe(join(outputDir, pageStylePath), pageStyleContent);
    files.push(pageStylePath);
  }

  return files;
}

// ═══════════════════════════════════════════════════════════════
// Step 6: Router
// ═══════════════════════════════════════════════════════════════

function emitRouter(
  screens: Screen[],
  adapter: FrameworkAdapter,
  template: ResolvedTemplate,
  outputDir: string,
  screenPathMap: Map<string, string>,
): string[] {
  const org = template.config.fileOrganization;
  const routerPath = pathResolver.resolveRouterEntry();

  const routes = screens.map(screen => {
    const componentName = toPascalCase(screen.name);
    const path = screenPathMap.get(screen.id) || `/${toKebabCase(screen.name)}`;
    const importPath = `@/${org.page.baseDir.replace(/^src\//, '')}/${componentName}`;
    return { path, componentName, importPath };
  });

  const routerContent = renderPattern(template.patternsDir, 'router.tsx.ejs', { routes });
  writeFileSafe(join(outputDir, routerPath), routerContent);
  return [routerPath];
}

// ═══════════════════════════════════════════════════════════════
// Navigation Path Resolution
// ═══════════════════════════════════════════════════════════════

/**
 * Post-process a PageIR to replace raw screenIds in navigate steps
 * with actual URL paths from the screenPathMap.
 */
function resolveNavigationPaths(pageIR: PageIR, screenPathMap: Map<string, string>): void {
  // Process all handlers
  for (const handler of pageIR.handlers) {
    resolveStepsNavigation(handler.steps, screenPathMap);
  }

  // Process onMount handler
  if (pageIR.onMount) {
    resolveStepsNavigation(pageIR.onMount.steps, screenPathMap);
  }
}

function resolveStepsNavigation(steps: ActionStepIR[], screenPathMap: Map<string, string>): void {
  for (const step of steps) {
    if (step.kind === 'navigate') {
      // Replace screenId with actual path
      const resolvedPath = screenPathMap.get(step.path);
      if (resolvedPath) {
        step.path = resolvedPath;
      }
    } else if (step.kind === 'fetch') {
      // Recurse into onSuccess/onError chains
      if (step.onSuccess) {
        resolveStepsNavigation(step.onSuccess, screenPathMap);
      }
      if (step.onError) {
        resolveStepsNavigation(step.onError, screenPathMap);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function buildScreenPathMap(screens: Screen[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const screen of screens) {
    // Use first part of name (before " - ") as path
    const namePart = screen.name.split(' - ')[0] || screen.name;
    const path = '/' + toKebabCase(namePart);
    map.set(screen.id, path);
  }
  return map;
}

function buildPageImports(
  pageIR: PageIR,
  plan: SplitPlan,
  adapter: FrameworkAdapter,
  template: ResolvedTemplate,
  screenPathMap: Map<string, string>,
): string {
  const lines: string[] = [];
  const org = template.config.fileOrganization;

  // Framework imports
  const needs = {
    hasState: pageIR.viewState.length > 0 || pageIR.dataState.length > 0,
    hasEffect: !!pageIR.onMount,
    hasNavigation: pageIR.handlers.some(h => h.steps.some(s => s.kind === 'navigate' || s.kind === 'navigate-back')),
  };
  const fwImports = adapter.getFrameworkImports(needs);
  lines.push(...fwImports);

  // Service imports
  for (const svc of plan.services) {
    const fns = svc.functions.map(f => f.functionName).join(', ');
    lines.push(`import { ${fns} } from '@/services/${svc.domain}';`);
  }

  // Style import
  lines.push(adapter.emitStyleImport(`./${org.page.styleFile}`));

  // Child component imports
  for (const comp of plan.childComponents) {
    const dir = `./${org.component.dir}/${comp.componentName}`;
    lines.push(`import { ${comp.componentName} } from '${dir}';`);
  }

  // Hook imports
  for (const hook of plan.hooks) {
    lines.push(`import { ${hook.hookName} } from './${org.hook.dir}/${hook.hookName}';`);
  }

  return lines.join('\n');
}

function buildStateDeclarations(pageIR: PageIR, adapter: FrameworkAdapter): string {
  const lines: string[] = [];
  for (const vs of pageIR.viewState) {
    lines.push(`  ${adapter.emitStateDeclaration(vs)}`);
  }
  for (const ds of pageIR.dataState) {
    lines.push(`  ${adapter.emitStateDeclaration(ds)}`);
  }
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// Template Rendering
// ═══════════════════════════════════════════════════════════════

function renderPattern(patternsDir: string, patternFile: string, data: Record<string, unknown>): string {
  const patternPath = join(patternsDir, patternFile);
  if (!existsSync(patternPath)) {
    throw new Error(`Pattern template not found: ${patternPath}`);
  }

  const template = readFileSync(patternPath, 'utf-8');
  return renderEjs(template, data);
}

function renderEjs(template: string, data: Record<string, unknown>): string {
  return ejs.render(template, data, { rmWhitespace: false });
}

function replaceVars(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    result = result.replace(new RegExp(`<%=\\s*${key}\\s*%>`, 'g'), value);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// File System Utilities
// ═══════════════════════════════════════════════════════════════

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeFileSafe(filePath: string, content: string): void {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// Style File Generation
// ═══════════════════════════════════════════════════════════════

import type { NodeIR } from './core/types';

function generateLessFile(rootNode: NodeIR): string {
  const entries: string[] = [];
  collectStyles(rootNode, entries);
  return entries.join('\n');
}

function collectStyles(node: NodeIR, out: string[]): void {
  const statics = node.staticStyles;
  if (Object.keys(statics).length > 0) {
    const className = toCamelCase(node.name || `node${node.id.slice(-6)}`);
    out.push(`.${className} {`);
    for (const [prop, value] of Object.entries(statics)) {
      const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
      out.push(`  ${kebabProp}: ${value};`);
    }
    out.push('}');
    out.push('');
  }
  for (const child of node.children) {
    collectStyles(child, out);
  }
  if (node.repeat) {
    collectStyles(node.repeat.template, out);
  }
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export { loadTemplate, listAvailableTemplates };
