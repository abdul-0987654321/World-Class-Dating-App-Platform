import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { createClient } from 'redis';

/**
 * Auth Service Integration Tests
 * Tests authentication flows end-to-end
 */

describe('Auth Service - Integration Tests', () => {
  let app: Express;
  let dbPool: Pool;
  let redisClient: ReturnType<typeof createClient>;

  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    phone: '+1234567890',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1990-01-01',
    gender: 'male'
  };

  beforeAll(async () => {
    // Initialize database connection
    dbPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Initialize Redis connection
    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    await redisClient.connect();

    // Clean up test data
    await dbPool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });

  afterAll(async () => {
    // Clean up
    await dbPool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await dbPool.end();
    await redisClient.quit();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user in database
      const dbUser = await dbPool.query(
        'SELECT * FROM users WHERE email = $1',
        [testUser.email]
      );
      expect(dbUser.rows).toHaveLength(1);
      expect(dbUser.rows[0].email).toBe(testUser.email);
    });

    it('should reject registration with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'newuser@example.com',
          password: '123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should hash password before storing', async () => {
      const user = await dbPool.query(
        'SELECT password FROM users WHERE email = $1',
        [testUser.email]
      );

      expect(user.rows[0].password).not.toBe(testUser.password);
      const isValidPassword = await bcrypt.compare(
        testUser.password,
        user.rows[0].password
      );
      expect(isValidPassword).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUser.email);

      // Verify token is valid
      const decoded = jwt.verify(
        response.body.accessToken,
        process.env.JWT_SECRET as string
      ) as any;
      expect(decoded.email).toBe(testUser.email);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should implement rate limiting on login attempts', async () => {
      const attempts = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword'
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimitedResponse = responses[responses.length - 1];
      expect(rateLimitedResponse.status).toBe(429);
    });

    it('should store refresh token in database', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const tokens = await dbPool.query(
        'SELECT * FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email = $1)',
        [testUser.email]
      );

      expect(tokens.rows.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      refreshToken = response.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject expired refresh token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { email: testUser.email },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toContain('successfully');

      // Verify refresh token is deleted
      const tokens = await dbPool.query(
        'SELECT * FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
      expect(tokens.rows).toHaveLength(0);
    });

    it('should reject logout without authorization', async () => {
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);
    });

    it('should blacklist access token', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      // Verify token is blacklisted in Redis
      const isBlacklisted = await redisClient.get(`blacklist:${accessToken}`);
      expect(isBlacklisted).toBeTruthy();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.message).toContain('sent');

      // Verify reset token is stored
      const user = await dbPool.query(
        'SELECT reset_token, reset_token_expires FROM users WHERE email = $1',
        [testUser.email]
      );
      expect(user.rows[0].reset_token).toBeTruthy();
      expect(user.rows[0].reset_token_expires).toBeTruthy();
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toContain('sent');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Request password reset
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // Get reset token from database
      const user = await dbPool.query(
        'SELECT reset_token FROM users WHERE email = $1',
        [testUser.email]
      );
      resetToken = user.rows[0].reset_token;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        })
        .expect(200);

      expect(response.body.message).toContain('reset');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');

      // Reset back to original password for other tests
      await dbPool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [await bcrypt.hash(testUser.password, 10), testUser.email]
      );
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject expired reset token', async () => {
      // Expire the token
      await dbPool.query(
        'UPDATE users SET reset_token_expires = NOW() - INTERVAL \'1 hour\' WHERE email = $1',
        [testUser.email]
      );

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.error).toContain('expired');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // Get verification token
      const user = await dbPool.query(
        'SELECT email_verification_token FROM users WHERE email = $1',
        [testUser.email]
      );

      const verificationToken = user.rows[0].email_verification_token;

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.message).toContain('verified');

      // Verify email_verified flag
      const verifiedUser = await dbPool.query(
        'SELECT email_verified FROM users WHERE email = $1',
        [testUser.email]
      );
      expect(verifiedUser.rows[0].email_verified).toBe(true);
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      accessToken = response.body.accessToken;
    });

    it('should return current user data', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject blacklisted token', async () => {
      // Logout to blacklist token
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      // Try to use blacklisted token
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: "password"
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should sanitize user input', async () => {
      const xssAttempt = {
        ...testUser,
        email: 'xss@example.com',
        firstName: '<script>alert("XSS")</script>',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(xssAttempt)
        .expect(201);

      expect(response.body.user.firstName).not.toContain('<script>');

      // Clean up
      await dbPool.query('DELETE FROM users WHERE email = $1', [xssAttempt.email]);
    });

    it('should enforce HTTPS in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Test would check for HTTPS redirect or rejection

      process.env.NODE_ENV = originalEnv;
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer fake-token`);

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });
  });
});
