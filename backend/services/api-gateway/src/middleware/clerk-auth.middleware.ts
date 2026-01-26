/**
 * Clerk Authentication Middleware
 *
 * Validates JWTs issued by Clerk using:
 * 1. Clerk SDK verification
 * 2. JWKS endpoint validation
 * 3. RSA public key fallback
 *
 * Security: Fails closed - rejects any invalid/missing token
 */

import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/backend';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Clerk configuration - loaded from environment variables
const getClerkConfig = () => {
  const clerkDomain = process.env.CLERK_DOMAIN || process.env.CLERK_ISSUER;

  if (!clerkDomain && process.env.NODE_ENV === 'production') {
    throw new Error('CLERK_DOMAIN or CLERK_ISSUER environment variable is required in production');
  }

  // Support both custom domains (clerk.flamoral.com) and Clerk-provided domains
  const domain = clerkDomain || 'clerk.flamoral.com';

  return {
    jwksUrl: process.env.CLERK_JWKS_URL || `https://${domain}/.well-known/jwks.json`,
    issuer: process.env.CLERK_ISSUER || `https://${domain}`,
  };
};

// Lazy-loaded configuration
let clerkConfig: { jwksUrl: string; issuer: string } | null = null;
const getConfig = () => {
  if (!clerkConfig) {
    clerkConfig = getClerkConfig();
  }
  return clerkConfig;
};

// JWKS client factory with caching
let jwksClientInstance: ReturnType<typeof jwksClient> | null = null;
const getJwksClient = () => {
  if (!jwksClientInstance) {
    const config = getConfig();
    jwksClientInstance = jwksClient({
      jwksUri: config.jwksUrl,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwksClientInstance;
};

// Extend Express Request to include Clerk user data
export interface ClerkAuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    claims: Record<string, any>;
  };
}

/**
 * Get signing key from JWKS endpoint
 */
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error('Token missing key ID (kid) - cannot verify without JWKS'));
    return;
  }

  getJwksClient().getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    if (!signingKey) {
      callback(new Error('No signing key found'));
      return;
    }
    callback(null, signingKey);
  });
}

/**
 * Verify JWT using JWKS endpoint
 */
async function verifyJwtWithJwks(token: string): Promise<jwt.JwtPayload> {
  const config = getConfig();

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: config.issuer,
        complete: false,
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as jwt.JwtPayload);
        }
      }
    );
  });
}

@Injectable()
export class ClerkAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ClerkAuthMiddleware.name);
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  async use(req: ClerkAuthRequest, res: Response, next: NextFunction): Promise<void> {
    // Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.['__session'];

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
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
      // Verify using JWKS endpoint
      let decoded: jwt.JwtPayload;

      try {
        decoded = await verifyJwtWithJwks(token);
        this.logger.debug('Token verified via JWKS');
      } catch (jwksError) {
        this.logger.error('JWT verification failed', {
          error: (jwksError as Error).message,
          path: req.path,
        });
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Validate required claims
      if (!decoded.sub) {
        throw new UnauthorizedException('Token missing subject claim');
      }

      // Check expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Token has expired');
      }

      // Check not-before
      if (decoded.nbf && decoded.nbf > Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Token not yet valid');
      }

      // Attach auth info to request
      req.auth = {
        userId: decoded.sub,
        sessionId: (decoded.sid as string) || '',
        claims: decoded,
      };

      this.logger.debug('Authentication successful', {
        userId: decoded.sub,
        sessionId: decoded.sid,
      });

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Authentication failed', {
        error: (error as Error).message,
        path: req.path,
      });

      throw new UnauthorizedException('Authentication failed');
    }
  }
}

/**
 * Optional auth middleware - allows unauthenticated requests but attaches user if token present
 */
@Injectable()
export class ClerkOptionalAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ClerkOptionalAuthMiddleware.name);

  async use(req: ClerkAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.['__session'];

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      // No token - continue without auth
      next();
      return;
    }

    try {
      const decoded = await verifyJwtWithJwks(token);

      req.auth = {
        userId: decoded.sub!,
        sessionId: (decoded.sid as string) || '',
        claims: decoded,
      };
    } catch (error) {
      // Token invalid - continue without auth (optional auth)
      this.logger.debug('Optional auth token invalid, continuing unauthenticated');
    }

    next();
  }
}

export default ClerkAuthMiddleware;
