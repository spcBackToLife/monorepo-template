/// <reference types="vite/client" />

declare global {
  interface ImportMeta {
    env: {
      [key: string]: string | boolean | undefined;
      VITE_BUILD_CONFIG_DEBUG: boolean;
      // 可以根据实际情况添加更多环境变量的类型声明
    };
  }
}

export {};
