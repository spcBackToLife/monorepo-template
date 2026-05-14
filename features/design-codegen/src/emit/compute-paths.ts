/**
 * Compute Paths — Determines output file paths from FileOrganization config.
 *
 * This is pure path arithmetic. No framework logic.
 */

import type { FileOrganization, SplitPlan, PageIR } from '../core/types';
import type { FilePaths } from './types';
import * as pathResolver from '../utils/path-resolver';

/**
 * Compute all output file paths for a screen's emit plan.
 */
export function computeFilePaths(
  pageName: string,
  plan: SplitPlan,
  org: FileOrganization,
): FilePaths {
  return {
    types: pathResolver.resolveTypesEntry(pageName, org),
    services: plan.services.map(s => ({
      domain: s.domain,
      path: pathResolver.resolveServiceEntry(s.domain, org),
    })),
    hooks: plan.hooks.map(h => ({
      hookName: h.hookName,
      path: pathResolver.resolveHookEntry(pageName, h.hookName, org),
    })),
    components: plan.childComponents.map(c => ({
      componentName: c.componentName,
      entryPath: pathResolver.resolveComponentEntry(pageName, c.componentName, org),
      stylePath: pathResolver.resolveComponentStyle(pageName, c.componentName, org),
    })),
    page: {
      entryPath: pathResolver.resolvePageEntry(pageName, org),
      stylePath: pathResolver.resolvePageStyle(pageName, org),
    },
  };
}
