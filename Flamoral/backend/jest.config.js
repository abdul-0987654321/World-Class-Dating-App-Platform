/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',

  // Test file patterns
  roots: ['<rootDir>/services', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
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
    'services/**/src/**/*.ts',
    'shared/**/*.ts',
    '!services/**/src/**/*.d.ts',
    '!services/**/src/**/index.ts',
    '!services/**/src/**/*.interface.ts',
    '!services/**/src/**/*.type.ts',
    '!services/**/src/**/types/**',
    '!services/**/src/**/migrations/**',
    '!services/**/src/**/__tests__/**',
    '!services/**/dist/**',
    '!services/**/node_modules/**',
    '!shared/**/types/**',
    '!shared/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test environment settings
  testTimeout: 30000,
  verbose: true,
  maxWorkers: '50%',
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

  // Watch mode settings
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],

  // Detect memory leaks and open handles
  detectOpenHandles: false,
  forceExit: false,
};
