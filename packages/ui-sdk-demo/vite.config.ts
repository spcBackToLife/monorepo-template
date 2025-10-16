import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import rollupNodePolyFill from 'rollup-plugin-polyfill-node';
import path, { resolve } from 'path';

const PUBLIC_PATH = process.env.PUBLIC_PATH;

// 外部依赖列表，避免打包到组件库中
const externalDependencies = [
  'react',
  'react-dom',
  'react-router-dom',
  'postcss',
  'react',
  'styled-components',
  'tailwindcss',
  // 可以添加其他你不想打包到组件库中的依赖
];

export default defineConfig(({}) => {
  return {
    base: PUBLIC_PATH,
    plugins: [
      react({
        babel: {
          plugins: [
            '@babel/plugin-syntax-import-assertions',
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            ['@babel/plugin-proposal-class-properties', { loose: true }],
          ],
        },
      }),
      dts({
        // 类型文件输出目录
        // outputDir: resolve(__dirname, "dist/types"),
        // 是否删除输出目录下的旧文件
        cleanVueFileName: true,
        // 是否将 `.vue` 文件作为 `.ts` 文件处理
        // insertTypesEntry: true,
        // 是否复制静态类型文件到输出目录
        copyDtsFiles: true,
      }),

      // visualizer({
      //     filename: 'stats.html',
      //     open: true,
      //     gzipSize: true,
      //     brotliSize: true,
      //     template: 'treemap',
      // }),
    ],

    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.json': 'json',
          '.js': 'jsx',
        },
        define: {
          global: 'globalThis',
        },
        plugins: [NodeModulesPolyfillPlugin()],
      },
    },

    build: {
      sourcemap: true,

      // 输出目录
      outDir: resolve(__dirname, 'dist'),
      lib: {
        // 组件库入口文件
        entry: resolve(__dirname, 'src/Sdk.tsx'),
        // 组件库名称
        name: 'AiJarvisUI',
        // 打包格式
        formats: ['es', 'umd'],
        // 文件名格式
        fileName: (format) => `ui-sdk-demo.${format}.js`,
      },
      rollupOptions: {
        // 外部依赖，不打包到组件库中
        external: externalDependencies,
        plugins: [rollupNodePolyFill()],
        output: {
          // 对于 UMD 格式，定义全局变量名
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      },
    },

    server: {
      port: 3008,
      proxy: {},
    },

    define: {
      global: 'globalThis',
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // 添加处理 ~ 前缀的别名，使其指向 node_modules 目录
      },
    },
  };
});
