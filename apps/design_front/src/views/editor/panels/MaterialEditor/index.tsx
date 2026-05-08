/**
 * 素材编辑器主面板
 *
 * 集成渐变编辑器、阴影编辑器、滤镜编辑器、素材管理功能。
 * 作为左侧面板「素材」Tab 的主内容，或通过右侧属性面板的「高级编辑」按钮打开。
 *
 * Phase 1 + Phase 2 功能：
 *   - 素材上传、列表、分类筛选、搜索
 *   - 拖拽素材到画布（生成 img 元素或设为背景）
 *   - 渐变编辑器（线性/径向/锥形 + 预设）
 *   - 阴影编辑器（box-shadow + text-shadow + 预设）
 *   - 滤镜编辑器（CSS filter 滑块调节）
 *   - 从选中元素的 node.styles 解析并初始化编辑器
 *   - CSS 代码导出 / 复制 / 应用到元素
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Tabs, Button, App as AntdApp, Spin, Upload, Empty, Tooltip, Input, Select } from 'antd';
import {
  BgColorsOutlined,
  BoxPlotOutlined,
  ExperimentOutlined,
  PictureOutlined,
  UploadOutlined,
  DeleteOutlined,
  CheckOutlined,
  CopyOutlined,
  SearchOutlined,
  FormatPainterOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import { API_BASE } from '@/api/client';
import { GradientEditor } from './GradientEditor';
import { ShadowEditor } from './ShadowEditor';
import { FilterEditor } from './FilterEditor';
import { CanvasEditor } from './CanvasEditor';
import { AnimationEditor } from './AnimationEditor';
import { AnimationResourceEditor } from './AnimationResourceEditor';

interface MaterialItem {
  id: string;
  originalName: string;
  url: string;
  mimeType: string;
  category: string;
  size: number;
}

/** Response shape from GET /projects/:id/materials */
interface MaterialListResponse {
  materials?: MaterialItem[];
}

const CATEGORY_OPTIONS = [
  { label: '全部', value: '' },
  { label: '图片', value: 'image' },
  { label: '图标', value: 'icon' },
  { label: '动画', value: 'animation' },
  { label: '视频', value: 'video' },
  { label: '其他', value: 'other' },
];

/**
 * 获取选中节点的当前样式信息，供子编辑器初始化用
 */
function useSelectedNodeStyles() {
  const nodeId = editorStore.selectedNodeIds[0];
  const screens = editorStore.screens;
  const node = nodeId ? findNodeInScreens(screens, nodeId) : null;

  return useMemo(() => {
    if (!node) return null;
    const styles = node.styles ?? {};
    return {
      nodeId: node.id,
      nodeType: node.type,
      background: styles.background || styles.backgroundImage || styles.backgroundColor || '',
      boxShadow: styles.boxShadow || '',
      textShadow: styles.textShadow || '',
      filter: styles.filter || '',
    };
  }, [node]);
}

/**
 * MaterialEditorPanel — 素材编辑器主入口面板
 */
export const MaterialEditorPanel = observer(function MaterialEditorPanel() {
  const { message } = AntdApp.useApp();
  const projectId = editorStore.project?.id;
  const nodeId = editorStore.selectedNodeIds[0];
  const node = nodeId ? findNodeInScreens(editorStore.screens, nodeId) : null;
  const selectedStyles = useSelectedNodeStyles();

  const [activeTab, setActiveTab] = useState('gradient');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // 加载素材列表
  const loadMaterials = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/materials`);
      const data: MaterialListResponse = await res.json();
      setMaterials(data.materials ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'assets') {
      void loadMaterials();
    }
  }, [activeTab, loadMaterials]);

  // 过滤后的素材列表
  const filteredMaterials = useMemo(() => {
    let result = materials;
    if (categoryFilter) {
      result = result.filter((m) => m.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((m) =>
        m.originalName.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q),
      );
    }
    return result;
  }, [materials, categoryFilter, searchQuery]);

  // 上传素材
  const handleUpload = useCallback(async (file: File) => {
    if (!projectId) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/materials/upload`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        message.error('上传失败');
        return;
      }
      const data: MaterialItem = await res.json();
      setMaterials((prev) => [data, ...prev]);
      message.success('上传成功');
    } catch {
      message.error('上传失败');
    }
  }, [projectId, message]);

  // 删除素材
  const handleDelete = useCallback(async (id: string) => {
    if (!projectId) return;
    try {
      await fetch(`${API_BASE}/projects/${projectId}/materials/${id}`, { method: 'DELETE' });
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  }, [projectId, message]);

  // 将素材应用到选中元素
  const applyMaterial = useCallback((item: MaterialItem) => {
    if (!nodeId) {
      message.warning('请先选中一个元素');
      return;
    }
    const isImg = node?.type === 'img';
    if (isImg) {
      editorStore.execute({
        type: 'componentProps.update',
        params: { nodeId, props: { src: item.url } },
      });
    } else {
      editorStore.execute({
        type: 'style.update',
        params: {
          nodeId,
          styles: {
            backgroundImage: `url(${item.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          },
        },
      });
    }
    message.success('已应用');
  }, [nodeId, node, message]);

  // 复制素材 URL
  const copyUrl = useCallback(async (item: MaterialItem) => {
    const url = item.url.startsWith('http') ? item.url : `${API_BASE}${item.url}`;
    await navigator.clipboard.writeText(url);
    message.success('URL 已复制');
  }, [message]);

  // 拖拽素材开始 — 设置拖拽数据
  const handleDragStart = useCallback((e: React.DragEvent, item: MaterialItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'material',
      materialId: item.id,
      url: item.url,
      mimeType: item.mimeType,
      originalName: item.originalName,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const isImage = (mime: string) => mime.startsWith('image/');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const tabItems = [
    {
      key: 'gradient',
      label: (
        <span className="flex items-center gap-1">
          <BgColorsOutlined /> 渐变
        </span>
      ),
      children: (
        <GradientEditor
          currentBackground={selectedStyles?.background}
        />
      ),
    },
    {
      key: 'shadow',
      label: (
        <span className="flex items-center gap-1">
          <BoxPlotOutlined /> 阴影
        </span>
      ),
      children: (
        <ShadowEditor
          currentBoxShadow={selectedStyles?.boxShadow}
          currentTextShadow={selectedStyles?.textShadow}
        />
      ),
    },
    {
      key: 'filter',
      label: (
        <span className="flex items-center gap-1">
          <ExperimentOutlined /> 滤镜
        </span>
      ),
      children: (
        <FilterEditor
          currentFilter={selectedStyles?.filter}
        />
      ),
    },
    {
      key: 'canvas',
      label: (
        <span className="flex items-center gap-1">
          <FormatPainterOutlined /> 画布
        </span>
      ),
      children: (
        <div style={{ height: 560, margin: '-8px -8px 0' }}>
          <CanvasEditor />
        </div>
      ),
    },
    {
      key: 'animation',
      label: (
        <span className="flex items-center gap-1">
          <ThunderboltOutlined /> 动画
        </span>
      ),
      children: (
        <div style={{ height: 560, margin: '-8px -8px 0' }}>
          <Tabs
            size="small"
            defaultActiveKey="css"
            className="h-full"
            style={{ height: '100%' }}
            items={[
              {
                key: 'css',
                label: <span className="text-[10px]">CSS 动画</span>,
                children: <AnimationEditor />,
              },
              {
                key: 'resource',
                label: <span className="text-[10px]">动画资源</span>,
                children: <AnimationResourceEditor />,
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: 'assets',
      label: (
        <span className="flex items-center gap-1">
          <PictureOutlined /> 素材库
        </span>
      ),
      children: (
        <div className="space-y-2">
          {/* 上传区 */}
          <Upload.Dragger
            showUploadList={false}
            accept="image/*,.svg,.json,.mp4,.webm"
            customRequest={({ file }) => {
              void handleUpload(file as File);
            }}
            style={{ padding: '8px 0' }}
          >
            <p className="text-gray-400 text-xs">
              <UploadOutlined className="mr-1" />
              点击或拖拽上传素材
            </p>
          </Upload.Dragger>

          {/* 搜索 + 分类筛选 */}
          <div className="flex gap-1.5">
            <Input
              size="small"
              placeholder="搜索素材…"
              prefix={<SearchOutlined className="text-gray-300" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              style={{ flex: 1 }}
            />
            <Select
              size="small"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_OPTIONS}
              style={{ width: 80 }}
            />
          </div>

          {/* 加载中 */}
          {loading && (
            <div className="flex justify-center py-4"><Spin size="small" /></div>
          )}

          {/* 空状态 */}
          {!loading && filteredMaterials.length === 0 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={materials.length === 0 ? '暂无素材' : '无匹配素材'}
              style={{ margin: '16px 0' }}
            />
          )}

          {/* 素材网格 */}
          {!loading && filteredMaterials.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 max-h-[400px] overflow-y-auto">
              {filteredMaterials.map((item) => (
                <div
                  key={item.id}
                  className="group relative border border-gray-100 rounded overflow-hidden cursor-grab hover:border-blue-300 transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                >
                  {isImage(item.mimeType) ? (
                    <img
                      src={item.url.startsWith('http') ? item.url : `${API_BASE}${item.url}`}
                      alt={item.originalName}
                      className="w-full h-16 object-cover bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23f0f0f0%22/%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23f0f0f0%22/%3E%3C/svg%3E')]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-16 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">
                      {item.category}
                    </div>
                  )}
                  <div className="px-1 py-0.5 flex items-center justify-between">
                    <span className="truncate text-[9px] text-gray-500 flex-1">{item.originalName}</span>
                    <span className="text-[8px] text-gray-300 ml-0.5 shrink-0">{formatFileSize(item.size)}</span>
                  </div>
                  {/* Hover 操作 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Tooltip title="应用到元素">
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<CheckOutlined />}
                        onClick={(e) => { e.stopPropagation(); applyMaterial(item); }}
                      />
                    </Tooltip>
                    <Tooltip title="复制 URL">
                      <Button
                        size="small"
                        ghost
                        icon={<CopyOutlined />}
                        onClick={(e) => { e.stopPropagation(); void copyUrl(item); }}
                      />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button
                        size="small"
                        danger
                        ghost
                        icon={<DeleteOutlined />}
                        onClick={(e) => { e.stopPropagation(); void handleDelete(item.id); }}
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 素材统计 */}
          {materials.length > 0 && (
            <div className="text-[10px] text-gray-400 text-center pt-1">
              共 {materials.length} 个素材
              {categoryFilter && ` · 筛选 ${filteredMaterials.length} 个`}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-2">
      {/* 选中节点信息提示 */}
      {nodeId ? (
        <div className="mb-2 px-2 py-1 bg-blue-50 rounded text-[10px] text-blue-600 border border-blue-100">
          当前元素：<strong>&lt;{node?.type ?? 'unknown'}&gt;</strong>
          <span className="ml-1 text-blue-400">{node?.name ?? nodeId.slice(0, 8)}</span>
        </div>
      ) : (
        <div className="mb-2 px-2 py-1 bg-gray-50 rounded text-[10px] text-gray-400 border border-gray-100">
          选中一个元素可直接应用效果
        </div>
      )}

      <Tabs
        size="small"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="material-editor-tabs"
      />
    </div>
  );
});
