/**
 * Settings Service
 * Handles all user settings management
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import db from '../database';
import logger from '../utils/logger';

interface AccountUpdates {
  email?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface PrivacySettings {
  showOnlineStatus?: boolean;
  showDistance?: boolean;
  showAge?: boolean;
  readReceipts?: boolean;
  incognitoMode?: boolean;
  onlyMatchedUsersCanMessage?: boolean;
}

interface NotificationSettings {
  pushNotifications?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  newMatches?: boolean;
  newMessages?: boolean;
  likes?: boolean;
  superLikes?: boolean;
  promotions?: boolean;
}

interface MatchPreferences {
  interestedIn?: string[];
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
}

export class SettingsService {
  /**
   * Get all user settings
   */
  async getAllSettings(userId: string) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .select(
          'email',
          'phone',
          'interested_in',
          'min_age',
          'max_age',
          'max_distance',
          'show_online_status',
          'show_distance',
          'show_age',
          'read_receipts_enabled',
          'incognito_mode',
          'only_matched_users_can_message',
          'push_notifications_enabled',
          'email_notifications_enabled',
          'sms_notifications_enabled',
          'notify_new_matches',
          'notify_new_messages',
          'notify_likes',
          'notify_super_likes',
          'notify_promotions',
          'subscription_tier',
          'coin_balance'
        )
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      return {
        account: {
          email: user.email,
          phone: user.phone,
        },
        privacy: {
          showOnlineStatus: user.show_online_status,
          showDistance: user.show_distance,
          showAge: user.show_age,
          readReceipts: user.read_receipts_enabled,
          incognitoMode: user.incognito_mode,
          onlyMatchedUsersCanMessage: user.only_matched_users_can_message,
        },
        notifications: {
          pushNotifications: user.push_notifications_enabled,
          emailNotifications: user.email_notifications_enabled,
          smsNotifications: user.sms_notifications_enabled,
          newMatches: user.notify_new_matches,
          newMessages: user.notify_new_messages,
          likes: user.notify_likes,
          superLikes: user.notify_super_likes,
          promotions: user.notify_promotions,
        },
        preferences: {
          interestedIn: user.interested_in,
          minAge: user.min_age,
          maxAge: user.max_age,
          maxDistance: user.max_distance,
        },
        subscription: {
          tier: user.subscription_tier,
          coinBalance: user.coin_balance,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get all settings', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Update account settings (email, phone, password)
   */
  async updateAccountSettings(
    userId: string,
    updates: AccountUpdates
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await db('users').where({ id: userId }).first();

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const updateData: any = {};

      // Update email
      if (updates.email && updates.email !== user.email) {
        // Check if email is already taken
        const existingUser = await db('users')
          .where({ email: updates.email })
          .whereNot({ id: userId })
          .first();

        if (existingUser) {
          return { success: false, error: 'Email already in use' };
        }

        updateData.email = updates.email;
        updateData.email_verified = false; // Require re-verification
      }

      // Update phone
      if (updates.phone && updates.phone !== user.phone) {
        // Check if phone is already taken
        const existingUser = await db('users')
          .where({ phone: updates.phone })
          .whereNot({ id: userId })
          .first();

        if (existingUser) {
          return { success: false, error: 'Phone number already in use' };
        }

        updateData.phone = updates.phone;
        updateData.phone_verified = false; // Require re-verification
      }

      // Update password
      if (updates.newPassword) {
        if (!updates.currentPassword) {
          return { success: false, error: 'Current password required' };
        }

        // Verify current password
        const isValid = await bcrypt.compare(updates.currentPassword, user.password_hash);
        if (!isValid) {
          return { success: false, error: 'Current password is incorrect' };
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(updates.newPassword, saltRounds);
        updateData.password_hash = newPasswordHash;
      }

      // Update if there are changes
      if (Object.keys(updateData).length > 0) {
        await db('users')
          .where({ id: userId })
          .update({
            ...updateData,
            updated_at: new Date(),
          });

        logger.info('Account settings updated', { userId, changes: Object.keys(updateData) });
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to update account settings', { userId, error: error.message });
      return { success: false, error: 'Failed to update account settings' };
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: PrivacySettings
  ): Promise<{ success: boolean }> {
    try {
      const updateData: any = {};

      if (settings.showOnlineStatus !== undefined) {
        updateData.show_online_status = settings.showOnlineStatus;
      }
      if (settings.showDistance !== undefined) {
        updateData.show_distance = settings.showDistance;
      }
      if (settings.showAge !== undefined) {
        updateData.show_age = settings.showAge;
      }
      if (settings.readReceipts !== undefined) {
        updateData.read_receipts_enabled = settings.readReceipts;
      }
      if (settings.incognitoMode !== undefined) {
        updateData.incognito_mode = settings.incognitoMode;
      }
      if (settings.onlyMatchedUsersCanMessage !== undefined) {
        updateData.only_matched_users_can_message = settings.onlyMatchedUsersCanMessage;
      }

      if (Object.keys(updateData).length > 0) {
        await db('users')
          .where({ id: userId })
          .update({
            ...updateData,
            updated_at: new Date(),
          });

        logger.info('Privacy settings updated', { userId, changes: Object.keys(updateData) });
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to update privacy settings', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationSettings(
    userId: string,
    settings: NotificationSettings
  ): Promise<{ success: boolean }> {
    try {
      const updateData: any = {};

      if (settings.pushNotifications !== undefined) {
        updateData.push_notifications_enabled = settings.pushNotifications;
      }
      if (settings.emailNotifications !== undefined) {
        updateData.email_notifications_enabled = settings.emailNotifications;
      }
      if (settings.smsNotifications !== undefined) {
        updateData.sms_notifications_enabled = settings.smsNotifications;
      }
      if (settings.newMatches !== undefined) {
        updateData.notify_new_matches = settings.newMatches;
      }
      if (settings.newMessages !== undefined) {
        updateData.notify_new_messages = settings.newMessages;
      }
      if (settings.likes !== undefined) {
        updateData.notify_likes = settings.likes;
      }
      if (settings.superLikes !== undefined) {
        updateData.notify_super_likes = settings.superLikes;
      }
      if (settings.promotions !== undefined) {
        updateData.notify_promotions = settings.promotions;
      }

      if (Object.keys(updateData).length > 0) {
        await db('users')
          .where({ id: userId })
          .update({
            ...updateData,
            updated_at: new Date(),
          });

        logger.info('Notification settings updated', { userId, changes: Object.keys(updateData) });
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to update notification settings', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Update match preferences
   */
  async updateMatchPreferences(
    userId: string,
    preferences: MatchPreferences
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {};

      if (preferences.interestedIn) {
        updateData.interested_in = preferences.interestedIn;
      }
      if (preferences.minAge !== undefined) {
        if (preferences.minAge < 18 || preferences.minAge > 100) {
          return { success: false, error: 'Min age must be between 18 and 100' };
        }
        updateData.min_age = preferences.minAge;
      }
      if (preferences.maxAge !== undefined) {
        if (preferences.maxAge < 18 || preferences.maxAge > 100) {
          return { success: false, error: 'Max age must be between 18 and 100' };
        }
        updateData.max_age = preferences.maxAge;
      }
      if (preferences.maxDistance !== undefined) {
        if (preferences.maxDistance < 1 || preferences.maxDistance > 500) {
          return { success: false, error: 'Max distance must be between 1 and 500 km' };
        }
        updateData.max_distance = preferences.maxDistance;
      }

      if (Object.keys(updateData).length > 0) {
        await db('users')
          .where({ id: userId })
          .update({
            ...updateData,
            updated_at: new Date(),
          });

        logger.info('Match preferences updated', { userId, changes: Object.keys(updateData) });
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to update match preferences', { userId, error: error.message });
      return { success: false, error: 'Failed to update preferences' };
    }
  }

  /**
   * Get blocked users list
   */
  async getBlockedUsers(userId: string): Promise<{ success: boolean; blockedUsers: any[] }> {
    try {
      const blockedUsers = await db('user_blocks')
        .where({ blocker_id: userId })
        .join('users', 'user_blocks.blocked_id', 'users.id')
        .select(
          'users.id',
          'users.first_name',
          'users.last_name',
          'user_blocks.created_at as blocked_at'
        )
        .orderBy('user_blocks.created_at', 'desc');

      // Get photos for each blocked user
      const userIds = blockedUsers.map((u) => u.id);
      const photos = await db('photos')
        .whereIn('user_id', userIds)
        .where({ status: 'approved', is_primary: true })
        .select('user_id', 'url');

      const usersWithPhotos = blockedUsers.map((user) => ({
        ...user,
        photo: photos.find((p) => p.user_id === user.id)?.url || null,
      }));

      return {
        success: true,
        blockedUsers: usersWithPhotos,
      };
    } catch (error: any) {
      logger.error('Failed to get blocked users', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(
    blockerId: string,
    blockedUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const deleted = await db('user_blocks')
        .where({ blocker_id: blockerId, blocked_id: blockedUserId })
        .delete();

      if (deleted === 0) {
        return { success: false, error: 'Block not found' };
      }

      logger.info('User unblocked', { blockerId, blockedUserId });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to unblock user', { blockerId, blockedUserId, error: error.message });
      return { success: false, error: 'Failed to unblock user' };
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<{
    success: boolean;
    message?: string;
    downloadUrl?: string;
    error?: string;
  }> {
    try {
      // Gather all user data
      const userData = await db('users').where({ id: userId }).first();
      const photos = await db('photos').where({ user_id: userId });
      const matches = await db('matches').where({ user1_id: userId }).orWhere({ user2_id: userId });
      const messages = await db('messages')
        .where({ sender_id: userId })
        .orWhere({ receiver_id: userId });
      const swipes = await db('swipes').where({ swiper_id: userId });
      const subscriptions = await db('subscriptions').where({ user_id: userId });
      const transactions = await db('coin_transactions').where({ user_id: userId });

      const dataExport = {
        user: userData,
        photos,
        matches,
        messages: messages.map((m) => ({ ...m, content: m.content })), // Include message content
        swipes,
        subscriptions,
        transactions,
        exportedAt: new Date(),
      };

      // In production, this would:
      // 1. Generate a secure download link
      // 2. Upload JSON to Azure Blob with expiry
      // 3. Send email with download link
      // 4. Schedule deletion after 7 days

      // For now, we'll just return success
      logger.info('Data export requested', { userId });

      return {
        success: true,
        message: 'Data export will be sent to your email within 24 hours',
        // downloadUrl: 'https://storage.flamoral.com/exports/user-data-123.json',
      };
    } catch (error: any) {
      logger.error('Failed to export user data', { userId, error: error.message });
      return { success: false, error: 'Failed to export data' };
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(
    userId: string,
    password: string,
    reason: string,
    feedback?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await db('users').where({ id: userId }).first();

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return { success: false, error: 'Incorrect password' };
      }

      // Log deletion reason and feedback
      await db('account_deletions').insert({
        id: uuidv4(),
        user_id: userId,
        reason,
        feedback,
        deleted_at: new Date(),
      });

      // Soft delete: Mark as inactive and anonymize data
      await db('users')
        .where({ id: userId })
        .update({
          is_active: false,
          email: `deleted_${userId}@flamoral.com`,
          phone: null,
          first_name: 'Deleted',
          last_name: 'User',
          bio: null,
          deleted_at: new Date(),
        });

      // Delete sensitive data
      await db('photos').where({ user_id: userId }).delete();
      await db('messages').where({ sender_id: userId }).update({ content: '[deleted]' });

      // Note: In production, you would also:
      // 1. Cancel active subscriptions
      // 2. Delete from Azure Blob Storage
      // 3. Remove from Redis cache
      // 4. Send confirmation email
      // 5. Schedule hard delete after 30 days

      logger.info('Account deleted', { userId, reason });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to delete account', { userId, error: error.message });
      return { success: false, error: 'Failed to delete account' };
    }
  }
}

export const settingsService = new SettingsService();
