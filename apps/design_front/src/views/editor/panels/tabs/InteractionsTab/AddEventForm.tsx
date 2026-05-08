/**
 * 新建事件内联表单 — 触发器 + 动作链 + 可选条件表达式。
 *
 * 与 v1 相比简化：
 * - 条件统一为 { when: Expression<boolean> }；不再有 'domainState' / 'expression' 二元
 * - 默认动作改为 state.set（v1 是 navigate）
 * - 保存时 setState 旧兜底删除（v2 没有 setState 这个动词）
 */

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import type { ComponentEvent } from '@globallink/design-schema';
import { expr } from '@globallink/design-schema';
import { TRIGGER_OPTIONS, type LooseAction, type TriggerType } from './constants';
import { ActionChainEditor } from './ActionChainEditor';

interface AddEventFormProps {
  hostNodeId: string;
  onOpen: () => void;
  onClose: () => void;
}

export const AddEventForm = observer(function AddEventForm({
  hostNodeId,
  onOpen,
  onClose,
}: AddEventFormProps) {
  const [adding, setAdding] = useState(false);
  const [trigger, setTrigger] = useState<TriggerType>('click');
  const [actions, setActions] = useState<LooseAction[]>(() => [{ type: 'state.set' }]);
  const [conditionExpr, setConditionExpr] = useState('');

  const reset = () => {
    setAdding(false);
    setTrigger('click');
    setActions([{ type: 'state.set' }]);
    setConditionExpr('');
    onClose();
  };

  const handleSave = () => {
    const event: ComponentEvent = {
      trigger,
      actions: actions as ComponentEvent['actions'],
    };
    if (conditionExpr.trim()) {
      event.condition = { when: expr<boolean>(conditionExpr.trim()) };
    }
    editorStore.execute({
      type: 'event.add',
      params: { nodeId: hostNodeId, event },
    });
    reset();
  };

  if (!adding) {
    return (
      <button
        type="button"
        className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
        onClick={() => {
          onOpen();
          setAdding(true);
        }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        添加事件
      </button>
    );
  }

  return (
    <div className="border border-blue-200 rounded bg-blue-50/30 p-2 flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-[10px] w-12 flex-shrink-0">触发器:</span>
        <select
          className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value as TriggerType)}
        >
          {TRIGGER_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="text-[10px] text-gray-500 font-medium">动作链 ({actions.length})</div>
      <ActionChainEditor
        variant="inline"
        actions={actions}
        onChange={setActions}
        allowEffectFetch
        hostNodeId={hostNodeId}
      />

      <div className="flex items-center gap-1 border-t border-gray-200 pt-1.5">
        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">条件:</span>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none font-mono"
          placeholder='{{ state.view.isEnabled }} 不填则总是执行'
          value={conditionExpr}
          onChange={(e) => setConditionExpr(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1 justify-end">
        <button
          type="button"
          className="h-6 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          onClick={handleSave}
        >
          保存
        </button>
        <button
          type="button"
          className="h-6 px-2 border border-gray-200 text-gray-500 rounded text-xs hover:bg-gray-50"
          onClick={reset}
        >
          取消
        </button>
      </div>
    </div>
  );
});
