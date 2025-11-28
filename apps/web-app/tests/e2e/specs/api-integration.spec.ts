import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

test.describe('Backend API Integration Tests', () => {
  let apiContext: APIRequestContext;
  let accessToken: string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('Auth Service Integration', () => {
    test('should login with valid credentials', async () => {
      const response = await apiContext.post('/auth/login', {
        data: {
          email: 'test1@connectsphere.com',
          password: 'TestUser1!',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();

      accessToken = data.accessToken;
    });

    test('should reject invalid credentials', async () => {
      const response = await apiContext.post('/auth/login', {
        data: {
          email: 'invalid@test.com',
          password: 'wrongpassword',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should validate token', async () => {
      // First login to get token
      const loginResponse = await apiContext.post('/auth/login', {
        data: {
          email: 'test1@connectsphere.com',
          password: 'TestUser1!',
        },
      });
      const loginData = await loginResponse.json();

      // Validate token
      const validateResponse = await apiContext.get('/auth/validate', {
        headers: {
          Authorization: `Bearer ${loginData.accessToken}`,
        },
      });

      expect(validateResponse.ok()).toBeTruthy();
      const data = await validateResponse.json();
      expect(data.user).toBeDefined();
    });

    test('should refresh token', async () => {
      // First login to get tokens
      const loginResponse = await apiContext.post('/auth/login', {
        data: {
          email: 'test1@connectsphere.com',
          password: 'TestUser1!',
        },
      });
      const loginData = await loginResponse.json();

      // Refresh token
      const refreshResponse = await apiContext.post('/auth/refresh', {
        data: {
          refreshToken: loginData.refreshToken,
        },
      });

      expect(refreshResponse.ok()).toBeTruthy();
      const data = await refreshResponse.json();
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });
  });

  test.describe('User Service Integration', () => {
    test.beforeEach(async () => {
      // Login to get access token for protected routes
      const response = await apiContext.post('/auth/login', {
        data: {
          email: 'test1@connectsphere.com',
          password: 'TestUser1!',
        },
      });
      const data = await response.json();
      accessToken = data.accessToken;
    });

    test('should get user profile', async () => {
      const response = await apiContext.get('/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.email).toBe('test1@connectsphere.com');
      expect(data.first_name).toBeDefined();
    });

    test('should update user profile', async () => {
      const response = await apiContext.patch('/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          bio: 'Test bio updated via API integration test',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.bio).toBe('Test bio updated via API integration test');
    });

    test('should get user preferences', async () => {
      const response = await apiContext.get('/users/me/preferences', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });

  test.describe('Matching Service Integration', () => {
    test.beforeEach(async () => {
      const response = await apiContext.post('/auth/login', {
        data: {
          email: 'test1@connectsphere.com',
          password: 'TestUser1!',
        },
      });
      const data = await response.json();
      accessToken = data.accessToken;
    });

    test('should get recommendations', async () => {
      const response = await apiContext.get('/matching/recommendations', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data.profiles || data)).toBeTruthy();
    });

    test('should record swipe action', async () => {
      // First get recommendations
      const recResponse = await apiContext.get('/matching/recommendations', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const recommendations = await recResponse.json();
      const profiles = recommendations.profiles || recommendations;

      if (profiles.length > 0) {
        const targetUserId = profiles[0].id;

        const response = await apiContext.post('/matching/swipe', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            targetUserId,
            action: 'like',
          },
        });

        // Could be 200 (success) or 201 (match created)
        expect([200, 201]).toContain(response.status());
      }
    });

    test('should get matches', async () => {
      const response = await apiContext.get('/matching/matches', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data.matches || data)).toBeTruthy();
    });
  });

  test.describe('Messaging Service Integration', () => {
    test.beforeEach(async () => {
      const response = await apiContext.post('/auth/login', {
        data: {
          email: 'test1@connectsphere.com',
          password: 'TestUser1!',
        },
      });
      const data = await response.json();
      accessToken = data.accessToken;
    });

    test('should get conversations', async () => {
      const response = await apiContext.get('/messages/conversations', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data.conversations || data)).toBeTruthy();
    });
  });

  test.describe('Health Check Integration', () => {
    test('should return healthy status for API Gateway', async () => {
      const response = await apiContext.get('/health');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });
  });
});
