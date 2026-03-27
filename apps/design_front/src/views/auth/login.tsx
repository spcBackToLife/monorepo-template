import { authStore } from '@/stores/auth';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';

export const LoginPage = observer(function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [form] = Form.useForm<{ email: string; password: string }>();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      await authStore.login(values.email, values.password);
      message.success('登录成功');
      navigate('/', { replace: true });
    } catch (e) {
      message.error(e instanceof Error ? e.message : '登录失败');
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
      <Card style={{ width: '100%', maxWidth: 400 }} title="登录">
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
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, textAlign: 'center' }}>
          没有账号？<Link to="/register">去注册</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
});
