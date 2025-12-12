import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: any[];
}

/**
 * Error types classification
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  SERVER = 'SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

/**
 * Custom error class for application errors
 */
export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any[];
  public readonly errorType: ErrorType;

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
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
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
 */
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default to 500 server error if not specified
  const statusCode = error.statusCode || 500;

  // Log the error
  logError(error, req);

  // Sanitize error message
  const message = sanitizeErrorMessage(error, statusCode);

  // Build error response
  const errorResponse: any = {
    success: false,
    error: message,
    code: (error as AppError).errorType || ErrorType.SERVER,
  };

  // Include validation errors if present (safe to expose)
  if ((error as AppError).errors && process.env.NODE_ENV !== 'production') {
    errorResponse.details = (error as AppError).errors;
  }

  // NEVER include stack trace in response
  // NEVER include internal error details in response

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 Not Found errors
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.warn('Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: 'The requested resource was not found.',
    code: ErrorType.NOT_FOUND,
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
