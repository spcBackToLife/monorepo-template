import path from 'node:path';

export interface BaseViteConfigOptions {
  appDir: string;
}

export function createBaseViteConfig({ appDir }: BaseViteConfigOptions) {
  /** dev 直连源码，改 engine 无需每次手动 build；生产/CI 仍以包 dist 为准 */
  const designEngineSrc = path.resolve(appDir, '../../features/design-engine/src/index.tsx');

  return {
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(appDir, 'src') },
        { find: '@globallink/design-engine', replacement: designEngineSrc },
      ],
    },
    optimizeDeps: {
      exclude: ['@globallink/design-engine'],
    },
    css: {
      preprocessorOptions: {
        less: { javascriptEnabled: true },
      },
    },
    server: {
      // 允许访问应用目录与 monorepo 根（支持 workspace 链接包真实路径）
      fs: { allow: [path.resolve(appDir, '.'), path.resolve(appDir, '../../')] },
      port: Number(process.env.APP_PORT || 5174),
      open: false,
    },
  };
}
