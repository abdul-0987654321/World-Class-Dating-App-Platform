/**
 * Global Error Handler
 * Centralized error handling that maps HTTP status codes and error codes to UX behavior
 *
 * IMPORTANT:
 * - Never display raw backend messages to users
 * - Always use error codes for logic, never message text
 * - All errors should be routed through this handler
 */

import {
  AuthErrorCode,
  BillingErrorCode,
  PermissionErrorCode,
  RateLimitErrorCode,
  ServerErrorCode,
  NetworkErrorCode,
  ResourceErrorCode,
  isKnownErrorCode,
  type ErrorCode,
} from './error-codes';
import type {
  ApiErrorResponse,
  ProcessedError,
  ErrorHandlerConfig,
  ValidationErrorDetail,
} from './types';

/**
 * User-friendly messages for error codes
 * These are safe to display to users
 */
const USER_MESSAGES: Record<string, string> = {
  // Authentication errors
  [AuthErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [AuthErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
  [AuthErrorCode.ACCOUNT_LOCKED]: 'Your account has been locked. Please contact support.',
  [AuthErrorCode.ACCOUNT_SUSPENDED]: 'Your account has been suspended. Please contact support.',
  [AuthErrorCode.EMAIL_NOT_VERIFIED]: 'Please verify your email address to continue.',
  [AuthErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please sign in again.',
  [AuthErrorCode.TOKEN_INVALID]: 'Your session is invalid. Please sign in again.',
  [AuthErrorCode.REFRESH_TOKEN_INVALID]: 'Please sign in again to continue.',
  [AuthErrorCode.TWO_FACTOR_REQUIRED]: 'Please enter your two-factor authentication code.',
  [AuthErrorCode.TWO_FACTOR_INVALID]: 'Invalid verification code. Please try again.',

  // Permission errors
  [PermissionErrorCode.ACCESS_DENIED]: 'You do not have permission to perform this action.',
  [PermissionErrorCode.OWNERSHIP_REQUIRED]: 'You can only modify your own content.',
  [PermissionErrorCode.ADMIN_REQUIRED]: 'Administrator access is required.',
  [PermissionErrorCode.PREMIUM_REQUIRED]: 'This feature requires a premium subscription.',
  [PermissionErrorCode.USER_BLOCKED]: 'You are unable to interact with this user.',
  [PermissionErrorCode.AGE_VERIFICATION_REQUIRED]: 'Age verification is required to continue.',

  // Billing errors
  [BillingErrorCode.PAYMENT_REQUIRED]: 'Payment is required to continue.',
  [BillingErrorCode.SUBSCRIPTION_EXPIRED]: 'Your subscription has expired.',
  [BillingErrorCode.PAYMENT_FAILED]: 'Payment could not be processed. Please try again.',
  [BillingErrorCode.CARD_DECLINED]:
    'Your card was declined. Please try a different payment method.',
  [BillingErrorCode.INSUFFICIENT_FUNDS]:
    'Insufficient funds. Please try a different payment method.',
  [BillingErrorCode.INVALID_PAYMENT_METHOD]:
    'Invalid payment method. Please update your payment information.',
  [BillingErrorCode.UPGRADE_REQUIRED]: 'Please upgrade your subscription to access this feature.',
  [BillingErrorCode.INSUFFICIENT_COINS]: 'You need more coins to perform this action.',

  // Rate limit errors
  [RateLimitErrorCode.TOO_MANY_REQUESTS]: 'Too many requests. Please wait a moment and try again.',
  [RateLimitErrorCode.DAILY_LIKES_EXCEEDED]:
    'You have reached your daily like limit. Upgrade for unlimited likes!',
  [RateLimitErrorCode.DAILY_SUPER_LIKES_EXCEEDED]: 'You have used all your Super Likes for today.',
  [RateLimitErrorCode.DAILY_BOOSTS_EXCEEDED]: 'You have used all your Boosts for today.',
  [RateLimitErrorCode.MESSAGE_RATE_LIMIT]:
    'Please slow down. You are sending messages too quickly.',
  [RateLimitErrorCode.LOGIN_ATTEMPTS_EXCEEDED]: 'Too many login attempts. Please try again later.',
  [RateLimitErrorCode.API_LIMIT_EXCEEDED]: 'Please slow down and try again in a moment.',

  // Server errors
  [ServerErrorCode.INTERNAL_ERROR]: 'Something went wrong. Please try again later.',
  [ServerErrorCode.SERVICE_UNAVAILABLE]:
    'Service is temporarily unavailable. Please try again later.',
  [ServerErrorCode.DATABASE_ERROR]: 'Something went wrong. Please try again later.',
  [ServerErrorCode.EXTERNAL_SERVICE_ERROR]:
    'A service is temporarily unavailable. Please try again.',
  [ServerErrorCode.MAINTENANCE_MODE]:
    'We are currently performing maintenance. Please check back soon.',
  [ServerErrorCode.TIMEOUT]: 'The request timed out. Please try again.',

  // Network errors
  [NetworkErrorCode.OFFLINE]: 'You appear to be offline. Please check your connection.',
  [NetworkErrorCode.TIMEOUT]: 'The request timed out. Please try again.',
  [NetworkErrorCode.CONNECTION_FAILED]: 'Could not connect to server. Please try again.',
  [NetworkErrorCode.CERTIFICATE_ERROR]: 'Secure connection failed. Please try again.',

  // Resource errors
  [ResourceErrorCode.NOT_FOUND]: 'The requested content could not be found.',
  [ResourceErrorCode.USER_NOT_FOUND]: 'This user could not be found.',
  [ResourceErrorCode.MATCH_NOT_FOUND]: 'This match could not be found.',
  [ResourceErrorCode.MESSAGE_NOT_FOUND]: 'This message could not be found.',
  [ResourceErrorCode.PROFILE_NOT_FOUND]: 'This profile could not be found.',
  [ResourceErrorCode.DELETED]: 'This content has been deleted.',
  [ResourceErrorCode.UNAVAILABLE]: 'This content is no longer available.',
};

/**
 * Default user messages by HTTP status code
 */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Please sign in to continue.',
  402: 'Payment is required to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested content could not be found.',
  409: 'This action conflicts with an existing resource.',
  422: 'Please check your input and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong. Please try again later.',
  502: 'Service is temporarily unavailable. Please try again.',
  503: 'Service is temporarily unavailable. Please try again later.',
  504: 'The request timed out. Please try again.',
};

/**
 * Global error handler configuration
 */
let globalConfig: ErrorHandlerConfig = {};

/**
 * Configure the global error handler
 */
export function configureErrorHandler(config: ErrorHandlerConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get user-friendly message for an error
 */
function getUserMessage(
  errorCode: ErrorCode | string | undefined,
  status: number,
  customMessages?: Partial<Record<ErrorCode | string, string>>
): string {
  // Check custom messages first
  if (errorCode && customMessages?.[errorCode]) {
    return customMessages[errorCode]!;
  }

  // Check global custom messages
  if (errorCode && globalConfig.customMessages?.[errorCode]) {
    return globalConfig.customMessages[errorCode]!;
  }

  // Check built-in error code messages
  if (errorCode && USER_MESSAGES[errorCode]) {
    return USER_MESSAGES[errorCode];
  }

  // Fall back to status code message
  return STATUS_MESSAGES[status] || 'An unexpected error occurred. Please try again.';
}

/**
 * Parse validation errors into a field -> message map
 */
function parseValidationErrors(
  details: ValidationErrorDetail[] | undefined
): Record<string, string> | undefined {
  if (!details || details.length === 0) {
    return undefined;
  }

  const errors: Record<string, string> = {};
  for (const detail of details) {
    // Use the first constraint message or a generic message
    const constraintMessages = Object.values(detail.constraints || {});
    errors[detail.field] = constraintMessages[0] || 'This field is invalid';
  }
  return errors;
}

/**
 * Determine if an error is recoverable
 */
function isRecoverable(status: number, errorCode: ErrorCode | string | undefined): boolean {
  // Network errors are usually recoverable
  if (status === 0) return true;

  // Server errors are usually recoverable
  if (status >= 500 && status < 600) return true;

  // Timeout errors are recoverable
  if (errorCode === NetworkErrorCode.TIMEOUT || errorCode === ServerErrorCode.TIMEOUT) {
    return true;
  }

  // Rate limit errors are recoverable after waiting
  if (Object.values(RateLimitErrorCode).includes(errorCode as RateLimitErrorCode)) {
    return true;
  }

  // Most 4xx errors are not recoverable without user action
  return false;
}

/**
 * Determine if retry button should be shown
 */
function shouldShowRetry(status: number, errorCode: ErrorCode | string | undefined): boolean {
  // Show retry for server errors
  if (status >= 500 && status < 600) return true;

  // Show retry for network errors
  if (status === 0) return true;

  // Show retry for timeouts
  if (errorCode === NetworkErrorCode.TIMEOUT || errorCode === ServerErrorCode.TIMEOUT) {
    return true;
  }

  return false;
}

/**
 * Process an API error response into a user-friendly format
 */
export function processApiError(
  error: ApiErrorResponse,
  customMessages?: Partial<Record<ErrorCode | string, string>>
): ProcessedError {
  const errorCode = error.errorCode || error.error || '';
  const status =
    error.statusCode !== undefined && error.statusCode !== null ? error.statusCode : 500;

  return {
    status,
    errorCode,
    userMessage: getUserMessage(errorCode, status, customMessages),
    originalMessage: error.message,
    correlationId: error.correlationId,
    validationErrors: parseValidationErrors(error.details),
    retryAfter: error.retryAfter,
    isRecoverable: isRecoverable(status, errorCode),
    showRetry: shouldShowRetry(status, errorCode),
    timestamp: new Date(),
  };
}

/**
 * Handle error based on HTTP status code
 * This triggers appropriate UX behavior (redirects, toasts, etc.)
 */
export function handleErrorByStatus(error: ProcessedError): void {
  const { status, errorCode, userMessage, retryAfter } = error;

  switch (status) {
    case 401:
      // Redirect to login, clear auth state
      if (globalConfig.onAuthRequired) {
        globalConfig.onAuthRequired();
      }
      break;

    case 402:
      // Redirect to billing/upgrade page
      if (globalConfig.onBillingRequired) {
        globalConfig.onBillingRequired();
      } else {
        globalConfig.showToast?.(userMessage, 'warning');
      }
      break;

    case 403:
      // Show permission denied message
      // Check if it's a premium feature
      if (
        errorCode === PermissionErrorCode.PREMIUM_REQUIRED ||
        errorCode === BillingErrorCode.UPGRADE_REQUIRED
      ) {
        if (globalConfig.onBillingRequired) {
          globalConfig.onBillingRequired();
        } else {
          globalConfig.showToast?.(userMessage, 'warning');
        }
      } else {
        globalConfig.showToast?.(userMessage, 'error');
      }
      break;

    case 404:
      // Show 404 page or toast
      if (globalConfig.onNotFound) {
        globalConfig.onNotFound();
      } else {
        globalConfig.showToast?.(userMessage, 'error');
      }
      break;

    case 422:
      // Validation errors - these are typically handled inline in forms
      // Don't show a toast, let the form display the errors
      break;

    case 429:
      // Show cooldown message with retry timer
      const retryMessage = retryAfter
        ? `${userMessage} Try again in ${retryAfter} seconds.`
        : userMessage;
      globalConfig.showToast?.(retryMessage, 'warning');
      break;

    case 500:
      // Show friendly error with retry button
      globalConfig.showToast?.(userMessage, 'error');
      break;

    case 503:
      // Show maintenance/service unavailable message
      if (errorCode === ServerErrorCode.MAINTENANCE_MODE) {
        if (globalConfig.onMaintenance) {
          globalConfig.onMaintenance();
        } else {
          globalConfig.showToast?.(userMessage, 'warning');
        }
      } else {
        globalConfig.showToast?.(userMessage, 'error');
      }
      break;

    default:
      // Handle other error codes
      if (status >= 500) {
        globalConfig.showToast?.(userMessage, 'error');
      } else if (status >= 400) {
        globalConfig.showToast?.(userMessage, 'warning');
      }
  }

  // Log the error
  globalConfig.logError?.(error, error);
}

/**
 * Convert unknown error to ApiErrorResponse format
 */
export function normalizeError(error: unknown): ApiErrorResponse {
  // Already an API error response
  if (isApiErrorResponse(error)) {
    return error;
  }

  // Fetch/network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      statusCode: 0,
      message: 'Network request failed',
      errorCode: NetworkErrorCode.CONNECTION_FAILED,
    };
  }

  // AbortError (request cancelled)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      statusCode: 0,
      message: 'Request was cancelled',
      errorCode: NetworkErrorCode.TIMEOUT,
    };
  }

  // Standard Error
  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: error.message,
      errorCode: ServerErrorCode.INTERNAL_ERROR,
    };
  }

  // Unknown error
  return {
    statusCode: 500,
    message: 'An unexpected error occurred',
    errorCode: ServerErrorCode.INTERNAL_ERROR,
  };
}

/**
 * Type guard for API error response
 */
function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as ApiErrorResponse).statusCode === 'number'
  );
}

/**
 * Main error handler function
 * Processes an error and triggers appropriate UX behavior
 */
export function handleError(
  error: unknown,
  options: {
    suppressGlobalHandling?: boolean;
    customMessages?: Partial<Record<ErrorCode | string, string>>;
  } = {}
): ProcessedError {
  const normalized = normalizeError(error);
  const processed = processApiError(normalized, options.customMessages);

  if (!options.suppressGlobalHandling) {
    handleErrorByStatus(processed);
  }

  return processed;
}

/**
 * Create an error handler with custom configuration
 */
export function createErrorHandler(config: ErrorHandlerConfig) {
  return (error: unknown, suppressGlobalHandling = false): ProcessedError => {
    const oldConfig = globalConfig;
    globalConfig = { ...oldConfig, ...config };

    try {
      return handleError(error, { suppressGlobalHandling, customMessages: config.customMessages });
    } finally {
      globalConfig = oldConfig;
    }
  };
}

export default {
  configureErrorHandler,
  handleError,
  processApiError,
  normalizeError,
  createErrorHandler,
};
