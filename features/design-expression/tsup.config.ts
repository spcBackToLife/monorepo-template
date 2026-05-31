import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm', 'cjs'],
  outDir: 'dist',
  target: 'es2020',
  treeshake: true,
  // 强制 design-schema 走 external，不要 inline 它的 spec 访问器
  // —— 同一 spec.json 在整 monorepo 必须只有一份运行时拷贝
  external: ['@globallink/design-schema'],
  // 测试文件不进入 build；仅供 bun test 运行
  ignoreWatch: ['**/__tests__/**'],
});
