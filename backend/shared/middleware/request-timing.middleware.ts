/**
 * Flamoral Request Timing Middleware
 *
 * Tracks request duration and logs request/response details for observability.
 *
 * Features:
 * - Records request start time using high-resolution timer
 * - Logs request completion with duration, status code, and metadata
 * - Integrates with correlation ID for distributed tracing
 * - Supports configurable logging thresholds
 * - Provides metrics for slow request detection
 */

import { Request, Response, NextFunction } from 'express';
import createLogger, {
  setLogContext,
  clearLogContext,
  type LogContext,
  type ObservableLogger
} from '../utils/logger';

// Create logger for request timing
const defaultLogger = createLogger('request-timing');

/**
 * Extended Request interface with timing data
 */
export interface TimedRequest extends Request {
  startTime: [number, number];  // High-resolution time from process.hrtime()
  correlationId?: string;
}

/**
 * Options for request timing middleware
 */
export interface RequestTimingOptions {
  /** Custom logger instance */
  logger?: ObservableLogger;
  /** Log requests that take longer than this (ms). Default: 0 (log all) */
  slowRequestThreshold?: number;
  /** Log slow requests at warning level. Default: 1000ms */
  warnThreshold?: number;
  /** Skip logging for these paths (e.g., health checks) */
  skipPaths?: string[];
  /** Include request body in logs (sanitized). Default: false */
  logBody?: boolean;
  /** Include response body in logs. Default: false */
  logResponseBody?: boolean;
  /** Maximum body length to log. Default: 1000 */
  maxBodyLength?: number;
  /** Callback when request completes */
  onRequestComplete?: (data: RequestTimingData) => void;
}

/**
 * Data collected for each request
 */
export interface RequestTimingData {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  correlationId: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  contentLength?: number;
  responseSize?: number;
}

/**
 * Convert high-resolution time to milliseconds
 */
function hrTimeToMs(hrTime: [number, number]): number {
  return hrTime[0] * 1000 + hrTime[1] / 1e6;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Truncate string to maximum length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...[truncated]';
}

/**
 * Request Timing Middleware Factory
 *
 * Creates middleware that tracks request timing and logs details.
 *
 * @example
 * ```typescript
 * import { requestTimingMiddleware } from '@flamoral/backend-shared';
 *
 * // Basic usage
 * app.use(requestTimingMiddleware());
 *
 * // With options
 * app.use(requestTimingMiddleware({
 *   slowRequestThreshold: 500,
 *   skipPaths: ['/health', '/ready'],
 *   onRequestComplete: (data) => {
 *     metrics.recordRequestDuration(data.durationMs, data.path);
 *   }
 * }));
 * ```
 */
export function requestTimingMiddleware(options: RequestTimingOptions = {}) {
  const {
    logger = defaultLogger,
    slowRequestThreshold = 0,
    warnThreshold = 1000,
    skipPaths = ['/health', '/ready', '/favicon.ico'],
    logBody = false,
    logResponseBody = false,
    maxBodyLength = 1000,
    onRequestComplete,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging for specified paths
    if (skipPaths.some(path => req.path === path || req.path.startsWith(path))) {
      return next();
    }

    // Record start time
    const timedReq = req as TimedRequest;
    timedReq.startTime = process.hrtime();

    // Extract correlation ID (set by correlation middleware)
    const correlationId = timedReq.correlationId ||
      (req.headers['x-correlation-id'] as string) ||
      'unknown';

    // Set up logging context for this request
    const logContext: LogContext = {
      correlationId,
      method: req.method,
      path: req.path,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    };
    setLogContext(logContext);

    // Log request start (debug level)
    logger.debug(`Request started: ${req.method} ${req.path}`, {
      correlationId,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: logBody && req.body ? truncate(JSON.stringify(req.body), maxBodyLength) : undefined,
    });

    // Capture response data
    const originalSend = res.send;
    let responseBody: string | undefined;
    let responseSize = 0;

    res.send = function(body?: any): Response {
      responseSize = body ? Buffer.byteLength(body) : 0;
      if (logResponseBody && body) {
        responseBody = truncate(typeof body === 'string' ? body : JSON.stringify(body), maxBodyLength);
      }
      return originalSend.call(this, body);
    };

    // Handle response finish
    res.on('finish', () => {
      // Calculate duration
      const diff = process.hrtime(timedReq.startTime);
      const durationMs = Math.round(hrTimeToMs(diff) * 100) / 100; // Round to 2 decimal places

      // Get user ID if available (set by auth middleware)
      const userId = (req as any).user?.id || (req as any).user?.userId;

      // Build timing data
      const timingData: RequestTimingData = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        correlationId,
        userId,
        userAgent: req.headers['user-agent'],
        ip: getClientIp(req),
        contentLength: req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : undefined,
        responseSize,
      };

      // Determine if we should log this request
      const shouldLog = durationMs >= slowRequestThreshold;

      if (shouldLog) {
        // Determine log level based on status and duration
        const isError = res.statusCode >= 500;
        const isClientError = res.statusCode >= 400 && res.statusCode < 500;
        const isSlow = durationMs >= warnThreshold;

        // Log with appropriate level
        if (isError) {
          logger.error(`Request completed: ${req.method} ${req.path}`, {
            ...timingData,
            responseBody: logResponseBody ? responseBody : undefined,
          });
        } else if (isSlow) {
          logger.warn(`Slow request: ${req.method} ${req.path} took ${durationMs}ms`, {
            ...timingData,
            slowRequest: true,
          });
        } else if (isClientError) {
          logger.warn(`Client error: ${req.method} ${req.path}`, timingData);
        } else {
          logger.info(`Request completed: ${req.method} ${req.path}`, timingData);
        }
      }

      // Call completion callback if provided
      if (onRequestComplete) {
        try {
          onRequestComplete(timingData);
        } catch (callbackError) {
          logger.error('Error in onRequestComplete callback', { error: callbackError });
        }
      }

      // Clear logging context
      clearLogContext();
    });

    // Handle response close (client disconnected)
    res.on('close', () => {
      if (!res.writableFinished) {
        const diff = process.hrtime(timedReq.startTime);
        const durationMs = Math.round(hrTimeToMs(diff) * 100) / 100;

        logger.warn(`Request aborted: ${req.method} ${req.path}`, {
          correlationId,
          durationMs,
          aborted: true,
        });

        clearLogContext();
      }
    });

    next();
  };
}

/**
 * Simple timing wrapper for async operations
 * Returns the duration in milliseconds
 *
 * @example
 * ```typescript
 * const { result, durationMs } = await measureAsync(async () => {
 *   return await someOperation();
 * });
 * logger.info(`Operation took ${durationMs}ms`);
 * ```
 */
export async function measureAsync<T>(
  operation: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = process.hrtime();
  const result = await operation();
  const diff = process.hrtime(startTime);
  const durationMs = Math.round(hrTimeToMs(diff) * 100) / 100;
  return { result, durationMs };
}

/**
 * Timing decorator for class methods
 * Logs method execution time
 *
 * @example
 * ```typescript
 * class UserService {
 *   @timed()
 *   async findById(id: string) {
 *     return this.repository.findById(id);
 *   }
 * }
 * ```
 */
export function timed(logger?: ObservableLogger) {
  const log = logger || defaultLogger;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = process.hrtime();
      try {
        const result = await originalMethod.apply(this, args);
        const diff = process.hrtime(startTime);
        const durationMs = Math.round(hrTimeToMs(diff) * 100) / 100;

        log.debug(`Method ${propertyKey} completed`, {
          method: propertyKey,
          durationMs,
        });

        return result;
      } catch (error) {
        const diff = process.hrtime(startTime);
        const durationMs = Math.round(hrTimeToMs(diff) * 100) / 100;

        log.error(`Method ${propertyKey} failed`, {
          method: propertyKey,
          durationMs,
          error: (error as Error).message,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

export default requestTimingMiddleware;
