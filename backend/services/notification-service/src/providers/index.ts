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
// Note: Types are exported from central types file to avoid AWS SDK dependency issues
export type {
  PushMessage,
  BatchPushMessage,
  PushResult,
  BatchPushResult,
  EndpointResult,
  Platform,
} from '../types';

// Re-export class and instance with try/catch for environments without AWS SDK
let _SNSPushProvider: any;
let _snsPushProvider: any;

try {
  const snsPushModule = require('./sns-push.provider');
  _SNSPushProvider = snsPushModule.SNSPushProvider;
  _snsPushProvider = snsPushModule.snsPushProvider;
} catch {
  // AWS SDK not installed - exports will be undefined
  _SNSPushProvider = undefined;
  _snsPushProvider = undefined;
}

export const SNSPushProvider = _SNSPushProvider;
export const snsPushProvider = _snsPushProvider;

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
export { APNsProvider, apnsProvider } from './apns.provider';

// ============================================================================
// CONVENIENCE ALIAS
// ============================================================================

// Default push provider is AWS SNS
export const pushProvider = _snsPushProvider;

// Lazy getter alternative for runtime safety
export const getPushProvider = () => _snsPushProvider;
