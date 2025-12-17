/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        skipLibCheck: true
      }
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/index.ts',
    '!src/**/index.ts',
    '!src/**/types/**',
    '!src/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
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
  displayName: 'media-service',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
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
