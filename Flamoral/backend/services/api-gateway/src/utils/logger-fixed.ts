/**
 * API Gateway Logger
 */

import createLogger from '../../../../shared/utils/logger';

export const logger = createLogger('api-gateway');
export { createChildLogger, addCorrelationId } from '../../../../shared/utils/logger';
export default logger;
