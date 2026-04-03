import { useState, useEffect } from 'react';
import { App as AntdApp, Button, Modal, Form, Input, Select, Tooltip, Steps } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import type { ComponentNode, TemplateScope } from '@globallink/design-schema';
import { findNodeInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';

const CATEGORY_OPTIONS = [
  { label: '布局', value: '布局' },
  { label: '导航', value: '导航' },
  { label: '表单', value: '表单' },
  { label: '卡片', value: '卡片' },
  { label: '列表', value: '列表' },
  { label: '其他', value: '其他' },
];

const SCOPE_OPTIONS: { label: string; value: TemplateScope }[] = [
  { label: '本项目', value: 'project' },
  { label: '团队', value: 'team' },
  { label: '全局', value: 'global' },
];

function countSubtreeNodes(node: ComponentNode): number {
  let n = 1;
  for (const c of node.children ?? []) {
    n += countSubtreeNodes(c);
  }
  return n;
}

function parseTags(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const arr = raw.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

type WizardForm = {
  name: string;
  category: string;
  description?: string;
  tags?: string;
  scope: TemplateScope;
};

function SaveAsTemplateWizardModal({
  open,
  onClose,
  nodeId,
}: {
  open: boolean;
  onClose: () => void;
  nodeId: string | null;
}) {
  const { message } = AntdApp.useApp();
  const [step, setStep] = useState(0);
  const [form] = Form.useForm<WizardForm>();

  const node = nodeId ? findNodeInScreens(editorStore.screens, nodeId) : null;
  const subtreeNodes = node ? countSubtreeNodes(node) : 0;

  useEffect(() => {
    if (!open) {
      setStep(0);
      form.resetFields();
    }
  }, [open, form]);

  const handleNext = async () => {
    try {
      await form.validateFields(['name', 'category', 'scope']);
      setStep(1);
    } catch {
      // validation
    }
  };

  const handleSave = async () => {
    if (!nodeId) return;
    try {
      const values = await form.validateFields();
      const result = editorStore.execute({
        type: 'saveAsTemplate',
        params: {
          nodeId,
          name: values.name.trim(),
          category: values.category,
          description: values.description?.trim() || undefined,
          tags: parseTags(values.tags),
          scope: values.scope,
        },
      });
      if (result.success) {
        message.success('已保存为组件资产');
        onClose();
        form.resetFields();
        setStep(0);
      } else {
        message.error(result.description);
      }
    } catch {
      // validation
    }
  };

  const watched = Form.useWatch([], form);

  return (
    <Modal
      title="保存为组件资产"
      open={open && !!nodeId}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Steps
        size="small"
        current={step}
        items={[{ title: '基本信息' }, { title: '确认' }]}
        className="mb-4"
      />

      {step === 0 && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ category: '其他', scope: 'project' as TemplateScope }}
        >
          <Form.Item name="name" label="组件名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：LoginForm" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="说明（可选）">
            <Input.TextArea rows={2} placeholder="用途、使用场景等" />
          </Form.Item>
          <Form.Item name="tags" label="标签（可选）">
            <Input placeholder="多个用英文或中文逗号分隔，如：登录, 表单" />
          </Form.Item>
          <Form.Item name="scope" label="作用域" rules={[{ required: true }]}>
            <Select options={SCOPE_OPTIONS} />
          </Form.Item>
        </Form>
      )}

      {step === 1 && (
        <div className="text-xs space-y-2 text-gray-700">
          <p className="text-[10px] text-gray-500">请确认下列信息，保存后将写入项目组件库。</p>
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 space-y-1.5 font-mono text-[11px]">
            <div>
              <span className="text-gray-500">名称：</span>
              {watched?.name ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">分类：</span>
              {watched?.category ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">作用域：</span>
              {SCOPE_OPTIONS.find((o) => o.value === watched?.scope)?.label ?? watched?.scope}
            </div>
            {watched?.description ? (
              <div>
                <span className="text-gray-500">说明：</span>
                {watched.description}
              </div>
            ) : null}
            {watched?.tags?.trim() ? (
              <div>
                <span className="text-gray-500">标签：</span>
                {watched.tags}
              </div>
            ) : null}
            {node && (
              <div className="pt-1 border-t border-gray-200 text-gray-600">
                <span className="text-gray-500">源节点：</span>
                {node.name ?? node.type} · 子树共 {subtreeNodes} 个节点
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-gray-100">
        {step === 0 ? (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={() => void handleNext()}>
              下一步
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep(0)}>上一步</Button>
            <Button type="primary" onClick={() => void handleSave()}>
              保存为资产
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

export const SaveTemplateButton = observer(function SaveTemplateButton() {
  const [open, setOpen] = useState(false);
  const nodeId = editorStore.selectedNodeIds[0] ?? null;

  if (!nodeId) return null;

  return (
    <>
      <Button icon={<SaveOutlined />} block onClick={() => setOpen(true)}>
        保存为组件
      </Button>
      <SaveAsTemplateWizardModal open={open} onClose={() => setOpen(false)} nodeId={nodeId} />
    </>
  );
});

/** 底部工具栏等紧凑场景：图标按钮 + 同一套保存弹窗 */
export const SaveTemplateToolbarButton = observer(function SaveTemplateToolbarButton() {
  const [open, setOpen] = useState(false);
  const nodeId = editorStore.selectedNodeIds[0] ?? null;

  return (
    <>
      <Tooltip title={nodeId ? '保存选中节点为组件资产' : '请先选中要保存的节点'}>
        <button
          type="button"
          className="bottom-toolbar__btn"
          disabled={!nodeId}
          aria-label="保存为组件"
          onClick={() => setOpen(true)}
        >
          <SaveOutlined />
        </button>
      </Tooltip>
      <SaveAsTemplateWizardModal open={open} onClose={() => setOpen(false)} nodeId={nodeId} />
    </>
  );
});
