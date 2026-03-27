import { authStore } from '@/stores/auth';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';

export const RegisterPage = observer(function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [form] = Form.useForm<{
    email: string;
    password: string;
    confirm: string;
  }>();

  const onFinish = async (values: {
    email: string;
    password: string;
    confirm: string;
  }) => {
    if (values.password !== values.confirm) {
      message.error('两次输入的密码不一致');
      return;
    }
    try {
      await authStore.register(values.email, values.password);
      message.success('注册成功');
      navigate('/', { replace: true });
    } catch (e) {
      message.error(e instanceof Error ? e.message : '注册失败');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--app-bg, #f5f5f5)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }} title="注册">
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="you@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少 8 位（与后端一致）' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="至少 8 位"
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认密码"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="再次输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              注册
            </Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, textAlign: 'center' }}>
          已有账号？<Link to="/login">去登录</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
});
