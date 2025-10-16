import React from 'react';
import { observer } from 'mobx-react-lite';
import { themeStore, ThemeMode } from '@/stores/theme';
import {
  Button,
  ConfigProvider,
  NavBar,
  Toast,
  SafeArea,
  Divider,
  Space,
  DotLoading,
} from 'antd-mobile';
import classNames from 'classnames';

export const App = observer(function App(): JSX.Element {
  const handleToggle = (): void => {
    const next = themeStore.mode === ThemeMode.Dark ? ThemeMode.Light : ThemeMode.Dark;
    themeStore.setMode(next);
    Toast.show({ content: `已切换为${next === ThemeMode.Dark ? '暗色' : '亮色'}主题` });
  };

  return (
    <ConfigProvider>
      <div
        className={classNames(
          'min-h-screen',
          'safe-area-padding',
          'bg-[var(--app-bg)] text-[var(--app-fg)]',
        )}
      >
        <NavBar>H5 Mobile</NavBar>
        <div className="p-4">
          <Space direction="vertical" block>
            <Button color="primary" onClick={handleToggle}>
              切换主题
            </Button>
            <Button onClick={() => themeStore.setMode(ThemeMode.System)}>跟随系统</Button>
            <Divider>演示</Divider>
            <div className="text-brand">品牌色文字</div>
            <div className="text-[var(--app-muted)]">提示色文字</div>
            <div className="flex items-center gap-2">
              Loading
              <DotLoading />
            </div>
          </Space>
        </div>
        <SafeArea position="bottom" />
      </div>
    </ConfigProvider>
  );
});
