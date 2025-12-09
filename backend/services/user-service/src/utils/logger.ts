import { createLogger } from '@flamoral/shared';
import type { Logger } from 'winston';

const logger: Logger = createLogger('user-service');

export { logger };
export default logger;
