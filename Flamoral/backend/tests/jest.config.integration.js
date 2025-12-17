/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'integration',
  rootDir: '..',

  // Test file patterns - only integration tests
  roots: ['<rootDir>/tests/integration'],
  testMatch: [
    '**/integration/**/*.test.ts',
    '**/integration/**/*.spec.ts',
    '**/integration/**/*.integration.test.ts',
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

  // Coverage configuration
  collectCoverageFrom: [
    '../services/**/src/**/*.ts',
    '!../services/**/src/**/*.d.ts',
    '!../services/**/src/**/index.ts',
    '!../services/**/src/**/*.interface.ts',
    '!../services/**/src/**/*.type.ts',
    '!../services/**/src/**/types/**',
    '!../services/**/src/**/migrations/**',
    '!../services/**/dist/**',
    '!../services/**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],

  // Integration test specific settings
  testTimeout: 60000, // 60 seconds for integration tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Run integration tests sequentially

  // Mock settings - be careful with mocks in integration tests
  clearMocks: true,
  resetMocks: false, // Keep mocks between tests in integration
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
};
