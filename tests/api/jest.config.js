/**
 * Jest Configuration for API Tests
 */

module.exports = {
  displayName: 'api-tests',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  projects: [
    {
      displayName: 'smoke',
      testMatch: ['<rootDir>/smoke/**/*.spec.ts'],
      testTimeout: 10000,
    },
    {
      displayName: 'contracts',
      testMatch: ['<rootDir>/contracts/**/*.spec.ts'],
    },
    {
      displayName: 'negative',
      testMatch: ['<rootDir>/negative/**/*.spec.ts'],
    },
    {
      displayName: 'auth',
      testMatch: ['<rootDir>/auth/**/*.spec.ts'],
    },
  ],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '../../test-results',
      outputName: 'api-junit.xml',
    }],
  ],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/helpers/**',
  ],
};
