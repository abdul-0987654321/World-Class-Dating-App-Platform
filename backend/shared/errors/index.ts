/**
 * Flamoral Dating Platform - Error Handling Module
 * Single source of truth for all error handling across the platform
 */

// Error code enums
export {
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
  ERROR_CODES,
  type ErrorCode,
  type ErrorCodeValue,
} from './error-codes';

// HTTP status mapping
export {
  HTTP_STATUS_MAP,
  getHttpStatus,
  isClientError,
  isServerError,
  isRetryable,
} from './http-status-mapping';

// User-safe error messages
export {
  ERROR_MESSAGES,
  getErrorMessage,
  getErrorTitle,
} from './error-messages';

// API Error class and utilities
export {
  ApiError,
  isApiError,
  Errors,
  type FieldError,
  type ApiErrorResponse,
  type ApiErrorOptions,
} from './api-error';
