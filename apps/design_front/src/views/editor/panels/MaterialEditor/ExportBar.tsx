/**
 * 底部导出栏 — SVG 引擎版本
 *
 * 使用 SVG DOM 导出代替 Fabric.js canvas 导出。
 *
 * "应用到元素"流程（已优化）：
 *   1. 裁剪参考框区域的 SVG → 上传为独立资产到后端存储
 *   2. 用资产 URL + materialProjectId 通过 applyMaterialDesign 写入设计节点
 *   3. 设计稿中只保存短 URL 引用，不再内联巨大的 SVG data URI
 *
 * 导出方式：
 *   - SVG：直接序列化 SVG DOM（裁剪参考框区域）
 *   - PNG：通过 Canvas 2D + SVG 转换（裁剪参考框区域）
 *   - CSS：序列化为内联 SVG 背景（仅用于剪贴板复制）
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
import { useMaterialEditor } from '@globallink/material-engine';
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

/**
 * 裁剪参考框区域的 SVG，生成干净的导出 SVG 字符串。
 *
 * 关键：只导出参考框范围内的内容，不含大画布的额外区域、
 * 辅助线、选中框等前端 UI 元素。通过调整 viewBox 实现裁剪。
 */
function exportCroppedSvg(
  referenceFrame: { enabled: boolean; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
): string | null {
  const svgEl = getSvgElement();
  if (!svgEl) return null;

  // 克隆 SVG 避免影响页面渲染
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  if (referenceFrame.enabled) {
    // 参考框居中于画布，计算裁剪 viewBox
    const frameX = (canvasWidth - referenceFrame.width) / 2;
    const frameY = (canvasHeight - referenceFrame.height) / 2;
    clone.setAttribute('viewBox', `${frameX} ${frameY} ${referenceFrame.width} ${referenceFrame.height}`);
    clone.setAttribute('width', String(referenceFrame.width));
    clone.setAttribute('height', String(referenceFrame.height));
  }

  // 移除前端交互相关的内联样式（overflow: visible 等）
  clone.style.cssText = '';
  clone.removeAttribute('style');

  return new XMLSerializer().serializeToString(clone);
}

/**
 * 将裁剪后的 SVG 转换为 PNG DataURL
 * 只渲染参考框区域，导出尺寸 = 参考框尺寸 × multiplier
 */
async function croppedSvgToPngDataUrl(
  referenceFrame: { enabled: boolean; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  multiplier: number = 2,
): Promise<string | null> {
  const svgString = exportCroppedSvg(referenceFrame, canvasWidth, canvasHeight);
  if (!svgString) return null;

  const width = referenceFrame.enabled ? referenceFrame.width : canvasWidth;
  const height = referenceFrame.enabled ? referenceFrame.height : canvasHeight;

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

/** 将 DataURL 转为 Blob */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
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
  const { state } = useMaterialEditor();
  const { project } = state;
  const { referenceFrame, canvasWidth, canvasHeight } = project;
  const [applying, setApplying] = useState(false);

  // ===== 应用到元素（核心优化：上传资产 → URL 引用） =====
  const handleApplyToElement = useCallback(async () => {
    if (!targetNodeId) {
      message.warning('请先选中一个元素');
      return;
    }

    const projectId = editorStore.project?.id;
    if (!projectId) {
      message.error('项目信息不存在');
      return;
    }

    setApplying(true);
    try {
      // 查找目标节点类型
      const node = editorStore.screens
        .flatMap((s) => s.nodes ?? [])
        .find((n) => n.id === targetNodeId);

      const isImg = node?.type === 'img';

      if (isImg) {
        // img 元素：导出 PNG 并上传
        const dataUrl = await croppedSvgToPngDataUrl(referenceFrame, canvasWidth, canvasHeight, 2);
        if (!dataUrl) { message.error('PNG 导出失败'); return; }

        if (materialProjectId) {
          // 有素材工程 → 上传到素材工程存储，得到 URL
          const blob = await dataUrlToBlob(dataUrl);
          const result = await materialProjectApi.uploadExport(projectId, materialProjectId, blob, 'material-export.png');
          editorStore.execute({
            type: 'applyMaterialDesign',
            params: {
              nodeId: targetNodeId,
              propUpdates: { src: result.url },
              materialProjectId,
            },
          });
        } else {
          // 无素材工程 → 回退：直接用 dataUrl（体积较小的 PNG）
          editorStore.execute({
            type: 'updateComponentProps',
            params: { nodeId: targetNodeId, props: { src: dataUrl } },
          });
        }
        message.success('已应用为图片');
      } else {
        // 非 img 元素：导出 SVG 并上传
        const svgString = exportCroppedSvg(referenceFrame, canvasWidth, canvasHeight);
        if (!svgString) { message.error('SVG 导出失败'); return; }

        if (materialProjectId) {
          // 有素材工程 → 上传 SVG 到后端存储，得到 URL 引用
          const blob = new Blob([svgString], { type: 'image/svg+xml' });
          const result = await materialProjectApi.uploadExport(projectId, materialProjectId, blob, 'material-export.svg');
          editorStore.execute({
            type: 'applyMaterialDesign',
            params: {
              nodeId: targetNodeId,
              styleUpdates: {
                backgroundImage: `url("${result.url}")`,
                backgroundSize: 'cover',
              },
              materialProjectId,
            },
          });
        } else {
          // 无素材工程 → 回退：上传到通用素材存储
          const blob = new Blob([svgString], { type: 'image/svg+xml' });
          const file = new File([blob], 'material-export.svg', { type: 'image/svg+xml' });
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
                nodeId: targetNodeId,
                styles: {
                  backgroundImage: `url("${uploaded.url}")`,
                  backgroundSize: 'cover',
                },
              },
            });
          } else {
            message.error('素材上传失败');
            return;
          }
        }
        message.success('已应用为背景');
      }
    } catch (err) {
      console.error('[ExportBar] Apply to element failed:', err);
      message.error('应用失败，请重试');
    } finally {
      setApplying(false);
    }
  }, [targetNodeId, materialProjectId, referenceFrame, canvasWidth, canvasHeight, message]);

  // 保存为项目素材
  const handleSaveAsMaterial = useCallback(async () => {
    try {
      const dataUrl = await croppedSvgToPngDataUrl(referenceFrame, canvasWidth, canvasHeight, 2);
      if (!dataUrl) return;

      const blob = await dataUrlToBlob(dataUrl);
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
  }, [message, materialProjectId, referenceFrame, canvasWidth, canvasHeight]);

  // 导出 SVG（裁剪参考框区域）
  const handleExportSVG = useCallback(() => {
    const svgString = exportCroppedSvg(referenceFrame, canvasWidth, canvasHeight);
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    downloadBlob(blob, 'material.svg');
    message.success('SVG 已导出');
  }, [message, referenceFrame, canvasWidth, canvasHeight]);

  // 导出 PNG 菜单（裁剪参考框区域）
  const pngMenuItems = [
    {
      key: '1x',
      label: 'PNG (1x)',
      onClick: async () => {
        const dataUrl = await croppedSvgToPngDataUrl(referenceFrame, canvasWidth, canvasHeight, 1);
        if (dataUrl) { downloadDataURL(dataUrl, 'material.png'); message.success('PNG (1x) 已导出'); }
      },
    },
    {
      key: '2x',
      label: 'PNG (2x) — 推荐',
      onClick: async () => {
        const dataUrl = await croppedSvgToPngDataUrl(referenceFrame, canvasWidth, canvasHeight, 2);
        if (dataUrl) { downloadDataURL(dataUrl, 'material@2x.png'); message.success('PNG (2x) 已导出'); }
      },
    },
    {
      key: '3x',
      label: 'PNG (3x)',
      onClick: async () => {
        const dataUrl = await croppedSvgToPngDataUrl(referenceFrame, canvasWidth, canvasHeight, 3);
        if (dataUrl) { downloadDataURL(dataUrl, 'material@3x.png'); message.success('PNG (3x) 已导出'); }
      },
    },
  ];

  // 复制 CSS（裁剪参考框区域）
  const handleCopyCSS = useCallback(async () => {
    const svgString = exportCroppedSvg(referenceFrame, canvasWidth, canvasHeight);
    if (!svgString) return;

    const cssLines: string[] = [];
    cssLines.push(`background-image: url("data:image/svg+xml,${encodeURIComponent(svgString)}");`);
    cssLines.push('background-size: cover;');
    cssLines.push('background-repeat: no-repeat;');

    await navigator.clipboard.writeText(cssLines.join('\n'));
    message.success('CSS 代码已复制到剪贴板');
  }, [message, referenceFrame, canvasWidth, canvasHeight]);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400">
          {targetNodeId ? '编辑效果将应用到选中元素' : '独立创作模式'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* 应用到元素 — 上传资产 + URL 引用 */}
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          disabled={!targetNodeId || applying}
          loading={applying}
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
