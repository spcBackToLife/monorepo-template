import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createBaseViteConfig } from '../../tooling/vite-react.config';

export default defineConfig(() => ({
  plugins: [react()],
  ...createBaseViteConfig({ appDir: __dirname }),
}));
