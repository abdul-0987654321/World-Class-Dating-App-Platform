/// <reference types="jest" />
import axios from 'axios';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test configuration
export const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://localhost:3003',
  messagingServiceUrl: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3004',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
  mediaServiceUrl: process.env.MEDIA_SERVICE_URL || 'http://localhost:3006',
  testTimeout: 30000,
};

// Test user credentials
export const testUsers = {
  regular: {
    email: 'test-regular@flamoral.com',
    password: 'TestPass123!',
    token: '',
  },
  premium: {
    email: 'test-premium@flamoral.com',
    password: 'TestPass123!',
    token: '',
  },
  admin: {
    email: 'test-admin@flamoral.com',
    password: 'AdminPass123!',
    token: '',
  },
};

// HTTP client configuration
export const httpClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
httpClient.interceptors.request.use((config) => {
  const token = testUsers.regular.token || testUsers.premium.token || testUsers.admin.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper function to login and get token
export async function loginUser(email: string, password: string): Promise<string> {
  try {
    const response = await axios.post(`${config.authServiceUrl}/api/v1/auth/login`, {
      email,
      password,
    });
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Helper function to create test user
export async function createTestUser(userData: {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  gender: string;
}): Promise<any> {
  try {
    const response = await axios.post(`${config.authServiceUrl}/api/v1/auth/register`, userData);
    return response.data;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

// Helper function to cleanup test data
export async function cleanupTestData(userId: string, token: string): Promise<void> {
  try {
    await axios.delete(`${config.userServiceUrl}/api/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Global setup - run before all tests
beforeAll(async () => {
  console.log('Setting up integration tests...');

  // Wait for services to be ready
  await waitForServices();

  // Login test users and store tokens
  try {
    testUsers.regular.token = await loginUser(testUsers.regular.email, testUsers.regular.password);
    testUsers.premium.token = await loginUser(testUsers.premium.email, testUsers.premium.password);
    testUsers.admin.token = await loginUser(testUsers.admin.email, testUsers.admin.password);
  } catch (error) {
    console.warn('Could not login test users, they may need to be created');
  }
});

// Global teardown - run after all tests
afterAll(async () => {
  console.log('Tearing down integration tests...');
});

// Helper to wait for services to be ready
async function waitForServices(maxRetries = 30, retryDelay = 1000): Promise<void> {
  const services = [
    config.authServiceUrl,
    config.userServiceUrl,
    config.matchingServiceUrl,
    config.messagingServiceUrl,
  ];

  for (const serviceUrl of services) {
    let retries = 0;
    let ready = false;

    while (!ready && retries < maxRetries) {
      try {
        await axios.get(`${serviceUrl}/health`, { timeout: 2000 });
        ready = true;
        console.log(`✓ ${serviceUrl} is ready`);
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          console.warn(`⚠ ${serviceUrl} not ready after ${maxRetries} retries`);
        }
      }
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },
  toBeValidISODate(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received === date.toISOString();

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid ISO date`
          : `expected ${received} to be a valid ISO date`,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidISODate(): R;
    }
  }
}
