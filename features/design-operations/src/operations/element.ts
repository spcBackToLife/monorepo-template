import type {
  DesignProject,
  ComponentNode,
  CSSProperties,
  ExpressionStyles,
  PrimitiveNodeType,
  Expression,
  RepeatBinding,
} from '@globallink/design-schema';
import {
  deepClone,
  getDefaultStyles,
  isPrimitiveType,
  normalizeExpression,
  countSubtreeNodes,
} from '@globallink/design-schema';
import {
  lintExpressionField,
  walkExpressionsInNode,
} from '@globallink/design-expression';
import { findLintErrors, buildLintFailResult, attachLintWarnings } from '../utils/lint-guard';
import {
  lintComponentNodeFieldRelations,
  attachSchemaLintWarnings,
} from '../utils/component-node-lint';
import type {
  ElementAddOp,
  ElementRemoveOp,
  ElementMoveOp,
  ElementDuplicateOp,
  ElementInsertSubtreeOp,
  ElementRenameOp,
  ElementWrapOp,
  ElementUnwrapOp,
  ElementReorderOp,
  ElementChangeTypeOp,
  ElementSetLockedOp,
  ElementSetRoleOp,
  ElementSetVisibleOp,
  ElementSetVisibleWhenOp,
  ElementSetRepeatOp,
  ElementSetBindOp,
  OperationResult,
  InverseData,
  LayoutHint,
} from '../types';
import { findNodeById, findParent, isNodeOrAncestorLocked, walkTree } from '../utils/tree';
import { assertPregeneratedId, assertPregeneratedIdArray } from '../utils/assert-id';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

/**
 * Intelligently infer default styles based on tag type, parent layout, and layout hint
 * 
 * Layout hints:
 * - 'scroll-child': child in scrollable container → flex: 1 or height: auto
 * - 'auto-size': size based on content → no flex defaults
 * - 'fixed-height': fixed height, full width → height auto, width: 100%
 * - 'fill-parent': fill available space → flex: 1
 * - 'sticky-header': sticky positioned header → position: sticky, height: auto
 * - 'sticky-footer': sticky positioned footer → position: sticky, height: auto
 */
function inferPracticalDefaults(
  tag: PrimitiveNodeType,
  parentStyles?: CSSProperties | ExpressionStyles,
  layoutHint?: LayoutHint,
): CSSProperties {
  // Apply layout hint if provided
  if (layoutHint) {
    switch (layoutHint) {
      case 'scroll-child':
        // Child in scrollable container: use flex: 1 if parent is flex
        return parentStyles?.display === 'flex' ? { flex: 1, flexShrink: 0 } : {};
      
      case 'auto-size':
        // Size based on content: no sizing defaults
        return {};
      
      case 'fixed-height':
        // Fixed height, full width
        return { width: '100%', height: 'auto' };
      
      case 'fill-parent':
        // Fill available space
        return { flex: 1 };
      
      case 'sticky-header':
        // Sticky positioned header
        return {
          position: 'sticky',
          top: 0,
          height: 'auto',
          width: '100%',
          zIndex: 10,
        };
      
      case 'sticky-footer':
        // Sticky positioned footer
        return {
          position: 'sticky',
          bottom: 0,
          height: 'auto',
          width: '100%',
          zIndex: 10,
        };
    }
  }

  // Get parent display type
  const parentDisplay = parentStyles?.display as string | undefined;

  // Interactive elements and text elements get no sizing defaults
  // They rely on their content and registry defaults
  if (
    tag === 'button' ||
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    tag === 'p' ||
    tag === 'h1' ||
    tag === 'h2' ||
    tag === 'h3' ||
    tag === 'span' ||
    tag === 'a'
  ) {
    return {};
  }

  // For layout containers in flex parent: add flex: 1 to fill available space
  // This provides better layout behavior without hardcoded dimensions
  if (parentDisplay === 'flex') {
    if (
      tag === 'div' ||
      tag === 'section' ||
      tag === 'main' ||
      tag === 'header' ||
      tag === 'footer' ||
      tag === 'nav'
    ) {
      return { flex: 1 };
    }
  }

  // No arbitrary sizing defaults for other cases
  return {};
}

/**
 * Create a new ComponentNode with defaults.
 *
 * ⚠️ 严格契约（Schema-First v2.3 ★）：
 *   `id` 参数 **必填**。所有调用方必须显式传入由 `ensureDeterministicIds`
 *   预生成的 ID（写路径前置中间件）。
 *
 *   ❌ 禁止在本函数内部 fallback 到 `generateNodeId()` —— 任何随机 id 源都
 *      会导致 op 重放时产生新 id（findOne 每次重放快照之后的 ops），破坏
 *      "id 创建一次永不变" 不变量。
 *
 *   ✅ id 生成的唯一合法位置：`apps/design-api/src/operations/operations.service.ts`
 *      的 `ensureDeterministicIds` 函数（写路径中间件，op 入 DB 前 / 执行前调用一次）。
 *
 * 详见 design_docs/03-tech/editor/component-instance-id-stability.md。
 */
function createNode(
  tag: PrimitiveNodeType,
  styles: ExpressionStyles | CSSProperties | undefined,
  props: Record<string, unknown> | undefined,
  /** 节点 ID（必填）—— 由 ensureDeterministicIds 在写路径预生成 */
  id: string,
  parent?: ComponentNode,
  layoutHint?: LayoutHint,
): ComponentNode {
  const defaultStyles = isPrimitiveType(tag) ? getDefaultStyles(tag) : {};
  const practicalDefaults = inferPracticalDefaults(tag, parent?.styles, layoutHint);

  // User-provided styles always take priority over defaults.
  // Remove defaults that semantically conflict with user intent.
  const userStyles = (styles ?? {}) as Record<string, unknown>;
  const mergedDefaults = { ...defaultStyles, ...practicalDefaults };

  if (userStyles.height !== undefined || userStyles.minHeight !== undefined) {
    delete mergedDefaults.minHeight;
  }
  if (userStyles.width !== undefined || userStyles.minWidth !== undefined) {
    delete mergedDefaults.minWidth;
  }
  if (userStyles.position === 'absolute' || userStyles.position === 'fixed') {
    delete mergedDefaults.flex;
    delete mergedDefaults.minHeight;
    delete mergedDefaults.minWidth;
  }
  if (userStyles.flex !== undefined) {
    delete mergedDefaults.flex;
  }

  // Text-only nodes (textContent set, no children containers expected) should not get
  // flex:1 default — they are leaf display elements, not layout containers.
  const hasTextContent = props?.textContent !== undefined || props?.children !== undefined;
  const isLeafTextNode = hasTextContent && tag === 'div' && !layoutHint;
  if (isLeafTextNode) {
    delete mergedDefaults.flex;
  }

  return {
    id,
    type: tag as ComponentNode['type'],
    styles: { ...mergedDefaults, ...userStyles } as ExpressionStyles,
    children: [],
    props: props ?? {},
    states: [],
    activeState: 'default',
    events: [],
    locked: false,
    visible: true,
  };
}



/** Find the screen index containing a given nodeId */
function findScreenContaining(project: DesignProject, nodeId: string): number {
  for (let i = 0; i < project.screens.length; i++) {
    if (findNodeById(project.screens[i].rootNode, nodeId)) {
      return i;
    }
  }
  return -1;
}

function findNodeAcrossScreens(project: DesignProject, nodeId: string): ComponentNode | undefined {
  for (const screen of project.screens) {
    const found = findNodeById(screen.rootNode, nodeId);
    if (found) return found;
  }
  return undefined;
}

/**
 * 递归保证整棵子树的 label 都已设置。
 * priority: label > name > type（与 schema 契约一致）。
 *
 * MCP 层 insert_subtree 已在入口强制 label 必填；这里是兜底——
 * 来自 asset.instantiate / element.duplicate / 旧版客户端的子树仍可能缺 label。
 */
function ensureSubtreeLabels(node: ComponentNode): void {
  const trimmed = node.label?.trim();
  node.label = trimmed && trimmed.length > 0 ? trimmed : (node.name || node.type);
  if (node.children) {
    for (const child of node.children) ensureSubtreeLabels(child);
  }
  if (node.repeat?.template) {
    ensureSubtreeLabels(node.repeat.template);
  }
}

// ===== element.add =====

export function executeAddElement(project: DesignProject, params: ElementAddOp['params']): Result {
  // ID 严格契约：必须由 ensureDeterministicIds 预生成
  assertPregeneratedId(params.elementId, 'element.add', 'elementId');

  const newProject = deepClone(project);
  const screenIdx = findScreenContaining(newProject, params.parentId);
  if (screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const parent = findNodeById(newProject.screens[screenIdx].rootNode, params.parentId);
  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!parent.children) parent.children = [];

  if (params.elementId) {
    for (const s of newProject.screens) {
      if (findNodeById(s.rootNode, params.elementId)) {
        return {
          project,
          result: {
            success: false,
            description: `Node id ${params.elementId} already exists`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} },
        };
      }
    }
  }

  const newNode = createNode(params.tag, params.styles, params.props, params.elementId, parent, params.layoutHint);
  if (params.name) {
    newNode.name = params.name;
  }
  // label 是 UI 显示名（priority: label > name > type）。
  // MCP 层已在入口强制必填；若上游（程序化调用 / 旧客户端）未传，回退到 name 兜底。
  newNode.label = params.label?.trim() || newNode.name || newNode.type;
  if (params.componentBoundary) {
    newNode.componentBoundary = true;
  }
  const position = params.position ?? parent.children.length;
  parent.children.splice(position, 0, newNode);

  // ★ EXPR-C: lint 门禁 —— styles / props 中的字面量-或-表达式字段
  const refs = walkExpressionsInNode(newNode, { basePath: 'newNode' });
  const errs = findLintErrors(refs);
  if (errs) {
    const fail = buildLintFailResult(errs, [], 'element.add');
    return { project, result: fail.result, inverse: fail.inverse };
  }

  // ★ F3: schema 字段关系 lint（textContent vs children 互斥 / bind × change 双写）
  const schemaRefs = lintComponentNodeFieldRelations(newNode, 'newNode');

  newProject.updatedAt = new Date().toISOString();

  // 合并 expression lint warnings + schema field lint warnings
  let resultBase: OperationResult = {
    success: true,
    description: `Added ${params.tag} element to ${params.parentId}`,
    affectedNodeIds: [newNode.id, params.parentId],
  };
  resultBase = attachLintWarnings(resultBase, refs);
  resultBase = attachSchemaLintWarnings(resultBase, schemaRefs);

  return {
    project: newProject,
    result: resultBase,
    inverse: {
      type: 'element.remove',
      params: { elementId: newNode.id },
    },
  };
}

// ===== element.remove =====

export function executeRemoveElement(project: DesignProject, params: ElementRemoveOp['params']): Result {
  const newProject = deepClone(project);

  let parentInfo: { parent: ComponentNode; index: number } | undefined;
  let screenIdx = -1;

  for (let i = 0; i < newProject.screens.length; i++) {
    const root = newProject.screens[i].rootNode;
    if (root.id === params.elementId) {
      return {
        project,
        result: { success: false, description: 'Cannot remove root node of a screen', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
    const result = findParent(root, params.elementId);
    if (result) {
      parentInfo = result;
      screenIdx = i;
      break;
    }
  }

  if (!parentInfo || screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Element ${params.elementId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const removedNode = deepClone(parentInfo.parent.children![parentInfo.index]);
  parentInfo.parent.children!.splice(parentInfo.index, 1);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed element ${params.elementId}`,
      affectedNodeIds: [params.elementId, parentInfo.parent.id],
    },
    inverse: {
      type: '_restoreElement',
      params: {
        parentId: parentInfo.parent.id,
        position: parentInfo.index,
        node: removedNode,
      },
    },
  };
}

// ===== element.move =====

export function executeMoveElement(project: DesignProject, params: ElementMoveOp['params']): Result {
  const newProject = deepClone(project);

  let oldParentInfo: { parent: ComponentNode; index: number } | undefined;
  for (const screen of newProject.screens) {
    const result = findParent(screen.rootNode, params.elementId);
    if (result) {
      oldParentInfo = result;
      break;
    }
  }

  if (!oldParentInfo) {
    return {
      project,
      result: { success: false, description: `Element ${params.elementId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  let moveScreenRoot: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    if (findNodeById(screen.rootNode, params.elementId)) {
      moveScreenRoot = screen.rootNode;
      break;
    }
  }
  if (moveScreenRoot && isNodeOrAncestorLocked(moveScreenRoot, params.elementId)) {
    return {
      project,
      result: { success: false, description: '无法移动已锁定（或祖先已锁定）的节点', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  if (moveScreenRoot && isNodeOrAncestorLocked(moveScreenRoot, params.newParentId)) {
    return {
      project,
      result: { success: false, description: '无法移动到已锁定子树内', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [movedNode] = oldParentInfo.parent.children!.splice(oldParentInfo.index, 1);

  let newParent: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    newParent = findNodeById(screen.rootNode, params.newParentId);
    if (newParent) break;
  }

  if (!newParent) {
    return {
      project,
      result: { success: false, description: `New parent ${params.newParentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!newParent.children) newParent.children = [];

  const position = params.position ?? newParent.children.length;
  newParent.children.splice(position, 0, movedNode);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Moved element ${params.elementId} to ${params.newParentId}`,
      affectedNodeIds: [params.elementId, oldParentInfo.parent.id, params.newParentId],
    },
    inverse: {
      type: 'element.move',
      params: {
        elementId: params.elementId,
        newParentId: oldParentInfo.parent.id,
        position: oldParentInfo.index,
      },
    },
  };
}

// ===== element.insertSubtree =====

export function executeInsertSubtree(project: DesignProject, params: ElementInsertSubtreeOp['params']): Result {
  const newProject = deepClone(project);
  const screenIdx = findScreenContaining(newProject, params.parentId);
  if (screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const parent = findNodeById(newProject.screens[screenIdx].rootNode, params.parentId);
  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!parent.children) parent.children = [];

  const cloned = deepClone(params.subtree);

  // ID 严格契约：subtree 中所有节点 ID 必须由 ensureDeterministicIds 预生成
  // （ensureDeterministicIds case 'element.insertSubtree' 会 walkTree 给缺失节点补 id）
  walkTree(cloned, (n) => {
    assertPregeneratedId(n.id, 'element.insertSubtree', `subtree.<${n.name ?? n.type}>.id`);
  });

  // 递归补全 label（priority: label > name > type）。
  // MCP 层 insert_subtree 已在入口校验整棵子树 label 必填；这里是程序化调用的兜底。
  ensureSubtreeLabels(cloned);
  const position = params.position ?? parent.children.length;
  const safePos = Math.max(0, Math.min(position, parent.children.length));
  parent.children.splice(safePos, 0, cloned);

  // ★ EXPR-C: lint 门禁 —— 整棵子树（含 events / visibleWhen / repeat / styles / props）
  const refs = walkExpressionsInNode(cloned, { basePath: 'subtree' });
  const errs = findLintErrors(refs);
  if (errs) {
    const fail = buildLintFailResult(errs, [], 'element.insertSubtree');
    return { project, result: fail.result, inverse: fail.inverse };
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: attachLintWarnings(
      {
        success: true,
        description: 'Inserted subtree',
        affectedNodeIds: [cloned.id, params.parentId],
      },
      refs,
    ),
    inverse: {
      type: 'element.remove',
      params: { elementId: cloned.id },
    },
  };
}

// ===== element.duplicate =====

export function executeDuplicateElement(project: DesignProject, params: ElementDuplicateOp['params']): Result {
  // ID 严格契约：root + 所有子节点 ID 必须由 ensureDeterministicIds 预生成
  assertPregeneratedId(params.newElementId, 'element.duplicate', 'newElementId');

  const newProject = deepClone(project);

  let parentInfo: { parent: ComponentNode; index: number } | undefined;
  for (const screen of newProject.screens) {
    const result = findParent(screen.rootNode, params.elementId);
    if (result) {
      parentInfo = result;
      break;
    }
  }

  if (!parentInfo) {
    return {
      project,
      result: { success: false, description: `Element ${params.elementId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const originalNode = parentInfo.parent.children![parentInfo.index];
  const cloned = deepClone(originalNode);

  // 计算子节点（不含 root）总数，用于 assert _childIds 长度
  const subtreeTotal = countSubtreeNodes(cloned);
  const childCount = Math.max(0, subtreeTotal - 1);
  assertPregeneratedIdArray(params._childIds, childCount, 'element.duplicate', '_childIds');

  const rootId = params.newElementId;
  const childIds = params._childIds;
  let cursor = 0;
  let isFirst = true;
  walkTree(cloned, (n) => {
    if (isFirst) {
      n.id = rootId;
      isFirst = false;
      return;
    }
    n.id = childIds[cursor]!;
    cursor += 1;
  });

  parentInfo.parent.children!.splice(parentInfo.index + 1, 0, cloned);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Duplicated element ${params.elementId}`,
      affectedNodeIds: [params.elementId, cloned.id, parentInfo.parent.id],
    },
    inverse: {
      type: 'element.remove',
      params: { elementId: cloned.id },
    },
  };
}

// ===== element.rename =====

export function executeRenameNode(project: DesignProject, params: ElementRenameOp['params']): Result {
  const newProject = deepClone(project);

  const node = findNodeAcrossScreens(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldName = node.name ?? '';
  const oldLabel = node.label ?? '';

  // Support both name and label fields
  if (params.name !== undefined) {
    const nextName = params.name.trim();
    node.name = nextName.length > 0 ? nextName : undefined;
  }
  if (params.label !== undefined) {
    const nextLabel = params.label.trim();
    node.label = nextLabel.length > 0 ? nextLabel : undefined;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Renamed node ${params.nodeId} to "${node.label ?? node.name ?? '未命名'}"`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.rename',
      params: { nodeId: params.nodeId, name: oldName, label: oldLabel },
    },
  };
}

// ===== element.wrap =====

export function executeWrapInContainer(project: DesignProject, params: ElementWrapOp['params']): Result {
  // ID 严格契约：新容器 ID 必须由 ensureDeterministicIds 预生成
  assertPregeneratedId(params._wrapperId, 'element.wrap', '_wrapperId');

  if (params.nodeIds.length === 0) {
    return {
      project,
      result: { success: false, description: 'No node IDs provided', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);

  const screenIdx = findScreenContaining(newProject, params.nodeIds[0]);
  if (screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeIds[0]} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const root = newProject.screens[screenIdx].rootNode;
  const firstParentInfo = findParent(root, params.nodeIds[0]);
  if (!firstParentInfo) {
    return {
      project,
      result: { success: false, description: `Parent of node ${params.nodeIds[0]} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const parent = firstParentInfo.parent;

  for (const nodeId of params.nodeIds) {
    const info = findParent(root, nodeId);
    if (!info || info.parent.id !== parent.id) {
      return {
        project,
        result: { success: false, description: `All nodes must share the same parent. Node ${nodeId} has a different parent.`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
  }

  const indices: number[] = [];
  for (const nodeId of params.nodeIds) {
    const idx = parent.children!.findIndex((c) => c.id === nodeId);
    if (idx === -1) {
      return {
        project,
        result: { success: false, description: `Node ${nodeId} not found in parent's children`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
    indices.push(idx);
  }
  indices.sort((a, b) => a - b);

  const containerTag = params.containerTag ?? 'div';
  const container = createNode(containerTag, params.containerStyles, undefined, params._wrapperId, parent);

  const nodesToWrap: ComponentNode[] = [];
  for (let i = indices.length - 1; i >= 0; i--) {
    const [removed] = parent.children!.splice(indices[i], 1);
    nodesToWrap.unshift(removed);
  }

  container.children = nodesToWrap;
  parent.children!.splice(indices[0], 0, container);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Wrapped ${params.nodeIds.length} element(s) in a ${containerTag} container`,
      affectedNodeIds: [container.id, parent.id, ...params.nodeIds],
    },
    inverse: {
      type: 'element.unwrap',
      params: { containerId: container.id },
    },
  };
}

// ===== element.unwrap =====

export function executeUnwrapContainer(project: DesignProject, params: ElementUnwrapOp['params']): Result {
  const newProject = deepClone(project);

  let parentInfo: { parent: ComponentNode; index: number } | undefined;
  let screenIdx = -1;

  for (let i = 0; i < newProject.screens.length; i++) {
    const root = newProject.screens[i].rootNode;
    if (root.id === params.containerId) {
      return {
        project,
        result: { success: false, description: 'Cannot unwrap root node of a screen', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
    const result = findParent(root, params.containerId);
    if (result) {
      parentInfo = result;
      screenIdx = i;
      break;
    }
  }

  if (!parentInfo || screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Container ${params.containerId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const container = parentInfo.parent.children![parentInfo.index];
  const children = container.children ?? [];
  const childIds = children.map((c) => c.id);
  const containerStyles = deepClone(container.styles) as Partial<CSSProperties>;
  const containerTag = container.type;

  parentInfo.parent.children!.splice(parentInfo.index, 1, ...children);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Unwrapped container ${params.containerId}, releasing ${children.length} child(ren)`,
      affectedNodeIds: [params.containerId, parentInfo.parent.id, ...childIds],
    },
    inverse: {
      type: 'element.wrap',
      params: {
        nodeIds: childIds,
        containerTag,
        containerStyles,
      },
    },
  };
}

// ===== element.reorder =====

export function executeReorderElement(project: DesignProject, params: ElementReorderOp['params']): Result {
  const newProject = deepClone(project);

  let parent: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    parent = findNodeById(screen.rootNode, params.parentId);
    if (parent) break;
  }

  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!parent.children) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} has no children`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const currentIndex = parent.children.findIndex((c) => c.id === params.nodeId);
  if (currentIndex === -1) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found in parent ${params.parentId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  let reorderScreenRoot: ComponentNode | undefined;
  for (const s of newProject.screens) {
    if (findNodeById(s.rootNode, params.parentId)) {
      reorderScreenRoot = s.rootNode;
      break;
    }
  }
  if (reorderScreenRoot && isNodeOrAncestorLocked(reorderScreenRoot, params.nodeId)) {
    return {
      project,
      result: { success: false, description: '无法重排已锁定（或祖先已锁定）的节点', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [node] = parent.children.splice(currentIndex, 1);
  const clampedIndex = Math.min(params.newIndex, parent.children.length);
  parent.children.splice(clampedIndex, 0, node);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Reordered element ${params.nodeId} from index ${currentIndex} to ${clampedIndex}`,
      affectedNodeIds: [params.nodeId, params.parentId],
    },
    inverse: {
      type: 'element.reorder',
      params: {
        nodeId: params.nodeId,
        parentId: params.parentId,
        newIndex: currentIndex,
      },
    },
  };
}

// ===== element.changeType =====

export function executeChangeElementType(project: DesignProject, params: ElementChangeTypeOp['params']): Result {
  const newProject = deepClone(project);

  const node = findNodeAcrossScreens(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldType = node.type as PrimitiveNodeType;
  node.type = params.newType as ComponentNode['type'];

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Changed element ${params.nodeId} type from ${oldType} to ${params.newType}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.changeType',
      params: { nodeId: params.nodeId, newType: oldType },
    },
  };
}

// ===== element.setLocked / element.setVisible / element.setRole =====

export function executeSetNodeLocked(project: DesignProject, params: ElementSetLockedOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous = node.locked;
  node.locked = params.locked;
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Set locked=${params.locked} on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setLocked',
      params: { nodeId: params.nodeId, locked: previous },
    },
  };
}

export function executeSetNodeRole(project: DesignProject, params: ElementSetRoleOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous = node.editorMetadata?.role ?? null;
  if (params.role === null) {
    if (node.editorMetadata) {
      delete node.editorMetadata.role;
      if (Object.keys(node.editorMetadata).length === 0) {
        delete node.editorMetadata;
      }
    }
  } else {
    if (!node.editorMetadata) node.editorMetadata = {};
    node.editorMetadata.role = params.role;
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Set editorMetadata.role=${params.role ?? 'null'} on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setRole',
      params: { nodeId: params.nodeId, role: previous },
    },
  };
}

export function executeSetNodeVisible(project: DesignProject, params: ElementSetVisibleOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous = node.visible;
  node.visible = params.visible;
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Set visible=${params.visible} on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setVisible',
      params: { nodeId: params.nodeId, visible: previous },
    },
  };
}

// ===== element.setVisibleWhen / setRepeat / setBind（v2 新增） =====

export function executeSetNodeVisibleWhen(project: DesignProject, params: ElementSetVisibleWhenOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous: Expression<boolean> | string | null = node.visibleWhen ?? null;
  if (params.visibleWhen === null || params.visibleWhen === '') {
    delete node.visibleWhen;
  } else {
    // 强 Expression 字段：裸字符串自动补 `{{ }}`，避免引擎把它当字面量
    node.visibleWhen = normalizeExpression(params.visibleWhen) as Expression<boolean>;

    // ★ EXPR-C: lint 门禁
    const r = lintExpressionField(node.visibleWhen, 'required');
    if (!r.ok) {
      const errs = r.issues.filter((i) => i.level === 'error');
      if (errs.length) {
        const sample = errs[0]?.message ?? 'lint error';
        return {
          project,
          result: {
            success: false,
            description: `element.setVisibleWhen: expression lint failed — ${sample}`,
            affectedNodeIds: [],
            issues: [
              {
                nodeId: params.nodeId,
                fieldPath: 'visibleWhen',
                rawValue: String(params.visibleWhen).slice(0, 60),
                issues: errs.map((i) => ({
                  code: i.code,
                  level: i.level,
                  message: i.message,
                  ...(i.specRef ? { specRef: i.specRef } : {}),
                  ...(i.hint ? { hint: i.hint } : {}),
                  ...(i.suggestedFix ? { suggestedFix: i.suggestedFix } : {}),
                })),
              },
            ],
          },
          inverse: { type: 'noop', params: {} },
        };
      }
    }
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated visibleWhen on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setVisibleWhen',
      params: { nodeId: params.nodeId, visibleWhen: previous },
    },
  };
}

export function executeSetNodeRepeat(project: DesignProject, params: ElementSetRepeatOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous: RepeatBinding | null = node.repeat ? deepClone(node.repeat) : null;

  // 兼容读入：历史 op 记录 / 旧客户端可能仍然把 params.repeat 传成字符串（v2.0 形态）。
  // 这里一次性归一化成联合类型的 { expression } 便利形式，复用下方 "只传 expression" 分支。
  // 【一次性迁移窗口】迁移完所有历史记录后请删除此分支（AGENTS.md §9.2）。
  let normalizedRepeat: ElementSetRepeatOp['params']['repeat'];
  if (typeof params.repeat === 'string') {
    const s = (params.repeat as string).trim();
    normalizedRepeat = s === '' ? null : { expression: s };
  } else {
    normalizedRepeat = params.repeat;
  }

  if (normalizedRepeat === null) {
    delete node.repeat;
  } else if ('template' in normalizedRepeat && normalizedRepeat.template) {
    // 完整 RepeatBinding：直接设置；表达式裸字符串补 {{ }}
    const expr = normalizeExpression(normalizedRepeat.expression as string) as Expression<unknown[]>;
    node.repeat = {
      expression: expr,
      template: deepClone(normalizedRepeat.template),
    };
  } else {
    // 只传 expression：
    //   - 节点已有 repeat → 只替换表达式，保留原 template
    //   - 节点没有 repeat → 用 children[0] 作为 template（并从 children 中移出），对齐"把此节点变成列表"的意图
    const expr = normalizeExpression(
      (normalizedRepeat as { expression: string }).expression,
    ) as Expression<unknown[]>;
    if (node.repeat) {
      node.repeat = { expression: expr, template: node.repeat.template };
    } else {
      const firstChild = node.children?.[0];
      if (!firstChild) {
        return {
          project,
          result: {
            success: false,
            description:
              `Cannot bind repeat on ${params.nodeId}: node has no children to use as template. ` +
              `Pass { expression, template } explicitly.`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} },
        };
      }
      const template = deepClone(firstChild);
      node.children = (node.children ?? []).slice(1);
      node.repeat = { expression: expr, template };
    }
  }

  // ★ EXPR-C: lint 门禁（repeat.expression + template 子树）
  if (node.repeat) {
    const exprResult = lintExpressionField(node.repeat.expression, 'required');
    const treeRefs = walkExpressionsInNode(node.repeat.template, { basePath: 'repeat.template' });
    const errs = [
      ...exprResult.issues
        .filter((i) => i.level === 'error')
        .map((i) => ({
          nodeId: params.nodeId,
          fieldPath: 'repeat.expression',
          rawValue: String(node.repeat!.expression).slice(0, 60),
          issues: [i],
        })),
      ...(findLintErrors(treeRefs) ?? []),
    ];
    if (errs.length) {
      return {
        project,
        result: {
          success: false,
          description: `element.setRepeat: expression lint failed (${errs.length} issue(s))`,
          affectedNodeIds: [],
          issues: errs.map((r) => ({
            ...(r.nodeId !== undefined ? { nodeId: r.nodeId } : {}),
            ...('screenId' in r && r.screenId !== undefined ? { screenId: r.screenId } : {}),
            fieldPath: r.fieldPath,
            rawValue: r.rawValue,
            issues: r.issues.map((i) => ({
              code: i.code,
              level: i.level,
              message: i.message,
              ...(i.specRef ? { specRef: i.specRef } : {}),
              ...(i.hint ? { hint: i.hint } : {}),
              ...(i.suggestedFix ? { suggestedFix: i.suggestedFix } : {}),
            })),
          })),
        },
        inverse: { type: 'noop', params: {} },
      };
    }
  }

  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated repeat on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setRepeat',
      params: { nodeId: params.nodeId, repeat: previous },
    },
  };
}

export function executeSetNodeBind(project: DesignProject, params: ElementSetBindOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous: { path: string } | null = node.bind ? { ...node.bind } : null;
  if (params.bind === null) {
    delete node.bind;
  } else {
    node.bind = { ...params.bind };
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated bind on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setBind',
      params: { nodeId: params.nodeId, bind: previous },
    },
  };
}
