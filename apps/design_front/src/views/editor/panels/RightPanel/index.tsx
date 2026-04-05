import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { findNodeInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';
import { StylesTab } from '../tabs/StylesTab';
import { PropsTab } from '../tabs/PropsTab';
import { DataTab } from '../tabs/DataTab';
import { InteractionsTab } from '../tabs/InteractionsTab';
import { CodeTab } from '../tabs/CodeTab';
import { StateContextBar } from './StateContextBar';
import { CollapsibleSection } from './CollapsibleSection';
import { ChildrenVisibilitySection } from './ChildrenVisibilitySection';
import { NodeVisibilityCondition } from './NodeVisibilityCondition';
import { DomainStateResponseSection } from './DomainStateResponseSection';

/**
 * 右侧面板 v2 — 按产品设计重写。
 *
 * 结构：
 *   A. 元素头部（固定） — 类型 + 名称 + 锁定/可见
 *   B. 状态切换器（固定） — 交互态 + 自定义状态
 *   C. 编辑区（滚动）：
 *      1. 内容 — 文本、元素属性、组件 Props
 *      2. 外观 — CSS 八组样式编辑器
 *      3. 子元素 — 子元素可见性（容器独有）
 *      4. 行为 — 事件列表
 *      5. 高级 — 状态响应 + 代码预览
 */
export const RightPanel = observer(function RightPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nodeId = editorStore.selectedNodeIds[0];
  const node = nodeId ? findNodeInScreens(editorStore.screens, nodeId) : null;
  const target = editorStore.rightPanelScrollToSection;

  useEffect(() => {
    if (!target) return;
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-right-section="${target}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    editorStore.clearRightPanelScrollTarget();
  }, [target]);

  const hasChildren = node && (node.children?.length ?? 0) > 0;
  const hasEvents = node && (node.events ?? []).length > 0;
  const hasDomainBindings = node && (node.domainStateBindings ?? []).length > 0;

  // No selection → page-level info
  if (!node && editorStore.selectedNodeIds.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white">
        <StateContextBar />
        <NoSelectionView />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* B. State Switcher (fixed) */}
      <StateContextBar />

      {/* A. Element Header (fixed) */}
      {node && <ElementHeader node={node} />}

      {editorStore.selectedNodeIds.length > 1 && (
        <div className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] border-b border-blue-100">
          已选中 {editorStore.selectedNodeIds.length} 个元素（编辑将批量应用）
        </div>
      )}

      {/* C. Scrollable editing area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* 1. 内容 */}
        <CollapsibleSection id="sec-content" title="内容">
          <span data-right-section="props" className="block">
            <PropsTab />
          </span>
        </CollapsibleSection>

        {/* 2. 外观 */}
        <CollapsibleSection id="sec-appearance" title="外观">
          <span data-right-section="styles" className="block">
            <StylesTab />
          </span>
        </CollapsibleSection>

        {/* 2.5 显示条件 — 选中节点自身的状态可见性 */}
        {node && (
          <NodeVisibilityCondition node={node} />
        )}

        {/* 3. 子元素（仅容器） */}
        {hasChildren && (
          <CollapsibleSection id="sec-children" title="子元素">
            <span data-right-section="children" className="block">
              <ChildrenVisibilitySection node={node} />
            </span>
          </CollapsibleSection>
        )}

        {/* 4. 行为 */}
        <CollapsibleSection
          id="sec-behavior"
          title={hasEvents ? '行为 ·' : '行为'}
          defaultOpen={false}
        >
          <span data-right-section="events" className="block">
            <InteractionsTab />
          </span>
        </CollapsibleSection>

        {/* 5. 高级 */}
        <CollapsibleSection id="sec-advanced" title="高级" defaultOpen={false}>
          {/* 5a. Domain state response (low-frequency) */}
          {node && (
            <div data-right-section="states" className="mb-2">
              <DomainStateResponseSection nodeId={node.id} />
            </div>
          )}

          {/* 5b. Data (kept inline for now) */}
          <div data-right-section="data" className="mb-2">
            <div className="text-[10px] text-gray-500 font-medium mb-1 px-2">数据</div>
            <DataTab />
          </div>

          {/* 5c. Code preview */}
          <div data-right-section="code">
            <div className="text-[10px] text-gray-500 font-medium mb-1 px-2">代码预览</div>
            <CodeTab />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
});

// ── Element Header ──

const ElementHeader = observer(function ElementHeader({
  node,
}: {
  node: { id: string; type: string; name?: string; locked?: boolean; visible?: boolean };
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
      <code className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-medium">
        {node.type}
      </code>
      <span className="text-xs text-gray-700 truncate flex-1 font-medium">
        {node.name || node.id.slice(0, 8)}
      </span>
      <button
        type="button"
        className={`p-0.5 transition-colors ${node.locked ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'}`}
        title={node.locked ? '解锁' : '锁定'}
        onClick={() =>
          editorStore.execute({ type: 'setNodeLocked', params: { nodeId: node.id, locked: !node.locked } })
        }
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              node.locked
                ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                : 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z'
            }
          />
        </svg>
      </button>
      <button
        type="button"
        className={`p-0.5 transition-colors ${node.visible === false ? 'text-red-400' : 'text-gray-300 hover:text-gray-500'}`}
        title={node.visible === false ? '显示' : '隐藏'}
        onClick={() =>
          editorStore.execute({
            type: 'setNodeVisible',
            params: { nodeId: node.id, visible: node.visible === false },
          })
        }
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              node.visible === false
                ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18'
                : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
            }
          />
        </svg>
      </button>
      <span className="text-[10px] text-gray-400 font-mono">{node.id.slice(0, 6)}</span>
    </div>
  );
});

// ── No Selection View ──

const NoSelectionView = observer(function NoSelectionView() {
  const screen = editorStore.activeScreen;
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
      <div className="text-sm text-gray-700 font-medium mb-1">
        {screen?.name ?? '未命名页面'}
      </div>
      <div className="text-[11px] text-gray-400 mb-6">
        {screen ? `${screen.rootNode ? '页面已创建' : '空页面'}` : ''}
      </div>
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        <button
          type="button"
          className="w-full py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
          onClick={() => editorStore.focusRightPanelSection('data')}
        >
          📊 数据管理
        </button>
      </div>
    </div>
  );
});
