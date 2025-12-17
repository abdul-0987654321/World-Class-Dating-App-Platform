/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'auth-service',
  rootDir: '.',

  // Test file patterns
  roots: ['<rootDir>/tests', '<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/tests/**/*.test.ts',
    '**/*.spec.ts',
  ],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@flamoral/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
    '^@flamoral/shared/(.*)$': '<rootDir>/../../../packages/shared/$1/src',
    '^@flamoral/utils$': '<rootDir>/../../../packages/shared/utils/src/index.ts',
    '^@flamoral/types$': '<rootDir>/../../../packages/shared/types/src/index.ts',
    '^@flamoral/constants$': '<rootDir>/../../../packages/shared/constants/src/index.ts',
    '^@flamoral/validators$': '<rootDir>/../../../packages/shared/validators/src/index.ts',
    '^@shared/(.*)$': '<rootDir>/../../shared/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/**/index.ts',
    '!src/**/types/**',
    '!src/**/migrations/**',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
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
  testTimeout: 10000,
  verbose: true,
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
};
