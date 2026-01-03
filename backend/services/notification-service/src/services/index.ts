/**
 * Notification Services Index
 *
 * This file exports all notification services with AWS services as the default.
 * External provider services (Twilio, SendGrid, Firebase) are deprecated.
 *
 * AWS-Only Compliance:
 * - Email: AWS SES (ses-email.service.ts)
 * - SMS: AWS SNS (sns-sms.service.ts)
 * - Push: AWS SNS (../providers/sns-push.provider.ts)
 * - Queues: AWS SQS (sqs-queue.service.ts)
 */

// ============================================================================
// AWS SERVICES (PREFERRED - USE THESE)
// ============================================================================

// Email via AWS SES
export { SESEmailService, sesEmailService } from './ses-email.service';

// SMS via AWS SNS
export { SNSSMSService, snsSMSService } from './sns-sms.service';

// Queue via AWS SQS
export { SQSQueueService, sqsQueueService } from './sqs-queue.service';

// Push via AWS SNS (from providers)
export { SNSPushProvider, snsPushProvider } from '../providers/sns-push.provider';

// ============================================================================
// CORE NOTIFICATION SERVICES
// ============================================================================

export { NotificationService, notificationService } from './notification.service';
export { NotificationTemplateService, notificationTemplateService } from './notification-template.service';
export { BatchNotificationService, batchNotificationService } from './batch-notification.service';
export { DeviceManagementService, deviceManagementService } from './device-management.service';
export { QuietHoursService, quietHoursService } from './quiet-hours.service';
export { PushNotificationService, pushNotificationService } from './push-notification.service';
export { PushNotificationDeliveryService, pushNotificationDeliveryService } from './push-notification-delivery.service';
export { CallPushService, callPushService } from './call-push.service';

// ============================================================================
// DEPRECATED SERVICES (DO NOT USE - MAINTAINED FOR BACKWARD COMPATIBILITY)
// ============================================================================

/**
 * @deprecated Use SESEmailService instead
 */
export { EmailNotificationService, emailNotificationService } from './email-notification.service';

/**
 * @deprecated Use SNSSMSService instead
 */
export { SMSNotificationService, smsNotificationService } from './sms-notification.service';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  PushMessage,
  BatchPushMessage,
  PushResult,
  BatchPushResult,
  EndpointResult,
  Platform,
} from '../providers/sns-push.provider';

// ============================================================================
// CONVENIENCE ALIASES (AWS Services)
// ============================================================================

// Alias AWS services as the "default" notification services
export const emailService = sesEmailService;
export const smsService = snsSMSService;
export const queueService = sqsQueueService;
export const pushService = snsPushProvider;
