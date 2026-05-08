import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm'],
  outDir: 'dist',
  target: 'es2020',
  treeshake: true,
  external: ['react', 'react-dom'],
  // 测试文件不进入 build；仅供 bun test 运行
  ignoreWatch: ['**/__tests__/**'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
