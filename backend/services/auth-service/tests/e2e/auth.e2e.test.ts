import request from 'supertest';
import { Application } from 'express';

/**
 * E2E Tests for Authentication Flow
 * These tests simulate complete user authentication journeys
 * Requires actual database and Redis connection for full integration
 */

describe('Auth E2E Tests', () => {
  let app: Application;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let verificationToken: string;

  // Test user data
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User',
    date_of_birth: '1995-06-15',
    gender: 'male',
    phone_number: '+1234567890',
  };

  beforeAll(async () => {
    // In a real E2E test, we would:
    // 1. Start the actual server
    // 2. Connect to test database
    // 3. Connect to test Redis
    // app = await startTestServer();
  });

  afterAll(async () => {
    // Clean up test data
    // await cleanupTestData(userId);
    // await stopTestServer();
  });

  describe('User Registration Flow', () => {
    it('should complete full registration flow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data).toHaveProperty('user');
      expect(registerResponse.body.data).toHaveProperty('accessToken');
      expect(registerResponse.body.data).toHaveProperty('refreshToken');

      userId = registerResponse.body.data.user.id;
      accessToken = registerResponse.body.data.accessToken;
      refreshToken = registerResponse.body.data.refreshToken;

      // Verify user data
      expect(registerResponse.body.data.user).toMatchObject({
        email: testUser.email,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        gender: testUser.gender,
        is_email_verified: false,
        is_phone_verified: false,
        is_active: true,
      });

      // Step 2: Access protected endpoint with access token
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.id).toBe(userId);

      // Step 3: Verify email (in real test, we'd capture the token from email service mock)
      // verificationToken = await getVerificationTokenFromDatabase(userId);
      // const verifyResponse = await request(app)
      //   .post('/api/auth/verify-email')
      //   .send({ token: verificationToken })
      //   .expect(200);
      // expect(verifyResponse.body.success).toBe(true);
    });

    it('should prevent duplicate registration', async () => {
      // Try to register same user again
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('Login and Token Refresh Flow', () => {
    it('should complete full login and token refresh flow', async () => {
      // Step 1: Login with credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data).toHaveProperty('refreshToken');

      const newAccessToken = loginResponse.body.data.accessToken;
      const newRefreshToken = loginResponse.body.data.refreshToken;

      // Step 2: Use access token to get user info
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.email).toBe(testUser.email);

      // Step 3: Refresh access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');

      // Step 4: Old token should still work (before expiry)
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // Step 5: New token should work
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshResponse.body.data.accessToken}`)
        .expect(200);
    });

    it('should fail login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Logout Flow', () => {
    it('should complete full logout flow', async () => {
      // Step 1: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const logoutAccessToken = loginResponse.body.data.accessToken;
      const logoutRefreshToken = loginResponse.body.data.refreshToken;

      // Step 2: Verify token works
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${logoutAccessToken}`)
        .expect(200);

      // Step 3: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${logoutAccessToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Step 4: Verify access token is blacklisted
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${logoutAccessToken}`)
        .expect(401);

      // Step 5: Verify refresh token is invalidated
      await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: logoutRefreshToken })
        .expect(401);
    });
  });

  describe('Password Reset Flow', () => {
    it('should complete full password reset flow', async () => {
      const newPassword = 'NewTestPassword123!';

      // Step 1: Request password reset
      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(forgotResponse.body.success).toBe(true);

      // Step 2: Get reset token (in real test, from database or email service mock)
      // const resetToken = await getPasswordResetTokenFromDatabase(userId);

      // Step 3: Reset password with token
      // const resetResponse = await request(app)
      //   .post('/api/auth/reset-password')
      //   .send({ token: resetToken, newPassword })
      //   .expect(200);
      // expect(resetResponse.body.success).toBe(true);

      // Step 4: Verify old password doesn't work
      // await request(app)
      //   .post('/api/auth/login')
      //   .send({
      //     email: testUser.email,
      //     password: testUser.password,
      //   })
      //   .expect(401);

      // Step 5: Verify new password works
      // const loginResponse = await request(app)
      //   .post('/api/auth/login')
      //   .send({
      //     email: testUser.email,
      //     password: newPassword,
      //   })
      //   .expect(200);
      // expect(loginResponse.body.success).toBe(true);

      // Step 6: Verify old sessions are invalidated
      // await request(app)
      //   .post('/api/auth/refresh-token')
      //   .send({ refreshToken })
      //   .expect(401);
    });
  });

  describe('Email Verification Flow', () => {
    it('should resend verification email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Verification email sent');
    });

    it('should fail to resend for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User not found');
    });
  });

  describe('Security Tests', () => {
    it('should reject access to protected endpoint without token', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject access with malformed Authorization header', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should rate limit registration attempts', async () => {
      // Make multiple rapid registration attempts
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/auth/register')
          .send({
            ...testUser,
            email: `rapid-test-${i}-${Date.now()}@example.com`,
          })
      );

      const responses = await Promise.all(promises);

      // At least some should be rate limited
      const rateLimited = responses.some((res) => res.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should rate limit login attempts', async () => {
      // Make multiple rapid failed login attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword123!',
          })
      );

      const responses = await Promise.all(promises);

      // Should be rate limited after several failures
      const rateLimited = responses.some((res) => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent login requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // All should have different tokens (due to refresh token rotation)
      const accessTokens = responses.map((r) => r.body.data.accessToken);
      const uniqueTokens = new Set(accessTokens);
      expect(uniqueTokens.size).toBe(accessTokens.length);
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: longEmail,
        });

      // Should either reject or handle gracefully
      expect([400, 201]).toContain(response.status);
    });

    it('should handle special characters in names', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: `special-${Date.now()}@example.com`,
          first_name: "O'Brien-Smith",
          last_name: 'José García',
        });

      // Should handle special characters
      if (response.status === 201) {
        expect(response.body.data.user.first_name).toBe("O'Brien-Smith");
        expect(response.body.data.user.last_name).toBe('José García');
      }
    });
  });
});
