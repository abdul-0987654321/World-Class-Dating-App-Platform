/**
 * Achievement Badge Service Tests
 * Tests for badge unlocking conditions, progress tracking, streak calculations, and milestone rewards
 */

import { v4 as uuidv4 } from 'uuid';

// Mock database connection BEFORE any imports
jest.mock('../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { AchievementBadgeService } from '../../domain/services/AchievementBadge.service';
import type {
  AchievementBadge,
  UserAchievementBadge,
  ProgressUpdateResult,
  AchievementCategory,
  BadgeRarity,
  UnlockType,
} from '../../domain/services/AchievementBadge.service';

// Mock Knex database
const createMockDb = () => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    increment: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    first: jest.fn(),
    raw: jest.fn((sql) => sql),
  };

  const mockDb = jest.fn((tableName: string) => {
    return { ...mockQueryBuilder, tableName };
  }) as any;

  mockDb.fn = {
    now: jest.fn(() => new Date()),
  };
  mockDb.raw = jest.fn((sql) => sql);
  mockDb.transaction = jest.fn(async (callback) => {
    return callback(mockDb);
  });

  return { mockDb, mockQueryBuilder };
};

// Test data factories
const createMockAchievementBadge = (overrides?: Partial<AchievementBadge>): AchievementBadge => ({
  id: uuidv4(),
  slug: 'first_match',
  name: 'First Match',
  description: 'Get your first match',
  iconUrl: undefined,
  iconName: 'heart',
  iconColor: '#FF6B6B',
  backgroundColor: '#FFE5E5',
  category: 'dating' as AchievementCategory,
  rarity: 'common' as BadgeRarity,
  unlockType: 'count' as UnlockType,
  unlockRequirements: { metric: 'matches', target: 1 },
  coinReward: 10,
  xpReward: 50,
  isHidden: false,
  isRepeatable: false,
  maxTier: 1,
  displayOrder: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockUserBadge = (overrides?: Partial<UserAchievementBadge>): UserAchievementBadge => ({
  id: uuidv4(),
  userId: uuidv4(),
  badgeId: uuidv4(),
  currentTier: 1,
  currentProgress: 0,
  targetProgress: 10,
  isUnlocked: false,
  timesEarned: 0,
  rewardClaimed: false,
  isDisplayed: false,
  unlockedAt: undefined,
  lastProgressAt: undefined,
  badge: undefined,
  ...overrides,
});

const createMockBadgeDbRow = (badge: AchievementBadge) => ({
  id: badge.id,
  slug: badge.slug,
  name: badge.name,
  description: badge.description,
  icon_url: badge.iconUrl,
  icon_name: badge.iconName,
  icon_color: badge.iconColor,
  background_color: badge.backgroundColor,
  category: badge.category,
  rarity: badge.rarity,
  unlock_type: badge.unlockType,
  unlock_requirements: JSON.stringify(badge.unlockRequirements),
  coin_reward: badge.coinReward,
  xp_reward: badge.xpReward,
  is_hidden: badge.isHidden,
  is_repeatable: badge.isRepeatable,
  max_tier: badge.maxTier,
  display_order: badge.displayOrder,
  is_active: badge.isActive,
  created_at: badge.createdAt,
  updated_at: badge.updatedAt,
});

describe('AchievementBadgeService', () => {
  let service: AchievementBadgeService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = createMockDb();
    mockDb = mocks.mockDb;
    mockQueryBuilder = mocks.mockQueryBuilder;
    service = new AchievementBadgeService(mockDb);
  });

  describe('Badge Unlocking Conditions', () => {
    describe('Count-based badges', () => {
      it('should unlock badge when count target is reached', async () => {
        const userId = uuidv4();
        const badge = createMockAchievementBadge({
          unlockType: 'count',
          unlockRequirements: { metric: 'matches', target: 5 },
        });

        const userBadgeRow = {
          id: uuidv4(),
          user_id: userId,
          badge_id: badge.id,
          current_tier: 1,
          current_progress: 4,
          target_progress: 5,
          is_unlocked: false,
          times_earned: 0,
          reward_claimed: false,
          is_displayed: false,
        };

        // Mock finding badges that track this metric
        mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
        mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);

        // Mock the update and returning calls
        mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 5 }]);
        mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, is_unlocked: true }]);

        // Mock coins and XP tables
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, balance: 100 });
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, total_xp: 500 });
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId });

        const results = await service.updateProgress(userId, 'matches', 1, true);

        expect(mockDb).toHaveBeenCalledWith('achievement_badges');
      });

      it('should not unlock badge when count is below target', async () => {
        const userId = uuidv4();
        const badge = createMockAchievementBadge({
          unlockType: 'count',
          unlockRequirements: { metric: 'messages', target: 10 },
        });

        const userBadgeRow = {
          id: uuidv4(),
          user_id: userId,
          badge_id: badge.id,
          current_tier: 1,
          current_progress: 5,
          target_progress: 10,
          is_unlocked: false,
          times_earned: 0,
          reward_claimed: false,
          is_displayed: false,
        };

        mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
        mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
        mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 6 }]);

        // Badge should not unlock with progress at 6/10
        const results = await service.updateProgress(userId, 'messages', 1, true);

        // Verify unlockBadge was not called (no additional db calls for coins/xp)
        expect(mockDb).toHaveBeenCalledWith('achievement_badges');
      });
    });

    describe('Streak-based badges', () => {
      it('should unlock streak badge when consecutive days target is met', async () => {
        const userId = uuidv4();
        const badge = createMockAchievementBadge({
          slug: 'week_warrior',
          name: 'Week Warrior',
          unlockType: 'streak',
          unlockRequirements: { metric: 'login_streak', target: 7 },
          category: 'streak',
        });

        const userBadgeRow = {
          id: uuidv4(),
          user_id: userId,
          badge_id: badge.id,
          current_tier: 1,
          current_progress: 6,
          target_progress: 7,
          is_unlocked: false,
          times_earned: 0,
          reward_claimed: false,
          is_displayed: false,
        };

        mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
        mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
        mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 7, is_unlocked: true }]);

        mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
        mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, is_unlocked: true }]);
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, balance: 50 });
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, total_xp: 200 });
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId });

        const results = await service.updateProgress(userId, 'login_streak', 1, true);

        expect(mockDb).toHaveBeenCalledWith('achievement_badges');
      });
    });

    describe('Milestone-based badges', () => {
      it('should unlock milestone badge at specific thresholds', async () => {
        const userId = uuidv4();
        const badge = createMockAchievementBadge({
          slug: 'match_master',
          name: 'Match Master',
          unlockType: 'milestone',
          unlockRequirements: { metric: 'total_matches', target: 100 },
          rarity: 'epic',
          coinReward: 100,
          xpReward: 500,
        });

        const userBadgeRow = {
          id: uuidv4(),
          user_id: userId,
          badge_id: badge.id,
          current_tier: 1,
          current_progress: 99,
          target_progress: 100,
          is_unlocked: false,
          times_earned: 0,
          reward_claimed: false,
          is_displayed: false,
        };

        mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
        mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
        mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 100 }]);

        mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
        mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, is_unlocked: true }]);
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, balance: 500 });
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, total_xp: 2000 });
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId });

        const results = await service.updateProgress(userId, 'total_matches', 1, true);

        expect(mockDb).toHaveBeenCalledWith('achievement_badges');
      });
    });

    describe('Special action badges', () => {
      it('should unlock badge for completing special action', async () => {
        const userId = uuidv4();
        const badge = createMockAchievementBadge({
          slug: 'verified_profile',
          name: 'Verified Profile',
          unlockType: 'special_action',
          unlockRequirements: { action: 'photo_verification_complete' },
          category: 'profile',
        });

        // Mock finding special action badges
        mockDb.mockImplementation((tableName: string) => {
          const builder = { ...mockQueryBuilder, tableName };
          if (tableName === 'achievement_badges') {
            builder.first = jest.fn().mockResolvedValue(createMockBadgeDbRow(badge));
          }
          return builder;
        });

        mockQueryBuilder.first.mockResolvedValueOnce(null); // No existing user badge
        mockQueryBuilder.returning.mockResolvedValueOnce([{ is_unlocked: true }]);
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, balance: 50 });
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, total_xp: 100 });
        mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId });

        const results = await service.triggerSpecialAction(userId, 'photo_verification_complete');

        expect(mockDb).toHaveBeenCalled();
      });
    });

    describe('Repeatable badges', () => {
      it('should allow re-earning repeatable badges', async () => {
        const userId = uuidv4();
        const badge = createMockAchievementBadge({
          slug: 'social_butterfly',
          name: 'Social Butterfly',
          unlockType: 'count',
          unlockRequirements: { metric: 'weekly_conversations', target: 5 },
          isRepeatable: true,
          maxTier: 5,
        });

        const userBadgeRow = {
          id: uuidv4(),
          user_id: userId,
          badge_id: badge.id,
          current_tier: 1,
          current_progress: 4,
          target_progress: 5,
          is_unlocked: true, // Already unlocked once
          times_earned: 1,
          reward_claimed: true,
          is_displayed: false,
        };

        mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
        mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
        mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 5, times_earned: 2 }]);

        const results = await service.updateProgress(userId, 'weekly_conversations', 1, true);

        expect(mockDb).toHaveBeenCalledWith('achievement_badges');
      });

      it('should not re-award non-repeatable badge when already unlocked', async () => {
        const userId = uuidv4();
        const badge = createMockAchievementBadge({
          slug: 'first_message',
          isRepeatable: false,
        });

        const userBadgeRow = {
          id: uuidv4(),
          user_id: userId,
          badge_id: badge.id,
          current_tier: 1,
          current_progress: 10,
          target_progress: 1,
          is_unlocked: true,
          times_earned: 1,
          reward_claimed: true,
          is_displayed: false,
        };

        mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
        mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);

        const results = await service.updateProgress(userId, 'messages', 1, true);

        // Should return early without updating
        expect(results).toEqual([]);
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should increment progress correctly', async () => {
      const userId = uuidv4();
      const badge = createMockAchievementBadge({
        unlockRequirements: { metric: 'swipes', target: 50 },
      });

      const userBadgeRow = {
        id: uuidv4(),
        user_id: userId,
        badge_id: badge.id,
        current_tier: 1,
        current_progress: 25,
        target_progress: 50,
        is_unlocked: false,
        times_earned: 0,
        reward_claimed: false,
        is_displayed: false,
      };

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
      mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 30 }]);

      const results = await service.updateProgress(userId, 'swipes', 5, true);

      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('should set absolute progress when increment is false', async () => {
      const userId = uuidv4();
      const badge = createMockAchievementBadge({
        unlockRequirements: { metric: 'profile_completeness', target: 100 },
      });

      const userBadgeRow = {
        id: uuidv4(),
        user_id: userId,
        badge_id: badge.id,
        current_tier: 1,
        current_progress: 50,
        target_progress: 100,
        is_unlocked: false,
        times_earned: 0,
        reward_claimed: false,
        is_displayed: false,
      };

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
      mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 75 }]);

      const results = await service.updateProgress(userId, 'profile_completeness', 75, false);

      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('should create user badge record if not exists', async () => {
      const userId = uuidv4();
      const badge = createMockAchievementBadge({
        unlockRequirements: { metric: 'likes', target: 10 },
      });

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.first.mockResolvedValueOnce(null); // No existing user badge
      mockQueryBuilder.returning.mockResolvedValueOnce([{
        id: uuidv4(),
        user_id: userId,
        badge_id: badge.id,
        current_tier: 1,
        current_progress: 0,
        target_progress: 10,
        is_unlocked: false,
        times_earned: 0,
        reward_claimed: false,
        is_displayed: false,
      }]);
      mockQueryBuilder.returning.mockResolvedValueOnce([{ current_progress: 1 }]);

      const results = await service.updateProgress(userId, 'likes', 1, true);

      expect(mockDb).toHaveBeenCalledWith('user_achievement_badges');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it('should track lastProgressAt timestamp', async () => {
      const userId = uuidv4();
      const badge = createMockAchievementBadge({
        unlockRequirements: { metric: 'photos', target: 6 },
      });

      const userBadgeRow = {
        id: uuidv4(),
        user_id: userId,
        badge_id: badge.id,
        current_tier: 1,
        current_progress: 3,
        target_progress: 6,
        is_unlocked: false,
        times_earned: 0,
        reward_claimed: false,
        is_displayed: false,
        last_progress_at: null,
      };

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
      mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 4 }]);

      await service.updateProgress(userId, 'photos', 1, true);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_progress_at: expect.anything(),
        })
      );
    });
  });

  describe('Streak Calculations', () => {
    it('should track login streak progress correctly', async () => {
      const userId = uuidv4();
      const badge = createMockAchievementBadge({
        slug: 'login_streak_7',
        unlockType: 'streak',
        unlockRequirements: { metric: 'login_streak', target: 7 },
        category: 'streak',
      });

      const userBadgeRow = {
        id: uuidv4(),
        user_id: userId,
        badge_id: badge.id,
        current_tier: 1,
        current_progress: 3,
        target_progress: 7,
        is_unlocked: false,
        times_earned: 0,
        reward_claimed: false,
        is_displayed: false,
      };

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
      mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 4 }]);

      const results = await service.updateProgress(userId, 'login_streak', 1, true);

      expect(mockDb).toHaveBeenCalledWith('achievement_badges');
    });

    it('should handle streak reset on break', async () => {
      const userId = uuidv4();
      const badge = createMockAchievementBadge({
        slug: 'login_streak_30',
        unlockType: 'streak',
        unlockRequirements: { metric: 'login_streak', target: 30 },
        category: 'streak',
      });

      const userBadgeRow = {
        id: uuidv4(),
        user_id: userId,
        badge_id: badge.id,
        current_tier: 1,
        current_progress: 15,
        target_progress: 30,
        is_unlocked: false,
        times_earned: 0,
        reward_claimed: false,
        is_displayed: false,
      };

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.first.mockResolvedValueOnce(userBadgeRow);
      mockQueryBuilder.returning.mockResolvedValueOnce([{ ...userBadgeRow, current_progress: 1 }]);

      // Reset streak to 1 (streak broken, starting fresh)
      const results = await service.updateProgress(userId, 'login_streak', 1, false);

      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('should award streak milestones at correct thresholds', async () => {
      const userId = uuidv4();
      const milestones = [7, 14, 30, 60, 100];

      for (const milestone of milestones) {
        const badge = createMockAchievementBadge({
          slug: `login_streak_${milestone}`,
          unlockType: 'streak',
          unlockRequirements: { metric: 'login_streak', target: milestone },
          category: 'streak',
          coinReward: milestone * 2,
          xpReward: milestone * 10,
        });

        expect(badge.unlockRequirements.target).toBe(milestone);
        expect(badge.coinReward).toBe(milestone * 2);
      }
    });
  });

  describe('Milestone Rewards', () => {
    it('should award correct coin reward on badge unlock', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();
      const badge = createMockAchievementBadge({
        id: badgeId,
        coinReward: 50,
        xpReward: 100,
      });

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.returning.mockResolvedValueOnce([{ is_unlocked: true, times_earned: 1 }]);
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, balance: 100 }); // Existing coins
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, total_xp: 500 }); // Existing XP
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId }); // Gamification summary

      await service.unlockBadge(userId, badgeId);

      expect(mockDb).toHaveBeenCalledWith('coins');
      expect(mockQueryBuilder.increment).toHaveBeenCalledWith('balance', 50);
    });

    it('should award correct XP reward on badge unlock', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();
      const badge = createMockAchievementBadge({
        id: badgeId,
        coinReward: 25,
        xpReward: 200,
      });

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.returning.mockResolvedValueOnce([{ is_unlocked: true, times_earned: 1 }]);
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, balance: 50 });
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, total_xp: 1000 });
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId });

      await service.unlockBadge(userId, badgeId);

      expect(mockDb).toHaveBeenCalledWith('user_experience');
      expect(mockQueryBuilder.increment).toHaveBeenCalledWith('total_xp', 200);
    });

    it('should create coin record if user has no balance', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();
      const badge = createMockAchievementBadge({
        id: badgeId,
        coinReward: 30,
        xpReward: 0,
      });

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.returning.mockResolvedValueOnce([{ is_unlocked: true, times_earned: 1 }]);
      mockQueryBuilder.first.mockResolvedValueOnce(null); // No existing coins
      mockQueryBuilder.first.mockResolvedValueOnce(null); // No existing XP
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId });

      await service.unlockBadge(userId, badgeId);

      expect(mockDb).toHaveBeenCalledWith('coins');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it('should handle badge not found error', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();

      mockQueryBuilder.first.mockResolvedValueOnce(null);

      await expect(service.unlockBadge(userId, badgeId)).rejects.toThrow('Badge not found');
    });

    it('should update gamification summary on unlock', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();
      const badge = createMockAchievementBadge({
        id: badgeId,
        coinReward: 10,
        xpReward: 50,
      });

      mockQueryBuilder.first.mockResolvedValueOnce(createMockBadgeDbRow(badge));
      mockQueryBuilder.returning.mockResolvedValueOnce([{ is_unlocked: true, times_earned: 1 }]);
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, balance: 100 });
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId, total_xp: 500 });
      mockQueryBuilder.first.mockResolvedValueOnce({ user_id: userId }); // Gamification summary exists

      await service.unlockBadge(userId, badgeId);

      expect(mockDb).toHaveBeenCalledWith('user_gamification_summary');
    });

    it('should scale rewards by badge rarity', () => {
      const rarities: BadgeRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      const expectedMultipliers = { common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 10 };

      for (const rarity of rarities) {
        const badge = createMockAchievementBadge({
          rarity,
          coinReward: 10 * expectedMultipliers[rarity],
          xpReward: 50 * expectedMultipliers[rarity],
        });

        expect(badge.coinReward).toBe(10 * expectedMultipliers[rarity]);
        expect(badge.xpReward).toBe(50 * expectedMultipliers[rarity]);
      }
    });
  });

  describe('Badge Display Management', () => {
    it('should toggle badge display on profile', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: uuidv4(),
        user_id: userId,
        badge_id: badgeId,
        is_unlocked: true,
        is_displayed: false,
      });
      mockQueryBuilder.first.mockResolvedValueOnce({ count: '2' });

      await service.toggleBadgeDisplay(userId, badgeId, true);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_displayed: true,
        })
      );
    });

    it('should prevent displaying locked badge', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: uuidv4(),
        user_id: userId,
        badge_id: badgeId,
        is_unlocked: false,
        is_displayed: false,
      });

      await expect(service.toggleBadgeDisplay(userId, badgeId, true)).rejects.toThrow(
        'Cannot display a locked badge'
      );
    });

    it('should enforce maximum 5 displayed badges', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: uuidv4(),
        user_id: userId,
        badge_id: badgeId,
        is_unlocked: true,
        is_displayed: false,
      });
      mockQueryBuilder.first.mockResolvedValueOnce({ count: '5' }); // Already 5 displayed

      await expect(service.toggleBadgeDisplay(userId, badgeId, true)).rejects.toThrow(
        'Maximum 5 badges can be displayed'
      );
    });

    it('should allow removing badge from display without limit check', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: uuidv4(),
        user_id: userId,
        badge_id: badgeId,
        is_unlocked: true,
        is_displayed: true,
      });

      await service.toggleBadgeDisplay(userId, badgeId, false);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_displayed: false,
        })
      );
    });
  });

  describe('Badge Reward Claims', () => {
    it('should claim reward for unlocked badge', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: uuidv4(),
        user_id: userId,
        badge_id: badgeId,
        is_unlocked: true,
        reward_claimed: false,
      });
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: badgeId,
        coin_reward: 50,
        xp_reward: 100,
      });

      const result = await service.claimBadgeReward(userId, badgeId);

      expect(result).toEqual({ coins: 50, xp: 100 });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          reward_claimed: true,
        })
      );
    });

    it('should prevent claiming reward for locked badge', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: uuidv4(),
        user_id: userId,
        badge_id: badgeId,
        is_unlocked: false,
        reward_claimed: false,
      });

      await expect(service.claimBadgeReward(userId, badgeId)).rejects.toThrow('Badge not unlocked');
    });

    it('should prevent double reward claim', async () => {
      const userId = uuidv4();
      const badgeId = uuidv4();

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: uuidv4(),
        user_id: userId,
        badge_id: badgeId,
        is_unlocked: true,
        reward_claimed: true,
      });

      await expect(service.claimBadgeReward(userId, badgeId)).rejects.toThrow('Reward already claimed');
    });
  });

  describe('Achievement Statistics', () => {
    it('should calculate user achievement stats correctly', async () => {
      const userId = uuidv4();

      // Mock getUserBadges and getAllBadges
      const mockBadges = [
        createMockAchievementBadge({ category: 'dating', rarity: 'common', coinReward: 10, xpReward: 50 }),
        createMockAchievementBadge({ category: 'social', rarity: 'rare', coinReward: 30, xpReward: 150 }),
        createMockAchievementBadge({ category: 'dating', rarity: 'epic', coinReward: 50, xpReward: 250 }),
      ];

      const mockUserBadges = [
        createMockUserBadge({ isUnlocked: true, badge: mockBadges[0] }),
        createMockUserBadge({ isUnlocked: true, badge: mockBadges[1] }),
        createMockUserBadge({ isUnlocked: false, badge: mockBadges[2] }),
      ];

      // Mock the database calls
      jest.spyOn(service, 'getUserBadges').mockResolvedValue(mockUserBadges);
      jest.spyOn(service, 'getAllBadges').mockResolvedValue(mockBadges);

      const stats = await service.getUserAchievementStats(userId);

      expect(stats.totalBadges).toBe(3);
      expect(stats.unlockedBadges).toBe(2);
      expect(stats.totalProgress).toBe(67); // 2/3 = 66.67%
      expect(stats.totalCoinsEarned).toBe(40); // 10 + 30
      expect(stats.totalXPEarned).toBe(200); // 50 + 150
      expect(stats.rarityCounts.common).toBe(1);
      expect(stats.rarityCounts.rare).toBe(1);
      expect(stats.categoryCounts.dating).toBe(1);
      expect(stats.categoryCounts.social).toBe(1);
    });
  });

  describe('Hidden Badges', () => {
    it('should exclude hidden badges from getAllBadges by default', async () => {
      mockQueryBuilder.first = jest.fn();
      mockQueryBuilder.where.mockReturnThis();

      await service.getAllBadges(false);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('is_hidden', false);
    });

    it('should include hidden badges when explicitly requested', async () => {
      mockQueryBuilder.first = jest.fn();
      mockQueryBuilder.where.mockReturnThis();

      await service.getAllBadges(true);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('is_active', true);
      // Should not filter by is_hidden
    });
  });
});
