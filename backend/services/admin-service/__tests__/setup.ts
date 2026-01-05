// Global test setup for admin-service

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_ADMIN_SECRET = 'test-admin-secret-key-that-is-at-least-32-characters-long';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.USER_SERVICE_URL = 'http://localhost:3001';
process.env.PAYMENT_SERVICE_URL = 'http://localhost:3002';
process.env.MODERATION_SERVICE_URL = 'http://localhost:3003';
process.env.ANALYTICS_SERVICE_URL = 'http://localhost:3004';
process.env.MESSAGING_SERVICE_URL = 'http://localhost:3005';

// Silence console during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers for date-based tests
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-04T12:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});
