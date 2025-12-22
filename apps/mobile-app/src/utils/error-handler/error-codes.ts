/**
 * Frontend Error Codes
 * Mirrors backend error codes for consistent error handling
 *
 * IMPORTANT: Never branch on error messages - always use these codes
 */

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED = 'AUTH_ACCOUNT_SUSPENDED',
  EMAIL_NOT_VERIFIED = 'AUTH_EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  REFRESH_TOKEN_INVALID = 'AUTH_REFRESH_TOKEN_INVALID',
  TWO_FACTOR_REQUIRED = 'AUTH_TWO_FACTOR_REQUIRED',
  TWO_FACTOR_INVALID = 'AUTH_TWO_FACTOR_INVALID',
}

/**
 * Authorization/Permission error codes
 */
export enum PermissionErrorCode {
  ACCESS_DENIED = 'PERMISSION_ACCESS_DENIED',
  OWNERSHIP_REQUIRED = 'PERMISSION_OWNERSHIP_REQUIRED',
  ADMIN_REQUIRED = 'PERMISSION_ADMIN_REQUIRED',
  PREMIUM_REQUIRED = 'PERMISSION_PREMIUM_REQUIRED',
  USER_BLOCKED = 'PERMISSION_USER_BLOCKED',
  AGE_VERIFICATION_REQUIRED = 'PERMISSION_AGE_VERIFICATION_REQUIRED',
}

/**
 * Billing/Payment error codes
 */
export enum BillingErrorCode {
  PAYMENT_REQUIRED = 'BILLING_PAYMENT_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'BILLING_SUBSCRIPTION_EXPIRED',
  PAYMENT_FAILED = 'BILLING_PAYMENT_FAILED',
  CARD_DECLINED = 'BILLING_CARD_DECLINED',
  INSUFFICIENT_FUNDS = 'BILLING_INSUFFICIENT_FUNDS',
  INVALID_PAYMENT_METHOD = 'BILLING_INVALID_PAYMENT_METHOD',
  UPGRADE_REQUIRED = 'BILLING_UPGRADE_REQUIRED',
  INSUFFICIENT_COINS = 'BILLING_INSUFFICIENT_COINS',
}

/**
 * Validation error codes
 */
export enum ValidationErrorCode {
  REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  TOO_SHORT = 'VALIDATION_TOO_SHORT',
  TOO_LONG = 'VALIDATION_TOO_LONG',
  INVALID_EMAIL = 'VALIDATION_INVALID_EMAIL',
  WEAK_PASSWORD = 'VALIDATION_WEAK_PASSWORD',
  INVALID_PHONE = 'VALIDATION_INVALID_PHONE',
  INVALID_DATE = 'VALIDATION_INVALID_DATE',
  INVALID_FILE_TYPE = 'VALIDATION_INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'VALIDATION_FILE_TOO_LARGE',
  DUPLICATE_VALUE = 'VALIDATION_DUPLICATE_VALUE',
}

/**
 * Resource error codes
 */
export enum ResourceErrorCode {
  NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'RESOURCE_USER_NOT_FOUND',
  MATCH_NOT_FOUND = 'RESOURCE_MATCH_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'RESOURCE_MESSAGE_NOT_FOUND',
  PROFILE_NOT_FOUND = 'RESOURCE_PROFILE_NOT_FOUND',
  DELETED = 'RESOURCE_DELETED',
  UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
}

/**
 * Rate limiting error codes
 */
export enum RateLimitErrorCode {
  TOO_MANY_REQUESTS = 'RATE_LIMIT_EXCEEDED',
  DAILY_LIKES_EXCEEDED = 'RATE_LIMIT_DAILY_LIKES',
  DAILY_SUPER_LIKES_EXCEEDED = 'RATE_LIMIT_DAILY_SUPER_LIKES',
  DAILY_BOOSTS_EXCEEDED = 'RATE_LIMIT_DAILY_BOOSTS',
  MESSAGE_RATE_LIMIT = 'RATE_LIMIT_MESSAGES',
  LOGIN_ATTEMPTS_EXCEEDED = 'RATE_LIMIT_LOGIN_ATTEMPTS',
  API_LIMIT_EXCEEDED = 'RATE_LIMIT_API',
}

/**
 * Server error codes
 */
export enum ServerErrorCode {
  INTERNAL_ERROR = 'SERVER_INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVER_SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'SERVER_DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'SERVER_EXTERNAL_SERVICE_ERROR',
  MAINTENANCE_MODE = 'SERVER_MAINTENANCE_MODE',
  TIMEOUT = 'SERVER_TIMEOUT',
}

/**
 * Network error codes (client-side)
 */
export enum NetworkErrorCode {
  OFFLINE = 'NETWORK_OFFLINE',
  TIMEOUT = 'NETWORK_TIMEOUT',
  CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  CERTIFICATE_ERROR = 'NETWORK_CERTIFICATE_ERROR',
}

/**
 * Content moderation error codes
 */
export enum ModerationErrorCode {
  CONTENT_VIOLATION = 'MODERATION_CONTENT_VIOLATION',
  INAPPROPRIATE_CONTENT = 'MODERATION_INAPPROPRIATE_CONTENT',
  SPAM_DETECTED = 'MODERATION_SPAM_DETECTED',
  HARASSMENT_DETECTED = 'MODERATION_HARASSMENT_DETECTED',
  SCAM_DETECTED = 'MODERATION_SCAM_DETECTED',
}

/**
 * Matching error codes
 */
export enum MatchErrorCode {
  ALREADY_MATCHED = 'MATCH_ALREADY_MATCHED',
  ALREADY_LIKED = 'MATCH_ALREADY_LIKED',
  USER_BLOCKED = 'MATCH_USER_BLOCKED',
  SELF_MATCH = 'MATCH_SELF_MATCH',
  UNMATCHED = 'MATCH_UNMATCHED',
}

/**
 * Union type of all error codes
 */
export type ErrorCode =
  | AuthErrorCode
  | PermissionErrorCode
  | BillingErrorCode
  | ValidationErrorCode
  | ResourceErrorCode
  | RateLimitErrorCode
  | ServerErrorCode
  | NetworkErrorCode
  | ModerationErrorCode
  | MatchErrorCode;

/**
 * Check if a value is a known error code
 */
export function isKnownErrorCode(code: string): code is ErrorCode {
  return (
    Object.values(AuthErrorCode).includes(code as AuthErrorCode) ||
    Object.values(PermissionErrorCode).includes(code as PermissionErrorCode) ||
    Object.values(BillingErrorCode).includes(code as BillingErrorCode) ||
    Object.values(ValidationErrorCode).includes(code as ValidationErrorCode) ||
    Object.values(ResourceErrorCode).includes(code as ResourceErrorCode) ||
    Object.values(RateLimitErrorCode).includes(code as RateLimitErrorCode) ||
    Object.values(ServerErrorCode).includes(code as ServerErrorCode) ||
    Object.values(NetworkErrorCode).includes(code as NetworkErrorCode) ||
    Object.values(ModerationErrorCode).includes(code as ModerationErrorCode) ||
    Object.values(MatchErrorCode).includes(code as MatchErrorCode)
  );
}

/**
 * Get error code category
 */
export function getErrorCategory(code: ErrorCode): string {
  if (Object.values(AuthErrorCode).includes(code as AuthErrorCode)) {
    return 'authentication';
  }
  if (Object.values(PermissionErrorCode).includes(code as PermissionErrorCode)) {
    return 'permission';
  }
  if (Object.values(BillingErrorCode).includes(code as BillingErrorCode)) {
    return 'billing';
  }
  if (Object.values(ValidationErrorCode).includes(code as ValidationErrorCode)) {
    return 'validation';
  }
  if (Object.values(ResourceErrorCode).includes(code as ResourceErrorCode)) {
    return 'resource';
  }
  if (Object.values(RateLimitErrorCode).includes(code as RateLimitErrorCode)) {
    return 'rate_limit';
  }
  if (Object.values(ServerErrorCode).includes(code as ServerErrorCode)) {
    return 'server';
  }
  if (Object.values(NetworkErrorCode).includes(code as NetworkErrorCode)) {
    return 'network';
  }
  if (Object.values(ModerationErrorCode).includes(code as ModerationErrorCode)) {
    return 'moderation';
  }
  if (Object.values(MatchErrorCode).includes(code as MatchErrorCode)) {
    return 'match';
  }
  return 'unknown';
}
