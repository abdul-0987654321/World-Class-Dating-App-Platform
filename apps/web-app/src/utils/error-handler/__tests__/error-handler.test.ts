/**
 * Frontend Error Handler Tests
 * Comprehensive tests for the error handling system
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import {
  processApiError,
  handleError,
  normalizeError,
  configureErrorHandler,
  handleErrorByStatus,
  createErrorHandler,
} from '../error-handler';
import {
  AuthErrorCode,
  BillingErrorCode,
  PermissionErrorCode,
  RateLimitErrorCode,
  ServerErrorCode,
  NetworkErrorCode,
  ResourceErrorCode,
  ValidationErrorCode,
} from '../error-codes';
import type { ApiErrorResponse, ProcessedError, ErrorHandlerConfig } from '../types';

describe('Frontend Error Handler', () => {
  let mockShowToast: Mock;
  let mockOnAuthRequired: Mock;
  let mockOnBillingRequired: Mock;
  let mockOnNotFound: Mock;
  let mockOnMaintenance: Mock;
  let mockLogError: Mock;

  beforeEach(() => {
    mockShowToast = vi.fn();
    mockOnAuthRequired = vi.fn();
    mockOnBillingRequired = vi.fn();
    mockOnNotFound = vi.fn();
    mockOnMaintenance = vi.fn();
    mockLogError = vi.fn();

    // Configure error handler with mocks
    configureErrorHandler({
      showToast: mockShowToast,
      onAuthRequired: mockOnAuthRequired,
      onBillingRequired: mockOnBillingRequired,
      onNotFound: mockOnNotFound,
      onMaintenance: mockOnMaintenance,
      logError: mockLogError,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processApiError', () => {
    it('should process a standard API error response', () => {
      const error: ApiErrorResponse = {
        statusCode: 400,
        message: 'Validation failed',
        errorCode: ValidationErrorCode.REQUIRED_FIELD,
      };

      const result = processApiError(error);

      expect(result.status).toBe(400);
      expect(result.errorCode).toBe(ValidationErrorCode.REQUIRED_FIELD);
      expect(result.userMessage).toBeDefined();
      expect(result.originalMessage).toBe('Validation failed');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should include correlation ID when provided', () => {
      const error: ApiErrorResponse = {
        statusCode: 500,
        message: 'Internal error',
        correlationId: 'abc-123-def',
      };

      const result = processApiError(error);

      expect(result.correlationId).toBe('abc-123-def');
    });

    it('should parse validation errors from details', () => {
      const error: ApiErrorResponse = {
        statusCode: 422,
        message: 'Validation failed',
        details: [
          { field: 'email', code: 'invalid_email', constraints: { isEmail: 'Must be a valid email' } },
          { field: 'password', code: 'too_short', constraints: { minLength: 'Must be at least 8 characters' } },
        ],
      };

      const result = processApiError(error);

      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors?.email).toBe('Must be a valid email');
      expect(result.validationErrors?.password).toBe('Must be at least 8 characters');
    });

    it('should include retryAfter when provided', () => {
      const error: ApiErrorResponse = {
        statusCode: 429,
        message: 'Too many requests',
        retryAfter: 60,
      };

      const result = processApiError(error);

      expect(result.retryAfter).toBe(60);
    });

    it('should use custom messages when provided', () => {
      const error: ApiErrorResponse = {
        statusCode: 401,
        message: 'Unauthorized',
        errorCode: AuthErrorCode.TOKEN_EXPIRED,
      };

      const customMessages = {
        [AuthErrorCode.TOKEN_EXPIRED]: 'Your token has expired. Please log in again.',
      };

      const result = processApiError(error, customMessages);

      expect(result.userMessage).toBe('Your token has expired. Please log in again.');
    });

    it('should mark server errors as recoverable', () => {
      const error: ApiErrorResponse = {
        statusCode: 503,
        message: 'Service unavailable',
      };

      const result = processApiError(error);

      expect(result.isRecoverable).toBe(true);
      expect(result.showRetry).toBe(true);
    });

    it('should mark client errors as non-recoverable', () => {
      const error: ApiErrorResponse = {
        statusCode: 400,
        message: 'Bad request',
      };

      const result = processApiError(error);

      expect(result.isRecoverable).toBe(false);
    });

    it('should show retry for timeout errors', () => {
      const error: ApiErrorResponse = {
        statusCode: 504,
        message: 'Gateway timeout',
        errorCode: ServerErrorCode.TIMEOUT,
      };

      const result = processApiError(error);

      expect(result.showRetry).toBe(true);
    });
  });

  describe('normalizeError', () => {
    it('should return ApiErrorResponse as-is', () => {
      const error: ApiErrorResponse = {
        statusCode: 400,
        message: 'Test error',
      };

      const result = normalizeError(error);

      expect(result).toEqual(error);
    });

    it('should convert fetch TypeError to network error', () => {
      const error = new TypeError('Failed to fetch');

      const result = normalizeError(error);

      expect(result.statusCode).toBe(0);
      expect(result.errorCode).toBe(NetworkErrorCode.CONNECTION_FAILED);
    });

    it('should convert AbortError to timeout error', () => {
      const error = new DOMException('The operation was aborted', 'AbortError');

      const result = normalizeError(error);

      expect(result.statusCode).toBe(0);
      expect(result.errorCode).toBe(NetworkErrorCode.TIMEOUT);
    });

    it('should convert standard Error to internal error', () => {
      const error = new Error('Something went wrong');

      const result = normalizeError(error);

      expect(result.statusCode).toBe(500);
      expect(result.errorCode).toBe(ServerErrorCode.INTERNAL_ERROR);
      expect(result.message).toBe('Something went wrong');
    });

    it('should convert unknown errors to internal error', () => {
      const error = 'string error';

      const result = normalizeError(error);

      expect(result.statusCode).toBe(500);
      expect(result.errorCode).toBe(ServerErrorCode.INTERNAL_ERROR);
    });

    it('should convert null to internal error', () => {
      const result = normalizeError(null);

      expect(result.statusCode).toBe(500);
      expect(result.errorCode).toBe(ServerErrorCode.INTERNAL_ERROR);
    });
  });

  describe('handleErrorByStatus', () => {
    describe('401 - Unauthorized', () => {
      it('should trigger redirect to login', () => {
        const error: ProcessedError = {
          status: 401,
          errorCode: AuthErrorCode.TOKEN_EXPIRED,
          userMessage: 'Session expired',
          originalMessage: 'Token expired',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockOnAuthRequired).toHaveBeenCalled();
      });

      it('should log the error', () => {
        const error: ProcessedError = {
          status: 401,
          errorCode: AuthErrorCode.TOKEN_EXPIRED,
          userMessage: 'Session expired',
          originalMessage: 'Token expired',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockLogError).toHaveBeenCalledWith(error, error);
      });
    });

    describe('402 - Payment Required', () => {
      it('should trigger redirect to billing', () => {
        const error: ProcessedError = {
          status: 402,
          errorCode: BillingErrorCode.PAYMENT_REQUIRED,
          userMessage: 'Payment required',
          originalMessage: 'Payment required',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockOnBillingRequired).toHaveBeenCalled();
      });

      it('should show toast when billing handler not configured', () => {
        configureErrorHandler({
          showToast: mockShowToast,
          onBillingRequired: undefined,
        });

        const error: ProcessedError = {
          status: 402,
          errorCode: BillingErrorCode.PAYMENT_REQUIRED,
          userMessage: 'Payment required',
          originalMessage: 'Payment required',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockShowToast).toHaveBeenCalledWith('Payment required', 'warning');
      });
    });

    describe('403 - Forbidden', () => {
      it('should show permission denied toast', () => {
        const error: ProcessedError = {
          status: 403,
          errorCode: PermissionErrorCode.ACCESS_DENIED,
          userMessage: 'Access denied',
          originalMessage: 'Access denied',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockShowToast).toHaveBeenCalledWith('Access denied', 'error');
      });

      it('should redirect to billing for premium-required errors', () => {
        const error: ProcessedError = {
          status: 403,
          errorCode: PermissionErrorCode.PREMIUM_REQUIRED,
          userMessage: 'Premium required',
          originalMessage: 'Premium required',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockOnBillingRequired).toHaveBeenCalled();
      });

      it('should redirect to billing for upgrade-required errors', () => {
        const error: ProcessedError = {
          status: 403,
          errorCode: BillingErrorCode.UPGRADE_REQUIRED,
          userMessage: 'Upgrade required',
          originalMessage: 'Upgrade required',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockOnBillingRequired).toHaveBeenCalled();
      });
    });

    describe('404 - Not Found', () => {
      it('should trigger not found handler', () => {
        const error: ProcessedError = {
          status: 404,
          errorCode: ResourceErrorCode.NOT_FOUND,
          userMessage: 'Not found',
          originalMessage: 'Not found',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockOnNotFound).toHaveBeenCalled();
      });

      it('should show toast when not found handler not configured', () => {
        configureErrorHandler({
          showToast: mockShowToast,
          onNotFound: undefined,
        });

        const error: ProcessedError = {
          status: 404,
          errorCode: ResourceErrorCode.NOT_FOUND,
          userMessage: 'Not found',
          originalMessage: 'Not found',
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockShowToast).toHaveBeenCalledWith('Not found', 'error');
      });
    });

    describe('422 - Validation Error', () => {
      it('should not show toast for validation errors', () => {
        const error: ProcessedError = {
          status: 422,
          errorCode: ValidationErrorCode.REQUIRED_FIELD,
          userMessage: 'Validation failed',
          originalMessage: 'Validation failed',
          validationErrors: { email: 'Email is required' },
          isRecoverable: false,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        // Validation errors should be handled by forms, not toasts
        expect(mockShowToast).not.toHaveBeenCalled();
      });
    });

    describe('429 - Rate Limit', () => {
      it('should show rate limit message', () => {
        const error: ProcessedError = {
          status: 429,
          errorCode: RateLimitErrorCode.TOO_MANY_REQUESTS,
          userMessage: 'Too many requests',
          originalMessage: 'Too many requests',
          isRecoverable: true,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockShowToast).toHaveBeenCalledWith('Too many requests', 'warning');
      });

      it('should include retry time in message', () => {
        const error: ProcessedError = {
          status: 429,
          errorCode: RateLimitErrorCode.TOO_MANY_REQUESTS,
          userMessage: 'Too many requests',
          originalMessage: 'Too many requests',
          retryAfter: 60,
          isRecoverable: true,
          showRetry: false,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockShowToast).toHaveBeenCalledWith(
          'Too many requests Try again in 60 seconds.',
          'warning'
        );
      });
    });

    describe('500 - Internal Server Error', () => {
      it('should show generic error message', () => {
        const error: ProcessedError = {
          status: 500,
          errorCode: ServerErrorCode.INTERNAL_ERROR,
          userMessage: 'Something went wrong',
          originalMessage: 'Internal server error',
          isRecoverable: true,
          showRetry: true,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockShowToast).toHaveBeenCalledWith('Something went wrong', 'error');
      });
    });

    describe('503 - Service Unavailable', () => {
      it('should trigger maintenance handler for maintenance mode', () => {
        const error: ProcessedError = {
          status: 503,
          errorCode: ServerErrorCode.MAINTENANCE_MODE,
          userMessage: 'Under maintenance',
          originalMessage: 'Under maintenance',
          isRecoverable: true,
          showRetry: true,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockOnMaintenance).toHaveBeenCalled();
      });

      it('should show toast for non-maintenance 503 errors', () => {
        const error: ProcessedError = {
          status: 503,
          errorCode: ServerErrorCode.SERVICE_UNAVAILABLE,
          userMessage: 'Service unavailable',
          originalMessage: 'Service unavailable',
          isRecoverable: true,
          showRetry: true,
          timestamp: new Date(),
        };

        handleErrorByStatus(error);

        expect(mockShowToast).toHaveBeenCalledWith('Service unavailable', 'error');
      });
    });
  });

  describe('handleError', () => {
    it('should process and handle error in one call', () => {
      const apiError: ApiErrorResponse = {
        statusCode: 401,
        message: 'Unauthorized',
        errorCode: AuthErrorCode.TOKEN_EXPIRED,
      };

      const result = handleError(apiError);

      expect(result.status).toBe(401);
      expect(mockOnAuthRequired).toHaveBeenCalled();
    });

    it('should support suppressGlobalHandling option', () => {
      const apiError: ApiErrorResponse = {
        statusCode: 401,
        message: 'Unauthorized',
      };

      const result = handleError(apiError, { suppressGlobalHandling: true });

      expect(result.status).toBe(401);
      expect(mockOnAuthRequired).not.toHaveBeenCalled();
    });

    it('should support custom messages option', () => {
      const apiError: ApiErrorResponse = {
        statusCode: 401,
        message: 'Unauthorized',
        errorCode: AuthErrorCode.TOKEN_EXPIRED,
      };

      const result = handleError(apiError, {
        customMessages: {
          [AuthErrorCode.TOKEN_EXPIRED]: 'Custom session expired message',
        },
      });

      expect(result.userMessage).toBe('Custom session expired message');
    });

    it('should handle network errors', () => {
      const networkError = new TypeError('Failed to fetch');

      const result = handleError(networkError);

      expect(result.status).toBe(0);
      expect(result.errorCode).toBe(NetworkErrorCode.CONNECTION_FAILED);
    });
  });

  describe('createErrorHandler', () => {
    it('should create handler with custom config', () => {
      const customShowToast = vi.fn();
      const customOnAuthRequired = vi.fn();

      const handler = createErrorHandler({
        showToast: customShowToast,
        onAuthRequired: customOnAuthRequired,
      });

      const error: ApiErrorResponse = {
        statusCode: 401,
        message: 'Unauthorized',
      };

      handler(error);

      expect(customOnAuthRequired).toHaveBeenCalled();
    });

    it('should support suppress flag', () => {
      const customShowToast = vi.fn();

      const handler = createErrorHandler({
        showToast: customShowToast,
      });

      const error: ApiErrorResponse = {
        statusCode: 500,
        message: 'Error',
      };

      handler(error, true); // suppress = true

      expect(customShowToast).not.toHaveBeenCalled();
    });
  });

  describe('User Messages', () => {
    it('should never expose stack traces in user messages', () => {
      const error: ApiErrorResponse = {
        statusCode: 500,
        message: 'Error at line 42 in file.ts\n    at Function.execute',
      };

      const result = processApiError(error);

      // User message should be generic, not the stack trace
      expect(result.userMessage).not.toContain('at line');
      expect(result.userMessage).not.toContain('file.ts');
    });

    it('should use fallback message when error code is unknown', () => {
      const error: ApiErrorResponse = {
        statusCode: 500,
        message: 'Unknown error',
        errorCode: 'UNKNOWN_CODE',
      };

      const result = processApiError(error);

      expect(result.userMessage).toBeDefined();
      expect(result.userMessage.length).toBeGreaterThan(0);
    });

    it('should use status code message when no error code', () => {
      const error: ApiErrorResponse = {
        statusCode: 404,
        message: 'Resource not found',
      };

      const result = processApiError(error);

      expect(result.userMessage).toContain('could not be found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error response', () => {
      const error = {} as ApiErrorResponse;

      expect(() => handleError(error)).not.toThrow();
    });

    it('should handle null error', () => {
      expect(() => handleError(null)).not.toThrow();
    });

    it('should handle undefined error', () => {
      expect(() => handleError(undefined)).not.toThrow();
    });

    it('should handle error with missing fields', () => {
      const error: Partial<ApiErrorResponse> = {
        statusCode: 500,
      };

      const result = handleError(error as ApiErrorResponse);

      expect(result.status).toBe(500);
      expect(result.userMessage).toBeDefined();
    });

    it('should handle validation errors without constraints', () => {
      const error: ApiErrorResponse = {
        statusCode: 422,
        message: 'Validation failed',
        details: [
          { field: 'email', code: 'required' },
        ],
      };

      const result = processApiError(error);

      expect(result.validationErrors?.email).toBe('This field is invalid');
    });
  });
});
