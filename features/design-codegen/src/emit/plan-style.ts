/**
 * Plan Style — Collects CSS class definitions from NodeIR.
 *
 * Generates Less/CSS content from static styles on nodes.
 * Framework-agnostic (CSS is universal).
 *
 * Naming strategy: "sequential dedup"
 *   - Each node's class name is derived from its schema name (toCamelCase).
 *   - Within a single .less file scope, if the same name appears multiple times,
 *     the 2nd/3rd/... occurrence gets a numeric suffix: menuItem, menuItem2, menuItem3.
 *   - This guarantees uniqueness within a CSS Modules file while keeping names
 *     short and readable.
 *   - The resolved name is written to node._resolvedClassName ONCE and never
 *     overwritten, ensuring JSX emit (via resolveClassName()) stays in sync.
 *
 * @see design_docs/03-tech/codegen-quality-fix.md — Phase 1
 */

import type { NodeIR } from '../core/types';
import { toCamelCase } from '../utils/naming';
import { normalizeCssValue, camelToKebab } from './css-normalizer';

/**
 * Generate a Less stylesheet from a node tree's static styles.
 *
 * @param skipSplitChildren If true, stop recursion at nodes marked as
 *   splitAs='component' — their styles belong in separate component style files.
 *   Used by the page-level style file to avoid duplicating component styles.
 */
export function generateLessFromNode(rootNode: NodeIR, skipSplitChildren = false): string {
  // Single pass: walk tree in document order, assign unique class names using
  // a "seen" counter map, then emit Less.
  const seen = new Map<string, number>();
  assignClassNames(rootNode, seen, skipSplitChildren);

  // Emit flat Less
  const lines: string[] = [];
  collectStyles(rootNode, lines, skipSplitChildren);
  return lines.join('\n');
}

/**
 * Walk tree in document order and assign `_resolvedClassName` to each styled node.
 *
 * Uses a sequential dedup strategy:
 *   - First occurrence of "menuItem" → "menuItem"
 *   - Second → "menuItem2"
 *   - Third → "menuItem3"
 *
 * Only writes _resolvedClassName if it hasn't been set yet (idempotent).
 */
function assignClassNames(
  node: NodeIR,
  seen: Map<string, number>,
  skipSplit: boolean,
): void {
  // Only assign if node has static styles AND hasn't been named yet
  if (Object.keys(node.staticStyles).length > 0 && !(node as NodeIRWithResolved)._resolvedClassName) {
    const raw = rawClassName(node);
    const count = (seen.get(raw) || 0) + 1;
    seen.set(raw, count);

    // First occurrence: use raw name; subsequent: append count
    const resolved = count === 1 ? raw : `${raw}${count}`;
    (node as NodeIRWithResolved)._resolvedClassName = resolved;
  }

  // Recurse children
  for (const child of node.children) {
    if (skipSplit && child.splitAs === 'component') continue;
    assignClassNames(child, seen, skipSplit);
  }

  // Recurse repeat template
  if (node.repeat) {
    if (skipSplit && node.repeat.template.splitAs === 'component') return;
    assignClassNames(node.repeat.template, seen, skipSplit);
  }
}

/**
 * Emit flat Less classes using resolved class names.
 */
function collectStyles(node: NodeIR, out: string[], skipSplit: boolean): void {
  const resolved = (node as NodeIRWithResolved)._resolvedClassName;
  if (resolved && Object.keys(node.staticStyles).length > 0) {
    out.push(`.${resolved} {`);
    for (const [prop, value] of Object.entries(node.staticStyles)) {
      out.push(`  ${camelToKebab(prop)}: ${normalizeCssValue(prop, value)};`);
    }
    out.push('}');
    out.push('');
  }

  for (const child of node.children) {
    if (skipSplit && child.splitAs === 'component') continue;
    collectStyles(child, out, skipSplit);
  }
  if (node.repeat) {
    if (skipSplit && node.repeat.template.splitAs === 'component') return;
    collectStyles(node.repeat.template, out, skipSplit);
  }
}

/**
 * Compute the raw (un-prefixed) class name for a node.
 */
function rawClassName(node: NodeIR): string {
  if (node.name) {
    return toCamelCase(node.name);
  }
  return `node${node.id.slice(-6)}`;
}

/**
 * Resolve the final CSS class name for a node (used by emit-element.ts).
 * Falls back to raw name if no resolution was assigned.
 */
export function resolveClassName(node: NodeIR): string {
  return (node as NodeIRWithResolved)._resolvedClassName || rawClassName(node);
}

/** Internal extension to NodeIR for carrying the resolved class name. */
interface NodeIRWithResolved extends NodeIR {
  _resolvedClassName?: string;
}
