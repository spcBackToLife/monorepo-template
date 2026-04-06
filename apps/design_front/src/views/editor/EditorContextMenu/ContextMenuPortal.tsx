import { useLayoutEffect, useEffect, useRef, useState } from 'react';
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
 * 支持自动调整位置以避免超出视口边界。
 */
export function EditorContextMenuPortal({ open, x, y, items, onClose, onMenuClick }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 计算菜单位置，避免超出视口 (useLayoutEffect 确保在浏览器绘制前调整位置)
  useLayoutEffect(() => {
    if (!open || !menuRef.current) {
      setAdjustedPos({ x, y });
      return;
    }

    // 获取菜单的实际尺寸
    const rect = menuRef.current.getBoundingClientRect();
    const menuWidth = rect.width || 200; // 默认宽度
    const menuHeight = rect.height || 300; // 默认高度

    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 计算调整后的位置
    let adjustedX = x;
    let adjustedY = y;

    // 处理右边界
    if (x + menuWidth > viewportWidth) {
      adjustedX = Math.max(0, viewportWidth - menuWidth - 8); // 留 8px 边距
    }

    // 处理下边界
    if (y + menuHeight > viewportHeight) {
      adjustedY = Math.max(0, viewportHeight - menuHeight - 8); // 留 8px 边距
    }

    setAdjustedPos({ x: adjustedX, y: adjustedY });
  }, [open, x, y]);

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
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: adjustedPos.x,
          top: adjustedPos.y,
          zIndex: 9999,
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
