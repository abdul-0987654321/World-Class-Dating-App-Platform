/**
 * Enhanced Jest configuration for integration tests
 * Supports both Docker Compose and Testcontainers for test dependencies
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/integration/**/*.test.ts', '**/integration/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '../services/**/src/**/*.ts',
    '!../services/**/src/**/*.d.ts',
    '!../services/**/src/**/index.ts',
    '!../services/**/src/**/*.interface.ts',
    '!../services/**/src/**/*.type.ts',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/integration/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../services/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@tests/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 60000, // Increased for integration tests with containers
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Run tests serially for integration tests
  globalSetup: '<rootDir>/integration/global-setup.ts',
  globalTeardown: '<rootDir>/integration/global-teardown.ts',
};
