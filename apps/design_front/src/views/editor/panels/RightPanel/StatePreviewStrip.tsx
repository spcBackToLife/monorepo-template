import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import type { ComponentTemplate, Screen } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { StatePreviewThumbnail } from './StatePreviewThumbnail';

const INTERACTION_STATES = [
  { value: 'default', label: '默认' },
  { value: 'hover', label: '悬停' },
  { value: 'pressed', label: '按下' },
  { value: 'focus', label: '聚焦' },
  { value: 'disabled', label: '禁用' },
] as const;

const MAX_THUMBNAILS = 8;

interface StatePreviewStripProps {
  nodeId: string;
  screen: Screen;
  assets: ComponentTemplate[];
  /** All states defined on the node (from node.states) */
  allNodeStates: Array<{ name: string }>;
  /** Currently active state name */
  currentState: string;
  /** Called when user clicks a thumbnail to switch state */
  onStateSelect: (stateName: string) => void;
}

/**
 * StatePreviewStrip — 状态预览缩略图条。
 *
 * 位于右侧面板 StateContextBar 下方，横向排列各状态的缩略图预览。
 * 可折叠，折叠状态持久化到 localStorage。
 * 点击缩略图切换编辑状态，点击"全景对比"跳转全景路由。
 */
export const StatePreviewStrip = observer(function StatePreviewStrip({
  nodeId,
  screen,
  assets,
  allNodeStates,
  currentState,
  onStateSelect,
}: StatePreviewStripProps) {
  const navigate = useNavigate();
  const expanded = editorStore.statePreviewStripExpanded;

  // Build the complete list: interaction states + custom states
  const interactionNames = new Set<string>(INTERACTION_STATES.map((s) => s.value));
  const customStates = allNodeStates
    .filter((s) => s.name !== 'default' && !interactionNames.has(s.name))
    .map((s) => ({ value: s.name, label: s.name }));

  const allStates = [
    ...INTERACTION_STATES.map((s) => ({ value: s.value, label: s.label })),
    ...customStates,
  ];

  const visible = allStates.slice(0, MAX_THUMBNAILS);
  const overflow = allStates.length - MAX_THUMBNAILS;

  return (
    <div className="border-t border-gray-100">
      {/* Header */}
      <div
        className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-gray-50 select-none"
        onClick={() => editorStore.toggleStatePreviewStrip()}
      >
        <span className="text-[10px] text-gray-400">
          {expanded ? '▾' : '▸'} 状态预览
        </span>
        <span className="flex-1" />
        <button
          type="button"
          className="text-[10px] text-blue-500 hover:text-blue-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`panorama?node=${nodeId}`);
          }}
        >
          全景对比 ↗
        </button>
      </div>

      {/* Thumbnails — only when expanded */}
      {expanded && (
        <div
          className="flex gap-2 px-2 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {visible.map((state) => (
            <StatePreviewThumbnail
              key={state.value}
              screen={screen}
              assets={assets}
              nodeId={nodeId}
              stateName={state.value}
              label={state.label}
              isActive={currentState === state.value}
              onClick={() => onStateSelect(state.value)}
            />
          ))}
          {overflow > 0 && (
            <button
              type="button"
              className="flex-shrink-0 rounded border border-dashed border-gray-200 flex items-center justify-center text-[10px] text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors"
              style={{ width: 80, height: 60 }}
              onClick={() => navigate(`panorama?node=${nodeId}`)}
            >
              +{overflow} 更多
            </button>
          )}
        </div>
      )}
    </div>
  );
});
