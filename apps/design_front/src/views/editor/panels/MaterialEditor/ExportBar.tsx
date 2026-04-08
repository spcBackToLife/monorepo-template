/**
 * 底部导出栏 — SVG 引擎版本
 *
 * 使用 SVG DOM 导出代替 Fabric.js canvas 导出。
 * 导出方式：
 *   - SVG：直接序列化 SVG DOM
 *   - PNG：通过 Canvas 2D + SVG 转换
 *   - CSS：序列化为内联 SVG 背景
 */
import { useCallback, useState } from 'react';
import { Button, Dropdown, App as AntdApp } from 'antd';
import {
  CheckOutlined,
  SaveOutlined,
  FileImageOutlined,
  CodeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { editorStore } from '@/stores/editor';
import { API_BASE } from '@/api/client';
import { materialProjectApi } from '@/api/materialProject';

interface ExportBarProps {
  targetNodeId: string | null;
  onClose: () => void;
  /** 当前工程 ID（已保存过则有值） */
  materialProjectId?: string | null;
  /** 工程保存后的回调 */
  onProjectSaved?: (id: string) => void;
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

/** 获取当前 SVG 元素 */
function getSvgElement(): SVGSVGElement | null {
  return document.querySelector('.material-renderer-svg') as SVGSVGElement | null;
}

/** 序列化 SVG 为字符串 */
function serializeSvg(): string | null {
  const svgEl = getSvgElement();
  if (!svgEl) return null;
  return new XMLSerializer().serializeToString(svgEl);
}

/** 将 SVG 转换为 PNG DataURL */
async function svgToPngDataUrl(multiplier: number = 2): Promise<string | null> {
  const svgEl = getSvgElement();
  if (!svgEl) return null;

  const svgString = new XMLSerializer().serializeToString(svgEl);
  const width = svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 600;
  const height = svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 400;

  const canvas = document.createElement('canvas');
  canvas.width = width * multiplier;
  canvas.height = height * multiplier;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise<string | null>((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** 下载 DataURL */
function downloadDataURL(dataURL: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  a.click();
}

export function ExportBar({ targetNodeId, onClose, materialProjectId, onProjectSaved }: ExportBarProps) {
  const { message } = AntdApp.useApp();
  const [saving, setSaving] = useState(false);

  // 应用到元素
  const handleApplyToElement = useCallback(async () => {
    if (!targetNodeId) {
      message.warning('请先选中一个元素');
      return;
    }

    // 查找目标节点
    const node = editorStore.screens
      .flatMap((s) => s.nodes ?? [])
      .find((n) => n.id === targetNodeId);

    if (node?.type === 'img') {
      // img 元素：应用为 src（导出 PNG 2x）
      const dataUrl = await svgToPngDataUrl(2);
      if (dataUrl) {
        editorStore.execute({
          type: 'updateComponentProps',
          params: { nodeId: targetNodeId, props: { src: dataUrl } },
        });
        message.success('已应用为图片 src');
      }
    } else {
      // 其他元素：SVG 内联背景
      const svgString = serializeSvg();
      if (svgString) {
        const encoded = `url("data:image/svg+xml,${encodeURIComponent(svgString)}")`;
        editorStore.execute({
          type: 'updateStyle',
          params: {
            nodeId: targetNodeId,
            styles: { backgroundImage: encoded, backgroundSize: 'cover' },
          },
        });
        message.success('已应用为 SVG 背景');
      }
    }
  }, [targetNodeId, message]);

  // 保存为项目素材
  const handleSaveAsMaterial = useCallback(async () => {
    try {
      const dataUrl = await svgToPngDataUrl(2);
      if (!dataUrl) return;

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const projectId = editorStore.project?.id ?? 'default';

      if (materialProjectId) {
        const result = await materialProjectApi.uploadExport(
          projectId,
          materialProjectId,
          blob,
          'canvas-export.png',
        );
        message.success(`已保存为项目素材（${result.url}）`);
      } else {
        const file = new File([blob], 'canvas-export.png', { type: 'image/png' });
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/projects/${projectId}/materials/upload`, {
          method: 'POST',
          body: formData,
        });
        if (response.ok) {
          message.success('已保存为项目素材');
        } else {
          message.error('保存失败');
        }
      }
    } catch {
      message.error('保存为项目素材失败');
    }
  }, [message, materialProjectId]);

  // 导出 SVG
  const handleExportSVG = useCallback(() => {
    const svgString = serializeSvg();
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    downloadBlob(blob, 'material.svg');
    message.success('SVG 已导出');
  }, [message]);

  // 导出 PNG 菜单
  const pngMenuItems = [
    {
      key: '1x',
      label: 'PNG (1x)',
      onClick: async () => {
        const dataUrl = await svgToPngDataUrl(1);
        if (dataUrl) { downloadDataURL(dataUrl, 'material.png'); message.success('PNG (1x) 已导出'); }
      },
    },
    {
      key: '2x',
      label: 'PNG (2x) — 推荐',
      onClick: async () => {
        const dataUrl = await svgToPngDataUrl(2);
        if (dataUrl) { downloadDataURL(dataUrl, 'material@2x.png'); message.success('PNG (2x) 已导出'); }
      },
    },
    {
      key: '3x',
      label: 'PNG (3x)',
      onClick: async () => {
        const dataUrl = await svgToPngDataUrl(3);
        if (dataUrl) { downloadDataURL(dataUrl, 'material@3x.png'); message.success('PNG (3x) 已导出'); }
      },
    },
  ];

  // 复制 CSS
  const handleCopyCSS = useCallback(async () => {
    const svgString = serializeSvg();
    if (!svgString) return;

    const cssLines: string[] = [];
    cssLines.push(`background-image: url("data:image/svg+xml,${encodeURIComponent(svgString)}");`);
    cssLines.push('background-size: cover;');
    cssLines.push('background-repeat: no-repeat;');

    await navigator.clipboard.writeText(cssLines.join('\n'));
    message.success('CSS 代码已复制到剪贴板');
  }, [message]);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400">
          {targetNodeId ? '编辑效果将应用到选中元素' : '独立创作模式'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* 应用到元素 — 主操作 */}
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          disabled={!targetNodeId}
          onClick={() => void handleApplyToElement()}
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
