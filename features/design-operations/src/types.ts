import type {
  CSSProperties,
  ComponentNode,
  ComponentState,
  ComponentEvent,
  Viewport,
  PrimitiveNodeType,
  TemplateScope,
  PropBinding,
  DomainStateValue,
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

export interface InsertSubtreeOp {
  type: 'insertSubtree';
  params: {
    parentId: string;
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

export interface ReorderScreenOp {
  type: 'reorderScreen';
  params: {
    screenId: string;
    newIndex: number;
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

// -- Element Operations (extended) --

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

export interface SetNodeLockedOp {
  type: 'setNodeLocked';
  params: {
    nodeId: string;
    locked: boolean;
  };
}

export interface SetNodeVisibleOp {
  type: 'setNodeVisible';
  params: {
    nodeId: string;
    visible: boolean;
  };
}

export interface SetNodeVisibilityWhenOp {
  type: 'setNodeVisibilityWhen';
  params: {
    nodeId: string;
    visibilityWhen: { variableName: string; equals: string } | null;
  };
}

// -- Domain State Operations --

export interface AddDomainStateOp {
  type: 'addDomainState';
  params: {
    /** Screen ID or container node ID where the domain state is defined */
    ownerId: string;
    /** 'screen' or 'node' */
    ownerType: 'screen' | 'node';
    name: string;
    label: string;
    values: DomainStateValue[];
    defaultValue: string;
  };
}

export interface RemoveDomainStateOp {
  type: 'removeDomainState';
  params: {
    ownerId: string;
    ownerType: 'screen' | 'node';
    variableName: string;
  };
}

export interface UpdateDomainStateOp {
  type: 'updateDomainState';
  params: {
    ownerId: string;
    ownerType: 'screen' | 'node';
    variableName: string;
    patch: {
      label?: string;
      values?: DomainStateValue[];
      defaultValue?: string;
    };
  };
}

export interface SetDomainStatePreviewOp {
  type: 'setDomainStatePreview';
  params: {
    ownerId: string;
    ownerType: 'screen' | 'node';
    variableName: string;
    value: string;
  };
}

export interface AddDomainStateBindingOp {
  type: 'addDomainStateBinding';
  params: {
    nodeId: string;
    binding: {
      variableName: string;
      ownerNodeId?: string;
      value: string;
      styles?: Partial<CSSProperties>;
      props?: Record<string, unknown>;
      visible?: boolean;
      childrenVisibility?: Record<string, boolean>;
      disabledEvents?: string[];
    };
  };
}

export interface UpdateDomainStateBindingOp {
  type: 'updateDomainStateBinding';
  params: {
    nodeId: string;
    variableName: string;
    value: string;
    patch: {
      styles?: Partial<CSSProperties>;
      props?: Record<string, unknown>;
      visible?: boolean;
      childrenVisibility?: Record<string, boolean>;
      disabledEvents?: string[];
    };
  };
}

export interface RemoveDomainStateBindingOp {
  type: 'removeDomainStateBinding';
  params: {
    nodeId: string;
    variableName: string;
    value: string;
  };
}

// -- Environment State Operations --

export interface AddEnvironmentStateOp {
  type: 'addEnvironmentState';
  params: {
    name: string;
    label: string;
    values: { value: string; label: string }[];
    defaultValue: string;
  };
}

export interface RemoveEnvironmentStateOp {
  type: 'removeEnvironmentState';
  params: {
    variableName: string;
  };
}

export interface UpdateEnvironmentStateOp {
  type: 'updateEnvironmentState';
  params: {
    variableName: string;
    patch: {
      label?: string;
      values?: { value: string; label: string }[];
      defaultValue?: string;
    };
  };
}

export interface SetEnvironmentPreviewOp {
  type: 'setEnvironmentPreview';
  params: {
    variableName: string;
    value: string;
  };
}

export interface AddEnvironmentBindingOp {
  type: 'addEnvironmentBinding';
  params: {
    nodeId: string;
    binding: {
      variableName: string;
      value: string;
      styles?: Partial<CSSProperties>;
      props?: Record<string, unknown>;
      visible?: boolean;
    };
  };
}

export interface UpdateEnvironmentBindingOp {
  type: 'updateEnvironmentBinding';
  params: {
    nodeId: string;
    variableName: string;
    value: string;
    patch: {
      styles?: Partial<CSSProperties>;
      props?: Record<string, unknown>;
      visible?: boolean;
    };
  };
}

export interface RemoveEnvironmentBindingOp {
  type: 'removeEnvironmentBinding';
  params: {
    nodeId: string;
    variableName: string;
    value: string;
  };
}

// -- Data Source Operations --

export interface AddDataSourceOp {
  type: 'addDataSource';
  params: {
    screenId: string;
    dataSource: {
      id: string;
      name: string;
      lifecycle: 'api' | 'static';
      description?: string;
    };
  };
}

export interface RemoveDataSourceOp {
  type: 'removeDataSource';
  params: {
    screenId: string;
    dataSourceId: string;
  };
}

export interface UpdateDataSourceOp {
  type: 'updateDataSource';
  params: {
    screenId: string;
    dataSourceId: string;
    name?: string;
    description?: string;
  };
}

export interface SwitchDataSourcePhaseOp {
  type: 'switchDataSourcePhase';
  params: {
    screenId: string;
    dataSourceId: string;
    phase: string;
  };
}

export interface AddDataScenarioOp {
  type: 'addDataScenario';
  params: {
    screenId: string;
    dataSourceId: string;
    scenario: {
      id: string;
      name: string;
      data: Record<string, unknown>;
      description?: string;
      isDefault?: boolean;
    };
  };
}

export interface UpdateDataScenarioOp {
  type: 'updateDataScenario';
  params: {
    screenId: string;
    dataSourceId: string;
    scenarioId: string;
    data?: Record<string, unknown>;
    name?: string;
    description?: string;
  };
}

export interface RemoveDataScenarioOp {
  type: 'removeDataScenario';
  params: {
    screenId: string;
    dataSourceId: string;
    scenarioId: string;
  };
}

export interface SwitchDataScenarioOp {
  type: 'switchDataScenario';
  params: {
    screenId: string;
    dataSourceId: string;
    scenarioId: string;
  };
}

/** Bind a data expression to a node prop */
export interface BindDataOp {
  type: 'bindData';
  params: {
    nodeId: string;
    propKey: string;
    expression: string;
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
      thumbnail?: string;
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
  | ReorderScreenOp
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
  | SetNodeLockedOp
  | SetNodeVisibleOp
  | SetNodeVisibilityWhenOp
  | AddDomainStateOp
  | RemoveDomainStateOp
  | UpdateDomainStateOp
  | SetDomainStatePreviewOp
  | AddDomainStateBindingOp
  | UpdateDomainStateBindingOp
  | RemoveDomainStateBindingOp
  | AddEnvironmentStateOp
  | RemoveEnvironmentStateOp
  | UpdateEnvironmentStateOp
  | SetEnvironmentPreviewOp
  | AddEnvironmentBindingOp
  | UpdateEnvironmentBindingOp
  | RemoveEnvironmentBindingOp
  | AddDataSourceOp
  | RemoveDataSourceOp
  | UpdateDataSourceOp
  | SwitchDataSourcePhaseOp
  | AddDataScenarioOp
  | UpdateDataScenarioOp
  | RemoveDataScenarioOp
  | SwitchDataScenarioOp
  | BindDataOp
  | UpdateComponentPropsOp
  | AddPropDefinitionOp
  | RemovePropDefinitionOp
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
