/// <reference types="jest" />
// Test setup file
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables from service-level and backend-level .env.test
dotenv.config({ path: path.join(__dirname, '../.env.test') });
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Set environment variables for tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// JWT Configuration (from .env.test or defaults)
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-jwt-access-secret-key-for-testing-min-32-chars';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-for-testing-min-32-chars';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Database Configuration (use test Docker Compose ports)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:test_password@localhost:5433/flamoral_test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5433';
process.env.DB_NAME = process.env.DB_NAME || 'flamoral_test';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';

// Redis Configuration (use test Docker Compose ports)
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6380';
process.env.REDIS_DB = process.env.REDIS_DB || '1';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380/1';

// Mock @flamoral/shared module
jest.mock('@flamoral/shared', () => ({
  createLogger: (serviceName: string) => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  }),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));

// Increase timeout for async operations
jest.setTimeout(10000);

// Global test setup
beforeAll(async () => {
  // Add any global setup here
});

// Clean up after all tests
afterAll(async () => {
  // Add any cleanup logic here
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
