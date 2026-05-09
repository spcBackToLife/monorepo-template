import type { SplitStrategy, NodeIR, SplitContext } from '@globallink/design-codegen';

export const manyChildren: SplitStrategy = {
  name: 'many-children',
  description: '直接子节点超过阈值时拆分',
  evaluate(node: NodeIR, ctx: SplitContext): string | null {
    const max = (ctx.params.maxDirectChildren as number) || 6;
    if (node.children.length > max) return 'children-exceeded';
    return null;
  },
};
