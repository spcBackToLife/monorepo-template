import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Popconfirm } from 'antd';
import { findNodeInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';
import { StatePreviewStrip } from './StatePreviewStrip';

const INTERACTION_STATES = [
  { value: 'default', label: '默认' },
  { value: 'hover', label: '悬停' },
  { value: 'active', label: '按下' },
  { value: 'focus', label: '聚焦' },
  { value: 'disabled', label: '禁用' },
] as const;

const QUICK_STATES = ['loading', 'success', 'error', 'empty'];

/**
 * 状态切换器 — 右侧面板顶部固定区域。
 *
 * 职责：告诉用户「你在什么条件下编辑」，提供交互态和自定义状态的切换/管理。
 * 不包含领域状态变量管理（→ 左侧数据 Tab）和环境变量（→ 底部工具栏）。
 */
export const StateContextBar = observer(function StateContextBar() {
  const nodeId = editorStore.selectedNodeIds[0];
  const node = nodeId ? findNodeInScreens(editorStore.screens, nodeId) : null;
  const ctx = editorStore.stateContext;

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  if (!node && editorStore.selectedNodeIds.length === 0) {
    return (
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-500 text-center">
        选中画布上的元素开始编辑
      </div>
    );
  }

  const allStates = node?.states ?? [];
  const interactionNames: string[] = INTERACTION_STATES.map((s) => s.value);
  const customStates = allStates.filter(
    (s) => s.name !== 'default' && !interactionNames.includes(s.name),
  );
  const hasCustomStates = customStates.length > 0;

  const currentInteraction = ctx.interactionState;
  const currentCustom = ctx.componentStateEditing;

  const isNonDefault = currentInteraction !== 'default' || currentCustom != null;

  const handleInteractionClick = (value: string) => {
    editorStore.setStateContextInteraction(value);
    if (value !== 'default' && node && nodeId) {
      const exists = allStates.some((s) => s.name === value);
      if (!exists) {
        editorStore.execute({ type: 'visualState.add', params: { nodeId, stateName: value } });
      }
      editorStore.execute({ type: 'visualState.setActive', params: { nodeId, stateName: value } });
    } else if (value === 'default' && nodeId) {
      editorStore.execute({ type: 'visualState.setActive', params: { nodeId, stateName: 'default' } });
    }
  };

  const handleCustomSelect = (stateName: string | null) => {
    editorStore.setStateContextComponentState(stateName);
    if (nodeId) {
      editorStore.execute({
        type: 'visualState.setActive',
        params: { nodeId, stateName: stateName ?? 'default' },
      });
    }
    if (stateName) {
      editorStore.setStateContextInteraction('default');
    }
  };

  const handleAddCustomState = () => {
    const trimmed = newName.trim();
    if (!trimmed || !nodeId) return;
    if (allStates.some((s) => s.name === trimmed)) return;
    editorStore.execute({ type: 'visualState.add', params: { nodeId, stateName: trimmed } });
    handleCustomSelect(trimmed);
    setNewName('');
    setAdding(false);
  };

  const handleDeleteCustomState = (stateName: string) => {
    if (!nodeId) return;
    if (currentCustom === stateName) {
      handleCustomSelect(null);
    }
    editorStore.execute({ type: 'visualState.remove', params: { nodeId, stateName } });
  };

  const handleQuickAdd = (name: string) => {
    if (!nodeId) return;
    if (allStates.some((s) => s.name === name)) return;
    editorStore.execute({ type: 'visualState.add', params: { nodeId, stateName: name } });
    handleCustomSelect(name);
    setAdding(false);
    setNewName('');
  };

  const activeLabel = (() => {
    if (currentCustom) return currentCustom;
    if (currentInteraction !== 'default') {
      return INTERACTION_STATES.find((s) => s.value === currentInteraction)?.label ?? currentInteraction;
    }
    return null;
  })();

  return (
    <div className="border-b border-gray-200 bg-white flex-shrink-0">
      {/* Interaction state tabs */}
      <div className="flex items-center px-1 pt-1.5 pb-0.5">
        {INTERACTION_STATES.map((s) => {
          const isActive = currentInteraction === s.value && currentCustom == null;
          const hasOverride = allStates.some((st) => st.name === s.value);
          return (
            <button
              key={s.value}
              type="button"
              className={`relative flex-1 py-1.5 text-[11px] font-medium text-center transition-colors
                ${isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
                }`}
              onClick={() => {
                if (currentCustom) {
                  handleCustomSelect(null);
                }
                handleInteractionClick(s.value);
              }}
            >
              {s.label}
              {hasOverride && s.value !== 'default' && (
                <span className="absolute -top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom state row — only when custom states exist or user is adding */}
      {(hasCustomStates || adding) && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 flex-shrink-0">自定义</span>
          <div className="flex flex-wrap items-center gap-1 flex-1">
            {customStates.map((s) => {
              const isActive = currentCustom === s.name;
              return (
                <span key={s.name} className="inline-flex items-center gap-0.5">
                  <button
                    type="button"
                    className={`h-6 px-2 text-[11px] rounded-full transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => handleCustomSelect(isActive ? null : s.name)}
                  >
                    {s.name}
                  </button>
                  <Popconfirm
                    title={`删除状态「${s.name}」？`}
                    onConfirm={() => handleDeleteCustomState(s.name)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <button
                      type="button"
                      className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-500 text-[10px]"
                    >
                      ×
                    </button>
                  </Popconfirm>
                </span>
              );
            })}

            {adding ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  className="h-6 w-20 px-1.5 border border-blue-300 rounded text-[11px] outline-none focus:border-blue-500"
                  placeholder="状态名"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCustomState();
                    if (e.key === 'Escape') { setAdding(false); setNewName(''); }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="h-6 px-1.5 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600"
                  onClick={handleAddCustomState}
                >
                  确定
                </button>
                <button
                  type="button"
                  className="h-6 px-1.5 text-gray-400 text-[10px] hover:text-gray-600"
                  onClick={() => { setAdding(false); setNewName(''); }}
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="h-6 px-2 text-[11px] rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                onClick={() => setAdding(true)}
              >
                +
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick-add row when creating new custom state */}
      {adding && (
        <div className="flex items-center gap-1 px-2 pb-1.5">
          <span className="text-[10px] text-gray-400 flex-shrink-0">快捷</span>
          {QUICK_STATES
            .filter((qs) => !allStates.some((s) => s.name === qs))
            .map((qs) => (
              <button
                key={qs}
                type="button"
                className="h-5 px-2 text-[10px] rounded border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                onClick={() => handleQuickAdd(qs)}
              >
                {qs}
              </button>
            ))}
        </div>
      )}

      {/* Add custom state button — shown when no custom states exist and not adding */}
      {!hasCustomStates && !adding && (
        <div className="flex items-center px-2 pb-1.5 pt-0.5">
          <button
            type="button"
            className="text-[10px] text-gray-400 hover:text-blue-500 transition-colors"
            onClick={() => setAdding(true)}
          >
            + 添加自定义状态
          </button>
        </div>
      )}

      {/* Context indicator */}
      {isNonDefault && activeLabel && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-t border-blue-100">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-[11px] text-blue-700">
            正在编辑<strong>{'\u300C'}{activeLabel}{'\u300D'}</strong>状态
          </span>
          <span className="text-[10px] text-blue-500">覆盖值以蓝色标记</span>
        </div>
      )}

      {/* State preview thumbnail strip */}
      {node && nodeId && editorStore.activeScreen && (
        <StatePreviewStrip
          nodeId={nodeId}
          screen={editorStore.activeScreen}
          assets={editorStore.project?.componentAssets ?? []}
          allNodeStates={allStates}
          currentState={currentCustom ?? currentInteraction}
          onStateSelect={(stateName) => {
            const isInteraction = INTERACTION_STATES.some((s) => s.value === stateName);
            if (isInteraction) {
              if (currentCustom) handleCustomSelect(null);
              handleInteractionClick(stateName);
            } else {
              handleCustomSelect(stateName);
            }
          }}
        />
      )}
    </div>
  );
});
