import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Cache Control Middleware
 * Sets appropriate Cache-Control headers for different types of responses
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
 */
@Injectable()
export class CacheControlMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
    const method = req.method;

    // Only apply caching to GET and HEAD requests
    if (method !== 'GET' && method !== 'HEAD') {
      return next();
    }

    // Static assets - long-term caching (1 year)
    if (this.isStaticAsset(path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
      return next();
    }

    // Profile images - cache with revalidation (1 hour)
    if (this.isProfileImage(path)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      res.setHeader('ETag', `"${Date.now()}"`); // Simple ETag for revalidation
      res.setHeader('Expires', new Date(Date.now() + 3600000).toUTCString());
      return next();
    }

    // Public data endpoints - short-term caching (5 minutes)
    if (this.isPublicDataEndpoint(path)) {
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
      res.setHeader('Expires', new Date(Date.now() + 300000).toUTCString());
      return next();
    }

    // User-specific data - private caching (1 minute)
    if (this.isUserSpecificEndpoint(path)) {
      res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate');
      return next();
    }

    // Sensitive endpoints - no caching (handled by security-headers.middleware)
    // Don't set headers here, let security-headers.middleware handle it
    if (this.isSensitiveEndpoint(path)) {
      return next();
    }

    // Default - no cache for API responses
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    next();
  }

  /**
   * Check if path is a static asset (images, fonts, etc.)
   */
  private isStaticAsset(path: string): boolean {
    const staticExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.css', '.js', '.map',
    ];
    return staticExtensions.some(ext => path.endsWith(ext));
  }

  /**
   * Check if path is a profile/media image that should be cached but revalidated
   */
  private isProfileImage(path: string): boolean {
    return path.includes('/media/') || path.includes('/photos/') || path.includes('/profile-photo/');
  }

  /**
   * Check if endpoint serves public data that can be cached
   */
  private isPublicDataEndpoint(path: string): boolean {
    const publicPatterns = [
      '/api/v1/api/public',
      '/api/v1/api/config',
      '/api/v1/api/interests',
      '/api/v1/api/passions',
      '/health',
      '/metrics',
    ];
    return publicPatterns.some(pattern => path.startsWith(pattern));
  }

  /**
   * Check if endpoint serves user-specific data
   */
  private isUserSpecificEndpoint(path: string): boolean {
    const userPatterns = [
      '/api/v1/api/users/me',
      '/api/v1/api/profiles/me',
      '/api/v1/api/matches',
      '/api/v1/api/messages',
      '/api/v1/api/notifications',
    ];
    return userPatterns.some(pattern => path.startsWith(pattern));
  }

  /**
   * Check if endpoint is sensitive and should never be cached
   */
  private isSensitiveEndpoint(path: string): boolean {
    const sensitivePatterns = [
      '/auth',
      '/login',
      '/register',
      '/password',
      '/token',
      '/payment',
      '/subscription',
      '/admin',
    ];
    return sensitivePatterns.some(pattern => path.includes(pattern));
  }
}
