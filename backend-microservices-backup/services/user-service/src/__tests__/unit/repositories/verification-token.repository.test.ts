import { VerificationTokenRepository } from '../../../domain/repositories/verification-token.repository';
import { mockDatabase } from '../../helpers/db-mock';
import { createMockVerificationToken } from '../../helpers/test-data';

jest.mock('../../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('VerificationTokenRepository', () => {
  let tokenRepository: VerificationTokenRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    tokenRepository = new VerificationTokenRepository();
  });

  describe('create', () => {
    it('should create a new verification token', async () => {
      const userId = 'test-user-id';
      const token = 'test-token-123';
      const tokenType = 'email_verification';
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockToken = createMockVerificationToken(userId, tokenType);

      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens', [mockToken]);

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await tokenRepository.create(userId, token, tokenType, expiresAt);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        user_id: userId,
        token,
        type: tokenType,
        expires_at: expiresAt,
      });
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith('*');
    });

    it('should handle database errors when creating token', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Database error')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await expect(
        tokenRepository.create(
          'user-id',
          'token',
          'email_verification',
          new Date()
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('findByToken', () => {
    it('should return token when found and valid', async () => {
      const mockToken = createMockVerificationToken('user-id', 'email_verification');
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens', mockToken);

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      const result = await tokenRepository.findByToken(
        mockToken.token,
        'email_verification'
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        token: mockToken.token,
        type: 'email_verification',
        is_used: false,
      });
      expect(mockQueryBuilder.first).toHaveBeenCalled();
      expect(result).toEqual(mockToken);
    });

    it('should return null for expired token', async () => {
      const expiredToken = createMockVerificationToken('user-id', 'email_verification');
      expiredToken.expires_at = new Date(Date.now() - 1000); // Expired

      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens', null);

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      const result = await tokenRepository.findByToken(
        expiredToken.token,
        'email_verification'
      );

      // Should filter by expires_at > now
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null for used token', async () => {
      const usedToken = createMockVerificationToken('user-id', 'email_verification');
      usedToken.is_used = true;

      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens', null);

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      const result = await tokenRepository.findByToken(
        usedToken.token,
        'email_verification'
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.objectContaining({ is_used: false })
      );
      expect(result).toBeNull();
    });

    it('should return null for wrong token type', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens', null);

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await tokenRepository.findByToken('some-token', 'password_reset');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'password_reset' })
      );
    });
  });

  describe('markAsUsed', () => {
    it('should mark token as used', async () => {
      const tokenId = 'token-id';
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens');

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await tokenRepository.markAsUsed(tokenId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: tokenId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ is_used: true });
    });

    it('should handle errors when marking token as used', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Update failed')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await expect(tokenRepository.markAsUsed('token-id')).rejects.toThrow('Update failed');
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all tokens of a specific type for a user', async () => {
      const userId = 'test-user-id';
      const tokenType = 'email_verification';
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens');

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await tokenRepository.deleteByUserId(userId, tokenType);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        user_id: userId,
        type: tokenType,
      });
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('should handle password_reset token type', async () => {
      const userId = 'test-user-id';
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens');

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await tokenRepository.deleteByUserId(userId, 'password_reset');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        user_id: userId,
        type: 'password_reset',
      });
    });

    it('should handle errors when deleting tokens', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Delete failed')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await expect(
        tokenRepository.deleteByUserId('user-id', 'email_verification')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('deleteExpired', () => {
    it('should delete all expired tokens', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens');

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await tokenRepository.deleteExpired();

      // Should delete tokens where expires_at < now
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('should handle errors when deleting expired tokens', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('verification_tokens');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Delete failed')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      tokenRepository = new VerificationTokenRepository();

      await expect(tokenRepository.deleteExpired()).rejects.toThrow('Delete failed');
    });
  });
});
