import React from 'react';
import { observer } from 'mobx-react-lite';
import { themeStore, ThemeMode } from '@/stores/theme';
import {
  Button,
  ConfigProvider,
  Divider,
  Space,
  App as AntdApp,
  Layout,
  Typography,
  theme,
  message,
} from 'antd';
import classNames from 'classnames';

const { Header, Content, Footer, Sider } = Layout;

export const App = observer(function App(): JSX.Element {
  const handleToggle = (): void => {
    const next = themeStore.mode === ThemeMode.Dark ? ThemeMode.Light : ThemeMode.Dark;
    themeStore.setMode(next);
    message.success(`已切换为${next === ThemeMode.Dark ? '暗色' : '亮色'}主题`);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm:
          themeStore.mode === ThemeMode.Dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff' },
      }}
    >
      <AntdApp>
        <Layout style={{ minHeight: '100vh' }}>
          <Sider breakpoint="lg" collapsedWidth={0} width={240} style={{ background: '#fff' }}>
            <div
              style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                fontWeight: 600,
              }}
            >
              GlobalLink PC
            </div>
            <Divider style={{ margin: 0 }} />
            <div style={{ padding: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" block onClick={handleToggle}>
                  切换主题
                </Button>
                <Button block onClick={() => themeStore.setMode(ThemeMode.System)}>
                  跟随系统
                </Button>
              </Space>
            </div>
          </Sider>
          <Layout>
            <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                仪表盘
              </Typography.Title>
            </Header>
            <Content style={{ padding: 24 }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Divider orientation="left">演示</Divider>
                <div className="text-brand">品牌色文字</div>
                <div className="text-[var(--app-muted)]">提示色文字</div>
              </Space>
            </Content>
            <Footer style={{ textAlign: 'center' }}>GlobalLink © {new Date().getFullYear()}</Footer>
          </Layout>
        </Layout>
      </AntdApp>
    </ConfigProvider>
  );
});
