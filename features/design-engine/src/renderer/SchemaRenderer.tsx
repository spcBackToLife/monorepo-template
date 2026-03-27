import React, { useCallback } from 'react';
import type { ComponentNode, ComponentTemplate, Screen } from '@globallink/design-schema';
import { isComponentInstanceType } from '@globallink/design-schema';
import { PrimitiveRenderer } from '../renderers/PrimitiveRenderer';
import { resolveStyles } from '../styles/resolveStyles';
import { resolveActiveState } from '../styles/resolveState';
import { resolveComponentInstance } from '../assets/resolveInstance';

export interface SchemaRendererProps {
  /** The screen to render */
  screen: Screen;
  /** Component template assets (for resolving component instances) */
  assets?: ComponentTemplate[];
  /** Called when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Called when mouse enters/leaves a node */
  onNodeHover?: (nodeId: string | null) => void;
}

/**
 * Core renderer that recursively converts a Screen's ComponentNode tree
 * into a real React DOM tree.
 *
 * Features:
 * - Resolves component instances from the asset library
 * - Merges active state overrides
 * - Converts schema CSSProperties to React-compatible styles
 * - Injects data-node-id on every rendered element
 */
export function SchemaRenderer({
  screen,
  assets = [],
  onNodeClick,
  onNodeHover,
}: SchemaRendererProps) {
  return (
    <div
      data-screen-id={screen.id}
      style={{
        width: '100%',
        minHeight: '100%',
        backgroundColor: screen.backgroundColor,
        position: 'relative' as const,
      }}
    >
      <NodeRenderer
        node={screen.rootNode}
        assets={assets}
        onNodeClick={onNodeClick}
        onNodeHover={onNodeHover}
      />
    </div>
  );
}

// ===== Internal: Recursive Node Renderer =====

interface NodeRendererProps {
  node: ComponentNode;
  assets: ComponentTemplate[];
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
}

function NodeRenderer({
  node: rawNode,
  assets,
  onNodeClick,
  onNodeHover,
}: NodeRendererProps) {
  // Step 1: Resolve component instances
  const node = isComponentInstanceType(rawNode.type)
    ? resolveComponentInstance(rawNode, assets)
    : rawNode;

  // Step 2: Resolve active state (merge state overrides)
  const { styles: mergedStyles, props: mergedProps } = resolveActiveState(node);

  // Step 3: Convert to React.CSSProperties
  const reactStyles = resolveStyles(mergedStyles);

  // Step 4: Event handlers
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeClick?.(node.id);
    },
    [node.id, onNodeClick],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeHover?.(node.id);
    },
    [node.id, onNodeHover],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeHover?.(null);
    },
    [onNodeHover],
  );

  // Step 5: Recursively render children
  const children = node.children?.map((child) => (
    <NodeRenderer
      key={child.id}
      node={child}
      assets={assets}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
    />
  ));

  // Step 6: Wrap with click/hover handlers
  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'contents' }}
    >
      <PrimitiveRenderer
        node={node}
        style={reactStyles}
        resolvedProps={mergedProps}
      >
        {children}
      </PrimitiveRenderer>
    </div>
  );
}
