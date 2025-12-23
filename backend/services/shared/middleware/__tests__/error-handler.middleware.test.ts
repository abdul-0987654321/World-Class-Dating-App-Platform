/**
 * Error Handler Middleware Tests
 * Comprehensive tests for the error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorHandlerMiddleware,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  asyncHandler,
  notFoundHandler,
  StandardError,
} from '../error-handler.middleware';

// Mock Logger
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  })),
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      path: '/api/test',
      method: 'GET',
      correlationId: 'test-correlation-id-123',
    } as any;

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('AppError Class', () => {
    it('should create error with correct properties', () => {
      const error = new AppError(400, 'Test error message', { field: 'test' });

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.name).toBe('AppError');
      expect(error.stack).toBeDefined();
    });

    it('should create error without details', () => {
      const error = new AppError(500, 'Server error');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Server error');
      expect(error.details).toBeUndefined();
    });
  });

  describe('ValidationError Class', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ValidationError');
    });

    it('should create validation error without details', () => {
      const error = new ValidationError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
    });
  });

  describe('UnauthorizedError Class', () => {
    it('should create unauthorized error with 401 status', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid token');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should use default message when none provided', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError Class', () => {
    it('should create forbidden error with 403 status', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
      expect(error.name).toBe('ForbiddenError');
    });

    it('should use default message when none provided', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('NotFoundError Class', () => {
    it('should create not found error with 404 status', () => {
      const error = new NotFoundError('User not found');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.name).toBe('NotFoundError');
    });

    it('should use default message when none provided', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ConflictError Class', () => {
    it('should create conflict error with 409 status', () => {
      const error = new ConflictError('Email already exists', { email: 'test@test.com' });

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
      expect(error.details).toEqual({ email: 'test@test.com' });
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('TooManyRequestsError Class', () => {
    it('should create rate limit error with 429 status', () => {
      const error = new TooManyRequestsError('Rate limit exceeded', 60);

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.retryAfter).toBe(60);
      expect(error.details).toEqual({ retryAfter: 60 });
      expect(error.name).toBe('TooManyRequestsError');
    });

    it('should use default message when none provided', () => {
      const error = new TooManyRequestsError();

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests');
    });
  });

  describe('InternalServerError Class', () => {
    it('should create internal server error with 500 status', () => {
      const error = new InternalServerError('Database connection failed');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Database connection failed');
      expect(error.name).toBe('InternalServerError');
    });

    it('should use default message when none provided', () => {
      const error = new InternalServerError();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
    });
  });

  describe('ServiceUnavailableError Class', () => {
    it('should create service unavailable error with 503 status', () => {
      const error = new ServiceUnavailableError('Database maintenance');

      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Database maintenance');
      expect(error.name).toBe('ServiceUnavailableError');
    });

    it('should use default message when none provided', () => {
      const error = new ServiceUnavailableError();

      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Service temporarily unavailable');
    });
  });

  describe('errorHandlerMiddleware', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError(400, 'Bad request', { field: 'email' });

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Bad request',
          error: 'AppError',
          correlationId: 'test-correlation-id-123',
          path: '/api/test',
          details: { field: 'email' },
        })
      );
    });

    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid email format');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid email format',
          error: 'ValidationError',
        })
      );
    });

    it('should handle UnauthorizedError correctly', () => {
      const error = new UnauthorizedError('Token expired');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Token expired',
          error: 'UnauthorizedError',
        })
      );
    });

    it('should handle ForbiddenError correctly', () => {
      const error = new ForbiddenError('Access denied');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied',
          error: 'ForbiddenError',
        })
      );
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('User not found');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User not found',
          error: 'NotFoundError',
        })
      );
    });

    it('should handle TooManyRequestsError correctly', () => {
      const error = new TooManyRequestsError('Rate limit exceeded', 120);

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(429);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          message: 'Rate limit exceeded',
          error: 'TooManyRequestsError',
        })
      );
    });

    it('should handle unknown errors as 500 Internal Server Error', () => {
      const error = new Error('Something went wrong');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          error: 'InternalServerError',
        })
      );
    });

    it('should convert unknown errors to INTERNAL_ERROR', () => {
      const error = new Error('Database connection lost');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(500);
      // The response should contain generic message for unknown errors
      const callArg = responseJson.mock.calls[0][0] as StandardError;
      expect(callArg.statusCode).toBe(500);
    });

    it('should include correlation ID in response', () => {
      const error = new AppError(400, 'Test error');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation-id-123',
        })
      );
    });

    it('should include timestamp in response', () => {
      const error = new AppError(400, 'Test error');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArg = responseJson.mock.calls[0][0] as StandardError;
      expect(callArg.timestamp).toBeDefined();
      expect(new Date(callArg.timestamp).toISOString()).toBe(callArg.timestamp);
    });

    it('should include path in response', () => {
      const error = new AppError(400, 'Test error');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/test',
        })
      );
    });

    it('should never expose stack traces in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal error with stack trace');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArg = responseJson.mock.calls[0][0];
      expect(callArg.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack traces in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Internal error with stack trace');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArg = responseJson.mock.calls[0][0];
      expect(callArg.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors by name when not AppError instances', () => {
      const error = new Error('Test error');
      error.name = 'ValidationError';

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should handle errors containing "Unauthorized" in message', () => {
      const error = new Error('Unauthorized access attempt');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(401);
    });

    it('should handle errors containing "Forbidden" in message', () => {
      const error = new Error('Forbidden resource access');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(403);
    });

    it('should handle errors containing "not found" in message', () => {
      const error = new Error('Resource not found');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(404);
    });

    it('should return standard response format', () => {
      const error = new AppError(400, 'Test error');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArg = responseJson.mock.calls[0][0] as StandardError;
      expect(callArg).toHaveProperty('statusCode');
      expect(callArg).toHaveProperty('message');
      expect(callArg).toHaveProperty('error');
      expect(callArg).toHaveProperty('timestamp');
      expect(callArg).toHaveProperty('path');
    });
  });

  describe('asyncHandler', () => {
    it('should pass resolved promise results through', async () => {
      const handler = jest.fn().mockResolvedValue('success');
      const wrapped = asyncHandler(handler);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch rejected promises and pass to next', async () => {
      const error = new Error('Async error');
      const handler = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(handler);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const handler = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrapped = asyncHandler(handler);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('notFoundHandler', () => {
    it('should create NotFoundError with path information', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('GET');
      expect(error.message).toContain('/api/test');
    });

    it('should include HTTP method in error message', () => {
      (mockRequest as any).method = 'POST';
      (mockRequest as any).path = '/api/users';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('POST');
      expect(error.message).toContain('/api/users');
    });
  });

  describe('HTTP Status Code Mapping', () => {
    const testCases = [
      { ErrorClass: ValidationError, expectedStatus: 400, name: 'ValidationError' },
      { ErrorClass: UnauthorizedError, expectedStatus: 401, name: 'UnauthorizedError' },
      { ErrorClass: ForbiddenError, expectedStatus: 403, name: 'ForbiddenError' },
      { ErrorClass: NotFoundError, expectedStatus: 404, name: 'NotFoundError' },
      { ErrorClass: ConflictError, expectedStatus: 409, name: 'ConflictError' },
      { ErrorClass: TooManyRequestsError, expectedStatus: 429, name: 'TooManyRequestsError' },
      { ErrorClass: InternalServerError, expectedStatus: 500, name: 'InternalServerError' },
      { ErrorClass: ServiceUnavailableError, expectedStatus: 503, name: 'ServiceUnavailableError' },
    ];

    testCases.forEach(({ ErrorClass, expectedStatus, name }) => {
      it(`should map ${name} to HTTP ${expectedStatus}`, () => {
        const error = name === 'ConflictError'
          ? new ErrorClass('Test message', {})
          : name === 'TooManyRequestsError'
          ? new (ErrorClass as typeof TooManyRequestsError)('Test message', 60)
          : new ErrorClass('Test message');

        errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(responseStatus).toHaveBeenCalledWith(expectedStatus);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error gracefully', () => {
      expect(() => {
        errorHandlerMiddleware(null as any, mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle undefined error gracefully', () => {
      expect(() => {
        errorHandlerMiddleware(undefined as any, mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle error without message', () => {
      const error = new Error();

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(500);
    });

    it('should handle request without correlationId', () => {
      delete (mockRequest as any).correlationId;
      const error = new AppError(400, 'Test error');

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new AppError(400, longMessage);

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArg = responseJson.mock.calls[0][0] as StandardError;
      expect(callArg.message).toBe(longMessage);
    });

    it('should handle special characters in error messages', () => {
      const specialMessage = '<script>alert("xss")</script>';
      const error = new AppError(400, specialMessage);

      errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArg = responseJson.mock.calls[0][0] as StandardError;
      expect(callArg.message).toBe(specialMessage);
    });
  });
});
