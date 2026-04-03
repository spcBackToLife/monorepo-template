import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createBaseViteConfig } from '../../tooling/vite-react.config';

export default defineConfig(() => {
  const base = createBaseViteConfig({ appDir: __dirname });
  return {
    plugins: [react()],
    ...base,
    server: {
      ...base.server,
      proxy: {
        '/uploads': {
          target: 'http://127.0.0.1:3002',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://127.0.0.1:3002',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://127.0.0.1:3002',
          changeOrigin: true,
        },
      },
    },
  };
});
