import type {
  CSSProperties,
  ComponentEvent,
  Viewport,
  PrimitiveNodeType,
  TemplateScope,
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

// ===== Union Type =====

/** All possible operations */
export type Operation =
  | AddElementOp
  | RemoveElementOp
  | MoveElementOp
  | DuplicateElementOp
  | UpdateStyleOp
  | ResetStyleOp
  | AddStateOp
  | RemoveStateOp
  | UpdateStateOp
  | SetActiveStateOp
  | AddEventOp
  | RemoveEventOp
  | AddNavigationOp
  | AddScreenOp
  | RemoveScreenOp
  | SetActiveScreenOp
  | SwitchViewportOp
  | AddViewportPresetOp
  | InstantiateTemplateOp
  | SaveAsTemplateOp
  | DetachInstanceOp
  | SyncInstanceOp;

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
