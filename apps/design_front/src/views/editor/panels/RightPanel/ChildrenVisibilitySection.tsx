import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Checkbox } from 'antd';
import type { ComponentNode } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';

type Props = {
  node: ComponentNode;
};

/**
 * 直接子元素可见性（default 态写 node.visible；组件态 childrenVisibility）
 */
export const ChildrenVisibilitySection = observer(function ChildrenVisibilitySection({ node }: Props) {
  const children = node.children ?? [];
  if (children.length === 0) return null;

  const customStates = (node.states ?? []).filter(
    (s) => !['default', 'hover', 'pressed', 'focus', 'disabled'].includes(s.name),
  );
  const hasCustomStates = customStates.length > 0;

  return (
    <div className="space-y-1 px-2">
      {children.map((c) => (
        <ChildVisibilityRow
          key={c.id}
          child={c}
          parentNode={node}
          hasCustomStates={hasCustomStates}
          customStates={customStates}
        />
      ))}
    </div>
  );
});

const ChildVisibilityRow = observer(function ChildVisibilityRow({
  child,
  parentNode,
  hasCustomStates,
  customStates,
}: {
  child: ComponentNode;
  parentNode: ComponentNode;
  hasCustomStates: boolean;
  customStates: Array<{ name: string; childrenVisibility?: Record<string, boolean> }>;
}) {
  const [showCondition, setShowCondition] = useState(false);

  const isHiddenInAnyState = customStates.some(
    (s) => s.childrenVisibility?.[child.id] === false,
  );
  const visibleInStates = customStates
    .filter((s) => s.childrenVisibility?.[child.id] !== false)
    .map((s) => s.name);
  const isConditional = isHiddenInAnyState && visibleInStates.length < customStates.length;

  return (
    <div className="border-b border-gray-50 pb-1 last:border-0">
      <div className="flex items-center gap-2 text-xs text-gray-700">
        <Checkbox
          checked={child.visible !== false}
          onChange={(e) =>
            editorStore.execute({
              type: 'setNodeVisible',
              params: { nodeId: child.id, visible: e.target.checked },
            })
          }
        />
        <span className="truncate flex-1">{child.name || child.type}</span>
        {isConditional && (
          <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 rounded">
            条件
          </span>
        )}
        {hasCustomStates && (
          <button
            type="button"
            className={`text-[10px] px-1 rounded transition-colors ${
              showCondition ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'
            }`}
            onClick={() => setShowCondition(!showCondition)}
            title="显示条件"
          >
            👁
          </button>
        )}
        <code className="text-[10px] text-gray-400">{child.id.slice(0, 6)}</code>
      </div>

      {showCondition && hasCustomStates && (
        <VisibilityConditionEditor
          childId={child.id}
          parentNode={parentNode}
          customStates={customStates}
        />
      )}
    </div>
  );
});

/**
 * 显示条件编辑器 — 设置子元素在哪些自定义状态下可见
 */
const VisibilityConditionEditor = observer(function VisibilityConditionEditor({
  childId,
  parentNode,
  customStates,
}: {
  childId: string;
  parentNode: ComponentNode;
  customStates: Array<{ name: string; childrenVisibility?: Record<string, boolean> }>;
}) {
  const visibleInAll = customStates.every(
    (s) => s.childrenVisibility?.[childId] !== false,
  );
  const currentVisibleStates = customStates
    .filter((s) => s.childrenVisibility?.[childId] !== false)
    .map((s) => s.name);

  const [mode, setMode] = useState<'always' | 'conditional'>(
    visibleInAll ? 'always' : 'conditional',
  );

  const handleModeChange = (newMode: 'always' | 'conditional') => {
    setMode(newMode);
    if (newMode === 'always') {
      editorStore.execute({
        type: 'setChildVisibility',
        params: {
          parentNodeId: parentNode.id,
          childNodeId: childId,
          visibleInStates: customStates.map((s) => s.name),
        },
      } as never);
    } else {
      editorStore.execute({
        type: 'setChildVisibility',
        params: {
          parentNodeId: parentNode.id,
          childNodeId: childId,
          visibleInStates: [],
        },
      } as never);
    }
  };

  const handleToggleState = (stateName: string, checked: boolean) => {
    const newVisible = checked
      ? [...currentVisibleStates, stateName]
      : currentVisibleStates.filter((n) => n !== stateName);

    editorStore.execute({
      type: 'setChildVisibility',
      params: {
        parentNodeId: parentNode.id,
        childNodeId: childId,
        visibleInStates: newVisible,
      },
    } as never);
  };

  return (
    <div className="ml-6 mt-1 mb-1 p-1.5 border border-indigo-100 rounded bg-indigo-50/30">
      <div className="text-[10px] text-gray-500 font-medium mb-1">显示条件</div>
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer">
          <input
            type="radio"
            name={`vis-${childId}`}
            checked={mode === 'always'}
            onChange={() => handleModeChange('always')}
            className="w-3 h-3"
          />
          始终显示
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer">
          <input
            type="radio"
            name={`vis-${childId}`}
            checked={mode === 'conditional'}
            onChange={() => handleModeChange('conditional')}
            className="w-3 h-3"
          />
          仅在以下状态显示
        </label>
        {mode === 'conditional' && (
          <div className="ml-4 flex flex-col gap-0.5">
            {customStates.map((s) => (
              <label
                key={s.name}
                className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer"
              >
                <Checkbox
                  checked={s.childrenVisibility?.[childId] !== false}
                  onChange={(e) => handleToggleState(s.name, e.target.checked)}
                  style={{ transform: 'scale(0.8)' }}
                />
                <span className="text-indigo-600 bg-indigo-50 px-1 rounded">{s.name}</span>
              </label>
            ))}
            {customStates.length === 0 && (
              <span className="text-[10px] text-gray-400">暂无自定义状态</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
