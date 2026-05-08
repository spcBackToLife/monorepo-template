/**
 * 从 editorStore.activeScreen 派生表达式作用域。
 *
 * 用法：
 *   const scope = useExpressionScope({ allowItem: false, allowLast: false });
 *   <ExpressionEditor scope={scope} ... />
 */

import { useMemo } from 'react';
import { editorStore } from '@/stores/editor';
import type { ExprScope } from './suggestions';

export interface UseScopeOptions {
  allowItem?: boolean;
  allowLast?: boolean;
}

export function useExpressionScope(opts: UseScopeOptions = {}): ExprScope {
  const screen = editorStore.activeScreen;
  const stateInit = screen?.stateInit;
  const dataSources = screen?.dataSources ?? [];

  return useMemo<ExprScope>(() => {
    const viewVars = stateInit?.view ? Object.keys(stateInit.view) : [];

    // state.data 的 key 集合：dataSources 结果 id + stateInit.data 常量 key（去重）
    const dataKeys = new Set<string>();
    for (const ds of dataSources) {
      dataKeys.add(ds.id);
    }
    if (stateInit?.data) {
      for (const k of Object.keys(stateInit.data)) {
        dataKeys.add(k);
      }
    }

    // state.effects 的 id 集合：仅 api 类型数据源
    const effectIds = dataSources
      .filter((d) => d.type === 'api')
      .map((d) => d.id);

    return {
      stateViewVars: viewVars,
      stateDataKeys: Array.from(dataKeys),
      stateEffectIds: effectIds,
      allowItem: opts.allowItem ?? false,
      allowLast: opts.allowLast ?? false,
    };
    // 以 JSON 签名让 mobx 变化能被感知（viewVars 是对象 key 数组）
  }, [
    JSON.stringify(stateInit?.view ? Object.keys(stateInit.view) : []),
    JSON.stringify(dataSources.map((d) => `${d.id}:${d.type}`)),
    JSON.stringify(stateInit?.data ? Object.keys(stateInit.data) : []),
    opts.allowItem,
    opts.allowLast,
  ]);
}
