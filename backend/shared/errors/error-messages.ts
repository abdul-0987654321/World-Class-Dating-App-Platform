/**
 * Flamoral Dating Platform - User-Safe Error Messages
 * These messages are safe to show to end users
 */

import {
  AuthErrorCode,
  PermissionErrorCode,
  ValidationErrorCode,
  ResourceErrorCode,
  BillingErrorCode,
  RateLimitErrorCode,
  IntegrationErrorCode,
  DataErrorCode,
  PlatformErrorCode,
  InternalErrorCode,
  MatchingErrorCode,
  ErrorCode,
} from './error-codes';

/**
 * User-friendly error messages for each error code
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Auth errors
  [AuthErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
  [AuthErrorCode.AUTH_TOKEN_MISSING]: 'Please sign in to continue.',
  [AuthErrorCode.AUTH_TOKEN_INVALID]: 'Your session is invalid. Please sign in again.',
  [AuthErrorCode.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please sign in again.',
  [AuthErrorCode.AUTH_TOKEN_REVOKED]: 'Your session has been revoked. Please sign in again.',
  [AuthErrorCode.AUTH_REFRESH_TOKEN_INVALID]: 'Session refresh failed. Please sign in again.',
  [AuthErrorCode.AUTH_REFRESH_TOKEN_REUSED]: 'Security alert: Please sign in again.',
  [AuthErrorCode.AUTH_MFA_REQUIRED]: 'Please complete two-factor authentication.',
  [AuthErrorCode.AUTH_ACCOUNT_LOCKED]: 'Your account has been temporarily locked. Please try again later or reset your password.',
  [AuthErrorCode.AUTH_ACCOUNT_LOCKED_PERMANENT]: 'Your account has been locked. Please contact support.',
  [AuthErrorCode.AUTH_ACCOUNT_DEACTIVATED]: 'Your account has been deactivated.',
  [AuthErrorCode.AUTH_ACCOUNT_BANNED]: 'Your account has been suspended.',
  [AuthErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 'Please verify your email address to continue.',

  // Permission errors
  [PermissionErrorCode.PERM_DENIED]: 'You do not have permission to perform this action.',
  [PermissionErrorCode.PERM_ROLE_REQUIRED]: 'This action requires additional privileges.',
  [PermissionErrorCode.PERM_TENANT_VIOLATION]: 'You cannot access this resource.',

  // Validation errors
  [ValidationErrorCode.VALIDATION_FAILED]: 'Please check your input and try again.',
  [ValidationErrorCode.FIELD_REQUIRED]: 'This field is required.',
  [ValidationErrorCode.FIELD_INVALID_FORMAT]: 'Please enter a valid format.',
  [ValidationErrorCode.FIELD_OUT_OF_RANGE]: 'The value is outside the allowed range.',
  [ValidationErrorCode.FIELD_DUPLICATE]: 'This value already exists.',

  // Resource errors
  [ResourceErrorCode.RESOURCE_NOT_FOUND]: 'The requested item could not be found.',
  [ResourceErrorCode.RESOURCE_ALREADY_EXISTS]: 'This item already exists.',
  [ResourceErrorCode.RESOURCE_CONFLICT]: 'This item was modified by someone else. Please refresh and try again.',
  [ResourceErrorCode.RESOURCE_LOCKED]: 'This item is currently being edited.',
  [ResourceErrorCode.RESOURCE_DELETED]: 'This item has been deleted.',

  // Billing errors
  [BillingErrorCode.SUBSCRIPTION_REQUIRED]: 'A subscription is required to access this feature.',
  [BillingErrorCode.SUBSCRIPTION_EXPIRED]: 'Your subscription has expired. Please renew to continue.',
  [BillingErrorCode.FEATURE_NOT_ENTITLED]: 'Upgrade your plan to access this feature.',
  [BillingErrorCode.USAGE_LIMIT_EXCEEDED]: 'You have reached your usage limit. Please upgrade your plan.',
  [BillingErrorCode.PAYMENT_FAILED]: 'Payment could not be processed. Please update your payment method.',

  // Rate limit errors
  [RateLimitErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
  [RateLimitErrorCode.ACTION_THROTTLED]: 'Please slow down and try again in a moment.',
  [RateLimitErrorCode.ABUSE_DETECTED]: 'Unusual activity detected. Please try again later.',
  [RateLimitErrorCode.CAPTCHA_REQUIRED]: 'Please complete the verification challenge.',

  // Integration errors
  [IntegrationErrorCode.INTEGRATION_TIMEOUT]: 'The service is taking too long to respond. Please try again.',
  [IntegrationErrorCode.INTEGRATION_UNAVAILABLE]: 'An external service is currently unavailable. Please try again later.',
  [IntegrationErrorCode.INTEGRATION_AUTH_FAILED]: 'Unable to connect to external service.',
  [IntegrationErrorCode.INTEGRATION_RATE_LIMITED]: 'Service temporarily limited. Please try again later.',

  // Data errors
  [DataErrorCode.DB_CONNECTION_FAILED]: 'Unable to connect to our servers. Please try again.',
  [DataErrorCode.DB_QUERY_TIMEOUT]: 'The request took too long. Please try again.',
  [DataErrorCode.CACHE_FAILURE]: 'A temporary issue occurred. Please try again.',
  [DataErrorCode.DATA_INCONSISTENT]: 'An unexpected error occurred. Please contact support.',

  // Platform errors
  [PlatformErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
  [PlatformErrorCode.DEPLOYMENT_IN_PROGRESS]: 'We are updating our systems. Please try again shortly.',
  [PlatformErrorCode.FEATURE_FLAG_DISABLED]: 'This feature is not currently available.',
  [PlatformErrorCode.CONFIG_MISSING]: 'A configuration error occurred. Please contact support.',

  // Internal errors
  [InternalErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
  [InternalErrorCode.UNHANDLED_EXCEPTION]: 'Something went wrong. Please try again.',
  [InternalErrorCode.TIMEOUT_EXCEEDED]: 'The operation timed out. Please try again.',
  [InternalErrorCode.CIRCUIT_BREAKER_OPEN]: 'The service is temporarily unavailable. Please try again later.',

  // Matching errors
  [MatchingErrorCode.SELF_ACTION_NOT_ALLOWED]: 'You cannot perform this action on yourself.',
  [MatchingErrorCode.ALREADY_SWIPED]: 'You have already swiped on this user.',
  [MatchingErrorCode.MATCH_EXPIRED]: 'This match has expired.',
  [MatchingErrorCode.MATCH_ALREADY_EXISTS]: 'You are already matched with this user.',
  [MatchingErrorCode.MATCH_NOT_FOUND]: 'Match not found.',
  [MatchingErrorCode.SWIPE_LIMIT_REACHED]: 'You have reached your daily swipe limit. Upgrade to Premium for unlimited swipes.',
  [MatchingErrorCode.SUPER_LIKE_LIMIT_REACHED]: 'You have reached your daily Super Like limit.',
  [MatchingErrorCode.BOOST_ALREADY_ACTIVE]: 'You already have an active boost.',
  [MatchingErrorCode.NO_ACTIVE_BOOST]: 'No active boost to cancel.',
  [MatchingErrorCode.MESSAGE_TOO_SHORT]: 'Message is too short. Please write at least 10 characters.',
  [MatchingErrorCode.MESSAGE_TOO_LONG]: 'Message exceeds the maximum length of 500 characters.',
  [MatchingErrorCode.MESSAGE_INAPPROPRIATE]: 'Message contains inappropriate content.',
  [MatchingErrorCode.DELETE_WINDOW_EXPIRED]: 'You can only delete messages within 5 minutes of sending.',
  [MatchingErrorCode.EXTENSION_NOT_ALLOWED]: 'This match cannot be extended.',
  [MatchingErrorCode.UNDO_NOT_ALLOWED]: 'Cannot undo this swipe.',
  [MatchingErrorCode.REMATCH_NOT_ALLOWED]: 'Rematch is a Premium feature. Upgrade to rematch with expired matches.',
};

/**
 * Get user-friendly error message for an error code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'An unexpected error occurred. Please try again.';
}

/**
 * Get a short title for the error category
 */
export function getErrorTitle(code: ErrorCode): string {
  if (code.startsWith('AUTH_')) return 'Authentication Error';
  if (code.startsWith('PERM_')) return 'Permission Denied';
  if (code.startsWith('VALIDATION_') || code.startsWith('FIELD_')) return 'Validation Error';
  if (code.startsWith('RESOURCE_')) return 'Resource Error';
  if (code.startsWith('SUBSCRIPTION_') || code.startsWith('FEATURE_') || code.startsWith('USAGE_') || code.startsWith('PAYMENT_')) return 'Subscription Error';
  if (code.startsWith('RATE_') || code.startsWith('ACTION_') || code.startsWith('ABUSE_') || code.startsWith('CAPTCHA_')) return 'Rate Limited';
  if (code.startsWith('INTEGRATION_')) return 'Service Error';
  if (code.startsWith('DB_') || code.startsWith('CACHE_') || code.startsWith('DATA_')) return 'System Error';
  if (code.startsWith('SERVICE_') || code.startsWith('DEPLOYMENT_') || code.startsWith('FEATURE_FLAG_') || code.startsWith('CONFIG_')) return 'Service Unavailable';
  if (code.startsWith('MATCH_') || code.startsWith('SWIPE_') || code.startsWith('BOOST_') || code.startsWith('SUPER_LIKE_') || code.startsWith('MESSAGE_') || code.startsWith('SELF_') || code.startsWith('ALREADY_') || code.startsWith('UNDO_') || code.startsWith('REMATCH_') || code.startsWith('DELETE_') || code.startsWith('EXTENSION_')) return 'Matching Error';
  return 'Error';
}
