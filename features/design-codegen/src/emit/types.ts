/**
 * Emit Plan Types — Context interfaces passed between Plan and Adapter.
 *
 * Plan layer computes paths + import relationships + semantic ownership.
 * Adapter layer receives these contexts and produces framework-specific code.
 */

import type {
  PageIR,
  SplitPlan,
  HookSplit,
  ServiceSplit,
  ComponentSplit,
  TypeSplit,
  ViewStateIR,
  DataStateIR,
  HandlerIR,
  FileOrganization,
} from '../core/types';

// ═══════════════════════════════════════════════════════════════════════════════
// File Paths (computed by Plan, shared across all adapter calls)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FilePaths {
  types: string;
  services: ServicePath[];
  hooks: HookPath[];
  components: ComponentPath[];
  page: { entryPath: string; stylePath: string };
}

export interface ServicePath {
  domain: string;
  path: string;
}

export interface HookPath {
  hookName: string;
  path: string;
}

export interface ComponentPath {
  componentName: string;
  entryPath: string;
  stylePath: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Resolved Imports (Plan computes relative paths, Adapter uses them freely)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResolvedImports {
  /** Relative path to types file (e.g., "../types") */
  typeImportPath: string;
  /** Type names used by this file */
  usedTypeNames: string[];
  /** Service functions this file imports */
  serviceImports: { functionName: string; relativePath: string }[];
  /** Hooks this file imports */
  hookImports: { hookName: string; relativePath: string }[];
  /** Components this file imports */
  componentImports: { componentName: string; relativePath: string }[];
  /** Relative path to style file */
  styleRelativePath: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Emit Semantics (ownership decisions computed by Plan)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmitSemantics {
  /** State variable names managed by each hook */
  hookManagedState: Map<string, string[]>;
  /** Handler name managed by each hook */
  hookManagedHandlers: Map<string, string>;
  /** State variables the page owns (not in any hook) */
  pageOwnedState: (ViewStateIR | DataStateIR)[];
  /** Handlers the page owns (not in any hook) */
  pageOwnedHandlers: HandlerIR[];
  /** Whether page still needs onMount (not covered by a hook) */
  pageNeedsOnMount: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// File Contexts (passed to adapter.build*TemplateData methods)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TypesFileContext {
  types: TypeSplit[];
}

export interface ServiceFileContext {
  service: ServiceSplit;
  resolvedImports: ResolvedImports;
}

export interface HookFileContext {
  hook: HookSplit;
  resolvedImports: ResolvedImports;
  pageIR: PageIR;
}

export interface PageFileContext {
  pageIR: PageIR;
  plan: SplitPlan;
  resolvedImports: ResolvedImports;
  semantics: EmitSemantics;
}

export interface ComponentFileContext {
  comp: ComponentSplit;
  resolvedImports: ResolvedImports;
}
