/**
 * Service Logger Template
 * Use this template for all TypeScript microservices
 *
 * Replace 'SERVICE_NAME' with your actual service name (e.g., 'user-service', 'auth-service')
 */

import { createLogger } from '@flamoral/shared/utils';
// OR for services using backend/shared:
// import createLogger from '../../../shared/utils/logger';

/**
 * Create logger for this service
 * The logger instance is pre-configured with:
 * - Environment-aware log levels
 * - Automatic PII sanitization
 * - JSON output for production
 * - Colored console for development
 * - Correlation ID support
 */
export const logger = createLogger('SERVICE_NAME', {
  // Optional: Override log level
  // level: 'debug',

  // Optional: Disable file logging (default: true in dev, false in production)
  // enableFileLogging: false,
});

/**
 * Create child logger with additional context
 * Usage: const moduleLogger = createChildLogger(logger, { module: 'user-controller' });
 */
export { createChildLogger, addCorrelationId } from '@flamoral/shared/utils';

export default logger;

/**
 * Example Usage:
 *
 * import logger, { createChildLogger } from './utils/logger';
 *
 * // Basic logging
 * logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
 * logger.error('Failed to process payment', { orderId: '456', error: err.message });
 *
 * // Module-specific logger
 * const authLogger = createChildLogger(logger, { module: 'authentication' });
 * authLogger.debug('Verifying token', { tokenType: 'JWT' });
 *
 * // With correlation ID in middleware
 * import { addCorrelationId } from './utils/logger';
 * const requestLogger = addCorrelationId(logger, req.correlationId);
 * requestLogger.info('Processing request');
 */
