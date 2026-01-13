/**
 * Date Reminder Service
 * Manages reminders for scheduled dates and sends notifications
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config';
import { calendarConfig } from '../../config/calendar.config';
import { postgresClient } from '../../infrastructure/database/postgres-client';
import { DateReminder, ScheduledDate, ReminderTiming } from '../../types/calendar.types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('date-reminder-service');

/**
 * Notification payload for date reminders
 */
interface DateReminderNotification {
  userId: string;
  type: 'date_reminder';
  title: string;
  body: string;
  data: {
    scheduledDateId: string;
    scheduledAt: string;
    venueId?: string;
    venueName?: string;
    minutesUntil: number;
  };
  channel: 'push';
}

/**
 * Date Reminder Service
 */
export class DateReminderService {
  private reminderCheckInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  /**
   * Initialize database connection
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!postgresClient.isInitialized()) {
        await postgresClient.initialize();
      }

      this.initialized = true;
      logger.info('DateReminderService initialized');
    } catch (error) {
      logger.error('Failed to initialize DateReminderService:', error);
      throw error;
    }
  }

  /**
   * Start the reminder processing loop
   * Should be called on service startup
   */
  startReminderProcessor(intervalMs: number = 60000): void {
    if (this.reminderCheckInterval) {
      logger.warn('Reminder processor already running');
      return;
    }

    logger.info(`Starting reminder processor with ${intervalMs}ms interval`);

    // Process reminders immediately on start
    this.processReminders().catch((error) => {
      logger.error('Error in initial reminder processing:', error);
    });

    // Set up interval for continuous processing
    this.reminderCheckInterval = setInterval(() => {
      this.processReminders().catch((error) => {
        logger.error('Error in reminder processing:', error);
      });
    }, intervalMs);
  }

  /**
   * Stop the reminder processing loop
   */
  stopReminderProcessor(): void {
    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval);
      this.reminderCheckInterval = null;
      logger.info('Reminder processor stopped');
    }
  }

  /**
   * Create reminders for a scheduled date
   */
  async createReminders(
    scheduledDate: ScheduledDate,
    timings?: ReminderTiming[]
  ): Promise<DateReminder[]> {
    await this.ensureInitialized();

    const reminderTimings =
      timings || calendarConfig.reminders.defaultTimings.map((t) => t as ReminderTiming);
    const scheduledAt = new Date(scheduledDate.scheduledAt);
    const now = new Date();
    const createdReminders: DateReminder[] = [];

    // Create reminders for each participant
    for (const userId of scheduledDate.participantIds) {
      for (const timing of reminderTimings) {
        const reminderAt = new Date(scheduledAt.getTime() - timing * 60 * 1000);

        // Skip if reminder time has already passed
        if (reminderAt <= now) {
          logger.debug(`Skipping past reminder for user ${userId} at ${reminderAt}`);
          continue;
        }

        // Check if we've hit the max reminders limit
        const existingReminders = await this.getRemindersForDate(scheduledDate.id, userId);
        if (existingReminders.length >= calendarConfig.reminders.maxRemindersPerDate) {
          logger.warn(`Max reminders reached for date ${scheduledDate.id}, user ${userId}`);
          continue;
        }

        const reminderId = uuidv4();

        await postgresClient.dateReminders().insert({
          id: reminderId,
          scheduled_date_id: scheduledDate.id,
          user_id: userId,
          reminder_at: reminderAt,
          timing_minutes: timing,
          sent: false,
          created_at: now,
        });

        const reminder: DateReminder = {
          id: reminderId,
          scheduledDateId: scheduledDate.id,
          userId,
          reminderAt,
          timingMinutes: timing,
          sent: false,
          createdAt: now,
        };

        createdReminders.push(reminder);
        logger.info(`Created reminder ${reminder.id} for ${timing} minutes before date`);
      }
    }

    // Update scheduled date with reminder IDs
    if (createdReminders.length > 0) {
      const reminderIds = createdReminders.map((r) => r.id);
      await postgresClient.scheduledDates()
        .where({ id: scheduledDate.id })
        .update({
          reminder_ids: reminderIds,
        });
    }

    return createdReminders;
  }

  /**
   * Get reminders for a scheduled date and user
   */
  async getRemindersForDate(scheduledDateId: string, userId?: string): Promise<DateReminder[]> {
    await this.ensureInitialized();

    let query = postgresClient.dateReminders()
      .where({ scheduled_date_id: scheduledDateId });

    if (userId) {
      query = query.andWhere({ user_id: userId });
    }

    const rows = await query.orderBy('reminder_at', 'asc');

    return rows.map((row: any) => this.mapRowToReminder(row));
  }

  /**
   * Map database row to DateReminder object
   */
  private mapRowToReminder(row: any): DateReminder {
    return {
      id: row.id,
      scheduledDateId: row.scheduled_date_id,
      userId: row.user_id,
      reminderAt: new Date(row.reminder_at),
      timingMinutes: row.timing_minutes,
      sent: row.sent,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      notificationId: row.notification_id,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Delete reminders for a scheduled date
   */
  async deleteRemindersForDate(scheduledDateId: string): Promise<void> {
    await this.ensureInitialized();

    const deleted = await postgresClient.dateReminders()
      .where({ scheduled_date_id: scheduledDateId })
      .delete();

    logger.info(`Deleted ${deleted} reminders for scheduled date ${scheduledDateId}`);
  }

  /**
   * Process pending reminders and send notifications
   */
  async processReminders(): Promise<void> {
    await this.ensureInitialized();

    const now = new Date();
    const lookAhead = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes ahead
    const pastCutoff = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    // Find reminders due to be sent
    const dueReminders = await postgresClient.dateReminders()
      .where('sent', false)
      .where('reminder_at', '<=', lookAhead)
      .where('reminder_at', '>', pastCutoff)
      .orderBy('reminder_at', 'asc');

    if (dueReminders.length === 0) {
      return;
    }

    logger.info(`Processing ${dueReminders.length} due reminders`);

    // Process each reminder
    for (const row of dueReminders) {
      try {
        const reminder = this.mapRowToReminder(row);
        await this.sendReminder(reminder);
      } catch (error) {
        logger.error(`Failed to send reminder ${row.id}:`, error);
      }
    }
  }

  /**
   * Send a specific reminder
   */
  async sendReminder(reminder: DateReminder): Promise<void> {
    await this.ensureInitialized();

    if (reminder.sent) {
      logger.debug(`Reminder ${reminder.id} already sent, skipping`);
      return;
    }

    logger.info(`Sending reminder ${reminder.id} to user ${reminder.userId}`);

    // Get the scheduled date details
    const scheduledDate = await this.getScheduledDateById(reminder.scheduledDateId);
    if (!scheduledDate) {
      logger.warn(
        `Scheduled date ${reminder.scheduledDateId} not found for reminder ${reminder.id}`
      );
      // Mark as sent to prevent retries
      await this.markReminderSent(reminder);
      return;
    }

    // Skip if date was cancelled
    if (scheduledDate.status === 'cancelled') {
      logger.info(`Skipping reminder for cancelled date ${scheduledDate.id}`);
      await this.markReminderSent(reminder);
      return;
    }

    // Build notification message
    const minutesUntil = reminder.timingMinutes;
    const timeDescription = this.formatTimeUntil(minutesUntil);
    const venueName = scheduledDate.venue?.name;

    const notification: DateReminderNotification = {
      userId: reminder.userId,
      type: 'date_reminder',
      title: 'Date Reminder',
      body: venueName
        ? `Your date at ${venueName} is ${timeDescription}!`
        : `Your date is ${timeDescription}!`,
      data: {
        scheduledDateId: scheduledDate.id,
        scheduledAt: scheduledDate.scheduledAt.toString(),
        venueId: scheduledDate.venue?.id,
        venueName: scheduledDate.venue?.name,
        minutesUntil,
      },
      channel: 'push',
    };

    // Send notification via notification service
    try {
      const notificationResult = await this.sendNotification(notification);
      reminder.notificationId = notificationResult?.notificationId;
    } catch (error) {
      logger.error(`Failed to send notification for reminder ${reminder.id}:`, error);
      // Still mark as sent to prevent spam on retry
    }

    // Mark reminder as sent
    await this.markReminderSent(reminder);

    logger.info(`Sent reminder ${reminder.id}`);
  }

  /**
   * Mark a reminder as sent
   */
  private async markReminderSent(reminder: DateReminder): Promise<void> {
    const now = new Date();

    await postgresClient.dateReminders()
      .where({ id: reminder.id })
      .update({
        sent: true,
        sent_at: now,
        notification_id: reminder.notificationId,
      });

    reminder.sent = true;
    reminder.sentAt = now;
  }

  /**
   * Get scheduled date by ID
   */
  private async getScheduledDateById(scheduledDateId: string): Promise<ScheduledDate | null> {
    const row = await postgresClient.scheduledDates()
      .where({ id: scheduledDateId })
      .first();

    if (!row) return null;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      proposalId: row.proposal_id,
      participantIds: row.participant_ids,
      scheduledAt: new Date(row.scheduled_at),
      timezone: row.timezone,
      duration: row.duration,
      venue: row.venue ? (typeof row.venue === 'string' ? JSON.parse(row.venue) : row.venue) : undefined,
      notes: row.notes,
      status: row.status,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason,
      calendarEventIds: row.calendar_event_ids
        ? (typeof row.calendar_event_ids === 'string' ? JSON.parse(row.calendar_event_ids) : row.calendar_event_ids)
        : undefined,
      reminderIds: row.reminder_ids,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Format minutes until event for human-readable display
   */
  private formatTimeUntil(minutes: number): string {
    if (minutes < 60) {
      return `in ${minutes} minutes`;
    } else if (minutes < 120) {
      return 'in 1 hour';
    } else if (minutes < 1440) {
      return `in ${Math.round(minutes / 60)} hours`;
    } else if (minutes < 2880) {
      return 'tomorrow';
    } else {
      return `in ${Math.round(minutes / 1440)} days`;
    }
  }

  /**
   * Send notification to notification service
   */
  private async sendNotification(
    notification: DateReminderNotification
  ): Promise<{ notificationId?: string } | null> {
    try {
      const notificationServiceUrl =
        process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
      const serviceToken = config.serviceToken;

      const response = await axios.post(
        `${notificationServiceUrl}/api/v1/internal/notifications/send`,
        notification,
        {
          headers: {
            'x-service-key': serviceToken,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      if (response.data.success) {
        return { notificationId: response.data.data?.id };
      }

      logger.warn('Notification service returned failure:', response.data);
      return null;
    } catch (error) {
      logger.error('Failed to call notification service:', error);
      return null;
    }
  }

  /**
   * Reschedule reminders when a date is rescheduled
   */
  async rescheduleReminders(
    scheduledDateId: string,
    newScheduledAt: Date
  ): Promise<DateReminder[]> {
    await this.ensureInitialized();

    // Delete existing reminders
    await this.deleteRemindersForDate(scheduledDateId);

    // Get the scheduled date
    const scheduledDate = await this.getScheduledDateById(scheduledDateId);
    if (!scheduledDate) {
      throw new Error('Scheduled date not found');
    }

    // Update the scheduled date time
    scheduledDate.scheduledAt = newScheduledAt;

    // Create new reminders
    return this.createReminders(scheduledDate);
  }

  /**
   * Add a custom reminder for a user
   */
  async addCustomReminder(
    scheduledDateId: string,
    userId: string,
    minutesBefore: number
  ): Promise<DateReminder> {
    await this.ensureInitialized();

    // Validate timing
    if (minutesBefore <= 0 || minutesBefore > 10080) {
      // Max 1 week
      throw new Error('Invalid reminder timing');
    }

    // Get scheduled date to calculate reminder time
    const scheduledDate = await this.getScheduledDateById(scheduledDateId);
    if (!scheduledDate) {
      throw new Error('Scheduled date not found');
    }

    // Verify user is a participant
    if (!scheduledDate.participantIds.includes(userId)) {
      throw new Error('User is not a participant in this date');
    }

    const scheduledAt = new Date(scheduledDate.scheduledAt);
    const reminderAt = new Date(scheduledAt.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    if (reminderAt <= now) {
      throw new Error('Reminder time has already passed');
    }

    // Check max reminders
    const existingReminders = await this.getRemindersForDate(scheduledDateId, userId);
    if (existingReminders.length >= calendarConfig.reminders.maxRemindersPerDate) {
      throw new Error('Maximum number of reminders reached');
    }

    const reminderId = uuidv4();

    await postgresClient.dateReminders().insert({
      id: reminderId,
      scheduled_date_id: scheduledDateId,
      user_id: userId,
      reminder_at: reminderAt,
      timing_minutes: minutesBefore,
      sent: false,
      created_at: now,
    });

    const reminder: DateReminder = {
      id: reminderId,
      scheduledDateId,
      userId,
      reminderAt,
      timingMinutes: minutesBefore as ReminderTiming,
      sent: false,
      createdAt: now,
    };

    logger.info(`Created custom reminder ${reminder.id} for ${minutesBefore} minutes before date`);

    return reminder;
  }

  /**
   * Remove a specific reminder
   */
  async removeReminder(reminderId: string, scheduledDateId: string, userId: string): Promise<void> {
    await this.ensureInitialized();

    const row = await postgresClient.dateReminders()
      .where({ id: reminderId, scheduled_date_id: scheduledDateId })
      .first();

    if (!row) {
      throw new Error('Reminder not found');
    }

    if (row.user_id !== userId) {
      throw new Error('You can only remove your own reminders');
    }

    await postgresClient.dateReminders()
      .where({ id: reminderId })
      .delete();

    logger.info(`Deleted reminder ${reminderId}`);
  }

  /**
   * Get upcoming reminders for a user
   */
  async getUpcomingReminders(userId: string, limit: number = 10): Promise<DateReminder[]> {
    await this.ensureInitialized();

    const now = new Date();

    const rows = await postgresClient.dateReminders()
      .where({ user_id: userId, sent: false })
      .where('reminder_at', '>', now)
      .orderBy('reminder_at', 'asc')
      .limit(limit);

    return rows.map((row: any) => this.mapRowToReminder(row));
  }
}

// Export singleton instance
export const dateReminderService = new DateReminderService();
export default dateReminderService;
