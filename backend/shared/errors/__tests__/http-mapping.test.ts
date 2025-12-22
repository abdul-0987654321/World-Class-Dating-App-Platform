/**
 * HTTP Mapping Tests
 * Tests for HTTP status code mapping from error codes
 */

import {
  AuthErrorCode,
  PermissionErrorCode,
  ValidationErrorCode,
  ResourceErrorCode,
  BillingErrorCode,
  RateLimitErrorCode,
  IntegrationErrorCode,
  DataErrorCode,
  PlatformErrorCode,
  InternalErrorCode,
  type ErrorCode,
} from '../error-codes';
import {
  HTTP_STATUS_MAP,
  getHttpStatus,
  isClientError,
  isServerError,
  isRetryable,
} from '../http-status-mapping';

describe('HTTP Status Mapping', () => {
  describe('Authentication Errors (AUTH_*) -> 401', () => {
    it('should map AUTH_INVALID_CREDENTIALS to 401', () => {
      expect(getHttpStatus(AuthErrorCode.AUTH_INVALID_CREDENTIALS)).toBe(401);
    });

    it('should map AUTH_TOKEN_MISSING to 401', () => {
      expect(getHttpStatus(AuthErrorCode.AUTH_TOKEN_MISSING)).toBe(401);
    });

    it('should map AUTH_TOKEN_INVALID to 401', () => {
      expect(getHttpStatus(AuthErrorCode.AUTH_TOKEN_INVALID)).toBe(401);
    });

    it('should map AUTH_TOKEN_EXPIRED to 401', () => {
      expect(getHttpStatus(AuthErrorCode.AUTH_TOKEN_EXPIRED)).toBe(401);
    });

    it('should map AUTH_MFA_REQUIRED to 401', () => {
      expect(getHttpStatus(AuthErrorCode.AUTH_MFA_REQUIRED)).toBe(401);
    });

    it('should map AUTH_ACCOUNT_LOCKED to 423', () => {
      expect(getHttpStatus(AuthErrorCode.AUTH_ACCOUNT_LOCKED)).toBe(423);
    });
  });

  describe('Permission Errors (PERM_*) -> 403', () => {
    it('should map PERM_DENIED to 403', () => {
      expect(getHttpStatus(PermissionErrorCode.PERM_DENIED)).toBe(403);
    });

    it('should map PERM_ROLE_REQUIRED to 403', () => {
      expect(getHttpStatus(PermissionErrorCode.PERM_ROLE_REQUIRED)).toBe(403);
    });

    it('should map PERM_TENANT_VIOLATION to 403', () => {
      expect(getHttpStatus(PermissionErrorCode.PERM_TENANT_VIOLATION)).toBe(403);
    });
  });

  describe('Validation Errors (VALIDATION_*, FIELD_*) -> 400/422', () => {
    it('should map VALIDATION_FAILED to 400', () => {
      expect(getHttpStatus(ValidationErrorCode.VALIDATION_FAILED)).toBe(400);
    });

    it('should map FIELD_REQUIRED to 400', () => {
      expect(getHttpStatus(ValidationErrorCode.FIELD_REQUIRED)).toBe(400);
    });

    it('should map FIELD_INVALID_FORMAT to 400', () => {
      expect(getHttpStatus(ValidationErrorCode.FIELD_INVALID_FORMAT)).toBe(400);
    });

    it('should map FIELD_OUT_OF_RANGE to 400', () => {
      expect(getHttpStatus(ValidationErrorCode.FIELD_OUT_OF_RANGE)).toBe(400);
    });

    it('should map FIELD_DUPLICATE to 409', () => {
      expect(getHttpStatus(ValidationErrorCode.FIELD_DUPLICATE)).toBe(409);
    });
  });

  describe('Resource Errors -> 404/409/410/423', () => {
    it('should map RESOURCE_NOT_FOUND to 404', () => {
      expect(getHttpStatus(ResourceErrorCode.RESOURCE_NOT_FOUND)).toBe(404);
    });

    it('should map RESOURCE_ALREADY_EXISTS to 409', () => {
      expect(getHttpStatus(ResourceErrorCode.RESOURCE_ALREADY_EXISTS)).toBe(409);
    });

    it('should map RESOURCE_CONFLICT to 409', () => {
      expect(getHttpStatus(ResourceErrorCode.RESOURCE_CONFLICT)).toBe(409);
    });

    it('should map RESOURCE_LOCKED to 423', () => {
      expect(getHttpStatus(ResourceErrorCode.RESOURCE_LOCKED)).toBe(423);
    });

    it('should map RESOURCE_DELETED to 410', () => {
      expect(getHttpStatus(ResourceErrorCode.RESOURCE_DELETED)).toBe(410);
    });
  });

  describe('Billing Errors -> 402/403/429', () => {
    it('should map SUBSCRIPTION_REQUIRED to 402', () => {
      expect(getHttpStatus(BillingErrorCode.SUBSCRIPTION_REQUIRED)).toBe(402);
    });

    it('should map SUBSCRIPTION_EXPIRED to 402', () => {
      expect(getHttpStatus(BillingErrorCode.SUBSCRIPTION_EXPIRED)).toBe(402);
    });

    it('should map FEATURE_NOT_ENTITLED to 403', () => {
      expect(getHttpStatus(BillingErrorCode.FEATURE_NOT_ENTITLED)).toBe(403);
    });

    it('should map USAGE_LIMIT_EXCEEDED to 429', () => {
      expect(getHttpStatus(BillingErrorCode.USAGE_LIMIT_EXCEEDED)).toBe(429);
    });

    it('should map PAYMENT_FAILED to 402', () => {
      expect(getHttpStatus(BillingErrorCode.PAYMENT_FAILED)).toBe(402);
    });
  });

  describe('Rate Limit Errors -> 429', () => {
    it('should map RATE_LIMIT_EXCEEDED to 429', () => {
      expect(getHttpStatus(RateLimitErrorCode.RATE_LIMIT_EXCEEDED)).toBe(429);
    });

    it('should map ACTION_THROTTLED to 429', () => {
      expect(getHttpStatus(RateLimitErrorCode.ACTION_THROTTLED)).toBe(429);
    });

    it('should map ABUSE_DETECTED to 429', () => {
      expect(getHttpStatus(RateLimitErrorCode.ABUSE_DETECTED)).toBe(429);
    });

    it('should map CAPTCHA_REQUIRED to 429', () => {
      expect(getHttpStatus(RateLimitErrorCode.CAPTCHA_REQUIRED)).toBe(429);
    });
  });

  describe('Integration Errors -> 502/503/504', () => {
    it('should map INTEGRATION_TIMEOUT to 504', () => {
      expect(getHttpStatus(IntegrationErrorCode.INTEGRATION_TIMEOUT)).toBe(504);
    });

    it('should map INTEGRATION_UNAVAILABLE to 502', () => {
      expect(getHttpStatus(IntegrationErrorCode.INTEGRATION_UNAVAILABLE)).toBe(502);
    });

    it('should map INTEGRATION_AUTH_FAILED to 502', () => {
      expect(getHttpStatus(IntegrationErrorCode.INTEGRATION_AUTH_FAILED)).toBe(502);
    });

    it('should map INTEGRATION_RATE_LIMITED to 503', () => {
      expect(getHttpStatus(IntegrationErrorCode.INTEGRATION_RATE_LIMITED)).toBe(503);
    });
  });

  describe('Data Errors -> 500/503/504', () => {
    it('should map DB_CONNECTION_FAILED to 503', () => {
      expect(getHttpStatus(DataErrorCode.DB_CONNECTION_FAILED)).toBe(503);
    });

    it('should map DB_QUERY_TIMEOUT to 504', () => {
      expect(getHttpStatus(DataErrorCode.DB_QUERY_TIMEOUT)).toBe(504);
    });

    it('should map CACHE_FAILURE to 503', () => {
      expect(getHttpStatus(DataErrorCode.CACHE_FAILURE)).toBe(503);
    });

    it('should map DATA_INCONSISTENT to 500', () => {
      expect(getHttpStatus(DataErrorCode.DATA_INCONSISTENT)).toBe(500);
    });
  });

  describe('Platform Errors -> 500/501/503', () => {
    it('should map SERVICE_UNAVAILABLE to 503', () => {
      expect(getHttpStatus(PlatformErrorCode.SERVICE_UNAVAILABLE)).toBe(503);
    });

    it('should map DEPLOYMENT_IN_PROGRESS to 503', () => {
      expect(getHttpStatus(PlatformErrorCode.DEPLOYMENT_IN_PROGRESS)).toBe(503);
    });

    it('should map FEATURE_FLAG_DISABLED to 501', () => {
      expect(getHttpStatus(PlatformErrorCode.FEATURE_FLAG_DISABLED)).toBe(501);
    });

    it('should map CONFIG_MISSING to 500', () => {
      expect(getHttpStatus(PlatformErrorCode.CONFIG_MISSING)).toBe(500);
    });
  });

  describe('Internal Errors -> 500/503/504', () => {
    it('should map INTERNAL_ERROR to 500', () => {
      expect(getHttpStatus(InternalErrorCode.INTERNAL_ERROR)).toBe(500);
    });

    it('should map UNHANDLED_EXCEPTION to 500', () => {
      expect(getHttpStatus(InternalErrorCode.UNHANDLED_EXCEPTION)).toBe(500);
    });

    it('should map TIMEOUT_EXCEEDED to 504', () => {
      expect(getHttpStatus(InternalErrorCode.TIMEOUT_EXCEEDED)).toBe(504);
    });

    it('should map CIRCUIT_BREAKER_OPEN to 503', () => {
      expect(getHttpStatus(InternalErrorCode.CIRCUIT_BREAKER_OPEN)).toBe(503);
    });
  });

  describe('isClientError', () => {
    it('should return true for 4xx errors', () => {
      expect(isClientError(AuthErrorCode.AUTH_INVALID_CREDENTIALS)).toBe(true);
      expect(isClientError(PermissionErrorCode.PERM_DENIED)).toBe(true);
      expect(isClientError(ValidationErrorCode.VALIDATION_FAILED)).toBe(true);
      expect(isClientError(ResourceErrorCode.RESOURCE_NOT_FOUND)).toBe(true);
      expect(isClientError(BillingErrorCode.PAYMENT_FAILED)).toBe(true);
      expect(isClientError(RateLimitErrorCode.RATE_LIMIT_EXCEEDED)).toBe(true);
    });

    it('should return false for 5xx errors', () => {
      expect(isClientError(InternalErrorCode.INTERNAL_ERROR)).toBe(false);
      expect(isClientError(DataErrorCode.DB_CONNECTION_FAILED)).toBe(false);
      expect(isClientError(PlatformErrorCode.SERVICE_UNAVAILABLE)).toBe(false);
    });
  });

  describe('isServerError', () => {
    it('should return true for 5xx errors', () => {
      expect(isServerError(InternalErrorCode.INTERNAL_ERROR)).toBe(true);
      expect(isServerError(DataErrorCode.DB_CONNECTION_FAILED)).toBe(true);
      expect(isServerError(PlatformErrorCode.SERVICE_UNAVAILABLE)).toBe(true);
      expect(isServerError(IntegrationErrorCode.INTEGRATION_TIMEOUT)).toBe(true);
    });

    it('should return false for 4xx errors', () => {
      expect(isServerError(AuthErrorCode.AUTH_INVALID_CREDENTIALS)).toBe(false);
      expect(isServerError(PermissionErrorCode.PERM_DENIED)).toBe(false);
      expect(isServerError(ValidationErrorCode.VALIDATION_FAILED)).toBe(false);
    });
  });

  describe('isRetryable', () => {
    it('should return true for transient errors', () => {
      expect(isRetryable(IntegrationErrorCode.INTEGRATION_TIMEOUT)).toBe(true);
      expect(isRetryable(IntegrationErrorCode.INTEGRATION_UNAVAILABLE)).toBe(true);
      expect(isRetryable(IntegrationErrorCode.INTEGRATION_RATE_LIMITED)).toBe(true);
      expect(isRetryable(DataErrorCode.DB_CONNECTION_FAILED)).toBe(true);
      expect(isRetryable(DataErrorCode.DB_QUERY_TIMEOUT)).toBe(true);
      expect(isRetryable(DataErrorCode.CACHE_FAILURE)).toBe(true);
      expect(isRetryable(PlatformErrorCode.SERVICE_UNAVAILABLE)).toBe(true);
      expect(isRetryable(PlatformErrorCode.DEPLOYMENT_IN_PROGRESS)).toBe(true);
      expect(isRetryable(InternalErrorCode.TIMEOUT_EXCEEDED)).toBe(true);
      expect(isRetryable(InternalErrorCode.CIRCUIT_BREAKER_OPEN)).toBe(true);
      expect(isRetryable(RateLimitErrorCode.RATE_LIMIT_EXCEEDED)).toBe(true);
      expect(isRetryable(RateLimitErrorCode.ACTION_THROTTLED)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryable(AuthErrorCode.AUTH_INVALID_CREDENTIALS)).toBe(false);
      expect(isRetryable(PermissionErrorCode.PERM_DENIED)).toBe(false);
      expect(isRetryable(ValidationErrorCode.VALIDATION_FAILED)).toBe(false);
      expect(isRetryable(ResourceErrorCode.RESOURCE_NOT_FOUND)).toBe(false);
      expect(isRetryable(InternalErrorCode.INTERNAL_ERROR)).toBe(false);
    });
  });

  describe('getHttpStatus fallback', () => {
    it('should return 500 for unknown error codes', () => {
      const unknownCode = 'UNKNOWN_ERROR_CODE' as ErrorCode;
      expect(getHttpStatus(unknownCode)).toBe(500);
    });
  });

  describe('HTTP Status Code Ranges', () => {
    it('should use correct ranges for error categories', () => {
      const allCodes: ErrorCode[] = [
        ...Object.values(AuthErrorCode),
        ...Object.values(PermissionErrorCode),
        ...Object.values(ValidationErrorCode),
        ...Object.values(ResourceErrorCode),
        ...Object.values(BillingErrorCode),
        ...Object.values(RateLimitErrorCode),
        ...Object.values(IntegrationErrorCode),
        ...Object.values(DataErrorCode),
        ...Object.values(PlatformErrorCode),
        ...Object.values(InternalErrorCode),
      ];

      allCodes.forEach((code) => {
        const status = getHttpStatus(code);
        // All error statuses should be 4xx or 5xx
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThanOrEqual(599);
      });
    });

    it('should not use 1xx, 2xx, or 3xx for errors', () => {
      Object.values(HTTP_STATUS_MAP).forEach((status) => {
        expect(status).toBeGreaterThanOrEqual(400);
      });
    });
  });

  describe('Specific HTTP Status Codes', () => {
    it('should correctly use 400 Bad Request', () => {
      const status400Codes = [
        ValidationErrorCode.VALIDATION_FAILED,
        ValidationErrorCode.FIELD_REQUIRED,
        ValidationErrorCode.FIELD_INVALID_FORMAT,
        ValidationErrorCode.FIELD_OUT_OF_RANGE,
      ];

      status400Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(400);
      });
    });

    it('should correctly use 401 Unauthorized', () => {
      const status401Codes = [
        AuthErrorCode.AUTH_INVALID_CREDENTIALS,
        AuthErrorCode.AUTH_TOKEN_MISSING,
        AuthErrorCode.AUTH_TOKEN_INVALID,
        AuthErrorCode.AUTH_TOKEN_EXPIRED,
        AuthErrorCode.AUTH_MFA_REQUIRED,
      ];

      status401Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(401);
      });
    });

    it('should correctly use 402 Payment Required', () => {
      const status402Codes = [
        BillingErrorCode.SUBSCRIPTION_REQUIRED,
        BillingErrorCode.SUBSCRIPTION_EXPIRED,
        BillingErrorCode.PAYMENT_FAILED,
      ];

      status402Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(402);
      });
    });

    it('should correctly use 403 Forbidden', () => {
      const status403Codes = [
        PermissionErrorCode.PERM_DENIED,
        PermissionErrorCode.PERM_ROLE_REQUIRED,
        PermissionErrorCode.PERM_TENANT_VIOLATION,
        BillingErrorCode.FEATURE_NOT_ENTITLED,
      ];

      status403Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(403);
      });
    });

    it('should correctly use 404 Not Found', () => {
      expect(getHttpStatus(ResourceErrorCode.RESOURCE_NOT_FOUND)).toBe(404);
    });

    it('should correctly use 409 Conflict', () => {
      const status409Codes = [
        ResourceErrorCode.RESOURCE_ALREADY_EXISTS,
        ResourceErrorCode.RESOURCE_CONFLICT,
        ValidationErrorCode.FIELD_DUPLICATE,
      ];

      status409Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(409);
      });
    });

    it('should correctly use 429 Too Many Requests', () => {
      const status429Codes = [
        RateLimitErrorCode.RATE_LIMIT_EXCEEDED,
        RateLimitErrorCode.ACTION_THROTTLED,
        RateLimitErrorCode.ABUSE_DETECTED,
        RateLimitErrorCode.CAPTCHA_REQUIRED,
        BillingErrorCode.USAGE_LIMIT_EXCEEDED,
      ];

      status429Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(429);
      });
    });

    it('should correctly use 500 Internal Server Error', () => {
      const status500Codes = [
        InternalErrorCode.INTERNAL_ERROR,
        InternalErrorCode.UNHANDLED_EXCEPTION,
        DataErrorCode.DATA_INCONSISTENT,
        PlatformErrorCode.CONFIG_MISSING,
      ];

      status500Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(500);
      });
    });

    it('should correctly use 503 Service Unavailable', () => {
      const status503Codes = [
        PlatformErrorCode.SERVICE_UNAVAILABLE,
        PlatformErrorCode.DEPLOYMENT_IN_PROGRESS,
        InternalErrorCode.CIRCUIT_BREAKER_OPEN,
        DataErrorCode.DB_CONNECTION_FAILED,
        DataErrorCode.CACHE_FAILURE,
        IntegrationErrorCode.INTEGRATION_RATE_LIMITED,
      ];

      status503Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(503);
      });
    });

    it('should correctly use 504 Gateway Timeout', () => {
      const status504Codes = [
        IntegrationErrorCode.INTEGRATION_TIMEOUT,
        DataErrorCode.DB_QUERY_TIMEOUT,
        InternalErrorCode.TIMEOUT_EXCEEDED,
      ];

      status504Codes.forEach((code) => {
        expect(getHttpStatus(code)).toBe(504);
      });
    });
  });
});
