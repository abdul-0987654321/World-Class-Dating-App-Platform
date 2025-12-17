/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'e2e',
  rootDir: '..',

  // Test file patterns - only E2E tests
  roots: ['<rootDir>/tests/e2e'],
  testMatch: [
    '**/e2e/**/*.test.ts',
    '**/e2e/**/*.e2e.test.ts',
    '**/e2e/**/*.spec.ts',
  ],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/services/$1/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@flamoral/shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^@flamoral/shared/(.*)$': '<rootDir>/../packages/shared/$1/src',
    '^@flamoral/utils$': '<rootDir>/../packages/shared/utils/src/index.ts',
    '^@flamoral/types$': '<rootDir>/../packages/shared/types/src/index.ts',
    '^@flamoral/constants$': '<rootDir>/../packages/shared/constants/src/index.ts',
    '^@flamoral/validators$': '<rootDir>/../packages/shared/validators/src/index.ts',
    '^@flamoral/api-client$': '<rootDir>/../packages/shared/api-client/src/index.ts',
  },

  // Coverage - typically not collected for E2E tests
  collectCoverage: false,
  collectCoverageFrom: [],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],

  // E2E test specific settings
  testTimeout: 120000, // 120 seconds for E2E tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Run E2E tests sequentially

  // Mock settings - minimal mocking for E2E
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        skipLibCheck: true,
        strict: false,
      },
    }],
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Bail on first failure in E2E (optional)
  bail: false,
};
