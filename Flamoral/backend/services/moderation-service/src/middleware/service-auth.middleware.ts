import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Extended Request interface with service authentication metadata
 */
export interface ServiceAuthenticatedRequest extends Request {
  serviceId?: string;
  requestId?: string;
}

/**
 * Middleware to authenticate internal service-to-service requests
 *
 * This middleware validates:
 * 1. X-Service-Key header against SERVICE_API_KEY environment variable
 * 2. X-Request-ID for distributed tracing
 * 3. Adds service metadata to the request for logging
 *
 * Security features:
 * - Constant-time comparison to prevent timing attacks
 * - Request ID validation for tracing
 * - Detailed logging for security audits
 */
export const authenticateService = (
  req: ServiceAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Extract headers
  const serviceKey = req.headers['x-service-key'] as string;
  const requestId = req.headers['x-request-id'] as string;
  const sourceService = req.headers['x-source-service'] as string;

  // Get expected service key from environment
  const expectedKey = process.env.SERVICE_API_KEY;

  // Validate service key exists
  if (!expectedKey) {
    console.error('[ServiceAuth] SERVICE_API_KEY not configured in environment');
    return res.status(500).json({
      success: false,
      error: 'Service authentication not configured',
      code: 'SERVICE_AUTH_NOT_CONFIGURED',
    });
  }

  // Validate service key is provided
  if (!serviceKey) {
    console.warn(`[ServiceAuth] Authentication failed: Missing X-Service-Key header - ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Service authentication required',
      code: 'MISSING_SERVICE_KEY',
      message: 'X-Service-Key header is required for internal API access',
    });
  }

  // Validate request ID
  if (!requestId) {
    console.warn(`[ServiceAuth] Authentication failed: Missing X-Request-ID header - ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Request ID required',
      code: 'MISSING_REQUEST_ID',
      message: 'X-Request-ID header is required for internal API access',
    });
  }

  // Perform constant-time comparison to prevent timing attacks
  const isValid = timingSafeEqual(serviceKey, expectedKey);

  if (!isValid) {
    console.warn(
      `[ServiceAuth] Authentication failed: Invalid service key from ${sourceService || 'unknown'} - ${req.method} ${req.path}`
    );
    return res.status(403).json({
      success: false,
      error: 'Invalid service credentials',
      code: 'INVALID_SERVICE_KEY',
      message: 'The provided service key is invalid',
    });
  }

  // Authentication successful - add metadata to request
  req.serviceId = sourceService || 'unknown-service';
  req.requestId = requestId;

  // Log successful authentication
  const duration = Date.now() - startTime;
  console.info(
    `[ServiceAuth] Service authenticated: ${req.serviceId} - ${req.method} ${req.path} - RequestID: ${req.requestId} (${duration}ms)`
  );

  // Continue to next middleware
  next();
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    if (bufferA.length !== bufferB.length) {
      crypto.timingSafeEqual(Buffer.alloc(32, bufferA), Buffer.alloc(32, bufferB));
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    return false;
  }
}

// Export for backward compatibility
export const authenticateInternal = authenticateService;
