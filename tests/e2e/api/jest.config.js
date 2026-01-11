/**
 * Jest configuration for API E2E tests
 * Runs against local or staging environments
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../../',
  roots: ['<rootDir>/tests/e2e/api'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/api/setup.ts'],
  testTimeout: 60000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Run tests serially for E2E tests
  collectCoverageFrom: [
    'backend/services/**/src/**/*.ts',
    '!backend/services/**/src/**/*.d.ts',
    '!backend/services/**/src/**/migrations/**',
    '!backend/services/**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results/e2e',
      outputName: 'junit.xml',
    }],
  ],
  // Environment variables for different environments
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
