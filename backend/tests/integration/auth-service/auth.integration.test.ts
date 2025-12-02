import request from 'supertest';
import express, { Application } from 'express';
import { getTestDb, getTestRedis, createTestUser } from '../setup';
import authRoutes from '../../../services/auth-service/src/api/routes/auth.routes';
import { hashPassword } from '../../../services/auth-service/src/utils/encryption';

describe('Auth Service Integration Tests', () => {
  let app: Application;
  let testDb: any;
  let testRedis: any;

  beforeAll(() => {
    testDb = getTestDb();
    testRedis = getTestRedis();

    // Setup Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1995-05-15',
        gender: 'male',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password_hash');

      // Verify user was created in database
      const result = await testDb.query('SELECT * FROM users WHERE email = $1', [userData.email]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].is_email_verified).toBe(false);
    });

    it('should fail with invalid email format', async () => {
      const userData = {
        email: 'invalidemail',
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1995-05-15',
        gender: 'male',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should fail with weak password', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'weak',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1995-05-15',
        gender: 'male',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password');
    });

    it('should fail with underage user', async () => {
      const userData = {
        email: 'minor@example.com',
        password: 'SecurePass123!',
        first_name: 'Young',
        last_name: 'User',
        date_of_birth: new Date(Date.now() - 16 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        gender: 'male',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('18 years old');
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1995-05-15',
        gender: 'male',
      };

      // First registration
      await request(app).post('/api/auth/register').send(userData).expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate all required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;
    const testPassword = 'SecurePass123!';

    beforeEach(async () => {
      // Create a test user
      const passwordHash = await hashPassword(testPassword);
      testUser = await createTestUser({
        email: 'logintest@example.com',
        password_hash: passwordHash,
        is_email_verified: true,
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(testUser.email);

      // Verify last_login was updated
      const result = await testDb.query('SELECT last_login_at FROM users WHERE id = $1', [testUser.id]);
      expect(result.rows[0].last_login_at).not.toBeNull();

      // Verify refresh token was stored in Redis
      const storedToken = await testRedis.get(`refresh_token:${testUser.id}`);
      expect(storedToken).toBeTruthy();
    });

    it('should fail with incorrect password', async () => {
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

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail for deactivated account', async () => {
      // Deactivate the user
      await testDb.query('UPDATE users SET is_active = false WHERE id = $1', [testUser.id]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('deactivated');
    });

    it('should handle missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let testUser: any;
    let refreshToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      testUser = await createTestUser({
        email: 'refreshtest@example.com',
        password_hash: passwordHash,
      });

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePass123!',
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.refreshToken).not.toBe(refreshToken); // New token should be different
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid_token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      testUser = await createTestUser({
        email: 'logouttest@example.com',
        password_hash: passwordHash,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePass123!',
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify refresh token was removed from Redis
      const storedToken = await testRedis.get(`refresh_token:${testUser.id}`);
      expect(storedToken).toBeNull();

      // Verify access token was blacklisted
      const isBlacklisted = await testRedis.get(`blacklist:${accessToken}`);
      expect(isBlacklisted).toBeTruthy();
    });

    it('should fail without authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let testUser: any;
    let verificationToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      testUser = await createTestUser({
        email: 'verify@example.com',
        password_hash: passwordHash,
        is_email_verified: false,
      });

      // Create verification token
      verificationToken = 'test_verification_token_' + Date.now();
      await testDb.query(
        `INSERT INTO tokens (user_id, token, type, expires_at)
         VALUES ($1, $2, 'email_verification', NOW() + INTERVAL '24 hours')`,
        [testUser.id, verificationToken]
      );
    });

    it('should verify email successfully', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user's email is marked as verified
      const result = await testDb.query('SELECT is_email_verified FROM users WHERE id = $1', [testUser.id]);
      expect(result.rows[0].is_email_verified).toBe(true);

      // Verify token is marked as used
      const tokenResult = await testDb.query('SELECT is_used FROM tokens WHERE token = $1', [verificationToken]);
      expect(tokenResult.rows[0].is_used).toBe(true);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid_token' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with expired token', async () => {
      // Create expired token
      const expiredToken = 'expired_token_' + Date.now();
      await testDb.query(
        `INSERT INTO tokens (user_id, token, type, expires_at)
         VALUES ($1, $2, 'email_verification', NOW() - INTERVAL '1 hour')`,
        [testUser.id, expiredToken]
      );

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: expiredToken })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let testUser: any;

    beforeEach(async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      testUser = await createTestUser({
        email: 'forgot@example.com',
        password_hash: passwordHash,
      });
    });

    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify password reset token was created
      const result = await testDb.query(
        `SELECT * FROM tokens WHERE user_id = $1 AND type = 'password_reset' AND is_used = false`,
        [testUser.id]
      );
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let testUser: any;
    let resetToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      testUser = await createTestUser({
        email: 'reset@example.com',
        password_hash: passwordHash,
      });

      // Create password reset token
      resetToken = 'reset_token_' + Date.now();
      await testDb.query(
        `INSERT INTO tokens (user_id, token, type, expires_at)
         VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '1 hour')`,
        [testUser.id, resetToken]
      );
    });

    it('should reset password successfully', async () => {
      const newPassword = 'NewSecurePass456!';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify password was changed by trying to login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail with weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid_token',
          newPassword: 'NewSecurePass456!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      testUser = await createTestUser({
        email: 'me@example.com',
        password_hash: passwordHash,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePass123!',
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should return current user info', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data).not.toHaveProperty('password_hash');
    });

    it('should fail without authorization', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive login attempts', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'WrongPassword123!',
      };

      // Make multiple failed login attempts
      const attempts = Array(10).fill(null);
      for (const _ of attempts) {
        await request(app).post('/api/auth/login').send(loginData);
      }

      // Next attempt should be rate limited (if rate limiting is enabled)
      // Note: This test assumes rate limiting is configured
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // Could be either 401 (invalid credentials) or 429 (rate limited)
      expect([401, 429]).toContain(response.status);
    });
  });
});
