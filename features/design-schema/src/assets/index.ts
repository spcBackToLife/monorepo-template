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

/**
 * 实例化时的可选项，用于把"ID 由谁生成"交给调用方。
 *
 * 生产路径（OperationExecutor）应**始终**传入确定性 `idGen`——这些 ID 在 op 入 DB 前
 * 已由 `ensureDeterministicIds` 预生成并写入 op.params，重放幂等。
 *
 * 不传 `idGen` 时回退到随机 `generateNodeId`，仅用于直接调用 schema 工具的旁路场景
 * （脚本 / 测试 / 无 op 链路），不可在渲染期使用。
 *
 * 详见 `design_docs/03-tech/editor/component-instance-id-stability.md`。
 */
export interface InstantiateOptions {
  /** 按 walkTree DFS 顺序被调用，第 1 次返回 root id，之后依次返回子节点 id */
  idGen?: () => string;
}

/** Regenerate all IDs in a node tree (deep clone + IDs from `options.idGen` or random) */
function regenerateIds(node: ComponentNode, options?: InstantiateOptions): ComponentNode {
  const cloned = deepClone(node);
  const gen = options?.idGen ?? generateNodeId;
  walkTree(cloned, (n) => {
    n.id = gen();
  });
  return cloned;
}

// ===== Asset Functions =====

/**
 * Instantiate a ComponentTemplate into a new ComponentNode subtree.
 *
 * - Deep clones the template's schema
 * - Assigns new node IDs (caller-controlled via `options.idGen`)
 * - Sets templateRef on the root node
 *
 * 调用方约定：op executor 必须传入 `options.idGen`，从 op.params 预生成的 ID 数组里取。
 * 不传时回退到随机生成（仅用于无 op 链路的旁路场景）。
 */
export function instantiateTemplate(
  template: ComponentTemplate,
  options?: InstantiateOptions,
): ComponentNode {
  const instance = regenerateIds(template.schema, options);
  instance.templateRef = {
    templateId: template.id,
    mode: 'reference',
  };
  // Mark the root type as component instance
  instance.type = `component:${template.name}`;
  return instance;
}

/**
 * 按 DFS 顺序数模板会展开成多少个节点（含 root）。
 *
 * 用于 `ensureDeterministicIds` 在 op 入 DB 前预生成等量 ID。
 */
export function countTemplateNodes(template: ComponentTemplate): number {
  let count = 0;
  walkTree(template.schema, () => { count += 1; });
  return count;
}

/** 同上，但针对任意 ComponentNode 子树（用于 duplicateElement 预生成子节点 ID） */
export function countSubtreeNodes(node: ComponentNode): number {
  let count = 0;
  walkTree(node, () => { count += 1; });
  return count;
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
    templateId?: string;
    thumbnail?: string;
  },
): ComponentTemplate {
  const schema = deepClone(node);
  // Strip templateRef from the saved template root
  delete schema.templateRef;

  const now = new Date().toISOString();
  return {
    id: options.templateId ?? generateTemplateId(),
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags ?? [],
    thumbnail: options.thumbnail,
    schema,
    scope: options.scope ?? 'project',
    kind: 'styled',
    propDefinitions: [],
    propBindings: [],
    version: 1,
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
