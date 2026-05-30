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
  RepeatBinding,
} from '@globallink/design-schema';

/**
 * Layout hint for intelligent default styling.
 * - 'scroll-child': child in scrollable container (flex: 1, flex-shrink: 0 or auto-height)
 * - 'auto-size': size based on content (no flex defaults)
 * - 'fixed-height': fixed height, full width (height: auto or specific px)
 * - 'fill-parent': fill available space (flex: 1)
 * - 'sticky-header': sticky positioned header (height: auto, position: sticky)
 * - 'sticky-footer': sticky positioned footer (height: auto, position: sticky)
 */
export type LayoutHint = 'scroll-child' | 'auto-size' | 'fixed-height' | 'fill-parent' | 'sticky-header' | 'sticky-footer';

export interface ElementAddOp {
  type: 'element.add';
  params: {
    parentId: string;
    tag: PrimitiveNodeType;
    /**
     * 新节点 ID（由服务端 ensureDeterministicIds 在 op 入 DB 前预生成）。
     * 类型上 optional 兼容 MCP layer / 客户端调用（不传），但运行时由 reducer
     * 通过 assertPregeneratedId 强制要求存在——确保 op 日志一定带 id，重放幂等。
     * 详见 design_docs/03-tech/editor/component-instance-id-stability.md。
     */
    elementId?: string;
    styles?: ExpressionStyles | CSSProperties;
    props?: Record<string, unknown>;
    position?: number;
    /** Layout hint for intelligent default styling */
    layoutHint?: LayoutHint;
    /** Code-friendly identifier (PascalCase). Required at MCP layer, optional for programmatic use. */
    name?: string;
    /** Display label for the node tree panel (any text, e.g. "验证码输入组"). Priority: label > name > type */
    label?: string;
    /** 组件边界标记。codegen 引擎会将标记节点及其子树作为独立组件输出。 */
    componentBoundary?: boolean;
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
    /** 新 root 节点 ID（由 ensureDeterministicIds 预生成，运行时强制要求存在） */
    newElementId?: string;
    /** DFS 顺序的子节点 ID 序列（不含 root；由 ensureDeterministicIds 预生成，长度需匹配子树） */
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
    /** Code-friendly name (PascalCase) */
    name?: string;
    /** Display label (任意文本) */
    label?: string;
  };
}

export interface ElementWrapOp {
  type: 'element.wrap';
  params: {
    nodeIds: string[];
    containerTag?: PrimitiveNodeType;
    containerStyles?: Partial<CSSProperties>;
    /**
     * 新容器 ID（由服务端 ensureDeterministicIds 在 op 入 DB 前预生成）。
     * 重放时直接使用本字段，确保 op 日志与重放结果一致——参考 element.duplicate.newElementId
     * 与 screen.add.rootNodeId 同一模式。
     * 详见 design_docs/03-tech/editor/component-instance-id-stability.md。
     */
    _wrapperId?: string;
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

/**
 * 设置 `node.repeat` 列表绑定（v2.1 `{ expression, template }` 三层模型）。
 *
 * - repeat = null → 清除绑定
 * - repeat = { expression, template } → 设置/替换
 * - repeat = { expression } （省略 template） → 仅更新表达式，保留现有 template；
 *   若节点当前无 repeat，执行器会以"当前节点的第一个子节点"作为默认 template 并把它从 children 中移出
 * - repeat = string（**一次性迁移窗口**） → 等价于 `{ expression }`；
 *   历史 undo/redo op 记录 / 老客户端调用兼容用，迁移完成后应移除
 */
export interface ElementSetRepeatOp {
  type: 'element.setRepeat';
  params: {
    nodeId: string;
    /**
     * - `null` 清空绑定
     * - `RepeatBinding` 完整绑定
     * - `{ expression }` 仅更新表达式（保留原 template）
     * - `string`（历史兼容，一次性窗口）
     */
    repeat:
      | RepeatBinding
      | { expression: Expression<unknown[]> | string }
      | string
      | null;
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
