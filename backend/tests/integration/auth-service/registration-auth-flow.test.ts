/**
 * Integration tests for User Registration and Authentication Flow
 * Tests complete user registration, login, logout, token refresh, and session management
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { createUserFixture } from '../helpers/fixtures';
import { faker } from '@faker-js/faker';

describe('User Registration and Authentication Flow', () => {
  let apiClient: ApiClient;
  let dbHelper: DatabaseHelper;
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  beforeAll(async () => {
    apiClient = createApiClient(AUTH_SERVICE_URL);
    dbHelper = getDatabaseHelper();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dateOfBirth: '1995-05-15',
        gender: 'male',
        phoneNumber: '+1234567890',
      };

      const response = await apiClient.post('/api/v1/auth/register', userData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            gender: userData.gender,
          },
        },
      });
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      // Verify user exists in database
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('email', userData.email).first();
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.is_email_verified).toBe(false);
      expect(user.is_active).toBe(true);
    });

    it('should fail with invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      const response = await apiClient.post('/api/v1/auth/register', userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/email/i);
    });

    it('should fail with weak password', async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      const response = await apiClient.post('/api/v1/auth/register', userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/password/i);
    });

    it('should fail with underage user (under 18)', async () => {
      const underageDate = new Date();
      underageDate.setFullYear(underageDate.getFullYear() - 16);

      const userData = {
        email: faker.internet.email(),
        password: 'SecurePass123!',
        firstName: 'Young',
        lastName: 'User',
        dateOfBirth: underageDate.toISOString().split('T')[0],
        gender: 'male',
      };

      const response = await apiClient.post('/api/v1/auth/register', userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/18|age/i);
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      // First registration
      await apiClient.post('/api/v1/auth/register', userData);

      // Attempt second registration with same email
      const response = await apiClient.post('/api/v1/auth/register', userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/already exists|duplicate/i);
    });

    it('should fail with missing required fields', async () => {
      const response = await apiClient.post('/api/v1/auth/register', {
        email: faker.internet.email(),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should sanitize and normalize user input', async () => {
      const userData = {
        email: '  USER@EXAMPLE.COM  ',
        password: 'SecurePass123!',
        firstName: '  John  ',
        lastName: '  Doe  ',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      const response = await apiClient.post('/api/v1/auth/register', userData);

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe('user@example.com');
      expect(response.body.data.user.firstName).toBe('John');
      expect(response.body.data.user.lastName).toBe('Doe');
    });
  });

  describe('User Login', () => {
    let testUser: any;
    const testPassword = 'SecurePass123!';

    beforeEach(async () => {
      // Register a test user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      const registerResponse = await apiClient.post('/api/v1/auth/register', userData);
      testUser = registerResponse.body.data.user;

      // Verify email for login tests
      const knex = dbHelper.getKnex();
      await knex('users')
        .where('email', testUser.email)
        .update({ is_email_verified: true });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: testUser.email,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: testUser.email,
          },
        },
      });
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Verify last_login_at was updated
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('email', testUser.email).first();
      expect(user.last_login_at).not.toBeNull();
    });

    it('should fail with incorrect password', async () => {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: testUser.email,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|credentials/i);
    });

    it('should fail with non-existent email', async () => {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: 'nonexistent@example.com',
        password: testPassword,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|credentials/i);
    });

    it('should fail for deactivated account', async () => {
      // Deactivate the user
      const knex = dbHelper.getKnex();
      await knex('users')
        .where('email', testUser.email)
        .update({ is_active: false });

      const response = await apiClient.post('/api/v1/auth/login', {
        email: testUser.email,
        password: testPassword,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/deactivated|suspended/i);
    });

    it('should handle case-insensitive email login', async () => {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: testUser.email.toUpperCase(),
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Token Refresh', () => {
    let testUser: any;
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      const registerResponse = await apiClient.post('/api/v1/auth/register', userData);
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.accessToken;
      refreshToken = registerResponse.body.data.refreshToken;
    });

    it('should refresh tokens successfully with valid refresh token', async () => {
      const response = await apiClient.post('/api/v1/auth/refresh', {
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.accessToken).not.toBe(accessToken);
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should fail with invalid refresh token', async () => {
      const response = await apiClient.post('/api/v1/auth/refresh', {
        refreshToken: 'invalid_token_123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with expired refresh token', async () => {
      // This would require mocking time or using a token with short expiry
      // For now, we'll test the endpoint exists
      const response = await apiClient.post('/api/v1/auth/refresh', {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should invalidate old refresh token after successful refresh', async () => {
      // First refresh
      const firstResponse = await apiClient.post('/api/v1/auth/refresh', {
        refreshToken,
      });

      expect(firstResponse.status).toBe(200);

      // Try to use old refresh token again
      const secondResponse = await apiClient.post('/api/v1/auth/refresh', {
        refreshToken,
      });

      expect(secondResponse.status).toBe(401);
      expect(secondResponse.body.success).toBe(false);
    });
  });

  describe('User Logout', () => {
    let testUser: any;
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      const registerResponse = await apiClient.post('/api/v1/auth/register', userData);
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.accessToken;
      refreshToken = registerResponse.body.data.refreshToken;
    });

    it('should logout successfully with valid token', async () => {
      apiClient.setAuthToken(accessToken);

      const response = await apiClient.post('/api/v1/auth/logout', {});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify tokens are invalidated by trying to use them
      const meResponse = await apiClient.get('/api/v1/auth/me');
      expect(meResponse.status).toBe(401);
    });

    it('should fail without authentication token', async () => {
      apiClient.clearAuth();

      const response = await apiClient.post('/api/v1/auth/logout', {});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should invalidate all user sessions on logout', async () => {
      apiClient.setAuthToken(accessToken);

      // Logout
      await apiClient.post('/api/v1/auth/logout', {});

      // Try to refresh token
      apiClient.clearAuth();
      const refreshResponse = await apiClient.post('/api/v1/auth/refresh', {
        refreshToken,
      });

      expect(refreshResponse.status).toBe(401);
    });
  });

  describe('Protected Endpoints', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      const registerResponse = await apiClient.post('/api/v1/auth/register', userData);
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.accessToken;
    });

    it('should access protected endpoint with valid token', async () => {
      apiClient.setAuthToken(accessToken);

      const response = await apiClient.get('/api/v1/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should fail to access protected endpoint without token', async () => {
      apiClient.clearAuth();

      const response = await apiClient.get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with malformed token', async () => {
      apiClient.setAuthToken('malformed_token');

      const response = await apiClient.get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJleHAiOjE2MDAwMDAwMDB9.signature';
      apiClient.setAuthToken(expiredToken);

      const response = await apiClient.get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration and login flow', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      // Step 1: Register
      const registerResponse = await apiClient.post('/api/v1/auth/register', userData);
      expect(registerResponse.status).toBe(201);
      const { user, accessToken: regAccessToken } = registerResponse.body.data;

      // Step 2: Verify user can access protected endpoints
      apiClient.setAuthToken(regAccessToken);
      const meResponse = await apiClient.get('/api/v1/auth/me');
      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.user.email).toBe(userData.email);

      // Step 3: Logout
      await apiClient.post('/api/v1/auth/logout', {});

      // Step 4: Login again
      apiClient.clearAuth();
      const loginResponse = await apiClient.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
      });
      expect(loginResponse.status).toBe(200);

      // Step 5: Access protected endpoint with new token
      apiClient.setAuthToken(loginResponse.body.data.accessToken);
      const meResponse2 = await apiClient.get('/api/v1/auth/me');
      expect(meResponse2.status).toBe(200);
    });
  });

  describe('Security Tests', () => {
    it('should hash passwords in database', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      await apiClient.post('/api/v1/auth/register', userData);

      const knex = dbHelper.getKnex();
      const user = await knex('users').where('email', userData.email).first();

      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(userData.password);
      expect(user.password_hash.length).toBeGreaterThan(50); // Bcrypt hashes are long
    });

    it('should not expose sensitive data in responses', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };

      const response = await apiClient.post('/api/v1/auth/register', userData);

      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(response.body.data.user.password_hash).toBeUndefined();
    });

    it('should enforce rate limiting on login attempts', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'WrongPassword123!',
      };

      // Make multiple failed login attempts
      const attempts = Array(15).fill(null);
      const responses = [];

      for (let i = 0; i < attempts.length; i++) {
        const response = await apiClient.post('/api/v1/auth/login', userData);
        responses.push(response.status);
      }

      // Should eventually get rate limited (429)
      const rateLimited = responses.some(status => status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
