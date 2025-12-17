/**
 * Bull Queue for Notification Processing
 * Fixed version with improved error handling and configuration validation
 */

import Bull, { Queue, Job } from 'bull';
import { config } from '../config';
import logger from '../utils/logger';
import { NotificationPayload, NotificationChannel } from '../types';
import { pushNotificationService } from '../services/push-notification.service';
import { emailNotificationService } from '../services/email-notification.service';
import { smsNotificationService } from '../services/sms-notification.service';
import { db } from '../config/database';

// Create notification queue with connection error handling
export const notificationQueue: Queue = new Bull('notifications', {
  redis: {
    host: config.redis.host || 'localhost',
    port: config.redis.port || 6379,
    password: config.redis.password || undefined,
    db: config.redis.db || 0,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 500, 2000);
      logger.warn(`Redis connection retry attempt ${times}`, { delay });
      return delay;
    },
  },
  defaultJobOptions: config.queue.defaultJobOptions,
});

// Queue event handlers
notificationQueue.on('completed', (job: Job, result: any) => {
  logger.info(`Notification job ${job.id} completed successfully`, {
    jobId: job.id,
    userId: job.data.userId,
    type: job.data.type,
    result,
  });
});

notificationQueue.on('failed', (job: Job, error: Error) => {
  logger.error(`Notification job ${job.id} failed`, {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade,
    userId: job.data?.userId,
    type: job.data?.type,
  });
});

notificationQueue.on('stalled', (job: Job) => {
  logger.warn(`Notification job ${job.id} stalled`, {
    jobId: job.id,
    attempts: job.attemptsMade,
    userId: job.data?.userId,
  });
});

notificationQueue.on('error', (error: Error) => {
  logger.error('Notification queue error occurred', {
    error: error.message,
    stack: error.stack,
  });
});

notificationQueue.on('waiting', (jobId: string) => {
  logger.debug(`Notification job ${jobId} is waiting`);
});

notificationQueue.on('active', (job: Job) => {
  logger.debug(`Notification job ${job.id} started processing`, {
    userId: job.data?.userId,
    type: job.data?.type,
  });
});

notificationQueue.on('progress', (job: Job, progress: number) => {
  logger.debug(`Notification job ${job.id} progress: ${progress}%`);
});

// Process notification jobs
notificationQueue.process('send-notification', async (job: Job) => {
  const payload: NotificationPayload = job.data;

  logger.info(`Processing notification job`, {
    jobId: job.id,
    userId: payload.userId,
    type: payload.type,
    channels: payload.channels,
  });

  const results: {
    channel: NotificationChannel;
    success: boolean;
    error?: string;
  }[] = [];

  // Check user preferences
  const preferences = await getUserPreferences(payload.userId);
  if (!preferences) {
    logger.warn(`No preferences found for user ${payload.userId}, creating defaults`);
    // Create default preferences if they don't exist
    await createDefaultPreferences(payload.userId);
    const newPrefs = await getUserPreferences(payload.userId);
    if (!newPrefs) {
      return { success: false, error: 'Failed to create user preferences' };
    }
  }

  // Refresh preferences after potential creation
  const userPrefs = await getUserPreferences(payload.userId);

  // Check quiet hours
  if (userPrefs?.quiet_hours_enabled && isQuietHours(userPrefs)) {
    logger.info(`User ${payload.userId} is in quiet hours. Skipping notification.`, {
      type: payload.type,
      quietHoursStart: userPrefs.quiet_hours_start,
      quietHoursEnd: userPrefs.quiet_hours_end,
    });
    return { success: false, error: 'User in quiet hours' };
  }

  // Send through each requested channel
  for (const channel of payload.channels) {
    try {
      let result: { success: boolean; error?: string };

      switch (channel) {
        case NotificationChannel.PUSH:
          if (userPrefs?.push_enabled && shouldSendPushNotification(payload.type, userPrefs)) {
            result = await sendPushNotification(payload);
          } else {
            result = { success: false, error: 'Push notifications disabled by user preferences' };
          }
          break;

        case NotificationChannel.EMAIL:
          if (userPrefs?.email_enabled && shouldSendEmailNotification(payload.type, userPrefs)) {
            result = await sendEmailNotification(payload);
          } else {
            result = { success: false, error: 'Email notifications disabled by user preferences' };
          }
          break;

        case NotificationChannel.SMS:
          if (userPrefs?.sms_enabled && shouldSendSMSNotification(payload.type, userPrefs)) {
            result = await sendSMSNotification(payload);
          } else {
            result = { success: false, error: 'SMS notifications disabled by user preferences' };
          }
          break;

        case NotificationChannel.IN_APP:
          result = await saveInAppNotification(payload);
          break;

        default:
          result = { success: false, error: `Unknown channel: ${channel}` };
      }

      results.push({
        channel,
        success: result.success,
        error: result.error,
      });
    } catch (error: any) {
      logger.error(`Error sending ${channel} notification`, {
        error: error.message,
        stack: error.stack,
        userId: payload.userId,
        type: payload.type,
      });

      results.push({
        channel,
        success: false,
        error: error.message,
      });
    }
  }

  const allSuccess = results.every((r) => r.success);
  const someSuccess = results.some((r) => r.success);

  return {
    success: allSuccess || someSuccess,
    results,
  };
});

// Helper functions
async function getUserPreferences(userId: string): Promise<any> {
  return db('notification_preferences').where({ user_id: userId }).first();
}

async function createDefaultPreferences(userId: string): Promise<void> {
  try {
    await db('notification_preferences').insert({
      user_id: userId,
      push_enabled: true,
      email_enabled: true,
      sms_enabled: false,
      push_new_match: true,
      push_new_message: true,
      push_new_like: true,
      push_super_like: true,
      push_profile_view: false,
      email_new_match: true,
      email_new_message: false,
      email_promotions: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'UTC',
    }).onConflict('user_id').ignore();

    logger.info(`Created default notification preferences for user ${userId}`);
  } catch (error: any) {
    logger.error(`Failed to create default preferences for user ${userId}`, {
      error: error.message,
    });
  }
}

function isQuietHours(preferences: any): boolean {
  if (!preferences.quiet_hours_enabled) return false;

  try {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: preferences.timezone || 'UTC',
    });

    const start = preferences.quiet_hours_start;
    const end = preferences.quiet_hours_end;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  } catch (error: any) {
    logger.error('Error checking quiet hours', {
      error: error.message,
      userId: preferences.user_id,
    });
    return false;
  }
}

function shouldSendPushNotification(type: string, preferences: any): boolean {
  switch (type) {
    case 'new_match':
      return preferences.push_new_match !== false;
    case 'new_message':
      return preferences.push_new_message !== false;
    case 'new_like':
      return preferences.push_new_like !== false;
    case 'super_like':
      return preferences.push_super_like !== false;
    case 'profile_view':
      return preferences.push_profile_view !== false;
    case 'profile_boost_active':
    case 'profile_boost_expiring':
      return preferences.push_boost_expiring !== false;
    case 'subscription_update':
    case 'payment_success':
    case 'payment_failed':
      return true; // Always send payment-related notifications
    default:
      return preferences.push_marketing !== false;
  }
}

function shouldSendEmailNotification(type: string, preferences: any): boolean {
  switch (type) {
    case 'new_match':
      return preferences.email_new_match !== false;
    case 'new_message':
      return preferences.email_new_message !== false;
    case 'weekly_digest':
      return preferences.email_weekly_digest !== false;
    case 'subscription_update':
    case 'payment_success':
    case 'payment_failed':
      return true; // Always send payment-related emails
    default:
      return preferences.email_promotions !== false;
  }
}

function shouldSendSMSNotification(type: string, preferences: any): boolean {
  switch (type) {
    case 'verification_code':
    case 'verification_complete':
      return preferences.sms_verification !== false;
    case 'security_alert':
      return preferences.sms_security_alerts !== false;
    case 'password_reset':
      return true; // Always send password reset SMS
    default:
      return false; // Only verification and security via SMS by default
  }
}

async function sendPushNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await pushNotificationService.sendNotification(payload.userId, {
      type: payload.type as any,
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
      deepLink: payload.actionUrl,
      data: payload.data,
    });

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error: any) {
    logger.error('Failed to send push notification', {
      error: error.message,
      userId: payload.userId,
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

async function sendEmailNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get user email
    const user = await db('users').where({ id: payload.userId }).first();
    if (!user?.email) {
      return { success: false, error: 'User email not found' };
    }

    const result = await emailNotificationService.sendEmail({
      to: user.email,
      subject: payload.title,
      text: payload.body,
      html: `<p>${payload.body}</p>`,
      userId: payload.userId,
      category: payload.type,
    });

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error: any) {
    logger.error('Failed to send email notification', {
      error: error.message,
      userId: payload.userId,
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

async function sendSMSNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get user phone
    const user = await db('users').where({ id: payload.userId }).first();
    if (!user?.phone) {
      return { success: false, error: 'User phone number not found' };
    }

    const result = await smsNotificationService.sendSMS({
      to: user.phone,
      message: payload.body,
    });

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error: any) {
    logger.error('Failed to send SMS notification', {
      error: error.message,
      userId: payload.userId,
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

async function saveInAppNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await db('notifications').insert({
      user_id: payload.userId,
      type: 'push', // In-app uses push type
      category: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ? JSON.stringify(payload.data) : null,
      action_url: payload.actionUrl,
      image_url: payload.imageUrl,
      status: 'sent',
      priority: payload.priority || 'normal',
      sent_at: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    logger.error('Failed to save in-app notification', {
      error: error.message,
      userId: payload.userId,
    });
    return { success: false, error: error.message };
  }
}

// Queue management functions
export async function addNotificationJob(
  payload: NotificationPayload
): Promise<Job> {
  const job = await notificationQueue.add('send-notification', payload, {
    priority: payload.priority === 'urgent' ? 1 : payload.priority === 'high' ? 2 : 3,
    delay: payload.scheduledAt
      ? new Date(payload.scheduledAt).getTime() - Date.now()
      : 0,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  logger.info(`Notification job added to queue`, {
    jobId: job.id,
    userId: payload.userId,
    type: payload.type,
    priority: payload.priority,
  });

  return job;
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
    notificationQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

export async function cleanQueue() {
  const cleanedCompleted = await notificationQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24h
  const cleanedFailed = await notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 7 days

  logger.info('Queue cleaned', {
    completedRemoved: cleanedCompleted.length,
    failedRemoved: cleanedFailed.length,
  });

  return {
    completedRemoved: cleanedCompleted.length,
    failedRemoved: cleanedFailed.length,
  };
}
