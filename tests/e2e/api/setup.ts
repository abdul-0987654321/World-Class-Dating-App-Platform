/**
 * E2E API Test Setup
 *
 * Configures the test environment for API E2E testing.
 * Supports local, staging, and production environments.
 */

import request from 'supertest';

// Environment configuration
export const config = {
  // Service URLs - configurable via environment variables
  AUTH_URL: process.env.AUTH_URL || 'http://localhost:3001',
  USER_URL: process.env.USER_URL || 'http://localhost:3002',
  MATCHING_URL: process.env.MATCHING_URL || 'http://localhost:3003',
  MESSAGING_URL: process.env.MESSAGING_URL || 'http://localhost:3004',
  NOTIFICATION_URL: process.env.NOTIFICATION_URL || 'http://localhost:3005',
  MEDIA_URL: process.env.MEDIA_URL || 'http://localhost:3006',
  PAYMENT_URL: process.env.PAYMENT_URL || 'http://localhost:3007',
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3000',

  // Test user credentials
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || `e2e-test-${Date.now()}@flamoral.test`,
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'E2ETestPassword123!',

  // Stripe test keys
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_mock',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret',

  // Internal service key for service-to-service communication
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',

  // Timeouts
  DEFAULT_TIMEOUT: parseInt(process.env.E2E_TIMEOUT || '30000'),
  LONG_TIMEOUT: parseInt(process.env.E2E_LONG_TIMEOUT || '60000'),
};

// Test state management
export interface TestState {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  email?: string;
  stripeCustomerId?: string;
}

export const testState: TestState = {};

/**
 * Creates a test user and authenticates
 */
export async function createTestUser(): Promise<TestState> {
  const uniqueEmail = `e2e-test-${Date.now()}-${Math.random().toString(36).substring(7)}@flamoral.test`;

  try {
    // Register new user
    const registerResponse = await request(config.AUTH_URL)
      .post('/api/auth/register')
      .send({
        email: uniqueEmail,
        password: config.TEST_USER_PASSWORD,
        firstName: 'E2E',
        lastName: 'TestUser',
        dateOfBirth: '1995-06-15',
        gender: 'male',
      })
      .timeout(config.DEFAULT_TIMEOUT);

    if (registerResponse.status === 201) {
      const data = registerResponse.body.data || registerResponse.body;
      testState.accessToken = data.accessToken;
      testState.refreshToken = data.refreshToken;
      testState.userId = data.user?.id || data.userId;
      testState.email = uniqueEmail;
      testState.stripeCustomerId = data.user?.stripeCustomerId;
      return testState;
    }
  } catch (error) {
    console.error('Failed to create test user:', error);
  }

  // Fallback: try to login with existing test credentials
  try {
    const loginResponse = await request(config.AUTH_URL)
      .post('/api/auth/login')
      .send({
        email: config.TEST_USER_EMAIL,
        password: config.TEST_USER_PASSWORD,
      })
      .timeout(config.DEFAULT_TIMEOUT);

    if (loginResponse.status === 200) {
      const data = loginResponse.body.data || loginResponse.body;
      testState.accessToken = data.accessToken;
      testState.refreshToken = data.refreshToken;
      testState.userId = data.user?.id;
      testState.email = config.TEST_USER_EMAIL;
      testState.stripeCustomerId = data.user?.stripeCustomerId;
    }
  } catch (error) {
    console.warn('Login fallback failed:', error);
  }

  return testState;
}

/**
 * Cleans up test user data
 */
export async function cleanupTestUser(): Promise<void> {
  if (testState.accessToken && testState.userId) {
    try {
      // Attempt to delete test user (if endpoint exists)
      await request(config.AUTH_URL)
        .delete(`/api/users/${testState.userId}`)
        .set('Authorization', `Bearer ${testState.accessToken}`)
        .timeout(config.DEFAULT_TIMEOUT);
    } catch (error) {
      // Cleanup failure is not critical
      console.warn('Cleanup failed (non-critical):', error);
    }
  }
}

/**
 * Helper to make authenticated requests
 */
export function authenticatedRequest(baseUrl: string = config.API_GATEWAY_URL) {
  const agent = request(baseUrl);

  return {
    get: (path: string) =>
      agent.get(path).set('Authorization', `Bearer ${testState.accessToken}`),
    post: (path: string) =>
      agent.post(path).set('Authorization', `Bearer ${testState.accessToken}`),
    put: (path: string) =>
      agent.put(path).set('Authorization', `Bearer ${testState.accessToken}`),
    patch: (path: string) =>
      agent.patch(path).set('Authorization', `Bearer ${testState.accessToken}`),
    delete: (path: string) =>
      agent.delete(path).set('Authorization', `Bearer ${testState.accessToken}`),
  };
}

/**
 * Generates a mock Stripe webhook signature for testing
 */
export function generateStripeWebhookSignature(payload: string, secret: string): string {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Wait helper for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry helper for flaky operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await wait(delay * (i + 1));
      }
    }
  }

  throw lastError!;
}

// Jest lifecycle hooks
beforeAll(async () => {
  console.log('Setting up E2E API tests...');
  console.log('Environment:', {
    AUTH_URL: config.AUTH_URL,
    USER_URL: config.USER_URL,
    PAYMENT_URL: config.PAYMENT_URL,
    MATCHING_URL: config.MATCHING_URL,
  });

  // Create test user for authenticated tests
  await createTestUser();

  if (!testState.accessToken) {
    console.warn('Warning: No access token available. Some tests may fail.');
  }
});

afterAll(async () => {
  console.log('Cleaning up E2E API tests...');
  await cleanupTestUser();
});

// Global Jest configuration
jest.setTimeout(config.DEFAULT_TIMEOUT);

// Export for use in tests
export { request };
