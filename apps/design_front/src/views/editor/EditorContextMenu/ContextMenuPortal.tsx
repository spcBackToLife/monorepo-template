import { useEffect } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';

type Props = {
  open: boolean;
  x: number;
  y: number;
  items: MenuProps['items'];
  onClose: () => void;
  onMenuClick: MenuProps['onClick'];
};

/**
 * 固定定位的右键菜单层：点击遮罩或 Escape 关闭。
 */
export function EditorContextMenuPortal({ open, x, y, items, onClose, onMenuClick }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        aria-hidden
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }} onClick={(e) => e.stopPropagation()}>
        <Menu
          mode="vertical"
          selectable={false}
          items={items}
          onClick={(info) => {
            onMenuClick?.(info);
            onClose();
          }}
        />
      </div>
    </>
  );
}
