import type { SplitStrategy, NodeIR, SplitContext } from '@globallink/design-codegen';

export const repeatContainer: SplitStrategy = {
  name: 'repeat-container',
  description: '列表容器的 template 拆为独立组件',
  evaluate(node: NodeIR, _ctx: SplitContext): string | null {
    if (node.repeat) return 'repeat-template';
    return null;
  },
};
