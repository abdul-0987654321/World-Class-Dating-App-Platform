/**
 * Flamoral Shared Middleware Module
 *
 * Central export point for all shared middleware components.
 * These middleware are designed to be used across all microservices
 * for consistent request handling, error processing, and auditing.
 *
 * @example
 * ```typescript
 * import {
 *   correlationIdMiddleware,
 *   errorHandlerMiddleware,
 *   asyncHandler,
 *   auditLoggingMiddleware,
 * } from '@flamoral/shared/middleware';
 *
 * const app = express();
 *
 * // Order matters! Register in this sequence:
 * app.use(correlationIdMiddleware);  // 1. First - generates correlation IDs
 * app.use(auditLoggingMiddleware);   // 2. Audit logging
 * app.use('/api', routes);           // 3. Your routes
 * app.use(notFoundHandler);          // 4. 404 handler
 * app.use(errorHandlerMiddleware);   // 5. Last - error handler
 * ```
 */

// ============================================================================
// Error Handler Middleware
// ============================================================================
export {
  errorHandlerMiddleware,
  notFoundHandler,
  initializeGlobalErrorHandlers,
  getErrorMetrics,
  resetErrorMetrics,
  type RequestWithCorrelationId,
  type StandardErrorResponse,
  type ErrorMetrics,
} from './error-handler.middleware';

// Default export for error handler
export { default as errorHandler } from './error-handler.middleware';

// ============================================================================
// Correlation ID Middleware
// ============================================================================
export {
  correlationIdMiddleware,
  correlationIdMiddlewareWithOptions,
  getCorrelationId,
  createCorrelationHeaders,
  requireCorrelationId,
  CORRELATION_ID_HEADERS,
  CORRELATION_ID_RESPONSE_HEADER,
  type CorrelatedRequest,
  type CorrelationIdMiddleware,
  type CorrelationIdOptions,
} from './correlation-id.middleware';

// Default export alias for correlation middleware
export { default as correlationMiddleware } from './correlation-id.middleware';

// ============================================================================
// Request Timing Middleware
// ============================================================================
export {
  requestTimingMiddleware,
  measureAsync,
  timed,
  type TimedRequest,
  type RequestTimingOptions,
  type RequestTimingData,
} from './request-timing.middleware';

// Default export for request timing
export { default as requestTiming } from './request-timing.middleware';

// ============================================================================
// Async Handler Wrapper
// ============================================================================
export {
  asyncHandler,
  catchAsync,
  wrapAsync,
  asyncHandlerTyped,
  asyncHandlerWithCorrelation,
  jsonHandler,
  statusHandler,
  universalHandler,
  type AsyncRequestHandler,
  type MaybeAsyncHandler,
  type DataHandler,
} from './async-handler';

// Default export for async handler
export { default as wrapHandler } from './async-handler';

// ============================================================================
// Audit Logging Middleware
// ============================================================================
export {
  auditLoggingMiddleware,
  logAuditEvent,
  logCsamDetection,
  setAuditLogger,
  getAuditLogger,
  AuditEventType,
  ConsoleAuditLogger,
  type AuditRequest,
  type AuditLogEntry,
  type AuditLogger,
} from './audit-logging.middleware';

// Default export for audit middleware
export { default as auditMiddleware } from './audit-logging.middleware';

// ============================================================================
// Subscription Enforcement Middleware
// ============================================================================
export {
  createSubscriptionMiddleware,
  requireTier,
  requireFeature,
  checkUsageLimit,
  normalizeTier,
  meetsTierRequirement,
  hasFeatureAccess,
  getDailyLimits,
  TIER_HIERARCHY,
  TIER_DAILY_LIMITS,
  FEATURE_TIER_REQUIREMENTS,
  LEGACY_TIER_MAP,
  type SubscriptionTier,
  type SubscriptionRequest,
  type SubscriptionLookupFn,
} from './subscription-enforcement.middleware';

// Default export for subscription enforcement
export { default as subscriptionEnforcement } from './subscription-enforcement.middleware';

// ============================================================================
// Tier-based Rate Limiting Middleware
// ============================================================================
export {
  createTierRateLimiter,
  endpointRateLimiter,
  InMemoryRateLimitStore,
  RedisRateLimitStore,
  TIER_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
  cleanupExpiredEntries,
  type RateLimitConfig,
  type RateLimitStore,
  type RateLimitedRequest,
  type TierRateLimitOptions,
} from './tier-rate-limiting.middleware';

// Default export for rate limiting
export { default as tierRateLimiting } from './tier-rate-limiting.middleware';
