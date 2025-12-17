/// <reference types="jest" />
/**
 * Unit tests for Match Service
 * Tests match lifecycle, expiration, extension, and rematch functionality
 */

import matchService from '../../../src/domain/services/match.service';
import matchRepository from '../../../src/domain/repositories/match.repository';
import notificationServiceClient from '../../../src/infrastructure/clients/notification-service.client';

jest.mock('../../../src/domain/repositories/match.repository');
jest.mock('../../../src/infrastructure/clients/notification-service.client');
jest.mock('@flamoral/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('MatchService', () => {
  const matchId = 'match-123';
  const userId = 'user-123';
  const otherUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extendMatch', () => {
    it('should extend match for premium users', async () => {
      const mockMatch = {
        id: matchId,
        user1Id: userId,
        user2Id: otherUserId,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours left
        canExtend: () => true,
        getOtherUserId: (id: string) => (id === userId ? otherUserId : userId),
      };

      const extendedMatch = {
        ...mockMatch,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Extended by 24 hours
        hasBeenExtended: true,
      };

      (matchRepository.findById as jest.Mock).mockResolvedValue(mockMatch);
      (matchRepository.extendMatch as jest.Mock).mockResolvedValue(extendedMatch);
      (notificationServiceClient.sendNotification as jest.Mock).mockResolvedValue(undefined);

      const result = await matchService.extendMatch(matchId, userId, true);

      expect(matchRepository.findById).toHaveBeenCalledWith(matchId);
      expect(matchRepository.extendMatch).toHaveBeenCalledWith(matchId);
      expect(notificationServiceClient.sendNotification).toHaveBeenCalledWith({
        userId: otherUserId,
        type: 'new_match',
        title: 'Match Extended!',
        body: 'Your match has been extended. You have 24 more hours to connect!',
        data: {
          matchId,
          action: 'view_match',
        },
        channel: 'push',
      });
      expect(result).toEqual(extendedMatch);
    });

    it('should throw error for non-premium users', async () => {
      await expect(matchService.extendMatch(matchId, userId, false)).rejects.toThrow(
        'Match extension is a Premium feature'
      );

      expect(matchRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if match not found', async () => {
      (matchRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(matchService.extendMatch(matchId, userId, true)).rejects.toThrow(
        'Match not found'
      );

      expect(matchRepository.extendMatch).not.toHaveBeenCalled();
    });

    it('should throw error if user not part of match', async () => {
      const mockMatch = {
        id: matchId,
        user1Id: 'other-user-1',
        user2Id: 'other-user-2',
        canExtend: () => true,
      };

      (matchRepository.findById as jest.Mock).mockResolvedValue(mockMatch);

      await expect(matchService.extendMatch(matchId, userId, true)).rejects.toThrow(
        'Access denied'
      );

      expect(matchRepository.extendMatch).not.toHaveBeenCalled();
    });

    it('should throw error if match cannot be extended', async () => {
      const mockMatch = {
        id: matchId,
        user1Id: userId,
        user2Id: otherUserId,
        hasBeenExtended: true,
        canExtend: () => false,
      };

      (matchRepository.findById as jest.Mock).mockResolvedValue(mockMatch);

      await expect(matchService.extendMatch(matchId, userId, true)).rejects.toThrow(
        'Match cannot be extended'
      );

      expect(matchRepository.extendMatch).not.toHaveBeenCalled();
    });
  });

  describe('rematch', () => {
    it('should create rematch for premium users', async () => {
      const newMatch = {
        id: 'new-match-456',
        user1Id: userId,
        user2Id: otherUserId,
        isRematch: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (matchRepository.rematch as jest.Mock).mockResolvedValue(newMatch);
      (notificationServiceClient.sendNotification as jest.Mock).mockResolvedValue(undefined);

      const result = await matchService.rematch(userId, otherUserId, true);

      expect(matchRepository.rematch).toHaveBeenCalledWith(userId, otherUserId);
      expect(notificationServiceClient.sendNotification).toHaveBeenCalledWith({
        userId: otherUserId,
        type: 'new_match',
        title: "It's a Match Again!",
        body: 'You have a second chance! Start chatting now.',
        data: {
          matchId: newMatch.id,
          rematchedUserId: userId,
          action: 'view_match',
        },
        channel: 'push',
      });
      expect(result).toEqual(newMatch);
    });

    it('should throw error for non-premium users', async () => {
      await expect(matchService.rematch(userId, otherUserId, false)).rejects.toThrow(
        'Rematch is a Premium feature'
      );

      expect(matchRepository.rematch).not.toHaveBeenCalled();
    });

    it('should throw error if rematch fails', async () => {
      (matchRepository.rematch as jest.Mock).mockResolvedValue(null);

      await expect(matchService.rematch(userId, otherUserId, true)).rejects.toThrow(
        'Failed to rematch'
      );
    });
  });

  describe('markFirstMessageSent', () => {
    it('should mark first message sent successfully', async () => {
      const updatedMatch = {
        id: matchId,
        user1Id: userId,
        user2Id: otherUserId,
        conversationInitiated: true,
        firstMessageSentAt: new Date(),
        expiresAt: null, // Expiration stopped
      };

      (matchRepository.markFirstMessageSent as jest.Mock).mockResolvedValue(updatedMatch);

      const result = await matchService.markFirstMessageSent(matchId);

      expect(matchRepository.markFirstMessageSent).toHaveBeenCalledWith(matchId);
      expect(result).toEqual(updatedMatch);
    });

    it('should throw error if match not found', async () => {
      (matchRepository.markFirstMessageSent as jest.Mock).mockResolvedValue(null);

      await expect(matchService.markFirstMessageSent(matchId)).rejects.toThrow(
        'Match not found'
      );
    });
  });

  describe('processExpiredMatches', () => {
    it('should process all expired matches', async () => {
      const expiredMatches = [
        { id: 'match-1', user1Id: 'user-1', user2Id: 'user-2' },
        { id: 'match-2', user1Id: 'user-3', user2Id: 'user-4' },
      ];

      (matchRepository.findMatchesToExpire as jest.Mock).mockResolvedValue(expiredMatches);
      (matchRepository.markAsExpired as jest.Mock).mockResolvedValue(undefined);
      (notificationServiceClient.sendNotification as jest.Mock).mockResolvedValue(undefined);

      await matchService.processExpiredMatches();

      expect(matchRepository.findMatchesToExpire).toHaveBeenCalled();
      expect(matchRepository.markAsExpired).toHaveBeenCalledTimes(2);
      expect(notificationServiceClient.sendNotification).toHaveBeenCalledTimes(4); // 2 users per match
    });

    it('should send expiration notifications to both users', async () => {
      const expiredMatches = [{ id: 'match-1', user1Id: 'user-1', user2Id: 'user-2' }];

      (matchRepository.findMatchesToExpire as jest.Mock).mockResolvedValue(expiredMatches);
      (matchRepository.markAsExpired as jest.Mock).mockResolvedValue(undefined);
      (notificationServiceClient.sendNotification as jest.Mock).mockResolvedValue(undefined);

      await matchService.processExpiredMatches();

      expect(notificationServiceClient.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: 'Match Expired',
          body: 'Your match has expired. Upgrade to Premium to rematch!',
        })
      );

      expect(notificationServiceClient.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          title: 'Match Expired',
          body: 'Your match has expired. Upgrade to Premium to rematch!',
        })
      );
    });

    it('should handle no expired matches', async () => {
      (matchRepository.findMatchesToExpire as jest.Mock).mockResolvedValue([]);

      await matchService.processExpiredMatches();

      expect(matchRepository.markAsExpired).not.toHaveBeenCalled();
      expect(notificationServiceClient.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendExpirationWarnings', () => {
    it('should send 6-hour expiration warnings', async () => {
      const matchesExpiringSoon = [
        { id: 'match-1', user1Id: 'user-1', user2Id: 'user-2' },
      ];

      (matchRepository.findMatchesExpiringSoon as jest.Mock).mockResolvedValue(
        matchesExpiringSoon
      );
      (notificationServiceClient.sendNotification as jest.Mock).mockResolvedValue(undefined);

      await matchService.sendExpirationWarnings(6);

      expect(matchRepository.findMatchesExpiringSoon).toHaveBeenCalledWith(6);
      expect(notificationServiceClient.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Match Expiring Soon',
          body: 'Your match expires in 6 hours!',
        })
      );
    });

    it('should send 1-hour expiration warnings', async () => {
      const matchesExpiringSoon = [
        { id: 'match-1', user1Id: 'user-1', user2Id: 'user-2' },
      ];

      (matchRepository.findMatchesExpiringSoon as jest.Mock).mockResolvedValue(
        matchesExpiringSoon
      );
      (notificationServiceClient.sendNotification as jest.Mock).mockResolvedValue(undefined);

      await matchService.sendExpirationWarnings(1);

      expect(matchRepository.findMatchesExpiringSoon).toHaveBeenCalledWith(1);
      expect(notificationServiceClient.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Match Expiring Soon',
          body: 'Last chance! Match expires in 1 hour',
        })
      );
    });

    it('should send warnings to both users in each match', async () => {
      const matchesExpiringSoon = [
        { id: 'match-1', user1Id: 'user-1', user2Id: 'user-2' },
        { id: 'match-2', user1Id: 'user-3', user2Id: 'user-4' },
      ];

      (matchRepository.findMatchesExpiringSoon as jest.Mock).mockResolvedValue(
        matchesExpiringSoon
      );
      (notificationServiceClient.sendNotification as jest.Mock).mockResolvedValue(undefined);

      await matchService.sendExpirationWarnings(6);

      expect(notificationServiceClient.sendNotification).toHaveBeenCalledTimes(4); // 2 users × 2 matches
    });

    it('should handle no matches expiring soon', async () => {
      (matchRepository.findMatchesExpiringSoon as jest.Mock).mockResolvedValue([]);

      await matchService.sendExpirationWarnings(6);

      expect(notificationServiceClient.sendNotification).not.toHaveBeenCalled();
    });
  });
});
