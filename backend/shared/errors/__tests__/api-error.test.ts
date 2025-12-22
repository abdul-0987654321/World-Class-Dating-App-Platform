/**
 * ApiError Class Tests
 * Comprehensive tests for the ApiError class
 */

import {
  ApiError,
  isApiError,
  Errors,
  type FieldError,
  type ApiErrorResponse,
} from '../api-error';
import {
  AuthErrorCode,
  PermissionErrorCode,
  ValidationErrorCode,
  ResourceErrorCode,
  BillingErrorCode,
  RateLimitErrorCode,
  InternalErrorCode,
  type ErrorCode,
} from '../error-codes';
import { getErrorMessage } from '../error-messages';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

describe('ApiError Class', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create error with required properties', () => {
      const error = new ApiError({
        code: AuthErrorCode.AUTH_INVALID_CREDENTIALS,
      });

      expect(error.code).toBe(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
      expect(error.name).toBe('ApiError');
      expect(error.httpStatus).toBe(401);
      expect(error.correlationId).toBeDefined();
      expect(error.timestamp).toBeDefined();
    });

    it('should use default message from error code if not provided', () => {
      const error = new ApiError({
        code: AuthErrorCode.AUTH_INVALID_CREDENTIALS,
      });

      expect(error.message).toBe(getErrorMessage(AuthErrorCode.AUTH_INVALID_CREDENTIALS));
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom error message';
      const error = new ApiError({
        code: AuthErrorCode.AUTH_INVALID_CREDENTIALS,
        message: customMessage,
      });

      expect(error.message).toBe(customMessage);
    });

    it('should accept optional field details', () => {
      const details: FieldError[] = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];

      const error = new ApiError({
        code: ValidationErrorCode.VALIDATION_FAILED,
        details,
      });

      expect(error.details).toEqual(details);
    });

    it('should accept optional retryAfter', () => {
      const error = new ApiError({
        code: RateLimitErrorCode.RATE_LIMIT_EXCEEDED,
        retryAfter: 60,
      });

      expect(error.retryAfter).toBe(60);
    });

    it('should accept optional cause error', () => {
      const cause = new Error('Original error');
      const error = new ApiError({
        code: InternalErrorCode.UNHANDLED_EXCEPTION,
        cause,
      });

      expect(error.cause).toBe(cause);
    });

    it('should use provided correlation ID', () => {
      const correlationId = 'custom-correlation-id';
      const error = new ApiError({
        code: AuthErrorCode.AUTH_TOKEN_EXPIRED,
        correlationId,
      });

      expect(error.correlationId).toBe(correlationId);
    });

    it('should generate correlation ID if not provided', () => {
      const error = new ApiError({
        code: AuthErrorCode.AUTH_TOKEN_EXPIRED,
      });

      expect(error.correlationId).toBe('mock-uuid-12345');
    });

    it('should have valid ISO timestamp', () => {
      const error = new ApiError({
        code: InternalErrorCode.INTERNAL_ERROR,
      });

      const timestamp = new Date(error.timestamp);
      expect(timestamp.toISOString()).toBe(error.timestamp);
    });

    it('should capture stack trace', () => {
      const error = new ApiError({
        code: InternalErrorCode.INTERNAL_ERROR,
      });

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
    });
  });

  describe('HTTP Status Mapping', () => {
    const testCases: Array<{ code: ErrorCode; expectedStatus: number }> = [
      { code: AuthErrorCode.AUTH_INVALID_CREDENTIALS, expectedStatus: 401 },
      { code: AuthErrorCode.AUTH_TOKEN_EXPIRED, expectedStatus: 401 },
      { code: PermissionErrorCode.PERM_DENIED, expectedStatus: 403 },
      { code: ValidationErrorCode.VALIDATION_FAILED, expectedStatus: 400 },
      { code: ResourceErrorCode.RESOURCE_NOT_FOUND, expectedStatus: 404 },
      { code: ResourceErrorCode.RESOURCE_CONFLICT, expectedStatus: 409 },
      { code: BillingErrorCode.SUBSCRIPTION_REQUIRED, expectedStatus: 402 },
      { code: RateLimitErrorCode.RATE_LIMIT_EXCEEDED, expectedStatus: 429 },
      { code: InternalErrorCode.INTERNAL_ERROR, expectedStatus: 500 },
    ];

    testCases.forEach(({ code, expectedStatus }) => {
      it(`should map ${code} to HTTP ${expectedStatus}`, () => {
        const error = new ApiError({ code });
        expect(error.httpStatus).toBe(expectedStatus);
      });
    });
  });

  describe('toResponse()', () => {
    it('should return standard API error response format', () => {
      const error = new ApiError({
        code: ValidationErrorCode.VALIDATION_FAILED,
        message: 'Validation error',
        correlationId: 'test-correlation-id',
      });

      const response = error.toResponse();

      expect(response).toEqual({
        success: false,
        error: {
          code: ValidationErrorCode.VALIDATION_FAILED,
          message: 'Validation error',
          correlationId: 'test-correlation-id',
          timestamp: error.timestamp,
        },
      });
    });

    it('should include details when present', () => {
      const details: FieldError[] = [
        { field: 'email', message: 'Invalid email' },
      ];

      const error = new ApiError({
        code: ValidationErrorCode.VALIDATION_FAILED,
        details,
      });

      const response = error.toResponse();

      expect(response.error.details).toEqual(details);
    });

    it('should include retryAfter when present', () => {
      const error = new ApiError({
        code: RateLimitErrorCode.RATE_LIMIT_EXCEEDED,
        retryAfter: 120,
      });

      const response = error.toResponse();

      expect(response.error.retryAfter).toBe(120);
    });

    it('should not include details when not provided', () => {
      const error = new ApiError({
        code: AuthErrorCode.AUTH_TOKEN_EXPIRED,
      });

      const response = error.toResponse();

      expect(response.error.details).toBeUndefined();
    });

    it('should not include retryAfter when not provided', () => {
      const error = new ApiError({
        code: AuthErrorCode.AUTH_TOKEN_EXPIRED,
      });

      const response = error.toResponse();

      expect(response.error.retryAfter).toBeUndefined();
    });

    it('should have success: false', () => {
      const error = new ApiError({
        code: InternalErrorCode.INTERNAL_ERROR,
      });

      const response = error.toResponse();

      expect(response.success).toBe(false);
    });
  });

  describe('ApiError.fromError()', () => {
    it('should return same ApiError if already an ApiError', () => {
      const originalError = new ApiError({
        code: AuthErrorCode.AUTH_INVALID_CREDENTIALS,
      });

      const result = ApiError.fromError(originalError);

      expect(result).toBe(originalError);
    });

    it('should convert Error to ApiError with UNHANDLED_EXCEPTION code', () => {
      const originalError = new Error('Something went wrong');

      const result = ApiError.fromError(originalError);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(InternalErrorCode.UNHANDLED_EXCEPTION);
      expect(result.cause).toBe(originalError);
    });

    it('should preserve original error message in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const originalError = new Error('Detailed error message');
      const result = ApiError.fromError(originalError);

      expect(result.message).toBe('Detailed error message');

      process.env.NODE_ENV = originalEnv;
    });

    it('should use generic message in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const originalError = new Error('Sensitive internal details');
      const result = ApiError.fromError(originalError);

      expect(result.message).not.toBe('Sensitive internal details');
      expect(result.message).toBe(getErrorMessage(InternalErrorCode.UNHANDLED_EXCEPTION));

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle non-Error objects', () => {
      const result = ApiError.fromError('string error');

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(InternalErrorCode.INTERNAL_ERROR);
    });

    it('should handle null', () => {
      const result = ApiError.fromError(null);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(InternalErrorCode.INTERNAL_ERROR);
    });

    it('should handle undefined', () => {
      const result = ApiError.fromError(undefined);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe(InternalErrorCode.INTERNAL_ERROR);
    });

    it('should accept correlation ID', () => {
      const correlationId = 'provided-correlation-id';
      const originalError = new Error('Test error');

      const result = ApiError.fromError(originalError, correlationId);

      expect(result.correlationId).toBe(correlationId);
    });
  });

  describe('isRetryable()', () => {
    it('should return true for transient errors', () => {
      const retryableErrors = [
        new ApiError({ code: 'INTEGRATION_TIMEOUT' as ErrorCode }),
        new ApiError({ code: 'INTEGRATION_UNAVAILABLE' as ErrorCode }),
        new ApiError({ code: 'INTEGRATION_RATE_LIMITED' as ErrorCode }),
        new ApiError({ code: 'DB_CONNECTION_FAILED' as ErrorCode }),
        new ApiError({ code: 'DB_QUERY_TIMEOUT' as ErrorCode }),
        new ApiError({ code: 'CACHE_FAILURE' as ErrorCode }),
        new ApiError({ code: 'SERVICE_UNAVAILABLE' as ErrorCode }),
        new ApiError({ code: 'DEPLOYMENT_IN_PROGRESS' as ErrorCode }),
        new ApiError({ code: 'TIMEOUT_EXCEEDED' as ErrorCode }),
        new ApiError({ code: 'CIRCUIT_BREAKER_OPEN' as ErrorCode }),
        new ApiError({ code: 'RATE_LIMIT_EXCEEDED' as ErrorCode }),
        new ApiError({ code: 'ACTION_THROTTLED' as ErrorCode }),
      ];

      retryableErrors.forEach((error) => {
        expect(error.isRetryable()).toBe(true);
      });
    });

    it('should return false for non-retryable errors', () => {
      const nonRetryableErrors = [
        new ApiError({ code: AuthErrorCode.AUTH_INVALID_CREDENTIALS }),
        new ApiError({ code: PermissionErrorCode.PERM_DENIED }),
        new ApiError({ code: ValidationErrorCode.VALIDATION_FAILED }),
        new ApiError({ code: ResourceErrorCode.RESOURCE_NOT_FOUND }),
        new ApiError({ code: InternalErrorCode.INTERNAL_ERROR }),
      ];

      nonRetryableErrors.forEach((error) => {
        expect(error.isRetryable()).toBe(false);
      });
    });
  });

  describe('shouldLog()', () => {
    it('should return true for 5xx errors', () => {
      const serverErrors = [
        new ApiError({ code: InternalErrorCode.INTERNAL_ERROR }),
        new ApiError({ code: InternalErrorCode.UNHANDLED_EXCEPTION }),
        new ApiError({ code: 'SERVICE_UNAVAILABLE' as ErrorCode }),
      ];

      serverErrors.forEach((error) => {
        expect(error.shouldLog()).toBe(true);
      });
    });

    it('should return false for 4xx errors', () => {
      const clientErrors = [
        new ApiError({ code: AuthErrorCode.AUTH_INVALID_CREDENTIALS }),
        new ApiError({ code: ValidationErrorCode.VALIDATION_FAILED }),
        new ApiError({ code: ResourceErrorCode.RESOURCE_NOT_FOUND }),
        new ApiError({ code: RateLimitErrorCode.RATE_LIMIT_EXCEEDED }),
      ];

      clientErrors.forEach((error) => {
        expect(error.shouldLog()).toBe(false);
      });
    });
  });

  describe('isApiError() type guard', () => {
    it('should return true for ApiError instances', () => {
      const error = new ApiError({ code: InternalErrorCode.INTERNAL_ERROR });
      expect(isApiError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error');
      expect(isApiError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isApiError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isApiError(undefined)).toBe(false);
    });

    it('should return false for plain objects', () => {
      expect(isApiError({ code: 'INTERNAL_ERROR' })).toBe(false);
    });

    it('should return false for strings', () => {
      expect(isApiError('error')).toBe(false);
    });
  });

  describe('Errors helper factory', () => {
    describe('Errors.notFound()', () => {
      it('should create RESOURCE_NOT_FOUND error', () => {
        const error = Errors.notFound();
        expect(error.code).toBe('RESOURCE_NOT_FOUND');
        expect(error.httpStatus).toBe(404);
      });

      it('should accept custom message', () => {
        const error = Errors.notFound('User not found');
        expect(error.message).toBe('User not found');
      });
    });

    describe('Errors.unauthorized()', () => {
      it('should create AUTH_TOKEN_MISSING error', () => {
        const error = Errors.unauthorized();
        expect(error.code).toBe('AUTH_TOKEN_MISSING');
        expect(error.httpStatus).toBe(401);
      });

      it('should accept custom message', () => {
        const error = Errors.unauthorized('Token expired');
        expect(error.message).toBe('Token expired');
      });
    });

    describe('Errors.forbidden()', () => {
      it('should create PERM_DENIED error', () => {
        const error = Errors.forbidden();
        expect(error.code).toBe('PERM_DENIED');
        expect(error.httpStatus).toBe(403);
      });

      it('should accept custom message', () => {
        const error = Errors.forbidden('Admin access required');
        expect(error.message).toBe('Admin access required');
      });
    });

    describe('Errors.badRequest()', () => {
      it('should create VALIDATION_FAILED error', () => {
        const error = Errors.badRequest();
        expect(error.code).toBe('VALIDATION_FAILED');
        expect(error.httpStatus).toBe(400);
      });

      it('should accept custom message and details', () => {
        const details: FieldError[] = [
          { field: 'email', message: 'Invalid email' },
        ];
        const error = Errors.badRequest('Invalid input', details);
        expect(error.message).toBe('Invalid input');
        expect(error.details).toEqual(details);
      });
    });

    describe('Errors.conflict()', () => {
      it('should create RESOURCE_CONFLICT error', () => {
        const error = Errors.conflict();
        expect(error.code).toBe('RESOURCE_CONFLICT');
        expect(error.httpStatus).toBe(409);
      });

      it('should accept custom message', () => {
        const error = Errors.conflict('Email already exists');
        expect(error.message).toBe('Email already exists');
      });
    });

    describe('Errors.tooManyRequests()', () => {
      it('should create RATE_LIMIT_EXCEEDED error', () => {
        const error = Errors.tooManyRequests();
        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(error.httpStatus).toBe(429);
      });

      it('should accept retryAfter', () => {
        const error = Errors.tooManyRequests(60);
        expect(error.retryAfter).toBe(60);
      });
    });

    describe('Errors.internal()', () => {
      it('should create INTERNAL_ERROR error', () => {
        const error = Errors.internal();
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.httpStatus).toBe(500);
      });

      it('should accept cause error', () => {
        const cause = new Error('Original error');
        const error = Errors.internal(cause);
        expect(error.cause).toBe(cause);
      });
    });

    describe('Errors.paymentRequired()', () => {
      it('should create SUBSCRIPTION_REQUIRED error', () => {
        const error = Errors.paymentRequired();
        expect(error.code).toBe('SUBSCRIPTION_REQUIRED');
        expect(error.httpStatus).toBe(402);
      });

      it('should accept custom message', () => {
        const error = Errors.paymentRequired('Premium subscription required');
        expect(error.message).toBe('Premium subscription required');
      });
    });
  });

  describe('FieldError handling', () => {
    it('should support multiple field errors', () => {
      const details: FieldError[] = [
        { field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' },
        { field: 'password', message: 'Password too short', code: 'MIN_LENGTH' },
        { field: 'age', message: 'Must be 18 or older', code: 'AGE_REQUIREMENT' },
      ];

      const error = new ApiError({
        code: ValidationErrorCode.VALIDATION_FAILED,
        details,
      });

      expect(error.details).toHaveLength(3);
      expect(error.details![0].field).toBe('email');
      expect(error.details![1].field).toBe('password');
      expect(error.details![2].field).toBe('age');
    });

    it('should support field errors without code', () => {
      const details: FieldError[] = [
        { field: 'username', message: 'Username required' },
      ];

      const error = new ApiError({
        code: ValidationErrorCode.FIELD_REQUIRED,
        details,
      });

      expect(error.details![0].code).toBeUndefined();
    });
  });

  describe('Error inheritance', () => {
    it('should be instanceof Error', () => {
      const error = new ApiError({ code: InternalErrorCode.INTERNAL_ERROR });
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof ApiError', () => {
      const error = new ApiError({ code: InternalErrorCode.INTERNAL_ERROR });
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should have correct name property', () => {
      const error = new ApiError({ code: InternalErrorCode.INTERNAL_ERROR });
      expect(error.name).toBe('ApiError');
    });
  });
});
