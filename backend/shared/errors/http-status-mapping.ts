/**
 * Flamoral Dating Platform - HTTP Status Mapping
 * Maps error codes to appropriate HTTP status codes
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
 * HTTP Status code mapping for all error codes
 */
export const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  // Auth errors -> 401 Unauthorized
  [AuthErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [AuthErrorCode.AUTH_TOKEN_MISSING]: 401,
  [AuthErrorCode.AUTH_TOKEN_INVALID]: 401,
  [AuthErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [AuthErrorCode.AUTH_TOKEN_REVOKED]: 401,
  [AuthErrorCode.AUTH_REFRESH_TOKEN_INVALID]: 401,
  [AuthErrorCode.AUTH_REFRESH_TOKEN_REUSED]: 401,
  [AuthErrorCode.AUTH_MFA_REQUIRED]: 401,
  [AuthErrorCode.AUTH_ACCOUNT_LOCKED]: 423,
  [AuthErrorCode.AUTH_ACCOUNT_LOCKED_PERMANENT]: 423,
  [AuthErrorCode.AUTH_ACCOUNT_DEACTIVATED]: 403,
  [AuthErrorCode.AUTH_ACCOUNT_BANNED]: 403,
  [AuthErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 403,

  // Permission errors -> 403 Forbidden
  [PermissionErrorCode.PERM_DENIED]: 403,
  [PermissionErrorCode.PERM_ROLE_REQUIRED]: 403,
  [PermissionErrorCode.PERM_TENANT_VIOLATION]: 403,

  // Validation errors -> 400 Bad Request / 422 Unprocessable Entity
  [ValidationErrorCode.VALIDATION_FAILED]: 400,
  [ValidationErrorCode.FIELD_REQUIRED]: 400,
  [ValidationErrorCode.FIELD_INVALID_FORMAT]: 400,
  [ValidationErrorCode.FIELD_OUT_OF_RANGE]: 400,
  [ValidationErrorCode.FIELD_DUPLICATE]: 409,

  // Resource errors -> 404 Not Found / 409 Conflict
  [ResourceErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ResourceErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ResourceErrorCode.RESOURCE_CONFLICT]: 409,
  [ResourceErrorCode.RESOURCE_LOCKED]: 423,
  [ResourceErrorCode.RESOURCE_DELETED]: 410,

  // Billing errors -> 402 Payment Required / 403 Forbidden
  [BillingErrorCode.SUBSCRIPTION_REQUIRED]: 402,
  [BillingErrorCode.SUBSCRIPTION_EXPIRED]: 402,
  [BillingErrorCode.FEATURE_NOT_ENTITLED]: 403,
  [BillingErrorCode.USAGE_LIMIT_EXCEEDED]: 429,
  [BillingErrorCode.PAYMENT_FAILED]: 402,

  // Rate limit errors -> 429 Too Many Requests
  [RateLimitErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [RateLimitErrorCode.ACTION_THROTTLED]: 429,
  [RateLimitErrorCode.ABUSE_DETECTED]: 429,
  [RateLimitErrorCode.CAPTCHA_REQUIRED]: 429,

  // Integration errors -> 502 Bad Gateway / 504 Gateway Timeout
  [IntegrationErrorCode.INTEGRATION_TIMEOUT]: 504,
  [IntegrationErrorCode.INTEGRATION_UNAVAILABLE]: 502,
  [IntegrationErrorCode.INTEGRATION_AUTH_FAILED]: 502,
  [IntegrationErrorCode.INTEGRATION_RATE_LIMITED]: 503,

  // Data errors -> 500 Internal Server Error / 503 Service Unavailable
  [DataErrorCode.DB_CONNECTION_FAILED]: 503,
  [DataErrorCode.DB_QUERY_TIMEOUT]: 504,
  [DataErrorCode.CACHE_FAILURE]: 503,
  [DataErrorCode.DATA_INCONSISTENT]: 500,

  // Platform errors -> 503 Service Unavailable
  [PlatformErrorCode.SERVICE_UNAVAILABLE]: 503,
  [PlatformErrorCode.DEPLOYMENT_IN_PROGRESS]: 503,
  [PlatformErrorCode.FEATURE_FLAG_DISABLED]: 501,
  [PlatformErrorCode.CONFIG_MISSING]: 500,

  // Internal errors -> 500 Internal Server Error
  [InternalErrorCode.INTERNAL_ERROR]: 500,
  [InternalErrorCode.UNHANDLED_EXCEPTION]: 500,
  [InternalErrorCode.TIMEOUT_EXCEEDED]: 504,
  [InternalErrorCode.CIRCUIT_BREAKER_OPEN]: 503,

  // Matching errors -> various
  [MatchingErrorCode.SELF_ACTION_NOT_ALLOWED]: 400,
  [MatchingErrorCode.ALREADY_SWIPED]: 409,
  [MatchingErrorCode.MATCH_EXPIRED]: 410,
  [MatchingErrorCode.MATCH_ALREADY_EXISTS]: 409,
  [MatchingErrorCode.MATCH_NOT_FOUND]: 404,
  [MatchingErrorCode.SWIPE_LIMIT_REACHED]: 429,
  [MatchingErrorCode.SUPER_LIKE_LIMIT_REACHED]: 429,
  [MatchingErrorCode.BOOST_ALREADY_ACTIVE]: 409,
  [MatchingErrorCode.NO_ACTIVE_BOOST]: 400,
  [MatchingErrorCode.MESSAGE_TOO_SHORT]: 400,
  [MatchingErrorCode.MESSAGE_TOO_LONG]: 400,
  [MatchingErrorCode.MESSAGE_INAPPROPRIATE]: 400,
  [MatchingErrorCode.DELETE_WINDOW_EXPIRED]: 400,
  [MatchingErrorCode.EXTENSION_NOT_ALLOWED]: 400,
  [MatchingErrorCode.UNDO_NOT_ALLOWED]: 400,
  [MatchingErrorCode.REMATCH_NOT_ALLOWED]: 403,
  [MatchingErrorCode.REWIND_NOT_ALLOWED]: 403,
  [MatchingErrorCode.REWIND_LIMIT_REACHED]: 429,
  [MatchingErrorCode.NO_SWIPE_TO_REWIND]: 400,
  [MatchingErrorCode.REWIND_WINDOW_EXPIRED]: 400,
};

/**
 * Get HTTP status code for an error code
 * Accepts any string to support custom error codes
 */
export function getHttpStatus(code: ErrorCode | string): number {
  return HTTP_STATUS_MAP[code as ErrorCode] ?? 500;
}

/**
 * Check if an error code represents a client error (4xx)
 */
export function isClientError(code: ErrorCode): boolean {
  const status = getHttpStatus(code);
  return status >= 400 && status < 500;
}

/**
 * Check if an error code represents a server error (5xx)
 */
export function isServerError(code: ErrorCode): boolean {
  const status = getHttpStatus(code);
  return status >= 500;
}

/**
 * Check if an error should be retried
 */
export function isRetryable(code: ErrorCode): boolean {
  const retryableCodes: ErrorCode[] = [
    IntegrationErrorCode.INTEGRATION_TIMEOUT,
    IntegrationErrorCode.INTEGRATION_UNAVAILABLE,
    IntegrationErrorCode.INTEGRATION_RATE_LIMITED,
    DataErrorCode.DB_CONNECTION_FAILED,
    DataErrorCode.DB_QUERY_TIMEOUT,
    DataErrorCode.CACHE_FAILURE,
    PlatformErrorCode.SERVICE_UNAVAILABLE,
    PlatformErrorCode.DEPLOYMENT_IN_PROGRESS,
    InternalErrorCode.TIMEOUT_EXCEEDED,
    InternalErrorCode.CIRCUIT_BREAKER_OPEN,
    RateLimitErrorCode.RATE_LIMIT_EXCEEDED,
    RateLimitErrorCode.ACTION_THROTTLED,
  ];
  return retryableCodes.includes(code);
}

/**
 * Get user-friendly message for an error code
 * Re-export from error-messages for convenience
 */
export { getErrorMessage as getUserMessage } from './error-messages';
