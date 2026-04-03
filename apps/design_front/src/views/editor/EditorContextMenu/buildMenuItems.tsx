import type { MenuProps } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { editorStore } from '@/stores/editor';

/** 画布 / 节点树共用的右键菜单项（01-canvas §十、08-layer-tree MVP） */
export function buildEditorContextMenuItems(
  targetNodeId: string | null,
  _rootNodeId: string,
): MenuProps['items'] {
  if (!targetNodeId) {
    return [
      { key: 'paste', label: '粘贴' },
      { type: 'divider' },
      { key: 'zoom100', label: '缩放到 100%' },
      { key: 'fit', label: '适配画布（100% 且重置平移）' },
    ];
  }

  const isRoot = targetNodeId === _rootNodeId;

  return [
    { key: 'copy', label: '复制', extra: '⌘C' },
    { key: 'dup', label: '复制副本', disabled: isRoot, extra: '⌘D' },
    { key: 'del', label: '删除', danger: true, disabled: isRoot, extra: '⌫' },
    { type: 'divider' },
    { key: 'copyStyles', label: '复制样式', extra: '⌘⇧C' },
    {
      key: 'pasteStyles',
      label: '粘贴样式',
      disabled: !editorStore.styleClipboard,
      extra: '⌘⇧V',
    },
    { key: 'resetStyles', label: '重置样式' },
    { type: 'divider' },
    { key: 'wrap', label: '包裹为容器', disabled: isRoot },
    { key: 'asset', label: '设计素材…' },
  ];
}

export function handleEditorContextMenuClick(
  key: string,
  targetNodeId: string | null,
  rootNodeId: string,
  message: MessageInstance,
): void {
  if (!targetNodeId) {
    if (key === 'paste') {
      void editorStore.pasteFromClipboard().then((r) => {
        if (!r.success) message.error(r.description);
      });
      return;
    }
    if (key === 'zoom100') editorStore.setCanvasScale(1);
    if (key === 'fit') {
      editorStore.setCanvasScale(1);
      editorStore.setCanvasPan(0, 0);
    }
    return;
  }

  const isRoot = targetNodeId === rootNodeId;

  if (key === 'copy') {
    editorStore.copyNodeToClipboard(targetNodeId);
    return;
  }

  if (key === 'copyStyles') {
    editorStore.copyStyles(targetNodeId);
    return;
  }

  if (key === 'pasteStyles') {
    const selected = editorStore.selectedNodeIds;
    const ids = selected.includes(targetNodeId) ? undefined : [targetNodeId];
    editorStore.pasteStyles(ids);
    return;
  }

  if (key === 'resetStyles') {
    const selected = editorStore.selectedNodeIds;
    const ids = selected.includes(targetNodeId) ? undefined : [targetNodeId];
    editorStore.resetStyles(ids);
    return;
  }

  if (key === 'asset') {
    message.info('素材设计器将在资产 Phase 接入');
    return;
  }

  if (key === 'dup') {
    if (isRoot) return;
    const r = editorStore.execute({ type: 'duplicateElement', params: { elementId: targetNodeId } });
    if (r.success && r.affectedNodeIds[1]) {
      editorStore.select(r.affectedNodeIds[1]);
    } else if (!r.success) {
      message.error(r.description);
    }
    return;
  }

  if (key === 'del') {
    if (isRoot) return;
    editorStore.execute({ type: 'removeElement', params: { elementId: targetNodeId } });
    editorStore.select(null);
    return;
  }

  if (key === 'wrap') {
    if (isRoot) return;
    const r = editorStore.execute({
      type: 'wrapInContainer',
      params: {
        nodeIds: [targetNodeId],
        containerTag: 'div',
        containerStyles: { display: 'flex', flexDirection: 'column', position: 'relative' },
      },
    });
    if (!r.success) message.error(r.description);
  }
}
