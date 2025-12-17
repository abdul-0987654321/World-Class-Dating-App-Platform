/**
 * Logger utility for matching service
 * Re-exports the shared logger with service-specific context
 */
import { createLogger } from '@flamoral/shared';
import winston from 'winston';

export const logger: winston.Logger = createLogger('matching-service');
export default logger;
