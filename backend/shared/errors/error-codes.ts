/**
 * Flamoral Dating Platform - Error Code Registry
 * SINGLE SOURCE OF TRUTH for all error codes across the platform
 *
 * Naming Convention: CATEGORY_SPECIFIC_ERROR
 * All services MUST use these codes for consistency
 */

// ============================================================================
// AUTHENTICATION ERRORS (AUTH_*)
// Used for identity verification and session management
// ============================================================================
export enum AuthErrorCode {
  /** Invalid username/password combination */
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',

  /** Authorization token not provided in request */
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',

  /** Token signature invalid or malformed */
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',

  /** Token has expired and needs refresh */
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',

  /** Token has been revoked or blacklisted */
  AUTH_TOKEN_REVOKED = 'AUTH_TOKEN_REVOKED',

  /** Refresh token is invalid or expired */
  AUTH_REFRESH_TOKEN_INVALID = 'AUTH_REFRESH_TOKEN_INVALID',

  /** Refresh token reuse detected (security threat) */
  AUTH_REFRESH_TOKEN_REUSED = 'AUTH_REFRESH_TOKEN_REUSED',

  /** Multi-factor authentication step required */
  AUTH_MFA_REQUIRED = 'AUTH_MFA_REQUIRED',

  /** Account temporarily locked due to failed attempts */
  AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',

  /** Account permanently locked - contact support required */
  AUTH_ACCOUNT_LOCKED_PERMANENT = 'AUTH_ACCOUNT_LOCKED_PERMANENT',

  /** Account has been deactivated */
  AUTH_ACCOUNT_DEACTIVATED = 'AUTH_ACCOUNT_DEACTIVATED',

  /** Account has been banned */
  AUTH_ACCOUNT_BANNED = 'AUTH_ACCOUNT_BANNED',

  /** Email verification required before login */
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_EMAIL_NOT_VERIFIED',
}

// ============================================================================
// PERMISSION ERRORS (PERM_*)
// Used when user is authenticated but not authorized
// ============================================================================
export enum PermissionErrorCode {
  /** User does not have permission for this action */
  PERM_DENIED = 'PERM_DENIED',

  /** Specific role required for this operation */
  PERM_ROLE_REQUIRED = 'PERM_ROLE_REQUIRED',

  /** Cross-tenant access violation detected */
  PERM_TENANT_VIOLATION = 'PERM_TENANT_VIOLATION',
}

// ============================================================================
// VALIDATION ERRORS (VALIDATION_*, FIELD_*)
// Used for input validation failures
// ============================================================================
export enum ValidationErrorCode {
  /** General validation failure */
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  /** Required field was not provided */
  FIELD_REQUIRED = 'FIELD_REQUIRED',

  /** Field value does not match expected format */
  FIELD_INVALID_FORMAT = 'FIELD_INVALID_FORMAT',

  /** Field value outside acceptable range */
  FIELD_OUT_OF_RANGE = 'FIELD_OUT_OF_RANGE',

  /** Field value already exists (must be unique) */
  FIELD_DUPLICATE = 'FIELD_DUPLICATE',
}

// ============================================================================
// RESOURCE ERRORS (RESOURCE_*)
// Used for CRUD operations on entities
// ============================================================================
export enum ResourceErrorCode {
  /** Requested resource does not exist */
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  /** Cannot create - resource already exists */
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  /** Concurrent modification conflict */
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  /** Resource is locked for editing */
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  /** Resource has been soft-deleted */
  RESOURCE_DELETED = 'RESOURCE_DELETED',
}

// ============================================================================
// BILLING/SUBSCRIPTION ERRORS (SUBSCRIPTION_*, FEATURE_*, USAGE_*, PAYMENT_*)
// Used for monetization and entitlements
// ============================================================================
export enum BillingErrorCode {
  /** Active subscription required for this feature */
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',

  /** Subscription has expired */
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',

  /** Feature not included in current plan */
  FEATURE_NOT_ENTITLED = 'FEATURE_NOT_ENTITLED',

  /** Usage quota has been exceeded */
  USAGE_LIMIT_EXCEEDED = 'USAGE_LIMIT_EXCEEDED',

  /** Payment processing failed */
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

// ============================================================================
// RATE LIMITING ERRORS (RATE_*, ACTION_*, ABUSE_*, CAPTCHA_*)
// Used for abuse prevention and throttling
// ============================================================================
export enum RateLimitErrorCode {
  /** Too many requests - rate limit exceeded */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  /** Specific action temporarily throttled */
  ACTION_THROTTLED = 'ACTION_THROTTLED',

  /** Suspicious activity detected */
  ABUSE_DETECTED = 'ABUSE_DETECTED',

  /** CAPTCHA verification required */
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
}

// ============================================================================
// INTEGRATION ERRORS (INTEGRATION_*)
// Used for external service communication
// ============================================================================
export enum IntegrationErrorCode {
  /** External service request timed out */
  INTEGRATION_TIMEOUT = 'INTEGRATION_TIMEOUT',

  /** External service is unavailable */
  INTEGRATION_UNAVAILABLE = 'INTEGRATION_UNAVAILABLE',

  /** Authentication with external service failed */
  INTEGRATION_AUTH_FAILED = 'INTEGRATION_AUTH_FAILED',

  /** External service rate limited our request */
  INTEGRATION_RATE_LIMITED = 'INTEGRATION_RATE_LIMITED',
}

// ============================================================================
// DATA/INFRASTRUCTURE ERRORS (DB_*, CACHE_*, DATA_*)
// Used for data layer issues
// ============================================================================
export enum DataErrorCode {
  /** Database connection could not be established */
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',

  /** Database query exceeded timeout threshold */
  DB_QUERY_TIMEOUT = 'DB_QUERY_TIMEOUT',

  /** Cache operation failed */
  CACHE_FAILURE = 'CACHE_FAILURE',

  /** Data integrity issue detected */
  DATA_INCONSISTENT = 'DATA_INCONSISTENT',
}

// ============================================================================
// PLATFORM ERRORS (SERVICE_*, DEPLOYMENT_*, FEATURE_*, CONFIG_*)
// Used for platform-level operational issues
// ============================================================================
export enum PlatformErrorCode {
  /** Service is temporarily unavailable */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  /** Deployment in progress, service degraded */
  DEPLOYMENT_IN_PROGRESS = 'DEPLOYMENT_IN_PROGRESS',

  /** Feature is disabled via feature flag */
  FEATURE_FLAG_DISABLED = 'FEATURE_FLAG_DISABLED',

  /** Required configuration is missing */
  CONFIG_MISSING = 'CONFIG_MISSING',
}

// ============================================================================
// INTERNAL ERRORS (INTERNAL_*, UNHANDLED_*, TIMEOUT_*, CIRCUIT_*)
// Used for unexpected system errors
// ============================================================================
export enum InternalErrorCode {
  /** Generic internal server error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  /** Unhandled exception occurred */
  UNHANDLED_EXCEPTION = 'UNHANDLED_EXCEPTION',

  /** Operation exceeded timeout threshold */
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',

  /** Circuit breaker is open - service protection active */
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
}

// ============================================================================
// MATCHING SERVICE ERRORS (MATCH_*, SWIPE_*, BOOST_*, SUPERLIKE_*)
// Used for dating matching functionality
// ============================================================================
export enum MatchingErrorCode {
  /** User cannot perform action on themselves */
  SELF_ACTION_NOT_ALLOWED = 'SELF_ACTION_NOT_ALLOWED',

  /** User has already swiped on target */
  ALREADY_SWIPED = 'ALREADY_SWIPED',

  /** Match has expired and is no longer active */
  MATCH_EXPIRED = 'MATCH_EXPIRED',

  /** Match already exists between users */
  MATCH_ALREADY_EXISTS = 'MATCH_ALREADY_EXISTS',

  /** Match not found */
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',

  /** User has reached daily swipe limit */
  SWIPE_LIMIT_REACHED = 'SWIPE_LIMIT_REACHED',

  /** User has reached daily super like limit */
  SUPER_LIKE_LIMIT_REACHED = 'SUPER_LIKE_LIMIT_REACHED',

  /** User already has an active boost */
  BOOST_ALREADY_ACTIVE = 'BOOST_ALREADY_ACTIVE',

  /** No active boost to cancel */
  NO_ACTIVE_BOOST = 'NO_ACTIVE_BOOST',

  /** Message is too short */
  MESSAGE_TOO_SHORT = 'MESSAGE_TOO_SHORT',

  /** Message is too long */
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',

  /** Message contains inappropriate content */
  MESSAGE_INAPPROPRIATE = 'MESSAGE_INAPPROPRIATE',

  /** Delete window for message has expired */
  DELETE_WINDOW_EXPIRED = 'DELETE_WINDOW_EXPIRED',

  /** Match extension not allowed */
  EXTENSION_NOT_ALLOWED = 'EXTENSION_NOT_ALLOWED',

  /** Cannot undo swipe */
  UNDO_NOT_ALLOWED = 'UNDO_NOT_ALLOWED',

  /** Cannot rematch - premium required */
  REMATCH_NOT_ALLOWED = 'REMATCH_NOT_ALLOWED',
}

// ============================================================================
// UNIFIED ERROR CODE TYPE
// Union of all error code enums for type safety
// ============================================================================
export type ErrorCode =
  | AuthErrorCode
  | PermissionErrorCode
  | ValidationErrorCode
  | ResourceErrorCode
  | BillingErrorCode
  | RateLimitErrorCode
  | IntegrationErrorCode
  | DataErrorCode
  | PlatformErrorCode
  | InternalErrorCode
  | MatchingErrorCode;

// ============================================================================
// ERROR CODE CONSTANTS (for string-based lookups)
// ============================================================================
export const ERROR_CODES = {
  // Auth
  ...AuthErrorCode,
  // Permissions
  ...PermissionErrorCode,
  // Validation
  ...ValidationErrorCode,
  // Resources
  ...ResourceErrorCode,
  // Billing
  ...BillingErrorCode,
  // Rate Limiting
  ...RateLimitErrorCode,
  // Integrations
  ...IntegrationErrorCode,
  // Data
  ...DataErrorCode,
  // Platform
  ...PlatformErrorCode,
  // Internal
  ...InternalErrorCode,
  // Matching
  ...MatchingErrorCode,
} as const;

// Type for the ERROR_CODES object values
export type ErrorCodeValue = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
