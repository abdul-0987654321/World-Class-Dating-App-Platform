/// <reference types="jest" />
/**
 * Contract Test Setup
 * Configures the test environment for Pact contract testing
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test-specific environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Increase timeout for contract tests
jest.setTimeout(60000);

// Global setup
beforeAll(async () => {
  console.log('Contract test suite starting...');
});

// Global teardown
afterAll(async () => {
  console.log('Contract test suite complete.');
});
