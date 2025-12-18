/**
 * Logger utility for matching service
 * Re-exports the shared logger with service-specific context
 */
import { createLogger } from '@flamoral/shared';
import type { Logger } from 'winston';

export const logger: Logger = createLogger('matching-service');
export default logger;
