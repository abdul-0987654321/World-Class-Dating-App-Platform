/**
 * Logger utility for matching service
 * Re-exports the shared logger with service-specific context
 */
import { createLogger } from '@flamoral/shared';

export const logger = createLogger('matching-service');
export default logger;
