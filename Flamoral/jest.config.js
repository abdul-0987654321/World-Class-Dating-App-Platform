/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Project-based configuration for monorepo
  projects: [
    {
      displayName: 'backend-services',
      preset: 'ts-jest',
      testEnvironment: 'node',
      rootDir: './backend',
      testMatch: [
        '<rootDir>/services/**/tests/**/*.test.ts',
        '<rootDir>/services/**/src/**/__tests__/**/*.test.ts',
        '<rootDir>/services/**/__tests__/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/services/$1/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        // Specific submodule mappings (must come before generic mappings)
        '^@flamoral/shared/utils/(.*)$': '<rootDir>/../packages/shared/utils/src/$1',
        '^@flamoral/shared/types/(.*)$': '<rootDir>/../packages/shared/types/src/$1',
        '^@flamoral/shared/constants/(.*)$': '<rootDir>/../packages/shared/constants/src/$1',
        '^@flamoral/shared/validators/(.*)$': '<rootDir>/../packages/shared/validators/src/$1',
        // Generic package mappings
        '^@flamoral/shared$': '<rootDir>/../packages/shared/src/index.ts',
        '^@flamoral/shared/(.*)$': '<rootDir>/../packages/shared/$1/src/index.ts',
        '^@flamoral/utils$': '<rootDir>/../packages/shared/utils/src/index.ts',
        '^@flamoral/types$': '<rootDir>/../packages/shared/types/src/index.ts',
        '^@flamoral/constants$': '<rootDir>/../packages/shared/constants/src/index.ts',
        '^@flamoral/validators$': '<rootDir>/../packages/shared/validators/src/index.ts',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      collectCoverageFrom: [
        'services/**/src/**/*.ts',
        '!services/**/src/**/*.d.ts',
        '!services/**/src/**/index.ts',
        '!services/**/src/**/*.interface.ts',
        '!services/**/src/**/*.type.ts',
        '!services/**/src/**/types/**',
        '!services/**/src/**/migrations/**',
        '!services/**/src/**/__tests__/**',
        '!services/**/dist/**',
        '!services/**/node_modules/**',
      ],
      coverageDirectory: '<rootDir>/../coverage/backend',
    },
    {
      displayName: 'packages',
      preset: 'ts-jest',
      testEnvironment: 'node',
      rootDir: './packages',
      testMatch: [
        '<rootDir>/**/tests/**/*.test.ts',
        '<rootDir>/**/__tests__/**/*.test.ts',
      ],
      moduleNameMapper: {
        // Specific submodule mappings (must come before generic mappings)
        '^@flamoral/shared/utils/(.*)$': '<rootDir>/shared/utils/src/$1',
        '^@flamoral/shared/types/(.*)$': '<rootDir>/shared/types/src/$1',
        '^@flamoral/shared/constants/(.*)$': '<rootDir>/shared/constants/src/$1',
        '^@flamoral/shared/validators/(.*)$': '<rootDir>/shared/validators/src/$1',
        // Generic package mappings
        '^@flamoral/shared$': '<rootDir>/shared/src/index.ts',
        '^@flamoral/shared/(.*)$': '<rootDir>/shared/$1/src/index.ts',
        '^@flamoral/utils$': '<rootDir>/shared/utils/src/index.ts',
        '^@flamoral/types$': '<rootDir>/shared/types/src/index.ts',
        '^@flamoral/constants$': '<rootDir>/shared/constants/src/index.ts',
        '^@flamoral/validators$': '<rootDir>/shared/validators/src/index.ts',
      },
      collectCoverageFrom: [
        '**/src/**/*.ts',
        '!**/src/**/*.d.ts',
        '!**/src/**/index.ts',
        '!**/src/**/*.interface.ts',
        '!**/src/**/*.type.ts',
        '!**/dist/**',
        '!**/node_modules/**',
      ],
      coverageDirectory: '<rootDir>/../coverage/packages',
    },
  ],

  // Global coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'cobertura'],
  collectCoverageFrom: [
    'backend/services/**/src/**/*.ts',
    'packages/**/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/__tests__/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/migrations/**',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Global settings
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: '50%',

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        skipLibCheck: true,
        strict: false, // Relax for tests
        types: ['node', 'jest'], // Include jest types
      },
    }],
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],

  // Watch mode settings
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],
};
