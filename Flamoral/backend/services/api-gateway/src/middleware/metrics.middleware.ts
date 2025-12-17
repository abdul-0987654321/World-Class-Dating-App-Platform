import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Skip metrics collection for the metrics endpoint itself
    if (req.path === '/api/v1/metrics') {
      return next();
    }

    const startTime = Date.now();

    // Increment active connections
    this.metricsService.incrementActiveConnections();

    // Record request completion
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const route = this.sanitizeRoute(req.route?.path || req.path);
      const method = req.method;
      const statusCode = res.statusCode;

      // Record metrics
      this.metricsService.recordHttpRequest(method, route, statusCode, duration);

      // Record errors (4xx and 5xx status codes)
      if (statusCode >= 400) {
        const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
        this.metricsService.recordHttpError(method, route, errorType);
      }

      // Decrement active connections
      this.metricsService.decrementActiveConnections();
    });

    // Handle connection close
    res.on('close', () => {
      this.metricsService.decrementActiveConnections();
    });

    next();
  }

  /**
   * Sanitize route path to avoid high cardinality in metrics
   * Replace dynamic segments with placeholders
   */
  private sanitizeRoute(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[0-9a-f]{24}/gi, '/:id'); // MongoDB ObjectIDs
  }
}
