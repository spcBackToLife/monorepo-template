/**
 * 素材编辑器模态浮层 — 统一三栏布局
 *
 * 严格对照 README §4.2：
 *   左工具栏(48px) | 中画布区(flex) | 右属性面板(220px)
 *
 * 由右键菜单"设计素材…"或属性面板"高级编辑"按钮打开。
 *
 * 功能：
 *   - 可拖拽标题栏移动位置
 *   - 左侧：绘图工具 + 效果工具
 *   - 中间：Fabric.js 画布 + 栅格 + 底部图层面板 + 底部画布工具栏
 *   - 右侧：上下文属性面板（随工具/选中对象切换）
 *   - 底部：导出栏
 */
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Tooltip, App as AntdApp, ConfigProvider } from 'antd';
import {
  CloseOutlined,
  DragOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  CopyOutlined,
  GroupOutlined,
  UngroupOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  BlockOutlined,
  AimOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import type { MaterialToolType, BlendMode, BooleanOpType } from '@globallink/material-editor';
import { MaterialEditorCore, BLEND_MODES } from '@globallink/material-editor';
import { LeftToolbar } from './LeftToolbar';
import type { ActiveTool, EffectToolType } from './LeftToolbar';
import { RightPropertyPanel } from './RightPropertyPanel';
import type { RightPanelMode } from './RightPropertyPanel';
import type { SelectedObjectInfo } from './RightPropertyPanel';
import { LayerPanel } from './LayerPanel';
import type { LayerInfo } from './LayerPanel';
import { ExportBar } from './ExportBar';
import { CanvasGrid } from './CanvasGrid';
import { CanvasRuler, RULER_SIZE } from './CanvasRuler';

/** 面板尺寸常量 */
const MODAL_WIDTH = 1060;
const MODAL_HEIGHT = 720;

/** 画布默认尺寸 */
const DEFAULT_CANVAS_WIDTH = 600;
const DEFAULT_CANVAS_HEIGHT = 400;

/** 效果工具 → 右侧面板模式映射 */
const EFFECT_TO_PANEL: Record<EffectToolType, RightPanelMode> = {
  gradient: 'gradient-edit',
  fill: 'fill-edit',
  mask: 'mask-edit',
  filter: 'filter-edit',
  shadow: 'shadow-edit',
};

/** 是否为效果工具 */
function isEffectTool(tool: ActiveTool): tool is EffectToolType {
  return tool === 'gradient' || tool === 'fill' || tool === 'mask' || tool === 'filter' || tool === 'shadow';
}

/**
 * 获取目标节点的当前样式信息，供子编辑器初始化用
 */
function useTargetNodeStyles(nodeId: string | null) {
  const screens = editorStore.screens;
  const node = nodeId ? findNodeInScreens(screens, nodeId) : null;

  return useMemo(() => {
    if (!node) return null;
    const styles = (node.styles ?? {}) as Record<string, string>;
    return {
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.name ?? node.id.slice(0, 8),
      background: styles.background || styles.backgroundImage || styles.backgroundColor || '',
      boxShadow: styles.boxShadow || '',
      textShadow: styles.textShadow || '',
      filter: styles.filter || '',
      width: styles.width || '',
      height: styles.height || '',
    };
  }, [node]);
}

/**
 * 解析元素尺寸为画布尺寸
 * 处理 auto/percentage/vh/vw 等自适应值
 */
function resolveCanvasSize(
  widthStr?: string,
  heightStr?: string,
): { width: number; height: number } {
  const parseSize = (val: string | undefined, fallback: number): number => {
    if (!val || val === 'auto' || val === '') return fallback;
    // 纯数字或 px
    const pxMatch = val.match(/^(\d+(?:\.\d+)?)(px)?$/);
    if (pxMatch) return Math.max(50, Math.min(1200, Number(pxMatch[1])));
    // 百分比 — 按 400px 基准
    const pctMatch = val.match(/^(\d+(?:\.\d+)?)%$/);
    if (pctMatch) return Math.max(50, Math.min(1200, (Number(pctMatch[1]) / 100) * 400));
    // vh/vw — 按 800px 视口基准
    const vhMatch = val.match(/^(\d+(?:\.\d+)?)(vh|vw)$/);
    if (vhMatch) return Math.max(50, Math.min(1200, (Number(vhMatch[1]) / 100) * 800));
    return fallback;
  };

  return {
    width: parseSize(widthStr, DEFAULT_CANVAS_WIDTH),
    height: parseSize(heightStr, DEFAULT_CANVAS_HEIGHT),
  };
}

/**
 * MaterialEditorModal — 素材编辑器浮层弹窗（入口）
 */
export const MaterialEditorModal = observer(function MaterialEditorModal() {
  const isOpen = editorStore.materialEditorOpen;
  const targetNodeId = editorStore.materialEditorTargetNodeId;

  if (!isOpen) return null;

  return createPortal(
    <MaterialEditorModalInner
      targetNodeId={targetNodeId}
      onClose={() => editorStore.closeMaterialEditor()}
    />,
    document.body,
  );
});

interface InnerProps {
  targetNodeId: string | null;
  onClose: () => void;
}

/**
 * MaterialEditorModalInner — 统一三栏布局
 */
const MaterialEditorModalInner = observer(function MaterialEditorModalInner({
  targetNodeId,
  onClose,
}: InnerProps) {
  const { message } = AntdApp.useApp();
  const selectedStyles = useTargetNodeStyles(targetNodeId);

  // ===== 画布引擎 =====
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<MaterialEditorCore | null>(null);

  // ===== 工具状态 =====
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');

  // ===== 画布尺寸（基于目标元素） =====
  const canvasSize = useMemo(
    () => resolveCanvasSize(selectedStyles?.width, selectedStyles?.height),
    [selectedStyles?.width, selectedStyles?.height],
  );

  // ===== 画布状态 =====
  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // ===== B.2.3: 画布尺寸手动调整 =====
  const [customCanvasW, setCustomCanvasW] = useState<number | null>(null);
  const [customCanvasH, setCustomCanvasH] = useState<number | null>(null);

  // 最终画布尺寸：手动值优先，否则用自动解析值
  const finalCanvasSize = useMemo(() => ({
    width: customCanvasW ?? canvasSize.width,
    height: customCanvasH ?? canvasSize.height,
  }), [customCanvasW, customCanvasH, canvasSize]);

  // ===== 选中对象状态 =====
  const [selectionCount, setSelectionCount] = useState(0);
  const [selectedObject, setSelectedObject] = useState<SelectedObjectInfo | null>(null);
  const [blendMode, setBlendMode] = useState<BlendMode>('normal');

  // ===== 图层状态 =====
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [selectedLayerIdx, setSelectedLayerIdx] = useState(-1);

  // ===== 拖拽逻辑 =====
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 居中初始化
  useEffect(() => {
    if (pos.x < 0) {
      setPos({
        x: Math.max(0, (window.innerWidth - MODAL_WIDTH) / 2),
        y: Math.max(0, (window.innerHeight - MODAL_HEIGHT) / 2 - 20),
      });
    }
  }, [pos.x]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, .ant-select, .ant-slider, .ant-color-picker')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Escape 关闭（仅在非绘制状态时）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 如果正在钢笔绘制或路径编辑，Escape 由快捷键处理器处理，不关闭弹窗
        const editor = editorRef.current;
        if (editor && (editor.isPenDrawing || editor.isPathEditing)) return;
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ===== 初始化 Fabric.js 画布 =====
  useEffect(() => {
    if (!canvasRef.current) return;

    const editor = new MaterialEditorCore({
      container: canvasRef.current,
      width: finalCanvasSize.width,
      height: finalCanvasSize.height,
      events: {
        selectionChanged: (objects) => {
          setSelectionCount(objects.length);
          if (objects.length === 1) {
            const obj = objects[0];
            setSelectedObject({
              type: obj.type ?? '',
              fill: typeof obj.fill === 'string' ? obj.fill : undefined,
              stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
              strokeWidth: obj.strokeWidth,
              opacity: obj.opacity,
              left: obj.left,
              top: obj.top,
              width: obj.width,
              height: obj.height,
              angle: obj.angle,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
            });
            setBlendMode(editor.getBlendMode());
          } else {
            setSelectedObject(null);
            setBlendMode('normal');
          }
        },
        contentChanged: () => {
          setLayers(editor.getLayers());
        },
        toolChanged: (tool) => {
          setActiveTool(tool);
        },
        historyChanged: (undo, redo) => {
          setCanUndo(undo);
          setCanRedo(redo);
        },
        zoomChanged: (z) => {
          setZoom(z);
        },
      },
    });

    editorRef.current = editor;
    setLayers(editor.getLayers());

    // 同步 snap 状态
    editor.setGridSnap(snapEnabled);

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [finalCanvasSize.width, finalCanvasSize.height]);

  // ===== 自动保存到 localStorage =====
  const autoSaveKey = `material-editor-autosave-${targetNodeId ?? 'global'}`;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // 尝试恢复上次编辑进度
    try {
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
        const data = JSON.parse(saved);
        const savedTime = new Date(data.timestamp);
        const hoursDiff = (Date.now() - savedTime.getTime()) / (1000 * 60 * 60);
        if (hoursDiff < 24 && data.canvasJSON) {
          void editor.loadFromJSON(data.canvasJSON).then(() => {
            message.info('已恢复上次编辑进度', 3);
          });
        }
      }
    } catch {
      // 静默忽略
    }

    const interval = setInterval(() => {
      try {
        const json = editor.exportJSON();
        localStorage.setItem(autoSaveKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          canvasJSON: json,
        }));
      } catch {
        // 静默忽略
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveKey]);

  // ===== 键盘快捷键 =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const editor = editorRef.current;
      if (!editor) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return;

      // C.1: 钢笔工具快捷键
      if (editor.isPenDrawing) {
        if (e.key === 'Escape') { e.preventDefault(); editor.cancelPenPath(); return; }
        if (e.key === 'Enter') { e.preventDefault(); editor.finalizePenPath(false); return; }
      }

      // C.1.2: 路径编辑模式 — Escape 退出
      if (editor.isPathEditing) {
        if (e.key === 'Escape') { e.preventDefault(); editor.exitPathEditMode(); return; }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); editor.redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); editor.deleteSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); void editor.duplicateSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); editor.selectAll(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) { e.preventDefault(); editor.groupSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && e.shiftKey) { e.preventDefault(); editor.ungroupSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') { void handleClipboardPaste(); }

      // 工具快捷键
      if (!e.metaKey && !e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'v': editor.setTool('select'); break;
          case 'r': editor.setTool('rect'); break;
          case 'o': editor.setTool('ellipse'); break;
          case 'p': editor.setTool('polygon'); break;
          case 'l': editor.setTool('line'); break;
          case 'c': editor.setTool('path'); break;
          case 's': editor.setTool('star'); break;
          case 't': editor.setTool('text'); break;
          case 'b': editor.setTool('pencil'); break;
          case 'i': editor.setTool('image'); break;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 工具切换处理 =====
  const handleToolChange = useCallback((tool: ActiveTool) => {
    setActiveTool(tool);
    // 只有绘图工具才设置到引擎
    if (!isEffectTool(tool)) {
      editorRef.current?.setTool(tool as MaterialToolType);
    }
  }, []);

  // ===== 属性变更 =====
  const handlePropertyChange = useCallback((updates: Record<string, unknown>) => {
    editorRef.current?.updateSelectedObject(updates);
    setSelectedObject((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const handleBlendModeChange = useCallback((mode: BlendMode) => {
    setBlendMode(mode);
    editorRef.current?.setBlendMode(mode);
  }, []);

  // ===== 图层操作 =====
  const handleLayerSelect = useCallback((idx: number) => {
    setSelectedLayerIdx(idx);
    editorRef.current?.selectLayer(idx);
  }, []);

  // ===== 剪贴板粘贴 =====
  const handleClipboardPaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          await editorRef.current?.addImage(dataUrl);
          message.success('已从剪贴板粘贴图片');
          return;
        }
      }
    } catch {
      // 静默忽略
    }
  }, [message]);

  // ===== 右侧面板模式计算 =====
  const rightPanelMode: RightPanelMode = useMemo(() => {
    if (isEffectTool(activeTool)) {
      return EFFECT_TO_PANEL[activeTool];
    }
    if (selectedObject) return 'object-props';
    return 'no-selection';
  }, [activeTool, selectedObject]);

  // ===== 查找目标节点 =====
  const node = targetNodeId ? findNodeInScreens(editorStore.screens, targetNodeId) : null;

  return (
    <>
      {/* 半透明遮罩 */}
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9990,
          background: 'rgba(0,0,0,0.18)',
        }}
        onClick={onClose}
      />

      {/* 浮层面板 — 统一三栏布局 */}
      <ConfigProvider
        theme={{ token: { zIndexPopupBase: 10000 } }}
      >
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: MODAL_WIDTH,
          height: MODAL_HEIGHT,
          zIndex: 9991,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== 标题栏（可拖拽）===== */}
        <div
          className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 flex-shrink-0"
          style={{
            cursor: 'grab',
            background: 'linear-gradient(to bottom, #f8f9fa, #f1f3f5)',
            userSelect: 'none',
          }}
          onMouseDown={onDragStart}
        >
          <DragOutlined className="text-gray-400 text-xs" />
          <span className="font-medium text-sm text-gray-800">素材编辑器</span>
          {node && (
            <span className="text-[11px] text-gray-400 ml-1">
              — &lt;{node.type}&gt; {selectedStyles?.nodeName}
              {` (${finalCanvasSize.width}×${finalCanvasSize.height})`}
            </span>
          )}
          {!node && targetNodeId && (
            <span className="text-[11px] text-orange-400 ml-1">未找到目标节点</span>
          )}
          <span className="flex-1" />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          />
        </div>

        {/* ===== 三栏主体 ===== */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ① 左侧工具栏 (48px) */}
          <LeftToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
          />

          {/* ② 中间画布区 (flex) */}
          <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
            {/* 钢笔工具使用提示 */}
            {activeTool === 'path' && (
              <div className="flex-shrink-0 px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-700 flex items-center gap-2">
                <span className="font-medium">🖊 钢笔工具</span>
                <span>单击 = 直线锚点</span>
                <span className="text-blue-400">|</span>
                <span><b>按住拖拽</b> = 曲线锚点（拉出贝塞尔控制手柄）</span>
                <span className="text-blue-400">|</span>
                <span>点击起点闭合 / Enter 完成 / Esc 取消</span>
              </div>
            )}
            {/* 画布主体 */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-3 relative">
              <div
                className="relative bg-white shadow-md rounded"
                style={{
                  width: finalCanvasSize.width * zoom,
                  height: finalCanvasSize.height * zoom,
                  marginTop: showRuler ? RULER_SIZE : 0,
                  marginLeft: showRuler ? RULER_SIZE : 0,
                }}
              >
                {/* B.3.1: 标尺 */}
                <CanvasRuler
                  width={finalCanvasSize.width}
                  height={finalCanvasSize.height}
                  zoom={zoom}
                  visible={showRuler}
                />
                {/* 栅格叠加 */}
                <CanvasGrid
                  width={finalCanvasSize.width}
                  height={finalCanvasSize.height}
                  zoom={zoom}
                  visible={showGrid}
                />
                {/* Fabric.js 画布 */}
                <canvas ref={canvasRef} />
              </div>
            </div>

            {/* 图层面板（画布下方） */}
            <LayerPanel
              layers={layers}
              selectedIndex={selectedLayerIdx}
              onSelect={handleLayerSelect}
              onToggleVisibility={(idx) => editorRef.current?.toggleLayerVisibility(idx)}
              onToggleLock={(idx) => editorRef.current?.toggleLayerLock(idx)}
              onMoveUp={(idx) => editorRef.current?.moveLayerUp(idx)}
              onMoveDown={(idx) => editorRef.current?.moveLayerDown(idx)}
              onDelete={(idx) => {
                editorRef.current?.selectLayer(idx);
                editorRef.current?.deleteSelected();
              }}
            />

            {/* 底部画布工具栏（撤销/重做/缩放/栅格切换/标尺/吸附/尺寸） */}
            <div className="flex items-center gap-1 px-2 py-1 bg-white border-t border-gray-200 flex-shrink-0">
              <Tooltip title="撤销 (⌘Z)">
                <Button size="small" type="text" icon={<UndoOutlined />} disabled={!canUndo} onClick={() => editorRef.current?.undo()} />
              </Tooltip>
              <Tooltip title="重做 (⌘⇧Z)">
                <Button size="small" type="text" icon={<RedoOutlined />} disabled={!canRedo} onClick={() => editorRef.current?.redo()} />
              </Tooltip>

              <div className="w-px h-4 bg-gray-200 mx-1" />

              <Tooltip title="删除">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => editorRef.current?.deleteSelected()} />
              </Tooltip>
              <Tooltip title="复制">
                <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => void editorRef.current?.duplicateSelected()} />
              </Tooltip>
              {selectionCount >= 2 && (
                <Tooltip title="编组 (⌘G)">
                  <Button size="small" type="text" icon={<GroupOutlined />} onClick={() => editorRef.current?.groupSelected()} />
                </Tooltip>
              )}
              {selectedObject?.type === 'group' && (
                <Tooltip title="解组 (⌘⇧G)">
                  <Button size="small" type="text" icon={<UngroupOutlined />} onClick={() => editorRef.current?.ungroupSelected()} />
                </Tooltip>
              )}

              <span className="flex-1" />

              {/* B.2.3: 画布尺寸手动调整 */}
              <Tooltip title="画布宽度">
                <input
                  type="number"
                  className="w-12 h-5 text-[10px] text-center border border-gray-200 rounded bg-gray-50 focus:border-blue-400 focus:outline-none"
                  value={finalCanvasSize.width}
                  min={50}
                  max={2000}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 50 && v <= 2000) {
                      setCustomCanvasW(v);
                    }
                  }}
                />
              </Tooltip>
              <span className="text-[9px] text-gray-300">×</span>
              <Tooltip title="画布高度">
                <input
                  type="number"
                  className="w-12 h-5 text-[10px] text-center border border-gray-200 rounded bg-gray-50 focus:border-blue-400 focus:outline-none"
                  value={finalCanvasSize.height}
                  min={50}
                  max={2000}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 50 && v <= 2000) {
                      setCustomCanvasH(v);
                    }
                  }}
                />
              </Tooltip>

              <div className="w-px h-4 bg-gray-200 mx-0.5" />

              {/* B.1.2: 吸附开关 */}
              <Tooltip title={snapEnabled ? '关闭吸附' : '开启吸附'}>
                <Button
                  size="small"
                  type="text"
                  icon={<AimOutlined />}
                  onClick={() => {
                    const next = !snapEnabled;
                    setSnapEnabled(next);
                    editorRef.current?.setGridSnap(next);
                  }}
                  className={snapEnabled ? 'text-blue-500' : 'text-gray-400'}
                />
              </Tooltip>

              {/* 栅格开关 */}
              <Tooltip title={showGrid ? '隐藏栅格' : '显示栅格'}>
                <Button
                  size="small"
                  type="text"
                  icon={<AppstoreOutlined />}
                  onClick={() => setShowGrid(!showGrid)}
                  className={showGrid ? 'text-blue-500' : 'text-gray-400'}
                />
              </Tooltip>

              {/* B.3.1: 标尺开关 */}
              <Tooltip title={showRuler ? '隐藏标尺' : '显示标尺'}>
                <Button
                  size="small"
                  type="text"
                  icon={<ColumnWidthOutlined />}
                  onClick={() => setShowRuler(!showRuler)}
                  className={showRuler ? 'text-blue-500' : 'text-gray-400'}
                />
              </Tooltip>

              <div className="w-px h-4 bg-gray-200 mx-0.5" />

              {/* 缩放控制 */}
              <Tooltip title="缩小">
                <Button size="small" type="text" icon={<ZoomOutOutlined />} onClick={() => editorRef.current?.zoomOut()} />
              </Tooltip>
              <span className="text-[10px] text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Tooltip title="放大">
                <Button size="small" type="text" icon={<ZoomInOutlined />} onClick={() => editorRef.current?.zoomIn()} />
              </Tooltip>
              <Tooltip title="重置缩放">
                <Button size="small" type="text" icon={<ExpandOutlined />} onClick={() => editorRef.current?.resetZoom()} />
              </Tooltip>
            </div>
          </div>

          {/* ③ 右侧属性面板 (220px) */}
          <RightPropertyPanel
            mode={rightPanelMode}
            selectedObject={selectedObject}
            selectionCount={selectionCount}
            editorRef={editorRef}
            blendMode={blendMode}
            onBlendModeChange={handleBlendModeChange}
            onPropertyChange={handlePropertyChange}
            currentBackground={selectedStyles?.background}
            currentFilter={selectedStyles?.filter}
            currentBoxShadow={selectedStyles?.boxShadow}
            currentTextShadow={selectedStyles?.textShadow}
          />
        </div>

        {/* ===== 底部导出栏 ===== */}
        <ExportBar
          targetNodeId={targetNodeId}
          editorRef={editorRef}
          onClose={onClose}
        />
      </div>
      </ConfigProvider>
    </>
  );
});
