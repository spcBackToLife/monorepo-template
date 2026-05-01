import type { DesignProject, ComponentNode } from '@globallink/design-schema';
import {
  deepClone,
  instantiateTemplate,
  generateNodeId,
  saveAsTemplate as schemaSaveAsTemplate,
  syncInstance as schemaSyncInstance,
} from '@globallink/design-schema';
import type {
  InstantiateTemplateOp,
  SaveAsTemplateOp,
  DetachInstanceOp,
  SyncInstanceOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById, findParent } from '../utils/tree';

/** Find a node across all screens */
function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

// ===== instantiateTemplate =====

export function executeInstantiateTemplate(
  project: DesignProject,
  params: InstantiateTemplateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const template = newProject.componentAssets.find((t) => t.id === params.templateId);
  if (!template) {
    return {
      project,
      result: { success: false, description: `Template ${params.templateId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const parent = findNodeInProject(newProject, params.parentId);
  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!parent.children) {
    parent.children = [];
  }

  // 关键：从 op.params._nodeIds 按 DFS 顺序消费 ID。
  // 服务端 ensureDeterministicIds 已在 op 入 DB 前预填充；老 op（无 _nodeIds）
  // 才会落入 generateNodeId fallback——这只发生在历史快照重放期间，且
  // 后续 ProjectsService.findOne 的迁移层会把展开结果一次性物化到 schema。
  // 详见 design_docs/03-tech/editor/component-instance-id-stability.md。
  const ids = params._nodeIds;
  let cursor = 0;
  const idGen = () => {
    if (ids && cursor < ids.length) {
      const id = ids[cursor]!;
      cursor += 1;
      return id;
    }
    return generateNodeId();
  };

  const instance = instantiateTemplate(template, { idGen });

  // Apply mode override if specified
  if (params.mode === 'detached' && instance.templateRef) {
    instance.templateRef.mode = 'detached';
  }

  const position = params.position ?? parent.children.length;
  parent.children.splice(position, 0, instance);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Instantiated template "${template.name}" into ${params.parentId}`,
      affectedNodeIds: [instance.id, params.parentId],
    },
    inverse: {
      type: 'removeElement',
      params: { elementId: instance.id },
    },
  };
}

// ===== saveAsTemplate =====

export function executeSaveAsTemplate(
  project: DesignProject,
  params: SaveAsTemplateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const template = schemaSaveAsTemplate(node, {
    name: params.name,
    category: params.category,
    templateId: params.templateId,
    tags: params.tags,
    description: params.description,
    scope: params.scope,
  });

  newProject.componentAssets.push(template);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Saved node ${params.nodeId} as template "${params.name}"`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: '_removeTemplate',
      params: { templateId: template.id },
    },
  };
}

// ===== detachInstance =====

export function executeDetachInstance(
  project: DesignProject,
  params: DetachInstanceOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!node.templateRef) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} is not a template instance`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldMode = node.templateRef.mode;
  node.templateRef.mode = 'detached';

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Detached instance ${params.nodeId} from template`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: '_restoreTemplateRefMode',
      params: { nodeId: params.nodeId, mode: oldMode },
    },
  };
}

// ===== syncInstance =====

export function executeSyncInstance(
  project: DesignProject,
  params: SyncInstanceOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  // Find the node and its parent so we can replace it
  let targetNode: ComponentNode | undefined;
  let parentInfo: { parent: ComponentNode; index: number } | undefined;
  let isRootNode = false;
  let screenIdx = -1;

  for (let i = 0; i < newProject.screens.length; i++) {
    const screen = newProject.screens[i];
    if (screen.rootNode.id === params.nodeId) {
      targetNode = screen.rootNode;
      isRootNode = true;
      screenIdx = i;
      break;
    }
    const result = findParent(screen.rootNode, params.nodeId);
    if (result) {
      parentInfo = result;
      targetNode = result.parent.children![result.index];
      screenIdx = i;
      break;
    }
  }

  if (!targetNode) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!targetNode.templateRef || targetNode.templateRef.mode === 'detached') {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} is not a linked template instance`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Save old node for inverse
  const oldNode = deepClone(targetNode);

  const synced = schemaSyncInstance(targetNode, newProject);
  if (synced === targetNode) {
    return {
      project,
      result: { success: false, description: `Template not found for node ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Replace the node in the tree
  if (isRootNode) {
    newProject.screens[screenIdx].rootNode = synced;
  } else if (parentInfo) {
    parentInfo.parent.children![parentInfo.index] = synced;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Synced instance ${params.nodeId} with template`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: '_restoreNode',
      params: { nodeId: params.nodeId, node: oldNode },
    },
  };
}
