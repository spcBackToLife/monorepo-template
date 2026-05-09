import type { SplitStrategy } from '@globallink/design-codegen';
import { repeatContainer } from './repeat-container';
import { deepNesting } from './deep-nesting';
import { manyChildren } from './many-children';
import { interactiveRegion } from './interactive-region';

export const strategies: SplitStrategy[] = [
  repeatContainer,
  deepNesting,
  manyChildren,
  interactiveRegion,
];

export const defaultParams: Record<string, unknown> = {
  maxDepth: 5,
  maxDirectChildren: 6,
  minDescendantsToSplit: 8,
};
