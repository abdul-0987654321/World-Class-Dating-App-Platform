/**
 * Telemetry Middleware
 * Tracks API request metrics and performance
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/monitoring/logger';

/**
 * Telemetry middleware to track API requests
 */
export function telemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture response
  res.end = function (chunk?: any, encoding?: any, callback?: any): any {
    // Calculate request duration
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;

    // Track the request
    logger.trackRequest(
      `${req.method} ${req.path}`,
      req.url,
      duration,
      res.statusCode,
      success,
      {
        method: req.method,
        path: req.path,
        query: req.query,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      }
    );

    // Track custom metrics
    logger.trackMetric('api.request.duration', duration, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    });

    if (!success) {
      logger.trackMetric('api.request.errors', 1, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
      });
    }

    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

export default telemetryMiddleware;
