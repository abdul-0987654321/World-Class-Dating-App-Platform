import axios from 'axios';
import { Knex } from 'knex';

import { MentalHealthService } from '../domain/services/MentalHealth.service';
import {
  WellnessSettings,
  ReflectionPromptType,
  BreakTrigger,
} from '../domain/types/mental-health.types';
import { getDbConnection } from '../infrastructure/database/connection';
import logger from '../utils/logger';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

// Get internal service API key with validation
const getServiceApiKey = (): string => {
  const key = process.env.INTERNAL_SERVICE_API_KEY;
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('INTERNAL_SERVICE_API_KEY environment variable is required');
  }
  return key || 'test-internal-service-key-not-for-production';
};

const SERVICE_API_KEY = getServiceApiKey();

/**
 * Wellness Notification Service
 *
 * Handles scheduled notifications for mental health check-ins,
 * affirmations, break reminders, and distress interventions.
 */
export class WellnessNotificationService {
  private db: Knex;
  private mentalHealthService: MentalHealthService;

  constructor() {
    this.db = getDbConnection();
    this.mentalHealthService = new MentalHealthService(this.db);
  }

  /**
   * Send a check-in reminder notification
   */
  async sendCheckInReminder(userId: string, checkInType: 'daily' | 'weekly'): Promise<void> {
    const settings = await this.mentalHealthService.getOrCreateSettings(userId);

    // Check if reminders are enabled
    if (!settings.reminderNotifications) {
      return;
    }

    // Check if user is on break
    if (settings.isOnBreak) {
      return;
    }

    // Get personalized affirmation to include
    const affirmation = await this.mentalHealthService.getPersonalizedAffirmation(userId);

    const title = checkInType === 'daily' ? 'Daily Check-in Time' : 'Weekly Reflection Time';

    const body =
      checkInType === 'daily'
        ? 'Take a moment to check in with yourself. How are you feeling today?'
        : "Let's reflect on your dating journey this week. How has it been going?";

    await this.sendNotification(userId, {
      type: 'wellness_checkin_reminder',
      title,
      body,
      data: {
        checkInType,
        affirmation: affirmation?.message,
        actionUrl: '/wellness/check-in',
      },
    });

    logger.info('Check-in reminder sent', { userId, checkInType });
  }

  /**
   * Send daily affirmation notification
   */
  async sendDailyAffirmation(userId: string): Promise<void> {
    const settings = await this.mentalHealthService.getOrCreateSettings(userId);

    // Check if affirmations are enabled
    if (!settings.affirmationNotifications) {
      return;
    }

    // Check if user is on break - still send affirmations during break
    const affirmation = await this.mentalHealthService.getPersonalizedAffirmation(userId);

    if (!affirmation) {
      return;
    }

    await this.sendNotification(userId, {
      type: 'wellness_affirmation',
      title: 'Daily Affirmation',
      body: affirmation.message,
      data: {
        affirmationId: affirmation.id,
        category: affirmation.category,
      },
    });

    logger.info('Daily affirmation sent', { userId, affirmationId: affirmation.id });
  }

  /**
   * Send break ending reminder
   */
  async sendBreakEndingReminder(userId: string, daysRemaining: number): Promise<void> {
    const settings = await this.mentalHealthService.getOrCreateSettings(userId);

    if (!settings.isOnBreak || !settings.breakEndsAt) {
      return;
    }

    let title: string;
    let body: string;

    if (daysRemaining === 0) {
      title = 'Your Break Ends Today';
      body = 'Your mental health break is ending today. You can extend it if you need more time.';
    } else if (daysRemaining === 1) {
      title = 'Break Ends Tomorrow';
      body = 'Your mental health break ends tomorrow. Take a moment to reflect on how you feel.';
    } else {
      title = `${daysRemaining} Days Left on Your Break`;
      body = 'How are you feeling? We hope your break has been refreshing.';
    }

    await this.sendNotification(userId, {
      type: 'wellness_break_reminder',
      title,
      body,
      data: {
        breakEndsAt: settings.breakEndsAt.toISOString(),
        daysRemaining,
        actionUrl: '/wellness/breaks',
      },
    });

    logger.info('Break ending reminder sent', { userId, daysRemaining });
  }

  /**
   * Send break suggestion notification
   */
  async sendBreakSuggestion(userId: string): Promise<void> {
    const settings = await this.mentalHealthService.getOrCreateSettings(userId);

    // Don't suggest if already on break or suggestions disabled
    if (settings.isOnBreak || !settings.suggestBreaks) {
      return;
    }

    const suggestion = await this.mentalHealthService.suggestBreak(userId);

    if (!suggestion.suggested) {
      return;
    }

    let title: string;
    let body: string;

    switch (suggestion.urgency) {
      case 'high':
        title = 'Take Care of Yourself';
        body = "We've noticed you might benefit from a break. Your wellbeing matters most.";
        break;
      case 'medium':
        title = 'Consider a Break';
        body = 'It might be a good time to step back and recharge.';
        break;
      default:
        title = 'Break Suggestion';
        body = 'Taking breaks is healthy. Would you like to pause for a bit?';
    }

    await this.sendNotification(userId, {
      type: 'wellness_break_suggestion',
      title,
      body,
      data: {
        urgency: suggestion.urgency,
        reasons: suggestion.reasons,
        recommendedDuration: suggestion.recommendedDuration,
        actionUrl: '/wellness/breaks',
      },
    });

    logger.info('Break suggestion sent', {
      userId,
      urgency: suggestion.urgency,
      recommendedDuration: suggestion.recommendedDuration,
    });
  }

  /**
   * Send crisis resource notification
   */
  async sendCrisisResources(userId: string): Promise<void> {
    const resources = await this.mentalHealthService.getCrisisResources();

    // Get the top 2 crisis resources
    const topResources = resources.slice(0, 2);

    await this.sendNotification(userId, {
      type: 'wellness_crisis_support',
      title: "We're Here for You",
      body: "You're not alone. Here are some resources that can help.",
      data: {
        resources: topResources.map((r) => ({
          title: r.title,
          phoneNumber: r.phoneNumber,
          url: r.url,
        })),
        actionUrl: '/wellness/resources/crisis',
      },
      priority: 'high',
    });

    logger.warn('Crisis resources sent to user', { userId });
  }

  /**
   * Send post-rejection support message
   */
  async sendPostRejectionSupport(userId: string): Promise<void> {
    const settings = await this.mentalHealthService.getOrCreateSettings(userId);

    if (!settings.resourceSuggestions) {
      return;
    }

    // Get a rejection-focused affirmation
    const affirmations = await this.mentalHealthService.getAffirmations(undefined, 'rejection', 1);
    const affirmation = affirmations[0];

    await this.sendNotification(userId, {
      type: 'wellness_support',
      title: 'A Gentle Reminder',
      body:
        affirmation?.message ||
        "Every 'no' brings you closer to the right 'yes'. You're doing great.",
      data: {
        supportType: 'rejection',
        actionUrl: '/wellness/resources?category=rejection_coping',
      },
    });

    logger.info('Post-rejection support sent', { userId });
  }

  /**
   * Send welcome back message after break
   */
  async sendWelcomeBack(userId: string): Promise<void> {
    await this.sendNotification(userId, {
      type: 'wellness_welcome_back',
      title: 'Welcome Back!',
      body: 'We hope your break was refreshing. Remember, you can always take another break if needed.',
      data: {
        actionUrl: '/wellness/check-in',
      },
    });

    logger.info('Welcome back notification sent', { userId });
  }

  /**
   * Process scheduled notifications for all users
   * This should be called by a cron job
   */
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay() || 7; // Convert Sunday from 0 to 7

    // Get users who have check-ins scheduled for this time
    const usersWithReminders = await this.db('wellness_settings')
      .where('reminder_notifications', true)
      .where('is_on_break', false)
      .whereRaw("preferred_checkin_time = ? OR (preferred_checkin_time IS NULL AND ? = '20:00')", [
        `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
        '20:00',
      ]);

    for (const settings of usersWithReminders) {
      const checkinDays: number[] = settings.checkin_days || [1, 2, 3, 4, 5, 6, 7];

      // Check if today is a check-in day
      if (!checkinDays.includes(currentDay)) {
        continue;
      }

      try {
        // Determine check-in type
        const isWeekly = currentDay === 7; // Sunday for weekly
        const checkInType =
          isWeekly && settings.weekly_checkin_enabled
            ? 'weekly'
            : settings.daily_checkin_enabled
              ? 'daily'
              : null;

        if (checkInType) {
          await this.sendCheckInReminder(settings.user_id, checkInType);
        }
      } catch (error) {
        logger.error('Failed to send check-in reminder', {
          userId: settings.user_id,
          error,
        });
      }
    }

    // Process break ending reminders
    await this.processBreakReminders();

    // Send daily affirmations (at 9 AM)
    if (currentHour === 9 && currentMinute === 0) {
      await this.processDailyAffirmations();
    }

    // Process distress detection and suggestions (every 6 hours)
    if (currentHour % 6 === 0 && currentMinute === 0) {
      await this.processDistressDetection();
    }

    logger.info('Scheduled wellness notifications processed', {
      time: now.toISOString(),
    });
  }

  /**
   * Process break ending reminders
   */
  private async processBreakReminders(): Promise<void> {
    const now = new Date();

    // Find users whose breaks are ending in 0, 1, or 3 days
    const usersOnBreak = await this.db('wellness_settings')
      .where('is_on_break', true)
      .whereNotNull('break_ends_at');

    for (const settings of usersOnBreak) {
      try {
        const breakEndsAt = new Date(settings.break_ends_at);
        const daysRemaining = Math.ceil(
          (breakEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send reminder at 0, 1, and 3 days remaining
        if ([0, 1, 3].includes(daysRemaining)) {
          await this.sendBreakEndingReminder(settings.user_id, daysRemaining);
        }

        // Auto-end break if past end date
        if (daysRemaining < 0) {
          await this.mentalHealthService.endMentalHealthPause(settings.user_id);
          await this.sendWelcomeBack(settings.user_id);
        }
      } catch (error) {
        logger.error('Failed to process break reminder', {
          userId: settings.user_id,
          error,
        });
      }
    }
  }

  /**
   * Process daily affirmations for all users with enabled settings
   */
  private async processDailyAffirmations(): Promise<void> {
    const usersWithAffirmations = await this.db('wellness_settings').where(
      'affirmation_notifications',
      true
    );

    for (const settings of usersWithAffirmations) {
      try {
        await this.sendDailyAffirmation(settings.user_id);
      } catch (error) {
        logger.error('Failed to send daily affirmation', {
          userId: settings.user_id,
          error,
        });
      }
    }
  }

  /**
   * Process distress detection for users with enabled settings
   */
  private async processDistressDetection(): Promise<void> {
    const usersWithDetection = await this.db('wellness_settings')
      .where('crisis_detection_enabled', true)
      .where('is_on_break', false);

    for (const settings of usersWithDetection) {
      try {
        const indicators = await this.mentalHealthService.detectDistressSignals(settings.user_id);

        if (indicators.hasIndicators) {
          if (indicators.crisisResourcesNeeded) {
            await this.sendCrisisResources(settings.user_id);
          } else if (indicators.recommendedAction === 'break_suggested') {
            await this.sendBreakSuggestion(settings.user_id);
          }
        }
      } catch (error) {
        logger.error('Failed to process distress detection', {
          userId: settings.user_id,
          error,
        });
      }
    }
  }

  /**
   * Send notification via notification service
   */
  private async sendNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      body: string;
      data?: Record<string, any>;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<void> {
    try {
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/send`,
        {
          userId,
          type: notification.type,
          channels: ['push', 'in_app'],
          title: notification.title,
          body: notification.body,
          data: notification.data,
          priority: notification.priority || 'normal',
        },
        {
          headers: {
            'x-service-api-key': SERVICE_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      // Log but don't throw - notifications are non-critical
      logger.warn('Failed to send notification', {
        userId,
        type: notification.type,
        error: error.message,
      });
    }
  }
}

// Export singleton instance
export const wellnessNotificationService = new WellnessNotificationService();

/**
 * Cron job handler for scheduled notifications
 * Should be called every minute by a scheduler
 */
export async function runWellnessNotificationCron(): Promise<void> {
  try {
    const service = new WellnessNotificationService();
    await service.processScheduledNotifications();
  } catch (error) {
    logger.error('Wellness notification cron failed', { error });
  }
}

/**
 * Event handlers for real-time wellness triggers
 */
export const wellnessEventHandlers = {
  /**
   * Handle when a user receives a rejection (unmatch, expired match, etc.)
   */
  async onRejection(userId: string): Promise<void> {
    const service = new WellnessNotificationService();
    const mentalHealthService = new MentalHealthService(getDbConnection());

    // Record the rejection in usage metrics
    await mentalHealthService.recordUsageMetrics(userId, {
      rejectionsReceived: 1,
    });

    // Check if we should send support
    const indicators = await mentalHealthService.detectDistressSignals(userId);
    if (indicators.hasIndicators) {
      await service.sendPostRejectionSupport(userId);
    }
  },

  /**
   * Handle when a user completes a check-in with low mood
   */
  async onLowMoodCheckIn(userId: string, moodScore: number): Promise<void> {
    if (moodScore > 3) return; // Only for low mood

    const service = new WellnessNotificationService();
    const mentalHealthService = new MentalHealthService(getDbConnection());

    const indicators = await mentalHealthService.detectDistressSignals(userId);

    if (indicators.crisisResourcesNeeded) {
      await service.sendCrisisResources(userId);
    }
  },

  /**
   * Handle when a user's break ends
   */
  async onBreakEnded(userId: string): Promise<void> {
    const service = new WellnessNotificationService();
    await service.sendWelcomeBack(userId);
  },
};
