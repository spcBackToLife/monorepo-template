/**
 * 动作徽章 — 在事件卡片折叠态展示动作链概要。
 * v2 动词彩色映射：state.* 蓝、effect.* 紫、nav.* 绿、ui.* 琥珀、node.* 青、custom 灰
 */

import { ACTION_TYPES, type LooseAction } from './constants';

const groupColor: Record<string, string> = {
  state: 'text-blue-600 bg-blue-50',
  effect: 'text-purple-600 bg-purple-50',
  nav: 'text-green-600 bg-green-50',
  ui: 'text-amber-600 bg-amber-50',
  node: 'text-cyan-600 bg-cyan-50',
  custom: 'text-gray-600 bg-gray-100',
};

function summarize(action: LooseAction): string {
  const get = (k: string) => (typeof action[k] === 'string' ? (action[k] as string) : '');
  const num = (k: string) => (typeof action[k] === 'number' ? (action[k] as number) : undefined);

  switch (action.type) {
    case 'state.set':
    case 'state.append':
    case 'state.merge':
    case 'state.toggle':
    case 'state.remove':
      return get('path') ? ` ${get('path')}` : '';
    case 'effect.fetch':
    case 'effect.cancel':
      return get('dataSourceId') ? ` ${get('dataSourceId').slice(0, 8)}` : '';
    case 'nav.go':
      return get('targetScreenId') ? ` → ${get('targetScreenId').slice(0, 6)}` : '';
    case 'nav.back':
      return '';
    case 'node.setVisualState':
      return get('state') ? ` → ${get('state')}` : '';
    case 'ui.openUrl':
      return get('url') ? ` → ${get('url').slice(0, 20)}` : '';
    case 'ui.delay': {
      const d = num('duration');
      return d != null ? ` ${d}ms` : '';
    }
    case 'ui.showToast': {
      const tt = get('toastType') || 'info';
      const msg = get('message');
      const labelMap: Record<string, string> = { success: '成功', error: '错误', warning: '警告', info: '信息' };
      return ` [${labelMap[tt] ?? tt}]${msg ? ` ${msg.slice(0, 12)}` : ''}`;
    }
    case 'custom':
      return get('handler') ? ` → ${get('handler').slice(0, 12)}` : '';
    default:
      return '';
  }
}

export function ActionBadge({ action }: { action: LooseAction }) {
  const meta = ACTION_TYPES.find((a) => a.value === action.type);
  const label = meta?.label.replace(/\s*\(.+\)$/, '') ?? action.type;
  const colorCls = meta ? (groupColor[meta.group] ?? 'text-gray-600 bg-gray-100') : 'text-gray-600 bg-gray-100';

  return (
    <span className={`text-[10px] ${colorCls} px-1 py-0.5 rounded`}>
      {label}{summarize(action)}
    </span>
  );
}
