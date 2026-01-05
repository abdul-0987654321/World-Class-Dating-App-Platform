/**
 * Flamoral Correlation ID Middleware
 *
 * Generates and manages correlation IDs for request tracing across services.
 *
 * Features:
 * - Generates unique UUID v4 correlation IDs for each request
 * - Preserves existing correlation IDs from upstream services
 * - Attaches correlation ID to request and response objects
 * - Enables distributed tracing across microservices
 *
 * The correlation ID is used to:
 * - Track requests across multiple services
 * - Correlate logs for debugging
 * - Include in error responses for support reference
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Header names for correlation ID (in order of preference)
 */
export const CORRELATION_ID_HEADERS = ['x-correlation-id', 'x-request-id', 'x-trace-id'] as const;

/**
 * Response header name for correlation ID
 */
export const CORRELATION_ID_RESPONSE_HEADER = 'X-Correlation-ID';

/**
 * Extended Request interface with correlation ID
 */
export interface CorrelatedRequest extends Request {
  correlationId: string;
}

/**
 * Extract existing correlation ID from request headers
 * Checks multiple common header names for compatibility
 */
function extractCorrelationId(req: Request): string | undefined {
  for (const header of CORRELATION_ID_HEADERS) {
    const value = req.headers[header];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Generate a new correlation ID
 * Uses UUID v4 for uniqueness and standard format
 */
function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Validate correlation ID format
 * Basic validation to prevent injection attacks
 */
function isValidCorrelationId(id: string): boolean {
  // Allow UUIDs and similar alphanumeric identifiers
  // Max length 128 chars, alphanumeric with dashes and underscores
  const pattern = /^[a-zA-Z0-9\-_]{1,128}$/;
  return pattern.test(id);
}

/**
 * Correlation ID Middleware
 *
 * Adds a correlation ID to each request for distributed tracing.
 * If an existing correlation ID is present in headers, it is preserved.
 * Otherwise, a new UUID is generated.
 *
 * @example
 * ```typescript
 * import { correlationIdMiddleware } from '@flamoral/shared/middleware';
 *
 * // Register early in middleware chain
 * app.use(correlationIdMiddleware);
 *
 * // Access in route handlers
 * app.get('/api/users', (req, res) => {
 *   console.log('Correlation ID:', req.correlationId);
 * });
 * ```
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Try to extract existing correlation ID from headers
  let correlationId = extractCorrelationId(req);

  // Validate existing ID or generate new one
  if (!correlationId || !isValidCorrelationId(correlationId)) {
    correlationId = generateCorrelationId();
  }

  // Attach to request object
  (req as CorrelatedRequest).correlationId = correlationId;

  // Set response header so clients can reference it
  res.setHeader(CORRELATION_ID_RESPONSE_HEADER, correlationId);

  // Also set as a lowercase header for consistency
  res.setHeader('x-correlation-id', correlationId);

  next();
}

/**
 * Get correlation ID from request
 * Utility function for use in services and handlers
 */
export function getCorrelationId(req: Request): string {
  const correlatedReq = req as CorrelatedRequest;
  if (correlatedReq.correlationId) {
    return correlatedReq.correlationId;
  }

  // Fallback to header extraction
  const fromHeader = extractCorrelationId(req);
  if (fromHeader && isValidCorrelationId(fromHeader)) {
    return fromHeader;
  }

  // Return a placeholder if none found
  return 'unknown';
}

/**
 * Create headers object with correlation ID for outgoing requests
 * Use when making calls to other services to propagate the correlation ID
 *
 * @example
 * ```typescript
 * const headers = createCorrelationHeaders(req);
 * await fetch('http://other-service/api', { headers });
 * ```
 */
export function createCorrelationHeaders(req: Request): Record<string, string> {
  const correlationId = getCorrelationId(req);
  return {
    'X-Correlation-ID': correlationId,
    'x-correlation-id': correlationId,
  };
}

/**
 * Middleware that requires a correlation ID
 * Use for internal service-to-service communication
 * Rejects requests without a valid correlation ID
 */
export function requireCorrelationId(req: Request, res: Response, next: NextFunction): void {
  const existingId = extractCorrelationId(req);

  if (!existingId || !isValidCorrelationId(existingId)) {
    res.status(400).json({
      status: 400,
      errorCode: 'VALIDATION_FAILED',
      message: 'Missing or invalid X-Correlation-ID header',
      correlationId: 'none',
      details: null,
    });
    return;
  }

  // Attach to request
  (req as CorrelatedRequest).correlationId = existingId;
  res.setHeader(CORRELATION_ID_RESPONSE_HEADER, existingId);

  next();
}

/**
 * Express middleware type for TypeScript consumers
 */
export type CorrelationIdMiddleware = typeof correlationIdMiddleware;

export default correlationIdMiddleware;
