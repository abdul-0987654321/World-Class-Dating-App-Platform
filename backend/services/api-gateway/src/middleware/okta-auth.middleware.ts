/**
 * Okta Authentication Middleware
 *
 * Validates JWTs issued by Okta using:
 * 1. @okta/jwt-verifier for JWT validation
 * 2. JWKS endpoint validation with caching
 *
 * Security: Fails closed - rejects any invalid/missing token
 */

import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import OktaJwtVerifier from '@okta/jwt-verifier';

// Okta configuration - loaded from environment variables
const getOktaConfig = () => {
  const oktaDomain = process.env.OKTA_DOMAIN;
  const oktaIssuer = process.env.OKTA_ISSUER;
  const oktaAudience = process.env.OKTA_AUDIENCE || 'api://default';

  if (!oktaDomain && !oktaIssuer && process.env.NODE_ENV === 'production') {
    throw new Error('OKTA_DOMAIN or OKTA_ISSUER environment variable is required in production');
  }

  // Build issuer URL from domain if not explicitly provided
  const issuer = oktaIssuer || `https://${oktaDomain}/oauth2/default`;

  return {
    issuer,
    audience: oktaAudience,
    clientId: process.env.OKTA_CLIENT_ID,
  };
};

// Lazy-loaded configuration
let oktaConfig: { issuer: string; audience: string; clientId?: string } | null = null;
const getConfig = () => {
  if (!oktaConfig) {
    oktaConfig = getOktaConfig();
  }
  return oktaConfig;
};

// Lazy-loaded JWT verifier
let oktaJwtVerifier: OktaJwtVerifier | null = null;
const getJwtVerifier = () => {
  if (!oktaJwtVerifier) {
    const config = getConfig();
    oktaJwtVerifier = new OktaJwtVerifier({
      issuer: config.issuer,
      clientId: config.clientId,
    });
  }
  return oktaJwtVerifier;
};

// Extend Express Request to include Okta user data
export interface OktaAuthRequest extends Request {
  auth?: {
    userId: string;
    email?: string;
    claims: Record<string, any>;
  };
}

@Injectable()
export class OktaAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OktaAuthMiddleware.name);

  async use(req: OktaAuthRequest, res: Response, next: NextFunction): Promise<void> {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      this.logger.warn('No authentication token provided', {
        path: req.path,
        ip: req.ip,
      });
      throw new UnauthorizedException(
        'Authentication required. Please provide a valid Bearer token.'
      );
    }

    try {
      const config = getConfig();
      const verifier = getJwtVerifier();

      // Verify the access token
      const jwt = await verifier.verifyAccessToken(token, config.audience);

      // Attach auth info to request
      req.auth = {
        userId: jwt.claims.sub as string,
        email: jwt.claims.email as string | undefined,
        claims: jwt.claims,
      };

      this.logger.debug('Authentication successful', {
        userId: jwt.claims.sub,
      });

      next();
    } catch (error) {
      this.logger.error('Authentication failed', {
        error: (error as Error).message,
        path: req.path,
      });

      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/**
 * Optional auth middleware - allows unauthenticated requests but attaches user if token present
 */
@Injectable()
export class OktaOptionalAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OktaOptionalAuthMiddleware.name);

  async use(req: OktaAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      // No token - continue without auth
      next();
      return;
    }

    try {
      const config = getConfig();
      const verifier = getJwtVerifier();

      const jwt = await verifier.verifyAccessToken(token, config.audience);

      req.auth = {
        userId: jwt.claims.sub as string,
        email: jwt.claims.email as string | undefined,
        claims: jwt.claims,
      };
    } catch (error) {
      // Token invalid - continue without auth (optional auth)
      this.logger.debug('Optional auth token invalid, continuing unauthenticated');
    }

    next();
  }
}

export default OktaAuthMiddleware;
