/**
 * Flamoral Dating Platform - API Error Class
 * Standard error class for all API errors
 */

import { ErrorCode, InternalErrorCode } from './error-codes';
import { getHttpStatus } from './http-status-mapping';
import { getErrorMessage } from './error-messages';
import { v4 as uuidv4 } from 'uuid';

/**
 * Field-level error for validation failures
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    correlationId: string;
    timestamp: string;
    details?: FieldError[];
    retryAfter?: number;
  };
}

/**
 * Options for creating an API error
 */
export interface ApiErrorOptions {
  code: ErrorCode;
  message?: string;
  details?: FieldError[];
  retryAfter?: number;
  cause?: Error;
  correlationId?: string;
}

/**
 * Standard API Error class
 * Use this class for all API errors to ensure consistent error handling
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly correlationId: string;
  public readonly timestamp: string;
  public readonly details?: FieldError[];
  public readonly retryAfter?: number;
  public readonly cause?: Error;

  constructor(options: ApiErrorOptions) {
    const message = options.message ?? getErrorMessage(options.code);
    super(message);

    this.name = 'ApiError';
    this.code = options.code;
    this.httpStatus = getHttpStatus(options.code);
    this.correlationId = options.correlationId ?? uuidv4();
    this.timestamp = new Date().toISOString();
    this.details = options.details;
    this.retryAfter = options.retryAfter;
    this.cause = options.cause;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Convert to API response format
   */
  toResponse(): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        correlationId: this.correlationId,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details }),
        ...(this.retryAfter && { retryAfter: this.retryAfter }),
      },
    };
  }

  /**
   * Create an ApiError from an unknown error
   */
  static fromError(error: unknown, correlationId?: string): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      return new ApiError({
        code: InternalErrorCode.UNHANDLED_EXCEPTION,
        message: process.env.NODE_ENV === 'production'
          ? getErrorMessage(InternalErrorCode.UNHANDLED_EXCEPTION)
          : error.message,
        cause: error,
        correlationId,
      });
    }

    return new ApiError({
      code: InternalErrorCode.INTERNAL_ERROR,
      correlationId,
    });
  }

  /**
   * Check if the error is retryable
   */
  isRetryable(): boolean {
    const retryableCodes: ErrorCode[] = [
      'INTEGRATION_TIMEOUT',
      'INTEGRATION_UNAVAILABLE',
      'INTEGRATION_RATE_LIMITED',
      'DB_CONNECTION_FAILED',
      'DB_QUERY_TIMEOUT',
      'CACHE_FAILURE',
      'SERVICE_UNAVAILABLE',
      'DEPLOYMENT_IN_PROGRESS',
      'TIMEOUT_EXCEEDED',
      'CIRCUIT_BREAKER_OPEN',
      'RATE_LIMIT_EXCEEDED',
      'ACTION_THROTTLED',
    ] as ErrorCode[];
    return retryableCodes.includes(this.code);
  }

  /**
   * Check if error details should be logged (not client errors)
   */
  shouldLog(): boolean {
    return this.httpStatus >= 500;
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Helper function to create common errors
 */
export const Errors = {
  notFound: (message?: string) => new ApiError({
    code: 'RESOURCE_NOT_FOUND' as ErrorCode,
    message,
  }),

  unauthorized: (message?: string) => new ApiError({
    code: 'AUTH_TOKEN_MISSING' as ErrorCode,
    message,
  }),

  forbidden: (message?: string) => new ApiError({
    code: 'PERM_DENIED' as ErrorCode,
    message,
  }),

  badRequest: (message?: string, details?: FieldError[]) => new ApiError({
    code: 'VALIDATION_FAILED' as ErrorCode,
    message,
    details,
  }),

  conflict: (message?: string) => new ApiError({
    code: 'RESOURCE_CONFLICT' as ErrorCode,
    message,
  }),

  tooManyRequests: (retryAfter?: number) => new ApiError({
    code: 'RATE_LIMIT_EXCEEDED' as ErrorCode,
    retryAfter,
  }),

  internal: (cause?: Error) => new ApiError({
    code: 'INTERNAL_ERROR' as ErrorCode,
    cause,
  }),

  paymentRequired: (message?: string) => new ApiError({
    code: 'SUBSCRIPTION_REQUIRED' as ErrorCode,
    message,
  }),
};
