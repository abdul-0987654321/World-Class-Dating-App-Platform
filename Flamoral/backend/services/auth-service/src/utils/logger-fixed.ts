/**
 * Auth Service Logger
 */

import createLogger from '../../../../shared/utils/logger';

export const logger = createLogger('auth-service');
export { createChildLogger, addCorrelationId } from '../../../../shared/utils/logger';
export default logger;
