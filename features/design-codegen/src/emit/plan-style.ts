/**
 * Plan Style — Collects CSS class definitions from NodeIR.
 *
 * Generates Less/CSS content from static styles on nodes.
 * Framework-agnostic (CSS is universal).
 *
 * Key design: detects class name collisions among sibling/cousin nodes and
 * disambiguates by prefixing with the parent node's name.
 * E.g., three "tabIcon" children under homeTab / messagesTab / historyTab
 * become: homeTabTabIcon, messagesTabTabIcon, historyTabTabIcon.
 *
 * This is necessary because CSS Modules hashes class names per-file:
 * two `.tabIcon` in the same .less file get the SAME hash, causing
 * last-definition-wins. Unique names → unique hashes → correct styles.
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
  // Phase 1: Collect all raw class names to detect collisions
  const nameCount = new Map<string, number>();
  countClassNames(rootNode, nameCount, skipSplitChildren);
  const duplicateNames = new Set(
    Array.from(nameCount.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  );

  // Phase 2: Walk tree and assign unique class names.
  // Nodes whose raw name collides get prefixed with parent's name.
  assignUniqueClassNames(rootNode, duplicateNames, null, skipSplitChildren);

  // Phase 3: Emit flat Less using the resolved unique class names
  const lines: string[] = [];
  collectStyles(rootNode, lines, skipSplitChildren);
  return lines.join('\n');
}

/**
 * Count how many times each raw class name appears across the entire tree.
 */
function countClassNames(node: NodeIR, counts: Map<string, number>, skipSplit: boolean): void {
  if (Object.keys(node.staticStyles).length > 0) {
    const rawName = rawClassName(node);
    counts.set(rawName, (counts.get(rawName) || 0) + 1);
  }
  for (const child of node.children) {
    if (skipSplit && child.splitAs === 'component') continue;
    countClassNames(child, counts, skipSplit);
  }
  if (node.repeat) {
    if (skipSplit && node.repeat.template.splitAs === 'component') return;
    countClassNames(node.repeat.template, counts, skipSplit);
  }
}

/**
 * Walk the tree and assign `_resolvedClassName` to each styled node.
 * If a node's raw class name is in the duplicate set and it has a named parent,
 * prefix with the parent's name to make it unique.
 */
function assignUniqueClassNames(
  node: NodeIR,
  duplicates: Set<string>,
  parentName: string | null,
  skipSplit: boolean,
): void {
  if (Object.keys(node.staticStyles).length > 0) {
    const raw = rawClassName(node);
    if (duplicates.has(raw) && parentName) {
      // Prefix with parent name: "homeTab" + "TabIcon" → "homeTabTabIcon"
      const prefixed = parentName + raw.charAt(0).toUpperCase() + raw.slice(1);
      (node as NodeIRWithResolved)._resolvedClassName = prefixed;
    } else {
      (node as NodeIRWithResolved)._resolvedClassName = raw;
    }
  }

  // Determine the "name context" for children — use this node's resolved or raw name
  const currentName = (node as NodeIRWithResolved)._resolvedClassName
    || (node.name ? toCamelCase(node.name) : null);

  for (const child of node.children) {
    if (skipSplit && child.splitAs === 'component') continue;
    assignUniqueClassNames(child, duplicates, currentName, skipSplit);
  }
  if (node.repeat) {
    if (skipSplit && node.repeat.template.splitAs === 'component') return;
    assignUniqueClassNames(node.repeat.template, duplicates, currentName, skipSplit);
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
 * Schema nodes MUST have a name; if missing, it's a schema data bug.
 * Using node ID as fallback is intentional to make the issue visible.
 */
function rawClassName(node: NodeIR): string {
  if (node.name) {
    return toCamelCase(node.name);
  }
  // Schema bug: node has no name — use ID suffix to make the issue visible
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
