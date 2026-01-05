/**
 * Flamoral Global Error Handler Middleware
 *
 * A comprehensive Express error handler that:
 * - Catches all errors thrown by endpoints
 * - Converts them to the standard API error format
 * - Never exposes raw exceptions or stack traces to clients
 * - Includes correlation IDs for request tracing
 * - Logs errors with appropriate severity levels
 *
 * This middleware should be registered LAST in the Express app middleware chain.
 */

import { Request, Response, NextFunction } from 'express';

import {
  ApiError,
  isApiError,
  ErrorCode,
  InternalErrorCode,
  getHttpStatus,
  getErrorMessage,
} from '../errors';
import createLogger from '../utils/logger';

// Create logger for error handling
const logger = createLogger('error-handler');

/**
 * Extended Request interface with correlation ID
 */
export interface RequestWithCorrelationId extends Omit<Request, 'user'> {
  correlationId?: string;
  user?: {
    id?: string;
    userId?: string;
    email?: string;
    [key: string]: any;
  };
}

/**
 * Standard error response format
 * This format is enforced for ALL error responses from the backend
 */
export interface StandardErrorResponse {
  status: number;
  errorCode: string;
  message: string;
  correlationId: string;
  details: Record<string, unknown> | null;
}

/**
 * Internal log format for error tracking
 */
interface ErrorLogPayload {
  correlationId: string;
  errorCode: string;
  statusCode: number;
  message: string;
  path: string;
  method: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
  stack?: string;
  cause?: string;
}

/**
 * Get sanitized error message for production
 * Never expose internal error details to clients
 */
function getSafeErrorMessage(error: Error, statusCode: number): string {
  // In production, use generic messages for server errors
  if (process.env.NODE_ENV === 'production') {
    if (statusCode >= 500) {
      return 'An unexpected error occurred. Please try again later.';
    }

    // For client errors, check if we have a user-safe message
    if (error instanceof ApiError) {
      return error.message;
    }

    // Default client error messages by status code
    const clientMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Authentication required. Please log in.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'A conflict occurred with the current state.',
      422: 'Unable to process the request.',
      429: 'Too many requests. Please try again later.',
    };

    return clientMessages[statusCode] || 'An error occurred processing your request.';
  }

  // In development, return actual error message
  return error.message;
}

/**
 * Extract error code from various error types
 */
function getErrorCode(error: Error): string {
  if (error instanceof ApiError) {
    return error.code;
  }

  // Check for common error names
  if (error.name === 'ValidationError') {
    return 'VALIDATION_FAILED';
  }

  if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
    return 'AUTH_TOKEN_INVALID';
  }

  if (error.name === 'NotFoundError' || error.message.toLowerCase().includes('not found')) {
    return 'RESOURCE_NOT_FOUND';
  }

  return InternalErrorCode.INTERNAL_ERROR;
}

/**
 * Extract HTTP status code from error
 */
function getStatusCode(error: Error): number {
  // If it's an ApiError, use its status
  if (error instanceof ApiError) {
    return error.httpStatus;
  }

  // Check for statusCode property (common pattern)
  if ('statusCode' in error && typeof (error as any).statusCode === 'number') {
    return (error as any).statusCode;
  }

  // Check for status property
  if ('status' in error && typeof (error as any).status === 'number') {
    return (error as any).status;
  }

  // Infer from error code
  const errorCode = getErrorCode(error) as ErrorCode;
  try {
    return getHttpStatus(errorCode);
  } catch {
    return 500;
  }
}

/**
 * Extract correlation ID from request
 */
function getCorrelationId(req: RequestWithCorrelationId): string {
  return (
    req.correlationId ||
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    'unknown'
  );
}

/**
 * Extract client IP address
 */
function getClientIp(req: RequestWithCorrelationId): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp as string;
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Log error with appropriate severity
 */
function logError(error: Error, payload: ErrorLogPayload): void {
  const logData = {
    ...payload,
    // Only include stack trace in non-production environments
    stack: process.env.NODE_ENV !== 'production' ? payload.stack : undefined,
  };

  // Log based on severity
  if (payload.statusCode >= 500) {
    logger.error('Server error occurred', logData);
  } else if (payload.statusCode >= 400) {
    logger.warn('Client error occurred', logData);
  } else {
    logger.info('Error handled', logData);
  }
}

/**
 * Build the standard error response
 */
function buildErrorResponse(error: Error, correlationId: string): StandardErrorResponse {
  const statusCode = getStatusCode(error);
  const errorCode = getErrorCode(error);
  const message = getSafeErrorMessage(error, statusCode);

  // Get details if available (for validation errors)
  let details: Record<string, unknown> | null = null;

  if (error instanceof ApiError && error.details) {
    // Only include details for client errors in production
    if (process.env.NODE_ENV !== 'production' || statusCode < 500) {
      details = { fields: error.details };
    }
  }

  return {
    status: statusCode,
    errorCode,
    message,
    correlationId,
    details,
  };
}

/**
 * Global Error Handler Middleware
 *
 * This middleware catches all errors and returns a standardized error response.
 * It MUST be registered last in the middleware chain.
 *
 * @example
 * ```typescript
 * // Register at the end of your Express app setup
 * app.use(correlationIdMiddleware);
 * app.use('/api', routes);
 * app.use(errorHandlerMiddleware); // MUST be last
 * ```
 */
export function errorHandlerMiddleware(
  error: Error,
  req: RequestWithCorrelationId,
  res: Response,
  _next: NextFunction
): void {
  // Get correlation ID
  const correlationId = getCorrelationId(req);

  // Build log payload
  const logPayload: ErrorLogPayload = {
    correlationId,
    errorCode: getErrorCode(error),
    statusCode: getStatusCode(error),
    message: error.message,
    path: req.originalUrl || req.path,
    method: req.method,
    userId: req.user?.id || req.user?.userId,
    userAgent: req.headers['user-agent'],
    ip: getClientIp(req),
    timestamp: new Date().toISOString(),
    stack: error.stack,
    cause: error.cause instanceof Error ? error.cause.message : undefined,
  };

  // Log the error
  logError(error, logPayload);

  // Build response
  const errorResponse = buildErrorResponse(error, correlationId);

  // Set correlation ID header for client reference
  res.setHeader('X-Correlation-ID', correlationId);

  // Set retry-after header if applicable
  if (error instanceof ApiError && error.retryAfter) {
    res.setHeader('Retry-After', error.retryAfter.toString());
  }

  // Send response
  // Never expose stack traces in the response
  res.status(errorResponse.status).json(errorResponse);
}

/**
 * 404 Not Found Handler
 * Use this middleware before the error handler to catch unmatched routes
 */
export function notFoundHandler(
  req: RequestWithCorrelationId,
  _res: Response,
  next: NextFunction
): void {
  const error = new ApiError({
    code: 'RESOURCE_NOT_FOUND' as ErrorCode,
    message: `Route ${req.method} ${req.path} not found`,
    correlationId: req.correlationId,
  });

  next(error);
}

/**
 * Initialize global error handlers for uncaught exceptions and unhandled rejections
 * Call this once during application startup
 */
export function initializeGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled Promise Rejection', {
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });

    // In production, consider graceful shutdown
    if (process.env.NODE_ENV === 'production') {
      // Give time for logging, then exit
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });

    // Uncaught exceptions are critical - must restart process
    process.exit(1);
  });

  logger.info('Global error handlers initialized');
}

export default errorHandlerMiddleware;
