import { useState, useEffect } from 'react';
import { App as AntdApp, Modal, Button, Input, Select } from 'antd';
import { observer } from 'mobx-react-lite';
import type { PropBinding } from '@globallink/design-schema';
import { PropBindingSchema } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';

const FIELD_OPTIONS: { label: string; value: PropBinding['targetField'] }[] = [
  { label: 'props', value: 'props' },
  { label: 'styles', value: 'styles' },
  { label: 'children', value: 'children' },
];

const emptyRow = (): PropBinding => ({
  propKey: 'title',
  targetNodePath: 'children.0',
  targetField: 'props',
  targetKey: 'children',
});

/**
 * W6-061：编辑组件模板的 propBindings，提交前用 PropBindingSchema 校验。
 */
export const PropBindingsEditorModal = observer(function PropBindingsEditorModal({
  templateId,
  open,
  onClose,
}: {
  templateId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<PropBinding[]>([]);

  const template = editorStore.project?.componentAssets.find((t) => t.id === templateId) ?? null;
  const propKeys = template?.propDefinitions?.map((d) => d.key) ?? [];

  useEffect(() => {
    if (!open || !templateId) return;
    const t = editorStore.project?.componentAssets.find((x) => x.id === templateId);
    if (!t) return;
    setRows(t.propBindings?.length ? t.propBindings.map((b) => ({ ...b })) : []);
  }, [open, templateId]);

  const addRow = () => {
    const pk = propKeys[0] ?? 'title';
    setRows((r) => [...r, { ...emptyRow(), propKey: pk }]);
  };

  const removeRow = (idx: number) => {
    setRows((r) => r.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<PropBinding>) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const handleSave = () => {
    if (!templateId || !template) return;
    for (let i = 0; i < rows.length; i++) {
      const r = PropBindingSchema.safeParse(rows[i]);
      if (!r.success) {
        message.error(`第 ${i + 1} 行校验失败: ${r.error.message}`);
        return;
      }
    }
    const result = editorStore.execute({
      type: 'updateTemplate',
      params: { templateId, patch: { propBindings: rows } },
    });
    if (result.success) {
      message.success('已保存 Prop 绑定');
      onClose();
    } else {
      message.error(result.description);
    }
  };

  const show = open && !!templateId && !!template;

  return (
    <Modal
      title={template ? `Prop 绑定 — ${template.name}` : 'Prop 绑定'}
      open={show}
      onCancel={onClose}
      width={680}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
      }
      destroyOnClose
    >
      {template && (
        <>
          <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
            将模板对外暴露的 prop（<code className="font-mono">propDefinitions</code>）映射到内部子树节点路径。
            路径为点分，如 <code className="font-mono">children.0</code>。
          </p>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {rows.length === 0 && (
              <div className="text-[10px] text-gray-400 py-2">暂无绑定，点击「添加绑定」。</div>
            )}
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="flex flex-wrap gap-1 items-center border border-gray-100 rounded p-2 bg-gray-50/50"
              >
                <Select
                  className="min-w-[100px]"
                  size="small"
                  value={row.propKey}
                  options={
                    propKeys.length
                      ? propKeys.map((k) => ({ label: k, value: k }))
                      : [{ label: row.propKey, value: row.propKey }]
                  }
                  onChange={(v) => updateRow(idx, { propKey: v })}
                />
                <span className="text-gray-400 text-[10px]">→</span>
                <Input
                  size="small"
                  className="min-w-[140px] flex-1 font-mono text-[11px]"
                  placeholder="node 路径，如 children.0"
                  value={row.targetNodePath}
                  onChange={(e) => updateRow(idx, { targetNodePath: e.target.value })}
                />
                <Select
                  className="w-[88px]"
                  size="small"
                  value={row.targetField}
                  options={FIELD_OPTIONS}
                  onChange={(v) => updateRow(idx, { targetField: v as PropBinding['targetField'] })}
                />
                <Input
                  size="small"
                  className="w-[100px] font-mono text-[11px]"
                  placeholder="字段名"
                  value={row.targetKey}
                  onChange={(e) => updateRow(idx, { targetKey: e.target.value })}
                />
                <Button size="small" danger type="text" onClick={() => removeRow(idx)}>
                  删除
                </Button>
              </div>
            ))}
          </div>
          <Button size="small" type="dashed" block className="mt-2" onClick={addRow}>
            添加绑定
          </Button>
        </>
      )}
    </Modal>
  );
});
