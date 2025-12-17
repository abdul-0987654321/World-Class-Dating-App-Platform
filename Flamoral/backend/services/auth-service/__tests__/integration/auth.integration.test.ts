/// <reference types="jest" />
import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../../src/api/routes/auth.routes';
import { userRepository } from '../../src/domain/repositories/user.repository';
import { tokenRepository } from '../../src/domain/repositories/token.repository';
import redisCache from '../../src/infrastructure/cache/redis';
import emailService from '../../src/infrastructure/email/email.service';
import passwordBreachCheckerService from '../../src/domain/services/password-breach-checker.service';
import accountLockoutService from '../../src/domain/services/account-lockout.service';
import sessionManagementService from '../../src/domain/services/session-management.service';
import deviceFingerprintService from '../../src/domain/services/device-fingerprint.service';
import suspiciousLoginDetectorService from '../../src/domain/services/suspicious-login-detector.service';

// Mock dependencies
jest.mock('../../src/domain/repositories/user.repository');
jest.mock('../../src/domain/repositories/token.repository');
jest.mock('../../src/infrastructure/cache/redis');
jest.mock('../../src/infrastructure/email/email.service');
jest.mock('../../src/domain/services/password-breach-checker.service');
jest.mock('../../src/domain/services/account-lockout.service');
jest.mock('../../src/domain/services/session-management.service');
jest.mock('../../src/domain/services/device-fingerprint.service');
jest.mock('../../src/domain/services/suspicious-login-detector.service');
jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    createLogger: jest.fn(() => mockLogger),
  };
});

// Mock rate limiter middleware to allow all requests
jest.mock('../../src/api/middleware/rate-limit.middleware', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  passwordResetLimiter: (_req: any, _res: any, next: any) => next(),
  verificationLimiter: (_req: any, _res: any, next: any) => next(),
}));

// Mock encryption utilities
jest.mock('../../src/utils/encryption', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  comparePassword: jest.fn().mockResolvedValue(true),
}));

/**
 * Auth Service Integration Tests
 * Tests authentication flows with mocked dependencies
 */
describe('Auth Service - Integration Tests', () => {
  let app: Express;

  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    phone_number: '+1234567890',
    first_name: 'Test',
    last_name: 'User',
    date_of_birth: '1990-01-01',
    gender: 'male'
  };

  beforeAll(() => {
    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Set up service mocks
    (passwordBreachCheckerService.checkPasswordBreach as jest.Mock).mockResolvedValue({ isBreached: false, breachCount: 0 });
    (accountLockoutService.isAccountLocked as jest.Mock).mockResolvedValue(false);
    (accountLockoutService.isPermanentlyLocked as jest.Mock).mockResolvedValue(false);
    (accountLockoutService.recordFailedAttempt as jest.Mock).mockResolvedValue({ failedAttempts: 0, isLocked: false });
    (accountLockoutService.recordSuccessfulLogin as jest.Mock).mockResolvedValue(undefined);
    (accountLockoutService.getRemainingLockoutTime as jest.Mock).mockResolvedValue(0);
    (sessionManagementService.createSession as jest.Mock).mockResolvedValue({ id: 'session-123' });
    (sessionManagementService.revokeSession as jest.Mock).mockResolvedValue(undefined);
    (deviceFingerprintService.generateFingerprint as jest.Mock).mockReturnValue('device-fingerprint');
    (deviceFingerprintService.isDeviceRecognized as jest.Mock).mockResolvedValue(true);
    (deviceFingerprintService.recordDevice as jest.Mock).mockResolvedValue(undefined);
    (suspiciousLoginDetectorService.analyzeLoginAttempt as jest.Mock).mockResolvedValue({ isSuspicious: false });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-setup service mocks after clearAllMocks
    (passwordBreachCheckerService.checkPasswordBreach as jest.Mock).mockResolvedValue({ isBreached: false, breachCount: 0 });
    (accountLockoutService.isAccountLocked as jest.Mock).mockResolvedValue(false);
    (accountLockoutService.isPermanentlyLocked as jest.Mock).mockResolvedValue(false);
    (accountLockoutService.recordFailedAttempt as jest.Mock).mockResolvedValue({ failedAttempts: 0, isLocked: false });
    (accountLockoutService.recordSuccessfulLogin as jest.Mock).mockResolvedValue(undefined);
    (sessionManagementService.createSession as jest.Mock).mockResolvedValue(undefined);
    (deviceFingerprintService.isDeviceRecognized as jest.Mock).mockResolvedValue(true);
    (deviceFingerprintService.recordDevice as jest.Mock).mockResolvedValue(undefined);
    (suspiciousLoginDetectorService.analyzeLoginAttempt as jest.Mock).mockResolvedValue({ isSuspicious: false });
    (redisCache.setRefreshToken as jest.Mock).mockResolvedValue(undefined);
    (redisCache.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
    (redisCache.removeRefreshToken as jest.Mock).mockResolvedValue(undefined);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: testUser.email,
        password_hash: 'hashed-password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        date_of_birth: new Date(testUser.date_of_birth),
        gender: testUser.gender,
        phone_number: testUser.phone_number,
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
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      // Tokens are set in httpOnly cookies, not returned in response body
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject registration with existing email', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration for underage user', async () => {
      const today = new Date();
      const underageDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, date_of_birth: underageDate.toISOString().split('T')[0] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const mockUser = {
      id: 'user-123',
      email: testUser.email,
      password_hash: 'hashed-password',
      first_name: 'Test',
      last_name: 'User',
      is_email_verified: true,
      is_active: true,
    };

    it('should return 401 for non-existent user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for deactivated account', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({ ...mockUser, is_active: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Account is deactivated');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
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
      const mockUser = { id: 'user-123', email: 'test@example.com', first_name: 'Test' };

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
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid token', async () => {
      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      const mockUser = { id: 'user-123', email: testUser.email, first_name: 'Test' };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (tokenRepository.deleteByUserId as jest.Mock).mockResolvedValue(undefined);
      (tokenRepository.create as jest.Mock).mockResolvedValue({});
      (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return success for non-existent email (security)', async () => {
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
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        user_id: 'user-123',
        token: 'reset-token',
        type: 'password_reset',
        expires_at: new Date(Date.now() + 3600000),
        is_used: false,
      };

      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(mockToken);
      (userRepository.updatePassword as jest.Mock).mockResolvedValue(undefined);
      (tokenRepository.markAsUsed as jest.Mock).mockResolvedValue(undefined);
      (redisCache.removeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'reset-token', newPassword: 'NewPassword123!' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPassword123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const mockToken = {
        id: 'token-123',
        user_id: 'user-123',
        token: 'reset-token',
        type: 'password_reset',
        expires_at: new Date(Date.now() + 3600000),
        is_used: false,
      };

      (tokenRepository.findByToken as jest.Mock).mockResolvedValue(mockToken);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'reset-token', newPassword: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification for unverified user', async () => {
      const mockUser = {
        id: 'user-123',
        email: testUser.email,
        first_name: 'Test',
        is_email_verified: false,
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (tokenRepository.deleteByUserId as jest.Mock).mockResolvedValue(undefined);
      (tokenRepository.create as jest.Mock).mockResolvedValue({});
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for non-existent user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for already verified email', async () => {
      const mockUser = { id: 'user-123', email: testUser.email, is_email_verified: true };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
