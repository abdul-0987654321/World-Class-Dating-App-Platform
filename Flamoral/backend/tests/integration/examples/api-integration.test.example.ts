/**
 * Example API Integration Test
 * This demonstrates how to write integration tests for API endpoints
 */

import { createApiClient, getDatabaseHelper, createUserFixture } from '../helpers';

describe('API Integration Tests Example', () => {
  let apiClient: ReturnType<typeof createApiClient>;
  let dbHelper: ReturnType<typeof getDatabaseHelper>;

  beforeAll(async () => {
    // Initialize API client
    apiClient = createApiClient(process.env.API_GATEWAY_URL || 'http://localhost:4000');

    // Initialize database helper
    dbHelper = getDatabaseHelper();
    await dbHelper.initializePostgres({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5433'),
      database: process.env.TEST_DB_NAME || 'flamoral_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'test_password',
    });

    await dbHelper.initializeRedis(
      process.env.TEST_REDIS_URL || 'redis://localhost:6380'
    );
  });

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  beforeEach(async () => {
    // Clear database before each test
    await dbHelper.clearAll();
  });

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const response = await apiClient.post('/api/auth/register', userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should login with valid credentials', async () => {
      // Create a user in the database
      const user = await createUserFixture({
        email: 'test@example.com',
        password: 'Password123!',
      });

      await dbHelper.insert('users', {
        id: user.id,
        email: user.email,
        password_hash: user.passwordHash,
        first_name: user.firstName,
        last_name: user.lastName,
        date_of_birth: user.dateOfBirth,
        gender: user.gender,
      });

      // Attempt login
      const response = await apiClient.post('/api/auth/login', {
        email: user.email,
        password: 'Password123!',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should fail login with invalid credentials', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'nonexistent@example.com',
        password: 'WrongPassword',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should access protected route with valid token', async () => {
      // Create and authenticate user
      const user = await createUserFixture();
      apiClient.authenticateAs({ id: user.id!, email: user.email, role: 'user' });

      const response = await apiClient.get('/api/users/profile');

      expect(response.status).toBe(200);
    });
  });

  describe('User Profile Management', () => {
    it('should update user profile', async () => {
      // Create and authenticate user
      const user = await createUserFixture();
      await dbHelper.insert('users', {
        id: user.id,
        email: user.email,
        password_hash: user.passwordHash,
        first_name: user.firstName,
        last_name: user.lastName,
        date_of_birth: user.dateOfBirth,
        gender: user.gender,
      });

      apiClient.authenticateAs({ id: user.id!, email: user.email });

      const updateData = {
        bio: 'Updated bio',
        interests: ['travel', 'music', 'sports'],
      };

      const response = await apiClient.put('/api/users/profile', updateData);

      expect(response.status).toBe(200);
      expect(response.body.bio).toBe(updateData.bio);
      expect(response.body.interests).toEqual(updateData.interests);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(apiClient.post('/api/auth/login', {
          email: 'test@example.com',
          password: 'password',
        }));
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
