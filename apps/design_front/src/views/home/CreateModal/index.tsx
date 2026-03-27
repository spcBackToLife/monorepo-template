import { useState } from 'react';
import { App as AntdApp, Modal, Form, Input, Radio, Select } from 'antd';
import {
  MOBILE_VIEWPORTS,
  DESKTOP_VIEWPORTS,
  TABLET_VIEWPORTS,
  type Viewport,
} from '@globallink/design-schema';
import { projectStore } from '@/stores/project';

export interface CreateModalProps {
  open: boolean;
  onCancel: () => void;
  onCreated: (id: string) => void;
}

type Platform = 'mobile' | 'pc';

const viewportOptions: Record<Platform, Viewport[]> = {
  mobile: [...MOBILE_VIEWPORTS, ...TABLET_VIEWPORTS],
  pc: DESKTOP_VIEWPORTS,
};

function viewportToId(v: Viewport): string {
  return `${v.platform}:${v.name}`;
}

export function CreateModal({ open, onCancel, onCreated }: CreateModalProps) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<{ name: string; platform: Platform; viewportId: string }>();
  const [platform, setPlatform] = useState<Platform>('mobile');
  const [loading, setLoading] = useState(false);

  const presets = viewportOptions[platform];

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const id = await projectStore.createProject(values);
      message.success('创建成功');
      form.resetFields();
      onCreated(id);
    } catch {
      // validation or API error
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformChange = (p: Platform) => {
    setPlatform(p);
    const first = viewportOptions[p][0];
    form.setFieldValue('viewportId', first ? viewportToId(first) : undefined);
  };

  return (
    <Modal
      title="新建设计项目"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ platform: 'mobile', viewportId: MOBILE_VIEWPORTS[0] ? viewportToId(MOBILE_VIEWPORTS[0]) : undefined }}
      >
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="例如：我的 App" />
        </Form.Item>

        <Form.Item name="platform" label="目标平台">
          <Radio.Group onChange={(e) => handlePlatformChange(e.target.value as Platform)}>
            <Radio.Button value="mobile">移动端</Radio.Button>
            <Radio.Button value="pc">桌面端</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="viewportId" label="设备预设" rules={[{ required: true }]}>
          <Select
            options={presets.map((v) => ({
              label: `${v.name}  (${v.width}×${v.height})`,
              value: viewportToId(v),
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
