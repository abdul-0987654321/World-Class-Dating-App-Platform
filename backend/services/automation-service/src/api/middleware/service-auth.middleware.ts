import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('automation-service:service-auth');

/**
 * Extended Request interface with service authentication metadata
 */
export interface ServiceAuthenticatedRequest extends Request {
  serviceId?: string;
  requestId?: string;
}

/**
 * Middleware to authenticate internal service-to-service requests
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
    logger.error('SERVICE_API_KEY not configured in environment');
    return res.status(500).json({
      success: false,
      error: 'Service authentication not configured',
      code: 'SERVICE_AUTH_NOT_CONFIGURED',
    });
  }

  // Validate service key is provided
  if (!serviceKey) {
    logger.warn('Authentication failed: Missing X-Service-Key header', { method: req.method, path: req.path });
    return res.status(401).json({
      success: false,
      error: 'Service authentication required',
      code: 'MISSING_SERVICE_KEY',
      message: 'X-Service-Key header is required for internal API access',
    });
  }

  // Validate request ID
  if (!requestId) {
    logger.warn('Authentication failed: Missing X-Request-ID header', { method: req.method, path: req.path });
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
    logger.warn('Authentication failed: Invalid service key', { sourceService: sourceService || 'unknown', method: req.method, path: req.path });
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
  logger.info('Service authenticated', { serviceId: req.serviceId, method: req.method, path: req.path, requestId: req.requestId, duration });

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
