/**
 * Interactions Tab — 节点事件列表 / 新建事件表单（v2 动词模型）。
 *
 * 文件结构（按 AGENTS.md §四.4.2 单文件 ≤ 300 行原则拆分）：
 *   - constants.ts        — TRIGGER_OPTIONS / ACTION_TYPES / 工具
 *   - ActionForms.tsx     — 各 v2 动词的参数表单
 *   - ActionChainEditor.tsx — 动作链编辑器（顶层 + effect.fetch 子链）
 *   - ActionBadge.tsx     — 折叠态徽章
 *   - EventCard.tsx       — 单事件卡片
 *   - AddEventForm.tsx    — 新建事件
 *   - index.tsx           — 薄容器（本文件）
 */

import { useState } from 'react';
import { Empty } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import type { LooseAction } from './constants';
import { EventCard } from './EventCard';
import { AddEventForm } from './AddEventForm';

export const InteractionsTab = observer(function InteractionsTab() {
  const selectedId = editorStore.selectedNodeIds[0];
  const screens = editorStore.screens;

  /**
   * 添加事件表单打开时锁定「宿主节点」，避免在画布点选目标时
   * selectedNodeIds 变化导致面板切到别的节点。
   */
  const [addingEventHostId, setAddingEventHostId] = useState<string | null>(null);
  const nodeId = addingEventHostId !== null ? addingEventHostId : selectedId;

  if (!nodeId) {
    return <Empty description="请先选中一个元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const node = findNodeInScreens(screens, nodeId);
  if (!node) {
    return <Empty description="节点未找到" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  // 编辑期 events 形态偏宽松，作为 LooseAction[] 处理
  const events = (node.events ?? []) as unknown as Array<{
    trigger: string;
    actions: LooseAction[];
    condition?: { when: string };
    description?: string;
    disabled?: boolean;
  }>;

  return (
    <div className="flex flex-col gap-2 p-2 text-xs">
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

      <AddEventForm
        hostNodeId={nodeId}
        onOpen={() => setAddingEventHostId(editorStore.selectedNodeIds[0] ?? null)}
        onClose={() => setAddingEventHostId(null)}
      />
    </div>
  );
});
