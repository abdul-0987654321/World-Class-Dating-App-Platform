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

// AWS SDK-dependent services are loaded with try/catch to handle
// environments where AWS SDK is not installed locally.
// These will work in CI/CD and production where dependencies are installed.

// Email via AWS SES
let _SESEmailService: any;
let _sesEmailService: any;

try {
  const sesModule = require('./ses-email.service');
  _SESEmailService = sesModule.SESEmailService;
  _sesEmailService = sesModule.sesEmailService;
} catch {
  _SESEmailService = undefined;
  _sesEmailService = undefined;
}

export const SESEmailService = _SESEmailService;
export const sesEmailService = _sesEmailService;

// SMS via AWS SNS
let _SNSSMSService: any;
let _snsSMSService: any;

try {
  const snsModule = require('./sns-sms.service');
  _SNSSMSService = snsModule.SNSSMSService;
  _snsSMSService = snsModule.snsSMSService;
} catch {
  _SNSSMSService = undefined;
  _snsSMSService = undefined;
}

export const SNSSMSService = _SNSSMSService;
export const snsSMSService = _snsSMSService;

// Queue via AWS SQS
let _SQSQueueService: any;
let _sqsQueueService: any;

try {
  const sqsModule = require('./sqs-queue.service');
  _SQSQueueService = sqsModule.SQSQueueService;
  _sqsQueueService = sqsModule.sqsQueueService;
} catch {
  _SQSQueueService = undefined;
  _sqsQueueService = undefined;
}

export const SQSQueueService = _SQSQueueService;
export const sqsQueueService = _sqsQueueService;

// Push via AWS SNS (from providers)
let _SNSPushProvider: any;
let _snsPushProvider: any;

try {
  const snsPushModule = require('../providers/sns-push.provider');
  _SNSPushProvider = snsPushModule.SNSPushProvider;
  _snsPushProvider = snsPushModule.snsPushProvider;
} catch {
  _SNSPushProvider = undefined;
  _snsPushProvider = undefined;
}

export const SNSPushProvider = _SNSPushProvider;
export const snsPushProvider = _snsPushProvider;

// ============================================================================
// CORE NOTIFICATION SERVICES
// ============================================================================

export { NotificationService, notificationService } from './notification.service';
export {
  NotificationTemplateService,
  notificationTemplateService,
} from './notification-template.service';
export { BatchNotificationService, batchNotificationService } from './batch-notification.service';
export { DeviceManagementService, deviceManagementService } from './device-management.service';
export { QuietHoursService, quietHoursService } from './quiet-hours.service';
export { PushNotificationService, pushNotificationService } from './push-notification.service';
export {
  PushNotificationDeliveryService,
  pushNotificationDeliveryService,
} from './push-notification-delivery.service';
export { CallPushService, callPushService } from './call-push.service';

// Date Safety Guardian Service (uses AWS SNS for SMS)
export {
  DateSafetyGuardianService,
  dateSafetyGuardianService,
  type TrustedContact,
  type DateSession,
  type VenueInfo,
  type AlertRecord,
  type CheckInResult,
  type PanicAlertResult,
  DateSessionStatus,
  AlertType,
} from './date-safety-guardian.service';

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

// Types are exported from central types file to avoid AWS SDK dependency issues
export type {
  PushMessage,
  BatchPushMessage,
  PushResult,
  BatchPushResult,
  EndpointResult,
  Platform,
} from '../types';

// ============================================================================
// CONVENIENCE ALIASES (AWS Services)
// ============================================================================

// Alias AWS services as the "default" notification services
export const emailService = _sesEmailService;
export const smsService = _snsSMSService;
export const queueService = _sqsQueueService;
export const pushService = _snsPushProvider;

// Lazy getters for runtime safety
export const getEmailService = () => _sesEmailService;
export const getSmsService = () => _snsSMSService;
export const getQueueService = () => _sqsQueueService;
export const getPushService = () => _snsPushProvider;
