import { authStore } from '@/stores/auth';
import { themeStore, ThemeMode } from '@/stores/theme';
import {
  App as AntdApp,
  Button,
  ConfigProvider,
  Dropdown,
  Empty,
  Layout,
  Menu,
  Space,
  Typography,
  theme,
  message,
} from 'antd';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;

type MenuKey = 'recent' | 'all';

const DashboardLayout = observer(function DashboardLayout(): JSX.Element {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [menuKey, setMenuKey] = useState<MenuKey>('recent');

  const handleLogout = (): void => {
    authStore.logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  const pageTitle = menuKey === 'recent' ? '最近' : '全部';

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Layout.Sider
        width={220}
        breakpoint="lg"
        collapsedWidth={0}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            fontWeight: 600,
            fontSize: 15,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          Design
        </div>
        <Menu
          mode="inline"
          selectedKeys={[menuKey]}
          style={{ borderInlineEnd: 0, marginTop: 8 }}
          items={[
            { key: 'recent', label: '最近' },
            { key: 'all', label: '全部' },
          ]}
          onClick={({ key }) => setMenuKey(key as MenuKey)}
        />
      </Layout.Sider>
      <Layout style={{ background: token.colorBgLayout }}>
        <Header
          style={{
            margin: 0,
            paddingInline: 24,
            height: 56,
            lineHeight: '56px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography.Title level={5} style={{ margin: 0, fontWeight: 600 }}>
            设计稿
          </Typography.Title>
          <Space size="middle">
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'light',
                    label: '亮色',
                    onClick: () => themeStore.setMode(ThemeMode.Light),
                  },
                  {
                    key: 'dark',
                    label: '暗色',
                    onClick: () => themeStore.setMode(ThemeMode.Dark),
                  },
                  {
                    key: 'system',
                    label: '跟随系统',
                    onClick: () => themeStore.setMode(ThemeMode.System),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button type="text">外观</Button>
            </Dropdown>
            <Typography.Text type="secondary" style={{ maxWidth: 200 }} ellipsis>
              {authStore.user?.email}
            </Typography.Text>
            <Button type="default" onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            minHeight: 360,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 20 }}>
            {pageTitle}
          </Typography.Title>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 320,
            }}
          >
            <Empty description="暂无设计稿" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
});

export const DashboardPage = observer(function DashboardPage(): JSX.Element {
  return (
    <ConfigProvider
      theme={{
        algorithm:
          themeStore.mode === ThemeMode.Dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff' },
      }}
    >
      <AntdApp>
        <DashboardLayout />
      </AntdApp>
    </ConfigProvider>
  );
});
