/**
 * Quiet Hours Service
 * Handles user quiet hours preferences and timezone-aware scheduling
 */

import { db } from '../config/database';
import logger from '../utils/logger';
import { NotificationPreferences } from '../types';

export interface QuietHoursCheck {
  isQuietHours: boolean;
  nextAvailableTime?: Date;
  reason?: string;
}

export class QuietHoursService {
  /**
   * Check if current time is within user's quiet hours
   */
  async isQuietHours(userId: string): Promise<QuietHoursCheck> {
    try {
      // Get user's notification preferences
      const prefs = await db('notification_preferences')
        .where({ user_id: userId })
        .first();

      if (!prefs) {
        return {
          isQuietHours: false,
        };
      }

      // Check if quiet hours are enabled
      if (!prefs.quiet_hours_enabled) {
        return {
          isQuietHours: false,
        };
      }

      // Get user's timezone (default to UTC if not set)
      const timezone = prefs.timezone || 'UTC';

      // Get current time in user's timezone
      const now = new Date();
      const userTime = this.convertToUserTimezone(now, timezone);

      // Parse quiet hours start and end times (format: "HH:MM")
      const quietStart = prefs.quiet_hours_start || '22:00';
      const quietEnd = prefs.quiet_hours_end || '08:00';

      const isInQuietHours = this.isTimeInRange(
        userTime,
        quietStart,
        quietEnd
      );

      if (isInQuietHours) {
        const nextAvailable = this.calculateNextAvailableTime(
          userTime,
          quietEnd,
          timezone
        );

        return {
          isQuietHours: true,
          nextAvailableTime: nextAvailable,
          reason: `User is in quiet hours (${quietStart} - ${quietEnd} ${timezone})`,
        };
      }

      return {
        isQuietHours: false,
      };
    } catch (error: any) {
      logger.error('Failed to check quiet hours', {
        error: error.message,
        userId,
      });

      // Default to allowing notifications if there's an error
      return {
        isQuietHours: false,
      };
    }
  }

  /**
   * Check if notification should be sent or scheduled
   */
  async shouldSendNow(
    userId: string,
    notificationType?: string
  ): Promise<{
    shouldSend: boolean;
    scheduleFor?: Date;
    reason?: string;
  }> {
    // Check for urgent notification types that bypass quiet hours
    const urgentTypes = ['video_call_incoming', 'security_alert', 'payment_failed'];

    if (notificationType && urgentTypes.includes(notificationType)) {
      return {
        shouldSend: true,
        reason: 'Urgent notification bypasses quiet hours',
      };
    }

    const quietHoursCheck = await this.isQuietHours(userId);

    if (quietHoursCheck.isQuietHours) {
      return {
        shouldSend: false,
        scheduleFor: quietHoursCheck.nextAvailableTime,
        reason: quietHoursCheck.reason,
      };
    }

    return {
      shouldSend: true,
    };
  }

  /**
   * Batch check quiet hours for multiple users
   */
  async batchCheckQuietHours(userIds: string[]): Promise<Map<string, QuietHoursCheck>> {
    const results = new Map<string, QuietHoursCheck>();

    // Get all preferences in one query
    const allPrefs = await db('notification_preferences')
      .whereIn('user_id', userIds)
      .where({ quiet_hours_enabled: true });

    const prefsMap = new Map(allPrefs.map(p => [p.user_id, p]));

    for (const userId of userIds) {
      const prefs = prefsMap.get(userId);

      if (!prefs) {
        results.set(userId, { isQuietHours: false });
        continue;
      }

      const timezone = prefs.timezone || 'UTC';
      const now = new Date();
      const userTime = this.convertToUserTimezone(now, timezone);

      const quietStart = prefs.quiet_hours_start || '22:00';
      const quietEnd = prefs.quiet_hours_end || '08:00';

      const isInQuietHours = this.isTimeInRange(userTime, quietStart, quietEnd);

      if (isInQuietHours) {
        const nextAvailable = this.calculateNextAvailableTime(
          userTime,
          quietEnd,
          timezone
        );

        results.set(userId, {
          isQuietHours: true,
          nextAvailableTime: nextAvailable,
          reason: `User is in quiet hours (${quietStart} - ${quietEnd} ${timezone})`,
        });
      } else {
        results.set(userId, { isQuietHours: false });
      }
    }

    // Users without preferences
    for (const userId of userIds) {
      if (!results.has(userId)) {
        results.set(userId, { isQuietHours: false });
      }
    }

    return results;
  }

  /**
   * Convert UTC time to user's timezone
   */
  private convertToUserTimezone(date: Date, timezone: string): Date {
    try {
      // Get time string in user's timezone
      const timeString = date.toLocaleString('en-US', {
        timeZone: timezone,
        hour12: false,
      });

      return new Date(timeString);
    } catch (error) {
      logger.warn('Invalid timezone, using UTC', { timezone });
      return date;
    }
  }

  /**
   * Check if time is within quiet hours range
   */
  private isTimeInRange(
    currentTime: Date,
    startTime: string,
    endTime: string
  ): boolean {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle case where quiet hours span midnight
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Calculate next available time after quiet hours
   */
  private calculateNextAvailableTime(
    currentTime: Date,
    endTime: string,
    timezone: string
  ): Date {
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const nextAvailable = new Date(currentTime);
    nextAvailable.setHours(endHour, endMinute, 0, 0);

    // If end time is before current time, it means quiet hours end tomorrow
    if (nextAvailable <= currentTime) {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }

    // Convert back to UTC
    try {
      const utcTimeString = nextAvailable.toLocaleString('en-US', {
        timeZone: 'UTC',
        hour12: false,
      });
      return new Date(utcTimeString);
    } catch (error) {
      return nextAvailable;
    }
  }

  /**
   * Get optimal send time for a user (considering quiet hours)
   */
  async getOptimalSendTime(
    userId: string,
    preferredTime?: Date
  ): Promise<Date> {
    const checkTime = preferredTime || new Date();

    const prefs = await db('notification_preferences')
      .where({ user_id: userId })
      .first();

    if (!prefs || !prefs.quiet_hours_enabled) {
      return checkTime;
    }

    const timezone = prefs.timezone || 'UTC';
    const userTime = this.convertToUserTimezone(checkTime, timezone);

    const quietStart = prefs.quiet_hours_start || '22:00';
    const quietEnd = prefs.quiet_hours_end || '08:00';

    const isInQuietHours = this.isTimeInRange(userTime, quietStart, quietEnd);

    if (isInQuietHours) {
      return this.calculateNextAvailableTime(userTime, quietEnd, timezone);
    }

    return checkTime;
  }

  /**
   * Update user's quiet hours preferences
   */
  async updateQuietHours(
    userId: string,
    preferences: {
      quietHoursEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      timezone?: string;
    }
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Validate time format
      if (preferences.quietHoursStart) {
        if (!this.isValidTimeFormat(preferences.quietHoursStart)) {
          return {
            success: false,
            error: 'Invalid quietHoursStart format. Use HH:MM (24-hour format)',
          };
        }
      }

      if (preferences.quietHoursEnd) {
        if (!this.isValidTimeFormat(preferences.quietHoursEnd)) {
          return {
            success: false,
            error: 'Invalid quietHoursEnd format. Use HH:MM (24-hour format)',
          };
        }
      }

      // Validate timezone
      if (preferences.timezone) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: preferences.timezone });
        } catch (error) {
          return {
            success: false,
            error: 'Invalid timezone',
          };
        }
      }

      const updateData: any = {
        updated_at: new Date(),
      };

      if (preferences.quietHoursEnabled !== undefined) {
        updateData.quiet_hours_enabled = preferences.quietHoursEnabled;
      }
      if (preferences.quietHoursStart) {
        updateData.quiet_hours_start = preferences.quietHoursStart;
      }
      if (preferences.quietHoursEnd) {
        updateData.quiet_hours_end = preferences.quietHoursEnd;
      }
      if (preferences.timezone) {
        updateData.timezone = preferences.timezone;
      }

      // Check if preferences exist
      const existing = await db('notification_preferences')
        .where({ user_id: userId })
        .first();

      if (existing) {
        await db('notification_preferences')
          .where({ user_id: userId })
          .update(updateData);
      } else {
        await db('notification_preferences').insert({
          user_id: userId,
          ...updateData,
        });
      }

      logger.info('Updated quiet hours preferences', {
        userId,
        preferences,
      });

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error('Failed to update quiet hours preferences', {
        error: error.message,
        userId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  }

  /**
   * Get user's local time
   */
  async getUserLocalTime(userId: string): Promise<{
    localTime: Date;
    timezone: string;
  }> {
    const prefs = await db('notification_preferences')
      .where({ user_id: userId })
      .first();

    const timezone = prefs?.timezone || 'UTC';
    const localTime = this.convertToUserTimezone(new Date(), timezone);

    return {
      localTime,
      timezone,
    };
  }
}

export const quietHoursService = new QuietHoursService();
