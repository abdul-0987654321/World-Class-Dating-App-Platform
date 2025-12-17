import { Pool } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Test database connection
let testDb: Pool;
let testRedis: Redis;

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-key-for-testing-min-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-min-32-chars';

// Mock @flamoral/shared module
jest.mock('@flamoral/shared', () => ({
  createLogger: (serviceName: string) => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  }),
}));

// Global setup before all tests
beforeAll(async () => {
  console.log('Setting up e2e test environment...');

  // Initialize test database
  testDb = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    database: process.env.TEST_DB_NAME || 'flamoral_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
  });

  // Initialize test Redis
  testRedis = new Redis({
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6380'),
    db: parseInt(process.env.TEST_REDIS_DB || '1'),
  });

  console.log('E2E test environment ready');
}, 60000);

// Global teardown after all tests
afterAll(async () => {
  console.log('Tearing down e2e test environment...');

  // Close connections
  if (testDb) {
    await testDb.end();
  }
  if (testRedis) {
    await testRedis.quit();
  }

  console.log('E2E test environment cleaned up');
}, 30000);

// Clean database before each test
beforeEach(async () => {
  if (testRedis) {
    await testRedis.flushdb();
  }
});

// Export test utilities
export const getTestDb = () => testDb;
export const getTestRedis = () => testRedis;
