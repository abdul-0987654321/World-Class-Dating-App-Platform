/**
 * User Service Logger
 */

import createLogger from '../../../../shared/utils/logger';

export const logger = createLogger('user-service');
export { createChildLogger, addCorrelationId } from '../../../../shared/utils/logger';
export default logger;
