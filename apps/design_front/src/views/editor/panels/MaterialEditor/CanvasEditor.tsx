/**
 * Fabric.js 画布编辑器 — 精简版（用于左侧面板内嵌）
 *
 * 完整的三栏布局编辑器在 MaterialEditorModal 中实现。
 * 此组件是精简版，提供：
 *   - 紧凑的顶部工具栏（工具切换 + 颜色 + 撤销重做 + 缩放 + 导出）
 *   - 纯画布区域
 *   - 简化的图层列表
 *
 * 适用于左侧面板空间有限的场景。
 */
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
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
import type { MaterialToolType, BlendMode } from '@globallink/material-editor';
import {
  MaterialEditorCore,
  BLEND_MODES,
  BLEND_MODE_LABELS,
} from '@globallink/material-editor';
import type { BooleanOpType } from '@globallink/material-editor';
import { editorStore } from '@/stores/editor';

interface CanvasLayerInfo {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
}

const TOOL_ITEMS: { key: MaterialToolType; icon: string; label: string }[] = [
  { key: 'select', icon: '↖', label: '选择 (V)' },
  { key: 'hand', icon: '✋', label: '平移 (H)' },
  { key: 'rect', icon: '□', label: '矩形 (R)' },
  { key: 'ellipse', icon: '○', label: '椭圆 (O)' },
  { key: 'polygon', icon: '⬡', label: '多边形 (P)' },
  { key: 'star', icon: '★', label: '星形 (S)' },
  { key: 'line', icon: '╱', label: '线段 (L)' },
  { key: 'pencil', icon: '✏', label: '铅笔 (B)' },
  { key: 'text', icon: 'T', label: '文字 (T)' },
  { key: 'image', icon: '🖼', label: '导入图片 (I)' },
];

export function CanvasEditor() {
  const { message } = AntdApp.useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<MaterialEditorCore | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentTool, setCurrentTool] = useState<MaterialToolType>('select');
  const [fillColor, setFillColor] = useState('#4A90D9');
  const [strokeColor, setStrokeColor] = useState('#333333');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);
  const [canvasWidth] = useState(600);
  const [canvasHeight] = useState(400);

  // 初始化画布
  useEffect(() => {
    if (!canvasRef.current) return;

    const editor = new MaterialEditorCore({
      container: canvasRef.current,
      width: canvasWidth,
      height: canvasHeight,
      events: {
        selectionChanged: (objects) => {
          setSelectionCount(objects.length);
        },
        contentChanged: () => {
          // layers updated
        },
        toolChanged: (tool) => {
          setCurrentTool(tool);
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

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [canvasWidth, canvasHeight]);

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const editor = editorRef.current;
      if (!editor) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); editor.redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); editor.deleteSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); void editor.duplicateSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); editor.selectAll(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) { e.preventDefault(); editor.groupSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && e.shiftKey) { e.preventDefault(); editor.ungroupSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSaveProject(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') { void handleClipboardPaste(); }

      if (!e.metaKey && !e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'v': editor.setTool('select'); break;
          case 'h': editor.setTool('hand'); break;
          case 'r': editor.setTool('rect'); break;
          case 'o': editor.setTool('ellipse'); break;
          case 'p': editor.setTool('polygon'); break;
          case 's': editor.setTool('star'); break;
          case 'l': editor.setTool('line'); break;
          case 'b': editor.setTool('pencil'); break;
          case 't': editor.setTool('text'); break;
          case 'i': editor.setTool('image'); break;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 工具切换
  const handleToolChange = useCallback((tool: MaterialToolType) => {
    editorRef.current?.setTool(tool);
    setCurrentTool(tool);
  }, []);

  // 填充颜色变化
  const handleFillChange = useCallback((color: string) => {
    setFillColor(color);
    editorRef.current?.setFillColor(color);
  }, []);

  // 描边颜色变化
  const handleStrokeChange = useCallback((color: string) => {
    setStrokeColor(color);
    editorRef.current?.setStrokeColor(color);
  }, []);

  // 描边宽度变化
  const handleStrokeWidthChange = useCallback((width: number) => {
    setStrokeWidth(width);
    editorRef.current?.setStrokeWidth(width);
  }, []);

  // 剪贴板粘贴图片
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

  // 自动保存
  const autoSaveKey = `material-editor-autosave-${editorStore.materialEditorTargetNodeId ?? 'global'}`;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

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

  // 保存工程
  const handleSaveProject = useCallback(() => {
    const jsonStr = editorRef.current?.exportProjectString('我的工程');
    if (!jsonStr) return;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, 'material-project.json');
    message.success('工程文件已保存');
  }, [message]);

  // 加载工程
  const handleLoadProject = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      await editorRef.current?.loadProjectString(text);
      message.success('工程已加载');
    } catch {
      message.error('工程文件格式错误');
    }
  }, [message]);

  // 导出菜单
  const exportMenuItems = useMemo(() => [
    {
      key: 'applyBg',
      label: '🎯 应用为元素背景 (SVG)',
      onClick: () => {
        const nodeId = editorStore.selectedNodeIds[0];
        if (!nodeId) { message.warning('请先选中一个元素'); return; }
        const svg = editorRef.current?.exportSVG();
        if (!svg) return;
        const encoded = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
        editorStore.execute({
          type: 'updateStyle',
          params: { nodeId, styles: { backgroundImage: encoded, backgroundSize: 'cover' } },
        });
        message.success('画布已应用为元素背景');
      },
    },
    {
      key: 'applySrc',
      label: '🎯 应用为图片 src (PNG)',
      onClick: () => {
        const nodeId = editorStore.selectedNodeIds[0];
        if (!nodeId) { message.warning('请先选中一个元素'); return; }
        const dataUrl = editorRef.current?.exportPNG({ multiplier: 2 });
        if (!dataUrl) return;
        editorStore.execute({
          type: 'updateComponentProps',
          params: { nodeId, props: { src: dataUrl } },
        });
        message.success('画布已应用为图片 src');
      },
    },
    { type: 'divider' as const },
    {
      key: 'svg',
      label: '导出 SVG',
      onClick: () => {
        const svg = editorRef.current?.exportSVG();
        if (!svg) return;
        downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'material.svg');
        message.success('SVG 已导出');
      },
    },
    {
      key: 'png',
      label: '导出 PNG (2x)',
      onClick: () => {
        const dataUrl = editorRef.current?.exportPNG({ multiplier: 2 });
        if (dataUrl) { downloadDataURL(dataUrl, 'material.png'); message.success('PNG 已导出'); }
      },
    },
    {
      key: 'copySvg',
      label: '📋 复制 SVG 代码',
      onClick: async () => {
        const svg = editorRef.current?.exportSVG();
        if (!svg) return;
        await navigator.clipboard.writeText(svg);
        message.success('SVG 代码已复制');
      },
    },
  ], [message]);

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* 紧凑型顶部工具条 */}
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
          <Button size="small" type="text" icon={<UndoOutlined />} disabled={!canUndo} onClick={() => editorRef.current?.undo()} />
        </Tooltip>
        <Tooltip title="重做 (⌘⇧Z)">
          <Button size="small" type="text" icon={<RedoOutlined />} disabled={!canRedo} onClick={() => editorRef.current?.redo()} />
        </Tooltip>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 缩放 */}
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

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 操作 */}
        <Tooltip title="删除选中">
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => editorRef.current?.deleteSelected()} />
        </Tooltip>
        <Tooltip title="复制选中">
          <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => void editorRef.current?.duplicateSelected()} />
        </Tooltip>

        {/* 工程文件 */}
        <Tooltip title="保存工程 (⌘S)">
          <Button size="small" type="text" icon={<SaveOutlined />} onClick={handleSaveProject} />
        </Tooltip>
        <Upload
          showUploadList={false}
          accept=".json"
          beforeUpload={(file) => { void handleLoadProject(file); return false; }}
        >
          <Tooltip title="加载工程">
            <Button size="small" type="text" icon={<FolderOpenOutlined />} />
          </Tooltip>
        </Upload>

        {/* 导出 */}
        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
          <Button size="small" type="primary" icon={<DownloadOutlined />}>导出</Button>
        </Dropdown>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto p-4">
        <div
          className="bg-white shadow-lg rounded"
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
            transformOrigin: 'center center',
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
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

function downloadDataURL(dataURL: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  a.click();
}
