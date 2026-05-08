/**
 * 单事件卡片 — 折叠态展示徽章链 / 编辑态打开内联表单。
 * 使用 v2 op：event.update / event.remove。
 */

import { useState, useCallback } from 'react';
import { Popconfirm } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import type { ComponentEvent } from '@globallink/design-schema';
import { expr } from '@globallink/design-schema';
import { TRIGGER_OPTIONS, type LooseAction, type TriggerType } from './constants';
import { ActionBadge } from './ActionBadge';
import { ActionChainEditor } from './ActionChainEditor';

interface EventLike {
  trigger: string;
  actions: LooseAction[];
  condition?: { when: string };
  description?: string;
  disabled?: boolean;
}

interface EventCardProps {
  event: EventLike;
  eventIndex: number;
  nodeId: string;
}

export const EventCard = observer(function EventCard({ event, eventIndex, nodeId }: EventCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTrigger, setEditTrigger] = useState<TriggerType>(event.trigger as TriggerType);
  const [editActions, setEditActions] = useState<LooseAction[]>(() => [...event.actions]);
  const [editConditionExpr, setEditConditionExpr] = useState<string>(event.condition?.when ?? '');

  const handleDelete = useCallback(() => {
    editorStore.execute({
      type: 'event.remove',
      params: { nodeId, eventIndex },
    });
  }, [nodeId, eventIndex]);

  const handleToggleDisabled = useCallback(() => {
    editorStore.execute({
      type: 'event.update',
      params: {
        nodeId,
        eventIndex,
        event: { disabled: !event.disabled } as Partial<ComponentEvent>,
      },
    });
  }, [nodeId, eventIndex, event.disabled]);

  const handleSaveInline = useCallback(() => {
    const patch: Partial<ComponentEvent> = {
      trigger: editTrigger,
      actions: editActions as ComponentEvent['actions'],
    };
    if (editConditionExpr.trim()) {
      patch.condition = { when: expr<boolean>(editConditionExpr.trim()) };
    } else {
      patch.condition = undefined;
    }
    editorStore.execute({
      type: 'event.update',
      params: { nodeId, eventIndex, event: patch },
    });
    setEditing(false);
  }, [nodeId, eventIndex, editTrigger, editActions, editConditionExpr]);

  const triggerLabel = TRIGGER_OPTIONS.find((t) => t.value === event.trigger)?.label ?? event.trigger;

  if (editing) {
    return (
      <div className="border border-blue-300 rounded bg-blue-50/30 p-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-[10px] w-12 flex-shrink-0">触发:</span>
          <select
            className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
            value={editTrigger}
            onChange={(e) => setEditTrigger(e.target.value as TriggerType)}
          >
            {TRIGGER_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="text-[10px] text-gray-500 font-medium mt-1">动作链 ({editActions.length})</div>
        <ActionChainEditor
          variant="inline"
          actions={editActions}
          onChange={setEditActions}
          allowEffectFetch
          hostNodeId={nodeId}
        />

        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">条件:</span>
          <input
            type="text"
            className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none font-mono"
            placeholder='{{ state.view.isEnabled }} 不填则总是执行'
            value={editConditionExpr}
            onChange={(e) => setEditConditionExpr(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 justify-end mt-1">
          <button type="button" className="h-5 px-2 bg-blue-500 text-white rounded text-[10px]" onClick={handleSaveInline}>保存</button>
          <button type="button" className="h-5 px-2 border border-gray-200 text-gray-500 rounded text-[10px]" onClick={() => setEditing(false)}>取消</button>
        </div>
      </div>
    );
  }

  const conditionSummary = event.condition?.when
    ? ` · 条件 ${event.condition.when.slice(0, 24)}${event.condition.when.length > 24 ? '…' : ''}`
    : '';

  return (
    <div className={`border rounded bg-white ${event.disabled ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
          {triggerLabel}
        </span>
        <div className="flex-1 flex flex-wrap gap-1">
          {event.actions.map((action, i) => (
            <span key={i} className="flex items-center gap-0.5">
              {i > 0 && <span className="text-[8px] text-gray-400">→</span>}
              <ActionBadge action={action} />
            </span>
          ))}
        </div>
        {(event.description || conditionSummary) && (
          <span
            className="text-[10px] text-gray-400 truncate max-w-[120px]"
            title={`${event.description ?? ''}${conditionSummary}`}
          >
            {event.description}{conditionSummary}
          </span>
        )}
        <button
          type="button"
          className="text-gray-400 hover:text-blue-500 transition-colors p-0.5"
          onClick={() => {
            setEditTrigger(event.trigger as TriggerType);
            setEditActions([...event.actions]);
            setEditConditionExpr(event.condition?.when ?? '');
            setEditing(true);
          }}
          title="编辑"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          className={`transition-colors p-0.5 ${event.disabled ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
          onClick={handleToggleDisabled}
          title={event.disabled ? '启用' : '禁用'}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={event.disabled
                ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18'
                : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'}
            />
          </svg>
        </button>
        <Popconfirm title="确定删除？" onConfirm={handleDelete} okText="删除" cancelText="取消">
          <button type="button" className="text-gray-400 hover:text-red-500 transition-colors p-0.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Popconfirm>
      </div>
    </div>
  );
});
