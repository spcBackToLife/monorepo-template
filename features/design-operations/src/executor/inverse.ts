/**
 * 内部 inverse handler（_restoreXxx）：用于 undo 时恢复旧值。
 *
 * 命名约定：
 *   - _restoreXxx：内部回滚动作（不是普通 op）
 *   - 普通 op type（如 element.move）也可以用作 inverse —— 走主 dispatch
 */

import type { DesignProject, ComponentNode, VisualState, DataSource } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type { InverseData, OperationResult } from '../types';
import { findNodeById, findParent } from '../utils/tree';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

/** 主入口：根据 inv.type 选 handler；规则 op type（element.add 等）由调用方降级到 dispatch */
export function dispatchInverse(project: DesignProject, inv: InverseData): Result | null {
  switch (inv.type) {
    case 'noop':
      return {
        project,
        result: { success: true, description: 'No-op', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    case '_restoreElement':
      return restoreElement(project, inv.params as unknown as RestoreElementParams);
    case '_restoreStyle':
      return restoreStyle(project, inv.params as unknown as RestoreStyleParams);
    case '_restoreBatchStyle':
      return restoreBatchStyle(project, inv.params as unknown as RestoreBatchStyleParams);
    case '_restoreVisualState':
      return restoreVisualState(project, inv.params as unknown as RestoreVisualStateParams);
    case '_removeNavigationAndScreen':
      return removeNavigationAndScreen(project, inv.params as unknown as RemoveNavParams);
    case '_restoreScreen':
      return restoreScreen(project, inv.params as unknown as RestoreScreenParams);
    case '_removeViewportPreset':
      return removeViewportPreset(project, inv.params as unknown as RemoveVPParams);
    case '_removeTemplate':
      return removeTemplate(project, inv.params as unknown as { templateId: string });
    case '_restoreTemplateRefMode':
      return restoreTemplateRefMode(project, inv.params as unknown as RestoreTemplateRefModeParams);
    case '_restorePropDefinition':
      return restorePropDefinition(project, inv.params as unknown as RestorePropDefParams);
    case '_restoreNode':
      return restoreNode(project, inv.params as unknown as { nodeId: string; node: ComponentNode });
    case '_restoreDeletedTemplate':
      return restoreDeletedTemplate(project, inv.params as unknown as RestoreDeletedTemplateParams);
    case '_restoreChildVisibility':
      return restoreChildVisibility(project, inv.params as unknown as RestoreChildVisibilityParams);
    case '_restoreMaterialDesign':
      return restoreMaterialDesign(project, inv.params as unknown as RestoreMaterialParams);
    case '_restoreDataSource':
      return restoreDataSource(project, inv.params as unknown as RestoreDataSourceParams);
    case '_restoreMockScenario':
      return restoreMockScenario(project, inv.params as unknown as RestoreMockScenarioParams);
    default:
      return null; // 调用方走 dispatchOperation 处理常规 op
  }
}

// ===== 内部 handler =====

interface RestoreElementParams {
  parentId: string;
  position: number;
  node: ComponentNode;
}

function restoreElement(project: DesignProject, params: RestoreElementParams): Result {
  const newProject = deepClone(project);
  let parent: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    parent = findNodeById(screen.rootNode, params.parentId);
    if (parent) break;
  }
  if (!parent) {
    return {
      project,
      result: { success: false, description: 'Cannot restore element: parent not found', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  if (!parent.children) parent.children = [];
  parent.children.splice(params.position, 0, params.node);
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored element ${params.node.id}`,
      affectedNodeIds: [params.node.id, params.parentId],
    },
    inverse: { type: 'element.remove', params: { elementId: params.node.id } },
  };
}

interface RestoreStyleParams {
  nodeId: string;
  restoreStyles: Record<string, unknown>;
  removeKeys: string[];
  restoreScreenBackground?: { screenId: string; previousValue: string | undefined };
}

function restoreStyle(project: DesignProject, params: RestoreStyleParams): Result {
  const newProject = deepClone(project);
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }
  if (!node) {
    return {
      project,
      result: { success: false, description: 'Cannot restore styles: node not found', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const stylesRecord = node.styles as Record<string, unknown>;
  for (const key of params.removeKeys) delete stylesRecord[key];
  Object.assign(stylesRecord, params.restoreStyles);
  if (params.restoreScreenBackground) {
    const sc = newProject.screens.find((s) => s.id === params.restoreScreenBackground!.screenId);
    if (sc) {
      const prev = params.restoreScreenBackground.previousValue;
      if (prev === undefined) delete sc.backgroundColor;
      else sc.backgroundColor = prev;
    }
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored styles on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: { type: 'noop', params: {} },
  };
}

interface RestoreBatchStyleParams {
  entries: Array<{ nodeId: string; restoreStyles: Record<string, unknown>; removeKeys: string[] }>;
}

function restoreBatchStyle(project: DesignProject, params: RestoreBatchStyleParams): Result {
  const newProject = deepClone(project);
  const affectedNodeIds: string[] = [];
  for (const entry of params.entries) {
    let node: ComponentNode | undefined;
    for (const screen of newProject.screens) {
      node = findNodeById(screen.rootNode, entry.nodeId);
      if (node) break;
    }
    if (!node) {
      return {
        project,
        result: {
          success: false,
          description: `Cannot restore batch styles: node ${entry.nodeId} not found`,
          affectedNodeIds: [],
        },
        inverse: { type: 'noop', params: {} },
      };
    }
    const stylesRecord = node.styles as Record<string, unknown>;
    for (const key of entry.removeKeys) delete stylesRecord[key];
    Object.assign(stylesRecord, entry.restoreStyles);
    affectedNodeIds.push(entry.nodeId);
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored batch styles on ${affectedNodeIds.length} node(s)`,
      affectedNodeIds,
    },
    inverse: { type: 'noop', params: {} },
  };
}

interface RestoreVisualStateParams {
  nodeId: string;
  stateName: string;
  styles: VisualState['styles'];
  props?: Record<string, unknown>;
  transition?: VisualState['transition'];
  childrenStates?: Record<string, string>;
  childrenVisibility?: Record<string, boolean>;
  disabledEvents?: string[];
}

function restoreVisualState(project: DesignProject, params: RestoreVisualStateParams): Result {
  const newProject = deepClone(project);
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }
  if (!node) {
    return {
      project,
      result: { success: false, description: 'Cannot restore state: node not found', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const state = node.states?.find((s) => s.name === params.stateName);
  if (state) {
    state.styles = params.styles;
    state.props = params.props;
    if (params.transition !== undefined) state.transition = params.transition;
    else delete state.transition;
    if (params.childrenStates !== undefined) state.childrenStates = params.childrenStates;
    else delete state.childrenStates;
    if (params.childrenVisibility !== undefined) state.childrenVisibility = params.childrenVisibility;
    else delete state.childrenVisibility;
    if (params.disabledEvents !== undefined) state.disabledEvents = params.disabledEvents;
    else delete state.disabledEvents;
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored visual state "${params.stateName}" on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: { type: 'noop', params: {} },
  };
}

interface RemoveNavParams {
  nodeId: string;
  eventIndex: number;
  createdScreenId?: string;
}

function removeNavigationAndScreen(project: DesignProject, params: RemoveNavParams): Result {
  const newProject = deepClone(project);
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }
  if (node && node.events && params.eventIndex < node.events.length) {
    node.events.splice(params.eventIndex, 1);
  }
  if (params.createdScreenId) {
    const idx = newProject.screens.findIndex((s) => s.id === params.createdScreenId);
    if (idx !== -1) newProject.screens.splice(idx, 1);
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: 'Removed navigation and auto-created screen',
      affectedNodeIds: [params.nodeId],
    },
    inverse: { type: 'noop', params: {} },
  };
}

interface RestoreScreenParams {
  screen: DesignProject['screens'][number];
  position: number;
}

function restoreScreen(project: DesignProject, params: RestoreScreenParams): Result {
  const newProject = deepClone(project);
  newProject.screens.splice(params.position, 0, params.screen);
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored screen "${params.screen.name}"`,
      affectedNodeIds: [params.screen.id],
    },
    inverse: { type: 'screen.remove', params: { screenId: params.screen.id } },
  };
}

interface RemoveVPParams {
  viewport: DesignProject['viewportPresets'][number];
}

function removeViewportPreset(project: DesignProject, params: RemoveVPParams): Result {
  const newProject = deepClone(project);
  const idx = newProject.viewportPresets.findIndex(
    (v) =>
      v.name === params.viewport.name &&
      v.width === params.viewport.width &&
      v.height === params.viewport.height,
  );
  if (idx !== -1) newProject.viewportPresets.splice(idx, 1);
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed viewport preset "${params.viewport.name}"`,
      affectedNodeIds: [],
    },
    inverse: { type: 'viewport.addPreset', params: { viewport: params.viewport } },
  };
}

function removeTemplate(project: DesignProject, params: { templateId: string }): Result {
  const newProject = deepClone(project);
  const idx = newProject.componentAssets.findIndex((t) => t.id === params.templateId);
  if (idx !== -1) newProject.componentAssets.splice(idx, 1);
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed template ${params.templateId}`,
      affectedNodeIds: [],
    },
    inverse: { type: 'noop', params: {} },
  };
}

interface RestoreTemplateRefModeParams {
  nodeId: string;
  mode: 'reference' | 'detached';
}

function restoreTemplateRefMode(project: DesignProject, params: RestoreTemplateRefModeParams): Result {
  const newProject = deepClone(project);
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }
  if (node?.templateRef) node.templateRef.mode = params.mode;
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored template ref mode on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: { type: 'noop', params: {} },
  };
}

function restoreNode(project: DesignProject, params: { nodeId: string; node: ComponentNode }): Result {
  const newProject = deepClone(project);
  for (const screen of newProject.screens) {
    if (screen.rootNode.id === params.nodeId) {
      screen.rootNode = params.node;
      break;
    }
    const parentInfo = findParent(screen.rootNode, params.nodeId);
    if (parentInfo) {
      parentInfo.parent.children![parentInfo.index] = params.node;
      break;
    }
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: { type: 'noop', params: {} },
  };
}

interface RestoreDataSourceParams {
  screenId: string;
  dataSource: DataSource;
  position: number;
}

function restoreDataSource(project: DesignProject, params: RestoreDataSourceParams): Result {
  const newProject = deepClone(project);
  const screen = newProject.screens.find((s) => s.id === params.screenId);
  if (!screen) {
    return {
      project,
      result: {
        success: false,
        description: `Cannot restore data source: screen ${params.screenId} not found`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }
  if (!screen.dataSources) screen.dataSources = [];
  screen.dataSources.splice(params.position, 0, params.dataSource);
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored data source "${params.dataSource.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.remove',
      params: { screenId: params.screenId, dataSourceId: params.dataSource.id },
    },
  };
}

interface RestoreMockScenarioParams {
  screenId: string;
  dataSourceId: string;
  scenario: import('@globallink/design-schema').MockScenario;
  position: number;
  previousActiveScenarioId: string;
}

function restoreMockScenario(project: DesignProject, params: RestoreMockScenarioParams): Result {
  const newProject = deepClone(project);
  const screen = newProject.screens.find((s) => s.id === params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId);

  if (!screen || !ds || ds.type !== 'api' || !ds.mock) {
    return {
      project,
      result: {
        success: false,
        description: `Cannot restore mock scenario: data source not found`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  ds.mock.scenarios.splice(params.position, 0, params.scenario);
  ds.mock.activeScenarioId = params.previousActiveScenarioId;
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored mock scenario "${params.scenario.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.removeMockScenario',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        scenarioId: params.scenario.id,
      },
    },
  };
}

interface RestorePropDefParams {
  templateId: string;
  definition: import('@globallink/design-schema').ComponentPropDefinition;
  position: number;
}

function restorePropDefinition(project: DesignProject, params: RestorePropDefParams): Result {
  const newProject = deepClone(project);
  const template = newProject.componentAssets.find((t) => t.id === params.templateId);
  if (!template) {
    return {
      project,
      result: {
        success: false,
        description: `Cannot restore prop definition: template ${params.templateId} not found`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }
  template.propDefinitions.splice(params.position, 0, params.definition);
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored prop definition "${params.definition.key}"`,
      affectedNodeIds: [params.templateId],
    },
    inverse: {
      type: 'componentProps.removeDefinition',
      params: { templateId: params.templateId, propKey: params.definition.key },
    },
  };
}

interface RestoreDeletedTemplateParams {
  template: DesignProject['componentAssets'][number];
  position: number;
}

function restoreDeletedTemplate(project: DesignProject, params: RestoreDeletedTemplateParams): Result {
  const newProject = deepClone(project);
  newProject.componentAssets.splice(params.position, 0, params.template);
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored template "${params.template.name}"`,
      affectedNodeIds: [params.template.id],
    },
    inverse: { type: 'template.delete', params: { templateId: params.template.id } },
  };
}

interface RestoreChildVisibilityParams {
  parentNodeId: string;
  childNodeId: string;
  stateName: string;
  oldValue: boolean | undefined;
}

function restoreChildVisibility(project: DesignProject, params: RestoreChildVisibilityParams): Result {
  const newProject = deepClone(project);
  let parent: ComponentNode | undefined;
  for (const scr of newProject.screens) {
    parent = findNodeById(scr.rootNode, params.parentNodeId);
    if (parent) break;
  }
  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const state = (parent.states ?? []).find((s) => s.name === params.stateName);
  if (state) {
    if (params.oldValue === undefined) {
      if (state.childrenVisibility) {
        delete state.childrenVisibility[params.childNodeId];
        if (Object.keys(state.childrenVisibility).length === 0) {
          delete state.childrenVisibility;
        }
      }
    } else {
      if (!state.childrenVisibility) state.childrenVisibility = {};
      state.childrenVisibility[params.childNodeId] = params.oldValue;
    }
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored child visibility`,
      affectedNodeIds: [params.parentNodeId],
    },
    inverse: { type: 'noop', params: {} },
  };
}

interface RestoreMaterialParams {
  nodeId: string;
  restoreStyles: Record<string, unknown>;
  removeStyleKeys: string[];
  restoreClearedStyles?: Record<string, unknown>;
  restoreProps: Record<string, unknown>;
  removePropKeys: string[];
  restoreMaterialProjectId: string | undefined;
  hadMaterialProjectId: boolean;
}

function restoreMaterialDesign(project: DesignProject, params: RestoreMaterialParams): Result {
  const newProject = deepClone(project);
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }
  if (!node) {
    return {
      project,
      result: { success: false, description: 'Cannot restore material design: node not found', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const stylesRecord = node.styles as Record<string, unknown>;
  for (const key of params.removeStyleKeys) delete stylesRecord[key];
  Object.assign(stylesRecord, params.restoreStyles);
  if (params.restoreClearedStyles && Object.keys(params.restoreClearedStyles).length > 0) {
    Object.assign(stylesRecord, params.restoreClearedStyles);
  }
  for (const key of params.removePropKeys) delete node.props[key];
  Object.assign(node.props, params.restoreProps);
  if (params.hadMaterialProjectId) {
    if (params.restoreMaterialProjectId !== undefined) {
      node.materialProjectId = params.restoreMaterialProjectId;
    } else {
      delete node.materialProjectId;
    }
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored material design on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: { type: 'noop', params: {} },
  };
}
