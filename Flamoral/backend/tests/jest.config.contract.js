/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  displayName: 'contract',
  rootDir: '..',
  testMatch: ['<rootDir>/tests/contract/**/*.test.ts', '<rootDir>/tests/contract/**/*.spec.ts'],
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
  setupFilesAfterEnv: ['<rootDir>/tests/contract/setup.ts'],
  testTimeout: 60000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  globalSetup: '<rootDir>/tests/contract/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/contract/globalTeardown.ts',
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
