import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Authentication and Authorization Security Tests
 */

describe('Authentication Security Tests', () => {
  let app: Express;

  describe('JWT Security', () => {
    it('should reject tampered JWT tokens', async () => {
      const validToken = jwt.sign(
        { userId: '123', email: 'test@example.com' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: '123', email: 'test@example.com' },
        process.env.JWT_SECRET as string,
        { expiresIn: '-1h' }
      );

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should validate token signature algorithm', async () => {
      // Token with "none" algorithm
      const noneToken = jwt.sign(
        { userId: '123', email: 'test@example.com' },
        '',
        { algorithm: 'none' } as any
      );

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${noneToken}`)
        .expect(401);
    });

    it('should include standard JWT claims', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        });

      const token = loginRes.body.accessToken;
      const decoded = jwt.decode(token) as any;

      expect(decoded).toHaveProperty('iat'); // Issued at
      expect(decoded).toHaveProperty('exp'); // Expiration
      expect(decoded).toHaveProperty('userId');
    });

    it('should rotate refresh tokens', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        });

      const originalRefreshToken = loginRes.body.refreshToken;

      const refreshRes = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: originalRefreshToken });

      const newRefreshToken = refreshRes.body.refreshToken;

      expect(newRefreshToken).not.toBe(originalRefreshToken);

      // Original refresh token should no longer work
      await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: originalRefreshToken })
        .expect(401);
    });
  });

  describe('Password Security', () => {
    it('should reject common passwords', async () => {
      const commonPasswords = [
        '123456',
        'password',
        '12345678',
        'qwerty',
        '123456789',
        'letmein',
        'password123'
      ];

      for (const password of commonPasswords) {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password: password,
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1990-01-01',
            gender: 'male'
          })
          .expect(400);
      }
    });

    it('should enforce password complexity', async () => {
      const weakPasswords = [
        'short',           // Too short
        'alllowercase',    // No uppercase or numbers
        'ALLUPPERCASE',    // No lowercase or numbers
        '12345678',        // No letters
        'NoNumbers',       // No numbers
        'nouppercas3',     // No uppercase
      ];

      for (const password of weakPasswords) {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password: password,
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1990-01-01',
            gender: 'male'
          })
          .expect(400);
      }
    });

    it('should hash passwords with bcrypt', async () => {
      // This would be tested at database level
      // Passwords should never be stored in plain text
    });

    it('should enforce password history', async () => {
      const user = await request(app)
        .post('/api/auth/register')
        .send({
          email: `history@example.com`,
          password: 'FirstPassword123!',
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      const token = user.body.accessToken;

      // Change password
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'FirstPassword123!',
          newPassword: 'SecondPassword123!'
        });

      // Try to change back to first password
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'SecondPassword123!',
          newPassword: 'FirstPassword123!'
        })
        .expect(400);
    });

    it('should require current password for password change', async () => {
      const user = await request(app)
        .post('/api/auth/register')
        .send({
          email: `change@example.com`,
          password: 'Original123!',
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${user.body.accessToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123!'
        })
        .expect(401);
    });
  });

  describe('Session Management', () => {
    it('should limit concurrent sessions', async () => {
      const user = {
        email: 'sessions@example.com',
        password: 'Test123!@#'
      };

      // Register
      await request(app)
        .post('/api/auth/register')
        .send({
          ...user,
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      // Create multiple sessions
      const sessions = [];
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send(user);

        if (res.status === 200) {
          sessions.push(res.body.accessToken);
        }
      }

      // Should have session limit (e.g., max 5 sessions)
      // Oldest sessions should be invalidated
      expect(sessions.length).toBeLessThanOrEqual(5);
    });

    it('should invalidate all sessions on password change', async () => {
      const user = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalidate@example.com',
          password: 'Original123!',
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      const token1 = user.body.accessToken;

      // Create second session
      const login = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalidate@example.com',
          password: 'Original123!'
        });

      const token2 = login.body.accessToken;

      // Change password
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: 'Original123!',
          newPassword: 'NewPassword123!'
        });

      // Both tokens should be invalid
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(401);

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token2}`)
        .expect(401);
    });

    it('should implement session fixation protection', async () => {
      // Session ID should change after login
      const beforeLogin = await request(app).get('/');
      const sessionBefore = beforeLogin.headers['set-cookie'];

      const login = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        });

      const sessionAfter = login.headers['set-cookie'];

      // Session should be regenerated
      expect(sessionBefore).not.toEqual(sessionAfter);
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should support 2FA setup', async () => {
      const user = await request(app)
        .post('/api/auth/register')
        .send({
          email: '2fa@example.com',
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${user.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('qrCode');
    });

    it('should require 2FA code when enabled', async () => {
      // Assuming 2FA is enabled for user
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: '2fa@example.com',
          password: 'Test123!@#'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('requires2FA');
      expect(res.body.requires2FA).toBe(true);
    });

    it('should provide backup codes', async () => {
      const user = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'backup@example.com',
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${user.body.accessToken}`);

      expect(res.body).toHaveProperty('backupCodes');
      expect(Array.isArray(res.body.backupCodes)).toBe(true);
      expect(res.body.backupCodes.length).toBeGreaterThan(0);
    });
  });

  describe('OAuth Security', () => {
    it('should validate OAuth state parameter', async () => {
      // Prevent CSRF in OAuth flow
      await request(app)
        .get('/api/auth/oauth/callback')
        .query({
          code: 'fake-code',
          state: 'invalid-state'
        })
        .expect(400);
    });

    it('should validate OAuth redirect URI', async () => {
      await request(app)
        .get('/api/auth/oauth/google')
        .query({
          redirect_uri: 'https://malicious.com/callback'
        })
        .expect(400);
    });
  });

  describe('Account Recovery Security', () => {
    it('should expire password reset tokens', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      // Simulate expired token (would need to manipulate time)
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'NewPassword123!'
        })
        .expect(400);
    });

    it('should invalidate reset tokens after use', async () => {
      const resetRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      // Use token (would need actual token from email)
      // Try to use same token again
      // Should fail
    });

    it('should rate limit password reset requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'test@example.com' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });

    it('should not reveal if email exists', async () => {
      const validEmail = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      const invalidEmail = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      // Both should return same response
      expect(validEmail.status).toBe(invalidEmail.status);
      expect(validEmail.body.message).toBe(invalidEmail.body.message);
    });
  });

  describe('API Key Security', () => {
    it('should validate API keys for service-to-service communication', async () => {
      await request(app)
        .post('/api/internal/sync')
        .set('X-API-Key', 'invalid-key')
        .expect(401);
    });

    it('should rate limit API key usage', async () => {
      const requests = Array(100).fill(null).map(() =>
        request(app)
          .get('/api/internal/health')
          .set('X-API-Key', process.env.API_KEY)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});
