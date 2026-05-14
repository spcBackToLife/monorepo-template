/**
 * Plan Style — Collects CSS class definitions from NodeIR.
 *
 * Generates Less/CSS content from static styles on nodes.
 * Framework-agnostic (CSS is universal).
 *
 * @see design_docs/03-tech/codegen-quality-fix.md — Phase 1
 */

import type { NodeIR } from '../core/types';
import { toCamelCase } from '../utils/naming';
import { normalizeCssValue, camelToKebab } from './css-normalizer';

/**
 * Generate a Less stylesheet from a node tree's static styles.
 */
export function generateLessFromNode(rootNode: NodeIR): string {
  const entries: string[] = [];
  collectNodeStyles(rootNode, entries);
  return entries.join('\n');
}

function collectNodeStyles(node: NodeIR, out: string[]): void {
  const statics = node.staticStyles;
  if (Object.keys(statics).length > 0) {
    const className = toCamelCase(node.name || `node${node.id.slice(-6)}`);
    out.push(`.${className} {`);
    for (const [prop, value] of Object.entries(statics)) {
      const kebabProp = camelToKebab(prop);
      const normalized = normalizeCssValue(prop, value);
      out.push(`  ${kebabProp}: ${normalized};`);
    }
    out.push('}');
    out.push('');
  }

  for (const child of node.children) {
    collectNodeStyles(child, out);
  }

  if (node.repeat) {
    collectNodeStyles(node.repeat.template, out);
  }
}
