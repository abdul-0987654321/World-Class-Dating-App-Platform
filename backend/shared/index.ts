// Import reflect-metadata first for decorator support
import 'reflect-metadata';

// Types
export * from './types/user.types';
export * from './types/match.types';
export * from './types/message.types';

// Utils - Enhanced Logger with Observability
export {
  default as createLogger,
  createLogger as createObservableLogger,
  ErrorCategory,
  categorizeError,
  setLogContext,
  getLogContext,
  clearLogContext,
  sanitize,
} from './utils/logger';
export type { ObservableLogger, LogContext, StructuredLogEntry } from './utils/logger';

export * from './utils/validation';
export * from './utils/encryption';
export * from './utils/env-validator';

// Constants
export * from './constants/app.constants';

// Config
export * from './config/environment';

// Services
export * from './src/services/service-client';

// Platform Intelligence - Feature Flags
export {
  FeatureFlagService,
  DEFAULT_FEATURE_FLAGS,
} from './src/platform-intelligence/feature-flags';
export type { FeatureFlag, FeatureFlagConfig } from './src/platform-intelligence/feature-flags';

// Errors - Single source of truth for error handling
export * from './errors';

// Middleware - Enhanced middleware components (selective exports to avoid conflicts with ./errors)
export {
  errorHandlerMiddleware,
  initializeGlobalErrorHandlers,
  getErrorMetrics,
  resetErrorMetrics,
  errorHandler,
  correlationIdMiddlewareWithOptions,
  createCorrelationHeaders,
  requireCorrelationId,
  CORRELATION_ID_HEADERS,
  CORRELATION_ID_RESPONSE_HEADER,
  correlationMiddleware,
  requestTimingMiddleware,
  measureAsync,
  timed,
  requestTiming,
  catchAsync,
  wrapAsync,
  asyncHandlerTyped,
  asyncHandlerWithCorrelation,
  jsonHandler,
  statusHandler,
  universalHandler,
  wrapHandler,
  auditLoggingMiddleware,
  logAuditEvent,
  logCsamDetection,
  setAuditLogger,
  getAuditLogger,
  AuditEventType,
  ConsoleAuditLogger,
  auditMiddleware,
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
  subscriptionEnforcement,
  createTierRateLimiter,
  endpointRateLimiter,
  InMemoryRateLimitStore,
  RedisRateLimitStore,
  TIER_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
  cleanupExpiredEntries,
  tierRateLimiting,
} from './middleware';
export type {
  RequestWithCorrelationId,
  ErrorMetrics,
  CorrelatedRequest,
  CorrelationIdMiddleware,
  CorrelationIdOptions,
  TimedRequest,
  RequestTimingOptions,
  RequestTimingData,
  AsyncRequestHandler,
  MaybeAsyncHandler,
  DataHandler,
  AuditRequest,
  AuditLogEntry,
  AuditLogger,
  SubscriptionTier,
  SubscriptionRequest,
  SubscriptionLookupFn,
  RateLimitConfig,
  RateLimitStore,
  RateLimitedRequest,
  TierRateLimitOptions,
} from './middleware';

// DTOs and validation (re-exported from src/dto for convenience)
export {
  PaginationDto,
  IdParamDto,
  SERVER_OWNED_FIELDS,
  UpdateProfileDto,
  RegisterDto,
  LoginDto,
  globalValidationPipe,
  RejectServerOwnedFields,
  IsStrongPassword,
} from './src/dto';
export type { ServerOwnedField } from './src/dto';
