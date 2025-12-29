/**
 * Unit tests for Swipe Service
 * Tests swipe processing, mutual likes, match creation, and undo functionality
 */

import { SwipeService } from '../../../src/domain/services/swipe.service';
import swipeRepository from '../../../src/domain/repositories/swipe.repository';
import matchRepository from '../../../src/domain/repositories/match.repository';
import notificationServiceClient from '../../../src/infrastructure/clients/notification-service.client';
import analyticsServiceClient from '../../../src/infrastructure/clients/analytics-service.client';
import userServiceClient from '../../../src/infrastructure/clients/user-service.client';
import { SwipeAction } from '../../../src/types';

jest.mock('../../../src/domain/repositories/swipe.repository');
jest.mock('../../../src/domain/repositories/match.repository');
jest.mock('../../../src/infrastructure/clients/notification-service.client');
jest.mock('../../../src/infrastructure/clients/analytics-service.client');
jest.mock('../../../src/infrastructure/clients/user-service.client');
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  ServiceClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('SwipeService', () => {
  let swipeService: SwipeService;
  const userId = 'user-123';
  const targetUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    swipeService = new SwipeService();
  });

  describe('processSwipe', () => {
    it('should record a like swipe without creating match when no mutual like', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);
      (swipeRepository.create as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLike as jest.Mock).mockResolvedValue(false);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(swipeRepository.hasUserSwiped).toHaveBeenCalledWith(userId, targetUserId);
      expect(swipeRepository.create).toHaveBeenCalledWith({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });
      expect(swipeRepository.checkMutualLike).toHaveBeenCalledWith(userId, targetUserId);
      expect(result.matched).toBe(false);
      expect(result.message).toBe('Swipe recorded');
    });

    it('should create match when mutual like is detected', async () => {
      const mockMatch = {
        id: 'match-123',
        user1Id: userId,
        user2Id: targetUserId,
      };

      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);
      (swipeRepository.create as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLike as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsers as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(
        new Map([
          [userId, { gender: 'male' }],
          [targetUserId, { gender: 'female' }],
        ])
      );
      (matchRepository.create as jest.Mock).mockResolvedValue(mockMatch);
      (matchRepository.getUserMatchCount as jest.Mock).mockResolvedValue(1);
      (notificationServiceClient.notifyBothUsersOfMatch as jest.Mock).mockResolvedValue(undefined);
      (analyticsServiceClient.trackMatch as jest.Mock).mockResolvedValue(undefined);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(result.matched).toBe(true);
      expect(result.match).toEqual(mockMatch);
      expect(result.message).toBe("It's a match!");
      expect(notificationServiceClient.notifyBothUsersOfMatch).toHaveBeenCalledWith(
        userId,
        targetUserId,
        mockMatch.id
      );
    });

    it('should create match with super like when mutual', async () => {
      const mockMatch = {
        id: 'match-123',
        user1Id: userId,
        user2Id: targetUserId,
      };

      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);
      (swipeRepository.create as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLike as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsers as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(new Map());
      (matchRepository.create as jest.Mock).mockResolvedValue(mockMatch);
      (matchRepository.getUserMatchCount as jest.Mock).mockResolvedValue(1);
      (notificationServiceClient.notifyBothUsersOfMatch as jest.Mock).mockResolvedValue(undefined);
      (analyticsServiceClient.trackMatch as jest.Mock).mockResolvedValue(undefined);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.SUPER_LIKE,
      });

      expect(result.matched).toBe(true);
      expect(swipeRepository.create).toHaveBeenCalledWith({
        userId,
        targetUserId,
        action: SwipeAction.SUPER_LIKE,
      });
    });

    it('should not check for mutual like on pass action', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);
      (swipeRepository.create as jest.Mock).mockResolvedValue({ id: 'swipe-123' });

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.PASS,
      });

      expect(swipeRepository.checkMutualLike).not.toHaveBeenCalled();
      expect(result.matched).toBe(false);
      expect(result.message).toBe('Swipe recorded');
    });

    it('should return early if user has already swiped on target', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(true);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(swipeRepository.create).not.toHaveBeenCalled();
      expect(result.matched).toBe(false);
      expect(result.message).toBe('You have already swiped on this user');
    });

    it('should return existing match if already matched', async () => {
      const existingMatch = {
        id: 'existing-match-123',
        user1Id: userId,
        user2Id: targetUserId,
      };

      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);
      (swipeRepository.create as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLike as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsers as jest.Mock).mockResolvedValue(existingMatch);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(result.matched).toBe(true);
      expect(result.match).toEqual(existingMatch);
      expect(matchRepository.create).not.toHaveBeenCalled();
    });

    it('should enable women-first messaging for heterosexual matches', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);
      (swipeRepository.create as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLike as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsers as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(
        new Map([
          [userId, { gender: 'male' }],
          [targetUserId, { gender: 'female' }],
        ])
      );
      (matchRepository.create as jest.Mock).mockImplementation((data) => ({
        id: 'match-123',
        ...data,
      }));
      (matchRepository.getUserMatchCount as jest.Mock).mockResolvedValue(1);
      (notificationServiceClient.notifyBothUsersOfMatch as jest.Mock).mockResolvedValue(undefined);
      (analyticsServiceClient.trackMatch as jest.Mock).mockResolvedValue(undefined);

      await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(matchRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requiresWomenFirst: true,
          womanUserId: targetUserId,
        })
      );
    });

    it('should not enable women-first messaging for same-sex matches', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);
      (swipeRepository.create as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLike as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsers as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(
        new Map([
          [userId, { gender: 'female' }],
          [targetUserId, { gender: 'female' }],
        ])
      );
      (matchRepository.create as jest.Mock).mockImplementation((data) => ({
        id: 'match-123',
        ...data,
      }));
      (matchRepository.getUserMatchCount as jest.Mock).mockResolvedValue(1);
      (notificationServiceClient.notifyBothUsersOfMatch as jest.Mock).mockResolvedValue(undefined);
      (analyticsServiceClient.trackMatch as jest.Mock).mockResolvedValue(undefined);

      await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(matchRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requiresWomenFirst: false,
        })
      );
    });

    it('should track first match in analytics', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);
      (swipeRepository.create as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLike as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsers as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(new Map());
      (matchRepository.create as jest.Mock).mockResolvedValue({
        id: 'match-123',
        user1Id: userId,
        user2Id: targetUserId,
      });
      (matchRepository.getUserMatchCount as jest.Mock)
        .mockResolvedValueOnce(1) // First user's first match
        .mockResolvedValueOnce(5); // Second user's 5th match
      (notificationServiceClient.notifyBothUsersOfMatch as jest.Mock).mockResolvedValue(undefined);
      (analyticsServiceClient.trackMatch as jest.Mock).mockResolvedValue(undefined);

      await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(analyticsServiceClient.trackMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          isFirstMatch: true,
        })
      );
      expect(analyticsServiceClient.trackMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: targetUserId,
          isFirstMatch: false,
        })
      );
    });

    it('should throw error on repository failure', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        swipeService.processSwipe({
          userId,
          targetUserId,
          action: SwipeAction.LIKE,
        })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getUsersWhoLikedMe', () => {
    it('should return list of user IDs who liked the user', async () => {
      const likedByUserIds = ['user-1', 'user-2', 'user-3'];
      (swipeRepository.getUsersWhoLiked as jest.Mock).mockResolvedValue(likedByUserIds);

      const result = await swipeService.getUsersWhoLikedMe(userId);

      expect(swipeRepository.getUsersWhoLiked).toHaveBeenCalledWith(userId);
      expect(result).toEqual(likedByUserIds);
    });

    it('should return empty array if no one liked the user', async () => {
      (swipeRepository.getUsersWhoLiked as jest.Mock).mockResolvedValue([]);

      const result = await swipeService.getUsersWhoLikedMe(userId);

      expect(result).toEqual([]);
    });

    it('should throw error on repository failure', async () => {
      (swipeRepository.getUsersWhoLiked as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(swipeService.getUsersWhoLikedMe(userId)).rejects.toThrow('Database error');
    });
  });

  describe('getSwipeStats', () => {
    it('should return swipe statistics for user', async () => {
      const mockStats = {
        likesGiven: 50,
        likesReceived: 30,
        superlikesGiven: 5,
        superlikesReceived: 2,
        passesGiven: 100,
        matches: 10,
        matchRate: 0.2,
      };

      (swipeRepository.getSwipeStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await swipeService.getSwipeStats(userId);

      expect(swipeRepository.getSwipeStats).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockStats);
    });

    it('should return zero stats for new user', async () => {
      const emptyStats = {
        likesGiven: 0,
        likesReceived: 0,
        superlikesGiven: 0,
        superlikesReceived: 0,
        passesGiven: 0,
        matches: 0,
        matchRate: 0,
      };

      (swipeRepository.getSwipeStats as jest.Mock).mockResolvedValue(emptyStats);

      const result = await swipeService.getSwipeStats(userId);

      expect(result).toEqual(emptyStats);
    });

    it('should throw error on repository failure', async () => {
      (swipeRepository.getSwipeStats as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(swipeService.getSwipeStats(userId)).rejects.toThrow('Database error');
    });
  });

  describe('undoLastSwipe', () => {
    it('should undo last swipe successfully', async () => {
      const lastSwipe = {
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.PASS,
        isLike: () => false,
      };

      (swipeRepository.getLastSwipe as jest.Mock).mockResolvedValue(lastSwipe);
      (swipeRepository.deleteById as jest.Mock).mockResolvedValue(true);
      (analyticsServiceClient.trackUndoSwipe as jest.Mock).mockResolvedValue(undefined);

      const result = await swipeService.undoLastSwipe(userId);

      expect(swipeRepository.getLastSwipe).toHaveBeenCalledWith(userId);
      expect(swipeRepository.deleteById).toHaveBeenCalledWith('swipe-123');
      expect(result).toBe(true);
    });

    it('should delete match when undoing a like that resulted in match', async () => {
      const lastSwipe = {
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
        isLike: () => true,
      };

      const existingMatch = {
        id: 'match-123',
        user1Id: userId,
        user2Id: targetUserId,
      };

      (swipeRepository.getLastSwipe as jest.Mock).mockResolvedValue(lastSwipe);
      (matchRepository.findByUsers as jest.Mock).mockResolvedValue(existingMatch);
      (matchRepository.delete as jest.Mock).mockResolvedValue(undefined);
      (swipeRepository.deleteById as jest.Mock).mockResolvedValue(true);
      (analyticsServiceClient.trackUndoSwipe as jest.Mock).mockResolvedValue(undefined);

      const result = await swipeService.undoLastSwipe(userId);

      expect(matchRepository.findByUsers).toHaveBeenCalledWith(userId, targetUserId);
      expect(matchRepository.delete).toHaveBeenCalledWith('match-123');
      expect(swipeRepository.deleteById).toHaveBeenCalledWith('swipe-123');
      expect(result).toBe(true);
    });

    it('should return false if no swipes to undo', async () => {
      (swipeRepository.getLastSwipe as jest.Mock).mockResolvedValue(null);

      const result = await swipeService.undoLastSwipe(userId);

      expect(result).toBe(false);
      expect(swipeRepository.deleteById).not.toHaveBeenCalled();
    });

    it('should return false if delete fails', async () => {
      const lastSwipe = {
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.PASS,
        isLike: () => false,
      };

      (swipeRepository.getLastSwipe as jest.Mock).mockResolvedValue(lastSwipe);
      (swipeRepository.deleteById as jest.Mock).mockResolvedValue(false);

      const result = await swipeService.undoLastSwipe(userId);

      expect(result).toBe(false);
    });

    it('should track undo event in analytics', async () => {
      const lastSwipe = {
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
        isLike: () => true,
      };

      (swipeRepository.getLastSwipe as jest.Mock).mockResolvedValue(lastSwipe);
      (matchRepository.findByUsers as jest.Mock).mockResolvedValue(null);
      (swipeRepository.deleteById as jest.Mock).mockResolvedValue(true);
      (analyticsServiceClient.trackUndoSwipe as jest.Mock).mockResolvedValue(undefined);

      await swipeService.undoLastSwipe(userId);

      expect(analyticsServiceClient.trackUndoSwipe).toHaveBeenCalledWith({
        userId,
        targetUserId,
        previousAction: SwipeAction.LIKE,
      });
    });

    it('should throw error on repository failure', async () => {
      (swipeRepository.getLastSwipe as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(swipeService.undoLastSwipe(userId)).rejects.toThrow('Database error');
    });
  });

  describe('hasSwipedOn', () => {
    it('should return true if user has swiped on target', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(true);

      const result = await swipeService.hasSwipedOn(userId, targetUserId);

      expect(swipeRepository.hasUserSwiped).toHaveBeenCalledWith(userId, targetUserId);
      expect(result).toBe(true);
    });

    it('should return false if user has not swiped on target', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockResolvedValue(false);

      const result = await swipeService.hasSwipedOn(userId, targetUserId);

      expect(result).toBe(false);
    });

    it('should throw error on repository failure', async () => {
      (swipeRepository.hasUserSwiped as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(swipeService.hasSwipedOn(userId, targetUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });
});
