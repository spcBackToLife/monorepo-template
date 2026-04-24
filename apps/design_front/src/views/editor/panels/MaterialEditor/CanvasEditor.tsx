/**
 * 素材编辑画布（SVG 渲染引擎）
 *
 * 使用 SVG MaterialRenderer 渲染。
 * 架构与设计编辑器完全同构：Schema → SVG DOM 自研渲染。
 *
 * 数据流：
 *   Schema 状态（Context） → MaterialRenderer → SVG 元素
 *   用户交互 → dispatch(Operation) → Context.execute()
 *                                   → SyncManager → 后端持久化+广播
 *   WS 接收 → SyncManager → Context.dispatch() → SVG 自动重渲染
 */
import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  Button,
  Tooltip,
  InputNumber,
  App as AntdApp,
  Dropdown,
  Select,
  Upload,
} from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  SaveOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import {
  MaterialEditorProvider,
  useMaterialEditor,
  MaterialEditorCanvas,
  prepareMaterialSvgCloneForExport,
  type MaterialToolType,
} from '@globallink/material-engine';
import {
  createMaterialProject,
  generateObjectId,
  type MaterialOperation,
  type MaterialProjectSchema,
} from '@globallink/material-operations';
import { editorStore } from '@/stores/editor';
import {
  materialEditorSync,
  type MaterialOperationEnvelope,
} from '@/services/MaterialEditorSyncManager';
import { API_BASE } from '@/api/client';

// ===== 工具栏配置 =====

const TOOL_ITEMS: { key: MaterialToolType; icon: string; label: string }[] = [
  { key: 'select', icon: '↖', label: '选择 (V)' },
  { key: 'hand', icon: '✋', label: '平移 (H)' },
  { key: 'rect', icon: '□', label: '矩形 (R)' },
  { key: 'ellipse', icon: '○', label: '椭圆 (O)' },
  { key: 'profiledStroke', icon: '◎', label: '沿圆外观场 (A)' },
  { key: 'polygon', icon: '⬡', label: '多边形 (P)' },
  { key: 'star', icon: '★', label: '星形 (S)' },
  { key: 'line', icon: '╱', label: '线段 (L)' },
  { key: 'path', icon: '✒', label: '钢笔 (C) — 贝塞尔曲线' },
  { key: 'pencil', icon: '✏', label: '铅笔 (B) — 自由绘制' },
  { key: 'text', icon: 'T', label: '文字 (T)' },
  { key: 'image', icon: '🖼', label: '导入图片 (I)' },
];

// ===== 内部画布工具栏组件 =====

function CanvasToolbar() {
  const { message } = AntdApp.useApp();
  const {
    state,
    execute,
    undo,
    redo,
    setTool,
    setZoom,
    getSelectedObjects,
  } = useMaterialEditor();

  const { tool: currentTool, zoom, canUndo, canRedo, selectedIds } = state;
  const project = state.project;

  // 填充颜色（从选中对象读取或用默认值）
  const [fillColor, setFillColor] = useState('#4A90D9');
  const [strokeColor, setStrokeColor] = useState('#333333');
  const [strokeWidth, setStrokeWidth] = useState(1);

  // 工具切换
  const handleToolChange = useCallback((tool: MaterialToolType) => {
    setTool(tool);
  }, [setTool]);

  // 设置选中对象的填充颜色
  const handleFillChange = useCallback((color: string) => {
    setFillColor(color);
    for (const id of selectedIds) {
      execute({
        type: 'me:setFill',
        params: { objectId: id, fill: color },
      });
    }
  }, [selectedIds, execute]);

  // 设置选中对象的描边
  const handleStrokeChange = useCallback((color: string) => {
    setStrokeColor(color);
    for (const id of selectedIds) {
      execute({
        type: 'me:setStroke',
        params: { objectId: id, stroke: color, strokeWidth },
      });
    }
  }, [selectedIds, strokeWidth, execute]);

  const handleStrokeWidthChange = useCallback((width: number) => {
    setStrokeWidth(width);
    for (const id of selectedIds) {
      execute({
        type: 'me:setStroke',
        params: { objectId: id, stroke: strokeColor, strokeWidth: width },
      });
    }
  }, [selectedIds, strokeColor, execute]);

  // 删除选中
  const handleDelete = useCallback(() => {
    for (const id of selectedIds) {
      execute({
        type: 'me:removeObject',
        params: { objectId: id },
      });
    }
  }, [selectedIds, execute]);

  // 复制选中
  const handleDuplicate = useCallback(() => {
    for (const id of selectedIds) {
      execute({
        type: 'me:duplicateObject',
        params: { objectId: id, newObjectId: generateObjectId() },
      });
    }
  }, [selectedIds, execute]);

  // 导出菜单
  const exportMenuItems = useMemo(() => [
    {
      key: 'applyBg',
      label: '🎯 应用为元素背景 (SVG)',
      onClick: async () => {
        const nodeId = editorStore.selectedNodeIds[0];
        if (!nodeId) { message.warning('请先选中一个元素'); return; }
        // 裁剪参考框区域导出 SVG
        const svgEl = document.querySelector('.material-renderer-svg') as SVGSVGElement | null;
        if (!svgEl) return;
        const { canvasWidth: cw, canvasHeight: ch, referenceFrame: rf } = project;
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        if (rf?.enabled) {
          const fx = (cw - rf.width) / 2;
          const fy = (ch - rf.height) / 2;
          clone.setAttribute('viewBox', `${fx} ${fy} ${rf.width} ${rf.height}`);
          clone.setAttribute('width', String(rf.width));
          clone.setAttribute('height', String(rf.height));
        }
        clone.style.cssText = '';
        clone.removeAttribute('style');
        prepareMaterialSvgCloneForExport(clone, project.backgroundColor);
        const svgString = new XMLSerializer().serializeToString(clone);

        // 上传为独立资产而非内联 data URI
        const projectId = editorStore.project?.id;
        if (projectId) {
          try {
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const file = new File([blob], 'canvas-export.svg', { type: 'image/svg+xml' });
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_BASE}/projects/${projectId}/materials/upload`, {
              method: 'POST',
              body: formData,
            });
            if (response.ok) {
              const uploaded = await response.json() as { url: string };
              editorStore.execute({
                type: 'updateStyle',
                params: {
                  nodeId,
                  styles: {
                    backgroundImage: `url("${uploaded.url}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center center',
                    backgroundColor: 'transparent',
                  },
                },
              });
              message.success('画布已应用为元素背景');
            } else {
              message.error('上传失败');
            }
          } catch {
            message.error('应用失败');
          }
        }
      },
    },
    { type: 'divider' as const },
    {
      key: 'svg',
      label: '导出 SVG',
      onClick: () => {
        const svgEl = document.querySelector('.material-renderer-svg') as SVGSVGElement | null;
        if (!svgEl) return;
        const { canvasWidth: cw, canvasHeight: ch, referenceFrame: rf } = project;
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        if (rf?.enabled) {
          const fx = (cw - rf.width) / 2;
          const fy = (ch - rf.height) / 2;
          clone.setAttribute('viewBox', `${fx} ${fy} ${rf.width} ${rf.height}`);
          clone.setAttribute('width', String(rf.width));
          clone.setAttribute('height', String(rf.height));
        }
        clone.style.cssText = '';
        clone.removeAttribute('style');
        prepareMaterialSvgCloneForExport(clone, project.backgroundColor);
        const svgString = new XMLSerializer().serializeToString(clone);
        downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), 'material.svg');
        message.success('SVG 已导出');
      },
    },
    {
      key: 'copySvg',
      label: '📋 复制 SVG 代码',
      onClick: async () => {
        const svgEl = document.querySelector('.material-renderer-svg') as SVGSVGElement | null;
        if (!svgEl) return;
        const { canvasWidth: cw, canvasHeight: ch, referenceFrame: rf } = project;
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        if (rf?.enabled) {
          const fx = (cw - rf.width) / 2;
          const fy = (ch - rf.height) / 2;
          clone.setAttribute('viewBox', `${fx} ${fy} ${rf.width} ${rf.height}`);
          clone.setAttribute('width', String(rf.width));
          clone.setAttribute('height', String(rf.height));
        }
        clone.style.cssText = '';
        clone.removeAttribute('style');
        prepareMaterialSvgCloneForExport(clone, project.backgroundColor);
        const svgString = new XMLSerializer().serializeToString(clone);
        await navigator.clipboard.writeText(svgString);
        message.success('SVG 代码已复制');
      },
    },
  ], [message]);

  return (
    <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
      {/* 工具按钮 */}
      {TOOL_ITEMS.map((item) => (
        <Tooltip key={item.key} title={item.label} placement="bottom">
          <button
            type="button"
            className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-colors ${
              currentTool === item.key
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
            onClick={() => handleToolChange(item.key)}
          >
            {item.icon}
          </button>
        </Tooltip>
      ))}

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* 填充 & 描边 */}
      <Tooltip title="填充颜色">
        <label className="flex items-center gap-0.5 cursor-pointer">
          <input
            type="color"
            value={fillColor}
            onChange={(e) => handleFillChange(e.target.value)}
            className="w-5 h-5 rounded border border-gray-200 cursor-pointer p-0"
          />
          <span className="text-[10px] text-gray-500">填</span>
        </label>
      </Tooltip>
      <Tooltip title="描边颜色">
        <label className="flex items-center gap-0.5 cursor-pointer">
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => handleStrokeChange(e.target.value)}
            className="w-5 h-5 rounded border border-gray-200 cursor-pointer p-0"
          />
          <span className="text-[10px] text-gray-500">边</span>
        </label>
      </Tooltip>
      <Tooltip title="描边宽度">
        <InputNumber
          size="small"
          min={0}
          max={20}
          value={strokeWidth}
          onChange={(v) => v != null && handleStrokeWidthChange(v)}
          style={{ width: 52 }}
          suffix="px"
        />
      </Tooltip>

      <div className="flex-1" />

      {/* 撤销/重做 */}
      <Tooltip title="撤销 (⌘Z)">
        <Button size="small" type="text" icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
      </Tooltip>
      <Tooltip title="重做 (⌘⇧Z)">
        <Button size="small" type="text" icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
      </Tooltip>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* 缩放 */}
      <Tooltip title="缩小">
        <Button size="small" type="text" icon={<ZoomOutOutlined />} onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} />
      </Tooltip>
      <span className="text-[10px] text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
      <Tooltip title="放大">
        <Button size="small" type="text" icon={<ZoomInOutlined />} onClick={() => setZoom(Math.min(5, zoom + 0.1))} />
      </Tooltip>
      <Tooltip title="重置缩放">
        <Button size="small" type="text" icon={<ExpandOutlined />} onClick={() => setZoom(1)} />
      </Tooltip>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* 操作 */}
      <Tooltip title="删除选中">
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={handleDelete} disabled={selectedIds.length === 0} />
      </Tooltip>
      <Tooltip title="复制选中">
        <Button size="small" type="text" icon={<CopyOutlined />} onClick={handleDuplicate} disabled={selectedIds.length === 0} />
      </Tooltip>

      {/* 导出 */}
      <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
        <Button size="small" type="primary" icon={<DownloadOutlined />}>导出</Button>
      </Dropdown>
    </div>
  );
}

// ===== 带同步的画布组件 =====

function SyncedCanvas() {
  const { state, execute } = useMaterialEditor();

  // 连接 WebSocket 同步
  useEffect(() => {
    const projectId = editorStore.project?.id;
    if (!projectId) return;

    // TODO: 独立画布编辑器也应该有 materialProjectId，暂时使用项目级订阅
    // 后续可通过 URL 参数或 editorStore 传入 materialProjectId
    materialEditorSync.connect(projectId);

    // 监听远程操作 → execute 到本地 Context
    const unsubOp = materialEditorSync.onOperation((envelope: MaterialOperationEnvelope) => {
      execute(envelope.operation);
    });

    // 监听 undo/redo 事件 → 重新加载 Schema
    const unsubUndo = materialEditorSync.onUndo(async (event) => {
      // undo/redo 后需要从后端重新获取完整 Schema
      try {
        const projectId = editorStore.project?.id;
        if (!projectId || !event.materialId) return;
        const res = await fetch(
          `${API_BASE}/api/projects/${projectId}/materials/${event.materialId}/schema`,
        );
        if (res.ok) {
          const schema = await res.json() as MaterialProjectSchema;
          // 通过一系列操作来同步不太现实，直接重新初始化更可靠
          // 这里我们触发一个 window 事件让 Provider 重新加载
          window.dispatchEvent(new CustomEvent('material-schema-reload', { detail: schema }));
        }
      } catch (err) {
        console.error('[CanvasEditor] Failed to reload schema after undo:', err);
      }
    });

    return () => {
      unsubOp();
      unsubUndo();
      materialEditorSync.disconnect();
    };
  }, [execute]);

  // 监听本地操作变化 → 同步到后端
  // 通过 Context 的 onOperation 回调实现（已在 Provider 配置）

  return <MaterialEditorCanvas className="flex-1" />;
}

// ===== 主导出组件 =====

export function CanvasEditor() {
  const [initialSchema] = useState<MaterialProjectSchema>(() =>
    createMaterialProject(
      'local-canvas',
      editorStore.project?.id ?? 'default',
      '素材画布',
      600,
      400,
    ),
  );

  // 操作同步回调 — 本地执行的操作发送到后端
  const handleOperation = useCallback((op: MaterialOperation, _result: unknown) => {
    materialEditorSync.sendOperation(op);
  }, []);

  const handleBatch = useCallback((ops: MaterialOperation[], _results: unknown[]) => {
    materialEditorSync.sendBatch(ops);
  }, []);

  const handleUndoRedo = useCallback((direction: 'undo' | 'redo', _result: unknown) => {
    // undo/redo 通过 REST API 发送到后端（后端维护完整 undo 栈）
    const projectId = editorStore.project?.id;
    const materialId = materialEditorSync.currentMaterialId;
    if (!projectId || !materialId) return;

    fetch(`${API_BASE}/api/projects/${projectId}/materials/${materialId}/operations/${direction}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: 'user' }),
    }).catch((err) => {
      console.error(`[CanvasEditor] Failed to ${direction}:`, err);
    });
  }, []);

  return (
    <MaterialEditorProvider
      initialProject={initialSchema}
      onOperation={handleOperation}
      onBatch={handleBatch}
      onUndoRedo={handleUndoRedo}
    >
      <div className="flex flex-col h-full">
        <CanvasToolbar />
        <SyncedCanvas />
      </div>
    </MaterialEditorProvider>
  );
}

// ===== 导出辅助函数 =====

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
