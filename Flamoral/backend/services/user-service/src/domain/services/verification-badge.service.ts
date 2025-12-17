import db from '../../infrastructure/database/connection';
import { createLogger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('verification-badge-service');

export type BadgeType =
  | 'email_verified'
  | 'phone_verified'
  | 'photo_verified'
  | 'identity_verified'
  | 'fully_verified';

/**
 * Verification Badge Service
 * Manages verification badges for users
 */
export class VerificationBadgeService {
  /**
   * Award verification badge to user
   */
  async awardBadge(userId: string, badgeType: BadgeType): Promise<void> {
    try {
      logger.info(`Awarding ${badgeType} badge to user ${userId}`);

      // Check if badge already exists
      const existingBadge = await db('user_badges')
        .where({
          user_id: userId,
          badge_type: badgeType,
        })
        .first();

      if (existingBadge) {
        // Reactivate if inactive
        if (!existingBadge.is_active) {
          await db('user_badges')
            .where({ id: existingBadge.id })
            .update({
              is_active: true,
              updated_at: new Date(),
            });
          logger.info(`Reactivated ${badgeType} badge for user ${userId}`);
        }
        return;
      }

      // Create new badge
      await db('user_badges').insert({
        id: uuidv4(),
        user_id: userId,
        badge_type: badgeType,
        earned_at: new Date(),
        is_active: true,
        created_at: new Date(),
      });

      logger.info(`Successfully awarded ${badgeType} badge to user ${userId}`);

      // Check if user should get fully_verified badge
      if (badgeType !== 'fully_verified') {
        await this.checkFullyVerifiedBadge(userId);
      }
    } catch (error: any) {
      logger.error(`Error awarding badge ${badgeType} to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Revoke verification badge from user
   */
  async revokeBadge(userId: string, badgeType: BadgeType): Promise<void> {
    try {
      logger.info(`Revoking ${badgeType} badge from user ${userId}`);

      await db('user_badges')
        .where({
          user_id: userId,
          badge_type: badgeType,
        })
        .update({
          is_active: false,
          updated_at: new Date(),
        });

      logger.info(`Successfully revoked ${badgeType} badge from user ${userId}`);

      // If revoking any verification badge, revoke fully_verified too
      if (badgeType !== 'fully_verified') {
        await this.revokeBadge(userId, 'fully_verified');
      }
    } catch (error: any) {
      logger.error(`Error revoking badge ${badgeType} from user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user qualifies for fully_verified badge
   */
  async checkFullyVerifiedBadge(userId: string): Promise<void> {
    try {
      // Get user's verification status
      const user = await db('users')
        .where({ id: userId })
        .select('is_email_verified', 'is_phone_verified', 'is_photo_verified')
        .first();

      if (!user) {
        logger.warn(`User ${userId} not found when checking fully_verified badge`);
        return;
      }

      // Check if user is fully verified (email + phone + photo)
      const isFullyVerified =
        user.is_email_verified && user.is_phone_verified && user.is_photo_verified;

      if (isFullyVerified) {
        await this.awardBadge(userId, 'fully_verified');
      } else {
        // Revoke if no longer qualified
        const existingBadge = await db('user_badges')
          .where({
            user_id: userId,
            badge_type: 'fully_verified',
            is_active: true,
          })
          .first();

        if (existingBadge) {
          await this.revokeBadge(userId, 'fully_verified');
        }
      }
    } catch (error: any) {
      logger.error(`Error checking fully_verified badge for user ${userId}:`, error);
    }
  }

  /**
   * Sync all verification badges for a user
   * Ensures badges match actual verification status
   */
  async syncVerificationBadges(userId: string): Promise<void> {
    try {
      logger.info(`Syncing verification badges for user ${userId}`);

      const user = await db('users')
        .where({ id: userId })
        .select(
          'is_email_verified',
          'is_phone_verified',
          'is_photo_verified',
          'is_identity_verified'
        )
        .first();

      if (!user) {
        logger.warn(`User ${userId} not found when syncing badges`);
        return;
      }

      // Award or revoke badges based on verification status
      const badgeMappings: Array<{ type: BadgeType; verified: boolean }> = [
        { type: 'email_verified', verified: user.is_email_verified },
        { type: 'phone_verified', verified: user.is_phone_verified },
        { type: 'photo_verified', verified: user.is_photo_verified },
        { type: 'identity_verified', verified: user.is_identity_verified },
      ];

      for (const mapping of badgeMappings) {
        if (mapping.verified) {
          await this.awardBadge(userId, mapping.type);
        } else {
          await this.revokeBadge(userId, mapping.type);
        }
      }

      // Check fully verified status
      await this.checkFullyVerifiedBadge(userId);

      logger.info(`Successfully synced verification badges for user ${userId}`);
    } catch (error: any) {
      logger.error(`Error syncing badges for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's verification badges
   */
  async getUserVerificationBadges(userId: string): Promise<
    Array<{
      badgeType: BadgeType;
      earnedAt: Date;
      isActive: boolean;
    }>
  > {
    try {
      const badges = await db('user_badges')
        .where({ user_id: userId })
        .whereIn('badge_type', [
          'email_verified',
          'phone_verified',
          'photo_verified',
          'identity_verified',
          'fully_verified',
        ])
        .select('badge_type', 'earned_at', 'is_active');

      return badges.map((badge: any) => ({
        badgeType: badge.badge_type as BadgeType,
        earnedAt: badge.earned_at,
        isActive: badge.is_active,
      }));
    } catch (error: any) {
      logger.error(`Error getting badges for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Check if user has specific verification badge
   */
  async hasBadge(userId: string, badgeType: BadgeType): Promise<boolean> {
    try {
      const badge = await db('user_badges')
        .where({
          user_id: userId,
          badge_type: badgeType,
          is_active: true,
        })
        .first();

      return !!badge;
    } catch (error: any) {
      logger.error(`Error checking badge ${badgeType} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get verification badge display info
   */
  getBadgeDisplayInfo(badgeType: BadgeType): {
    name: string;
    description: string;
    icon: string;
    color: string;
  } {
    const badgeInfo = {
      email_verified: {
        name: 'Email Verified',
        description: 'Email address has been verified',
        icon: 'mail-check',
        color: '#4CAF50',
      },
      phone_verified: {
        name: 'Phone Verified',
        description: 'Phone number has been verified',
        icon: 'phone-check',
        color: '#2196F3',
      },
      photo_verified: {
        name: 'Photo Verified',
        description: 'Identity verified through photo verification',
        icon: 'shield-check',
        color: '#FF9800',
      },
      identity_verified: {
        name: 'Identity Verified',
        description: 'Identity verified through official documents',
        icon: 'verified',
        color: '#9C27B0',
      },
      fully_verified: {
        name: 'Fully Verified',
        description: 'All verifications completed',
        icon: 'badge-check',
        color: '#E91E63',
      },
    };

    return badgeInfo[badgeType];
  }

  /**
   * Award badge when email is verified
   */
  async onEmailVerified(userId: string): Promise<void> {
    await this.awardBadge(userId, 'email_verified');
  }

  /**
   * Award badge when phone is verified
   */
  async onPhoneVerified(userId: string): Promise<void> {
    await this.awardBadge(userId, 'phone_verified');
  }

  /**
   * Award badge when photo is verified
   */
  async onPhotoVerified(userId: string): Promise<void> {
    await this.awardBadge(userId, 'photo_verified');
  }

  /**
   * Award badge when identity is verified
   */
  async onIdentityVerified(userId: string): Promise<void> {
    await this.awardBadge(userId, 'identity_verified');
  }
}

export default new VerificationBadgeService();
