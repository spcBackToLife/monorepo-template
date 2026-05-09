import type { SplitStrategy, NodeIR, SplitContext } from '@globallink/design-codegen';

export const interactiveRegion: SplitStrategy = {
  name: 'interactive-region',
  description: '有事件且子节点较多的交互区域拆分',
  evaluate(node: NodeIR, _ctx: SplitContext): string | null {
    if (node.events.length > 0 && node.children.length > 2) return 'interactive-region';
    return null;
  },
};
