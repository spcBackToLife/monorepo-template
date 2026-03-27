import type { EventAction } from '@globallink/design-schema';

/** Human-readable description of an event action */
export function formatAction(action: EventAction): string {
  switch (action.type) {
    case 'navigate':
      return `跳转到 ${action.targetScreenId}`;
    case 'setState':
      return `设置状态 → ${action.state}`;
    case 'openUrl':
      return `打开链接 ${action.url}`;
    case 'custom':
      return `自定义: ${action.handler}`;
    default:
      return '未知动作';
  }
}
