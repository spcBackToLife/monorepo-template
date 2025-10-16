import path from 'node:path';

export interface BaseViteConfigOptions {
  appDir: string;
}

export function createBaseViteConfig({ appDir }: BaseViteConfigOptions) {
  return {
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(appDir, 'src') }],
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
