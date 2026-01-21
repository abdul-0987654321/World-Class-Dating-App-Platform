/**
 * API Smoke Tests
 * Fast health checks for PR gates
 * Target: 20 tests, < 2 min execution
 */

const request = require('supertest');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

describe('API Smoke Tests', () => {
  let accessToken: string;

  describe('Health Endpoints', () => {
    test('API Gateway health check', async () => {
      const res = await request(API_URL).get('/health');
      expect(res.status).toBe(200);
    });

    test('Auth Service health check', async () => {
      const res = await request(AUTH_URL).get('/health');
      expect(res.status).toBe(200);
    });

    test('API Gateway readiness', async () => {
      const res = await request(API_URL).get('/ready');
      expect(res.status).toBe(200);
    });
  });

  describe('Auth Flow', () => {
    const timestamp = new Date().getTime();
    const testEmail = 'smoke-' + timestamp + '@test.flamoral.com';
    const testPassword = 'SmokeTest123!';

    test('should register a new user', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Smoke',
          lastName: 'Test',
          dateOfBirth: '1990-01-01',
          gender: 'other'
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      accessToken = res.body.accessToken;
    });

    test('should login with credentials', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      accessToken = res.body.accessToken;
    });

    test('should reject invalid credentials', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('User Profile', () => {
    test('should get current user profile', async () => {
      const res = await request(API_URL)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer ' + accessToken);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email');
    });

    test('should update user profile', async () => {
      const res = await request(API_URL)
        .put('/api/v1/users/me/profile')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ bio: 'Smoke test bio' });
      
      expect(res.status).toBe(200);
    });

    test('should reject unauthenticated request', async () => {
      const res = await request(API_URL).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Discovery', () => {
    test('should get discovery profiles', async () => {
      const res = await request(API_URL)
        .get('/api/v1/discovery')
        .set('Authorization', 'Bearer ' + accessToken);
      
      expect(res.status).toBe(200);
    });

    test('should get matches', async () => {
      const res = await request(API_URL)
        .get('/api/v1/matches')
        .set('Authorization', 'Bearer ' + accessToken);
      
      expect(res.status).toBe(200);
    });
  });

  describe('Messaging', () => {
    test('should get conversations', async () => {
      const res = await request(API_URL)
        .get('/api/v1/conversations')
        .set('Authorization', 'Bearer ' + accessToken);
      
      expect(res.status).toBe(200);
    });
  });

  describe('Subscriptions', () => {
    test('should get subscription plans', async () => {
      const res = await request(API_URL)
        .get('/api/v1/subscriptions/plans')
        .set('Authorization', 'Bearer ' + accessToken);
      
      expect(res.status).toBe(200);
    });
  });

  describe('Notifications', () => {
    test('should get notifications', async () => {
      const res = await request(API_URL)
        .get('/api/v1/notifications')
        .set('Authorization', 'Bearer ' + accessToken);
      
      expect(res.status).toBe(200);
    });
  });
});
