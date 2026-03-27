import type { ComponentNode } from '../types/node';
import type { ComponentTemplate, TemplateScope } from '../types/template';
import type { DesignProject } from '../types/project';
import { generateNodeId, generateTemplateId } from '../utils/id';
import { deepClone } from '../serialization';

// ===== Tree Helpers =====

/** Walk a ComponentNode tree, calling visitor on each node */
function walkTree(node: ComponentNode, visitor: (n: ComponentNode) => void): void {
  visitor(node);
  if (node.children) {
    for (const child of node.children) {
      walkTree(child, visitor);
    }
  }
}

/** Regenerate all IDs in a node tree (deep clone + new IDs) */
function regenerateIds(node: ComponentNode): ComponentNode {
  const cloned = deepClone(node);
  walkTree(cloned, (n) => {
    n.id = generateNodeId();
  });
  return cloned;
}

// ===== Asset Functions =====

/**
 * Instantiate a ComponentTemplate into a new ComponentNode subtree.
 *
 * - Deep clones the template's schema
 * - Regenerates all node IDs to avoid conflicts
 * - Sets templateRef on the root node
 */
export function instantiateTemplate(template: ComponentTemplate): ComponentNode {
  const instance = regenerateIds(template.schema);
  instance.templateRef = {
    templateId: template.id,
    mode: 'reference',
  };
  // Mark the root type as component instance
  instance.type = `component:${template.name}`;
  return instance;
}

/**
 * Save a ComponentNode subtree as a reusable ComponentTemplate.
 *
 * - Deep clones the node tree
 * - Strips templateRef from the cloned tree root
 * - Generates a new template ID
 */
export function saveAsTemplate(
  node: ComponentNode,
  options: {
    name: string;
    category: string;
    tags?: string[];
    description?: string;
    scope?: TemplateScope;
    thumbnail?: string;
  },
): ComponentTemplate {
  const schema = deepClone(node);
  // Strip templateRef from the saved template root
  delete schema.templateRef;

  const now = new Date().toISOString();
  return {
    id: generateTemplateId(),
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags ?? [],
    thumbnail: options.thumbnail,
    schema,
    scope: options.scope ?? 'project',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Detach a component instance from its template.
 *
 * - Sets templateRef.mode to "detached"
 * - The node tree becomes independent (no longer synced with template updates)
 * - Returns a new node (does not mutate the original)
 */
export function detachInstance(node: ComponentNode): ComponentNode {
  if (!node.templateRef) {
    return node;
  }
  const detached = deepClone(node);
  if (detached.templateRef) {
    detached.templateRef.mode = 'detached';
  }
  return detached;
}

/**
 * Sync a component instance with the latest template.
 *
 * - Finds the matching template by templateRef.templateId
 * - Replaces the subtree with a fresh instantiation
 * - Preserves the node's existing ID
 */
export function syncInstance(
  node: ComponentNode,
  project: DesignProject,
): ComponentNode {
  if (!node.templateRef || node.templateRef.mode === 'detached') {
    return node;
  }

  const template = project.componentAssets.find(
    (t) => t.id === node.templateRef?.templateId,
  );
  if (!template) {
    return node;
  }

  const synced = instantiateTemplate(template);
  // Preserve the original instance ID
  synced.id = node.id;
  return synced;
}
