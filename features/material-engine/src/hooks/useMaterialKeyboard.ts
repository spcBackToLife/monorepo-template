/**
 * useMaterialKeyboard — 素材编辑器键盘快捷键 Hook
 *
 * 提供标准的编辑器快捷键支持。
 */
import { useEffect } from 'react';
import { useMaterialEditor, type MaterialToolType } from '../context/MaterialEditorContext';
import { generateObjectId, type MaterialObject } from '@globallink/material-operations';

export function useMaterialKeyboard() {
  const {
    state,
    execute,
    undo,
    redo,
    setTool,
    setSelected,
    setZoom,
    getSelectedObjects,
  } = useMaterialEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Undo/Redo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const selected = getSelectedObjects();
        const defId = state.project.defaultElementId;
        for (const obj of selected) {
          if (defId && obj.id === defId) continue;
          execute({ type: 'me:removeObject', params: { objectId: obj.id } });
        }
        setSelected([]);
        return;
      }

      // Duplicate
      if (isMod && e.key === 'd') {
        e.preventDefault();
        const selected = getSelectedObjects();
        const defId = state.project.defaultElementId;
        const newIds: string[] = [];
        for (const obj of selected) {
          if (defId && obj.id === defId) continue;
          const newId = generateObjectId();
          execute({
            type: 'me:duplicateObject',
            params: { objectId: obj.id, newObjectId: newId },
          });
          newIds.push(newId);
        }
        if (newIds.length > 0) setSelected(newIds);
        return;
      }

      // Select All
      if (isMod && e.key === 'a') {
        e.preventDefault();
        const allIds = state.project.objects
          .filter((o: MaterialObject) => !o.locked)
          .map((o: MaterialObject) => o.id);
        setSelected(allIds);
        return;
      }

      // Group / Ungroup
      if (isMod && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        if (state.selectedIds.length >= 2) {
          execute({
            type: 'me:groupObjects',
            params: { objectIds: state.selectedIds },
          });
        }
        return;
      }
      if (isMod && e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        const selected = getSelectedObjects();
        for (const obj of selected) {
          if (obj.type === 'group') {
            execute({
              type: 'me:ungroupObjects',
              params: { groupId: obj.id },
            });
          }
        }
        return;
      }

      // Zoom
      if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(state.zoom + 0.1);
        return;
      }
      if (isMod && e.key === '-') {
        e.preventDefault();
        setZoom(state.zoom - 0.1);
        return;
      }
      if (isMod && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        return;
      }

      // 工具快捷键（无修饰键）
      if (!isMod && !e.altKey) {
        const toolMap: Record<string, MaterialToolType> = {
          v: 'select',
          h: 'hand',
          r: 'rect',
          o: 'ellipse',
          a: 'profiledStroke',
          p: 'polygon',
          s: 'star',
          l: 'line',
          c: 'path',
          b: 'pencil',
          t: 'text',
          i: 'image',
        };
        const tool = toolMap[e.key.toLowerCase()];
        if (tool) {
          setTool(tool);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, execute, undo, redo, setTool, setSelected, setZoom, getSelectedObjects]);
}
