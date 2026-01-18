import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

import logger from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: any[];
  code?: string;
}

/**
 * Error types classification - maps to shared error codes
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_FAILED',
  AUTHENTICATION = 'AUTH_TOKEN_INVALID',
  AUTHORIZATION = 'PERM_DENIED',
  NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  SERVER = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

/**
 * HTTP status codes for each error type
 */
const ERROR_STATUS_CODES: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.SERVER]: 500,
  [ErrorType.BAD_REQUEST]: 400,
};

/**
 * Custom error class for application errors
 */
export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any[];
  public readonly errorType: ErrorType;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    errorType: ErrorType = ErrorType.SERVER,
    isOperational: boolean = true,
    errors?: any[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorType = errorType;
    this.code = errorType;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Get or generate correlation ID from request
 */
function getCorrelationId(req: Request): string {
  return (req.headers['x-correlation-id'] as string) ?? (req as any).correlationId ?? uuidv4();
}

/**
 * Sanitize error message for production
 * Never expose internal details, stack traces, or sensitive information
 */
const sanitizeErrorMessage = (error: Error, statusCode: number): string => {
  // In production, use generic messages
  if (process.env.NODE_ENV === 'production') {
    if (statusCode >= 500) {
      return 'An unexpected error occurred. Please try again later.';
    }

    // For client errors, we can be more specific but still careful
    if (statusCode === 400) {
      return 'Invalid request. Please check your input.';
    }

    if (statusCode === 401) {
      return 'Authentication required. Please log in.';
    }

    if (statusCode === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (statusCode === 404) {
      return 'The requested resource was not found.';
    }

    if (statusCode === 429) {
      return 'Too many requests. Please try again later.';
    }
  }

  // In development, return actual message (but never stack trace)
  return error.message;
};

/**
 * Log error with appropriate level
 */
const logError = (error: ApiError, req: Request): void => {
  const errorInfo = {
    message: error.message,
    statusCode: error.statusCode,
    type: (error as AppError).errorType,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.userId,
  };

  // Log based on severity
  if (error.statusCode && error.statusCode >= 500) {
    logger.error('Server Error', {
      ...errorInfo,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  } else if (error.statusCode && error.statusCode >= 400) {
    logger.warn('Client Error', errorInfo);
  } else {
    logger.error('Unhandled Error', {
      ...errorInfo,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
};

/**
 * Global error handling middleware
 * MUST be placed after all routes
 *
 * Returns standardized error response format:
 * { success: false, error: { code, message, correlationId, timestamp, details? } }
 */
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Get or generate correlation ID
  const correlationId = getCorrelationId(req);

  // Default to 500 server error if not specified
  const statusCode = error.statusCode || 500;

  // Get error code from error or derive from status
  const errorCode = error.code || (error as AppError).errorType ||
    (statusCode === 400 ? ErrorType.BAD_REQUEST :
     statusCode === 401 ? ErrorType.AUTHENTICATION :
     statusCode === 403 ? ErrorType.AUTHORIZATION :
     statusCode === 404 ? ErrorType.NOT_FOUND :
     statusCode === 429 ? ErrorType.RATE_LIMIT :
     ErrorType.SERVER);

  // Log the error
  logError(error, req);

  // Sanitize error message
  const message = sanitizeErrorMessage(error, statusCode);

  // Build standardized error response
  const errorResponse: {
    success: false;
    error: {
      code: string;
      message: string;
      correlationId: string;
      timestamp: string;
      details?: any;
    };
  } = {
    success: false,
    error: {
      code: errorCode,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  };

  // Include validation errors if present (safe to expose in non-production)
  if ((error as AppError).errors && process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = (error as AppError).errors;
  }

  // Set correlation ID header for tracing
  res.setHeader('X-Correlation-ID', correlationId);

  // Send error response with proper HTTP status code
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 Not Found errors
 * Returns standardized error response with correlation ID
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  const correlationId = getCorrelationId(req);

  logger.warn('Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    correlationId,
  });

  res.setHeader('X-Correlation-ID', correlationId);
  res.status(404).json({
    success: false,
    error: {
      code: ErrorType.NOT_FOUND,
      message: 'The requested resource was not found.',
      correlationId,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: Error | any) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: process.env.NODE_ENV !== 'production' ? reason?.stack : undefined,
    });

    // In production, consider graceful shutdown
    if (process.env.NODE_ENV === 'production') {
      // Log to monitoring service
      // Gracefully shutdown if critical
    }
  });
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });

    // Uncaught exceptions are critical - should restart process
    process.exit(1);
  });
};

/**
 * Initialize error handlers
 */
export const initializeErrorHandlers = (): void => {
  handleUnhandledRejection();
  handleUncaughtException();
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ErrorType,
  initializeErrorHandlers,
};
