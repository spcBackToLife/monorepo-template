import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import type { RightTabType } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import { StylesTab } from '../tabs/StylesTab';
import { StatesTab } from '../tabs/StatesTab';
import { PropsTab } from '../tabs/PropsTab';
import { DataTab } from '../tabs/DataTab';
import { InteractionsTab } from '../tabs/InteractionsTab';
import { CodeTab } from '../tabs/CodeTab';

const TABS: { key: RightTabType; label: string }[] = [
  { key: 'styles', label: '样式' },
  { key: 'props', label: '属性' },
  { key: 'states', label: '状态' },
  { key: 'events', label: '交互' },
  { key: 'data', label: '数据' },
  { key: 'code', label: '代码' },
];

/**
 * Task 1.6.1 + 2.4.8 — Property Panel (Right Panel)
 * Element info bar + 6 tab按钮：样式 / 属性 / 状态 / 交互 / 数据 / 代码（JSON）。
 * Blue dot indicators on States and Props tabs when they have content.
 */
export const PropertyPanel = observer(function PropertyPanel() {
  const activeTab = editorStore.activeRightTab;
  const nodeId = editorStore.selectedNodeIds[0];
  const node = nodeId ? findNodeInScreens(editorStore.screens, nodeId) : null;

  // Compute blue dot indicators
  const hasStatesIndicator = (() => {
    if (!node) return false;
    const customStates = (node.states ?? []).filter((s) => s.name !== 'default');
    const hasBindings = (node.globalStateBindings ?? []).length > 0;
    return customStates.length > 0 || hasBindings;
  })();

  const hasPropsIndicator = (() => {
    if (!node) return false;
    const props = node.props ?? {};
    return Object.keys(props).some((key) => {
      const val = (props as Record<string, unknown>)[key];
      return val !== undefined && val !== null && val !== '';
    });
  })();

  const hasDataIndicator = (() => {
    const screen = editorStore.activeScreen;
    if (!screen) return false;
    const hasDataSets = (screen.dataSets ?? []).length > 0;
    // Check if any node has bound expressions (props starting with __bind:)
    if (node) {
      const props = (node.props ?? {}) as Record<string, unknown>;
      const hasBoundExpressions = Object.keys(props).some((key) => {
        if (key.startsWith('__bind:')) return true;
        const v = props[key];
        return typeof v === 'string' && /\{\{.+?\}\}/.test(v);
      });
      return hasDataSets || hasBoundExpressions;
    }
    return hasDataSets;
  })();

  const hasEventsIndicator = (() => {
    if (!node) return false;
    const events = node?.events;
    return (events ?? []).length > 0;
  })();

  const getIndicator = (tabKey: RightTabType): boolean => {
    if (tabKey === 'states') return hasStatesIndicator;
    if (tabKey === 'props') return hasPropsIndicator;
    if (tabKey === 'data') return hasDataIndicator;
    if (tabKey === 'events') return hasEventsIndicator;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Element info bar */}
      {node && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <code className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
            {node.type}
          </code>
          <span className="text-xs text-gray-600 truncate flex-1">
            {node.name || node.id.slice(0, 8)}
          </span>
          {/* Quick lock toggle */}
          <button
            type="button"
            className={`p-0.5 transition-colors ${node.locked ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'}`}
            title={node.locked ? '解锁' : '锁定'}
            onClick={() => editorStore.execute({ type: 'setNodeLocked', params: { nodeId: node.id, locked: !node.locked } } as never)}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={node.locked ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' : 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z'} /></svg>
          </button>
          {/* Quick visibility toggle */}
          <button
            type="button"
            className={`p-0.5 transition-colors ${node.visible === false ? 'text-red-400' : 'text-gray-300 hover:text-gray-500'}`}
            title={node.visible === false ? '显示' : '隐藏'}
            onClick={() => editorStore.execute({ type: 'setNodeVisible', params: { nodeId: node.id, visible: node.visible === false } } as never)}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={node.visible === false ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} /></svg>
          </button>
          <span className="text-[10px] text-gray-400 font-mono">
            {node.id.slice(0, 6)}
          </span>
        </div>
      )}
      {/* Multi-select indicator */}
      {editorStore.selectedNodeIds.length > 1 && (
        <div className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] border-b border-blue-100">
          已选中 {editorStore.selectedNodeIds.length} 个元素（编辑将批量应用）
        </div>
      )}

      {/* Tab buttons */}
      <div className="flex border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`relative flex-1 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => editorStore.setActiveRightTab(tab.key)}
          >
            {tab.label}
            {getIndicator(tab.key) && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'styles' && <StylesTab />}
        {activeTab === 'props' && <PropsTab />}
        {activeTab === 'states' && <StatesTab />}
        {activeTab === 'events' && <InteractionsTab />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'code' && <CodeTab />}
      </div>
    </div>
  );
});
