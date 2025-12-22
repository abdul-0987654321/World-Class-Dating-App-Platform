/**
 * Flamoral Application Error Class
 *
 * Custom error class that encapsulates:
 * - Standard error code from the registry
 * - HTTP status code
 * - User-safe message
 * - Optional additional details
 *
 * All backend services should throw AppError instances for consistent error handling.
 */

import { ErrorCode, ErrorCodeValue } from './error-codes';
import { getHttpStatus, getUserMessage } from './http-status-mapping';

/**
 * Application error with standardized fields
 */
export class AppError extends Error {
  /**
   * The standard error code from the error registry
   */
  public readonly errorCode: ErrorCode | ErrorCodeValue | string;

  /**
   * HTTP status code to return
   */
  public readonly statusCode: number;

  /**
   * User-safe message that can be displayed to end users
   */
  public readonly userMessage: string;

  /**
   * Additional error details (validation errors, field info, etc.)
   */
  public readonly details: Record<string, unknown> | null;

  /**
   * Whether this is an operational error (expected) vs programmer error (bug)
   */
  public readonly isOperational: boolean;

  /**
   * Timestamp when the error was created
   */
  public readonly timestamp: string;

  constructor(
    errorCode: ErrorCode | ErrorCodeValue | string,
    options: {
      message?: string;
      statusCode?: number;
      userMessage?: string;
      details?: Record<string, unknown>;
      isOperational?: boolean;
      cause?: Error;
    } = {}
  ) {
    const resolvedStatusCode = options.statusCode ?? getHttpStatus(errorCode);
    const resolvedUserMessage = options.userMessage ?? getUserMessage(errorCode);

    super(options.message || resolvedUserMessage);

    this.name = 'AppError';
    this.errorCode = errorCode;
    this.statusCode = resolvedStatusCode;
    this.userMessage = resolvedUserMessage;
    this.details = options.details ?? null;
    this.isOperational = options.isOperational ?? true;
    this.timestamp = new Date().toISOString();

    // Capture stack trace, excluding constructor call
    Error.captureStackTrace(this, this.constructor);

    // Preserve cause for error chaining
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Create error response object for API responses
   */
  public toResponseObject(correlationId?: string): ErrorResponseObject {
    return {
      status: this.statusCode,
      errorCode: this.errorCode as string,
      message: this.userMessage,
      correlationId: correlationId ?? null,
      details: this.details,
    };
  }

  /**
   * Create error for logging (includes internal details)
   */
  public toLogObject(correlationId?: string): ErrorLogObject {
    return {
      errorCode: this.errorCode as string,
      statusCode: this.statusCode,
      message: this.message,
      userMessage: this.userMessage,
      details: this.details,
      correlationId: correlationId ?? null,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
      stack: this.stack,
    };
  }

  /**
   * Check if this error should be reported to error tracking (Sentry, etc.)
   */
  public shouldReport(): boolean {
    // Only report non-operational errors (bugs) and server errors
    return !this.isOperational || this.statusCode >= 500;
  }
}

/**
 * Standard error response format for API responses
 */
export interface ErrorResponseObject {
  status: number;
  errorCode: string;
  message: string;
  correlationId: string | null;
  details: Record<string, unknown> | null;
}

/**
 * Error log object format for internal logging
 */
export interface ErrorLogObject {
  errorCode: string;
  statusCode: number;
  message: string;
  userMessage: string;
  details: Record<string, unknown> | null;
  correlationId: string | null;
  timestamp: string;
  isOperational: boolean;
  stack?: string;
}

// ============================================================================
// CONVENIENCE ERROR FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a validation error
 */
export function validationError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError('VALIDATION_FAILED', {
    message,
    statusCode: 400,
    details,
  });
}

/**
 * Create an authentication error
 */
export function authenticationError(
  errorCode: string = 'AUTH_TOKEN_INVALID',
  message?: string
): AppError {
  return new AppError(errorCode, {
    message,
    statusCode: 401,
  });
}

/**
 * Create a forbidden error
 */
export function forbiddenError(message?: string): AppError {
  return new AppError('PERM_DENIED', {
    message,
    statusCode: 403,
  });
}

/**
 * Create a not found error
 */
export function notFoundError(
  resource: string = 'Resource',
  message?: string
): AppError {
  return new AppError('RESOURCE_NOT_FOUND', {
    message: message ?? `${resource} not found`,
    statusCode: 404,
    details: { resource },
  });
}

/**
 * Create a conflict error
 */
export function conflictError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError('RESOURCE_CONFLICT', {
    message,
    statusCode: 409,
    details,
  });
}

/**
 * Create a rate limit error
 */
export function rateLimitError(
  retryAfterSeconds?: number,
  message?: string
): AppError {
  return new AppError('RATE_LIMIT_EXCEEDED', {
    message,
    statusCode: 429,
    details: retryAfterSeconds ? { retryAfterSeconds } : undefined,
  });
}

/**
 * Create an internal server error
 */
export function internalError(
  message?: string,
  cause?: Error
): AppError {
  return new AppError('INTERNAL_ERROR', {
    message: message ?? 'An unexpected error occurred',
    statusCode: 500,
    isOperational: false,
    cause,
  });
}

/**
 * Create a service unavailable error
 */
export function serviceUnavailableError(message?: string): AppError {
  return new AppError('SERVICE_UNAVAILABLE', {
    message,
    statusCode: 503,
  });
}

/**
 * Check if an error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
