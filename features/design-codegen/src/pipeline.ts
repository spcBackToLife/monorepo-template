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
// Public API
// ═══════════════════════════════════════════════════════════════

export { loadTemplate, listAvailableTemplates };
