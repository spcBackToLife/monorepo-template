import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  target: 'node18',
  platform: 'node',
  treeshake: true,
  external: [
    '@globallink/design-schema',
    '@globallink/design-operations',
    '@modelcontextprotocol/sdk',
    'zod',
  ],
});
