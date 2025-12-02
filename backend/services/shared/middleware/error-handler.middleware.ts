import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

export interface StandardError {
  statusCode: number;
  message: string;
  error: string;
  correlationId?: string;
  timestamp: string;
  path: string;
  details?: any;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests', public retryAfter?: number) {
    super(429, message, { retryAfter });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(503, message);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandlerMiddleware(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const logger = new Logger('ErrorHandler');
  const correlationId = (req as any).correlationId;

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let errorName = 'InternalServerError';
  let details: any = undefined;

  // Handle known errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorName = error.name;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    errorName = 'ValidationError';
  } else if (error.name === 'UnauthorizedError' || error.message.includes('Unauthorized')) {
    statusCode = 401;
    message = 'Unauthorized';
    errorName = 'UnauthorizedError';
  } else if (error.name === 'ForbiddenError' || error.message.includes('Forbidden')) {
    statusCode = 403;
    message = 'Forbidden';
    errorName = 'ForbiddenError';
  } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
    statusCode = 404;
    message = error.message || 'Resource not found';
    errorName = 'NotFoundError';
  }

  // Build error response
  const errorResponse: StandardError = {
    statusCode,
    message,
    error: errorName,
    correlationId,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  if (details) {
    errorResponse.details = details;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error occurred', {
      correlationId,
      statusCode,
      message,
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
  } else if (statusCode >= 400) {
    logger.warn('Client error occurred', {
      correlationId,
      statusCode,
      message,
      path: req.path,
      method: req.method,
    });
  }

  // Don't expose stack trace in production
  if (process.env.NODE_ENV !== 'production' && error.stack) {
    (errorResponse as any).stack = error.stack;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}
