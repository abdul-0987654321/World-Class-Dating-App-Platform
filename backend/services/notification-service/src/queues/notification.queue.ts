/**
 * Bull Queue for Notification Processing
 */

import Bull, { Queue, Job } from 'bull';
import { config } from '../config';
import logger from '../utils/logger';
import { NotificationPayload, NotificationChannel } from '../types';
import { pushNotificationService } from '../services/push-notification.service';
import { emailNotificationService } from '../services/email-notification.service';
import { smsNotificationService } from '../services/sms-notification.service';
import { db } from '../config/database';

// Create notification queue
export const notificationQueue: Queue = new Bull('notifications', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
  },
  defaultJobOptions: config.queue.defaultJobOptions,
});

// Queue event handlers
notificationQueue.on('completed', (job: Job, result: any) => {
  logger.info(`Job ${job.id} completed`, { jobId: job.id, result });
});

notificationQueue.on('failed', (job: Job, error: Error) => {
  logger.error(`Job ${job.id} failed`, { jobId: job.id, error: error.message });
});

notificationQueue.on('stalled', (job: Job) => {
  logger.warn(`Job ${job.id} stalled`, { jobId: job.id });
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
    logger.warn(`No preferences found for user ${payload.userId}`);
    return { success: false, error: 'User preferences not found' };
  }

  // Check quiet hours
  if (preferences.quiet_hours_enabled && isQuietHours(preferences)) {
    logger.info(`User ${payload.userId} is in quiet hours. Skipping notification.`);
    return { success: false, error: 'User in quiet hours' };
  }

  // Send through each requested channel
  for (const channel of payload.channels) {
    try {
      let result: { success: boolean; error?: string };

      switch (channel) {
        case NotificationChannel.PUSH:
          if (preferences.push_enabled && shouldSendPushNotification(payload.type, preferences)) {
            result = await sendPushNotification(payload);
          } else {
            result = { success: false, error: 'Push notifications disabled' };
          }
          break;

        case NotificationChannel.EMAIL:
          if (preferences.email_enabled && shouldSendEmailNotification(payload.type, preferences)) {
            result = await sendEmailNotification(payload);
          } else {
            result = { success: false, error: 'Email notifications disabled' };
          }
          break;

        case NotificationChannel.SMS:
          if (preferences.sms_enabled && shouldSendSMSNotification(payload.type, preferences)) {
            result = await sendSMSNotification(payload);
          } else {
            result = { success: false, error: 'SMS notifications disabled' };
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
  let prefs = await db('notification_preferences').where({ user_id: userId }).first();

  // Create default preferences if not found
  if (!prefs) {
    [prefs] = await db('notification_preferences')
      .insert({
        user_id: userId,
        push_enabled: true,
        email_enabled: true,
        sms_enabled: false,
      })
      .returning('*');
  }

  return prefs;
}

function isQuietHours(preferences: any): boolean {
  if (!preferences.quiet_hours_enabled) return false;

  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: preferences.timezone || 'UTC',
  });

  const start = preferences.quiet_hours_start;
  const end = preferences.quiet_hours_end;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
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
    case 'verification_complete':
      return preferences.sms_verification !== false;
    case 'security_alert':
      return preferences.sms_security_alerts !== false;
    default:
      return false; // Only verification and security via SMS
  }
}

async function sendPushNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  error?: string;
}> {
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
}

async function sendEmailNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  error?: string;
}> {
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
  });

  return {
    success: result.success,
    error: result.error,
  };
}

async function sendSMSNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  error?: string;
}> {
  // Get user phone
  const user = await db('users').where({ id: payload.userId }).first();
  if (!user?.phone) {
    return { success: false, error: 'User phone not found' };
  }

  const result = await smsNotificationService.sendSMS({
    to: user.phone,
    message: payload.body,
  });

  return {
    success: result.success,
    error: result.error,
  };
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
  await notificationQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24h
  await notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 7 days
}
