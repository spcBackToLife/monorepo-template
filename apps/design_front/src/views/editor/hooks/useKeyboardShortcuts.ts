import { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { editorStore } from '@/stores/editor';
import type { ToolType } from '@/stores/editor';
import { findParent, findNodeInScreens } from '@globallink/design-operations';

/**
 * Task 1.5.3 — Keyboard Shortcuts hook
 * Global keydown listener with shortcuts for tools, undo/redo, clipboard, etc.
 * Skips when focus is in input/textarea/contenteditable.
 */
export function useKeyboardShortcuts() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editorStore.previewMode && e.key === 'Escape') {
        e.preventDefault();
        editorStore.setPreviewMode(false);
        return;
      }

      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
      /** Tab / Enter / 方向键：在表单控件内保留浏览器默认行为，不劫持为画布树导航 */
      const skipTreeNavigation =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;

      const mod = e.metaKey || e.ctrlKey;

      // Shortcuts that work even in inputs
      if (mod && e.key === 's') {
        e.preventDefault();
        void editorStore.saveNow();
        return;
      }

      // Skip tool shortcuts when in editable fields
      if (isEditable) return;

      // Mod + key shortcuts
      if (mod) {
        if (e.key === '0') {
          e.preventDefault();
          editorStore.fitCanvasToViewport();
          return;
        }
        if (e.key === '1') {
          e.preventDefault();
          editorStore.zoomTo100Percent();
          return;
        }
        if (e.key === 'z' && e.shiftKey) {
          e.preventDefault();
          editorStore.redo();
          return;
        }
        if (e.key === 'z') {
          e.preventDefault();
          editorStore.undo();
          return;
        }
        if (e.key === 'c' && e.shiftKey) {
          e.preventDefault();
          editorStore.copyStyles();
          return;
        }
        if (e.key === 'v' && e.shiftKey) {
          e.preventDefault();
          editorStore.pasteStyles();
          return;
        }
        if (e.key === 'c') {
          e.preventDefault();
          editorStore.copySelectionToClipboard();
          return;
        }
        if (e.key === 'v') {
          e.preventDefault();
          void editorStore.pasteFromClipboard().then((r) => {
            if (!r.success) message.error(r.description);
          });
          return;
        }
        if (e.key === 'x') {
          e.preventDefault();
          editorStore.cutSelection();
          return;
        }
        if (e.key === 'd') {
          e.preventDefault();
          const id = editorStore.selectedNodeIds[0];
          const rootId = editorStore.activeScreen?.rootNode.id;
          if (!id || !rootId || id === rootId) return;
          const r = editorStore.execute({ type: 'duplicateElement', params: { elementId: id } });
          if (r.success && r.affectedNodeIds[1]) {
            editorStore.select(r.affectedNodeIds[1]);
          }
          return;
        }
        if (e.key === 'p') {
          e.preventDefault();
          editorStore.setPreviewMode(!editorStore.previewMode);
          return;
        }
        return;
      }

      // Tool shortcuts (single keys)
      const toolMap: Record<string, ToolType> = {
        v: 'select',
        V: 'select',
        f: 'container',
        F: 'container',
        r: 'element',
        R: 'element',
        t: 'text',
        T: 'text',
        c: 'component',
        C: 'component',
        a: 'annotation',
        A: 'annotation',
        h: 'hand',
        H: 'hand',
      };

      if (toolMap[e.key]) {
        e.preventDefault();
        const t = toolMap[e.key];
        editorStore.setActiveTool(t);
        if (t === 'component') {
          editorStore.requestOpenComponentLibrary();
        }
        return;
      }

      // Alt+1/2/3 — 左侧产品导航器视图
      if (e.altKey && (e.key === '1' || e.key === '2' || e.key === '3')) {
        e.preventDefault();
        editorStore.setLeftPanelView(e.key === '1' ? 'pages' : e.key === '2' ? 'elements' : 'data');
        return;
      }

      // Alt+Up/Down — reorder element within its parent
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const id = editorStore.selectedNodeIds[0];
        const screen = editorStore.activeScreen;
        if (!id || !screen) return;
        const parentResult = findParent(screen.rootNode, id);
        if (!parentResult) return;
        const parent = parentResult.parent;
        const siblings = parent.children ?? [];
        const idx = siblings.findIndex((c) => c.id === id);
        if (idx < 0) return;
        const newIdx = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= siblings.length) return;
        editorStore.execute({
          type: 'reorderElement',
          params: { nodeId: id, parentId: parent.id, newIndex: newIdx },
        } as never);
        return;
      }

      // Delete selected node(s)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const ids = [...editorStore.selectedNodeIds];
        for (const id of ids) {
          editorStore.execute({ type: 'removeElement', params: { elementId: id } });
        }
        editorStore.select(null);
        return;
      }

      // Escape → deselect
      if (e.key === 'Escape') {
        editorStore.select(null);
        editorStore.setActiveTool('select');
        return;
      }

      // Tab → select first child; Shift+Tab → select parent
      if (e.key === 'Tab' && !skipTreeNavigation) {
        e.preventDefault();
        const id = editorStore.selectedNodeIds[0];
        const screen = editorStore.activeScreen;
        if (!id || !screen) return;
        if (e.shiftKey) {
          const parentResult = findParent(screen.rootNode, id);
          if (parentResult && parentResult.parent.id !== screen.rootNode.id) {
            editorStore.select(parentResult.parent.id);
          }
        } else {
          const node = findNodeInScreens(editorStore.screens, id);
          const firstChild = node?.children?.[0];
          if (firstChild) {
            editorStore.select(firstChild.id);
          }
        }
        return;
      }

      // Enter → enter container (select first child, same as Tab without shift)
      if (e.key === 'Enter' && !skipTreeNavigation) {
        e.preventDefault();
        const id = editorStore.selectedNodeIds[0];
        if (!id) return;
        const node = findNodeInScreens(editorStore.screens, id);
        const firstChild = node?.children?.[0];
        if (firstChild) {
          editorStore.select(firstChild.id);
        }
        return;
      }

      // Arrow keys without Alt → select siblings (↑↓ 或 ←→)
      if (
        !skipTreeNavigation &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        const id = editorStore.selectedNodeIds[0];
        const screen = editorStore.activeScreen;
        if (!id || !screen) return;
        const parentResult = findParent(screen.rootNode, id);
        if (!parentResult) return;
        const siblings = parentResult.parent.children ?? [];
        const idx = siblings.findIndex((c) => c.id === id);
        if (idx < 0) return;
        const prev =
          e.key === 'ArrowUp' || e.key === 'ArrowLeft';
        const nextIdx = prev ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < siblings.length) {
          e.preventDefault();
          editorStore.select(siblings[nextIdx].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [message]);
}
