import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Supported API versions
 */
export enum ApiVersion {
  V1 = 'v1',
  V2 = 'v2',
}

/**
 * Version status
 */
export enum VersionStatus {
  CURRENT = 'current',
  SUPPORTED = 'supported',
  DEPRECATED = 'deprecated',
  SUNSET = 'sunset',
}

/**
 * Version metadata
 */
interface VersionMetadata {
  version: ApiVersion;
  status: VersionStatus;
  sunsetDate?: Date;
  deprecationDate?: Date;
  replacedBy?: ApiVersion;
  changes?: string[];
}

/**
 * Version registry
 */
const versionRegistry: Map<ApiVersion, VersionMetadata> = new Map([
  [
    ApiVersion.V1,
    {
      version: ApiVersion.V1,
      status: VersionStatus.CURRENT,
      changes: [
        'Initial API release',
        'Complete authentication flow',
        'Profile management',
        'Matching system',
        'Messaging system',
      ],
    },
  ],
  // V2 can be added here when ready
  // [
  //   ApiVersion.V2,
  //   {
  //     version: ApiVersion.V2,
  //     status: VersionStatus.SUPPORTED,
  //     changes: [
  //       'Enhanced security features',
  //       'Improved matching algorithm',
  //       'Video profile support',
  //     ],
  //   },
  // ],
]);

/**
 * Extract API version from request
 */
export const extractApiVersion = (req: Request): ApiVersion => {
  // 1. Check header (preferred)
  const headerVersion = req.headers['x-api-version'] as string;
  if (headerVersion && isValidVersion(headerVersion)) {
    return headerVersion as ApiVersion;
  }

  // 2. Check URL path (/api/v1/...)
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch && pathMatch[1] && isValidVersion(pathMatch[1])) {
    return pathMatch[1] as ApiVersion;
  }

  // 3. Check query parameter
  const queryVersion = req.query.version as string;
  if (queryVersion && isValidVersion(queryVersion)) {
    return queryVersion as ApiVersion;
  }

  // 4. Default to current version
  return ApiVersion.V1;
};

/**
 * Check if version string is valid
 */
const isValidVersion = (version: string): boolean => {
  return Object.values(ApiVersion).includes(version as ApiVersion);
};

/**
 * Get version metadata
 */
const getVersionMetadata = (version: ApiVersion): VersionMetadata | undefined => {
  return versionRegistry.get(version);
};

/**
 * Check if version is deprecated
 */
const isVersionDeprecated = (version: ApiVersion): boolean => {
  const metadata = getVersionMetadata(version);
  return metadata?.status === VersionStatus.DEPRECATED;
};

/**
 * Check if version is sunset (no longer supported)
 */
const isVersionSunset = (version: ApiVersion): boolean => {
  const metadata = getVersionMetadata(version);
  return metadata?.status === VersionStatus.SUNSET;
};

/**
 * API versioning middleware
 */
export const apiVersioning = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Extract version from request
    const version = extractApiVersion(req);

    // Store version in request for use in handlers
    (req as any).apiVersion = version;

    // Get version metadata
    const metadata = getVersionMetadata(version);

    if (!metadata) {
      logger.warn('Unknown API version requested', {
        version,
        path: req.path,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: 'Invalid API version',
        supportedVersions: Array.from(versionRegistry.keys()),
      });
      return;
    }

    // Check if version is sunset
    if (isVersionSunset(version)) {
      logger.warn('Sunset API version requested', {
        version,
        path: req.path,
        ip: req.ip,
      });

      res.status(410).json({
        success: false,
        error: `API version ${version} is no longer supported`,
        sunsetDate: metadata.sunsetDate,
        currentVersion: ApiVersion.V1,
        migrationGuide: `https://docs.flamoral.com/api/migration/${version}`,
      });
      return;
    }

    // Add version headers to response
    res.setHeader('X-API-Version', version);
    res.setHeader('X-API-Version-Status', metadata.status);

    // Add deprecation warning if applicable
    if (isVersionDeprecated(version)) {
      const warningMessage = metadata.sunsetDate
        ? `API version ${version} is deprecated and will be sunset on ${metadata.sunsetDate.toISOString()}`
        : `API version ${version} is deprecated`;

      res.setHeader('Warning', `299 - "${warningMessage}"`);
      res.setHeader('Deprecation', 'true');

      if (metadata.replacedBy) {
        res.setHeader('X-API-Replaced-By', metadata.replacedBy);
      }

      logger.info('Deprecated API version used', {
        version,
        path: req.path,
        userId: (req as any).user?.userId,
        sunsetDate: metadata.sunsetDate,
      });
    }

    // Add link to API documentation
    res.setHeader('Link', `<https://docs.flamoral.com/api/${version}>; rel="documentation"`);

    next();
  } catch (error) {
    logger.error('Error in API versioning middleware', error);
    next(error);
  }
};

/**
 * Middleware to enforce minimum API version
 */
export const requireMinimumVersion = (minVersion: ApiVersion) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const version = (req as any).apiVersion || extractApiVersion(req);
    const versionNumber = parseInt(version.replace('v', ''), 10);
    const minVersionNumber = parseInt(minVersion.replace('v', ''), 10);

    if (versionNumber < minVersionNumber) {
      logger.warn('API version too old for endpoint', {
        version,
        minVersion,
        path: req.path,
      });

      res.status(400).json({
        success: false,
        error: `This endpoint requires API version ${minVersion} or higher`,
        currentVersion: version,
        minimumVersion: minVersion,
      });
      return;
    }

    next();
  };
};

/**
 * Get version compatibility info
 */
export const getVersionCompatibility = (
  req: Request,
  res: Response
): void => {
  const versions = Array.from(versionRegistry.entries()).map(([version, metadata]) => ({
    version,
    status: metadata.status,
    deprecationDate: metadata.deprecationDate,
    sunsetDate: metadata.sunsetDate,
    replacedBy: metadata.replacedBy,
    changes: metadata.changes,
  }));

  res.json({
    success: true,
    versions,
    currentVersion: ApiVersion.V1,
  });
};

/**
 * Deprecate an API version
 */
export const deprecateVersion = (
  version: ApiVersion,
  sunsetDate: Date,
  replacedBy?: ApiVersion
): void => {
  const metadata = getVersionMetadata(version);

  if (metadata) {
    metadata.status = VersionStatus.DEPRECATED;
    metadata.deprecationDate = new Date();
    metadata.sunsetDate = sunsetDate;
    metadata.replacedBy = replacedBy;

    versionRegistry.set(version, metadata);

    logger.info('API version deprecated', {
      version,
      sunsetDate,
      replacedBy,
    });
  }
};

/**
 * Sunset an API version (completely remove support)
 */
export const sunsetVersion = (version: ApiVersion): void => {
  const metadata = getVersionMetadata(version);

  if (metadata) {
    metadata.status = VersionStatus.SUNSET;

    versionRegistry.set(version, metadata);

    logger.info('API version sunset', { version });
  }
};

/**
 * Add a new API version
 */
export const addVersion = (
  version: ApiVersion,
  metadata: Omit<VersionMetadata, 'version'>
): void => {
  versionRegistry.set(version, {
    version,
    ...metadata,
  });

  logger.info('New API version added', { version });
};

export default {
  apiVersioning,
  requireMinimumVersion,
  extractApiVersion,
  getVersionCompatibility,
  deprecateVersion,
  sunsetVersion,
  addVersion,
  ApiVersion,
  VersionStatus,
};
