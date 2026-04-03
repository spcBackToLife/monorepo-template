import { useState, useCallback, useEffect, useRef } from 'react';
import { Empty, Popconfirm } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';

// ===== Constants =====

const TRIGGER_OPTIONS = [
  { value: 'click', label: '点击 (Click)' },
  { value: 'doubleClick', label: '双击 (DblClick)' },
  { value: 'hover', label: '悬停 (Hover)' },
  { value: 'focus', label: '聚焦 (Focus)' },
  { value: 'blur', label: '失焦 (Blur)' },
  { value: 'longPress', label: '长按 (LongPress)' },
] as const;

const ACTION_TYPES = [
  { value: 'navigate', label: '跳转页面' },
  { value: 'setState', label: '设置状态' },
  { value: 'setGlobalState', label: '设置全局状态' },
  { value: 'toggleVisible', label: '切换可见性' },
  { value: 'openUrl', label: '打开链接' },
  { value: 'delay', label: '延时' },
  { value: 'custom', label: '自定义' },
] as const;

type TriggerType = typeof TRIGGER_OPTIONS[number]['value'];
type ActionType = typeof ACTION_TYPES[number]['value'];

interface ActionConfig {
  type: ActionType;
  screenId?: string;
  nodeId?: string;
  stateName?: string;
  variableName?: string;
  value?: string;
  url?: string;
  openInNewTab?: boolean;
  duration?: number;
  handler?: string;
}

/**
 * Task 4.5.1–4.5.4 — Interactions Tab
 *
 * Event card list showing node.events with add/delete capabilities.
 * Each event: trigger + action type + target summary.
 */
export const InteractionsTab = observer(function InteractionsTab() {
  const selectedId = editorStore.selectedNodeIds[0];
  const screens = editorStore.screens;

  /**
   * 添加事件表单打开时锁定「宿主节点」，避免在画布点选目标时 selectedNodeIds 变化导致面板切到别的节点。
   */
  const [addingEventHostId, setAddingEventHostId] = useState<string | null>(null);
  const nodeId =
    addingEventHostId !== null ? addingEventHostId : selectedId;

  if (!nodeId) {
    return <Empty description="请先选中一个元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const node = findNodeInScreens(screens, nodeId);
  if (!node) {
    return <Empty description="节点未找到" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const events = (node.events ?? []) as unknown as Array<{
    trigger: string;
    actions: Array<{ type: string; [key: string]: unknown }>;
    condition?: { type: string; variableName?: string; value?: string };
    description?: string;
    disabled?: boolean;
  }>;

  return (
    <div className="flex flex-col gap-2 p-2 text-xs">
      {/* Event cards */}
      {events.length === 0 && (
        <div className="text-gray-400 text-[10px] py-2 text-center">
          暂无交互事件
        </div>
      )}

      {events.map((event, idx) => (
        <EventCard
          key={idx}
          event={event}
          eventIndex={idx}
          nodeId={nodeId}
        />
      ))}

      {/* Add event button + inline form */}
      <AddEventForm
        hostNodeId={nodeId}
        onOpen={() => setAddingEventHostId(editorStore.selectedNodeIds[0] ?? null)}
        onClose={() => setAddingEventHostId(null)}
      />
    </div>
  );
});

// ===== Event Card (inline editing + disable toggle) =====

interface EventCardProps {
  event: {
    trigger: string;
    actions: Array<{ type: string; [key: string]: unknown }>;
    condition?: { type: string; variableName?: string; value?: string };
    description?: string;
    disabled?: boolean;
  };
  eventIndex: number;
  nodeId: string;
}

const EventCard = observer(function EventCard({ event, eventIndex, nodeId }: EventCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTrigger, setEditTrigger] = useState(event.trigger);
  const [editActions, setEditActions] = useState<Array<{ type: string; [k: string]: unknown }>>(
    () => [...event.actions],
  );

  const handleDelete = useCallback(() => {
    editorStore.execute({
      type: 'removeEvent',
      params: { nodeId, eventIndex },
    });
  }, [nodeId, eventIndex]);

  const handleToggleDisabled = useCallback(() => {
    editorStore.execute({
      type: 'updateEvent',
      params: { nodeId, eventIndex, event: { disabled: !event.disabled } },
    } as never);
  }, [nodeId, eventIndex, event.disabled]);

  const handleSaveInline = useCallback(() => {
    const patch: Record<string, unknown> = {};
    if (editTrigger !== event.trigger) patch.trigger = editTrigger;
    patch.actions = editActions;
    editorStore.execute({
      type: 'updateEvent',
      params: { nodeId, eventIndex, event: patch },
    } as never);
    setEditing(false);
  }, [nodeId, eventIndex, editTrigger, editActions, event.trigger]);

  const addActionToChain = () => {
    setEditActions((prev) => [...prev, { type: 'navigate' }]);
  };

  const removeActionFromChain = (idx: number) => {
    setEditActions((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveAction = (idx: number, dir: -1 | 1) => {
    setEditActions((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateActionType = (idx: number, type: string) => {
    setEditActions((prev) => prev.map((a, i) => (i === idx ? { type } : a)));
  };

  const triggerLabel = TRIGGER_OPTIONS.find((t) => t.value === event.trigger)?.label ?? event.trigger;

  if (editing) {
    return (
      <div className="border border-blue-300 rounded bg-blue-50/30 p-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-[10px] w-12 flex-shrink-0">触发:</span>
          <select
            className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
            value={editTrigger}
            onChange={(e) => setEditTrigger(e.target.value)}
          >
            {TRIGGER_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="text-[10px] text-gray-500 font-medium mt-1">动作链 ({editActions.length})</div>
        {editActions.map((action, i) => (
          <div key={i} className="flex items-center gap-1 pl-2 border-l-2 border-blue-200">
            <span className="text-[10px] text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
            <select
              className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
              value={action.type}
              onChange={(e) => updateActionType(i, e.target.value)}
            >
              {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <button type="button" className="text-gray-400 hover:text-gray-600 text-[10px]" onClick={() => moveAction(i, -1)} title="上移">↑</button>
            <button type="button" className="text-gray-400 hover:text-gray-600 text-[10px]" onClick={() => moveAction(i, 1)} title="下移">↓</button>
            <button type="button" className="text-gray-400 hover:text-red-400 text-[10px]" onClick={() => removeActionFromChain(i)} title="删除">×</button>
          </div>
        ))}
        <button
          type="button"
          className="h-5 px-2 text-[10px] border border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500"
          onClick={addActionToChain}
        >+ 添加动作步骤</button>

        <div className="flex items-center gap-1 justify-end mt-1">
          <button type="button" className="h-5 px-2 bg-blue-500 text-white rounded text-[10px]" onClick={handleSaveInline}>保存</button>
          <button type="button" className="h-5 px-2 border border-gray-200 text-gray-500 rounded text-[10px]" onClick={() => setEditing(false)}>取消</button>
        </div>
      </div>
    );
  }

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
        {event.description && (
          <span className="text-[10px] text-gray-400 truncate max-w-[60px]" title={event.description}>{event.description}</span>
        )}
        <button type="button" className="text-gray-400 hover:text-blue-500 transition-colors p-0.5" onClick={() => { setEditTrigger(event.trigger); setEditActions([...event.actions]); setEditing(true); }} title="编辑">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button type="button" className={`transition-colors p-0.5 ${event.disabled ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`} onClick={handleToggleDisabled} title={event.disabled ? '启用' : '禁用'}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={event.disabled ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} /></svg>
        </button>
        <Popconfirm title="确定删除？" onConfirm={handleDelete} okText="删除" cancelText="取消">
          <button type="button" className="text-gray-400 hover:text-red-500 transition-colors p-0.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </Popconfirm>
      </div>
    </div>
  );
});

// ===== Action Badge =====

function ActionBadge({ action }: { action: { type: string; [key: string]: unknown } }) {
  const label = ACTION_TYPES.find((a) => a.value === action.type)?.label ?? action.type;

  let summary = '';
  switch (action.type) {
    case 'navigate': {
      const sid = (action as { targetScreenId?: string; screenId?: string }).targetScreenId
        ?? (action as { screenId?: string }).screenId;
      summary = sid ? ` → ${String(sid).slice(0, 6)}` : '';
      break;
    }
    case 'setState': {
      const sn = (action as { stateName?: string; state?: string }).stateName
        ?? (action as { state?: string }).state;
      const tid = (action as { nodeId?: string; targetId?: string }).nodeId
        ?? (action as { targetId?: string }).targetId;
      const parts: string[] = [];
      if (sn) parts.push(String(sn));
      if (tid) parts.push(`@${String(tid).slice(0, 6)}`);
      summary = parts.length ? ` → ${parts.join(' ')}` : '';
      break;
    }
    case 'setGlobalState':
      summary = action.variableName ? ` → ${String(action.variableName)}` : '';
      break;
    case 'toggleVisible': {
      const tid = (action as { nodeId?: string; targetId?: string }).nodeId
        ?? (action as { targetId?: string }).targetId;
      summary = tid ? ` → ${String(tid).slice(0, 6)}` : '';
      break;
    }
    case 'openUrl':
      summary = action.url ? ` → ${String(action.url).slice(0, 20)}` : '';
      break;
    case 'delay': {
      const d = (action as { duration?: number }).duration;
      summary = d != null ? ` ${d}ms` : '';
      break;
    }
    case 'custom': {
      const h = (action as { handler?: string }).handler;
      summary = h ? ` → ${String(h).slice(0, 12)}` : '';
      break;
    }
  }

  return (
    <span className="text-[10px] text-green-600 bg-green-50 px-1 py-0.5 rounded">
      {label}{summary}
    </span>
  );
}

// ===== Add Event Form =====

const AddEventForm = observer(function AddEventForm({
  hostNodeId,
  onOpen,
  onClose,
}: {
  hostNodeId: string;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [trigger, setTrigger] = useState<TriggerType>('click');
  const [actionConfig, setActionConfig] = useState<ActionConfig>({ type: 'navigate' });
  /** 在画布/树中点选目标节点：选中变化且与锚点不同时写入目标 id */
  const [pickTargetMode, setPickTargetMode] = useState(false);
  const pickAnchorRef = useRef<string | null>(null);

  const screens = editorStore.screens;
  const activeScreen = editorStore.activeScreen;

  useEffect(() => {
    if (!pickTargetMode) return;
    const sid = editorStore.selectedNodeIds[0] ?? null;
    if (sid !== null && sid !== pickAnchorRef.current) {
      setActionConfig((c) => ({ ...c, nodeId: sid }));
      setPickTargetMode(false);
    }
    pickAnchorRef.current = sid;
  }, [editorStore.selectedNodeIds.join('|'), pickTargetMode]);

  const reset = () => {
    setAdding(false);
    setStep(1);
    setTrigger('click');
    setActionConfig({ type: 'navigate' });
    setPickTargetMode(false);
    setConditionEnabled(false);
    setConditionType('globalState');
    setConditionVar('');
    setConditionVal('');
    setConditionExpr('');
    onClose();
  };

  const beginPickTarget = () => {
    pickAnchorRef.current = editorStore.selectedNodeIds[0] ?? null;
    setPickTargetMode(true);
  };

  const useCurrentSelectionAsTarget = () => {
    const id = editorStore.selectedNodeIds[0];
    if (id) setActionConfig((c) => ({ ...c, nodeId: id }));
  };

  const [conditionEnabled, setConditionEnabled] = useState(false);
  const [conditionType, setConditionType] = useState<'globalState' | 'expression'>('globalState');
  const [conditionVar, setConditionVar] = useState('');
  const [conditionVal, setConditionVal] = useState('');
  const [conditionExpr, setConditionExpr] = useState('');

  const handleSave = () => {
    const action: Record<string, unknown> = { type: actionConfig.type };

    switch (actionConfig.type) {
      case 'navigate':
        action.targetScreenId = actionConfig.screenId;
        action.screenId = actionConfig.screenId;
        break;
      case 'setState':
        action.nodeId = actionConfig.nodeId || hostNodeId;
        action.targetId = action.nodeId;
        action.stateName = actionConfig.stateName;
        action.state = actionConfig.stateName;
        break;
      case 'setGlobalState':
        action.variableName = actionConfig.variableName;
        action.value = actionConfig.value;
        break;
      case 'toggleVisible':
        action.nodeId = actionConfig.nodeId;
        action.targetId = actionConfig.nodeId;
        break;
      case 'openUrl':
        action.url = actionConfig.url;
        action.openInNewTab = actionConfig.openInNewTab ?? true;
        break;
      case 'delay':
        action.duration = actionConfig.duration ?? 300;
        break;
      case 'custom':
        action.handler = actionConfig.handler ?? 'handler';
        break;
    }

    const eventPayload: Record<string, unknown> = { trigger, actions: [action] };
    if (conditionEnabled) {
      if (conditionType === 'globalState' && conditionVar) {
        eventPayload.condition = { type: 'globalState', variableName: conditionVar, value: conditionVal };
      } else if (conditionType === 'expression' && conditionExpr) {
        eventPayload.condition = { type: 'expression', expression: conditionExpr };
      }
    }

    editorStore.execute({
      type: 'addEvent',
      params: {
        nodeId: hostNodeId,
        event: eventPayload,
      } as never,
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
      {pickTargetMode && (
        <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          请在画布或左侧树中点击<strong>目标元素</strong>（与当前选中不同时会填入）。也可点「使用当前选中」。
        </div>
      )}
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-[10px] text-gray-500">
        <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>1.触发</span>
        <span>→</span>
        <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>2.动作</span>
        <span>→</span>
        <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>3.配置</span>
      </div>

      {/* Step 1: Select trigger */}
      {step >= 1 && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-[10px] w-12 flex-shrink-0">触发器:</span>
          <select
            className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400"
            value={trigger}
            onChange={(e) => {
              setTrigger(e.target.value as TriggerType);
              if (step === 1) setStep(2);
            }}
          >
            {TRIGGER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Step 2: Select action type */}
      {step >= 2 && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-[10px] w-12 flex-shrink-0">动作:</span>
          <select
            className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400"
            value={actionConfig.type}
            onChange={(e) => {
              setActionConfig({ type: e.target.value as ActionType });
              setStep(3);
            }}
          >
            {ACTION_TYPES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Step 3: Configure action params */}
      {step >= 3 && (
        <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-blue-200">
          {actionConfig.type === 'navigate' && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">目标页面:</span>
              <select
                className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400"
                value={actionConfig.screenId ?? ''}
                onChange={(e) => setActionConfig({ ...actionConfig, screenId: e.target.value })}
              >
                <option value="">选择页面</option>
                {screens.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {actionConfig.type === 'setState' && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">状态名:</span>
                <input
                  type="text"
                  className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                  placeholder="例: hover"
                  value={actionConfig.stateName ?? ''}
                  onChange={(e) => setActionConfig({ ...actionConfig, stateName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">目标节点</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    className="flex-1 min-w-0 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
                    placeholder="留空 = 当前宿主节点"
                    value={actionConfig.nodeId ?? ''}
                    onChange={(e) => setActionConfig({ ...actionConfig, nodeId: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="h-6 px-1.5 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
                    onClick={useCurrentSelectionAsTarget}
                  >
                    使用当前选中
                  </button>
                  <button
                    type="button"
                    className={`h-6 px-1.5 text-[10px] rounded border ${
                      pickTargetMode
                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    onClick={beginPickTarget}
                  >
                    在画布点选…
                  </button>
                </div>
              </div>
            </>
          )}

          {actionConfig.type === 'setGlobalState' && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">变量名:</span>
                <select
                  className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400"
                  value={actionConfig.variableName ?? ''}
                  onChange={(e) => setActionConfig({ ...actionConfig, variableName: e.target.value, value: '' })}
                >
                  <option value="">选择变量</option>
                  {(activeScreen?.globalStates ?? []).map((gs) => (
                    <option key={gs.name} value={gs.name}>{gs.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">值:</span>
                {(() => {
                  const gsVar = (activeScreen?.globalStates ?? []).find((g) => g.name === actionConfig.variableName);
                  if (gsVar) {
                    return (
                      <select
                        className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400"
                        value={actionConfig.value ?? ''}
                        onChange={(e) => setActionConfig({ ...actionConfig, value: e.target.value })}
                      >
                        <option value="">选择值</option>
                        {gsVar.values.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    );
                  }
                  return (
                    <input
                      type="text"
                      className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                      placeholder="目标值"
                      value={actionConfig.value ?? ''}
                      onChange={(e) => setActionConfig({ ...actionConfig, value: e.target.value })}
                    />
                  );
                })()}
              </div>
            </>
          )}

          {actionConfig.type === 'toggleVisible' && (
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">目标节点</span>
              <input
                type="text"
                className="w-full h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
                placeholder="节点 ID"
                value={actionConfig.nodeId ?? ''}
                onChange={(e) => setActionConfig({ ...actionConfig, nodeId: e.target.value })}
              />
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="h-6 px-1.5 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
                  onClick={useCurrentSelectionAsTarget}
                >
                  使用当前选中
                </button>
                <button
                  type="button"
                  className={`h-6 px-1.5 text-[10px] rounded border ${
                    pickTargetMode
                      ? 'border-amber-400 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={beginPickTarget}
                >
                  在画布点选…
                </button>
              </div>
            </div>
          )}

          {actionConfig.type === 'openUrl' && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">URL:</span>
                <input
                  type="text"
                  className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                  placeholder="https://..."
                  value={actionConfig.url ?? ''}
                  onChange={(e) => setActionConfig({ ...actionConfig, url: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <input
                  type="checkbox"
                  checked={actionConfig.openInNewTab ?? true}
                  onChange={(e) => setActionConfig({ ...actionConfig, openInNewTab: e.target.checked })}
                />
                在新标签页中打开
              </label>
            </>
          )}

          {actionConfig.type === 'delay' && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">时长(ms):</span>
              <input
                type="number"
                min={1}
                className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                placeholder="300"
                value={actionConfig.duration ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value);
                  setActionConfig({ ...actionConfig, duration: v });
                }}
              />
            </div>
          )}

          {actionConfig.type === 'custom' && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] w-14 flex-shrink-0">标识:</span>
              <input
                type="text"
                className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
                placeholder="handler 名称"
                value={actionConfig.handler ?? ''}
                onChange={(e) => setActionConfig({ ...actionConfig, handler: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      {/* Condition (optional) */}
      {step >= 3 && (
        <div className="flex flex-col gap-1.5 mt-1 border-t border-gray-200 pt-1.5">
          <label className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <input
              type="checkbox"
              checked={conditionEnabled}
              onChange={(e) => setConditionEnabled(e.target.checked)}
            />
            执行条件
          </label>
          {conditionEnabled && (
            <div className="flex flex-col gap-1 pl-2 border-l-2 border-purple-200">
              <select
                className="h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as 'globalState' | 'expression')}
              >
                <option value="globalState">全局状态匹配</option>
                <option value="expression">自定义表达式</option>
              </select>
              {conditionType === 'globalState' && (
                <div className="flex items-center gap-1">
                  <select
                    className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
                    value={conditionVar}
                    onChange={(e) => setConditionVar(e.target.value)}
                  >
                    <option value="">选择变量</option>
                    {(activeScreen?.globalStates ?? []).map((gs) => (
                      <option key={gs.name} value={gs.name}>{gs.name}</option>
                    ))}
                  </select>
                  <span className="text-gray-400 text-[10px]">=</span>
                  {(() => {
                    const gs = (activeScreen?.globalStates ?? []).find((g) => g.name === conditionVar);
                    if (gs) {
                      return (
                        <select
                          className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
                          value={conditionVal}
                          onChange={(e) => setConditionVal(e.target.value)}
                        >
                          <option value="">选择值</option>
                          {gs.values.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      );
                    }
                    return (
                      <input
                        type="text"
                        className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none"
                        placeholder="匹配值"
                        value={conditionVal}
                        onChange={(e) => setConditionVal(e.target.value)}
                      />
                    );
                  })()}
                </div>
              )}
              {conditionType === 'expression' && (
                <input
                  type="text"
                  className="w-full h-6 px-1.5 border border-gray-200 rounded text-xs outline-none font-mono"
                  placeholder="globalStates.theme === 'dark'"
                  value={conditionExpr}
                  onChange={(e) => setConditionExpr(e.target.value)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 justify-end">
        {step < 3 && step >= 1 && (
          <button
            type="button"
            className="h-6 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            onClick={() => setStep((step + 1) as 2 | 3)}
          >
            下一步
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            className="h-6 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            onClick={handleSave}
          >
            保存
          </button>
        )}
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
