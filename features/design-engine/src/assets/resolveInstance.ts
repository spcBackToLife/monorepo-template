import type { ComponentNode, ComponentTemplate } from '@globallink/design-schema';
import { instantiateTemplate, isComponentInstanceType } from '@globallink/design-schema';

/**
 * Resolve a component instance node into its full subtree.
 *
 * If the node's type starts with "component:", look up the template
 * from the provided assets and expand the node tree.
 *
 * For reference-mode instances, the template's subtree is used.
 * For detached instances, the node's own children are preserved as-is.
 *
 * Returns the original node unchanged if it's not a component instance
 * or if the template is not found.
 */
export function resolveComponentInstance(
  node: ComponentNode,
  assets: ComponentTemplate[],
): ComponentNode {
  if (!isComponentInstanceType(node.type)) {
    return node;
  }

  // Detached instances use their own children — no resolution needed
  if (node.templateRef?.mode === 'detached') {
    return node;
  }

  // Find the template
  if (!node.templateRef) {
    return node;
  }

  const template = assets.find((t) => t.id === node.templateRef?.templateId);
  if (!template) {
    return node;
  }

  // Instantiate the template and preserve the node's ID and overrides
  const resolved = instantiateTemplate(template);
  resolved.id = node.id;

  // Preserve any style/state/event overrides from the instance
  if (node.styles && Object.keys(node.styles).length > 0) {
    resolved.styles = { ...resolved.styles, ...node.styles };
  }
  if (node.states && node.states.length > 0) {
    resolved.states = node.states;
  }
  if (node.activeState !== 'default') {
    resolved.activeState = node.activeState;
  }
  if (node.events && node.events.length > 0) {
    resolved.events = [...(resolved.events ?? []), ...node.events];
  }

  return resolved;
}
