import { Tree, Typography, Empty } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { observer } from 'mobx-react-lite';
import type { ComponentNode } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import './nodeTree.css';

function toTreeData(node: ComponentNode): DataNode {
  return {
    key: node.id,
    title: (
      <span>
        <code className="node-tag">{node.type}</code>
        <span className="node-name">{node.name ?? node.id.slice(0, 6)}</span>
      </span>
    ),
    children: (node.children ?? []).map(toTreeData),
  };
}

export const NodeTree = observer(function NodeTree() {
  const screen = editorStore.activeScreen;
  if (!screen) {
    return <Empty description="暂无节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="node-tree-wrap">
      <Typography.Text strong className="node-tree-title">
        节点树
      </Typography.Text>
      <Tree
        blockNode
        showLine
        defaultExpandAll
        selectedKeys={editorStore.selectedNodeIds}
        treeData={[toTreeData(screen.rootNode)]}
        onSelect={(keys) => editorStore.select((keys[0] as string) ?? null)}
      />
    </div>
  );
});

