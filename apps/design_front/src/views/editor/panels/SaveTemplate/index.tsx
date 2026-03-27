import { useState } from 'react';
import { App as AntdApp, Button, Modal, Form, Input, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';

const CATEGORY_OPTIONS = [
  { label: '布局', value: '布局' },
  { label: '导航', value: '导航' },
  { label: '表单', value: '表单' },
  { label: '卡片', value: '卡片' },
  { label: '列表', value: '列表' },
  { label: '其他', value: '其他' },
];

export const SaveTemplateButton = observer(function SaveTemplateButton() {
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ name: string; category: string }>();
  const nodeId = editorStore.selectedNodeIds[0];

  if (!nodeId) return null;

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const result = editorStore.execute({
        type: 'saveAsTemplate',
        params: { nodeId, name: values.name, category: values.category },
      });
      if (result.success) {
        message.success('已保存为组件资产');
        setOpen(false);
        form.resetFields();
      }
    } catch {
      // validation error
    }
  };

  return (
    <>
      <Button icon={<SaveOutlined />} block onClick={() => setOpen(true)}>
        保存为组件
      </Button>
      <Modal
        title="保存为组件资产"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ category: '其他' }}>
          <Form.Item name="name" label="组件名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：LoginForm" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
});
