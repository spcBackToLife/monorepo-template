/**
 * Path Resolver
 *
 * Computes output file paths based on FileOrganization config.
 * NO hardcoded paths — everything derived from framework.yaml.
 */

import { join } from 'path';
import type { FileOrganization } from '../core/types';
import { toPascalCase, toKebabCase, toCamelCase } from './naming';

/**
 * Resolve the page directory path.
 * e.g., "src/pages/ChatAIConversation"
 */
export function resolvePageDir(pageName: string, org: FileOrganization): string {
  const dirName = applyNaming(pageName, org.page.dirNaming);
  return join(org.page.baseDir, dirName);
}

/**
 * Resolve page entry file path.
 * e.g., "src/pages/ChatAIConversation/index.tsx"
 */
export function resolvePageEntry(pageName: string, org: FileOrganization): string {
  return join(resolvePageDir(pageName, org), org.page.entryFile);
}

/**
 * Resolve page style file path.
 * e.g., "src/pages/ChatAIConversation/index.less"
 */
export function resolvePageStyle(pageName: string, org: FileOrganization): string {
  return join(resolvePageDir(pageName, org), org.page.styleFile);
}

/**
 * Resolve child component file path.
 * e.g., "src/pages/ChatAIConversation/components/MessageBubble/index.tsx"
 */
export function resolveComponentEntry(pageName: string, componentName: string, org: FileOrganization): string {
  const pageDir = resolvePageDir(pageName, org);
  const compDir = applyNaming(componentName, org.page.dirNaming); // PascalCase by default

  if (org.component.filePattern === 'folder') {
    return join(pageDir, org.component.dir, compDir, org.component.entryFile);
  }
  // flat pattern
  return join(pageDir, org.component.dir, `${compDir}.tsx`);
}

/**
 * Resolve child component style file path.
 * e.g., "src/pages/ChatAIConversation/components/MessageBubble/index.less"
 */
export function resolveComponentStyle(pageName: string, componentName: string, org: FileOrganization): string {
  const pageDir = resolvePageDir(pageName, org);
  const compDir = applyNaming(componentName, org.page.dirNaming);

  if (org.component.filePattern === 'folder') {
    return join(pageDir, org.component.dir, compDir, org.component.styleFile);
  }
  return join(pageDir, org.component.dir, `${compDir}.module.less`);
}

/**
 * Resolve hook file path.
 * e.g., "src/pages/ChatAIConversation/hooks/useMessages.ts"
 */
export function resolveHookEntry(pageName: string, hookName: string, org: FileOrganization): string {
  const pageDir = resolvePageDir(pageName, org);
  return join(pageDir, org.hook.dir, `${hookName}.ts`);
}

/**
 * Resolve service file path.
 * e.g., "src/services/chat.ts"
 */
export function resolveServiceEntry(domain: string, org: FileOrganization): string {
  return join(org.service.dir, `${domain}.ts`);
}

/**
 * Resolve types file path.
 * e.g., "src/pages/ChatAIConversation/types/index.ts"
 */
export function resolveTypesEntry(pageName: string, org: FileOrganization): string {
  const pageDir = resolvePageDir(pageName, org);
  return join(pageDir, org.types.dir, org.types.entryFile);
}

/**
 * Resolve router file path.
 * e.g., "src/router/index.tsx"
 */
export function resolveRouterEntry(): string {
  return 'src/router/index.tsx';
}

/**
 * Compute relative import path between two files.
 * e.g., from "src/pages/Chat/index.tsx" to "src/pages/Chat/hooks/useMessages.ts"
 * → "./hooks/useMessages"
 */
export function computeRelativeImport(from: string, to: string): string {
  const fromParts = from.split('/').slice(0, -1); // directory of source file
  const toParts = to.split('/');
  const toFile = toParts[toParts.length - 1].replace(/\.(ts|tsx)$/, '');
  const toDir = toParts.slice(0, -1);

  // Find common prefix
  let common = 0;
  while (common < fromParts.length && common < toDir.length && fromParts[common] === toDir[common]) {
    common++;
  }

  const ups = fromParts.length - common;
  const downs = toDir.slice(common);

  let relative: string;
  if (ups === 0) {
    relative = './' + [...downs, toFile].join('/');
  } else {
    relative = '../'.repeat(ups) + [...downs, toFile].join('/');
  }

  // If importing a folder with index file, strip /index
  if (relative.endsWith('/index')) {
    relative = relative.slice(0, -6);
  }

  return relative;
}

// ═══ Helpers ═══

function applyNaming(name: string, convention: string): string {
  switch (convention) {
    case 'PascalCase': return toPascalCase(name);
    case 'kebab-case': return toKebabCase(name);
    case 'camelCase': {
      const pascal = toPascalCase(name);
      return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    }
    default: return toPascalCase(name);
  }
}
