import { useLayoutEffect, useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
 *
 * ⚠️ 遮罩使用 mousedown 关闭，不能用 click —— 因为 Ant Design 的
 * SubMenu popup 是渲染在 body 下的独立 DOM 节点，鼠标从主菜单移向
 * 子菜单时会穿过遮罩层。如果用 onClick 则子菜单永远无法 hover 进入。
 */
export function EditorContextMenuPortal({ open, x, y, items, onClose, onMenuClick }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  // 判断 mousedown 目标是否在菜单 / 子菜单弹层内
  const isInsideMenu = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    // 主菜单容器
    if (menuRef.current?.contains(target)) return true;
    // Antd SubMenu popup 渲染在 body 下，class 包含 ant-menu-submenu-popup
    const popup = target.closest('.ant-menu-submenu-popup, .ant-menu');
    return !!popup;
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // 全局 mousedown：点击菜单/子菜单外部 → 关闭
    const onMouseDown = (e: MouseEvent) => {
      if (!isInsideMenu(e.target)) {
        onClose();
      }
    };

    // 全局右键：任何位置右键都关闭（让新的右键菜单接管）
    const onContextMenu = (e: MouseEvent) => {
      if (!isInsideMenu(e.target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('contextmenu', onContextMenu, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [open, onClose, isInsideMenu]);

  // 计算菜单位置，避免超出视口 (useLayoutEffect 确保在浏览器绘制前调整位置)
  useLayoutEffect(() => {
    if (!open || !menuRef.current) {
      setAdjustedPos({ x, y });
      return;
    }

    // 获取菜单的实际尺寸
    const rect = menuRef.current.getBoundingClientRect();
    const menuWidth = rect.width || 200;
    const menuHeight = rect.height || 300;

    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + menuWidth > viewportWidth) {
      adjustedX = Math.max(0, viewportWidth - menuWidth - 8);
    }
    if (y + menuHeight > viewportHeight) {
      adjustedY = Math.max(0, viewportHeight - menuHeight - 8);
    }

    setAdjustedPos({ x: adjustedX, y: adjustedY });
  }, [open, x, y]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 9999,
      }}
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
    </div>,
    document.body,
  );
}
