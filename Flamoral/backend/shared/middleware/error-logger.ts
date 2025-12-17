/**
 * Error Logging Middleware
 * Logs errors with full context and correlation IDs
 */

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { getCorrelationId } from './correlation-id';

interface ErrorLoggerOptions {
  logger: winston.Logger;
  includeStackTrace?: boolean;
}

/**
 * Create error logging middleware
 */
export function createErrorLogger(options: ErrorLoggerOptions) {
  const { logger, includeStackTrace = true } = options;

  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const correlationId = getCorrelationId();

    // Create child logger with correlation ID
    const errorLogger = correlationId
      ? logger.child({ correlationId })
      : logger;

    // Prepare error details
    const errorDetails: any = {
      message: err.message,
      name: err.name,
      method: req.method,
      path: req.path,
      url: req.url,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Add user context if available
    if ((req as any).user) {
      errorDetails.userId = (req as any).user.id;
    }

    // Add stack trace
    if (includeStackTrace && err.stack) {
      errorDetails.stack = err.stack;
    }

    // Add custom error properties
    Object.keys(err).forEach(key => {
      if (!['message', 'name', 'stack'].includes(key)) {
        errorDetails[key] = (err as any)[key];
      }
    });

    // Log error
    errorLogger.error('Unhandled error in request', errorDetails);

    // Pass to next error handler
    next(err);
  };
}

/**
 * Error response handler
 * Sends appropriate error responses to clients
 */
export function createErrorResponseHandler(options: ErrorLoggerOptions) {
  const { logger } = options;

  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const correlationId = getCorrelationId();

    // Determine status code
    const statusCode = (err as any).statusCode || (err as any).status || 500;

    // Prepare error response
    const errorResponse: any = {
      error: {
        message: err.message || 'Internal Server Error',
        correlationId,
      },
    };

    // Add error code if available
    if ((err as any).code) {
      errorResponse.error.code = (err as any).code;
    }

    // In development, include stack trace
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error.stack = err.stack;
    }

    // Send response
    res.status(statusCode).json(errorResponse);
  };
}
