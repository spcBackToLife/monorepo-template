/**
 * Element / Tree 结构操作 op 类型。
 *
 * 命名约定：dot-namespace（element.add / element.remove / ...）
 * 与 schema Action 命名风格保持一致。
 */

import type {
  CSSProperties,
  ComponentNode,
  ExpressionStyles,
  PrimitiveNodeType,
  Expression,
} from '@globallink/design-schema';

export interface ElementAddOp {
  type: 'element.add';
  params: {
    parentId: string;
    tag: PrimitiveNodeType;
    elementId?: string;
    styles?: ExpressionStyles | CSSProperties;
    props?: Record<string, unknown>;
    position?: number;
  };
}

export interface ElementRemoveOp {
  type: 'element.remove';
  params: {
    elementId: string;
  };
}

export interface ElementMoveOp {
  type: 'element.move';
  params: {
    elementId: string;
    newParentId: string;
    position?: number;
  };
}

export interface ElementDuplicateOp {
  type: 'element.duplicate';
  params: {
    elementId: string;
    /** 新 root 节点 ID（由 ensureDeterministicIds 预生成） */
    newElementId?: string;
    /** DFS 顺序的子节点 ID 序列（不含 root） */
    _childIds?: string[];
  };
}

export interface ElementInsertSubtreeOp {
  type: 'element.insertSubtree';
  params: {
    parentId: string;
    subtree: ComponentNode;
    position?: number;
  };
}

export interface ElementRenameOp {
  type: 'element.rename';
  params: {
    nodeId: string;
    name: string;
  };
}

export interface ElementWrapOp {
  type: 'element.wrap';
  params: {
    nodeIds: string[];
    containerTag?: PrimitiveNodeType;
    containerStyles?: Partial<CSSProperties>;
  };
}

export interface ElementUnwrapOp {
  type: 'element.unwrap';
  params: {
    containerId: string;
  };
}

export interface ElementReorderOp {
  type: 'element.reorder';
  params: {
    nodeId: string;
    parentId: string;
    newIndex: number;
  };
}

export interface ElementChangeTypeOp {
  type: 'element.changeType';
  params: {
    nodeId: string;
    newType: PrimitiveNodeType;
  };
}

export interface ElementSetLockedOp {
  type: 'element.setLocked';
  params: {
    nodeId: string;
    locked: boolean;
  };
}

/**
 * 设置节点的"编辑期角色"——写到 `node.editorMetadata.role`，
 * 渲染契约不读取，仅服务编辑画布的视觉锚定。
 */
export interface ElementSetRoleOp {
  type: 'element.setRole';
  params: {
    nodeId: string;
    role: 'scroll-container' | 'sticky-bottom' | 'sticky-top' | null;
  };
}

export interface ElementSetVisibleOp {
  type: 'element.setVisible';
  params: {
    nodeId: string;
    visible: boolean;
  };
}

/** 设置 `node.visibleWhen` 表达式（运行时求值得 boolean） */
export interface ElementSetVisibleWhenOp {
  type: 'element.setVisibleWhen';
  params: {
    nodeId: string;
    /** 传 null 清空 */
    visibleWhen: Expression<boolean> | string | null;
  };
}

/** 设置 `node.repeat` 列表绑定表达式（求值得数组） */
export interface ElementSetRepeatOp {
  type: 'element.setRepeat';
  params: {
    nodeId: string;
    /** 传 null 清空 */
    repeat: Expression<unknown[]> | string | null;
  };
}

/** 设置 `node.bind` 受控双向绑定 */
export interface ElementSetBindOp {
  type: 'element.setBind';
  params: {
    nodeId: string;
    /** 传 null 清空 */
    bind: { path: string } | null;
  };
}

export type ElementOperation =
  | ElementAddOp
  | ElementRemoveOp
  | ElementMoveOp
  | ElementDuplicateOp
  | ElementInsertSubtreeOp
  | ElementRenameOp
  | ElementWrapOp
  | ElementUnwrapOp
  | ElementReorderOp
  | ElementChangeTypeOp
  | ElementSetLockedOp
  | ElementSetRoleOp
  | ElementSetVisibleOp
  | ElementSetVisibleWhenOp
  | ElementSetRepeatOp
  | ElementSetBindOp;
