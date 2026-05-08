import { useState, useCallback, useEffect } from 'react';
import { App as AntdApp, Button, Spin } from 'antd';
import { CopyOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import { API_BASE, type AssetUploadResponse } from '@/api/client';

interface AssetItem {
  url: string;
  name: string;
}

/**
 * W4 — 素材列表面板
 * 上传静态文件到项目 uploads，从服务端加载已上传资源列表。
 */
export const MediaMaterialsPanel = observer(function MediaMaterialsPanel() {
  const { message } = AntdApp.useApp();
  const projectId = editorStore.project?.id;
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/projects/${projectId}/assets`)
      .then((res) => res.json())
      .then((data: { assets?: { url: string; filename: string }[] }) => {
        if (cancelled) return;
        const list = (data.assets ?? []).map((a) => ({
          url: a.url,
          name: a.filename,
        }));
        setItems(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const upload = useCallback(
    async (file: File) => {
      if (!projectId) {
        message.warning('项目未加载');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/projects/${projectId}/assets/upload`, {
        method: 'POST',
        body: fd,
      });
      const data: AssetUploadResponse = await res.json();
      if (!res.ok || !data.url) {
        message.error('上传失败');
        return;
      }
      setItems((prev) => [
        ...prev,
        { url: data.url!, name: file.name },
      ]);
      message.success('上传成功');
    },
    [message, projectId],
  );

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  };

  const deleteAsset = useCallback(
    async (url: string) => {
      if (!projectId) return;
      try {
        await fetch(`${API_BASE}/projects/${projectId}/assets`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        setItems((prev) => prev.filter((it) => it.url !== url));
        message.success('已删除');
      } catch {
        message.error('删除失败');
      }
    },
    [projectId, message],
  );

  const isImage = (name: string) => /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(name);

  /** 将素材应用到当前选中的元素 */
  const applyToSelected = useCallback(
    (imageUrl: string) => {
      const nodeId = editorStore.selectedNodeIds[0];
      if (!nodeId) {
        message.warning('请先选中一个元素');
        return;
      }
      const node = findNodeInScreens(editorStore.screens, nodeId);
      if (!node) return;
      if (node.type === 'img') {
        editorStore.execute({
          type: 'componentProps.update',
          params: { nodeId, props: { src: imageUrl } },
        });
      } else {
        editorStore.execute({
          type: 'style.update',
          params: { nodeId, styles: { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover' } },
        });
      }
      message.success('已应用');
    },
    [message],
  );

  return (
    <div className="p-3 text-xs space-y-2">
      <p className="text-[10px] text-gray-500 leading-relaxed">
        上传图片后，点击 <CheckOutlined style={{ fontSize: 10 }} /> 可直接应用到选中元素。
      </p>
      <label className="block">
        <span className="sr-only">上传文件</span>
        <input
          type="file"
          accept="image/*,.svg,.json,.csv,.txt,.pdf"
          className="text-[11px] w-full"
          disabled={!projectId}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void upload(f);
          }}
        />
      </label>
      {loading && (
        <div className="flex justify-center py-4"><Spin size="small" /></div>
      )}
      {!loading && items.length > 0 && (
        <ul className="max-h-56 overflow-y-auto space-y-1 border-t border-gray-100 pt-2">
          {items.map((it) => (
            <li
              key={it.url + it.name}
              className="flex items-start gap-1 py-1 border-b border-gray-50 last:border-0 group"
            >
              {isImage(it.name) && (
                <img
                  src={it.url.startsWith('http') ? it.url : `${API_BASE}${it.url}`}
                  alt={it.name}
                  className="w-10 h-10 object-cover rounded border border-gray-100 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-gray-700">{it.name}</div>
                <code className="text-[10px] text-gray-500 break-all block">{it.url}</code>
              </div>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copy(it.url)}
                title="复制路径"
              />
              {isImage(it.name) && (
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => applyToSelected(it.url)}
                  title="应用到选中元素"
                />
              )}
              <Button
                type="text"
                size="small"
                danger
                className="opacity-0 group-hover:opacity-100"
                icon={<DeleteOutlined />}
                onClick={() => void deleteAsset(it.url)}
                title="删除"
              />
            </li>
          ))}
        </ul>
      )}
      {!loading && items.length === 0 && (
        <div className="text-[10px] text-gray-400 text-center py-4">暂无已上传素材</div>
      )}
    </div>
  );
});
