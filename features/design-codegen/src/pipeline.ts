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
import { join, dirname } from 'path';
import * as ejs from 'ejs';
import type { DesignProject, Screen } from '@globallink/design-schema';
import type { SplitPlan, PageIR, ActionStepIR, SplitStrategy } from './core/types';
import type { FrameworkAdapter } from './adapter/interface';
import type { GenerateInput, GenerateOutput, ResolvedTemplate } from './config/types';
import { loadTemplate, listAvailableTemplates } from './config/loader';
import { ReactAdapter } from './adapter/react';
import * as pathResolver from './utils/path-resolver';
import { toPascalCase, toKebabCase } from './utils/naming';

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

  // 4b. Infer theme from schema and override variables.less if needed
  const detectedTheme = detectThemeFromSchema(schema);
  if (detectedTheme === 'dark') {
    const variablesPath = join(outputDir, 'src/styles/variables.less');
    if (existsSync(variablesPath)) {
      const darkVariables = generateDarkThemeVariables();
      writeFileSafe(variablesPath, darkVariables);
    }
  }

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

  // 5a. Parse all screens first (needed for cross-page shared component detection)
  const allPageIRs: PageIR[] = [];
  for (const screen of schema.screens) {
    const pageIR = parseScreen(screen);
    resolveNavigationPaths(pageIR, screenPathMap);
    allPageIRs.push(pageIR);
  }

  // 5b. Detect shared components: templateId that appears in multiple pages
  const sharedComponents = detectSharedComponents(allPageIRs);

  // 5c. Emit shared components (one copy per template) to src/components/
  if (sharedComponents.size > 0) {
    const sharedFiles = emitSharedComponents(sharedComponents, adapter, template, outputDir, config);
    generatedFiles.push(...sharedFiles);
  }

  // 5d. Split and emit each page (shared component instances become references)
  for (const pageIR of allPageIRs) {
    // Remove handlers that belong to shared component subtrees
    // (they're now generated inside the shared component, not in the page)
    if (sharedComponents.size > 0) {
      filterOutSharedHandlers(pageIR, sharedComponents);
    }

    const plan = splitPage(pageIR, config.splitting, strategies);

    const files = emitScreen(pageIR, plan, adapter, template, outputDir, screenPathMap);
    generatedFiles.push(...files);
  }

  // 5e. Inject shared component imports into page files that reference them
  if (sharedComponents.size > 0) {
    injectSharedComponentImports(allPageIRs, sharedComponents, outputDir, config);
  }

  // 6. Generate router
  const routerFiles = emitRouter(schema.screens, adapter, template, outputDir, screenPathMap);
  generatedFiles.push(...routerFiles);

  // 6b. Download material assets referenced in schema and rewrite CSS URLs
  const apiBase = input.schemaSource.type === 'api' ? input.schemaSource.apiBase : undefined;
  if (apiBase) {
    // Derive the server origin from apiBase (e.g. "http://localhost:3001/api" → "http://localhost:3001")
    // Material assets are served at the server root (/uploads/...), not under /api
    const serverOrigin = new URL(apiBase).origin;
    const materialResult = await downloadMaterialAssets(schema, outputDir, serverOrigin);
    if (materialResult.rewriteMap.size > 0) {
      rewriteCssUrls(outputDir, materialResult.rewriteMap);
      generatedFiles.push(...materialResult.downloadedFiles);
    }
  }

  // 6c. Generate mock data config from schema's ApiDataSource.mock
  const mockDataFile = emitMockData(schema, template, outputDir);
  if (mockDataFile) {
    generatedFiles.push(mockDataFile);
    // 6d. Inject mock bootstrap into main.tsx (import + enableMock)
    injectMockBootstrap(outputDir);
  }

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
// Step 5c: Emit Screen Files (via EmitPlan)
// ═══════════════════════════════════════════════════════════════

import { planScreenEmit } from './emit/plan';

function emitScreen(
  pageIR: PageIR,
  plan: SplitPlan,
  adapter: FrameworkAdapter,
  template: ResolvedTemplate,
  outputDir: string,
  _screenPathMap: Map<string, string>,
): string[] {
  const config = template.config;
  const org = config.fileOrganization;
  const files: string[] = [];

  // 1. Plan — compute all file paths, imports, and template data at once
  const emitPlan = planScreenEmit(pageIR, plan, org, adapter);

  // 2. Render each file from the plan
  for (const file of emitPlan.files) {
    if (file.pattern) {
      const content = renderPattern(template.patternsDir, file.pattern, file.templateData);
      writeFileSafe(join(outputDir, file.outputPath), content);
    } else {
      // Raw content output (e.g., .less style files)
      writeFileSafe(join(outputDir, file.outputPath), file.templateData.content as string);
    }
    files.push(file.outputPath);
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

  // Default path: the first screen's route (for root "/" redirect)
  const defaultPath = routes.length > 0 ? routes[0].path : undefined;

  const routerContent = renderPattern(template.patternsDir, 'router.tsx.ejs', { routes, defaultPath });
  writeFileSafe(join(outputDir, routerPath), routerContent);
  return [routerPath];
}

// ═══════════════════════════════════════════════════════════════
// Step 6c: Mock Data Generation
// ═══════════════════════════════════════════════════════════════

/**
 * Extract all mock scenarios from schema screens' ApiDataSource.mock configs
 * and generate src/mock-data.ts for the mock manager.
 *
 * @returns generated file path, or null if no mock data exists
 */
function emitMockData(
  schema: DesignProject,
  template: ResolvedTemplate,
  outputDir: string,
): string | null {
  const mockData: Record<string, unknown> = {};
  const endpointMap: Record<string, string> = {};
  let hasAnyMock = false;

  for (const screen of schema.screens) {
    const dataSources = screen.dataSources ?? [];
    for (const ds of dataSources) {
      if (ds.type !== 'api' || !ds.mock) continue;
      if (ds.mock.scenarios.length === 0) continue;

      hasAnyMock = true;
      mockData[ds.id] = {
        scenarios: ds.mock.scenarios.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          statusCode: s.statusCode,
          delay: s.delay,
          isTimeout: s.isTimeout || false,
          responseBody: s.responseBody,
        })),
        activeScenarioId: ds.mock.activeScenarioId,
      };

      // Store endpoint path for URL matching in interceptor
      if (ds.endpoint) {
        endpointMap[ds.id] = ds.endpoint.path;
      }
    }
  }

  if (!hasAnyMock) return null;

  const mockDataPath = join(outputDir, 'src', 'utils', 'mock-data.ts');
  const content = renderPattern(template.patternsDir, 'mock-data.ts.ejs', { mockData, endpointMap });
  writeFileSafe(mockDataPath, content);
  return mockDataPath;
}

/**
 * Inject mock bootstrap code into main.tsx.
 *
 * After mock-data.ts is generated, this patches the entry file to:
 *   1. import '@/utils/mock-data' (registers configs into mock-manager)
 *   2. import { enableMock } from '@/utils/mock-manager' + enableMock()
 *
 * This ensures mock mode is active by default in generated projects.
 */
function injectMockBootstrap(outputDir: string): void {
  const mainPath = join(outputDir, 'src', 'main.tsx');
  if (!existsSync(mainPath)) return;

  let mainContent = readFileSync(mainPath, 'utf-8');

  // Skip if already injected (idempotent)
  if (mainContent.includes('mock-data')) return;

  // Insert mock imports after the last import statement
  const mockImportLines = [
    "import '@/utils/mock-data';",
    "import { enableMock } from '@/utils/mock-manager';",
    '',
    'enableMock();',
    '',
  ].join('\n');

  // Find the last import line and inject after it
  const lines = mainContent.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, '', mockImportLines);
  } else {
    // No imports found (unlikely), prepend
    lines.unshift(mockImportLines);
  }

  writeFileSafe(mainPath, lines.join('\n'));
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

// ═══════════════════════════════════════════════════════════════
// Theme Detection
// ═══════════════════════════════════════════════════════════════

/**
 * Detect whether the design schema uses a dark or light theme
 * by analyzing root node background colors across all screens.
 *
 * Heuristic: parse the backgroundColor of each screen's root node.
 * If the majority of screens have a dark background (luminance < 0.5),
 * the project is dark-themed.
 */
function detectThemeFromSchema(schema: DesignProject): 'dark' | 'light' {
  let darkCount = 0;
  let lightCount = 0;

  for (const screen of schema.screens) {
    const rootStyles = screen.rootNode?.styles;
    if (!rootStyles) continue;

    const bg = rootStyles.backgroundColor || rootStyles.background;
    if (typeof bg !== 'string') continue;

    const luminance = estimateLuminance(bg);
    if (luminance !== null) {
      if (luminance < 0.4) darkCount++;
      else lightCount++;
    }
  }

  return darkCount > lightCount ? 'dark' : 'light';
}

/**
 * Estimate luminance from a CSS color string.
 * Supports: #hex (3/6/8 digits), rgb(), rgba().
 * Returns 0-1 scale (0 = black, 1 = white) or null if unparseable.
 */
function estimateLuminance(color: string): number | null {
  const trimmed = color.trim().toLowerCase();

  // #hex
  const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      // Relative luminance (WCAG formula simplified)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  // rgb() / rgba()
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]) / 255;
    const g = parseInt(rgbMatch[2]) / 255;
    const b = parseInt(rgbMatch[3]) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  return null;
}

/**
 * Generate dark theme variables.less content.
 */
function generateDarkThemeVariables(): string {
  return `// Colors
@color-primary: #1677ff;
@color-primary-hover: #4096ff;
@color-primary-active: #0958d9;
@color-success: #52c41a;
@color-warning: #faad14;
@color-error: #ff4d4f;

// Text colors (dark theme)
@color-text: #ffffff;
@color-text-secondary: rgba(255, 255, 255, 0.65);
@color-text-tertiary: rgba(255, 255, 255, 0.45);
@color-text-disabled: rgba(255, 255, 255, 0.25);

// Background colors (dark theme)
@color-bg: #121212;
@color-bg-secondary: #1a1a22;
@color-bg-tertiary: #242430;

// Border
@color-border: rgba(255, 255, 255, 0.12);
@color-border-secondary: rgba(255, 255, 255, 0.06);
@border-radius-sm: 4px;
@border-radius-base: 6px;
@border-radius-lg: 8px;

// Font
@font-size-sm: 12px;
@font-size-base: 14px;
@font-size-lg: 16px;
@font-size-xl: 20px;
@font-size-xxl: 24px;

// Spacing
@spacing-xs: 4px;
@spacing-sm: 8px;
@spacing-md: 12px;
@spacing-base: 16px;
@spacing-lg: 24px;
@spacing-xl: 32px;

// Shadows (dark theme — brighter borders instead of dark shadows)
@shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 1px 6px -1px rgba(0, 0, 0, 0.15);
@shadow-base: 0 2px 8px 0 rgba(0, 0, 0, 0.3), 0 1px 4px -1px rgba(0, 0, 0, 0.2);
@shadow-lg: 0 6px 16px 0 rgba(0, 0, 0, 0.4), 0 3px 6px -4px rgba(0, 0, 0, 0.3);

// Transitions
@transition-duration: 0.2s;
@transition-timing: cubic-bezier(0.645, 0.045, 0.355, 1);

// Breakpoints
@screen-xs: 480px;
@screen-sm: 576px;
@screen-md: 768px;
@screen-lg: 992px;
@screen-xl: 1200px;
@screen-xxl: 1600px;
`;
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
// Material Asset Download & CSS URL Rewriting
// ═══════════════════════════════════════════════════════════════

interface MaterialDownloadResult {
  downloadedFiles: string[];
  rewriteMap: Map<string, string>; // oldUrlPath → newRelativePath
}

const MATERIAL_URL_PATTERN = /url\(["']?(\/uploads\/materials\/[^"')]+)["']?\)/g;

/**
 * Extract all unique material asset URLs from the schema's node styles.
 */
function extractMaterialUrls(schema: DesignProject): string[] {
  const urls = new Set<string>();

  function walkStyles(styles: Record<string, unknown> | undefined): void {
    if (!styles) return;
    for (const value of Object.values(styles)) {
      if (typeof value !== 'string') continue;
      const matches = value.matchAll(/\/uploads\/materials\/[^\s"')]+/g);
      for (const m of matches) {
        urls.add(m[0]);
      }
    }
  }

  function walkNode(node: Record<string, unknown>): void {
    walkStyles(node.styles as Record<string, unknown> | undefined);
    const children = node.children as Record<string, unknown>[] | undefined;
    if (children) {
      for (const child of children) walkNode(child);
    }
    const repeat = node.repeat as { template?: Record<string, unknown> } | undefined;
    if (repeat?.template) {
      walkNode(repeat.template);
    }
  }

  for (const screen of schema.screens) {
    if (screen.rootNode) walkNode(screen.rootNode as unknown as Record<string, unknown>);
  }

  return Array.from(urls);
}

/**
 * Download material assets from the design API to the output project's public dir,
 * and return a mapping from original URL paths to new relative paths.
 */
async function downloadMaterialAssets(
  schema: DesignProject,
  outputDir: string,
  apiBase: string,
): Promise<MaterialDownloadResult> {
  const sourceUrls = extractMaterialUrls(schema);
  if (sourceUrls.length === 0) {
    return { downloadedFiles: [], rewriteMap: new Map() };
  }

  const rewriteMap = new Map<string, string>();
  const downloadedFiles: string[] = [];
  const assetsDir = join(outputDir, 'public', 'assets');

  for (const urlPath of sourceUrls) {
    // urlPath e.g. /uploads/materials/833478e8-xxx/abc.svg
    // Save to public/assets/materials/833478e8-xxx/abc.svg
    const relativeAssetPath = urlPath.replace(/^\/uploads\//, '');
    const localFilePath = join(assetsDir, relativeAssetPath);
    const newUrlPath = `/assets/${relativeAssetPath}`;

    // Skip if already downloaded
    if (existsSync(localFilePath)) {
      rewriteMap.set(urlPath, newUrlPath);
      continue;
    }

    // Download from API
    const downloadUrl = `${apiBase}${urlPath}`;
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        console.warn(`  ⚠️ Failed to download material: ${downloadUrl} (${res.status})`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      ensureDir(dirname(localFilePath));
      writeFileSync(localFilePath, buffer);
      rewriteMap.set(urlPath, newUrlPath);
      downloadedFiles.push(localFilePath);
    } catch (err) {
      console.warn(`  ⚠️ Error downloading material ${downloadUrl}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (downloadedFiles.length > 0) {
    console.log(`  📦 Downloaded ${downloadedFiles.length} material assets → public/assets/`);
  }

  return { downloadedFiles, rewriteMap };
}

/**
 * Rewrite CSS url() references in all .less/.css files under outputDir.
 */
function rewriteCssUrls(outputDir: string, rewriteMap: Map<string, string>): void {
  const cssFiles = findCssFiles(outputDir);
  let rewriteCount = 0;

  for (const filePath of cssFiles) {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    content = content.replace(MATERIAL_URL_PATTERN, (match, urlPath: string) => {
      const newPath = rewriteMap.get(urlPath);
      if (newPath) {
        modified = true;
        rewriteCount++;
        return match.replace(urlPath, newPath);
      }
      return match;
    });

    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
    }
  }

  if (rewriteCount > 0) {
    console.log(`  ✏️  Rewrote ${rewriteCount} material URL(s) in CSS files`);
  }
}

function findCssFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findCssFiles(fullPath));
    } else if (entry.endsWith('.less') || entry.endsWith('.css')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Step 5b: Shared Component Detection
// ═══════════════════════════════════════════════════════════════

interface SharedComponentInfo {
  templateId: string;
  componentName: string;
  /** The first occurrence node (used as the "source of truth" for code generation) */
  sourceNode: NodeIR;
  /** All instance nodes across all pages (will be marked as shared references) */
  instances: NodeIR[];
  /** Handlers from the source page that belong to this component's node tree */
  handlers: import('./core/types').HandlerIR[];
}

import type { NodeIR } from './core/types';

/**
 * Detect component instances (nodes with templateId) that appear across multiple pages.
 * These should be emitted once to src/components/ rather than duplicated per page.
 *
 * Also marks each instance node with `splitAs = 'component'` and `splitComponentName`
 * so that the page emitter knows to emit a component reference instead of inlining.
 */
function detectSharedComponents(allPageIRs: PageIR[]): Map<string, SharedComponentInfo> {
  // Collect all nodes with a templateId, grouped by templateId
  const templateMap = new Map<string, NodeIR[]>();

  for (const pageIR of allPageIRs) {
    collectTemplateInstances(pageIR.rootNode, templateMap);
  }

  // Only keep templateIds that appear in more than one page
  const shared = new Map<string, SharedComponentInfo>();
  for (const [templateId, instances] of templateMap) {
    if (instances.length >= 2) {
      // Use the first instance's node as the source for code generation
      const sourceNode = instances[0];
      const componentName = toPascalCase(sourceNode.name || `SharedComponent_${templateId.slice(0, 8)}`);

      // Mark ALL instances as shared component references
      for (const inst of instances) {
        inst.splitAs = 'component';
        inst.splitComponentName = componentName;
        // Store reference to shared template so emitter knows it's cross-page shared
        (inst as NodeIR & { _sharedTemplateId?: string })._sharedTemplateId = templateId;
      }

      // Collect handlers relevant to this component (from the source page)
      const eventHandlerNames = new Set<string>();
      collectEventHandlerNames(sourceNode, eventHandlerNames);

      // Find the page that contains the sourceNode
      const sourcePage = allPageIRs.find(p => nodeExistsInTree(p.rootNode, sourceNode.id));
      const handlers = sourcePage
        ? sourcePage.handlers.filter(h => eventHandlerNames.has(h.name))
        : [];

      shared.set(templateId, {
        templateId,
        componentName,
        sourceNode,
        instances,
        handlers,
      });
    }
  }

  return shared;
}

/** Collect all handler names referenced by events in a node tree */
function collectEventHandlerNames(node: NodeIR, names: Set<string>): void {
  for (const ev of node.events) {
    names.add(ev.handlerName);
  }
  for (const child of node.children) {
    collectEventHandlerNames(child, names);
  }
}

/** Check if a node with the given ID exists in a tree */
function nodeExistsInTree(node: NodeIR, id: string): boolean {
  if (node.id === id) return true;
  for (const child of node.children) {
    if (nodeExistsInTree(child, id)) return true;
  }
  if (node.repeat && nodeExistsInTree(node.repeat.template, id)) return true;
  return false;
}

/**
 * Remove handlers from a PageIR whose ownerNodeId is within a shared component subtree.
 * These handlers are emitted inside the shared component instead.
 */
function filterOutSharedHandlers(
  pageIR: PageIR,
  sharedComponents: Map<string, SharedComponentInfo>,
): void {
  // Collect all node IDs that belong to shared component subtrees
  const sharedNodeIds = new Set<string>();
  for (const [, info] of sharedComponents) {
    for (const inst of info.instances) {
      collectAllNodeIds(inst, sharedNodeIds);
    }
  }

  // Filter out handlers whose owner is within a shared component
  pageIR.handlers = pageIR.handlers.filter(h => !sharedNodeIds.has(h.ownerNodeId));
}

/** Collect all node IDs in a subtree */
function collectAllNodeIds(node: NodeIR, ids: Set<string>): void {
  ids.add(node.id);
  for (const child of node.children) {
    collectAllNodeIds(child, ids);
  }
  if (node.repeat) {
    collectAllNodeIds(node.repeat.template, ids);
  }
}

/**
 * Walk a node tree and collect all nodes that are component instances (have templateId).
 */
function collectTemplateInstances(node: NodeIR, map: Map<string, NodeIR[]>): void {
  if (node.templateId && node.isComponentInstance) {
    const list = map.get(node.templateId) || [];
    list.push(node);
    map.set(node.templateId, list);
  }
  for (const child of node.children) {
    collectTemplateInstances(child, map);
  }
  if (node.repeat) {
    collectTemplateInstances(node.repeat.template, map);
  }
}

// ═══════════════════════════════════════════════════════════════
// Step 5c: Emit Shared Components
// ═══════════════════════════════════════════════════════════════

import { generateLessFromNode } from './emit/plan-style';

/**
 * For each shared component, generate a single component file to src/components/{Name}/.
 * Each page that uses it will just `import { Name } from '@/components/Name'`.
 */
function emitSharedComponents(
  sharedComponents: Map<string, SharedComponentInfo>,
  adapter: FrameworkAdapter,
  template: ResolvedTemplate,
  outputDir: string,
  config: ReturnType<typeof loadTemplate>['config'],
): string[] {
  const files: string[] = [];
  const org = config.fileOrganization;

  for (const [, info] of sharedComponents) {
    const compDir = join('src', org.component.dir, info.componentName);

    // Generate style
    const styleContent = generateLessFromNode(info.sourceNode);
    if (styleContent.trim()) {
      const stylePath = join(compDir, org.component.styleFile);
      writeFileSafe(join(outputDir, stylePath), styleContent);
      files.push(stylePath);
    }

    // Generate component TSX using the adapter
    const componentContent = adapter.renderSharedComponent({
      componentName: info.componentName,
      node: info.sourceNode,
      hasStyle: !!styleContent.trim(),
      styleFile: org.component.styleFile,
      handlers: info.handlers,
    });
    const entryPath = join(compDir, org.component.entryFile);
    writeFileSafe(join(outputDir, entryPath), componentContent);
    files.push(entryPath);
  }

  return files;
}

/**
 * After all page files are emitted, scan generated .tsx files for shared component
 * references and inject the necessary import statements.
 *
 * Strategy: look for `<ComponentName` in each .tsx file; if that component exists
 * in src/components/, add `import { ComponentName } from '@/components/ComponentName'`.
 */
function injectSharedComponentImports(
  _allPageIRs: PageIR[],
  sharedComponents: Map<string, SharedComponentInfo>,
  outputDir: string,
  _config: ReturnType<typeof loadTemplate>['config'],
): void {
  const sharedNames = [...sharedComponents.values()].map(c => c.componentName);
  if (sharedNames.length === 0) return;

  // Scan all .tsx files under src/pages/
  const pagesDir = join(outputDir, 'src', 'pages');
  const tsxFiles = findTsxFiles(pagesDir);

  for (const filePath of tsxFiles) {
    let content = readFileSync(filePath, 'utf-8');
    const importsToAdd: string[] = [];

    for (const name of sharedNames) {
      // Check if this component is used in the file (as JSX tag)
      const usagePattern = new RegExp(`<${name}[\\s/>]`);
      if (!usagePattern.test(content)) continue;

      // Skip if already imported
      if (content.includes(`from '@/components/${name}'`) || content.includes(`from "@/components/${name}"`)) continue;

      // Also skip if it's the shared component's own file
      if (filePath.includes(`/components/${name}/`)) continue;

      importsToAdd.push(`import { ${name} } from '@/components/${name}';`);
    }

    if (importsToAdd.length === 0) continue;

    // Insert after the last import statement
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith('import ')) {
        lastImportIdx = i;
      }
    }

    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, ...importsToAdd);
    } else {
      lines.unshift(...importsToAdd, '');
    }

    writeFileSafe(filePath, lines.join('\n'));
  }
}

/** Recursively find all .tsx files in a directory */
function findTsxFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findTsxFiles(fullPath));
    } else if (entry.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export { loadTemplate, listAvailableTemplates };
