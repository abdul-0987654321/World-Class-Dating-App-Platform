import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestLog {
  correlationId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip: string;
  userId?: string;
  requestSize?: number;
  responseSize?: number;
  error?: string;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    // Generate correlation ID
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

    // Attach correlation ID to request
    (req as any).correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    // Record start time
    const startTime = Date.now();

    // Get request size
    const requestSize = req.headers['content-length']
      ? parseInt(req.headers['content-length'], 10)
      : 0;

    // Store original end function
    const originalEnd = res.end.bind(res);
    let responseBody: any;

    // Override res.end to capture response
    res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
      if (chunk) {
        responseBody = chunk;
      }

      // Call original end
      const result = originalEnd(chunk, encoding, callback);

      // Log after response is sent
      const duration = Date.now() - startTime;
      const log: RequestLog = {
        correlationId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        ip: getClientIp(req),
        userId: (req as any).user?.userId || (req as any).user?.sub,
        requestSize,
        responseSize: responseBody ? Buffer.byteLength(responseBody) : 0,
      };

      // Add error if status code indicates error
      if (res.statusCode >= 400) {
        try {
          const errorBody = responseBody ? JSON.parse(responseBody.toString()) : {};
          log.error = errorBody.message || errorBody.error;
        } catch (e) {
          log.error = 'Unknown error';
        }
      }

      // Log based on status code
      if (res.statusCode >= 500) {
        logger.error('Request failed', log);
      } else if (res.statusCode >= 400) {
        logger.warn('Client error', log);
      } else {
        logger.log('Request completed', log);
      }

      return result;
    };

    // Log incoming request
    this.logger.log({
      correlationId,
      event: 'request_received',
      method: req.method,
      url: req.originalUrl || req.url,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    next();
  }
}

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];

  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp as string;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Structured logger for services
export class StructuredLogger {
  private logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string, data?: any, correlationId?: string) {
    this.logger.log(this.formatLog('info', message, data, correlationId));
  }

  error(message: string, error?: Error, data?: any, correlationId?: string) {
    this.logger.error(
      this.formatLog(
        'error',
        message,
        { ...data, error: error?.message, stack: error?.stack },
        correlationId
      )
    );
  }

  warn(message: string, data?: any, correlationId?: string) {
    this.logger.warn(this.formatLog('warn', message, data, correlationId));
  }

  debug(message: string, data?: any, correlationId?: string) {
    this.logger.debug(this.formatLog('debug', message, data, correlationId));
  }

  private formatLog(level: string, message: string, data?: any, correlationId?: string): string {
    const log: any = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId,
      ...data,
    };

    return JSON.stringify(log);
  }
}

// Audit logger for sensitive operations
export class AuditLogger {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('AuditLog');
  }

  log(event: string, userId: string, data?: any, correlationId?: string) {
    this.logger.log({
      timestamp: new Date().toISOString(),
      event,
      userId,
      correlationId,
      ...data,
    });
  }

  // Specific audit events
  logLogin(userId: string, ip: string, success: boolean, correlationId?: string) {
    this.log('user_login', userId, { ip, success }, correlationId);
  }

  logLogout(userId: string, correlationId?: string) {
    this.log('user_logout', userId, {}, correlationId);
  }

  logPasswordChange(userId: string, correlationId?: string) {
    this.log('password_change', userId, {}, correlationId);
  }

  logProfileUpdate(userId: string, fields: string[], correlationId?: string) {
    this.log('profile_update', userId, { fields }, correlationId);
  }

  logDataExport(userId: string, correlationId?: string) {
    this.log('data_export', userId, {}, correlationId);
  }

  logAccountDeletion(userId: string, reason?: string, correlationId?: string) {
    this.log('account_deletion', userId, { reason }, correlationId);
  }

  logSensitiveAccess(userId: string, resource: string, action: string, correlationId?: string) {
    this.log('sensitive_access', userId, { resource, action }, correlationId);
  }
}

const logger = new Logger('Request');
