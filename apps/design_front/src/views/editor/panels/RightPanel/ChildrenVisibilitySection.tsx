import { observer } from 'mobx-react-lite';
import { Checkbox } from 'antd';
import type { ComponentNode } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';

type Props = {
  node: ComponentNode;
};

/**
 * 直接子元素可见性（default 态写 node.visible；扩展：组件态 childrenVisibility）
 */
export const ChildrenVisibilitySection = observer(function ChildrenVisibilitySection({ node }: Props) {
  const children = node.children ?? [];
  if (children.length === 0) return null;

  return (
    <div className="space-y-1 px-2">
      {children.map((c) => (
        <label
          key={c.id}
          className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"
        >
          <Checkbox
            checked={c.visible !== false}
            onChange={(e) =>
              editorStore.execute({
                type: 'setNodeVisible',
                params: { nodeId: c.id, visible: e.target.checked },
              })
            }
          />
          <span className="truncate">{c.name || c.type}</span>
          <code className="text-[10px] text-gray-400">{c.id.slice(0, 6)}</code>
        </label>
      ))}
    </div>
  );
});
