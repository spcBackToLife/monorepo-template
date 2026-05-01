import { useState, useEffect, useRef } from 'react';
import { App as AntdApp, Modal, Button, Input } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { API_BASE, type AssetUploadResponse } from '@/api/client';
import type { DataPayload } from '@/types/editor';

type Snapshot = {
  name: string;
  category: string;
  description: string;
  tags: string;
  thumbnail: string;
};

function tagsToString(tags: string[] | undefined): string {
  return (tags ?? []).join(', ');
}

function parseTags(s: string): string[] {
  return s
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * W6-062：组件资产详情（元数据 + 版本时间）与缩略图上传。
 */
export const ComponentAssetDetailModal = observer(function ComponentAssetDetailModal({
  templateId,
  open,
  onClose,
}: {
  templateId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = AntdApp.useApp();
  const projectId = editorStore.project?.id;
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const initialRef = useRef<Snapshot | null>(null);

  const template = editorStore.project?.componentAssets.find((t) => t.id === templateId) ?? null;

  useEffect(() => {
    if (!open || !templateId) return;
    const t = editorStore.project?.componentAssets.find((x) => x.id === templateId);
    if (!t) return;
    const snap: Snapshot = {
      name: t.name ?? '',
      category: t.category ?? '',
      description: t.description ?? '',
      tags: tagsToString(t.tags),
      thumbnail: t.thumbnail ?? '',
    };
    initialRef.current = snap;
    setName(snap.name);
    setCategory(snap.category);
    setDescription(snap.description);
    setTags(snap.tags);
    setThumbnail(snap.thumbnail);
  }, [open, templateId]);

  const uploadThumb = async (file: File) => {
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
    setThumbnail(data.url);
    message.success('已设为缩略图');
  };

  const buildPatch = (): DataPayload | null => {
    const init = initialRef.current;
    if (!init) return null;
    const patch: DataPayload = {};
    if (name !== init.name) patch.name = name;
    if (category !== init.category) patch.category = category;
    if (description !== init.description) patch.description = description;
    const nextTags = parseTags(tags);
    const initTags = parseTags(init.tags);
    if (nextTags.length !== initTags.length || nextTags.some((x, i) => x !== initTags[i])) {
      patch.tags = nextTags;
    }
    const th = thumbnail.trim();
    const initTh = init.thumbnail.trim();
    if (th !== initTh) patch.thumbnail = th;
    return Object.keys(patch).length > 0 ? patch : null;
  };

  const handleSave = () => {
    if (!templateId || !template) return;
    const patch = buildPatch();
    if (!patch) {
      message.info('没有修改');
      return;
    }
    const r = editorStore.execute({
      type: 'updateTemplate',
      params: {
        templateId,
        patch: patch as {
          name?: string;
          category?: string;
          tags?: string[];
          description?: string;
          thumbnail?: string;
        },
      },
    });
    if (r.success) {
      message.success('已保存');
      onClose();
    } else {
      message.error(r.description);
    }
  };

  const handleDuplicate = () => {
    if (!templateId || !template) return;
    const r = editorStore.execute({
      type: 'duplicateTemplate',
      params: { sourceTemplateId: templateId, newName: `${template.name} (Copy)` },
    });
    if (r.success) {
      message.success('已复制模板');
      onClose();
    } else {
      message.error(r.description);
    }
  };

  const show = open && !!templateId && !!template;

  return (
    <Modal
      title={template ? `资产详情 — ${template.name}` : '资产详情'}
      open={show}
      onCancel={onClose}
      width={520}
      footer={
        <div className="flex justify-between gap-2 flex-wrap">
          <Button onClick={handleDuplicate}>复制模板</Button>
          <div className="flex gap-2">
            <Button onClick={onClose}>关闭</Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      }
      destroyOnClose
    >
      {template && (
        <div className="flex flex-col gap-3 text-xs">
          <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
            <div>
              <span className="text-gray-400">ID</span>
              <div className="font-mono text-[10px] break-all text-gray-700 mt-0.5">{template.id}</div>
            </div>
            <div>
              <span className="text-gray-400">版本</span>
              <div className="text-gray-700 mt-0.5">v{template.version ?? 1}</div>
            </div>
            <div>
              <span className="text-gray-400">创建</span>
              <div className="text-gray-700 mt-0.5">
                {template.createdAt ? new Date(template.createdAt).toLocaleString() : '—'}
              </div>
            </div>
            <div>
              <span className="text-gray-400">更新</span>
              <div className="text-gray-700 mt-0.5">
                {template.updatedAt ? new Date(template.updatedAt).toLocaleString() : '—'}
              </div>
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">名称</span>
            <Input size="small" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">分类</span>
            <Input size="small" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="如 表单 / 导航" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">描述</span>
            <Input.TextArea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">标签（逗号分隔）</span>
            <Input size="small" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="login, form" />
          </label>

          <div>
            <div className="text-gray-600 mb-1">缩略图</div>
            <div className="flex gap-2 items-start flex-wrap">
              <div className="w-20 h-20 rounded border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {thumbnail.trim() ? (
                  <img
                    src={thumbnail}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-gray-400">无</span>
                )}
              </div>
              <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                <Input
                  size="small"
                  className="font-mono text-[11px]"
                  placeholder="https… 或 /uploads/…"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="small"
                    onClick={() => fileRef.current?.click()}
                  >
                    上传到项目
                  </Button>
                  {thumbnail.trim() && (
                    <Button size="small" type="link" className="text-[11px] px-0" onClick={() => setThumbnail('')}>
                      清除
                    </Button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void uploadThumb(f);
                  }}
                />
                <p className="text-[10px] text-gray-400 leading-relaxed m-0">
                  上传文件会写入项目 uploads 目录，自动填入路径。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
});
