/**
 * Authentication Helper for API Tests
 */

const request = require('supertest');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';

interface TokenCache {
  [key: string]: { token: string; expiresAt: number };
}

interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

const tokenCache: TokenCache = {};
const createdUsers: TestUser[] = [];

export async function getTestAccessToken(
  role: 'user' | 'premium' | 'admin' = 'user'
): Promise<string> {
  const cached = tokenCache[role];
  
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.token;
  }

  const credentials = getCredentials(role);
  
  const res = await request(API_URL)
    .post('/api/v1/auth/login')
    .send(credentials);

  if (res.status !== 200) {
    throw new Error('Failed to get token for ' + role + ': ' + res.status);
  }

  tokenCache[role] = {
    token: res.body.accessToken,
    expiresAt: Date.now() + 10 * 60 * 1000
  };

  return res.body.accessToken;
}

export async function createTestUser(options?: {
  email?: string;
  premium?: boolean;
}): Promise<TestUser> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const email = options?.email || 'test-' + timestamp + '-' + random + '@test.flamoral.com';
  const password = 'TestPassword123!';

  const res = await request(API_URL)
    .post('/api/v1/auth/register')
    .send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      gender: 'other'
    });

  if (res.status !== 201) {
    throw new Error('Failed to create test user: ' + res.status);
  }

  const user: TestUser = {
    id: res.body.user?.id || res.body.id,
    email,
    password,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken
  };

  createdUsers.push(user);
  return user;
}

export async function cleanupTestUser(user: TestUser): Promise<void> {
  try {
    await request(API_URL)
      .delete('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + user.accessToken);
  } catch (error) {
    console.warn('Failed to cleanup user ' + user.email);
  }
}

export async function cleanupAllTestUsers(): Promise<void> {
  for (const user of createdUsers) {
    await cleanupTestUser(user);
  }
  createdUsers.length = 0;
}

export function maskToken(token: string): string {
  if (!token || token.length < 20) return '***';
  return token.slice(0, 10) + '...' + token.slice(-5);
}

export function authenticatedRequest(baseUrl: string, token: string) {
  return {
    get: (path: string) => request(baseUrl).get(path).set('Authorization', 'Bearer ' + token),
    post: (path: string) => request(baseUrl).post(path).set('Authorization', 'Bearer ' + token),
    put: (path: string) => request(baseUrl).put(path).set('Authorization', 'Bearer ' + token),
    delete: (path: string) => request(baseUrl).delete(path).set('Authorization', 'Bearer ' + token)
  };
}

function getCredentials(role: string) {
  switch (role) {
    case 'admin':
      return {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@flamoral.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!'
      };
    case 'premium':
      return {
        email: process.env.TEST_PREMIUM_EMAIL || 'premium@flamoral.com',
        password: process.env.TEST_PREMIUM_PASSWORD || 'PremiumPassword123!'
      };
    default:
      return {
        email: process.env.TEST_USER_EMAIL || 'test@flamoral.com',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
      };
  }
}

export default {
  getTestAccessToken,
  createTestUser,
  cleanupTestUser,
  cleanupAllTestUsers,
  maskToken,
  authenticatedRequest
};
