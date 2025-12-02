/**
 * Unit tests for Swipe Service
 * Tests swipe algorithm, match creation, and recommendation engine
 */

import swipeService from '../../src/domain/services/swipe.service';
import swipeRepository from '../../src/domain/repositories/swipe.repository';
import matchRepository from '../../src/domain/repositories/match.repository';
import { SwipeAction } from '../../src/types';

jest.mock('../../src/domain/repositories/swipe.repository');
jest.mock('../../src/domain/repositories/match.repository');

describe('SwipeService', () => {
  const userId = 'user-123';
  const targetUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processSwipe', () => {
    it('should create a swipe record for LIKE action', async () => {
      (swipeRepository.create as jest.Mock).mockResolvedValue({
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });
      (swipeRepository.findSwipe as jest.Mock).mockResolvedValue(null);

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(swipeRepository.create).toHaveBeenCalledWith({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });
      expect(result.matched).toBe(false);
    });

    it('should create a match when both users LIKE each other', async () => {
      // User 456 already liked user 123
      (swipeRepository.findSwipe as jest.Mock).mockResolvedValue({
        id: 'swipe-456',
        userId: targetUserId,
        targetUserId: userId,
        action: SwipeAction.LIKE,
      });
      (matchRepository.create as jest.Mock).mockResolvedValue({
        id: 'match-123',
        user1Id: userId,
        user2Id: targetUserId,
      });

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(result.matched).toBe(true);
      expect(matchRepository.create).toHaveBeenCalled();
    });

    it('should create SUPERLIKE swipe', async () => {
      (swipeRepository.create as jest.Mock).mockResolvedValue({
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.SUPERLIKE,
      });

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.SUPERLIKE,
      });

      expect(swipeRepository.create).toHaveBeenCalledWith({
        userId,
        targetUserId,
        action: SwipeAction.SUPERLIKE,
      });
    });

    it('should handle PASS action', async () => {
      (swipeRepository.create as jest.Mock).mockResolvedValue({
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.PASS,
      });

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.PASS,
      });

      expect(result.matched).toBe(false);
      expect(matchRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if already swiped', async () => {
      (swipeRepository.findSwipe as jest.Mock).mockResolvedValue({
        id: 'existing-swipe',
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      await expect(
        swipeService.processSwipe({
          userId,
          targetUserId,
          action: SwipeAction.LIKE,
        })
      ).rejects.toThrow('Already swiped on this user');
    });
  });

  describe('getUsersWhoLikedMe', () => {
    it('should return list of users who liked me', async () => {
      const likedByUsers = [
        { userId: 'user-1', action: SwipeAction.LIKE },
        { userId: 'user-2', action: SwipeAction.SUPERLIKE },
      ];

      (swipeRepository.findUsersWhoLikedMe as jest.Mock).mockResolvedValue(likedByUsers);

      const result = await swipeService.getUsersWhoLikedMe(userId);

      expect(result).toHaveLength(2);
      expect(result).toContain('user-1');
      expect(result).toContain('user-2');
    });

    it('should exclude already matched users', async () => {
      (swipeRepository.findUsersWhoLikedMe as jest.Mock).mockResolvedValue([
        { userId: 'user-1', action: SwipeAction.LIKE },
      ]);
      (matchRepository.findMatchBetweenUsers as jest.Mock).mockResolvedValue({
        id: 'match-1',
      });

      const result = await swipeService.getUsersWhoLikedMe(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSwipeStats', () => {
    it('should return swipe statistics', async () => {
      (swipeRepository.countByAction as jest.Mock)
        .mockResolvedValueOnce(50) // likes given
        .mockResolvedValueOnce(30) // likes received
        .mockResolvedValueOnce(5) // superlikes given
        .mockResolvedValueOnce(2); // superlikes received

      (matchRepository.countByUserId as jest.Mock).mockResolvedValue(10);

      const stats = await swipeService.getSwipeStats(userId);

      expect(stats).toMatchObject({
        likesGiven: 50,
        likesReceived: 30,
        superlikesGiven: 5,
        superlikesReceived: 2,
        matches: 10,
      });
    });
  });

  describe('undoLastSwipe', () => {
    it('should undo last swipe for premium users', async () => {
      const lastSwipe = {
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.PASS,
        created_at: new Date(),
      };

      (swipeRepository.getLastSwipe as jest.Mock).mockResolvedValue(lastSwipe);
      (swipeRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await swipeService.undoLastSwipe(userId);

      expect(result).toBe(true);
      expect(swipeRepository.delete).toHaveBeenCalledWith(lastSwipe.id);
    });

    it('should return false if no swipe to undo', async () => {
      (swipeRepository.getLastSwipe as jest.Mock).mockResolvedValue(null);

      const result = await swipeService.undoLastSwipe(userId);

      expect(result).toBe(false);
      expect(swipeRepository.delete).not.toHaveBeenCalled();
    });

    it('should not undo swipes older than 1 minute', async () => {
      const oldSwipe = {
        id: 'swipe-123',
        userId,
        targetUserId,
        action: SwipeAction.PASS,
        created_at: new Date(Date.now() - 120000), // 2 minutes ago
      };

      (swipeRepository.getLastSwipe as jest.Mock).mockResolvedValue(oldSwipe);

      const result = await swipeService.undoLastSwipe(userId);

      expect(result).toBe(false);
      expect(swipeRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Match Creation Logic', () => {
    it('should apply women-first messaging rule for heterosexual matches', async () => {
      const user1 = { id: userId, gender: 'male' };
      const user2 = { id: targetUserId, gender: 'female' };

      (swipeRepository.findSwipe as jest.Mock).mockResolvedValue({
        userId: targetUserId,
        targetUserId: userId,
        action: SwipeAction.LIKE,
      });
      (matchRepository.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'match-123', ...data })
      );

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

    it('should not apply women-first rule for same-gender matches', async () => {
      const user1 = { id: userId, gender: 'female' };
      const user2 = { id: targetUserId, gender: 'female' };

      (swipeRepository.findSwipe as jest.Mock).mockResolvedValue({
        userId: targetUserId,
        targetUserId: userId,
        action: SwipeAction.LIKE,
      });
      (matchRepository.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'match-123', ...data })
      );

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

    it('should set match expiration for matches', async () => {
      (swipeRepository.findSwipe as jest.Mock).mockResolvedValue({
        userId: targetUserId,
        targetUserId: userId,
        action: SwipeAction.LIKE,
      });
      (matchRepository.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'match-123', ...data })
      );

      await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      expect(matchRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
        })
      );

      const createCall = (matchRepository.create as jest.Mock).mock.calls[0][0];
      const expiryTime = createCall.expiresAt.getTime() - Date.now();

      // Should expire in approximately 24 hours
      expect(expiryTime).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(expiryTime).toBeLessThan(25 * 60 * 60 * 1000);
    });
  });
});
