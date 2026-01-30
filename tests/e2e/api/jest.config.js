/**
 * Jest configuration for API E2E tests
 * Runs against local, staging, or production environments
 *
 * Includes Allure reporting for comprehensive test results (if installed)
 */

// Safely resolve test environment - fall back to 'node' if allure-jest is not installed
let testEnvironment = 'node';
try {
  require.resolve('allure-jest/node');
  testEnvironment = 'allure-jest/node';
} catch {
  // allure-jest not installed, using default node environment
}

// Safely check if jest-junit is available
const reporters = ['default'];
try {
  require.resolve('jest-junit');
  reporters.push(['jest-junit', {
    outputDirectory: '<rootDir>/test-results/e2e',
    outputName: 'junit.xml',
  }]);
} catch {
  // jest-junit not installed, using default reporter only
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment,
  testEnvironmentOptions: {
    resultsDir: process.env.ALLURE_RESULTS_DIR || '<rootDir>/allure-results/api-e2e',
  },
  rootDir: '../../../',
  roots: ['<rootDir>/tests/e2e/api'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true,
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
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  reporters,
};
