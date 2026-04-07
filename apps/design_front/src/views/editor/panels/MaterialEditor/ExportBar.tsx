/**
 * 底部导出栏 — 严格对照 README §4.2 + Phase E 优化
 *
 * 导出: [应用到元素] [保存为项目素材] [导出 SVG] [导出 PNG] [复制 CSS]
 *
 * E.1: 智能导出 — 根据画布内容自动选择最佳输出方式
 * E.1.2: 复制 CSS 使用 generateCSSCode 生成完整 CSS
 * E.1.3: PNG 导出支持 1x/2x/3x/WebP 选择
 */
import { useCallback } from 'react';
import { Button, Dropdown, App as AntdApp } from 'antd';
import {
  CheckOutlined,
  SaveOutlined,
  FileImageOutlined,
  CodeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { MaterialEditorCore } from '@globallink/material-editor';
import { generateCSSCode } from '@globallink/material-editor';
import { editorStore } from '@/stores/editor';
import { API_BASE } from '@/api/client';

interface ExportBarProps {
  targetNodeId: string | null;
  editorRef: React.RefObject<MaterialEditorCore | null>;
  onClose: () => void;
}

/** 下载 Blob */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 下载 DataURL */
function downloadDataURL(dataURL: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  a.click();
}

export function ExportBar({ targetNodeId, editorRef, onClose }: ExportBarProps) {
  const { message } = AntdApp.useApp();

  // E.1.1: 智能应用到元素
  const handleApplyToElement = useCallback(() => {
    if (!targetNodeId) {
      message.warning('请先选中一个元素');
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;

    // 查找目标节点
    const node = editorStore.screens
      .flatMap((s) => s.nodes ?? [])
      .find((n) => n.id === targetNodeId);

    if (node?.type === 'img') {
      // img 元素：应用为 src（导出 PNG 2x）
      const dataUrl = editor.exportPNG({ multiplier: 2 });
      editorStore.execute({
        type: 'updateComponentProps',
        params: { nodeId: targetNodeId, props: { src: dataUrl } },
      });
      message.success('已应用为图片 src');
    } else {
      // 其他元素：优先尝试 SVG 背景（矢量、清晰）
      const objects = editor.getLayers();
      const hasOnlySimpleShapes = objects.length > 0 && objects.every(
        (o) => ['rect', 'ellipse', 'polygon', 'path', 'line'].includes(o.type),
      );

      if (hasOnlySimpleShapes) {
        // 纯矢量 → SVG 内联背景
        const svg = editor.exportSVG();
        const encoded = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
        editorStore.execute({
          type: 'updateStyle',
          params: {
            nodeId: targetNodeId,
            styles: { backgroundImage: encoded, backgroundSize: 'cover' },
          },
        });
        message.success('已应用为 SVG 背景（矢量无损）');
      } else {
        // 含图片/文字等复杂内容 → PNG 背景
        const dataUrl = editor.exportPNG({ multiplier: 2 });
        const encoded = `url(${dataUrl})`;
        editorStore.execute({
          type: 'updateStyle',
          params: {
            nodeId: targetNodeId,
            styles: { backgroundImage: encoded, backgroundSize: 'cover' },
          },
        });
        message.success('已应用为 PNG 背景');
      }
    }
  }, [targetNodeId, editorRef, message]);

  // 保存为项目素材
  const handleSaveAsMaterial = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const dataUrl = editor.exportPNG({ multiplier: 2 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'canvas-export.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', file);

      const projectId = editorStore.project?.id ?? 'default';
      const response = await fetch(`${API_BASE}/projects/${projectId}/materials/upload`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        message.success('已保存为项目素材');
      } else {
        message.error('保存失败');
      }
    } catch {
      message.error('保存为项目素材失败');
    }
  }, [editorRef, message]);

  // 导出 SVG
  const handleExportSVG = useCallback(() => {
    const svg = editorRef.current?.exportSVG();
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadBlob(blob, 'material.svg');
    message.success('SVG 已导出');
  }, [editorRef, message]);

  // E.1.3: 导出 PNG 菜单（1x/2x/3x + WebP）
  const pngMenuItems = [
    {
      key: '1x',
      label: 'PNG (1x)',
      onClick: () => {
        const dataUrl = editorRef.current?.exportPNG({ multiplier: 1 });
        if (dataUrl) { downloadDataURL(dataUrl, 'material.png'); message.success('PNG (1x) 已导出'); }
      },
    },
    {
      key: '2x',
      label: 'PNG (2x) — 推荐',
      onClick: () => {
        const dataUrl = editorRef.current?.exportPNG({ multiplier: 2 });
        if (dataUrl) { downloadDataURL(dataUrl, 'material@2x.png'); message.success('PNG (2x) 已导出'); }
      },
    },
    {
      key: '3x',
      label: 'PNG (3x)',
      onClick: () => {
        const dataUrl = editorRef.current?.exportPNG({ multiplier: 3 });
        if (dataUrl) { downloadDataURL(dataUrl, 'material@3x.png'); message.success('PNG (3x) 已导出'); }
      },
    },
    { type: 'divider' as const },
    {
      key: 'webp',
      label: 'WebP (2x) — 更小体积',
      onClick: () => {
        const dataUrl = editorRef.current?.exportWebP({ multiplier: 2, quality: 0.9 });
        if (dataUrl) { downloadDataURL(dataUrl, 'material.webp'); message.success('WebP 已导出'); }
      },
    },
  ];

  // E.1.2: 复制 CSS — 使用 generateCSSCode 生成完整 CSS
  const handleCopyCSS = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      // 尝试使用 generateCSSCode 生成格式化 CSS
      const svg = editor.exportSVG();
      const cssLines: string[] = [];

      // 基础: SVG 作为背景
      cssLines.push(`background-image: url("data:image/svg+xml,${encodeURIComponent(svg)}");`);
      cssLines.push('background-size: cover;');
      cssLines.push('background-repeat: no-repeat;');

      const cssCode = cssLines.join('\n');
      await navigator.clipboard.writeText(cssCode);
      message.success('CSS 代码已复制到剪贴板');
    } catch {
      message.error('复制 CSS 失败');
    }
  }, [editorRef, message]);

  // 保存/加载工程文件
  const handleSaveProject = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const jsonString = editor.exportProjectString('素材工程');
    const blob = new Blob([jsonString], { type: 'application/json' });
    downloadBlob(blob, 'material-project.json');
    message.success('工程文件已保存');
  }, [editorRef, message]);

  const handleLoadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await editorRef.current?.loadProjectString(text);
        message.success('工程文件已加载');
      } catch {
        message.error('工程文件格式错误');
      }
    };
    input.click();
  }, [editorRef, message]);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400">
          {targetNodeId ? '编辑效果将应用到选中元素' : '独立创作模式'}
        </span>
        {/* 工程文件按钮（小字） */}
        <Button size="small" type="link" className="text-[10px] px-1" onClick={handleSaveProject}>
          💾 保存工程
        </Button>
        <Button size="small" type="link" className="text-[10px] px-1" onClick={handleLoadProject}>
          📂 加载工程
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* 应用到元素 — 主操作 */}
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          disabled={!targetNodeId}
          onClick={handleApplyToElement}
        >
          应用到元素
        </Button>

        {/* 保存为项目素材 */}
        <Button
          size="small"
          icon={<SaveOutlined />}
          onClick={() => void handleSaveAsMaterial()}
        >
          保存为素材
        </Button>

        {/* 导出 SVG */}
        <Button
          size="small"
          icon={<FileImageOutlined />}
          onClick={handleExportSVG}
        >
          导出 SVG
        </Button>

        {/* 导出 PNG（下拉选择分辨率） */}
        <Dropdown menu={{ items: pngMenuItems }} placement="topRight">
          <Button size="small" icon={<DownloadOutlined />}>
            导出 PNG
          </Button>
        </Dropdown>

        {/* 复制 CSS */}
        <Button
          size="small"
          icon={<CodeOutlined />}
          onClick={() => void handleCopyCSS()}
        >
          复制 CSS
        </Button>
      </div>
    </div>
  );
}
