import { useState, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Checkbox } from 'antd';
import type { ComponentNode } from '@globallink/design-schema';
import { findParentInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';

type Props = { node: ComponentNode };

const BUILT_IN_STATES = new Set(['default', 'hover', 'pressed', 'focus', 'disabled']);

/**
 * 「显示条件」— 直接在选中节点的面板上展示。
 * 读取父节点的 states → childrenVisibility，显示当前节点在哪些自定义状态下可见。
 * 如果父节点无自定义状态，则不渲染。
 */
export const NodeVisibilityCondition = observer(function NodeVisibilityCondition({ node }: Props) {
  const parentResult = findParentInScreens(editorStore.screens, node.id);
  const parent = parentResult?.parent ?? null;
  const parentId = parent?.id ?? '';

  const customStates = useMemo(
    () => (parent?.states ?? []).filter((s) => !BUILT_IN_STATES.has(s.name)),
    [parent?.states],
  );

  const hiddenInAny = customStates.some((s) => s.childrenVisibility?.[node.id] === false);
  const visibleIn = customStates
    .filter((s) => s.childrenVisibility?.[node.id] !== false)
    .map((s) => s.name);

  const [mode, setMode] = useState<'always' | 'conditional'>('always');

  useEffect(() => {
    setMode(hiddenInAny ? 'conditional' : 'always');
  }, [node.id, parentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nothing to show if no parent or no custom states
  if (!parent || customStates.length === 0) return null;

  const handleToggleState = (stateName: string, checked: boolean) => {
    const newVisible = checked
      ? [...visibleIn, stateName]
      : visibleIn.filter((n) => n !== stateName);
    editorStore.execute({
      type: 'setChildVisibility',
      params: {
        parentNodeId: parent.id,
        childNodeId: node.id,
        visibleInStates: newVisible,
      },
    } as never);
  };

  const handleSetAlwaysVisible = () => {
    setMode('always');
    editorStore.execute({
      type: 'setChildVisibility',
      params: {
        parentNodeId: parent.id,
        childNodeId: node.id,
        visibleInStates: customStates.map((s) => s.name),
      },
    } as never);
  };

  const handleSetConditional = () => {
    setMode('conditional');
    editorStore.execute({
      type: 'setChildVisibility',
      params: {
        parentNodeId: parent.id,
        childNodeId: node.id,
        visibleInStates: [],
      },
    } as never);
  };

  const isConditionalMode = mode === 'conditional';

  return (
    <div className="px-2 py-1.5">
      <div className="border border-indigo-200 rounded-lg bg-indigo-50/40 p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-indigo-700">显示条件</span>
          {isConditionalMode && (
            <span className="text-[9px] text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded">
              条件显示
            </span>
          )}
        </div>

        <div className="text-[10px] text-gray-500 mb-2">
          父容器「{parent.name || parent.type}」有 {customStates.length} 个自定义状态
        </div>

        <div className="flex flex-col gap-1 mb-2">
          <label className="flex items-center gap-1.5 text-[10px] text-gray-700 cursor-pointer">
            <input
              type="radio"
              name={`vis-self-${node.id}`}
              checked={!isConditionalMode}
              onChange={handleSetAlwaysVisible}
              className="w-3 h-3 accent-indigo-500"
            />
            所有状态都显示
          </label>
          <label className="flex items-center gap-1.5 text-[10px] text-gray-700 cursor-pointer">
            <input
              type="radio"
              name={`vis-self-${node.id}`}
              checked={isConditionalMode}
              onChange={handleSetConditional}
              className="w-3 h-3 accent-indigo-500"
            />
            仅在指定状态显示
          </label>
        </div>

        {isConditionalMode && (
          <div className="flex flex-col gap-0.5 pl-1 border-l-2 border-indigo-200 ml-1">
            {customStates.map((s) => (
              <label
                key={s.name}
                className="flex items-center gap-1.5 py-0.5 text-[10px] text-gray-700 cursor-pointer hover:bg-indigo-50 rounded px-1"
              >
                <Checkbox
                  checked={s.childrenVisibility?.[node.id] !== false}
                  onChange={(e) => handleToggleState(s.name, e.target.checked)}
                  style={{ transform: 'scale(0.8)' }}
                />
                <span className="text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded font-medium">
                  {s.name}
                </span>
              </label>
            ))}
          </div>
        )}

        {isConditionalMode && (
          <div className="mt-2 text-[9px] text-gray-400 leading-relaxed">
            提示：此组件将在未勾选的状态下以虚影形式显示在画布上，预览时完全隐藏。
            <br />
            在事件链中使用「设置状态」动作切换父容器到对应状态即可触发显示。
          </div>
        )}
      </div>
    </div>
  );
});
