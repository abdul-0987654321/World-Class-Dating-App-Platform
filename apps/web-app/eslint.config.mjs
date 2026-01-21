import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**', '**/*.cjs', 'cypress/**', 'cypress.config.ts', 'e2e/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/test/**', '**/mocks/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        NodeJS: 'readonly',
        JSX: 'readonly',
        React: 'readonly',
        RTCSessionDescriptionInit: 'readonly',
        RTCIceCandidateInit: 'readonly',
        RTCConfiguration: 'readonly',
        RTCIceServer: 'readonly',
        HeadersInit: 'readonly',
        RequestInit: 'readonly',
        ResponseType: 'readonly',
        NotificationPermission: 'readonly',
        BufferSource: 'readonly',
        IntersectionObserverInit: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...tseslintPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
      }],
      '@typescript-eslint/no-empty-object-type': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'prefer-const': 'error',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-redeclare': 'off',
      'no-empty': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
