/**
 * Unit tests for Swipe Service
 * Tests swipe processing, mutual likes, match creation, and undo functionality
 */

// Mock database connection before imports
jest.mock('../../../src/infrastructure/database/connection', () => ({
  default: {
    transaction: jest.fn((callback: (trx: any) => Promise<any>) => callback({})),
  },
  __esModule: true,
}));

// Mock swipe history repository
jest.mock('../../../src/domain/repositories/swipe-history.repository', () => ({
  default: {
    createWithTransaction: jest.fn().mockResolvedValue({ id: 'history-123' }),
    updateWithMatchInfoWithTransaction: jest.fn().mockResolvedValue(undefined),
  },
  __esModule: true,
}));

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
      (swipeRepository.createWithTransaction as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLikeWithTransaction as jest.Mock).mockResolvedValue(false);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(swipeRepository.createWithTransaction).toHaveBeenCalled();
      expect(swipeRepository.checkMutualLikeWithTransaction).toHaveBeenCalled();
      expect(result.matched).toBe(false);
      expect(result.message).toBe('Swipe recorded');
    });

    it('should create match when mutual like is detected', async () => {
      const mockMatch = {
        id: 'match-123',
        user1Id: userId,
        user2Id: targetUserId,
      };

      (swipeRepository.createWithTransaction as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLikeWithTransaction as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsersWithTransaction as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(
        new Map([
          [userId, { gender: 'male' }],
          [targetUserId, { gender: 'female' }],
        ])
      );
      (matchRepository.createWithTransaction as jest.Mock).mockResolvedValue(mockMatch);
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
    });

    it('should create match with super like when mutual', async () => {
      const mockMatch = {
        id: 'match-123',
        user1Id: userId,
        user2Id: targetUserId,
      };

      (swipeRepository.createWithTransaction as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLikeWithTransaction as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsersWithTransaction as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(new Map());
      (matchRepository.createWithTransaction as jest.Mock).mockResolvedValue(mockMatch);
      (matchRepository.getUserMatchCount as jest.Mock).mockResolvedValue(1);
      (notificationServiceClient.notifyBothUsersOfMatch as jest.Mock).mockResolvedValue(undefined);
      (analyticsServiceClient.trackMatch as jest.Mock).mockResolvedValue(undefined);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.SUPER_LIKE,
      });

      expect(result.matched).toBe(true);
      expect(swipeRepository.createWithTransaction).toHaveBeenCalled();
    });

    it('should not check for mutual like on pass action', async () => {
      (swipeRepository.createWithTransaction as jest.Mock).mockResolvedValue({ id: 'swipe-123' });

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.PASS,
      });

      expect(swipeRepository.checkMutualLikeWithTransaction).not.toHaveBeenCalled();
      expect(result.matched).toBe(false);
      expect(result.message).toBe('Swipe recorded');
    });

    it('should return early if user has already swiped on target (duplicate key)', async () => {
      const duplicateError = new Error('duplicate key value violates unique constraint');
      (duplicateError as any).code = '23505';
      (swipeRepository.createWithTransaction as jest.Mock).mockRejectedValue(duplicateError);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(result.matched).toBe(false);
      expect(result.message).toBe('You have already swiped on this user');
    });

    it('should return existing match if already matched', async () => {
      const existingMatch = {
        id: 'existing-match-123',
        user1Id: userId,
        user2Id: targetUserId,
      };

      (swipeRepository.createWithTransaction as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLikeWithTransaction as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsersWithTransaction as jest.Mock).mockResolvedValue(existingMatch);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(result.matched).toBe(true);
      expect(result.match).toEqual(existingMatch);
      expect(matchRepository.createWithTransaction).not.toHaveBeenCalled();
    });

    it('should enable women-first messaging for heterosexual matches', async () => {
      (swipeRepository.createWithTransaction as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLikeWithTransaction as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsersWithTransaction as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(
        new Map([
          [userId, { gender: 'male' }],
          [targetUserId, { gender: 'female' }],
        ])
      );
      (matchRepository.createWithTransaction as jest.Mock).mockImplementation((trx, data) => ({
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

      expect(matchRepository.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          requiresWomenFirst: true,
          womanUserId: targetUserId,
        })
      );
    });

    it('should not enable women-first messaging for same-sex matches', async () => {
      (swipeRepository.createWithTransaction as jest.Mock).mockResolvedValue({ id: 'swipe-123' });
      (swipeRepository.checkMutualLikeWithTransaction as jest.Mock).mockResolvedValue(true);
      (matchRepository.findByUsersWithTransaction as jest.Mock).mockResolvedValue(null);
      (userServiceClient.getUserProfiles as jest.Mock).mockResolvedValue(
        new Map([
          [userId, { gender: 'female' }],
          [targetUserId, { gender: 'female' }],
        ])
      );
      (matchRepository.createWithTransaction as jest.Mock).mockImplementation((trx, data) => ({
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

      expect(matchRepository.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          requiresWomenFirst: false,
        })
      );
    });

    it('should throw error on repository failure', async () => {
      (swipeRepository.createWithTransaction as jest.Mock).mockRejectedValue(
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

      (swipeRepository.getLastSwipeWithTransaction as jest.Mock).mockResolvedValue(lastSwipe);
      (swipeRepository.deleteByIdWithTransaction as jest.Mock).mockResolvedValue(true);
      (analyticsServiceClient.trackUndoSwipe as jest.Mock).mockResolvedValue(undefined);

      const result = await swipeService.undoLastSwipe(userId);

      expect(swipeRepository.getLastSwipeWithTransaction).toHaveBeenCalled();
      expect(swipeRepository.deleteByIdWithTransaction).toHaveBeenCalled();
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

      (swipeRepository.getLastSwipeWithTransaction as jest.Mock).mockResolvedValue(lastSwipe);
      (matchRepository.findByUsersWithTransaction as jest.Mock).mockResolvedValue(existingMatch);
      (matchRepository.deleteWithTransaction as jest.Mock).mockResolvedValue(undefined);
      (swipeRepository.deleteByIdWithTransaction as jest.Mock).mockResolvedValue(true);
      (analyticsServiceClient.trackUndoSwipe as jest.Mock).mockResolvedValue(undefined);

      const result = await swipeService.undoLastSwipe(userId);

      expect(matchRepository.findByUsersWithTransaction).toHaveBeenCalled();
      expect(matchRepository.deleteWithTransaction).toHaveBeenCalled();
      expect(swipeRepository.deleteByIdWithTransaction).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if no swipes to undo', async () => {
      (swipeRepository.getLastSwipeWithTransaction as jest.Mock).mockResolvedValue(null);

      const result = await swipeService.undoLastSwipe(userId);

      expect(result).toBe(false);
      expect(swipeRepository.deleteByIdWithTransaction).not.toHaveBeenCalled();
    });

    it('should return false if delete fails', async () => {
      const lastSwipe = {
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.PASS,
        isLike: () => false,
      };

      (swipeRepository.getLastSwipeWithTransaction as jest.Mock).mockResolvedValue(lastSwipe);
      (swipeRepository.deleteByIdWithTransaction as jest.Mock).mockResolvedValue(false);

      const result = await swipeService.undoLastSwipe(userId);

      expect(result).toBe(false);
    });

    it('should throw error on repository failure', async () => {
      (swipeRepository.getLastSwipeWithTransaction as jest.Mock).mockRejectedValue(new Error('Database error'));

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
