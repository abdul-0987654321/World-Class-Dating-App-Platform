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
 * Configuration for service authentication middleware
 */
export interface ServiceAuthConfig {
  /**
   * Whether to require X-Request-ID header for tracing
   * @default true
   */
  requireRequestId?: boolean;

  /**
   * Custom service API key (defaults to SERVICE_API_KEY env var)
   */
  serviceApiKey?: string;

  /**
   * Whether to log authentication attempts
   * @default true
   */
  enableLogging?: boolean;

  /**
   * Custom logger function
   */
  logger?: (message: string, level: 'info' | 'warn' | 'error') => void;
}

/**
 * Default logger implementation
 */
const defaultLogger = (message: string, level: 'info' | 'warn' | 'error') => {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [ServiceAuth] ${message}`);
};

/**
 * Middleware to authenticate internal service-to-service requests
 *
 * This middleware validates:
 * 1. X-Service-Key header against SERVICE_API_KEY environment variable
 * 2. Optionally validates X-Request-ID for distributed tracing
 * 3. Adds service metadata to the request for logging and monitoring
 *
 * Security features:
 * - Constant-time comparison to prevent timing attacks
 * - Request ID validation for tracing
 * - Rate limiting compatibility (can be chained with rate limiters)
 * - Detailed logging for security audits
 *
 * @param config Optional configuration for the middleware
 * @returns Express middleware function
 *
 * @example
 * // Basic usage
 * router.use('/api/internal', authenticateService());
 *
 * @example
 * // With custom configuration
 * router.use('/api/internal', authenticateService({
 *   requireRequestId: true,
 *   enableLogging: true,
 *   serviceApiKey: 'custom-key'
 * }));
 */
export const authenticateService = (config: ServiceAuthConfig = {}) => {
  const {
    requireRequestId = true,
    serviceApiKey,
    enableLogging = true,
    logger = defaultLogger,
  } = config;

  return (req: ServiceAuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Extract headers
    const serviceKey = req.headers['x-service-key'] as string;
    const requestId = req.headers['x-request-id'] as string;
    const sourceService = req.headers['x-source-service'] as string;

    // Get expected service key from config or environment
    const expectedKey = serviceApiKey || process.env.SERVICE_API_KEY;

    // Validate service key exists
    if (!expectedKey) {
      if (enableLogging) {
        logger('SERVICE_API_KEY not configured in environment', 'error');
      }
      return res.status(500).json({
        success: false,
        error: 'Service authentication not configured',
        code: 'SERVICE_AUTH_NOT_CONFIGURED',
      });
    }

    // Validate service key is provided
    if (!serviceKey) {
      if (enableLogging) {
        logger(`Authentication failed: Missing X-Service-Key header - ${req.method} ${req.path}`, 'warn');
      }
      return res.status(401).json({
        success: false,
        error: 'Service authentication required',
        code: 'MISSING_SERVICE_KEY',
        message: 'X-Service-Key header is required for internal API access',
      });
    }

    // Validate request ID if required
    if (requireRequestId && !requestId) {
      if (enableLogging) {
        logger(`Authentication failed: Missing X-Request-ID header - ${req.method} ${req.path}`, 'warn');
      }
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
      if (enableLogging) {
        logger(
          `Authentication failed: Invalid service key from ${sourceService || 'unknown'} - ${req.method} ${req.path}`,
          'warn'
        );
      }
      return res.status(403).json({
        success: false,
        error: 'Invalid service credentials',
        code: 'INVALID_SERVICE_KEY',
        message: 'The provided service key is invalid',
      });
    }

    // Authentication successful - add metadata to request
    req.serviceId = sourceService || 'unknown-service';
    req.requestId = requestId || generateRequestId();

    // Log successful authentication
    if (enableLogging) {
      const duration = Date.now() - startTime;
      logger(
        `Service authenticated: ${req.serviceId} - ${req.method} ${req.path} - RequestID: ${req.requestId} (${duration}ms)`,
        'info'
      );
    }

    // Continue to next middleware
    next();
  };
};

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  try {
    // Convert strings to buffers for constant-time comparison
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    // If lengths differ, create equal-length buffers to maintain constant time
    if (bufferA.length !== bufferB.length) {
      // Still perform comparison to maintain constant time
      crypto.timingSafeEqual(
        Buffer.alloc(32, bufferA),
        Buffer.alloc(32, bufferB)
      );
      return false;
    }

    // Perform constant-time comparison
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    // If comparison fails, return false
    return false;
  }
}

/**
 * Generate a unique request ID for tracing
 * @returns UUID v4 string
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Middleware factory for specific service authentication
 * Useful when you want to restrict endpoints to specific services only
 *
 * @param allowedServices Array of service IDs that are allowed to access the endpoint
 * @returns Express middleware function
 *
 * @example
 * router.post('/api/internal/notify',
 *   authenticateService(),
 *   requireServiceAccess(['payment-service', 'matching-service']),
 *   notificationController.send
 * );
 */
export const requireServiceAccess = (allowedServices: string[]) => {
  return (req: ServiceAuthenticatedRequest, res: Response, next: NextFunction) => {
    const sourceService = req.headers['x-source-service'] as string;

    if (!sourceService || !allowedServices.includes(sourceService)) {
      return res.status(403).json({
        success: false,
        error: 'Service not authorized',
        code: 'SERVICE_NOT_AUTHORIZED',
        message: `Service ${sourceService || 'unknown'} is not authorized to access this endpoint`,
      });
    }

    next();
  };
};

/**
 * Express error handler for service authentication errors
 * Add this after your routes to catch any authentication errors
 *
 * @example
 * app.use('/api/internal', internalRoutes);
 * app.use(serviceAuthErrorHandler);
 */
export const serviceAuthErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err.code === 'MISSING_SERVICE_KEY' || err.code === 'INVALID_SERVICE_KEY') {
    return res.status(err.code === 'MISSING_SERVICE_KEY' ? 401 : 403).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  next(err);
};

// Export for backward compatibility
export const authenticateInternal = authenticateService();
