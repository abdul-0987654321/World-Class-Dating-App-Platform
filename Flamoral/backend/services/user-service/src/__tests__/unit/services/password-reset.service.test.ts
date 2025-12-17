/// <reference types="jest" />
// Mock database connection BEFORE any imports
jest.mock('../../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock validation functions
jest.mock('@flamoral/shared/utils/validation', () => ({
  isValidPassword: jest.fn(() => true),
}));

import { PasswordResetService } from '../../../domain/services/password-reset.service';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { VerificationTokenRepository } from '../../../domain/repositories/verification-token.repository';
import { createMockUser, createMockVerificationToken } from '../../helpers/test-data';
import * as encryption from '../../../utils/encryption';
import jwtUtils from '../../../utils/jwt';
import emailService from '../../../infrastructure/email/email.service';

// Mock dependencies
jest.mock('../../../domain/repositories/user.repository');
jest.mock('../../../domain/repositories/verification-token.repository');
jest.mock('../../../utils/encryption');
jest.mock('../../../utils/jwt');
jest.mock('../../../infrastructure/email/email.service');

describe('PasswordResetService', () => {
  let passwordResetService: PasswordResetService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockTokenRepository: jest.Mocked<VerificationTokenRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockTokenRepository = new VerificationTokenRepository() as jest.Mocked<VerificationTokenRepository>;

    passwordResetService = new PasswordResetService();
    (passwordResetService as any).userRepository = mockUserRepository;
    (passwordResetService as any).tokenRepository = mockTokenRepository;
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email for existing user', async () => {
      const email = 'test@example.com';
      const mockUser = createMockUser({ email });
      const mockToken = 'reset-token-123';
      const mockExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(createMockVerificationToken(mockUser.id, 'password_reset'));

      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue(mockToken);
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(mockExpiry);
      (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      await passwordResetService.requestPasswordReset(email);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockTokenRepository.deleteByUserId).toHaveBeenCalledWith(mockUser.id, 'password_reset');
      expect(jwtUtils.generateRandomToken).toHaveBeenCalled();
      expect(jwtUtils.calculateTokenExpiry).toHaveBeenCalledWith(1); // 1 hour
      expect(mockTokenRepository.create).toHaveBeenCalledWith(
        mockUser.id,
        mockToken,
        'password_reset',
        mockExpiry
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name,
        mockToken
      );
    });

    it('should not reveal if email does not exist (security)', async () => {
      const email = 'nonexistent@example.com';

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);

      // Should not throw error
      await expect(
        passwordResetService.requestPasswordReset(email)
      ).resolves.not.toThrow();

      expect(mockTokenRepository.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should delete existing reset tokens before creating new one', async () => {
      const mockUser = createMockUser();

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(createMockVerificationToken(mockUser.id, 'password_reset'));

      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue('token');
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      await passwordResetService.requestPasswordReset(mockUser.email);

      expect(mockTokenRepository.deleteByUserId).toHaveBeenCalledWith(
        mockUser.id,
        'password_reset'
      );
    });

    it('should throw error if email sending fails', async () => {
      const mockUser = createMockUser();

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(createMockVerificationToken(mockUser.id, 'password_reset'));

      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue('token');
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendPasswordResetEmail as jest.Mock).mockRejectedValue(
        new Error('Email service error')
      );

      await expect(
        passwordResetService.requestPasswordReset(mockUser.email)
      ).rejects.toThrow('Failed to send password reset email');
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPass123!@#';
      const userId = 'user-id';
      const mockResetToken = createMockVerificationToken(userId, 'password_reset');

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockResetToken);
      mockUserRepository.updatePassword = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.markAsUsed = jest.fn().mockResolvedValue(undefined);

      (encryption.hashPassword as jest.Mock).mockResolvedValue('hashed_new_password');

      await passwordResetService.resetPassword(token, newPassword);

      expect(mockTokenRepository.findByToken).toHaveBeenCalledWith(token, 'password_reset');
      expect(encryption.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        userId,
        'hashed_new_password'
      );
      expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith(mockResetToken.id);
    });

    it('should throw error for invalid or expired token', async () => {
      const token = 'invalid-token';
      const newPassword = 'NewPass123!@#';

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(null);

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow('Invalid or expired reset token');

      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw error for weak password', async () => {
      const token = 'valid-token';
      const weakPassword = 'weak';
      const mockResetToken = createMockVerificationToken('user-id', 'password_reset');

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockResetToken);

      await expect(
        passwordResetService.resetPassword(token, weakPassword)
      ).rejects.toThrow(/Password must be at least 8 characters/);

      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
      expect(mockTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should validate password requirements', async () => {
      const token = 'valid-token';
      const mockResetToken = createMockVerificationToken('user-id', 'password_reset');

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockResetToken);

      // Missing uppercase
      await expect(
        passwordResetService.resetPassword(token, 'password123!')
      ).rejects.toThrow();

      // Missing number
      await expect(
        passwordResetService.resetPassword(token, 'Password!')
      ).rejects.toThrow();

      // Missing special character
      await expect(
        passwordResetService.resetPassword(token, 'Password123')
      ).rejects.toThrow();
    });

    it('should mark token as used after successful reset', async () => {
      const token = 'valid-token';
      const newPassword = 'NewPass123!@#';
      const mockResetToken = createMockVerificationToken('user-id', 'password_reset');

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockResetToken);
      mockUserRepository.updatePassword = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.markAsUsed = jest.fn().mockResolvedValue(undefined);

      (encryption.hashPassword as jest.Mock).mockResolvedValue('hashed_password');

      await passwordResetService.resetPassword(token, newPassword);

      expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith(mockResetToken.id);
    });
  });

  describe('verifyResetToken', () => {
    it('should return true for valid reset token', async () => {
      const token = 'valid-token';
      const mockResetToken = createMockVerificationToken('user-id', 'password_reset');

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockResetToken);

      const result = await passwordResetService.verifyResetToken(token);

      expect(mockTokenRepository.findByToken).toHaveBeenCalledWith(token, 'password_reset');
      expect(result).toBe(true);
    });

    it('should return false for invalid or expired token', async () => {
      const token = 'invalid-token';

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(null);

      const result = await passwordResetService.verifyResetToken(token);

      expect(result).toBe(false);
    });

    it('should return false for used token', async () => {
      const token = 'used-token';

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(null);

      const result = await passwordResetService.verifyResetToken(token);

      expect(result).toBe(false);
    });
  });
});
