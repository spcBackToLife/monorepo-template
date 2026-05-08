import React from 'react';
import type { ComponentNode } from '@globallink/design-schema';
import { DataContextProvider, useDataContext } from './DataContextProvider';
import type { DataContext } from './dataContext';
import { resolveExpression } from './dataContext';
import { SchemaVirtualizeContext, useSchemaVirtualize } from '../renderer/SchemaVirtualizeContext';
import { ListInstanceContext, useListInstancePath } from '../renderer/ListInstanceContext';

/** Maximum list items rendered; avoids unbounded DOM in editor. Preview uses same cap. */
const MAX_LIST_ITEMS = 50;

export interface ListRendererProps {
  /** 列表容器节点（其 `repeat` 字段为表达式） */
  node: ComponentNode;
  /** Render a single child node within a list-item data context */
  renderChild: (
    child: ComponentNode,
    listIndex: number,
  ) => React.ReactNode;
}

/**
 * v2 ListRenderer：基于 `node.repeat` 表达式求值得数组，把 children 重复渲染。
 *
 * 与 v1 差异：
 *   - 旧：从 `node.props.__listData` 读字符串表达式
 *   - 新：从 `node.repeat` 读 Expression（`{{ state.data.messages }}` 等），
 *     在 children 内可访问 `{{ item.x }}` / `{{ index }}`
 *
 * 容器节点本身不由 ListRenderer 渲染 —— 调用方负责包外层。
 */
export function ListRenderer({
  node,
  renderChild,
}: ListRendererProps) {
  const parentContext = useDataContext();
  const parentVirtualize = useSchemaVirtualize();
  const parentListPath = useListInstancePath();

  const repeatExpr = node.repeat;
  const resolvedData = repeatExpr !== undefined
    ? resolveExpression(repeatExpr, parentContext)
    : undefined;
  const items = Array.isArray(resolvedData) ? resolvedData : [];

  const visibleItems = items.slice(0, MAX_LIST_ITEMS);

  const listVirtualizeValue = {
    ...parentVirtualize,
    cullDisabledForSubtree: true,
  };

  const nodeChildren = node.children ?? [];

  if (visibleItems.length === 0) {
    // 没有数据时：用父 ctx 渲一遍占位（不暴露 item / index）
    return (
      <SchemaVirtualizeContext.Provider value={listVirtualizeValue}>
        <ListInstanceContext.Provider value={parentListPath}>
          {nodeChildren.map((child) => renderChild(child, 0))}
        </ListInstanceContext.Provider>
      </SchemaVirtualizeContext.Provider>
    );
  }

  return (
    <>
      {visibleItems.map((item, index) => {
        const childContext: DataContext = {
          state: parentContext.state,
          item,
          index,
          parent: parentContext.item,
          $: parentContext.$,
          $last: parentContext.$last,
        };
        const rowPath = [...parentListPath, { listHostId: node.id, index }];

        return (
          <SchemaVirtualizeContext.Provider
            key={`${node.id}-list-${index}`}
            value={listVirtualizeValue}
          >
            <ListInstanceContext.Provider value={rowPath}>
              <DataContextProvider value={childContext}>
                {nodeChildren.map((child) => renderChild(child, index))}
              </DataContextProvider>
            </ListInstanceContext.Provider>
          </SchemaVirtualizeContext.Provider>
        );
      })}
    </>
  );
}
