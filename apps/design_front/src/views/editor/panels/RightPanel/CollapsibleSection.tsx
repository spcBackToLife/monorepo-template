import type { ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';

type Props = {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

/**
 * 可折叠区块：折叠状态由 editorStore.collapsedSections 持久（会话内）。
 */
export const CollapsibleSection = observer(function CollapsibleSection({
  id,
  title,
  children,
  defaultOpen = true,
}: Props) {
  const collapsed = editorStore.collapsedSections[id] ?? !defaultOpen;

  return (
    <section className="border-b border-gray-100">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
        onClick={() => editorStore.toggleSectionCollapsed(id)}
      >
        <span>{title}</span>
        <span className="text-gray-400">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && <div className="px-1 pb-3">{children}</div>}
    </section>
  );
});
