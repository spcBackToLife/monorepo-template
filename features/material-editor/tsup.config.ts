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
  external: ['react', 'react-dom', 'fabric'],
});
