/**
 * EmitPlan — Thin Orchestrator
 *
 * Coordinates: paths → imports → semantics → adapter.build*() → FileEmitPlan[]
 *
 * This file contains ZERO framework-specific code.
 * All code generation is delegated to the adapter's build*TemplateData methods.
 */

import type {
  PageIR,
  SplitPlan,
  FileOrganization,
  ScreenEmitPlan,
  FileEmitPlan,
} from '../core/types';
import type { FrameworkAdapter } from '../adapter/interface';
import { computeFilePaths } from './compute-paths';
import {
  computeServiceImports,
  computeHookImports,
  computePageImports,
  computeComponentImports,
} from './compute-imports';
import { computeSemantics } from './compute-semantics';
import { generateLessFromNode } from './plan-style';

/**
 * Plan the complete emit for a screen.
 *
 * Steps:
 * 1. Compute all file paths (from FileOrganization config)
 * 2. Compute import relationships (relative path geometry)
 * 3. Compute semantic ownership (state/handler assignment)
 * 4. Call adapter.build*TemplateData() for each file
 */
export function planScreenEmit(
  pageIR: PageIR,
  plan: SplitPlan,
  org: FileOrganization,
  adapter: FrameworkAdapter,
): ScreenEmitPlan {
  const files: FileEmitPlan[] = [];
  const paths = computeFilePaths(pageIR.name, plan, org);
  const typeNames = plan.types.map(t => t.typeName);
  const semantics = computeSemantics(pageIR, plan);

  // 1. Types file
  if (plan.types.length > 0) {
    const data = adapter.buildTypesTemplateData({ types: plan.types });
    files.push({ outputPath: paths.types, pattern: 'types.ts.ejs', templateData: data });
  }

  // 2. Service files
  for (const svc of plan.services) {
    const imports = computeServiceImports(svc.domain, paths, typeNames, svc.relatedTypes);
    const data = adapter.buildServiceTemplateData({ service: svc, resolvedImports: imports });
    const svcPath = paths.services.find(s => s.domain === svc.domain)!.path;
    files.push({ outputPath: svcPath, pattern: 'service.ts.ejs', templateData: data });
  }

  // 3. Hook files (adapter can return null to skip)
  for (const hook of plan.hooks) {
    const imports = computeHookImports(hook, paths, typeNames, pageIR);
    const data = adapter.buildHookTemplateData({ hook, resolvedImports: imports, pageIR });
    if (data !== null) {
      const hookPath = paths.hooks.find(h => h.hookName === hook.hookName)!.path;
      files.push({ outputPath: hookPath, pattern: 'hook.ts.ejs', templateData: data });
    }
  }

  // 4. Component files
  for (const comp of plan.childComponents) {
    const propsTypes = comp.props.map(p => p.type);
    const imports = computeComponentImports(
      comp.componentName, paths, typeNames, propsTypes, org.component.styleFile,
    );
    const data = adapter.buildComponentTemplateData({ comp, resolvedImports: imports });
    const compPath = paths.components.find(c => c.componentName === comp.componentName)!;
    files.push({ outputPath: compPath.entryPath, pattern: 'component.tsx.ejs', templateData: data });

    // Style file
    if (comp.hasStyle) {
      const styleContent = generateLessFromNode(comp.node);
      files.push({ outputPath: compPath.stylePath, pattern: null, templateData: { content: styleContent } });
    }
  }

  // 5. Page file
  const pageOwnedStateTypes = semantics.pageOwnedState.map(v => v.type);
  const pageImports = computePageImports(paths, plan, typeNames, pageOwnedStateTypes);
  const pageData = adapter.buildPageTemplateData({
    pageIR, plan, resolvedImports: pageImports, semantics,
  });
  files.push({ outputPath: paths.page.entryPath, pattern: 'page.tsx.ejs', templateData: pageData });

  // 6. Page style file — skip nodes that belong to child components
  const pageStyle = generateLessFromNode(pageIR.rootNode, /* skipSplitChildren */ true);
  if (pageStyle.trim()) {
    files.push({ outputPath: paths.page.stylePath, pattern: null, templateData: { content: pageStyle } });
  }

  return { files };
}
