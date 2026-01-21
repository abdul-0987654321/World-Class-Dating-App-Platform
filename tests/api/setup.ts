/**
 * API Tests Setup
 */

import { cleanupAllTestUsers } from './helpers/auth-helper';

// Extend Jest timeout for API tests
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  console.log('API Tests starting...');
  console.log('API URL:', process.env.API_GATEWAY_URL || 'http://localhost:4000');
});

// Global teardown
afterAll(async () => {
  console.log('Cleaning up test users...');
  await cleanupAllTestUsers();
  console.log('API Tests completed.');
});

// Export helpers for tests
export * from './helpers/auth-helper';
