/**
 * Notification Providers Index
 *
 * AWS-Only Compliance:
 * - Push Notifications: AWS SNS (sns-push.provider.ts)
 *
 * Deprecated providers are maintained for backward compatibility only.
 */

// ============================================================================
// AWS PROVIDERS (PREFERRED - USE THESE)
// ============================================================================

// Push Notifications via AWS SNS
export {
  SNSPushProvider,
  snsPushProvider,
  type PushMessage,
  type BatchPushMessage,
  type PushResult,
  type BatchPushResult,
  type EndpointResult,
  type Platform,
} from './sns-push.provider';

// ============================================================================
// DEPRECATED PROVIDERS (DO NOT USE)
// ============================================================================

/**
 * @deprecated Use SNSPushProvider instead
 * Firebase FCM violates AWS-only constraints
 */
export { FCMProvider, fcmProvider } from './fcm.provider';

/**
 * @deprecated Use SNSPushProvider instead
 * Direct APNS is deprecated in favor of AWS SNS platform applications
 */
export { APNSProvider, apnsProvider } from './apns.provider';

// ============================================================================
// CONVENIENCE ALIAS
// ============================================================================

// Default push provider is AWS SNS
export const pushProvider = snsPushProvider;
