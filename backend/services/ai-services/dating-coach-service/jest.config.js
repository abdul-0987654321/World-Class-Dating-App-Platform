// NOTE: dating-coach-service is a Python service. This Jest config is provided
// for any future JavaScript/TypeScript test utilities or integration tests.
// For Python tests, use `pytest` instead.
module.exports = {
  displayName: 'ai-dating-coach-service',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
