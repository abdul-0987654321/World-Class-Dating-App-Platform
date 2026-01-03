/**
 * Date Reminder Service
 * Manages reminders for scheduled dates and sends notifications
 */

import { v4 as uuidv4 } from 'uuid';
import { Container } from '@azure/cosmos';
import axios from 'axios';
import { createLogger } from '../../utils/logger';
import cosmosClient from '../../infrastructure/database/cosmos-client';
import config from '../../config';
import { calendarConfig } from '../../config/calendar.config';
import {
  DateReminder,
  ScheduledDate,
  ReminderTiming,
} from '../../types/calendar.types';

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
  private remindersContainer: Container | null = null;
  private scheduledDatesContainer: Container | null = null;
  private reminderCheckInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  /**
   * Initialize containers
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const database = cosmosClient['database'];
      if (!database) {
        throw new Error('Cosmos DB not initialized');
      }

      const { container: remindersContainer } = await database.containers.createIfNotExists({
        id: 'DateReminders',
        partitionKey: '/scheduledDateId',
      });
      this.remindersContainer = remindersContainer;

      const { container: scheduledDatesContainer } = await database.containers.createIfNotExists({
        id: 'ScheduledDates',
        partitionKey: '/participantIds',
      });
      this.scheduledDatesContainer = scheduledDatesContainer;

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
    this.processReminders().catch(error => {
      logger.error('Error in initial reminder processing:', error);
    });

    // Set up interval for continuous processing
    this.reminderCheckInterval = setInterval(() => {
      this.processReminders().catch(error => {
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

    const reminderTimings = timings || calendarConfig.reminders.defaultTimings.map(t => t as ReminderTiming);
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

        const reminder: DateReminder = {
          id: uuidv4(),
          scheduledDateId: scheduledDate.id,
          userId,
          reminderAt,
          timingMinutes: timing,
          sent: false,
          createdAt: now,
        };

        await this.remindersContainer!.items.create(reminder);
        createdReminders.push(reminder);

        logger.info(`Created reminder ${reminder.id} for ${timing} minutes before date`);
      }
    }

    // Update scheduled date with reminder IDs
    if (createdReminders.length > 0) {
      scheduledDate.reminderIds = createdReminders.map(r => r.id);
      const participantIds = scheduledDate.participantIds.sort().join(',');
      await this.scheduledDatesContainer!.items.upsert({
        ...scheduledDate,
        participantIds,
      });
    }

    return createdReminders;
  }

  /**
   * Get reminders for a scheduled date and user
   */
  async getRemindersForDate(scheduledDateId: string, userId?: string): Promise<DateReminder[]> {
    await this.ensureInitialized();

    let query = 'SELECT * FROM c WHERE c.scheduledDateId = @scheduledDateId';
    const parameters: { name: string; value: any }[] = [
      { name: '@scheduledDateId', value: scheduledDateId },
    ];

    if (userId) {
      query += ' AND c.userId = @userId';
      parameters.push({ name: '@userId', value: userId });
    }

    query += ' ORDER BY c.reminderAt ASC';

    const { resources } = await this.remindersContainer!.items
      .query({ query, parameters })
      .fetchAll();

    return resources;
  }

  /**
   * Delete reminders for a scheduled date
   */
  async deleteRemindersForDate(scheduledDateId: string): Promise<void> {
    await this.ensureInitialized();

    const reminders = await this.getRemindersForDate(scheduledDateId);

    for (const reminder of reminders) {
      try {
        await this.remindersContainer!.item(reminder.id, scheduledDateId).delete();
      } catch (error) {
        logger.warn(`Failed to delete reminder ${reminder.id}:`, error);
      }
    }

    logger.info(`Deleted ${reminders.length} reminders for scheduled date ${scheduledDateId}`);
  }

  /**
   * Process pending reminders and send notifications
   */
  async processReminders(): Promise<void> {
    await this.ensureInitialized();

    const now = new Date();
    const lookAhead = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes ahead

    // Find reminders due to be sent
    const query = {
      query: `
        SELECT * FROM c
        WHERE c.sent = false
          AND c.reminderAt <= @lookAhead
          AND c.reminderAt > @pastCutoff
        ORDER BY c.reminderAt ASC
      `,
      parameters: [
        { name: '@lookAhead', value: lookAhead.toISOString() },
        { name: '@pastCutoff', value: new Date(now.getTime() - 60 * 60 * 1000).toISOString() }, // Don't send reminders more than 1 hour old
      ],
    };

    const { resources: dueReminders } = await this.remindersContainer!.items.query(query).fetchAll();

    if (dueReminders.length === 0) {
      return;
    }

    logger.info(`Processing ${dueReminders.length} due reminders`);

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        await this.sendReminder(reminder);
      } catch (error) {
        logger.error(`Failed to send reminder ${reminder.id}:`, error);
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
      logger.warn(`Scheduled date ${reminder.scheduledDateId} not found for reminder ${reminder.id}`);
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
    reminder.sent = true;
    reminder.sentAt = new Date();

    await this.remindersContainer!.items.upsert(reminder);
  }

  /**
   * Get scheduled date by ID (cross-partition query)
   */
  private async getScheduledDateById(scheduledDateId: string): Promise<ScheduledDate | null> {
    const query = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: scheduledDateId }],
    };

    const { resources } = await this.scheduledDatesContainer!.items.query(query).fetchAll();
    return resources[0] || null;
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
  private async sendNotification(notification: DateReminderNotification): Promise<{ notificationId?: string } | null> {
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
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
    if (minutesBefore <= 0 || minutesBefore > 10080) { // Max 1 week
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

    const reminder: DateReminder = {
      id: uuidv4(),
      scheduledDateId,
      userId,
      reminderAt,
      timingMinutes: minutesBefore as ReminderTiming,
      sent: false,
      createdAt: now,
    };

    await this.remindersContainer!.items.create(reminder);
    logger.info(`Created custom reminder ${reminder.id} for ${minutesBefore} minutes before date`);

    return reminder;
  }

  /**
   * Remove a specific reminder
   */
  async removeReminder(reminderId: string, scheduledDateId: string, userId: string): Promise<void> {
    await this.ensureInitialized();

    const query = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.scheduledDateId = @scheduledDateId',
      parameters: [
        { name: '@id', value: reminderId },
        { name: '@scheduledDateId', value: scheduledDateId },
      ],
    };

    const { resources } = await this.remindersContainer!.items.query(query).fetchAll();
    const reminder = resources[0];

    if (!reminder) {
      throw new Error('Reminder not found');
    }

    if (reminder.userId !== userId) {
      throw new Error('You can only remove your own reminders');
    }

    await this.remindersContainer!.item(reminderId, scheduledDateId).delete();
    logger.info(`Deleted reminder ${reminderId}`);
  }

  /**
   * Get upcoming reminders for a user
   */
  async getUpcomingReminders(userId: string, limit: number = 10): Promise<DateReminder[]> {
    await this.ensureInitialized();

    const now = new Date();
    const query = {
      query: `
        SELECT * FROM c
        WHERE c.userId = @userId
          AND c.sent = false
          AND c.reminderAt > @now
        ORDER BY c.reminderAt ASC
        OFFSET 0 LIMIT @limit
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@now', value: now.toISOString() },
        { name: '@limit', value: limit },
      ],
    };

    const { resources } = await this.remindersContainer!.items.query(query).fetchAll();
    return resources;
  }
}

// Export singleton instance
export const dateReminderService = new DateReminderService();
export default dateReminderService;
