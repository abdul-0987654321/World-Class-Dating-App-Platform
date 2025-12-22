/**
 * Flamoral Dating Platform - Global Error Middleware
 * Express middleware for consistent error handling across all services
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError, isApiError } from './api-error';
import { InternalErrorCode } from './error-codes';
import { getErrorMessage } from './error-messages';
import { v4 as uuidv4 } from 'uuid';

/**
 * Logger interface for error logging
 */
interface ErrorLogger {
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Default console logger
 */
const defaultLogger: ErrorLogger = {
  error: (message, meta) => console.error(message, meta),
  warn: (message, meta) => console.warn(message, meta),
};

/**
 * Options for the error middleware
 */
export interface ErrorMiddlewareOptions {
  logger?: ErrorLogger;
  includeStackTrace?: boolean;
  onError?: (error: ApiError, req: Request) => void | Promise<void>;
}

/**
 * Create the global error handling middleware
 */
export function createErrorMiddleware(
  options: ErrorMiddlewareOptions = {}
): ErrorRequestHandler {
  const {
    logger = defaultLogger,
    includeStackTrace = process.env.NODE_ENV !== 'production',
    onError,
  } = options;

  return async (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    // Get or create correlation ID
    const correlationId =
      (req.headers['x-correlation-id'] as string) ??
      (req as any).correlationId ??
      uuidv4();

    // Convert to ApiError if not already
    const apiError = isApiError(err)
      ? err
      : ApiError.fromError(err, correlationId);

    // Log the error
    if (apiError.shouldLog()) {
      logger.error('API Error', {
        code: apiError.code,
        message: apiError.message,
        correlationId: apiError.correlationId,
        httpStatus: apiError.httpStatus,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id,
        stack: includeStackTrace ? apiError.stack : undefined,
        cause: apiError.cause?.message,
      });
    } else {
      logger.warn('Client Error', {
        code: apiError.code,
        correlationId: apiError.correlationId,
        path: req.path,
        method: req.method,
      });
    }

    // Call optional error handler
    if (onError) {
      try {
        await onError(apiError, req);
      } catch (handlerError) {
        logger.error('Error in onError handler', { error: handlerError });
      }
    }

    // Set correlation ID header
    res.setHeader('X-Correlation-ID', apiError.correlationId);

    // Set Retry-After header if applicable
    if (apiError.retryAfter) {
      res.setHeader('Retry-After', apiError.retryAfter);
    }

    // Build response
    const response = apiError.toResponse();

    // Add stack trace in development
    if (includeStackTrace && apiError.stack) {
      (response.error as any).stack = apiError.stack;
    }

    // Send response
    res.status(apiError.httpStatus).json(response);
  };
}

/**
 * Middleware to add correlation ID to requests
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string) ?? uuidv4();

  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  next();
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
): (req: T, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler middleware
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new ApiError({
    code: 'RESOURCE_NOT_FOUND' as any,
    message: `Cannot ${req.method} ${req.path}`,
    correlationId: (req as any).correlationId,
  });
  next(error);
}

/**
 * Export default middleware for convenience
 */
export const errorMiddleware = createErrorMiddleware();
