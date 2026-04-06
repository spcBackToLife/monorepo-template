import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';

const elk = new ELK();

/**
 * Use ELK.js to compute automatic layout positions for React Flow nodes.
 */
export async function computeElkLayout(
  nodes: Node[],
  edges: Edge[],
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const elkNodes = nodes.map((n) => ({
    id: n.id,
    width: n.type === 'screen' ? 100 : 120,
    height: n.type === 'screen' ? 210 : 60,
  }));

  const elkEdges = edges.map((e) => ({
    id: e.id,
    sources: [e.source],
    targets: [e.target],
  }));

  try {
    const layout = await elk.layout({
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'org.eclipse.elk.layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '60',
        'elk.layered.spacing.baseValue': '80',
        'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      },
      children: elkNodes,
      edges: elkEdges,
    });

    const positionedNodes = nodes.map((n) => {
      const elkNode = layout.children?.find((en) => en.id === n.id);
      return {
        ...n,
        position: {
          x: elkNode?.x ?? 0,
          y: elkNode?.y ?? 0,
        },
      };
    });

    return { nodes: positionedNodes, edges };
  } catch (err) {
    console.warn('[Blueprint] ELK layout failed, using fallback:', err);
    // Fallback: simple grid layout
    const positionedNodes = nodes.map((n, i) => ({
      ...n,
      position: {
        x: (i % 4) * 220,
        y: Math.floor(i / 4) * 140,
      },
    }));
    return { nodes: positionedNodes, edges };
  }
}
