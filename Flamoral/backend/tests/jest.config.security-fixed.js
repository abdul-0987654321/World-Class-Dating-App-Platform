/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  displayName: 'security',
  rootDir: '..',
  testMatch: [
    '<rootDir>/tests/security/**/*-fixed.test.ts',
    '<rootDir>/tests/security/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/security/sqli.test.ts',
    '<rootDir>/tests/security/xss.test.ts',
    '<rootDir>/tests/security/auth.test.ts'
  ],
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
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/security/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'services/**/src/**/*.ts',
    '!services/**/src/**/*.d.ts',
    '!services/**/src/**/index.ts',
    '!services/**/src/**/*.interface.ts',
    '!services/**/src/**/*.type.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/security',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
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
