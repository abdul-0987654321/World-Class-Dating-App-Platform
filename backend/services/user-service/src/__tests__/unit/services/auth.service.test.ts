// Mock database connection BEFORE any imports
jest.mock('../../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock validation functions
jest.mock('@flamoral/backend-shared/utils/validation', () => ({
  isValidEmail: jest.fn(() => true),
  isValidPassword: jest.fn(() => true),
  isValidAge: jest.fn(() => true),
}));

import { AuthService } from '../../../domain/services/auth.service';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ProfileRepository } from '../../../domain/repositories/profile.repository';
import { VerificationTokenRepository } from '../../../domain/repositories/verification-token.repository';
import { VerificationService } from '../../../domain/services/verification.service';
import { createMockUser, createMockCreateUserDto, createMockVerificationToken, mockJwtPayload } from '../../helpers/test-data';
import * as encryption from '../../../utils/encryption';
import jwtUtils from '../../../utils/jwt';
import emailService from '../../../infrastructure/email/email.service';

// Mock dependencies
jest.mock('../../../domain/repositories/user.repository');
jest.mock('../../../domain/repositories/profile.repository');
jest.mock('../../../domain/repositories/verification-token.repository');
jest.mock('../../../domain/services/verification.service');
jest.mock('../../../utils/encryption');
jest.mock('../../../utils/jwt');
jest.mock('../../../infrastructure/email/email.service');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockProfileRepository: jest.Mocked<ProfileRepository>;
  let mockTokenRepository: jest.Mocked<VerificationTokenRepository>;
  let mockVerificationService: jest.Mocked<VerificationService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockProfileRepository = new ProfileRepository() as jest.Mocked<ProfileRepository>;
    mockTokenRepository = new VerificationTokenRepository() as jest.Mocked<VerificationTokenRepository>;
    mockVerificationService = new VerificationService() as jest.Mocked<VerificationService>;

    authService = new AuthService();
    (authService as any).userRepository = mockUserRepository;
    (authService as any).profileRepository = mockProfileRepository;
    (authService as any).tokenRepository = mockTokenRepository;
    (authService as any).verificationService = mockVerificationService;
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = createMockCreateUserDto();
      const mockUser = createMockUser({
        email: userData.email,
        first_name: userData.first_name,
      });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);
      mockUserRepository.create = jest.fn().mockResolvedValue(mockUser);
      mockProfileRepository.create = jest.fn().mockResolvedValue({});
      mockVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue(undefined);

      (encryption.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');

      const result = await authService.register(userData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(encryption.hashPassword).toHaveBeenCalledWith(userData.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          password_hash: 'hashed_password',
        })
      );
      expect(mockProfileRepository.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
      });

      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
    });

    it('should throw error if email already exists', async () => {
      const userData = createMockCreateUserDto();
      const existingUser = createMockUser({ email: userData.email });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(existingUser);

      await expect(authService.register(userData)).rejects.toThrow(
        'User with this email already exists'
      );

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if user is under 18', async () => {
      const userData = createMockCreateUserDto({
        date_of_birth: new Date(Date.now() - 17 * 365 * 24 * 60 * 60 * 1000),
      });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(authService.register(userData)).rejects.toThrow(
        'User must be at least 18 years old'
      );
    });

    it('should send verification email asynchronously', async () => {
      const userData = createMockCreateUserDto();
      const mockUser = createMockUser();

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);
      mockUserRepository.create = jest.fn().mockResolvedValue(mockUser);
      mockProfileRepository.create = jest.fn().mockResolvedValue({});
      mockVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue(undefined);

      (encryption.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');

      await authService.register(userData);

      // Email should be sent but not block registration
      // Using setTimeout to allow async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVerificationService.sendVerificationEmail).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.first_name
      );
    });

    it('should handle profile creation failure gracefully', async () => {
      const userData = createMockCreateUserDto();
      const mockUser = createMockUser();

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);
      mockUserRepository.create = jest.fn().mockResolvedValue(mockUser);
      mockProfileRepository.create = jest.fn().mockRejectedValue(new Error('Profile creation failed'));
      mockVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue(undefined);

      (encryption.hashPassword as jest.Mock).mockResolvedValue('hashed_password');

      await expect(authService.register(userData)).rejects.toThrow('Profile creation failed');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'Test123!@#';
      const mockUser = createMockUser({ email });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockUserRepository.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      (encryption.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');

      const result = await authService.login({ email, password });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(encryption.comparePassword).toHaveBeenCalledWith(password, mockUser.password_hash);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);

      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
    });

    it('should throw error for non-existent email', async () => {
      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'password' })
      ).rejects.toThrow('Invalid credentials');

      expect(encryption.comparePassword).not.toHaveBeenCalled();
    });

    it('should throw error for incorrect password', async () => {
      const mockUser = createMockUser();

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      (encryption.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: mockUser.email, password: 'wrongpassword' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive account', async () => {
      const mockUser = createMockUser({ is_active: false });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      (encryption.comparePassword as jest.Mock).mockResolvedValue(true);

      await expect(
        authService.login({ email: mockUser.email, password: 'password' })
      ).rejects.toThrow('Account is deactivated');
    });

    it('should not include password_hash in response', async () => {
      const mockUser = createMockUser();

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockUserRepository.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      (encryption.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');

      const result = await authService.login({ email: mockUser.email, password: 'password' });

      expect(result.user).not.toHaveProperty('password_hash');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh access token with valid refresh token', async () => {
      const refreshToken = 'valid_refresh_token';
      const payload = mockJwtPayload();
      const mockUser = createMockUser({ id: payload.userId });

      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(payload);
      mockUserRepository.findById = jest.fn().mockResolvedValue(mockUser);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('new_access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('new_refresh_token');

      const result = await authService.refreshToken(refreshToken);

      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(payload.userId);

      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
    });

    it('should throw error for invalid refresh token', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid_token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error if user not found', async () => {
      const payload = mockJwtPayload();

      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(payload);
      mockUserRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(authService.refreshToken('valid_token')).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error for inactive user', async () => {
      const payload = mockJwtPayload();
      const mockUser = createMockUser({ id: payload.userId, is_active: false });

      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(payload);
      mockUserRepository.findById = jest.fn().mockResolvedValue(mockUser);

      await expect(authService.refreshToken('valid_token')).rejects.toThrow(
        'Account is deactivated'
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email for existing user', async () => {
      const email = 'test@example.com';
      const mockUser = createMockUser({ email });
      const token = 'reset-token-123';

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(undefined);
      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue(token);
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      await authService.requestPasswordReset(email);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockTokenRepository.deleteByUserId).toHaveBeenCalledWith(mockUser.id, 'password_reset');
      expect(mockTokenRepository.create).toHaveBeenCalledWith(
        mockUser.id,
        token,
        'password_reset',
        expect.any(Date)
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name,
        token
      );
    });

    it('should not reveal if user does not exist (security)', async () => {
      const email = 'nonexistent@example.com';

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);

      // Should not throw error
      await expect(authService.requestPasswordReset(email)).resolves.not.toThrow();

      expect(mockTokenRepository.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw error if email service fails', async () => {
      const email = 'test@example.com';
      const mockUser = createMockUser({ email });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(undefined);
      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue('token');
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendPasswordResetEmail as jest.Mock).mockRejectedValue(
        new Error('Email service down')
      );

      await expect(authService.requestPasswordReset(email)).rejects.toThrow(
        'Failed to send password reset email'
      );
    });

    it('should delete existing password reset tokens before creating new one', async () => {
      const email = 'test@example.com';
      const mockUser = createMockUser({ email });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(undefined);
      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue('token');
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      await authService.requestPasswordReset(email);

      // Verify both methods were called
      expect(mockTokenRepository.deleteByUserId).toHaveBeenCalled();
      expect(mockTokenRepository.create).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPass123!@#';
      const userId = 'user-123';
      const mockToken = createMockVerificationToken(userId, 'password_reset');

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockToken);
      mockUserRepository.updatePassword = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.markAsUsed = jest.fn().mockResolvedValue(undefined);
      (encryption.hashPassword as jest.Mock).mockResolvedValue('hashed_new_password');

      await authService.resetPassword(token, newPassword);

      expect(mockTokenRepository.findByToken).toHaveBeenCalledWith(token, 'password_reset');
      expect(encryption.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        userId,
        'hashed_new_password'
      );
      expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith(mockToken.id);
    });

    it('should throw error for invalid or expired token', async () => {
      const token = 'invalid-token';
      const newPassword = 'NewPass123!@#';

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(null);

      await expect(authService.resetPassword(token, newPassword)).rejects.toThrow(
        'Invalid or expired password reset token'
      );

      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should validate new password strength', async () => {
      const token = 'valid-token';
      const weakPassword = 'weak';
      const userId = 'user-123';
      const mockToken = createMockVerificationToken(userId, 'password_reset');

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockToken);

      // Mock validation to return false for weak password
      const { isValidPassword } = require('@flamoral/backend-shared/utils/validation');
      (isValidPassword as jest.Mock).mockReturnValueOnce(false);

      await expect(authService.resetPassword(token, weakPassword)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );

      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should mark token as used after password reset', async () => {
      const token = 'valid-token';
      const newPassword = 'NewPass123!@#';
      const userId = 'user-123';
      const mockToken = createMockVerificationToken(userId, 'password_reset');

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockToken);
      mockUserRepository.updatePassword = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.markAsUsed = jest.fn().mockResolvedValue(undefined);
      (encryption.hashPassword as jest.Mock).mockResolvedValue('hashed_password');

      await authService.resetPassword(token, newPassword);

      expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith(mockToken.id);
    });
  });
});
