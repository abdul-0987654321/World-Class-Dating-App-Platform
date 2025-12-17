/**
 * Correlation ID Middleware
 * Adds correlation IDs to requests for distributed tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for correlation ID
export const correlationIdStorage = new AsyncLocalStorage<string>();

/**
 * Middleware to add correlation ID to requests
 */
export function correlationIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get correlation ID from request header or generate new one
    const correlationId =
      req.header('x-correlation-id') ||
      req.header('x-request-id') ||
      uuidv4();

    // Store in async local storage
    correlationIdStorage.run(correlationId, () => {
      // Add to request for easy access
      (req as any).correlationId = correlationId;

      // Add to response headers
      res.setHeader('x-correlation-id', correlationId);

      next();
    });
  };
}

/**
 * Get current correlation ID from context
 */
export function getCorrelationId(): string | undefined {
  return correlationIdStorage.getStore();
}

/**
 * Express middleware wrapper
 */
export const correlationId = correlationIdMiddleware();
