/// <reference types="jest" />
/**
 * Security Test Setup
 * Configures the test environment for security testing
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test-specific environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Increase timeout for security tests
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  console.log('Security test suite starting...');
});

// Global teardown
afterAll(async () => {
  console.log('Security test suite complete.');
});
