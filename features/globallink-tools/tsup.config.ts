import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm'],
  outDir: 'dist',
  target: 'es2020',
  treeshake: true,
});
