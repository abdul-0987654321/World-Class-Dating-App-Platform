/**
 * E2E API Test Setup
 *
 * Configures the test environment for API E2E testing.
 * Supports local, staging, and production environments.
 */

import request from 'supertest';

// Production base URL (api.flamoral.com routes to the backend directly)
const RAILWAY_BASE_URL = 'https://api.flamoral.com';

// Environment configuration
export const config = {
  // Service URLs - configurable via environment variables
  // Default to production Railway gateway; all routes go through the API gateway in production
  AUTH_URL: process.env.AUTH_URL || RAILWAY_BASE_URL,
  USER_URL: process.env.USER_URL || RAILWAY_BASE_URL,
  MATCHING_URL: process.env.MATCHING_URL || RAILWAY_BASE_URL,
  MESSAGING_URL: process.env.MESSAGING_URL || RAILWAY_BASE_URL,
  NOTIFICATION_URL: process.env.NOTIFICATION_URL || RAILWAY_BASE_URL,
  MEDIA_URL: process.env.MEDIA_URL || RAILWAY_BASE_URL,
  PAYMENT_URL: process.env.PAYMENT_URL || RAILWAY_BASE_URL,
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || RAILWAY_BASE_URL,

  // Test user credentials
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || `e2e-test-${Date.now()}@example.com`,
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
 * Extract a token value from Set-Cookie headers.
 * Cookies are in format: "token_name=value; Max-Age=...; Path=...; ..."
 */
function extractTokenFromCookies(cookies: string | string[] | undefined, tokenName: string): string | undefined {
  if (!cookies) return undefined;
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
  for (const cookie of cookieArray) {
    if (cookie.startsWith(`${tokenName}=`)) {
      return cookie.split(';')[0].substring(tokenName.length + 1);
    }
  }
  return undefined;
}

/**
 * Extract tokens from response - checks both body and Set-Cookie headers
 */
function extractTokens(response: any): { accessToken?: string; refreshToken?: string } {
  const data = response.body?.data || response.body;
  // Try response body first
  let accessToken = data?.accessToken || data?.access_token;
  let refreshToken = data?.refreshToken || data?.refresh_token;
  // Fall back to Set-Cookie headers
  if (!accessToken) {
    const cookies = response.headers?.['set-cookie'];
    accessToken = extractTokenFromCookies(cookies, 'access_token');
    refreshToken = refreshToken || extractTokenFromCookies(cookies, 'refresh_token');
  }
  return { accessToken, refreshToken };
}

/**
 * Creates a test user and authenticates
 */
export async function createTestUser(): Promise<TestState> {
  const uniqueEmail = `e2e-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

  try {
    // Register new user
    const registerResponse = await request(config.AUTH_URL)
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        password: config.TEST_USER_PASSWORD,
        firstName: 'E2E',
        lastName: 'TestUser',
        dateOfBirth: '1995-06-15',
        gender: 'male',
        consents: { terms: true, privacy: true },
      })
      .timeout(config.DEFAULT_TIMEOUT);

    if (registerResponse.status === 201) {
      const data = registerResponse.body.data || registerResponse.body;
      testState.userId = data.user?.id || data.userId;
      testState.email = uniqueEmail;
      testState.stripeCustomerId = data.user?.stripeCustomerId;

      // Tokens may be in body or cookies; try login to get them
      const tokens = extractTokens(registerResponse);
      if (tokens.accessToken) {
        testState.accessToken = tokens.accessToken;
        testState.refreshToken = tokens.refreshToken;
        return testState;
      }
    }
  } catch (error) {
    console.error('Failed to register test user:', error);
  }

  // Login to get tokens (registration may not return them in body)
  const loginEmail = testState.email || config.TEST_USER_EMAIL;
  try {
    const loginResponse = await request(config.AUTH_URL)
      .post('/api/v1/auth/login')
      .send({
        email: loginEmail,
        password: config.TEST_USER_PASSWORD,
      })
      .timeout(config.DEFAULT_TIMEOUT);

    if (loginResponse.status === 200) {
      const data = loginResponse.body.data || loginResponse.body;
      const tokens = extractTokens(loginResponse);
      testState.accessToken = tokens.accessToken;
      testState.refreshToken = tokens.refreshToken;
      testState.userId = testState.userId || data.user?.id;
      testState.email = loginEmail;
      testState.stripeCustomerId = data.user?.stripeCustomerId;
    }
  } catch (error) {
    console.warn('Login failed:', error);
  }

  return testState;
}

/**
 * Cleans up test user data.
 * SAFETY: Only cleans up accounts with @flamoral.test email domain
 * to prevent accidental deletion of production user data.
 */
export async function cleanupTestUser(): Promise<void> {
  if (testState.accessToken && testState.userId) {
    // Safety guard: only clean up test accounts (identified by e2e-test prefix)
    if (!testState.email || !testState.email.startsWith('e2e-test-')) {
      console.warn('Skipping cleanup: user email is not a test account (e2e-test- prefix)');
      return;
    }

    try {
      // Attempt to delete test user (if endpoint exists)
      await request(config.AUTH_URL)
        .delete(`/api/v1/users/${testState.userId}`)
        .set('Authorization', `Bearer ${testState.accessToken}`)
        .timeout(config.DEFAULT_TIMEOUT);
    } catch (error) {
      // Cleanup failure is not critical
      console.warn('Cleanup failed (non-critical):', error);
    }
  }
}

/**
 * Helper to make authenticated requests with timeout
 */
export function authenticatedRequest(baseUrl: string = config.API_GATEWAY_URL) {
  const agent = request(baseUrl);

  return {
    get: (path: string) =>
      agent.get(path)
        .set('Authorization', `Bearer ${testState.accessToken}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
    post: (path: string) =>
      agent.post(path)
        .set('Authorization', `Bearer ${testState.accessToken}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
    put: (path: string) =>
      agent.put(path)
        .set('Authorization', `Bearer ${testState.accessToken}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
    patch: (path: string) =>
      agent.patch(path)
        .set('Authorization', `Bearer ${testState.accessToken}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
    delete: (path: string) =>
      agent.delete(path)
        .set('Authorization', `Bearer ${testState.accessToken}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
  };
}

/**
 * Creates a second independent test user (useful for cross-user/IDOR tests)
 */
export async function createSecondTestUser(): Promise<TestState> {
  const state: TestState = {};
  const uniqueEmail = `e2e-second-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

  try {
    const registerResponse = await request(config.AUTH_URL)
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        password: config.TEST_USER_PASSWORD,
        firstName: 'Second',
        lastName: 'TestUser',
        dateOfBirth: '1993-03-20',
        gender: 'female',
        consents: { terms: true, privacy: true },
      })
      .timeout(config.DEFAULT_TIMEOUT);

    if (registerResponse.status === 201) {
      const data = registerResponse.body.data || registerResponse.body;
      state.userId = data.user?.id || data.userId;
      state.email = uniqueEmail;

      // Try login to get tokens
      const loginRes = await request(config.AUTH_URL)
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: config.TEST_USER_PASSWORD })
        .timeout(config.DEFAULT_TIMEOUT);

      if (loginRes.status === 200) {
        const tokens = extractTokens(loginRes);
        state.accessToken = tokens.accessToken;
        state.refreshToken = tokens.refreshToken;
      }
    }
  } catch (error) {
    console.warn('Failed to create second test user:', error);
  }

  return state;
}

/**
 * Generate a mock JWT token with custom claims for RBAC testing.
 * Uses jsonwebtoken to create tokens with specific roles.
 * NOTE: Only works if the API gateway accepts the test JWT secret.
 */
export function generateMockToken(claims: {
  userId?: string;
  email?: string;
  roles?: string[];
  subscription?: string;
  exp?: number;
}): string {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_ACCESS_SECRET || 'test_secret';
  const payload = {
    userId: claims.userId || 'mock-user-id',
    email: claims.email || 'mock@example.com',
    roles: claims.roles || ['user'],
    subscription: claims.subscription || 'free',
    iat: Math.floor(Date.now() / 1000),
    exp: claims.exp || Math.floor(Date.now() / 1000) + 3600,
  };
  return jwt.sign(payload, secret);
}

/**
 * Helper to make authenticated requests with a specific token
 */
export function requestWithToken(token: string, baseUrl: string = config.API_GATEWAY_URL) {
  const agent = request(baseUrl);

  return {
    get: (path: string) =>
      agent.get(path)
        .set('Authorization', `Bearer ${token}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
    post: (path: string) =>
      agent.post(path)
        .set('Authorization', `Bearer ${token}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
    put: (path: string) =>
      agent.put(path)
        .set('Authorization', `Bearer ${token}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
    patch: (path: string) =>
      agent.patch(path)
        .set('Authorization', `Bearer ${token}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
    delete: (path: string) =>
      agent.delete(path)
        .set('Authorization', `Bearer ${token}`)
        .timeout({ response: config.DEFAULT_TIMEOUT, deadline: config.LONG_TIMEOUT }),
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
}, 60000);

afterAll(async () => {
  console.log('Cleaning up E2E API tests...');
  await cleanupTestUser();
});

// Global Jest configuration
jest.setTimeout(config.DEFAULT_TIMEOUT);

// Export for use in tests
export { request };
