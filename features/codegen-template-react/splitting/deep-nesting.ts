import type { SplitStrategy, NodeIR, SplitContext } from '@globallink/design-codegen';

export const deepNesting: SplitStrategy = {
  name: 'deep-nesting',
  description: 'DOM 嵌套层级过深时拆分',
  evaluate(node: NodeIR, ctx: SplitContext): string | null {
    const maxDepth = (ctx.params.maxDepth as number) || 5;
    if (getMaxChildDepth(node) > maxDepth) return 'depth-exceeded';
    return null;
  },
};

function getMaxChildDepth(node: NodeIR, current = 0): number {
  if (node.children.length === 0) return current;
  return Math.max(...node.children.map(c => getMaxChildDepth(c, current + 1)));
}
