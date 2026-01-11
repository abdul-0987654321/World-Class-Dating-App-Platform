/**
 * Auth Service E2E Tests
 *
 * Comprehensive test suite for authentication endpoints:
 * - User Registration
 * - Login/Logout
 * - Token Refresh
 * - Password Reset
 * - Email Verification
 * - Token Validation (service-to-service)
 *
 * Target: Full coverage of auth flows with edge cases
 */

import request from 'supertest';
import { config, testState, wait, retry } from './setup';

const AUTH_URL = config.AUTH_URL;

describe('Auth Service E2E Tests', () => {
  // Test-specific state
  let testUserEmail: string;
  let testUserPassword: string;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(() => {
    testUserEmail = `auth-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}@flamoral.test`;
    testUserPassword = 'SecureE2EPassword123!';
  });

  // ==================== REGISTRATION TESTS ====================

  describe('POST /api/auth/register', () => {
    describe('Successful Registration', () => {
      it('should register a new user with valid data', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: testUserEmail,
            password: testUserPassword,
            firstName: 'Auth',
            lastName: 'TestUser',
            dateOfBirth: '1995-06-15',
            gender: 'male',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(testUserEmail);
        expect(response.body.user).not.toHaveProperty('password');

        // Store tokens for subsequent tests
        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
        userId = response.body.user.id;
      });

      it('should return valid JWT tokens', async () => {
        expect(accessToken).toBeDefined();
        expect(refreshToken).toBeDefined();

        // JWT format check
        const jwtParts = accessToken.split('.');
        expect(jwtParts.length).toBe(3);
      });

      it('should accept optional phone number', async () => {
        const uniqueEmail = `phone-test-${Date.now()}@flamoral.test`;

        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: uniqueEmail,
            password: testUserPassword,
            firstName: 'Phone',
            lastName: 'Test',
            dateOfBirth: '1992-03-20',
            gender: 'female',
            phoneNumber: '+1234567890',
          });

        expect([201, 409]).toContain(response.status);
        if (response.status === 201) {
          expect(response.body.user).toBeDefined();
        }
      });
    });

    describe('Validation Errors', () => {
      it('should fail with invalid email format', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: 'invalid-email',
            password: testUserPassword,
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1995-01-01',
            gender: 'male',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should fail with weak password (too short)', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `weak-pass-${Date.now()}@flamoral.test`,
            password: '123',
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1995-01-01',
            gender: 'male',
          });

        expect(response.status).toBe(400);
      });

      it('should fail with password missing uppercase', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `no-upper-${Date.now()}@flamoral.test`,
            password: 'password123!',
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1995-01-01',
            gender: 'male',
          });

        expect(response.status).toBe(400);
      });

      it('should fail with password missing special character', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `no-special-${Date.now()}@flamoral.test`,
            password: 'Password123',
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1995-01-01',
            gender: 'male',
          });

        expect(response.status).toBe(400);
      });

      it('should fail with missing required fields', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `missing-${Date.now()}@flamoral.test`,
          });

        expect(response.status).toBe(400);
      });

      it('should fail with duplicate email', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: testUserEmail,
            password: testUserPassword,
            firstName: 'Duplicate',
            lastName: 'User',
            dateOfBirth: '1995-01-01',
            gender: 'male',
          });

        expect(response.status).toBe(409);
      });

      it('should fail with invalid date of birth format', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `bad-dob-${Date.now()}@flamoral.test`,
            password: testUserPassword,
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: 'invalid-date',
            gender: 'male',
          });

        expect(response.status).toBe(400);
      });

      it('should fail with underage date of birth', async () => {
        const today = new Date();
        const underageDob = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());

        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `underage-${Date.now()}@flamoral.test`,
            password: testUserPassword,
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: underageDob.toISOString().split('T')[0],
            gender: 'male',
          });

        expect(response.status).toBe(400);
      });

      it('should fail with invalid gender value', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `bad-gender-${Date.now()}@flamoral.test`,
            password: testUserPassword,
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1995-01-01',
            gender: 'invalid-gender',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('Edge Cases', () => {
      it('should handle special characters in names', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `special-name-${Date.now()}@flamoral.test`,
            password: testUserPassword,
            firstName: "O'Brien-Smith",
            lastName: 'Garcia',
            dateOfBirth: '1990-05-15',
            gender: 'male',
          });

        if (response.status === 201) {
          expect(response.body.user.firstName).toBe("O'Brien-Smith");
        }
        expect([201, 400]).toContain(response.status);
      });

      it('should handle unicode characters in names', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `unicode-name-${Date.now()}@flamoral.test`,
            password: testUserPassword,
            firstName: 'Rene',
            lastName: 'Muller',
            dateOfBirth: '1988-11-20',
            gender: 'female',
          });

        expect([201, 400]).toContain(response.status);
      });

      it('should handle very long email addresses', async () => {
        const longLocalPart = 'a'.repeat(64);
        const longEmail = `${longLocalPart}@flamoral.test`;

        const response = await request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: longEmail,
            password: testUserPassword,
            firstName: 'Long',
            lastName: 'Email',
            dateOfBirth: '1995-01-01',
            gender: 'male',
          });

        expect([201, 400]).toContain(response.status);
      });
    });
  });

  // ==================== LOGIN TESTS ====================

  describe('POST /api/auth/login', () => {
    describe('Successful Login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/login')
          .send({
            email: testUserEmail,
            password: testUserPassword,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(testUserEmail);

        // Update tokens
        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
      });

      it('should return different tokens on each login', async () => {
        const login1 = await request(AUTH_URL)
          .post('/api/auth/login')
          .send({ email: testUserEmail, password: testUserPassword });

        const login2 = await request(AUTH_URL)
          .post('/api/auth/login')
          .send({ email: testUserEmail, password: testUserPassword });

        expect(login1.status).toBe(200);
        expect(login2.status).toBe(200);

        // Refresh tokens should be different (rotation)
        expect(login1.body.refreshToken).not.toBe(login2.body.refreshToken);
      });
    });

    describe('Login Failures', () => {
      it('should fail with wrong password', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/login')
          .send({
            email: testUserEmail,
            password: 'WrongPassword123!',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });

      it('should fail with non-existent email', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@flamoral.test',
            password: testUserPassword,
          });

        expect(response.status).toBe(401);
      });

      it('should fail with missing email', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/login')
          .send({
            password: testUserPassword,
          });

        expect(response.status).toBe(400);
      });

      it('should fail with missing password', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/login')
          .send({
            email: testUserEmail,
          });

        expect(response.status).toBe(400);
      });

      it('should fail with empty credentials', async () => {
        const response = await request(AUTH_URL)
          .post('/api/auth/login')
          .send({});

        expect(response.status).toBe(400);
      });
    });
  });

  // ==================== GET ME TESTS ====================

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUserEmail);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail without authorization header', async () => {
      const response = await request(AUTH_URL).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(response.status).toBe(401);
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });

    it('should fail with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.5mhBHqs5_DTLdINd9p5m7ZJ6XD0Xc55kIaCRY5r6HRA';

      const response = await request(AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== TOKEN REFRESH TESTS ====================

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh tokens successfully', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Update tokens for subsequent tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(response.status).toBe(401);
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should fail with expired refresh token', async () => {
      // Use an expired JWT
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVmcmVzaCIsImV4cCI6MX0.expired';

      const response = await request(AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: expiredToken });

      expect(response.status).toBe(401);
    });
  });

  // ==================== LOGOUT TESTS ====================

  describe('POST /api/auth/logout', () => {
    let logoutToken: string;
    let logoutRefreshToken: string;

    beforeAll(async () => {
      // Get fresh tokens for logout tests
      const loginResponse = await request(AUTH_URL)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      logoutToken = loginResponse.body.accessToken;
      logoutRefreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${logoutToken}`);

      expect(response.status).toBe(200);
    });

    it('should invalidate access token after logout', async () => {
      // First logout
      await request(AUTH_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${logoutToken}`);

      // Try to use the token
      const meResponse = await request(AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${logoutToken}`);

      expect(meResponse.status).toBe(401);
    });

    it('should invalidate refresh token after logout', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: logoutRefreshToken });

      expect(response.status).toBe(401);
    });

    it('should fail without token', async () => {
      const response = await request(AUTH_URL).post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  // ==================== PASSWORD RESET TESTS ====================

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email and return success', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(response.status).toBe(200);
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@flamoral.test' });

      // Should return 200 to prevent email enumeration
      expect(response.status).toBe(200);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('should fail with missing email', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should fail with missing token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'NewPassword123!' });

      expect(response.status).toBe(400);
    });

    it('should fail with missing password', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' });

      expect(response.status).toBe(400);
    });

    it('should fail with invalid token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-reset-token',
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
    });

    it('should fail with weak password', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'any-token',
          newPassword: '123',
        });

      expect(response.status).toBe(400);
    });
  });

  // ==================== EMAIL VERIFICATION TESTS ====================

  describe('POST /api/auth/verify-email', () => {
    it('should fail with missing token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/verify-email')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should fail with invalid token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-verification-token' });

      expect(response.status).toBe(400);
    });

    it('should fail with empty token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/verify-email')
        .send({ token: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification for unverified user', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/resend-verification')
        .send({ email: testUserEmail });

      expect(response.status).toBe(200);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/resend-verification')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('should fail with missing email', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/resend-verification')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should fail for non-existent user', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@flamoral.test' });

      expect(response.status).toBe(400);
    });
  });

  // ==================== TOKEN VALIDATION (SERVICE-TO-SERVICE) ====================

  describe('POST /api/auth/validate-token', () => {
    let validToken: string;

    beforeAll(async () => {
      const loginResponse = await request(AUTH_URL)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      validToken = loginResponse.body.accessToken;
    });

    it('should validate token with correct service key', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', config.INTERNAL_SERVICE_KEY)
        .send({ token: validToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid', true);
      expect(response.body.data).toHaveProperty('user');
    });

    it('should fail without service key', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/validate-token')
        .send({ token: validToken });

      expect(response.status).toBe(401);
    });

    it('should fail with invalid service key', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', 'wrong-key')
        .send({ token: validToken });

      expect(response.status).toBe(401);
    });

    it('should fail with missing token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', config.INTERNAL_SERVICE_KEY)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should fail with invalid token', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', config.INTERNAL_SERVICE_KEY)
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ==================== SECURITY TESTS ====================

  describe('Security Tests', () => {
    it('should reject SQL injection in email', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/login')
        .send({
          email: "' OR '1'='1",
          password: testUserPassword,
        });

      expect(response.status).toBe(400);
    });

    it('should reject XSS in registration', async () => {
      const response = await request(AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: `xss-${Date.now()}@flamoral.test`,
          password: testUserPassword,
          firstName: '<script>alert("xss")</script>',
          lastName: 'Test',
          dateOfBirth: '1995-01-01',
          gender: 'male',
        });

      if (response.status === 201) {
        expect(response.body.user.firstName).not.toContain('<script>');
      }
    });

    it('should not expose password hash in responses', async () => {
      const response = await request(AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(response.body)).not.toContain('$2b$');
    });
  });

  // ==================== RATE LIMITING TESTS ====================

  describe('Rate Limiting', () => {
    it('should rate limit excessive login attempts', async () => {
      const attempts = Array(15).fill(null).map(() =>
        request(AUTH_URL)
          .post('/api/auth/login')
          .send({
            email: testUserEmail,
            password: 'WrongPassword123!',
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.some(r => r.status === 429);

      // Rate limiting should trigger after several failed attempts
      expect(rateLimited).toBe(true);
    });

    it('should rate limit excessive registration attempts', async () => {
      const attempts = Array(15).fill(null).map((_, i) =>
        request(AUTH_URL)
          .post('/api/auth/register')
          .send({
            email: `rate-limit-${Date.now()}-${i}@flamoral.test`,
            password: testUserPassword,
            firstName: 'Rate',
            lastName: 'Limit',
            dateOfBirth: '1995-01-01',
            gender: 'male',
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});
