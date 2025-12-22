/**
 * Error Codes Tests
 * Comprehensive tests for the error code registry
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
  ERROR_CODES,
  type ErrorCode,
} from '../error-codes';
import { ERROR_MESSAGES, getErrorMessage, getErrorTitle } from '../error-messages';
import { HTTP_STATUS_MAP, getHttpStatus } from '../http-status-mapping';

describe('Error Codes Registry', () => {
  describe('Error Code Definitions', () => {
    describe('AuthErrorCode', () => {
      it('should define all authentication error codes', () => {
        expect(AuthErrorCode.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS');
        expect(AuthErrorCode.AUTH_TOKEN_MISSING).toBe('AUTH_TOKEN_MISSING');
        expect(AuthErrorCode.AUTH_TOKEN_INVALID).toBe('AUTH_TOKEN_INVALID');
        expect(AuthErrorCode.AUTH_TOKEN_EXPIRED).toBe('AUTH_TOKEN_EXPIRED');
        expect(AuthErrorCode.AUTH_MFA_REQUIRED).toBe('AUTH_MFA_REQUIRED');
        expect(AuthErrorCode.AUTH_ACCOUNT_LOCKED).toBe('AUTH_ACCOUNT_LOCKED');
      });

      it('should have all auth codes start with AUTH_ prefix', () => {
        const authCodes = Object.values(AuthErrorCode);
        authCodes.forEach((code) => {
          expect(code).toMatch(/^AUTH_/);
        });
      });
    });

    describe('PermissionErrorCode', () => {
      it('should define all permission error codes', () => {
        expect(PermissionErrorCode.PERM_DENIED).toBe('PERM_DENIED');
        expect(PermissionErrorCode.PERM_ROLE_REQUIRED).toBe('PERM_ROLE_REQUIRED');
        expect(PermissionErrorCode.PERM_TENANT_VIOLATION).toBe('PERM_TENANT_VIOLATION');
      });

      it('should have all permission codes start with PERM_ prefix', () => {
        const permCodes = Object.values(PermissionErrorCode);
        permCodes.forEach((code) => {
          expect(code).toMatch(/^PERM_/);
        });
      });
    });

    describe('ValidationErrorCode', () => {
      it('should define all validation error codes', () => {
        expect(ValidationErrorCode.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
        expect(ValidationErrorCode.FIELD_REQUIRED).toBe('FIELD_REQUIRED');
        expect(ValidationErrorCode.FIELD_INVALID_FORMAT).toBe('FIELD_INVALID_FORMAT');
        expect(ValidationErrorCode.FIELD_OUT_OF_RANGE).toBe('FIELD_OUT_OF_RANGE');
        expect(ValidationErrorCode.FIELD_DUPLICATE).toBe('FIELD_DUPLICATE');
      });
    });

    describe('ResourceErrorCode', () => {
      it('should define all resource error codes', () => {
        expect(ResourceErrorCode.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
        expect(ResourceErrorCode.RESOURCE_ALREADY_EXISTS).toBe('RESOURCE_ALREADY_EXISTS');
        expect(ResourceErrorCode.RESOURCE_CONFLICT).toBe('RESOURCE_CONFLICT');
        expect(ResourceErrorCode.RESOURCE_LOCKED).toBe('RESOURCE_LOCKED');
        expect(ResourceErrorCode.RESOURCE_DELETED).toBe('RESOURCE_DELETED');
      });
    });

    describe('BillingErrorCode', () => {
      it('should define all billing error codes', () => {
        expect(BillingErrorCode.SUBSCRIPTION_REQUIRED).toBe('SUBSCRIPTION_REQUIRED');
        expect(BillingErrorCode.SUBSCRIPTION_EXPIRED).toBe('SUBSCRIPTION_EXPIRED');
        expect(BillingErrorCode.FEATURE_NOT_ENTITLED).toBe('FEATURE_NOT_ENTITLED');
        expect(BillingErrorCode.USAGE_LIMIT_EXCEEDED).toBe('USAGE_LIMIT_EXCEEDED');
        expect(BillingErrorCode.PAYMENT_FAILED).toBe('PAYMENT_FAILED');
      });
    });

    describe('RateLimitErrorCode', () => {
      it('should define all rate limit error codes', () => {
        expect(RateLimitErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
        expect(RateLimitErrorCode.ACTION_THROTTLED).toBe('ACTION_THROTTLED');
        expect(RateLimitErrorCode.ABUSE_DETECTED).toBe('ABUSE_DETECTED');
        expect(RateLimitErrorCode.CAPTCHA_REQUIRED).toBe('CAPTCHA_REQUIRED');
      });
    });

    describe('IntegrationErrorCode', () => {
      it('should define all integration error codes', () => {
        expect(IntegrationErrorCode.INTEGRATION_TIMEOUT).toBe('INTEGRATION_TIMEOUT');
        expect(IntegrationErrorCode.INTEGRATION_UNAVAILABLE).toBe('INTEGRATION_UNAVAILABLE');
        expect(IntegrationErrorCode.INTEGRATION_AUTH_FAILED).toBe('INTEGRATION_AUTH_FAILED');
        expect(IntegrationErrorCode.INTEGRATION_RATE_LIMITED).toBe('INTEGRATION_RATE_LIMITED');
      });
    });

    describe('DataErrorCode', () => {
      it('should define all data error codes', () => {
        expect(DataErrorCode.DB_CONNECTION_FAILED).toBe('DB_CONNECTION_FAILED');
        expect(DataErrorCode.DB_QUERY_TIMEOUT).toBe('DB_QUERY_TIMEOUT');
        expect(DataErrorCode.CACHE_FAILURE).toBe('CACHE_FAILURE');
        expect(DataErrorCode.DATA_INCONSISTENT).toBe('DATA_INCONSISTENT');
      });
    });

    describe('PlatformErrorCode', () => {
      it('should define all platform error codes', () => {
        expect(PlatformErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
        expect(PlatformErrorCode.DEPLOYMENT_IN_PROGRESS).toBe('DEPLOYMENT_IN_PROGRESS');
        expect(PlatformErrorCode.FEATURE_FLAG_DISABLED).toBe('FEATURE_FLAG_DISABLED');
        expect(PlatformErrorCode.CONFIG_MISSING).toBe('CONFIG_MISSING');
      });
    });

    describe('InternalErrorCode', () => {
      it('should define all internal error codes', () => {
        expect(InternalErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
        expect(InternalErrorCode.UNHANDLED_EXCEPTION).toBe('UNHANDLED_EXCEPTION');
        expect(InternalErrorCode.TIMEOUT_EXCEEDED).toBe('TIMEOUT_EXCEEDED');
        expect(InternalErrorCode.CIRCUIT_BREAKER_OPEN).toBe('CIRCUIT_BREAKER_OPEN');
      });
    });
  });

  describe('No Duplicate Error Codes', () => {
    it('should not have any duplicate error codes across all enums', () => {
      const allCodes: string[] = [
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

      const uniqueCodes = new Set(allCodes);
      expect(uniqueCodes.size).toBe(allCodes.length);
    });

    it('should ensure ERROR_CODES contains all error codes', () => {
      const enumCodes: string[] = [
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

      const errorCodesValues = Object.values(ERROR_CODES);
      enumCodes.forEach((code) => {
        expect(errorCodesValues).toContain(code);
      });
    });
  });

  describe('All Error Codes Have HTTP Mappings', () => {
    const allErrorCodes: ErrorCode[] = [
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

    it('should have HTTP status mapping for all error codes', () => {
      allErrorCodes.forEach((code) => {
        expect(HTTP_STATUS_MAP[code]).toBeDefined();
        expect(typeof HTTP_STATUS_MAP[code]).toBe('number');
      });
    });

    it('should return valid HTTP status codes (100-599)', () => {
      allErrorCodes.forEach((code) => {
        const status = HTTP_STATUS_MAP[code];
        expect(status).toBeGreaterThanOrEqual(100);
        expect(status).toBeLessThanOrEqual(599);
      });
    });

    it('should return a status code via getHttpStatus function', () => {
      allErrorCodes.forEach((code) => {
        const status = getHttpStatus(code);
        expect(status).toBeGreaterThanOrEqual(100);
        expect(status).toBeLessThanOrEqual(599);
      });
    });

    it('should return 500 for unknown error codes', () => {
      const unknownCode = 'UNKNOWN_CODE' as ErrorCode;
      const status = getHttpStatus(unknownCode);
      expect(status).toBe(500);
    });
  });

  describe('All Error Codes Have User-Safe Messages', () => {
    const allErrorCodes: ErrorCode[] = [
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

    it('should have user-safe message for all error codes', () => {
      allErrorCodes.forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(typeof ERROR_MESSAGES[code]).toBe('string');
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
      });
    });

    it('should return message via getErrorMessage function', () => {
      allErrorCodes.forEach((code) => {
        const message = getErrorMessage(code);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should return default message for unknown error codes', () => {
      const unknownCode = 'UNKNOWN_CODE' as ErrorCode;
      const message = getErrorMessage(unknownCode);
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should not expose internal details in user-safe messages', () => {
      allErrorCodes.forEach((code) => {
        const message = ERROR_MESSAGES[code];
        // Messages should not contain technical terms
        expect(message.toLowerCase()).not.toContain('database');
        expect(message.toLowerCase()).not.toContain('query');
        expect(message.toLowerCase()).not.toContain('sql');
        expect(message.toLowerCase()).not.toContain('exception');
        expect(message.toLowerCase()).not.toContain('stack');
        expect(message.toLowerCase()).not.toContain('null');
        expect(message.toLowerCase()).not.toContain('undefined');
      });
    });

    it('should have user-friendly language in messages', () => {
      allErrorCodes.forEach((code) => {
        const message = ERROR_MESSAGES[code];
        // Messages should end with a period or appropriate punctuation
        expect(message).toMatch(/[.!?]$/);
      });
    });
  });

  describe('Error Title Function', () => {
    it('should return correct title for auth errors', () => {
      expect(getErrorTitle(AuthErrorCode.AUTH_INVALID_CREDENTIALS)).toBe('Authentication Error');
      expect(getErrorTitle(AuthErrorCode.AUTH_TOKEN_EXPIRED)).toBe('Authentication Error');
    });

    it('should return correct title for permission errors', () => {
      expect(getErrorTitle(PermissionErrorCode.PERM_DENIED)).toBe('Permission Denied');
    });

    it('should return correct title for validation errors', () => {
      expect(getErrorTitle(ValidationErrorCode.VALIDATION_FAILED)).toBe('Validation Error');
      expect(getErrorTitle(ValidationErrorCode.FIELD_REQUIRED)).toBe('Validation Error');
    });

    it('should return correct title for resource errors', () => {
      expect(getErrorTitle(ResourceErrorCode.RESOURCE_NOT_FOUND)).toBe('Resource Error');
    });

    it('should return correct title for billing errors', () => {
      expect(getErrorTitle(BillingErrorCode.SUBSCRIPTION_REQUIRED)).toBe('Subscription Error');
      expect(getErrorTitle(BillingErrorCode.PAYMENT_FAILED)).toBe('Subscription Error');
    });

    it('should return correct title for rate limit errors', () => {
      expect(getErrorTitle(RateLimitErrorCode.RATE_LIMIT_EXCEEDED)).toBe('Rate Limited');
    });

    it('should return default title for unknown errors', () => {
      expect(getErrorTitle('UNKNOWN_ERROR' as ErrorCode)).toBe('Error');
    });
  });

  describe('Error Code Naming Convention', () => {
    it('should use UPPER_SNAKE_CASE for all error codes', () => {
      const allCodes = Object.values(ERROR_CODES);
      allCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
      });
    });

    it('should use descriptive prefixes for categorization', () => {
      const prefixPattern = /^(AUTH|PERM|VALIDATION|FIELD|RESOURCE|SUBSCRIPTION|FEATURE|USAGE|PAYMENT|RATE|ACTION|ABUSE|CAPTCHA|INTEGRATION|DB|CACHE|DATA|SERVICE|DEPLOYMENT|CONFIG|INTERNAL|UNHANDLED|TIMEOUT|CIRCUIT)_/;

      const allCodes = Object.values(ERROR_CODES);
      allCodes.forEach((code) => {
        expect(code).toMatch(prefixPattern);
      });
    });
  });

  describe('Error Code Uniqueness Across Enums', () => {
    it('should not reuse error codes across different enums', () => {
      const enumMap = new Map<string, string>();

      const checkEnum = (enumObj: Record<string, string>, enumName: string) => {
        Object.values(enumObj).forEach((code) => {
          if (enumMap.has(code)) {
            throw new Error(`Duplicate code ${code} found in ${enumName} and ${enumMap.get(code)}`);
          }
          enumMap.set(code, enumName);
        });
      };

      expect(() => {
        checkEnum(AuthErrorCode, 'AuthErrorCode');
        checkEnum(PermissionErrorCode, 'PermissionErrorCode');
        checkEnum(ValidationErrorCode, 'ValidationErrorCode');
        checkEnum(ResourceErrorCode, 'ResourceErrorCode');
        checkEnum(BillingErrorCode, 'BillingErrorCode');
        checkEnum(RateLimitErrorCode, 'RateLimitErrorCode');
        checkEnum(IntegrationErrorCode, 'IntegrationErrorCode');
        checkEnum(DataErrorCode, 'DataErrorCode');
        checkEnum(PlatformErrorCode, 'PlatformErrorCode');
        checkEnum(InternalErrorCode, 'InternalErrorCode');
      }).not.toThrow();
    });
  });
});
