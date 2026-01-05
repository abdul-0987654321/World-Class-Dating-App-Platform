import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

/**
 * Creates a logger instance with a specific context/module name
 * @param context - The context or module name for the logger
 * @returns Winston logger instance with the context set
 */
export function createLogger(context: string): winston.Logger {
  return logger.child({ context });
}

export { logger };
export default logger;
