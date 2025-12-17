const fs = require('fs');
const path = require('path');

const loggerPath = path.join(__dirname, 'src', 'utils', 'logger.ts');

const newLoggerContent = `import winston from 'winston';

const createLogger = (serviceName: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });
};

const logger = createLogger('advertising-service');

export default logger;
`;

fs.writeFileSync(loggerPath, newLoggerContent, 'utf8');
console.log('Fixed logger.ts');
