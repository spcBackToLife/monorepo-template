/**
 * 样式（CSS）操作 op 类型
 */

import type { CSSProperties, ExpressionStyles } from '@globallink/design-schema';

export interface StyleUpdateOp {
  type: 'style.update';
  params: {
    nodeId: string;
    styles: Partial<CSSProperties> | Partial<ExpressionStyles>;
  };
}

export interface StyleResetOp {
  type: 'style.reset';
  params: {
    nodeId: string;
    /** CSS property 键名列表 */
    properties: string[];
  };
}

export interface StyleBatchUpdateOp {
  type: 'style.batchUpdate';
  params: {
    updates: Array<{
      nodeId: string;
      styles: Partial<CSSProperties> | Partial<ExpressionStyles>;
    }>;
  };
}

export type StyleOperation = StyleUpdateOp | StyleResetOp | StyleBatchUpdateOp;
