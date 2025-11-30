/**
 * API Versioning Middleware
 * Supports versioned API routes (/v1/, /v2/) with deprecation handling
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export type ApiVersion = 'v1' | 'v2';

export interface VersionConfig {
  current: ApiVersion;
  supported: ApiVersion[];
  deprecated: ApiVersion[];
  sunset: Record<string, string>; // version -> sunset date
}

// Default version configuration
export const VERSION_CONFIG: VersionConfig = {
  current: 'v1',
  supported: ['v1'],
  deprecated: [],
  sunset: {},
};

/**
 * Version-specific route handlers
 */
export interface VersionedRouteHandlers {
  v1?: Router;
  v2?: Router;
}

/**
 * API Versioning Middleware class
 */
export class ApiVersioning {
  private config: VersionConfig;

  constructor(config: Partial<VersionConfig> = {}) {
    this.config = { ...VERSION_CONFIG, ...config };
  }

  /**
   * Extract API version from request
   * Supports: URL path (/v1/), Header (X-API-Version), Query param (?version=)
   */
  extractVersion(req: Request): ApiVersion {
    // 1. Check URL path (highest priority)
    const pathMatch = req.path.match(/^\/v(\d+)\//);
    if (pathMatch) {
      return `v${pathMatch[1]}` as ApiVersion;
    }

    // 2. Check X-API-Version header
    const headerVersion = req.get('X-API-Version');
    if (headerVersion && this.isValidVersion(headerVersion)) {
      return headerVersion as ApiVersion;
    }

    // 3. Check query parameter
    const queryVersion = req.query.version as string;
    if (queryVersion && this.isValidVersion(queryVersion)) {
      return queryVersion as ApiVersion;
    }

    // 4. Return current/default version
    return this.config.current;
  }

  /**
   * Check if version is valid
   */
  isValidVersion(version: string): boolean {
    return this.config.supported.includes(version as ApiVersion) ||
           this.config.deprecated.includes(version as ApiVersion);
  }

  /**
   * Check if version is supported (not sunset)
   */
  isSupported(version: ApiVersion): boolean {
    return this.config.supported.includes(version);
  }

  /**
   * Check if version is deprecated
   */
  isDeprecated(version: ApiVersion): boolean {
    return this.config.deprecated.includes(version);
  }

  /**
   * Get sunset date for version
   */
  getSunsetDate(version: ApiVersion): string | undefined {
    return this.config.sunset[version];
  }

  /**
   * Middleware to extract and validate API version
   */
  versionMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const version = this.extractVersion(req);

      // Store version in request
      (req as any).apiVersion = version;

      // Check if version is valid
      if (!this.isValidVersion(version)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Unsupported API version: ${version}`,
            code: 'UNSUPPORTED_VERSION',
            supportedVersions: this.config.supported,
          },
        });
      }

      // Add version headers
      res.setHeader('X-API-Version', version);
      res.setHeader('X-API-Current-Version', this.config.current);

      // Check for deprecation
      if (this.isDeprecated(version)) {
        const sunsetDate = this.getSunsetDate(version);
        res.setHeader('Deprecation', 'true');

        if (sunsetDate) {
          res.setHeader('Sunset', sunsetDate);
        }

        res.setHeader('X-API-Deprecated', 'true');
        res.setHeader('X-API-Deprecation-Info',
          `This API version (${version}) is deprecated. Please migrate to ${this.config.current}.`);

        logger.warn('Deprecated API version used', {
          version,
          path: req.path,
          userId: req.user?.userId,
          sunsetDate,
        });
      }

      next();
    };
  }

  /**
   * Create versioned router that supports multiple versions
   */
  createVersionedRouter(handlers: VersionedRouteHandlers): Router {
    const router = Router();

    // Mount version-specific routers
    for (const [version, handler] of Object.entries(handlers)) {
      if (handler) {
        router.use(`/${version}`, handler);
      }
    }

    // Handle unversioned requests (use current version)
    const currentHandler = handlers[this.config.current];
    if (currentHandler) {
      router.use('/', currentHandler);
    }

    return router;
  }
}

// Extend Express Request to include API version
declare global {
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion;
    }
  }
}

/**
 * Helper function to create version-specific middleware
 */
export function requireVersion(minVersion: ApiVersion) {
  const versionOrder = ['v1', 'v2'];

  return (req: Request, res: Response, next: NextFunction) => {
    const currentVersion = (req as any).apiVersion || 'v1';
    const currentIndex = versionOrder.indexOf(currentVersion);
    const minIndex = versionOrder.indexOf(minVersion);

    if (currentIndex < minIndex) {
      return res.status(400).json({
        success: false,
        error: {
          message: `This endpoint requires API version ${minVersion} or higher`,
          code: 'VERSION_TOO_LOW',
          currentVersion,
          requiredVersion: minVersion,
        },
      });
    }

    next();
  };
}

/**
 * Helper function to provide different responses based on version
 */
export function versionedResponse<T>(
  req: Request,
  responses: Partial<Record<ApiVersion, T>>
): T | undefined {
  const version = (req as any).apiVersion || 'v1';
  return responses[version] || responses['v1'];
}

/**
 * Default API versioning instance
 */
export const apiVersioning = new ApiVersioning();

export default ApiVersioning;
