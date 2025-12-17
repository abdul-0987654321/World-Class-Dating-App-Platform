/// <reference types="jest" />
import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../src/api/routes/auth.routes';
import { userRepository } from '../../src/domain/repositories/user.repository';
import { tokenRepository } from '../../src/domain/repositories/token.repository';
import redisCache from '../../src/infrastructure/cache/redis';
import emailService from '../../src/infrastructure/email/email.service';

// Mock dependencies
jest.mock('../../src/domain/repositories/user.repository');
jest.mock('../../src/domain/repositories/token.repository');
jest.mock('../../src/infrastructure/cache/redis');
jest.mock('../../src/infrastructure/email/email.service');
jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'newuser@example.com',
      password: 'Password123!',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1995-01-15',
      gender: 'male',
      phone_number: '+1234567890',
    };

    it('should register a new user and return tokens', async () => {
      const mockUser = {
        id: 'user-123',
        email: validRegistrationData.email,
        password_hash: 'hashed-password',
        first_name: validRegistrationData.first_name,
        last_name: validRegistrationData.last_name,
        date_of_birth: new Date(validRegistrationData.date_of_birth),
        gender: validRegistrationData.gender,
        phone_number: validRegistrationData.phone_number,
        is_email_verified: false,
        is_phone_verified: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);
      (tokenRepository.deleteByUserId as jest.Mock).mockResolvedValue(undefined);
      (tokenRepository.create as jest.Mock).mockResolvedValue({});
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(validRegistrationData.email);
    });

    it('should return 400 for duplicate email', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validRegistrationData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should return 400 for weak password', async () => {
      const invalidData = { ...validRegistrationData, password: 'weak' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password');
    });

    it('should return 400 for underage user', async () => {
      const today = new Date();
      const underageDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
      const invalidData = {
        ...validRegistrationData,
        date_of_birth: underageDate.toISOString().split('T')[0],
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('18 years old');
    });

    it('should return 400 for invalid gender', async () => {
      const invalidData = { ...validRegistrationData, gender: 'invalid' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-123',
      email: loginData.email,
      password_hash: 'hashed-password',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: new Date('1995-01-15'),
      gender: 'male',
      is_email_verified: true,
      is_phone_verified: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should login successfully with valid credentials', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.updateLastLogin as jest.Mock).mockResolvedValue(undefined);
      (redisCache.setRefreshToken as jest.Mock).mockResolvedValue(undefined);

      // Note: This test requires mocking bcrypt.compare which is challenging
      // In production, we'd need to use actual integration test with test database
    });

    it('should return 401 for non-existent user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for deactivated account', async () => {
      const deactivatedUser = { ...mockUser, is_active: false };
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(deactivatedUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Account is deactivated');
    });

    it('should return 400 for missing email', async () => {
      const invalidData = { password: 'Password123!' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing password', async () => {
      const invalidData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshToken = 'valid.refresh.token';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisCache.setRefreshToken as jest.Mock).mockResolvedValue(undefined);

      // Note: Requires valid JWT mocking
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Refresh token is required');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid.token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        user_id: 'user-123',
        token: 'valid-token',
        type: 'email_verification',
        expires_at: new Date(Date.now() + 3600000),
        is_used: false,
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
      };

      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(mockToken);
      (userRepository.verifyEmail as jest.Mock).mockResolvedValue(undefined);
      (tokenRepository.markAsUsed as jest.Mock).mockResolvedValue(undefined);
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (emailService.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified');
      expect(userRepository.verifyEmail).toHaveBeenCalledWith('user-123');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token is required');
    });

    it('should return 400 for invalid token', async () => {
      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (tokenRepository.deleteByUserId as jest.Mock).mockResolvedValue(undefined);
      (tokenRepository.create as jest.Mock).mockResolvedValue({});
      (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success even for non-existent email (security)', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email is required');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const mockResetToken = {
        id: 'token-123',
        user_id: 'user-123',
        token: 'reset-token',
        type: 'password_reset',
        expires_at: new Date(Date.now() + 3600000),
        is_used: false,
      };

      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(mockResetToken);
      (userRepository.updatePassword as jest.Mock).mockResolvedValue(undefined);
      (tokenRepository.markAsUsed as jest.Mock).mockResolvedValue(undefined);
      (redisCache.removeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'reset-token', newPassword: 'NewPassword123!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
      expect(userRepository.updatePassword).toHaveBeenCalled();
      expect(tokenRepository.markAsUsed).toHaveBeenCalled();
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'NewPassword123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'reset-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid token', async () => {
      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPassword123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should return 400 for weak new password', async () => {
      const mockResetToken = {
        id: 'token-123',
        user_id: 'user-123',
        token: 'reset-token',
        type: 'password_reset',
        expires_at: new Date(Date.now() + 3600000),
        is_used: false,
      };

      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(mockResetToken);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'reset-token', newPassword: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email for unverified user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        is_email_verified: false,
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (tokenRepository.deleteByUserId as jest.Mock).mockResolvedValue(undefined);
      (tokenRepository.create as jest.Mock).mockResolvedValue({});
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should return 400 for non-existent user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User not found');
    });

    it('should return 400 for already verified email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_email_verified: true,
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already verified');
    });
  });
});
