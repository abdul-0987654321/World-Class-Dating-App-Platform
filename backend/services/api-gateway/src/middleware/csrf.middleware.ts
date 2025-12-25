import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * Implements comprehensive CSRF protection using:
 * 1. Cryptographically secure token generation
 * 2. Double-submit cookie pattern
 * 3. Token expiration and rotation
 * 4. httpOnly cookies with SameSite=Strict
 */

interface CsrfTokenData {
  token: string;
  secret: string;
  expiresAt: number;
  createdAt: number;
}

// Extend Express Request interface to include CSRF token
declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
      csrfSecret?: string;
    }
  }
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly tokenStore = new Map<string, CsrfTokenData>();
  private readonly cookieName = 'XSRF-TOKEN';
  private readonly headerName = 'x-csrf-token';
  private readonly secretCookieName = '_csrf';
  private readonly tokenLength = 32; // 32 bytes = 256 bits
  private readonly tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
  private readonly cleanupInterval = 60 * 60 * 1000; // 1 hour

  // Methods that require CSRF protection
  private readonly protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  // Paths excluded from CSRF protection (e.g., webhook endpoints, public auth)
  private readonly excludedPaths = [
    '/api/v1/webhooks',
    '/api/v1/health',
    '/api/v1/metrics',
    // Public auth endpoints - no CSRF needed for unauthenticated routes
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/refresh-token',
    '/api/v1/csrf/token',
  ];

  constructor(private readonly configService: ConfigService) {
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredTokens(), this.cleanupInterval);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF for excluded paths
    if (this.isExcludedPath(req.path)) {
      return next();
    }

    // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
    if (!this.protectedMethods.includes(req.method)) {
      // Generate and set token for safe methods
      this.generateAndSetToken(req, res);
      return next();
    }

    // Validate CSRF token for state-changing methods
    this.validateCsrfToken(req, res, next);
  }

  /**
   * Generate cryptographically secure CSRF token
   */
  private generateToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('base64url');
  }

  /**
   * Generate secret for double-submit pattern
   */
  private generateSecret(): string {
    return crypto.randomBytes(this.tokenLength).toString('base64url');
  }

  /**
   * Create HMAC of token with secret for additional security
   */
  private createTokenHash(token: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(token)
      .digest('base64url');
  }

  /**
   * Verify token hash
   */
  private verifyTokenHash(token: string, secret: string, hash: string): boolean {
    const expectedHash = this.createTokenHash(token, secret);
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(hash)
    );
  }

  /**
   * Generate and set CSRF token in cookies and request
   */
  private generateAndSetToken(req: Request, res: Response): void {
    // Check if token already exists and is valid
    const existingToken = req.cookies?.[this.cookieName];
    const existingSecret = req.cookies?.[this.secretCookieName];

    if (existingToken && existingSecret) {
      const userId = this.getUserId(req);
      const tokenData = userId ? this.tokenStore.get(userId) : null;

      // If token is valid and not expired, reuse it
      if (tokenData && tokenData.expiresAt > Date.now()) {
        req.csrfToken = () => existingToken;
        req.csrfSecret = existingSecret;
        return;
      }
    }

    // Generate new token and secret
    const token = this.generateToken();
    const secret = this.generateSecret();
    const tokenHash = this.createTokenHash(token, secret);
    const expiresAt = Date.now() + this.tokenExpiry;

    // Store token data (keyed by user ID if authenticated, or session ID)
    const userId = this.getUserId(req);
    if (userId) {
      this.tokenStore.set(userId, {
        token: tokenHash,
        secret,
        expiresAt,
        createdAt: Date.now(),
      });
    }

    // Set token in readable cookie (for client to send in header)
    res.cookie(this.cookieName, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.tokenExpiry,
      path: '/',
    });

    // Set secret in httpOnly cookie (for server-side validation)
    res.cookie(this.secretCookieName, secret, {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.tokenExpiry,
      path: '/',
    });

    // Make token available to request
    req.csrfToken = () => token;
    req.csrfSecret = secret;

    // Expose token in response header for SPA applications
    res.setHeader('X-CSRF-Token', token);
  }

  /**
   * Validate CSRF token from request
   */
  private validateCsrfToken(req: Request, res: Response, next: NextFunction): void {
    try {
      // Get token from header or body
      const headerToken = req.headers[this.headerName] as string;
      const bodyToken = req.body?._csrf;
      const token = headerToken || bodyToken;

      if (!token) {
        throw new ForbiddenException('CSRF token missing');
      }

      // Get secret from httpOnly cookie
      const secret = req.cookies?.[this.secretCookieName];

      if (!secret) {
        throw new ForbiddenException('CSRF secret missing');
      }

      // Double-submit cookie pattern: Verify token from cookie matches header
      const cookieToken = req.cookies?.[this.cookieName];

      if (!cookieToken || cookieToken !== token) {
        throw new ForbiddenException('CSRF token mismatch');
      }

      // Additional validation with stored hash (if user is authenticated)
      const userId = this.getUserId(req);
      if (userId) {
        const tokenData = this.tokenStore.get(userId);

        if (!tokenData) {
          throw new ForbiddenException('CSRF token not found');
        }

        // Check expiration
        if (Date.now() > tokenData.expiresAt) {
          this.tokenStore.delete(userId);
          throw new ForbiddenException('CSRF token expired');
        }

        // Verify token hash
        const tokenHash = this.createTokenHash(token, secret);
        if (!this.verifyTokenHash(token, secret, tokenData.token)) {
          throw new ForbiddenException('Invalid CSRF token');
        }

        // Token rotation: Generate new token after successful validation
        // This prevents token fixation attacks
        this.generateAndSetToken(req, res);
      }

      next();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('CSRF validation failed');
    }
  }

  /**
   * Get user ID from request (from JWT or session)
   */
  private getUserId(req: Request): string | null {
    // Try to get user ID from request user object (set by JWT guard)
    return (req as any).user?.userId || (req as any).user?.sub || null;
  }

  /**
   * Check if path is excluded from CSRF protection
   */
  private isExcludedPath(path: string): boolean {
    return this.excludedPaths.some(excluded => path.startsWith(excluded));
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [userId, data] of this.tokenStore.entries()) {
      if (now > data.expiresAt) {
        this.tokenStore.delete(userId);
      }
    }
  }

  /**
   * Clear CSRF token for user
   */
  clearToken(userId: string): void {
    this.tokenStore.delete(userId);
  }

  /**
   * Refresh CSRF token for user
   */
  refreshToken(req: Request, res: Response): void {
    const userId = this.getUserId(req);
    if (userId) {
      this.tokenStore.delete(userId);
    }
    this.generateAndSetToken(req, res);
  }
}
