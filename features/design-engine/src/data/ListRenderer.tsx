import React from 'react';
import type { ComponentNode, ComponentTemplate } from '@globallink/design-schema';
import { DataContextProvider, useDataContext } from './DataContext';
import type { DataContext } from './resolveExpression';
import { resolveExpression } from './resolveExpression';
import { SchemaVirtualizeContext, useSchemaVirtualize } from '../renderer/SchemaVirtualizeContext';

/** Maximum list items rendered; avoids unbounded DOM in editor. Preview uses same cap. */
const MAX_LIST_ITEMS = 50;

export interface ListRendererProps {
  /** The node that has __listData in its props */
  node: ComponentNode;
  /** Component template assets */
  assets: ComponentTemplate[];
  /** Runtime global state values */
  globalStates: Record<string, string>;
  /** Renderer function for a single node with its children */
  renderNode: (
    node: ComponentNode,
    assets: ComponentTemplate[],
    globalStates: Record<string, string>,
    onNodeClick?: (nodeId: string) => void,
    onNodeHover?: (nodeId: string | null) => void,
    onNodeDoubleClick?: (nodeId: string) => void,
  ) => React.ReactNode;
  /** Called when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Called when mouse enters/leaves a node */
  onNodeHover?: (nodeId: string | null) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}

/**
 * ListRenderer detects __listData in node props, resolves the expression to an array,
 * and renders the node once per array item with a child DataContext.
 */
export function ListRenderer({
  node,
  assets,
  globalStates,
  renderNode,
  onNodeClick,
  onNodeHover,
  onNodeDoubleClick,
}: ListRendererProps) {
  const parentContext = useDataContext();
  const parentVirtualize = useSchemaVirtualize();
  const listExpression = node.props.__listData as string;

  // Resolve the expression to get the array
  const resolvedData = resolveExpression(listExpression, parentContext);
  const items = Array.isArray(resolvedData) ? resolvedData : [];

  // Limit to MAX_LIST_ITEMS
  const visibleItems = items.slice(0, MAX_LIST_ITEMS);

  const listVirtualizeValue = {
    ...parentVirtualize,
    cullDisabledForSubtree: true,
  };

  if (visibleItems.length === 0) {
    // Render once with empty context as placeholder
    return (
      <SchemaVirtualizeContext.Provider value={listVirtualizeValue}>
        {renderNode(node, assets, globalStates, onNodeClick, onNodeHover, onNodeDoubleClick)}
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

        return (
          <SchemaVirtualizeContext.Provider
            key={`${node.id}-list-${index}`}
            value={listVirtualizeValue}
          >
            <DataContextProvider value={childContext}>
              {renderNode(node, assets, globalStates, onNodeClick, onNodeHover, onNodeDoubleClick)}
            </DataContextProvider>
          </SchemaVirtualizeContext.Provider>
        );
      })}
    </>
  );
}
