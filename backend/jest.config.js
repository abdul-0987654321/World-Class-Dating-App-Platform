const path = require('path');

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
    outputDirectory: '<rootDir>/test-results',
    outputName: 'junit.xml',
  }]);
} catch {
  // jest-junit not installed, using default reporter only
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment,
  testEnvironmentOptions: {
    resultsDir: process.env.ALLURE_RESULTS_DIR || path.join(__dirname, 'allure-results'),
  },
  roots: ['<rootDir>/services'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      }
    }]
  },
  collectCoverageFrom: [
    'services/**/src/**/*.ts',
    '!services/**/src/**/*.d.ts',
    '!services/**/src/**/index.ts',
    '!services/**/src/**/*.interface.ts',
    '!services/**/src/**/*.type.ts',
    '!services/**/src/**/migrations/**',
    '!services/**/src/**/__tests__/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/services/$1/src/$1',
    '^@shared/(.*)$': '<rootDir>/services/shared/$1',
    '^@flamoral/backend-shared$': '<rootDir>/shared/index.ts',
    '^@flamoral/backend-shared/(.*)$': '<rootDir>/shared/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  reporters,
  testTimeout: 30000,
  verbose: true,
  maxWorkers: '50%',
};
