import type { EventAction } from '@globallink/design-schema';

/** Human-readable description of a single event action */
export function formatAction(action: EventAction): string {
  switch (action.type) {
    case 'navigate':
      return `跳转到 ${action.targetScreenId}`;
    case 'setState':
      return `设置状态 → ${action.state}`;
    case 'openUrl':
      return `打开链接 ${action.url}`;
    case 'delay':
      return `延时 ${action.duration}ms`;
    case 'setGlobalState':
      return `全局状态 ${action.variableName} = ${action.value}`;
    case 'toggleVisible':
      return `切换可见性 ${action.targetId}`;
    case 'custom':
      return `自定义: ${action.handler}`;
    default:
      return '未知动作';
  }
}

/** Human-readable description of an action chain */
export function formatActions(actions: EventAction[]): string {
  if (actions.length === 0) return '无动作';
  if (actions.length === 1) return formatAction(actions[0]);
  return actions.map(formatAction).join(' → ');
}
