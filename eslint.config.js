// ESLint v9 flat config - minimal config to allow builds
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/tests/**',
      '**/tools/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.e2e.ts',
    ],
  },
];
