import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { ComponentNode } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';

type Props = {
  node: ComponentNode;
};

const BUILT_IN_STATES = new Set(['default', 'hover', 'pressed', 'focus', 'disabled']);

/**
 * 子元素状态绑定 — 允许父容器指定子元素在特定状态下应使用的状态
 *
 * 当父容器处于某个自定义状态时，可以让指定的子元素自动切换到对应状态，
 * 从而实现父状态变化 → 子组件样式/可见性变化的联动效果。
 *
 * 例：EmailGroup 的 error 状态 → EmailInput 也切到 error 状态（显示红色边框）
 */
export const ChildrenStateBindings = observer(function ChildrenStateBindings({ node }: Props) {
  const children = node.children ?? [];
  if (children.length === 0) return null;

  // Only show for nodes with custom states
  const customStates = (node.states ?? []).filter((s) => !BUILT_IN_STATES.has(s.name));
  if (customStates.length === 0) return null;

  return (
    <div className="px-2 py-1.5">
      <div className="border border-amber-200 rounded-lg bg-amber-50/40 p-2">
        <div className="text-[11px] font-medium text-amber-700 mb-2">子元素状态绑定</div>

        <div className="flex flex-col gap-2">
          {customStates.map((state) => (
            <StateBindingGroup
              key={state.name}
              state={state}
              parentNode={node}
              children={children}
            />
          ))}
        </div>

        <div className="mt-2 text-[9px] text-gray-400 leading-relaxed">
          提示：当父容器切换到某个状态时，可以让子元素自动应用对应状态的样式和可见性。
        </div>
      </div>
    </div>
  );
});

interface StateBindingGroupProps {
  state: ComponentNode['states'][0];
  parentNode: ComponentNode;
  children: ComponentNode[];
}

const StateBindingGroup = observer(function StateBindingGroup({
  state,
  parentNode,
  children,
}: StateBindingGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const csMap = state.childrenStates ?? {};
  const boundCount = Object.keys(csMap).length;

  return (
    <div className="border border-amber-100 rounded bg-white/60">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-xs hover:bg-amber-50/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
            {state.name}
          </span>
        </div>
        {boundCount > 0 && (
          <span className="text-[10px] text-amber-500 font-medium">{boundCount} 个绑定</span>
        )}
      </button>

      {isExpanded && (
        <div className="px-2 py-1.5 border-t border-amber-100 bg-amber-50/30 space-y-1">
          {children.length === 0 ? (
            <div className="text-[10px] text-gray-400">暂无子元素</div>
          ) : (
            children.map((child) => (
              <StateBindingRow
                key={child.id}
                child={child}
                state={state}
                parentNode={parentNode}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

interface StateBindingRowProps {
  child: ComponentNode;
  state: ComponentNode['states'][0];
  parentNode: ComponentNode;
}

const StateBindingRow = observer(function StateBindingRow({
  child,
  state,
  parentNode,
}: StateBindingRowProps) {
  const csMap = state.childrenStates ?? {};
  const currentBinding = csMap[child.id];

  // Get available states for this child
  const childStates = (child.states ?? []).map((s) => s.name);
  if (!childStates.includes('default')) {
    childStates.unshift('default');
  }

  const handleBindingChange = (targetState: string | null) => {
    const newChildrenStates = { ...csMap };
    if (targetState === null) {
      delete newChildrenStates[child.id];
    } else {
      newChildrenStates[child.id] = targetState;
    }

    editorStore.execute({
      type: 'updateState',
      params: {
        nodeId: parentNode.id,
        stateName: state.name,
        childrenStates: newChildrenStates,
      },
    } as never);
  };

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
      <span className="truncate flex-1 font-medium text-gray-600">
        {child.name || child.type}
      </span>

      <select
        value={currentBinding ?? ''}
        onChange={(e) => handleBindingChange(e.target.value || null)}
        className="text-[10px] px-1.5 py-0.5 rounded border border-amber-200 bg-white hover:border-amber-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 cursor-pointer"
      >
        <option value="">— 不绑定 —</option>
        {childStates.map((stateName) => (
          <option key={stateName} value={stateName}>
            → {stateName}
          </option>
        ))}
      </select>

      <code className="text-[10px] text-gray-400 flex-shrink-0">{child.id.slice(0, 6)}</code>
    </div>
  );
});
