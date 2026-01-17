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
 * - Integrates with structured logging context
 * - Supports distributed tracing with trace/span IDs
 *
 * The correlation ID is used to:
 * - Track requests across multiple services
 * - Correlate logs for debugging
 * - Include in error responses for support reference
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { setLogContext, clearLogContext, type LogContext } from '../utils/logger';

/**
 * Header names for correlation ID (in order of preference)
 */
export const CORRELATION_ID_HEADERS = ['x-correlation-id', 'x-request-id', 'x-trace-id'] as const;

/**
 * Response header name for correlation ID
 */
export const CORRELATION_ID_RESPONSE_HEADER = 'X-Correlation-ID';

/**
 * Extended Request interface with correlation ID and tracing
 */
export interface CorrelatedRequest extends Request {
  correlationId: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
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
 * Options for correlation ID middleware
 */
export interface CorrelationIdOptions {
  /** Whether to set logging context automatically. Default: true */
  setLoggingContext?: boolean;
  /** Whether to extract distributed tracing headers (traceparent, etc.). Default: true */
  enableDistributedTracing?: boolean;
  /** Custom ID generator function */
  idGenerator?: () => string;
}

/**
 * Extract W3C traceparent header for distributed tracing
 * Format: version-traceId-parentId-traceFlags
 */
function extractTraceparent(req: Request): { traceId?: string; parentSpanId?: string } {
  const traceparent = req.headers['traceparent'] as string;
  if (!traceparent) return {};

  const parts = traceparent.split('-');
  if (parts.length >= 3) {
    return {
      traceId: parts[1],
      parentSpanId: parts[2],
    };
  }
  return {};
}

/**
 * Generate a new span ID (16 character hex string)
 */
function generateSpanId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
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
  correlationIdMiddlewareWithOptions()(req, res, next);
}

/**
 * Correlation ID Middleware Factory with Options
 *
 * Creates middleware with configurable options for correlation ID handling.
 *
 * @example
 * ```typescript
 * app.use(correlationIdMiddlewareWithOptions({
 *   setLoggingContext: true,
 *   enableDistributedTracing: true,
 * }));
 * ```
 */
export function correlationIdMiddlewareWithOptions(options: CorrelationIdOptions = {}) {
  const {
    setLoggingContext: shouldSetLoggingContext = true,
    enableDistributedTracing = true,
    idGenerator = generateCorrelationId,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const correlatedReq = req as CorrelatedRequest;

    // Try to extract existing correlation ID from headers
    let correlationId = extractCorrelationId(req);

    // Validate existing ID or generate new one
    if (!correlationId || !isValidCorrelationId(correlationId)) {
      correlationId = idGenerator();
    }

    // Attach correlation ID to request object
    correlatedReq.correlationId = correlationId;

    // Extract distributed tracing info if enabled
    if (enableDistributedTracing) {
      const { traceId, parentSpanId } = extractTraceparent(req);
      correlatedReq.traceId = traceId || correlationId;
      correlatedReq.parentSpanId = parentSpanId;
      correlatedReq.spanId = generateSpanId();
    }

    // Set up logging context for this request
    if (shouldSetLoggingContext) {
      const logContext: LogContext = {
        correlationId,
        traceId: correlatedReq.traceId,
        spanId: correlatedReq.spanId,
      };
      setLogContext(logContext);

      // Clear context when response finishes
      res.on('finish', () => {
        clearLogContext();
      });
    }

    // Set response headers
    res.setHeader(CORRELATION_ID_RESPONSE_HEADER, correlationId);
    res.setHeader('x-correlation-id', correlationId);

    // Set traceparent header for downstream services
    if (enableDistributedTracing && correlatedReq.traceId && correlatedReq.spanId) {
      const traceparent = `00-${correlatedReq.traceId}-${correlatedReq.spanId}-01`;
      res.setHeader('traceparent', traceparent);
    }

    next();
  };
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
  const correlatedReq = req as CorrelatedRequest;
  const correlationId = getCorrelationId(req);

  const headers: Record<string, string> = {
    'X-Correlation-ID': correlationId,
    'x-correlation-id': correlationId,
  };

  // Add distributed tracing headers if available
  if (correlatedReq.traceId && correlatedReq.spanId) {
    // Create traceparent header (W3C Trace Context format)
    // Format: version-traceId-parentId-traceFlags
    const traceparent = `00-${correlatedReq.traceId}-${correlatedReq.spanId}-01`;
    headers['traceparent'] = traceparent;
  }

  return headers;
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
