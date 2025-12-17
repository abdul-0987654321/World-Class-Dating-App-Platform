/**
 * Enhanced Jest configuration for integration tests
 * Supports both Docker Compose and Testcontainers for test dependencies
 */

/** @type {import('jest').Config} */
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
        moduleResolution: 'node',
        resolveJsonModule: true,
        skipLibCheck: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '../services/**/src/**/*.ts',
    '!../services/**/src/**/*.d.ts',
    '!../services/**/src/**/index.ts',
    '!../services/**/src/**/*.interface.ts',
    '!../services/**/src/**/*.type.ts',
    '!../services/**/src/**/types/**',
    '!../services/**/src/**/migrations/**',
    '!../services/**/dist/**',
    '!../services/**/node_modules/**'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  setupFilesAfterEnv: ['<rootDir>/integration/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../services/$1/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@flamoral/shared$': '<rootDir>/../shared/index.ts',
    '^@flamoral/shared/(.*)$': '<rootDir>/../shared/$1',
    '^@tests/(.*)$': '<rootDir>/$1'
  },
  testTimeout: 60000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  globalSetup: '<rootDir>/integration/global-setup.ts',
  globalTeardown: '<rootDir>/integration/global-teardown.ts',
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        skipLibCheck: true
      }
    }
  }
};
