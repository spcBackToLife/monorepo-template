import type { PageIR, ComponentSplit } from '../../core/types';
import type { FrameworkImportNeeds } from '../interface';
import { ReactAdapter } from './index';

/**
 * Emit a complete React page component file.
 *
 * This is a higher-level helper that uses ReactAdapter methods to compose
 * imports + state + handlers + JSX into a single file string.
 */
export function emitPageComponent(page: PageIR, adapter: ReactAdapter): string {
  const lines: string[] = [];

  // 1. Determine import needs
  const needs = analyzeImportNeeds(page);
  const frameworkImports = adapter.getFrameworkImports(needs);

  // 2. Framework imports
  for (const imp of frameworkImports) {
    lines.push(imp);
  }

  // 3. Style import
  lines.push(adapter.emitStyleImport('./index.less'));
  lines.push('');

  // 4. Component declaration
  lines.push(`const ${page.name}: React.FC = () => {`);

  // 5. State declarations
  for (const vs of page.viewState) {
    lines.push(`  ${adapter.emitStateDeclaration(vs)}`);
  }
  for (const ds of page.dataState) {
    lines.push(`  ${adapter.emitStateDeclaration(ds)}`);
  }

  if (page.viewState.length > 0 || page.dataState.length > 0) {
    lines.push('');
  }

  // 6. Navigation setup (if needed)
  if (needs.hasNavigation) {
    lines.push(`  ${adapter.emitNavigationSetup()}`);
    lines.push('');
  }

  // 7. Handlers
  for (const handler of page.handlers) {
    const handlerCode = adapter.emitHandler(handler);
    // Indent each line of the handler
    const indentedHandler = handlerCode
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n');
    lines.push(indentedHandler);
    lines.push('');
  }

  // 8. onMount effect
  if (page.onMount) {
    const mountCode = adapter.emitOnMount(page.onMount);
    const indentedMount = mountCode
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n');
    lines.push(indentedMount);
    lines.push('');
  }

  // 9. Return JSX
  lines.push(`  return (`);
  lines.push(adapter.renderTree(page.rootNode, 2));
  lines.push(`  );`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export default ${page.name};`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Emit a child component file (extracted from split plan).
 */
export function emitChildComponent(split: ComponentSplit, adapter: ReactAdapter): string {
  const lines: string[] = [];
  const { componentName, node, props } = split;

  // Imports
  lines.push(`import React from 'react';`);
  if (split.hasStyle) {
    lines.push(adapter.emitStyleImport('./index.less'));
  }
  lines.push('');

  // Props interface
  if (props.length > 0) {
    lines.push(`interface ${componentName}Props {`);
    for (const prop of props) {
      const optional = prop.required ? '' : '?';
      lines.push(`  ${prop.name}${optional}: ${prop.type};`);
    }
    lines.push(`}`);
    lines.push('');
  }

  // Component
  const propsType = props.length > 0 ? `${componentName}Props` : '{}';
  const propsDestructure = props.length > 0
    ? `{ ${props.map(p => p.name).join(', ')} }`
    : '';

  if (props.length > 0) {
    lines.push(`const ${componentName}: React.FC<${propsType}> = (${propsDestructure}) => {`);
  } else {
    lines.push(`const ${componentName}: React.FC = () => {`);
  }

  lines.push(`  return (`);
  lines.push(adapter.renderTree(node, 2));
  lines.push(`  );`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export default ${componentName};`);
  lines.push('');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function analyzeImportNeeds(page: PageIR): FrameworkImportNeeds {
  const hasState = page.viewState.length > 0 || page.dataState.length > 0;
  const hasEffect = page.onMount != null;
  const hasNavigation = page.handlers.some(h =>
    h.steps.some(s => s.kind === 'navigate' || s.kind === 'navigate-back'),
  );

  return {
    hasState,
    hasEffect,
    hasNavigation,
  };
}
