// Mock database connection BEFORE any imports
jest.mock('../../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { VerificationService } from '../../../domain/services/verification.service';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { VerificationTokenRepository } from '../../../domain/repositories/verification-token.repository';
import { createMockUser, createMockVerificationToken } from '../../helpers/test-data';
import jwtUtils from '../../../utils/jwt';
import emailService from '../../../infrastructure/email/email.service';

// Mock dependencies
jest.mock('../../../domain/repositories/user.repository');
jest.mock('../../../domain/repositories/verification-token.repository');
jest.mock('../../../utils/jwt');
jest.mock('../../../infrastructure/email/email.service');

describe('VerificationService', () => {
  let verificationService: VerificationService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockTokenRepository: jest.Mocked<VerificationTokenRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockTokenRepository = new VerificationTokenRepository() as jest.Mocked<VerificationTokenRepository>;

    verificationService = new VerificationService();
    (verificationService as any).userRepository = mockUserRepository;
    (verificationService as any).tokenRepository = mockTokenRepository;
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email to user', async () => {
      const userId = 'user-id';
      const email = 'test@example.com';
      const firstName = 'John';
      const mockToken = 'verification-token-123';
      const mockExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(
        createMockVerificationToken(userId, 'email_verification')
      );

      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue(mockToken);
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(mockExpiry);
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      await verificationService.sendVerificationEmail(userId, email, firstName);

      expect(mockTokenRepository.deleteByUserId).toHaveBeenCalledWith(
        userId,
        'email_verification'
      );
      expect(jwtUtils.generateRandomToken).toHaveBeenCalled();
      expect(jwtUtils.calculateTokenExpiry).toHaveBeenCalledWith(24); // 24 hours
      expect(mockTokenRepository.create).toHaveBeenCalledWith(
        userId,
        mockToken,
        'email_verification',
        mockExpiry
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        email,
        firstName,
        mockToken
      );
    });

    it('should delete existing verification tokens before creating new one', async () => {
      const userId = 'user-id';

      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(
        createMockVerificationToken(userId, 'email_verification')
      );

      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue('token');
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      await verificationService.sendVerificationEmail(userId, 'test@example.com', 'John');

      expect(mockTokenRepository.deleteByUserId).toHaveBeenCalledWith(
        userId,
        'email_verification'
      );
    });

    it('should throw error if email sending fails', async () => {
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(
        createMockVerificationToken('user-id', 'email_verification')
      );

      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue('token');
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service error')
      );

      await expect(
        verificationService.sendVerificationEmail('user-id', 'test@example.com', 'John')
      ).rejects.toThrow('Failed to send verification email');
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const token = 'valid-verification-token';
      const userId = 'user-id';
      const mockVerificationToken = createMockVerificationToken(userId, 'email_verification');
      const mockUser = createMockUser({ id: userId, is_email_verified: false });

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockVerificationToken);
      mockUserRepository.verifyEmail = jest.fn().mockResolvedValue({
        ...mockUser,
        is_email_verified: true,
        is_verified: true,
      });
      mockTokenRepository.markAsUsed = jest.fn().mockResolvedValue(undefined);
      (emailService.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

      await verificationService.verifyEmail(token);

      expect(mockTokenRepository.findByToken).toHaveBeenCalledWith(
        token,
        'email_verification'
      );
      expect(mockUserRepository.verifyEmail).toHaveBeenCalledWith(userId);
      expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith(mockVerificationToken.id);
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name
      );
    });

    it('should throw error for invalid or expired token', async () => {
      const token = 'invalid-token';

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(null);

      await expect(verificationService.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired verification token'
      );

      expect(mockUserRepository.verifyEmail).not.toHaveBeenCalled();
      expect(mockTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should send welcome email after successful verification', async () => {
      const token = 'valid-token';
      const mockVerificationToken = createMockVerificationToken('user-id', 'email_verification');
      const mockUser = createMockUser({
        email: 'test@example.com',
        first_name: 'John',
      });

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockVerificationToken);
      mockUserRepository.verifyEmail = jest.fn().mockResolvedValue({
        ...mockUser,
        is_email_verified: true,
      });
      mockTokenRepository.markAsUsed = jest.fn().mockResolvedValue(undefined);
      (emailService.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

      await verificationService.verifyEmail(token);

      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com', 'John');
    });

    it('should handle welcome email errors gracefully', async () => {
      const token = 'valid-token';
      const mockVerificationToken = createMockVerificationToken('user-id', 'email_verification');
      const mockUser = createMockUser();

      mockTokenRepository.findByToken = jest.fn().mockResolvedValue(mockVerificationToken);
      mockUserRepository.verifyEmail = jest.fn().mockResolvedValue({
        ...mockUser,
        is_email_verified: true,
      });
      mockTokenRepository.markAsUsed = jest.fn().mockResolvedValue(undefined);
      (emailService.sendWelcomeEmail as jest.Mock).mockRejectedValue(
        new Error('Email failed')
      );

      // Should not throw error even if welcome email fails
      await expect(verificationService.verifyEmail(token)).resolves.not.toThrow();

      expect(mockUserRepository.verifyEmail).toHaveBeenCalled();
      expect(mockTokenRepository.markAsUsed).toHaveBeenCalled();
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email to existing user', async () => {
      const email = 'test@example.com';
      const mockUser = createMockUser({ email, is_email_verified: false });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(
        createMockVerificationToken(mockUser.id, 'email_verification')
      );

      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue('token');
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      await verificationService.resendVerificationEmail(email);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        email,
        mockUser.first_name,
        'token'
      );
    });

    it('should throw error if user not found', async () => {
      const email = 'nonexistent@example.com';

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(
        verificationService.resendVerificationEmail(email)
      ).rejects.toThrow('User not found');

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should throw error if email already verified', async () => {
      const email = 'test@example.com';
      const mockUser = createMockUser({ email, is_email_verified: true });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);

      await expect(
        verificationService.resendVerificationEmail(email)
      ).rejects.toThrow('Email already verified');

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should delete old verification tokens before creating new one', async () => {
      const mockUser = createMockUser({ is_email_verified: false });

      mockUserRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockTokenRepository.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockTokenRepository.create = jest.fn().mockResolvedValue(
        createMockVerificationToken(mockUser.id, 'email_verification')
      );

      (jwtUtils.generateRandomToken as jest.Mock).mockReturnValue('token');
      (jwtUtils.calculateTokenExpiry as jest.Mock).mockReturnValue(new Date());
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      await verificationService.resendVerificationEmail(mockUser.email);

      expect(mockTokenRepository.deleteByUserId).toHaveBeenCalledWith(
        mockUser.id,
        'email_verification'
      );
    });
  });
});
