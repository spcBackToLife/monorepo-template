import type {
  CSSProperties,
  ComponentNode,
  ComponentState,
  ComponentEvent,
  Viewport,
  PrimitiveNodeType,
  TemplateScope,
  PropBinding,
} from '@globallink/design-schema';

// ===== Operation Result =====

/** Result returned after executing an operation */
export interface OperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Human-readable description of what was done */
  description: string;
  /** IDs of nodes affected by this operation */
  affectedNodeIds: string[];
}

// ===== Inverse Info =====

/** Stored alongside an operation to enable undo */
export interface InverseData {
  /** The operation type to execute for undo */
  type: string;
  /** The params for the inverse operation */
  params: Record<string, unknown>;
}

// ===== Operation Definitions =====

// -- Element Operations --

export interface AddElementOp {
  type: 'addElement';
  params: {
    parentId: string;
    tag: PrimitiveNodeType;
    /** 若指定，新建节点使用该 id（客户端与 batch 重放必须一致）；省略则每次随机生成 */
    elementId?: string;
    styles?: CSSProperties;
    props?: Record<string, unknown>;
    position?: number;
  };
}

export interface RemoveElementOp {
  type: 'removeElement';
  params: {
    elementId: string;
  };
}

export interface MoveElementOp {
  type: 'moveElement';
  params: {
    elementId: string;
    newParentId: string;
    position?: number;
  };
}

export interface DuplicateElementOp {
  type: 'duplicateElement';
  params: {
    elementId: string;
  };
}

/** 插入序列化的子树（粘贴）；所有节点 id 会重新生成 */
export interface InsertSubtreeOp {
  type: 'insertSubtree';
  params: {
    parentId: string;
    /** 完整 ComponentNode 子树（来自复制/剪贴板） */
    subtree: ComponentNode;
    position?: number;
  };
}

export interface RenameNodeOp {
  type: 'renameNode';
  params: {
    nodeId: string;
    name: string;
  };
}

// -- Style Operations --

export interface UpdateStyleOp {
  type: 'updateStyle';
  params: {
    nodeId: string;
    styles: Partial<CSSProperties>;
  };
}

export interface ResetStyleOp {
  type: 'resetStyle';
  params: {
    nodeId: string;
    properties: string[];
  };
}

// -- State Operations --

export interface AddStateOp {
  type: 'addState';
  params: {
    nodeId: string;
    stateName: string;
    styles?: Partial<CSSProperties>;
    props?: Record<string, unknown>;
    transition?: ComponentState['transition'];
  };
}

export interface RemoveStateOp {
  type: 'removeState';
  params: {
    nodeId: string;
    stateName: string;
  };
}

export interface UpdateStateOp {
  type: 'updateState';
  params: {
    nodeId: string;
    stateName: string;
    styles: Partial<CSSProperties>;
    props?: Record<string, unknown>;
    transition?: ComponentState['transition'];
  };
}

export interface SetActiveStateOp {
  type: 'setActiveState';
  params: {
    nodeId: string;
    stateName: string;
  };
}

// -- Event Operations --

export interface AddEventOp {
  type: 'addEvent';
  params: {
    nodeId: string;
    event: ComponentEvent;
  };
}

export interface RemoveEventOp {
  type: 'removeEvent';
  params: {
    nodeId: string;
    eventIndex: number;
  };
}

export interface UpdateEventOp {
  type: 'updateEvent';
  params: {
    nodeId: string;
    eventIndex: number;
    event: Partial<ComponentEvent>;
  };
}

export interface AddNavigationOp {
  type: 'addNavigation';
  params: {
    nodeId: string;
    trigger: string;
    targetScreenId: string;
  };
}

// -- Screen Operations --

export interface AddScreenOp {
  type: 'addScreen';
  params: {
    name: string;
  };
}

export interface RemoveScreenOp {
  type: 'removeScreen';
  params: {
    screenId: string;
  };
}

export interface SetActiveScreenOp {
  type: 'setActiveScreen';
  params: {
    screenId: string;
  };
}

export interface RenameScreenOp {
  type: 'renameScreen';
  params: {
    screenId: string;
    name: string;
  };
}

// -- Viewport Operations --

export interface SwitchViewportOp {
  type: 'switchViewport';
  params: {
    viewport: Viewport;
  };
}

export interface AddViewportPresetOp {
  type: 'addViewportPreset';
  params: {
    viewport: Viewport;
  };
}

// -- Asset Operations --

export interface InstantiateTemplateOp {
  type: 'instantiateTemplate';
  params: {
    templateId: string;
    parentId: string;
    position?: number;
    mode?: 'reference' | 'detached';
  };
}

export interface SaveAsTemplateOp {
  type: 'saveAsTemplate';
  params: {
    nodeId: string;
    name: string;
    category: string;
    tags?: string[];
    description?: string;
    scope?: TemplateScope;
  };
}

export interface DetachInstanceOp {
  type: 'detachInstance';
  params: {
    nodeId: string;
  };
}

export interface SyncInstanceOp {
  type: 'syncInstance';
  params: {
    nodeId: string;
  };
}

// -- Element Operations (new) --

export interface WrapInContainerOp {
  type: 'wrapInContainer';
  params: {
    nodeIds: string[];
    containerTag?: PrimitiveNodeType;
    containerStyles?: Partial<CSSProperties>;
  };
}

export interface UnwrapContainerOp {
  type: 'unwrapContainer';
  params: {
    containerId: string;
  };
}

export interface ReorderElementOp {
  type: 'reorderElement';
  params: {
    nodeId: string;
    parentId: string;
    newIndex: number;
  };
}

export interface BatchUpdateStyleOp {
  type: 'batchUpdateStyle';
  params: {
    updates: Array<{ nodeId: string; styles: Partial<CSSProperties> }>;
  };
}

export interface ChangeElementTypeOp {
  type: 'changeElementType';
  params: {
    nodeId: string;
    newType: PrimitiveNodeType;
  };
}

/** Set or clear conditional visibility (global state equality); see ComponentNode.visibilityWhen */
export interface SetNodeVisibilityWhenOp {
  type: 'setNodeVisibilityWhen';
  params: {
    nodeId: string;
    visibilityWhen: { variableName: string; equals: string } | null;
  };
}

/** 编辑器画布锁定（与 ComponentNode.locked 对齐，W7-023） */
export interface SetNodeLockedOp {
  type: 'setNodeLocked';
  params: {
    nodeId: string;
    locked: boolean;
  };
}

/** 编辑器画布显隐（ComponentNode.visible，非 CSS） */
export interface SetNodeVisibleOp {
  type: 'setNodeVisible';
  params: {
    nodeId: string;
    visible: boolean;
  };
}

// -- Global State Operations --

export interface SetGlobalStateOp {
  type: 'setGlobalState';
  params: {
    screenId: string;
    variableName: string;
    value: string;
  };
}

export interface AddGlobalStateVariableOp {
  type: 'addGlobalStateVariable';
  params: {
    screenId: string;
    name: string;
    values: string[];
    defaultValue: string;
    description?: string;
  };
}

export interface RemoveGlobalStateVariableOp {
  type: 'removeGlobalStateVariable';
  params: {
    screenId: string;
    variableName: string;
  };
}

export interface AddGlobalStateBindingOp {
  type: 'addGlobalStateBinding';
  params: {
    nodeId: string;
    binding: {
      id: string;
      variableName: string;
      value: string;
      styles?: Partial<CSSProperties>;
      props?: Record<string, unknown>;
      visible?: boolean;
    };
  };
}

export interface RemoveGlobalStateBindingOp {
  type: 'removeGlobalStateBinding';
  params: {
    nodeId: string;
    bindingId: string;
  };
}

export interface UpdateGlobalStateBindingOp {
  type: 'updateGlobalStateBinding';
  params: {
    nodeId: string;
    bindingId: string;
    patch: {
      styles?: Partial<CSSProperties>;
      props?: Record<string, unknown>;
      visible?: boolean;
    };
  };
}

// -- Component Props Operations --

export interface UpdateComponentPropsOp {
  type: 'updateComponentProps';
  params: {
    nodeId: string;
    props: Record<string, unknown>;
  };
}

export interface AddPropDefinitionOp {
  type: 'addPropDefinition';
  params: {
    templateId: string;
    definition: {
      key: string;
      type: string;
      label: string;
      defaultValue: unknown;
      group?: string;
      description?: string;
      enumValues?: string[];
      required?: boolean;
    };
  };
}

export interface RemovePropDefinitionOp {
  type: 'removePropDefinition';
  params: {
    templateId: string;
    propKey: string;
  };
}

// -- Screen Operations (new) --

export interface ReorderScreenOp {
  type: 'reorderScreen';
  params: {
    screenId: string;
    newIndex: number;
  };
}

// -- Template Operations --

export interface UpdateTemplateOp {
  type: 'updateTemplate';
  params: {
    templateId: string;
    patch: {
      name?: string;
      category?: string;
      tags?: string[];
      description?: string;
      /** 缩略图：URL、base64 或 asset:// 引用（W6-062） */
      thumbnail?: string;
      /** 覆盖模板的 prop → 内部节点字段映射（W6-061） */
      propBindings?: PropBinding[];
    };
  };
}

export interface DeleteTemplateOp {
  type: 'deleteTemplate';
  params: {
    templateId: string;
  };
}

export interface DuplicateTemplateOp {
  type: 'duplicateTemplate';
  params: {
    sourceTemplateId: string;
    newName?: string;
  };
}

// -- Annotation Operations --

export interface AddAnnotationOp {
  type: 'addAnnotation';
  params: {
    parentId: string;
    content: string;
    author?: string;
    styles?: Partial<CSSProperties>;
    position?: number;
  };
}

export interface RemoveAnnotationOp {
  type: 'removeAnnotation';
  params: {
    annotationId: string;
  };
}

// -- Data Operations --

export interface AddDataSetOp {
  type: 'addDataSet';
  params: {
    screenId: string;
    dataSet: {
      id: string;
      name: string;
      data: Record<string, unknown>;
      description?: string;
    };
  };
}

export interface RemoveDataSetOp {
  type: 'removeDataSet';
  params: {
    screenId: string;
    dataSetId: string;
  };
}

export interface UpdateDataSetOp {
  type: 'updateDataSet';
  params: {
    screenId: string;
    dataSetId: string;
    /** 替换 data；省略则不改 */
    data?: Record<string, unknown>;
    /** 显示名称；省略则不改 */
    name?: string;
    /** 说明；省略则不改 */
    description?: string;
  };
}

export interface SwitchDataSetOp {
  type: 'switchDataSet';
  params: {
    screenId: string;
    dataSetId: string;
  };
}

export interface BindDataOp {
  type: 'bindData';
  params: {
    nodeId: string;
    propKey: string;
    expression: string;
  };
}

// ===== Union Type =====

/** All possible operations */
export type Operation =
  | AddElementOp
  | RemoveElementOp
  | MoveElementOp
  | DuplicateElementOp
  | InsertSubtreeOp
  | RenameNodeOp
  | UpdateStyleOp
  | ResetStyleOp
  | AddStateOp
  | RemoveStateOp
  | UpdateStateOp
  | SetActiveStateOp
  | AddEventOp
  | RemoveEventOp
  | UpdateEventOp
  | AddNavigationOp
  | AddScreenOp
  | RemoveScreenOp
  | SetActiveScreenOp
  | RenameScreenOp
  | SwitchViewportOp
  | AddViewportPresetOp
  | InstantiateTemplateOp
  | SaveAsTemplateOp
  | DetachInstanceOp
  | SyncInstanceOp
  | WrapInContainerOp
  | UnwrapContainerOp
  | ReorderElementOp
  | BatchUpdateStyleOp
  | ChangeElementTypeOp
  | SetNodeVisibilityWhenOp
  | SetNodeLockedOp
  | SetNodeVisibleOp
  | ReorderScreenOp
  | SetGlobalStateOp
  | AddGlobalStateVariableOp
  | RemoveGlobalStateVariableOp
  | AddGlobalStateBindingOp
  | RemoveGlobalStateBindingOp
  | UpdateGlobalStateBindingOp
  | UpdateComponentPropsOp
  | AddPropDefinitionOp
  | RemovePropDefinitionOp
  | AddDataSetOp
  | RemoveDataSetOp
  | UpdateDataSetOp
  | SwitchDataSetOp
  | BindDataOp
  | UpdateTemplateOp
  | DeleteTemplateOp
  | DuplicateTemplateOp
  | AddAnnotationOp
  | RemoveAnnotationOp;

/** All operation type strings */
export type OperationType = Operation['type'];

// ===== Operation Description (for MCP/AI) =====

export interface OperationParamSchema {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface OperationDescription {
  type: OperationType;
  description: string;
  category: string;
  params: OperationParamSchema[];
}
