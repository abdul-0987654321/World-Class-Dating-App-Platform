/**
 * Middleware Exports
 * Central export for all middleware
 */

// Authentication
export { AuthMiddleware } from './auth.middleware.enhanced';

// Security
export {
  sqlInjectionPrevention,
  xssProtection,
  noSQLInjectionPrevention,
  requestSizeLimiter,
  secureHeaders,
  ipBlacklist,
  sessionSecurity,
  validateContentType,
  requestId,
  securityAuditLogger,
} from './security.middleware';

// CSRF Protection
export { CSRFProtection } from './csrf.middleware';

// Role-Based Access Control
export { RBACMiddleware, UserRole, ROLE_PERMISSIONS } from './rbac.middleware';

// Rate Limiting
export {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  RateLimitMiddleware,
  RATE_LIMIT_PRESETS,
} from './rateLimit.middleware';

// Audit Logging
export { AuditMiddleware } from './audit.middleware';

// API Versioning
export { ApiVersioning, apiVersioning, requireVersion, versionedResponse } from './versioning.middleware';

// Validation
export { validate } from './validation.middleware';

// Premium Gates
export { PremiumGateMiddleware } from './premiumGates.middleware';

// Error Handling
export { errorHandler } from './error.middleware';
export { notFoundHandler } from './notFound.middleware';
