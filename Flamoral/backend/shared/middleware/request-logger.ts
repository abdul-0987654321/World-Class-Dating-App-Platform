/**
 * Request Logging Middleware
 * Logs HTTP requests and responses with correlation IDs
 */

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { getCorrelationId } from './correlation-id';

interface RequestLoggerOptions {
  logger: winston.Logger;
  includeBody?: boolean;
  includeHeaders?: boolean;
  excludePaths?: string[];
}

/**
 * Create request logging middleware
 */
export function createRequestLogger(options: RequestLoggerOptions) {
  const { logger, includeBody = false, includeHeaders = false, excludePaths = [] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();
    const correlationId = getCorrelationId();

    // Create child logger with correlation ID
    const requestLogger = correlationId
      ? logger.child({ correlationId })
      : logger;

    // Log request
    const requestLog: any = {
      method: req.method,
      path: req.path,
      url: req.url,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    if (includeHeaders) {
      requestLog.headers = sanitizeHeaders(req.headers);
    }

    if (includeBody && req.body) {
      requestLog.body = req.body;
    }

    requestLogger.info('Incoming request', requestLog);

    // Capture response
    const originalSend = res.send;
    let responseBody: any;

    res.send = function(body: any): Response {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const responseLog: any = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      };

      if (includeBody && responseBody) {
        responseLog.responseSize = JSON.stringify(responseBody).length;
      }

      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      requestLogger.log(level, 'Request completed', responseLog);
    });

    next();
  };
}

/**
 * Sanitize sensitive headers
 */
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}
