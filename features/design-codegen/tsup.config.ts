import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  dts: { entry: ['src/index.ts'] },
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm'],
  outDir: 'dist',
  target: 'es2020',
  treeshake: true,
  // Include templates directory in the output (they're real files, not code)
  publicDir: false,
});
