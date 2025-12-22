/**
 * Error Handling Integration Tests
 * End-to-end tests for the error handling flow
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, isApiError, Errors, type ApiErrorResponse } from '../api-error';
import {
  createErrorMiddleware,
  correlationIdMiddleware,
  asyncHandler,
  notFoundHandler,
} from '../error-middleware';
import {
  AuthErrorCode,
  PermissionErrorCode,
  ValidationErrorCode,
  ResourceErrorCode,
  InternalErrorCode,
  RateLimitErrorCode,
  type ErrorCode,
} from '../error-codes';
import { getHttpStatus, isClientError, isServerError } from '../http-status-mapping';
import { getErrorMessage } from '../error-messages';

describe('Error Handling Integration', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockLogger: { error: jest.Mock; warn: jest.Mock };

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockSetHeader = jest.fn();
    mockLogger = { error: jest.fn(), warn: jest.fn() };

    mockRequest = {
      path: '/api/v1/users',
      method: 'GET',
      headers: {},
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
      setHeader: mockSetHeader,
    };

    mockNext = jest.fn();
  });

  describe('End-to-End Error Flow', () => {
    describe('ApiError -> Middleware -> Response', () => {
      it('should properly propagate ApiError through middleware', async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = new ApiError({
          code: AuthErrorCode.AUTH_TOKEN_EXPIRED,
          message: 'Token has expired',
        });

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalled();

        const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
        expect(response.success).toBe(false);
        expect(response.error.code).toBe(AuthErrorCode.AUTH_TOKEN_EXPIRED);
        expect(response.error.correlationId).toBeDefined();
        expect(response.error.timestamp).toBeDefined();
      });

      it('should convert unknown errors to UNHANDLED_EXCEPTION', async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = new Error('Something unexpected happened');

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(500);

        const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
        expect(response.error.code).toBe(InternalErrorCode.UNHANDLED_EXCEPTION);
      });

      it('should include correlation ID in response headers', async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const correlationId = 'test-correlation-123';
        const error = new ApiError({
          code: ValidationErrorCode.VALIDATION_FAILED,
          correlationId,
        });

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockSetHeader).toHaveBeenCalledWith('X-Correlation-ID', correlationId);
      });

      it('should include Retry-After header for rate limit errors', async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = new ApiError({
          code: RateLimitErrorCode.RATE_LIMIT_EXCEEDED,
          retryAfter: 60,
        });

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockSetHeader).toHaveBeenCalledWith('Retry-After', 60);
      });

      it('should never expose stack trace in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const middleware = createErrorMiddleware({
          logger: mockLogger,
          includeStackTrace: false,
        });
        const error = new ApiError({
          code: InternalErrorCode.INTERNAL_ERROR,
        });

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        const response = mockJson.mock.calls[0][0] as any;
        expect(response.error.stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Correlation ID Propagation', () => {
      it('should propagate correlation ID from request header', async () => {
        const correlationId = 'incoming-correlation-id';
        mockRequest.headers = { 'x-correlation-id': correlationId };

        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = new Error('Test error');

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
        expect(response.error.correlationId).toBe(correlationId);
      });

      it('should generate new correlation ID when not provided', async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = new Error('Test error');

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
        expect(response.error.correlationId).toBeDefined();
        expect(response.error.correlationId.length).toBeGreaterThan(0);
      });

      it('should add correlation ID via middleware', () => {
        correlationIdMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect((mockRequest as any).correlationId).toBeDefined();
        expect(mockSetHeader).toHaveBeenCalledWith(
          'X-Correlation-ID',
          expect.any(String)
        );
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Error Helper Functions', () => {
      it('should create and handle 404 errors correctly', async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = Errors.notFound('User not found');

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(404);
        const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
        expect(response.error.message).toBe('User not found');
      });

      it('should create and handle validation errors with details', async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = Errors.badRequest('Validation failed', [
          { field: 'email', message: 'Invalid email format' },
        ]);

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
        expect(response.error.details).toBeDefined();
        expect(response.error.details![0].field).toBe('email');
      });

      it('should create and handle rate limit errors with retry info', async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = Errors.tooManyRequests(120);

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(429);
        expect(mockSetHeader).toHaveBeenCalledWith('Retry-After', 120);
      });
    });

    describe('Async Handler Integration', () => {
      it('should catch and forward async errors', async () => {
        const asyncError = new ApiError({
          code: ResourceErrorCode.RESOURCE_NOT_FOUND,
        });

        const handler = asyncHandler(async () => {
          throw asyncError;
        });

        await handler(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(asyncError);
      });

      it('should forward async errors to error middleware', async () => {
        const errorMiddleware = createErrorMiddleware({ logger: mockLogger });
        const asyncError = new ApiError({
          code: AuthErrorCode.AUTH_INVALID_CREDENTIALS,
        });

        const handler = asyncHandler(async () => {
          throw asyncError;
        });

        // Simulate the full flow
        await handler(mockRequest as Request, mockResponse as Response, async (err) => {
          await errorMiddleware(err!, mockRequest as Request, mockResponse as Response, mockNext);
        });

        expect(mockStatus).toHaveBeenCalledWith(401);
      });
    });

    describe('Not Found Handler Integration', () => {
      it('should create proper 404 error for unmatched routes', async () => {
        const errorMiddleware = createErrorMiddleware({ logger: mockLogger });

        notFoundHandler(mockRequest as Request, mockResponse as Response, async (err) => {
          await errorMiddleware(err!, mockRequest as Request, mockResponse as Response, mockNext);
        });

        expect(mockStatus).toHaveBeenCalledWith(404);
        const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
        expect(response.error.message).toContain('GET');
        expect(response.error.message).toContain('/api/v1/users');
      });
    });
  });

  describe('Error Code to HTTP Status Consistency', () => {
    const errorCodeTestCases: Array<{
      code: ErrorCode;
      expectedStatus: number;
      isClient: boolean;
    }> = [
      { code: AuthErrorCode.AUTH_INVALID_CREDENTIALS, expectedStatus: 401, isClient: true },
      { code: AuthErrorCode.AUTH_TOKEN_EXPIRED, expectedStatus: 401, isClient: true },
      { code: PermissionErrorCode.PERM_DENIED, expectedStatus: 403, isClient: true },
      { code: ValidationErrorCode.VALIDATION_FAILED, expectedStatus: 400, isClient: true },
      { code: ResourceErrorCode.RESOURCE_NOT_FOUND, expectedStatus: 404, isClient: true },
      { code: InternalErrorCode.INTERNAL_ERROR, expectedStatus: 500, isClient: false },
      { code: RateLimitErrorCode.RATE_LIMIT_EXCEEDED, expectedStatus: 429, isClient: true },
    ];

    errorCodeTestCases.forEach(({ code, expectedStatus, isClient }) => {
      it(`should map ${code} to ${expectedStatus} and isClientError=${isClient}`, async () => {
        const middleware = createErrorMiddleware({ logger: mockLogger });
        const error = new ApiError({ code });

        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(expectedStatus);
        expect(isClientError(code)).toBe(isClient);
        expect(isServerError(code)).toBe(!isClient);
      });
    });
  });

  describe('Error Message Sanitization', () => {
    it('should use user-safe message from registry', async () => {
      const middleware = createErrorMiddleware({ logger: mockLogger });
      const error = new ApiError({
        code: AuthErrorCode.AUTH_INVALID_CREDENTIALS,
      });

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
      expect(response.error.message).toBe(
        getErrorMessage(AuthErrorCode.AUTH_INVALID_CREDENTIALS)
      );
    });

    it('should allow custom message override', async () => {
      const middleware = createErrorMiddleware({ logger: mockLogger });
      const customMessage = 'Custom authentication error message';
      const error = new ApiError({
        code: AuthErrorCode.AUTH_INVALID_CREDENTIALS,
        message: customMessage,
      });

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
      expect(response.error.message).toBe(customMessage);
    });

    it('should never expose internal error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const middleware = createErrorMiddleware({
        logger: mockLogger,
        includeStackTrace: false,
      });

      // Simulate an error with sensitive info
      const internalError = new Error('Database connection string: postgres://user:pass@host/db');
      const error = ApiError.fromError(internalError);

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
      // Message should be sanitized
      expect(response.error.message).not.toContain('postgres://');
      expect(response.error.message).not.toContain('pass@host');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Logging Integration', () => {
    it('should log 5xx errors with error level', async () => {
      const middleware = createErrorMiddleware({ logger: mockLogger });
      const error = new ApiError({
        code: InternalErrorCode.INTERNAL_ERROR,
      });

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should log 4xx errors with warn level', async () => {
      const middleware = createErrorMiddleware({ logger: mockLogger });
      const error = new ApiError({
        code: ValidationErrorCode.VALIDATION_FAILED,
      });

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should include request context in logs', async () => {
      const middleware = createErrorMiddleware({ logger: mockLogger });
      const error = new ApiError({
        code: InternalErrorCode.INTERNAL_ERROR,
      });

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const logCall = mockLogger.error.mock.calls[0];
      expect(logCall[1]).toMatchObject({
        path: '/api/v1/users',
        method: 'GET',
      });
    });
  });

  describe('Response Format Consistency', () => {
    it('should always return success: false', async () => {
      const middleware = createErrorMiddleware({ logger: mockLogger });

      const testCodes = [
        AuthErrorCode.AUTH_TOKEN_EXPIRED,
        ValidationErrorCode.VALIDATION_FAILED,
        InternalErrorCode.INTERNAL_ERROR,
      ];

      for (const code of testCodes) {
        mockJson.mockClear();
        const error = new ApiError({ code });
        await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
        expect(response.success).toBe(false);
      }
    });

    it('should always include required fields', async () => {
      const middleware = createErrorMiddleware({ logger: mockLogger });
      const error = new ApiError({ code: InternalErrorCode.INTERNAL_ERROR });

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = mockJson.mock.calls[0][0] as ApiErrorResponse;
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('correlationId');
      expect(response.error).toHaveProperty('timestamp');
    });
  });

  describe('Type Safety', () => {
    it('should correctly identify ApiError instances', () => {
      const apiError = new ApiError({ code: InternalErrorCode.INTERNAL_ERROR });
      const regularError = new Error('Regular error');
      const object = { code: 'INTERNAL_ERROR' };

      expect(isApiError(apiError)).toBe(true);
      expect(isApiError(regularError)).toBe(false);
      expect(isApiError(object)).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
    });
  });
});
