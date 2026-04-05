import React from 'react';
import type { ComponentNode } from '@globallink/design-schema';
import { DataContextProvider, useDataContext } from './DataContext';
import type { DataContext } from './resolveExpression';
import { resolveExpression } from './resolveExpression';
import { SchemaVirtualizeContext, useSchemaVirtualize } from '../renderer/SchemaVirtualizeContext';
import { ListInstanceContext, useListInstancePath } from '../renderer/ListInstanceContext';

/** Maximum list items rendered; avoids unbounded DOM in editor. Preview uses same cap. */
const MAX_LIST_ITEMS = 50;

export interface ListRendererProps {
  /** The node that has __listData in its props (the list container) */
  node: ComponentNode;
  /** Render a single child node within a list-item data context */
  renderChild: (
    child: ComponentNode,
    listIndex: number,
  ) => React.ReactNode;
}

/**
 * ListRenderer resolves the __listData expression on a container node to an array,
 * then repeats the node's **children** once per array item, each wrapped in a
 * DataContext that provides `item` and `index`.
 *
 * The container node itself is NOT rendered by ListRenderer — the caller is
 * responsible for rendering the container and using ListRenderer's output as children.
 *
 * Usage (in NodeRenderer / PreviewNodeRenderer):
 * ```
 *   const listChildren = (
 *     <ListRenderer node={node} renderChild={(child, idx) => <NodeRenderer node={child} ... />} />
 *   );
 *   return <PrimitiveRenderer ...>{listChildren}</PrimitiveRenderer>;
 * ```
 */
export function ListRenderer({
  node,
  renderChild,
}: ListRendererProps) {
  const parentContext = useDataContext();
  const parentVirtualize = useSchemaVirtualize();
  const parentListPath = useListInstancePath();
  const listExpression = node.props?.__listData as string;

  // Resolve the expression to get the array
  const resolvedData = resolveExpression(listExpression, parentContext);
  const items = Array.isArray(resolvedData) ? resolvedData : [];

  // Limit to MAX_LIST_ITEMS
  const visibleItems = items.slice(0, MAX_LIST_ITEMS);

  const listVirtualizeValue = {
    ...parentVirtualize,
    cullDisabledForSubtree: true,
  };

  const nodeChildren = node.children ?? [];

  if (visibleItems.length === 0) {
    // Render children once with parent context as placeholder (no item context)
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
          data: parentContext.data,
          item,
          index,
          parent: parentContext,
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
