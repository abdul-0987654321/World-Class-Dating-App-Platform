/**
 * @flamoral/backend-shared
 * Shared utilities, types, and configurations for backend services
 */

// Types
export * from './types/user.types';
export * from './types/match.types';
export * from './types/message.types';

// Utils
export { default as createLogger } from './utils/logger';
export * from './utils/validation';
export * from './utils/encryption';

// Constants
export * from './constants/app.constants';

// Config
export * from './config/environment';

// Database
export * from './database/connection';
export * from './database/redis';

// Infrastructure
export * from './infrastructure/cache';
export * from './infrastructure/queue';

// Middleware
export * from './middleware/error-handler';
export * from './middleware/request-logger';
export * from './middleware/auth';

// Services
export * from './src/services/service-client';
