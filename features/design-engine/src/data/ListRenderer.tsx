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
  /** 列表容器节点（其 `repeat.expression` + `repeat.template`） */
  node: ComponentNode;
  /** Render the `template` subtree under a given item/index scope */
  renderTemplate: (template: ComponentNode, listIndex: number) => React.ReactNode;
}

/**
 * ListRenderer — v2.1 三层模型：
 *   1. 容器节点自身由调用方（NodeRenderer / PreviewNodeRenderer）渲染；
 *   2. 容器的静态 `children`（EmptyState / LoadingSkeleton 等）同样由调用方渲染；
 *   3. 本组件只负责："对 expression 求值得数组，对每个 item 把 template 渲染一次"，
 *      并在每个 item 的 scope 下注入 `item` / `index` / `parent` 到 DataContext。
 *
 * 返回内容挂在容器的静态 children **之后**，由调用方决定二者的 DOM 顺序。
 */
export function ListRenderer({ node, renderTemplate }: ListRendererProps) {
  const parentContext = useDataContext();
  const parentVirtualize = useSchemaVirtualize();
  const parentListPath = useListInstancePath();

  const binding = node.repeat;
  if (!binding) return null;

  const resolvedData = resolveExpression(binding.expression, parentContext);
  const items = Array.isArray(resolvedData) ? resolvedData : [];
  const visibleItems = items.slice(0, MAX_LIST_ITEMS);

  const listVirtualizeValue = {
    ...parentVirtualize,
    cullDisabledForSubtree: true,
  };

  if (visibleItems.length === 0) return null;

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
                {renderTemplate(binding.template, index)}
              </DataContextProvider>
            </ListInstanceContext.Provider>
          </SchemaVirtualizeContext.Provider>
        );
      })}
    </>
  );
}
