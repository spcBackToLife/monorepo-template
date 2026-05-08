import type { DesignProject } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  ComponentPropsUpdateOp,
  ComponentPropsAddDefinitionOp,
  ComponentPropsRemoveDefinitionOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById } from '../utils/tree';

/** Find a node across all screens */
function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

// ===== updateComponentProps =====

export function executeUpdateComponentProps(
  project: DesignProject,
  params: ComponentPropsUpdateOp['params'],
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

  // Save old values for only the keys being changed
  const oldProps: Record<string, unknown> = {};
  for (const key of Object.keys(params.props)) {
    oldProps[key] = node.props[key];
  }

  // Merge new props
  Object.assign(node.props, params.props);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated props on node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'componentProps.update',
      params: {
        nodeId: params.nodeId,
        props: oldProps,
      },
    },
  };
}

// ===== addPropDefinition =====

export function executeAddPropDefinition(
  project: DesignProject,
  params: ComponentPropsAddDefinitionOp['params'],
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

  // Check for duplicate prop key
  if (template.propDefinitions.some((d) => d.key === params.definition.key)) {
    return {
      project,
      result: { success: false, description: `Prop definition "${params.definition.key}" already exists on template ${params.templateId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  template.propDefinitions.push({
    key: params.definition.key,
    type: params.definition.type as any,
    label: params.definition.label,
    defaultValue: params.definition.defaultValue,
    group: params.definition.group,
    description: params.definition.description,
    enumValues: params.definition.enumValues,
    required: params.definition.required,
  });

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added prop definition "${params.definition.key}" to template ${params.templateId}`,
      affectedNodeIds: [params.templateId],
    },
    inverse: {
      type: 'componentProps.removeDefinition',
      params: { templateId: params.templateId, propKey: params.definition.key },
    },
  };
}

// ===== removePropDefinition =====

export function executeRemovePropDefinition(
  project: DesignProject,
  params: ComponentPropsRemoveDefinitionOp['params'],
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

  const defIndex = template.propDefinitions.findIndex((d) => d.key === params.propKey);
  if (defIndex === -1) {
    return {
      project,
      result: { success: false, description: `Prop definition "${params.propKey}" not found on template ${params.templateId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedDef] = template.propDefinitions.splice(defIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed prop definition "${params.propKey}" from template ${params.templateId}`,
      affectedNodeIds: [params.templateId],
    },
    inverse: {
      type: '_restorePropDefinition',
      params: {
        templateId: params.templateId,
        definition: removedDef,
        position: defIndex,
      },
    },
  };
}
