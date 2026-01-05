import logger from '../../utils/logger';
import {
  InterestBadge,
  IntentionBadge,
  UserInterestBadgeResponse,
  UserIntentionBadgeResponse,
  UpdateUserInterestBadgesDto,
  UpdateUserIntentionBadgesDto,
  UserBadgesProfile,
  InterestBadgePopularity,
  IntentionBadgeDistribution,
} from '../entities/InterestIntentionBadge.entity';
import { InterestIntentionBadgeRepository } from '../repositories/interestIntentionBadge.repository';

export class InterestIntentionBadgeService {
  private badgeRepository: InterestIntentionBadgeRepository;

  constructor() {
    this.badgeRepository = new InterestIntentionBadgeRepository();
  }

  // ============================================
  // INTEREST BADGES - Get Available Badges
  // ============================================

  async getAllInterestBadges(): Promise<InterestBadge[]> {
    try {
      return await this.badgeRepository.getAllInterestBadges();
    } catch (error: any) {
      logger.error('Error getting all interest badges:', error);
      throw new Error('Failed to fetch interest badges');
    }
  }

  async getInterestBadgesByCategory(category: string): Promise<InterestBadge[]> {
    try {
      return await this.badgeRepository.getInterestBadgesByCategory(category);
    } catch (error: any) {
      logger.error(`Error getting interest badges for category ${category}:`, error);
      throw new Error('Failed to fetch interest badges by category');
    }
  }

  // ============================================
  // INTENTION BADGES - Get Available Badges
  // ============================================

  async getAllIntentionBadges(): Promise<IntentionBadge[]> {
    try {
      return await this.badgeRepository.getAllIntentionBadges();
    } catch (error: any) {
      logger.error('Error getting all intention badges:', error);
      throw new Error('Failed to fetch intention badges');
    }
  }

  // ============================================
  // USER BADGES - Get User's Selected Badges
  // ============================================

  async getUserBadgesProfile(userId: string): Promise<UserBadgesProfile> {
    try {
      const [interestBadges, intentionBadges] = await Promise.all([
        this.badgeRepository.getUserInterestBadges(userId),
        this.badgeRepository.getUserIntentionBadges(userId),
      ]);

      return {
        interest_badges: interestBadges,
        intention_badges: intentionBadges,
      };
    } catch (error: any) {
      logger.error(`Error getting badges profile for user ${userId}:`, error);
      throw new Error('Failed to fetch user badges profile');
    }
  }

  async getUserInterestBadges(userId: string): Promise<UserInterestBadgeResponse[]> {
    try {
      return await this.badgeRepository.getUserInterestBadges(userId);
    } catch (error: any) {
      logger.error(`Error getting interest badges for user ${userId}:`, error);
      throw new Error('Failed to fetch user interest badges');
    }
  }

  async getUserIntentionBadges(userId: string): Promise<UserIntentionBadgeResponse[]> {
    try {
      return await this.badgeRepository.getUserIntentionBadges(userId);
    } catch (error: any) {
      logger.error(`Error getting intention badges for user ${userId}:`, error);
      throw new Error('Failed to fetch user intention badges');
    }
  }

  // ============================================
  // USER BADGES - Update User's Selected Badges
  // ============================================

  async updateUserInterestBadges(
    userId: string,
    updateData: UpdateUserInterestBadgesDto
  ): Promise<UserInterestBadgeResponse[]> {
    try {
      const { badge_ids } = updateData;

      // Validate that all badge IDs exist
      const validationPromises = badge_ids.map((badgeId) =>
        this.badgeRepository.getInterestBadgeById(badgeId)
      );
      const badges = await Promise.all(validationPromises);

      const invalidBadges = badges.filter((badge) => !badge);
      if (invalidBadges.length > 0) {
        throw new Error('One or more invalid badge IDs provided');
      }

      // Set the user's badges
      await this.badgeRepository.setUserInterestBadges(userId, badge_ids);

      logger.info(`Updated interest badges for user ${userId}: ${badge_ids.length} badges`);

      // Return updated badges
      return await this.badgeRepository.getUserInterestBadges(userId);
    } catch (error: any) {
      logger.error(`Error updating interest badges for user ${userId}:`, error);
      throw new Error(error.message || 'Failed to update user interest badges');
    }
  }

  async updateUserIntentionBadges(
    userId: string,
    updateData: UpdateUserIntentionBadgesDto
  ): Promise<UserIntentionBadgeResponse[]> {
    try {
      const { badges } = updateData;

      // Validate maximum 2 badges
      if (badges.length > 2) {
        throw new Error('User can only have a maximum of 2 intention badges');
      }

      // Validate unique priorities
      const priorities = badges.map((b) => b.priority);
      const uniquePriorities = new Set(priorities);
      if (priorities.length !== uniquePriorities.size) {
        throw new Error('Each intention badge must have a unique priority (1 or 2)');
      }

      // Validate priorities are 1 or 2
      const validPriorities = badges.every((b) => b.priority === 1 || b.priority === 2);
      if (!validPriorities) {
        throw new Error('Priority must be either 1 or 2');
      }

      // Validate that all badge IDs exist
      const validationPromises = badges.map((badge) =>
        this.badgeRepository.getIntentionBadgeById(badge.badge_id)
      );
      const validBadges = await Promise.all(validationPromises);

      const invalidBadges = validBadges.filter((badge) => !badge);
      if (invalidBadges.length > 0) {
        throw new Error('One or more invalid badge IDs provided');
      }

      // Set the user's badges
      await this.badgeRepository.setUserIntentionBadges(userId, badges);

      logger.info(`Updated intention badges for user ${userId}: ${badges.length} badges`);

      // Return updated badges
      return await this.badgeRepository.getUserIntentionBadges(userId);
    } catch (error: any) {
      logger.error(`Error updating intention badges for user ${userId}:`, error);
      throw new Error(error.message || 'Failed to update user intention badges');
    }
  }

  // ============================================
  // INDIVIDUAL BADGE OPERATIONS
  // ============================================

  async addInterestBadge(userId: string, badgeId: string): Promise<void> {
    try {
      // Validate badge exists
      const badge = await this.badgeRepository.getInterestBadgeById(badgeId);
      if (!badge) {
        throw new Error('Invalid badge ID');
      }

      await this.badgeRepository.addUserInterestBadge(userId, badgeId);
      logger.info(`Added interest badge ${badgeId} for user ${userId}`);
    } catch (error: any) {
      logger.error(`Error adding interest badge for user ${userId}:`, error);
      throw new Error(error.message || 'Failed to add interest badge');
    }
  }

  async removeInterestBadge(userId: string, badgeId: string): Promise<void> {
    try {
      await this.badgeRepository.removeUserInterestBadge(userId, badgeId);
      logger.info(`Removed interest badge ${badgeId} for user ${userId}`);
    } catch (error: any) {
      logger.error(`Error removing interest badge for user ${userId}:`, error);
      throw new Error('Failed to remove interest badge');
    }
  }

  async addIntentionBadge(userId: string, badgeId: string, priority: 1 | 2): Promise<void> {
    try {
      // Validate badge exists
      const badge = await this.badgeRepository.getIntentionBadgeById(badgeId);
      if (!badge) {
        throw new Error('Invalid badge ID');
      }

      await this.badgeRepository.addUserIntentionBadge(userId, badgeId, priority);
      logger.info(`Added intention badge ${badgeId} with priority ${priority} for user ${userId}`);
    } catch (error: any) {
      logger.error(`Error adding intention badge for user ${userId}:`, error);
      throw new Error(error.message || 'Failed to add intention badge');
    }
  }

  async removeIntentionBadge(userId: string, badgeId: string): Promise<void> {
    try {
      await this.badgeRepository.removeUserIntentionBadge(userId, badgeId);
      logger.info(`Removed intention badge ${badgeId} for user ${userId}`);
    } catch (error: any) {
      logger.error(`Error removing intention badge for user ${userId}:`, error);
      throw new Error('Failed to remove intention badge');
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getInterestBadgePopularity(): Promise<InterestBadgePopularity[]> {
    try {
      return await this.badgeRepository.getInterestBadgePopularity();
    } catch (error: any) {
      logger.error('Error getting interest badge popularity:', error);
      throw new Error('Failed to fetch badge popularity statistics');
    }
  }

  async getIntentionBadgeDistribution(): Promise<IntentionBadgeDistribution[]> {
    try {
      return await this.badgeRepository.getIntentionBadgeDistribution();
    } catch (error: any) {
      logger.error('Error getting intention badge distribution:', error);
      throw new Error('Failed to fetch badge distribution statistics');
    }
  }

  // ============================================
  // MATCHING HELPERS
  // ============================================

  async calculateSharedInterests(userId1: string, userId2: string): Promise<number> {
    try {
      return await this.badgeRepository.countSharedInterestBadges(userId1, userId2);
    } catch (error: any) {
      logger.error(`Error calculating shared interests between ${userId1} and ${userId2}:`, error);
      return 0;
    }
  }

  async checkIntentionCompatibility(userId1: string, userId2: string): Promise<boolean> {
    try {
      return await this.badgeRepository.checkIntentionCompatibility(userId1, userId2);
    } catch (error: any) {
      logger.error(
        `Error checking intention compatibility between ${userId1} and ${userId2}:`,
        error
      );
      return false;
    }
  }
}
