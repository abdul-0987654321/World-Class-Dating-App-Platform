import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:3001';

describe('Auth Service API - Complete Coverage', () => {
  let accessToken: string;
  let refreshToken: string;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testEmail);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: testPassword,
          firstName: 'Test',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with weak password', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: `weak-${Date.now()}@example.com`,
          password: '123',
          firstName: 'Test',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with duplicate email', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Test',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail with invalid password', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    it('should fail with non-existent email', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testEmail);
    });

    it('should fail without authorization header', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh tokens successfully', async () => {
      const response = await request(API_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(API_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });

    it('should fail without token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for valid user', async () => {
      const response = await request(API_URL)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(response.status).toBe(200);
    });

    it('should succeed even for non-existent email (security)', async () => {
      const response = await request(API_URL)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      // Should return 200 to prevent email enumeration
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should fail with missing token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/verify-email')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token-12345' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });

    it('should fail with expired token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/verify-email')
        .send({ token: 'expired-token-abc123xyz' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with empty token string', async () => {
      const response = await request(API_URL)
        .post('/api/auth/verify-email')
        .send({ token: '' });

      expect(response.status).toBe(400);
    });

    // Note: Testing successful verification requires a valid token from the database
    // which would require either mocking or accessing the email/database directly
  });

  describe('POST /api/auth/resend-verification', () => {
    let unverifiedEmail: string;

    beforeAll(() => {
      unverifiedEmail = `unverified-${Date.now()}@example.com`;
    });

    it('should fail with missing email', async () => {
      const response = await request(API_URL)
        .post('/api/auth/resend-verification')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(API_URL)
        .post('/api/auth/resend-verification')
        .send({ email: 'invalid-email-format' });

      expect(response.status).toBe(400);
    });

    it('should fail with empty email string', async () => {
      const response = await request(API_URL)
        .post('/api/auth/resend-verification')
        .send({ email: '' });

      expect(response.status).toBe(400);
    });

    it('should fail for non-existent email', async () => {
      const response = await request(API_URL)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent-user-123@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });

    it('should succeed for unverified user', async () => {
      // First register a new user
      await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: unverifiedEmail,
          password: testPassword,
          firstName: 'Unverified',
          lastName: 'User',
          dateOfBirth: '1995-05-15',
          gender: 'female'
        });

      // Then resend verification
      const response = await request(API_URL)
        .post('/api/auth/resend-verification')
        .send({ email: unverifiedEmail });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
    });

    // Note: Testing "already verified" case requires verifying an email first
  });

  describe('POST /api/auth/reset-password', () => {
    it('should fail with missing token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'NewPassword123!' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing password', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with both fields missing', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-reset-token-xyz',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });

    it('should fail with weak password', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'any-token',
          newPassword: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with password missing uppercase', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'any-token',
          newPassword: 'password123!'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with password missing lowercase', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'any-token',
          newPassword: 'PASSWORD123!'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with password missing number', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'any-token',
          newPassword: 'PasswordOnly!'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with password missing special character', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'any-token',
          newPassword: 'Password123'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with empty password', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'any-token',
          newPassword: ''
        });

      expect(response.status).toBe(400);
    });

    it('should fail with expired token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token-abc123',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    // Note: Testing successful password reset requires a valid reset token from the database
  });

  describe('POST /api/auth/validate-token', () => {
    const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'internal-service-key';
    let validAccessToken: string;

    beforeAll(async () => {
      // Create and login a user to get a valid access token
      const uniqueEmail = `validate-test-${Date.now()}@example.com`;
      await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: testPassword,
          firstName: 'Validate',
          lastName: 'Test',
          dateOfBirth: '1992-03-20',
          gender: 'male'
        });

      const loginResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: uniqueEmail,
          password: testPassword
        });

      validAccessToken = loginResponse.body.accessToken;
    });

    it('should fail without service key header', async () => {
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .send({ token: validAccessToken });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('service key');
    });

    it('should fail with invalid service key', async () => {
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', 'wrong-service-key')
        .send({ token: validAccessToken });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing token in body', async () => {
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', INTERNAL_SERVICE_KEY)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with empty token string', async () => {
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', INTERNAL_SERVICE_KEY)
        .send({ token: '' });

      expect(response.status).toBe(400);
    });

    it('should fail with invalid token format', async () => {
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', INTERNAL_SERVICE_KEY)
        .send({ token: 'invalid-token-format' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });

    it('should fail with malformed JWT token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', INTERNAL_SERVICE_KEY)
        .send({ token: 'not.a.jwt' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate a valid access token successfully', async () => {
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', INTERNAL_SERVICE_KEY)
        .send({ token: validAccessToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email');
      expect(response.body.data.user).toHaveProperty('first_name');
    });

    it('should fail after user logs out (token blacklisted)', async () => {
      // Create a new user and get tokens
      const logoutTestEmail = `logout-test-${Date.now()}@example.com`;
      await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: logoutTestEmail,
          password: testPassword,
          firstName: 'Logout',
          lastName: 'Test',
          dateOfBirth: '1991-07-10',
          gender: 'female'
        });

      const loginResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: logoutTestEmail,
          password: testPassword
        });

      const tokenToBlacklist = loginResponse.body.accessToken;

      // Logout to blacklist the token
      await request(API_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokenToBlacklist}`);

      // Try to validate the blacklisted token
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', INTERNAL_SERVICE_KEY)
        .send({ token: tokenToBlacklist });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should return user information in response', async () => {
      const response = await request(API_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', INTERNAL_SERVICE_KEY)
        .send({ token: validAccessToken });

      expect(response.status).toBe(200);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email');
      expect(response.body.data.user).toHaveProperty('first_name');
      expect(response.body.data.user).toHaveProperty('last_name');
      expect(response.body.data.user).toHaveProperty('is_email_verified');
      expect(response.body.data.user).toHaveProperty('is_active');
    });
  });
});
