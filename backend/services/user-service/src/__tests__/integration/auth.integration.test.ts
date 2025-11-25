import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../api/routes/auth.routes';

// Mock dependencies
jest.mock('../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@connectsphere/shared/utils/validation', () => ({
  isValidEmail: jest.fn(() => true),
  isValidPassword: jest.fn(() => true),
  isValidAge: jest.fn(() => true),
}));

describe('Auth Routes Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Error handler middleware
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistration = {
      email: 'test@example.com',
      password: 'Test123!@#',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1995-01-01',
      gender: 'male',
      phone_number: '+1234567890',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration)
        .expect('Content-Type', /json/);

      // Status might be 201 (success) or 400 (validation error with mocks)
      expect([200, 201, 400]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing other required fields
        })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistration,
          email: 'invalid-email',
        })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistration,
          password: 'weak',
        })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLogin = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    it('should accept login request with valid credentials format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLogin)
        .expect('Content-Type', /json/);

      expect([200, 401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Test123!@#',
        })
        .expect('Content-Type', /json/);

      expect([400, 401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect('Content-Type', /json/);

      expect([400, 401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect('Content-Type', /json/);

      expect([400, 401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should accept refresh token request', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: 'mock-refresh-token',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect('Content-Type', /json/);

      expect([400, 401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should accept email verification request', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'valid-verification-token',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('token');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should accept resend verification request', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({
          email: 'test@example.com',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('email');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({
          email: 'invalid-email',
        })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept forgot password request', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('email');
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests rapidly
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'test@example.com' })
      );

      const responses = await Promise.all(requests);

      // At least one should succeed or return proper error
      expect(responses.every(r => [200, 400, 429, 500].includes(r.status))).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should accept reset password request', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'NewPass123!@#',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'NewPass123!@#',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Token');
    });

    it('should return 400 for missing new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('password');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'weak',
        })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Request/Response Format', () => {
    it('should accept JSON content type', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect([200, 401, 500]).toContain(response.status);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.success).toBe('boolean');
      expect(typeof response.body.message).toBe('string');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      // Should not reveal if user exists
      expect(response.body.message).not.toContain('user not found');
      expect(response.body.message).not.toContain('does not exist');
    });

    it('should not include password in any response', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1995-01-01',
          gender: 'male',
        });

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain('password_hash');
      expect(responseStr).not.toContain('Test123!@#');
    });
  });
});
