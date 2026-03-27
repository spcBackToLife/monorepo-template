import { authStore } from '@/stores/auth';
import { themeStore, ThemeMode } from '@/stores/theme';
import { LoginPage } from '@/views/auth/login';
import { RegisterPage } from '@/views/auth/register';
import { HomePage } from '@/views/home';
import { EditorPage } from '@/views/editor';
import { App as AntdApp, ConfigProvider, Spin, theme } from 'antd';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const AuthSpin = observer(function AuthSpin() {
  return (
    <ConfigProvider
      theme={{
        algorithm:
          themeStore.mode === ThemeMode.Dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff' },
      }}
    >
      <AntdApp>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <Spin size="large" />
        </div>
      </AntdApp>
    </ConfigProvider>
  );
});

const GuestRoute = observer(function GuestRoute({
  children,
}: {
  children: JSX.Element;
}) {
  if (authStore.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
});

const PrivateRoute = observer(function PrivateRoute({
  children,
}: {
  children: JSX.Element;
}) {
  if (!authStore.token) {
    return <Navigate to="/login" replace />;
  }
  return children;
});

const ThemedLayout = observer(function ThemedLayout({
  children,
}: {
  children: JSX.Element;
}) {
  return (
    <ConfigProvider
      theme={{
        algorithm:
          themeStore.mode === ThemeMode.Dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff' },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
});

export const App = observer(function App() {
  useEffect(() => {
    void authStore.bootstrap();
  }, []);

  if (!authStore.sessionReady) {
    return <AuthSpin />;
  }

  return (
    <ThemedLayout>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/editor/:id"
          element={
            <PrivateRoute>
              <EditorPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemedLayout>
  );
});
