/**
 * @flamoral/services-shared
 * Shared utilities, middleware, and clients for backend microservices
 */

// Clients
export * from './clients/service-client';

// Middleware
export * from './middleware/error-handler.middleware';
export * from './middleware/health-check.middleware';
export * from './middleware/service-auth.middleware';

// Cache
export * from './cache/redis-cache';

// Messaging
export * from './messaging/rabbitmq';
export * from './messaging/events';

// Telemetry
export * from './telemetry/metrics';
export * from './telemetry/tracing';

// Config
export * from './config/service-config';

// Utils
export * from './utils/service-utils';
