/**
 * 动作链编辑器 — v2 模型唯一实现。
 *
 * 关键设计：
 * - 顶层链与 effect.fetch 子链共用本组件，靠 `variant` 切显示
 * - 每个动作步骤渲染：动词下拉 + 上下移 + 删除 + 类型专属参数表单
 * - effect.fetch 内部递归渲染 onSuccess/onError 子链（禁止再嵌 effect.fetch，避免无限循环）
 * - 切换动词类型时**保留**已填的跨类型共享字段（path/value/nodeId 等），用户体验更顺滑
 */

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import type { ActionType } from '@globallink/design-schema';
import {
  ACTION_TYPES,
  ACTION_TYPES_NO_EFFECT_FETCH,
  collectFlatNodes,
  type LooseAction,
} from './constants';
import {
  StateSetForm,
  StateAppendForm,
  StateMergeForm,
  StateRemoveForm,
  StateToggleForm,
  EffectCancelForm,
} from './StateForms';
import {
  NavGoForm,
  NavBackForm,
  NodeSetVisualStateForm,
  UiShowToastForm,
  UiOpenUrlForm,
  UiDelayForm,
  CustomForm,
} from './MiscForms';
import type { FormCtx } from './formCommon';

// ===== ActionChainEditor =====

interface ActionChainEditorProps {
  actions: LooseAction[];
  onChange: (actions: LooseAction[]) => void;
  /** 顶层事件链：inline；effect.fetch 子链：collapsible */
  variant?: 'inline' | 'collapsible';
  /** collapsible 模式下顶部标签 */
  label?: string;
  /** collapsible 模式下标签配色 */
  labelColor?: string;
  /** 是否允许 effect.fetch（嵌套子链内 false） */
  allowEffectFetch?: boolean;
  /** 宿主节点 id（提供给各 form 做兜底默认值） */
  hostNodeId: string;
}

export const ActionChainEditor = observer(function ActionChainEditor({
  actions,
  onChange,
  variant = 'inline',
  label,
  labelColor = '',
  allowEffectFetch = true,
  hostNodeId,
}: ActionChainEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const screens = editorStore.screens;
  const activeScreen = editorStore.activeScreen;
  const allNodes = activeScreen ? collectFlatNodes(activeScreen.rootNode) : [];
  const dataSources = activeScreen?.dataSources ?? [];

  const availableActionTypes = allowEffectFetch ? ACTION_TYPES : ACTION_TYPES_NO_EFFECT_FETCH;

  // ===== mutations =====

  const addAction = () => {
    onChange([...actions, { type: 'state.set' }]);
  };

  const removeAction = (idx: number) => {
    onChange(actions.filter((_, i) => i !== idx));
  };

  const moveAction = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= actions.length) return;
    const next = [...actions];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  /**
   * 切换动作类型时**保留**跨类型共享字段（path/value/dataSourceId/nodeId/duration 等）。
   * 仅清掉 type；用户先填表→改类型→不会丢已填值。
   */
  const updateActionType = (idx: number, type: ActionType) => {
    onChange(actions.map((a, i) => (i === idx ? { ...a, type } : a)));
  };

  const updateActionField = (idx: number) => (field: string, value: unknown) => {
    onChange(actions.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  };

  const updateActionFields = (idx: number) => (fields: Record<string, unknown>) => {
    onChange(actions.map((a, i) => (i === idx ? { ...a, ...fields } : a)));
  };

  // ===== render =====

  const chainBody = (
    <div className={variant === 'collapsible' ? 'mt-1 flex flex-col gap-1' : 'flex flex-col gap-1'}>
      {actions.map((action, i) => {
        const stepRowClass = variant === 'collapsible'
          ? 'flex flex-col gap-1 pl-2 border-l-2 border-current/20 bg-white/60 rounded p-1'
          : 'flex flex-col gap-1 pl-2 border-l-2 border-blue-200';
        const formCtx: FormCtx = {
          action,
          update: updateActionField(i),
          updateMany: updateActionFields(i),
          screens,
          allNodes,
          dataSources,
          hostNodeId,
        };
        return (
          <div key={i} className={stepRowClass}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
              <select
                className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
                value={action.type}
                onChange={(e) => updateActionType(i, e.target.value as ActionType)}
              >
                {availableActionTypes.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <button type="button" className="text-gray-400 hover:text-gray-600 text-[10px]" onClick={() => moveAction(i, -1)} title="上移">↑</button>
              <button type="button" className="text-gray-400 hover:text-gray-600 text-[10px]" onClick={() => moveAction(i, 1)} title="下移">↓</button>
              <button type="button" className="text-gray-400 hover:text-red-400 text-[10px]" onClick={() => removeAction(i)} title="删除">×</button>
            </div>

            <ActionParamsForm action={action} formCtx={formCtx} hostNodeId={hostNodeId} />
          </div>
        );
      })}
      <button
        type="button"
        className={
          variant === 'collapsible'
            ? 'h-5 px-2 text-[10px] border border-dashed border-current/30 rounded hover:border-current/60'
            : 'h-6 px-2 text-[10px] border border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500'
        }
        onClick={addAction}
      >+ 添加动作步骤</button>
    </div>
  );

  if (variant === 'collapsible') {
    return (
      <div className={`border rounded p-1.5 ${labelColor}`}>
        <button
          type="button"
          className="flex items-center gap-1 w-full text-[10px] font-medium"
          onClick={() => setExpanded(!expanded)}
        >
          <svg className={`w-2.5 h-2.5 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.293 7.293a1 1 0 011.414 0L10 9.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
          </svg>
          {label} ({actions.length})
        </button>
        {expanded && chainBody}
      </div>
    );
  }

  return chainBody;
});

// ===== Per-action params router =====
// 单独拎出来，避免主组件 if/else 链过长。

function ActionParamsForm({
  action,
  formCtx,
  hostNodeId,
}: {
  action: LooseAction;
  formCtx: FormCtx;
  hostNodeId: string;
}) {
  switch (action.type) {
    case 'state.set': return <StateSetForm {...formCtx} />;
    case 'state.append': return <StateAppendForm {...formCtx} />;
    case 'state.merge': return <StateMergeForm {...formCtx} />;
    case 'state.remove': return <StateRemoveForm {...formCtx} />;
    case 'state.toggle': return <StateToggleForm {...formCtx} />;
    case 'effect.fetch': return <EffectFetchForm action={action} formCtx={formCtx} hostNodeId={hostNodeId} />;
    case 'effect.cancel': return <EffectCancelForm {...formCtx} />;
    case 'nav.go': return <NavGoForm {...formCtx} />;
    case 'nav.back': return <NavBackForm />;
    case 'node.setVisualState': return <NodeSetVisualStateForm {...formCtx} />;
    case 'ui.showToast': return <UiShowToastForm {...formCtx} />;
    case 'ui.openUrl': return <UiOpenUrlForm {...formCtx} />;
    case 'ui.delay': return <UiDelayForm {...formCtx} />;
    case 'custom': return <CustomForm {...formCtx} />;
    default: return null;
  }
}

// ===== effect.fetch 表单（含 onSuccess/onError 嵌套子链） =====
// 因为要递归引用 ActionChainEditor，所以放在本文件内。

function EffectFetchForm({
  action,
  formCtx,
  hostNodeId,
}: {
  action: LooseAction;
  formCtx: FormCtx;
  hostNodeId: string;
}) {
  const { update, dataSources } = formCtx;
  const apiSources = dataSources.filter((d) => d.type === 'api');
  const dsId = typeof action.dataSourceId === 'string' ? action.dataSourceId : '';
  const paramsJson = typeof action.params === 'object' && action.params !== null
    ? JSON.stringify(action.params, null, 0)
    : '';

  return (
    <div className="flex flex-col gap-1 pl-4">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">数据源:</span>
        <select
          className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
          value={dsId}
          onChange={(e) => update('dataSourceId', e.target.value)}
        >
          <option value="">选择 api 数据源</option>
          {apiSources.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} {d.type === 'api' && d.endpoint ? `(${d.endpoint.method} ${d.endpoint.path})` : ''}
            </option>
          ))}
        </select>
      </div>
      {!apiSources.length && (
        <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          暂无 api 数据源，请先在「数据」面板创建。
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">params:</span>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none font-mono"
          placeholder='{"text":"{{ state.view.inputDraft }}"} 可选'
          value={paramsJson}
          onChange={(e) => {
            const txt = e.target.value;
            if (!txt) {
              update('params', undefined);
              return;
            }
            try {
              update('params', JSON.parse(txt));
            } catch {
              // 容错：暂存原文，让用户继续编辑；保存事件时会再次 parse
              update('params', txt);
            }
          }}
        />
      </div>
      <ActionChainEditor
        variant="collapsible"
        label="✅ 成功 (onSuccess)"
        labelColor="text-green-700 bg-green-50 border-green-200"
        actions={(action.onSuccess as LooseAction[] | undefined) ?? []}
        onChange={(subActions) => update('onSuccess', subActions)}
        allowEffectFetch={false}
        hostNodeId={hostNodeId}
      />
      <ActionChainEditor
        variant="collapsible"
        label="❌ 失败 (onError)"
        labelColor="text-red-700 bg-red-50 border-red-200"
        actions={(action.onError as LooseAction[] | undefined) ?? []}
        onChange={(subActions) => update('onError', subActions)}
        allowEffectFetch={false}
        hostNodeId={hostNodeId}
      />
    </div>
  );
}
