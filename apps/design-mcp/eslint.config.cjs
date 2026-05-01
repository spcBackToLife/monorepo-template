// ESLint v9 flat config — Node MCP 进程
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      // ── 类型安全 ──
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // 提醒：优先 import 已有 schema 类型，不要手写 inline 重复定义
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'TSTypeAnnotation TSArrayType TSTypeReference[typeName.name="unknown"]',
          message: '避免 unknown[] — 请使用具体类型（如 ComponentNode[], DomainStateVariable[] 等来自 @globallink/design-schema）',
        },
      ],
    },
  },
  {
    ignores: ['dist', 'node_modules'],
  },
];
