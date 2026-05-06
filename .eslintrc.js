module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': ['error', {
      fixToUnknown: false,
      ignoreRestArgs: false,
    }],
    // 注：no-unnecessary-type-assertion 属 typed-linting，需要 parserOptions.project，
    // 跨 monorepo 配置复杂且增加 lint 耗时；TS 编译器本身已能告警多余断言，故暂不开启。
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: [
    'node_modules/',
    '**/dist/**',
    '**/build/**',
    '*.d.ts',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '*.d.ts',
    'build/',
    '*.d.ts',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
};
