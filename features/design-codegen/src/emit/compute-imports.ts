/**
 * Compute Imports — Resolves import relationships between files.
 *
 * This is geometric path arithmetic + type name extraction.
 * No framework-specific logic.
 */

import type { SplitPlan, HookSplit, ActionStepIR, PageIR } from '../core/types';
import type { FilePaths, ResolvedImports } from './types';
import { computeRelativeImport } from '../utils/path-resolver';

/**
 * Compute resolved imports for a service file.
 */
export function computeServiceImports(
  serviceDomain: string,
  paths: FilePaths,
  typeNames: string[],
  relatedTypes: string[],
): ResolvedImports {
  const svcPath = paths.services.find(s => s.domain === serviceDomain)!.path;
  const usedTypeNames = relatedTypes.filter(t => typeNames.includes(t));

  return {
    typeImportPath: computeRelativeImport(svcPath, paths.types),
    usedTypeNames,
    serviceImports: [],
    hookImports: [],
    componentImports: [],
    styleRelativePath: '',
  };
}

/**
 * Compute resolved imports for a hook file.
 */
export function computeHookImports(
  hook: HookSplit,
  paths: FilePaths,
  typeNames: string[],
  pageIR: PageIR,
): ResolvedImports {
  const hookPath = paths.hooks.find(h => h.hookName === hook.hookName)!.path;

  // Types used in hook state vars
  const usedTypeNames: string[] = [];
  for (const v of hook.stateVars) {
    const typeName = extractTypeName(v.type);
    if (typeName && typeNames.includes(typeName)) {
      usedTypeNames.push(typeName);
    }
  }

  // Service imports
  const serviceImports: ResolvedImports['serviceImports'] = [];
  if (hook.dataSource) {
    const svcPath = paths.services.find(
      s => s.domain === hook.dataSource!.domain,
    );
    if (svcPath) {
      serviceImports.push({
        functionName: hook.dataSource.functionName,
        relativePath: computeRelativeImport(hookPath, svcPath.path),
      });
    }
  }

  // Additional fetch service names from handler steps
  if (hook.handler) {
    const fetchNames = collectFetchServiceNames(hook.handler.steps);
    for (const name of fetchNames) {
      if (serviceImports.some(s => s.functionName === name)) continue;
      const ds = pageIR.dataSources.find(d => d.functionName === name);
      if (ds) {
        const svcPath = paths.services.find(s => s.domain === ds.domain);
        if (svcPath) {
          serviceImports.push({
            functionName: name,
            relativePath: computeRelativeImport(hookPath, svcPath.path),
          });
        }
      }
    }
  }

  return {
    typeImportPath: computeRelativeImport(hookPath, paths.types),
    usedTypeNames: [...new Set(usedTypeNames)],
    serviceImports,
    hookImports: [],
    componentImports: [],
    styleRelativePath: '',
  };
}

/**
 * Compute resolved imports for the page file.
 */
export function computePageImports(
  paths: FilePaths,
  plan: SplitPlan,
  typeNames: string[],
  pageOwnedStateTypes: string[],
): ResolvedImports {
  const pageEntry = paths.page.entryPath;

  // Types used in page-owned state
  const usedTypeNames = pageOwnedStateTypes
    .map(extractTypeName)
    .filter((t): t is string => t !== null && typeNames.includes(t));

  // Hook imports
  const hookImports = paths.hooks.map(h => ({
    hookName: h.hookName,
    relativePath: computeRelativeImport(pageEntry, h.path),
  }));

  // Component imports
  const componentImports = paths.components.map(c => ({
    componentName: c.componentName,
    relativePath: computeRelativeImport(pageEntry, c.entryPath),
  }));

  // Service imports (only for page-direct usage, not hook-covered)
  const serviceImports: ResolvedImports['serviceImports'] = [];

  return {
    typeImportPath: computeRelativeImport(pageEntry, paths.types),
    usedTypeNames: [...new Set(usedTypeNames)],
    serviceImports,
    hookImports,
    componentImports,
    styleRelativePath: `./${paths.page.stylePath.split('/').pop() || 'index.module.less'}`,
  };
}

/**
 * Compute resolved imports for a component file.
 */
export function computeComponentImports(
  componentName: string,
  paths: FilePaths,
  typeNames: string[],
  propsTypes: string[],
  styleFile: string,
): ResolvedImports {
  const compPath = paths.components.find(
    c => c.componentName === componentName,
  )!.entryPath;

  const usedTypeNames = propsTypes
    .map(extractTypeName)
    .filter((t): t is string => t !== null && typeNames.includes(t));

  return {
    typeImportPath: computeRelativeImport(compPath, paths.types),
    usedTypeNames: [...new Set(usedTypeNames)],
    serviceImports: [],
    hookImports: [],
    componentImports: [],
    styleRelativePath: `./${styleFile}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract the base type name from a type expression.
 * "Message[]" → "Message", "string" → null
 */
export function extractTypeName(typeStr: string): string | null {
  const cleaned = typeStr.replace(/\[\]$/, '');
  const primitives = new Set([
    'string', 'number', 'boolean', 'unknown',
    'void', 'never', 'undefined', 'null', 'object',
  ]);
  if (primitives.has(cleaned)) return null;
  if (cleaned.startsWith('Record<')) return null;
  if (cleaned.startsWith('(')) return null;
  if (/^[A-Z][a-zA-Z0-9]*$/.test(cleaned)) return cleaned;
  return null;
}

/**
 * Recursively collect service function names from fetch steps.
 */
export function collectFetchServiceNames(steps: ActionStepIR[]): string[] {
  const names: string[] = [];
  for (const step of steps) {
    if (step.kind === 'fetch') {
      names.push(step.serviceName);
      if (step.onSuccess) {
        names.push(...collectFetchServiceNames(step.onSuccess));
      }
      if (step.onError) {
        names.push(...collectFetchServiceNames(step.onError));
      }
    }
  }
  return names;
}
