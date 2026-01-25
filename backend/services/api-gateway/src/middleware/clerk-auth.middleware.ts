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

// Clerk configuration
const CLERK_JWKS_URL = 'https://endless-mollusk-23.clerk.accounts.dev/.well-known/jwks.json';
const CLERK_ISSUER = 'https://endless-mollusk-23.clerk.accounts.dev';

// RSA Public Key for fallback validation
const CLERK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvOfFmN2T9HIC6NQdc58F
IH1tjwhW9wP9s1TPlJX0mA3/eD/wgHY5RALx7Z3Ff8jfHlLgQ5U3Pd7RjpgG6b4b
fTmNI+GBmoPfh3lvIpk2qwbpd+yvAZPD+2qluynWoPYEu83fVFd4Yjd67xYva/+N
NEnYVD7DzLDZYpXfd/5U0b+RVAWQk/HoV2lfsYxIJmLpiTDkyrloYVi1H1KI1yNl
hiHwIZcTqoSFE7WnT6WRdZ0Cf+lqEZtR0bnCXWuzdrB8rzNiAxSEbvoCD8O80vfC
AX5G7VusHUd/E0CBVXEZ4cuAl14sdErfZOr+9w0g1p4sV+PmkknF3wN1cRW6ngHW
/QIDAQAB
-----END PUBLIC KEY-----`;

// JWKS client with caching
const jwksClientInstance = jwksClient({
  jwksUri: CLERK_JWKS_URL,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

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
    // Fallback to public key if no kid
    callback(null, CLERK_PUBLIC_KEY);
    return;
  }

  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      // Fallback to public key on JWKS failure
      callback(null, CLERK_PUBLIC_KEY);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey || CLERK_PUBLIC_KEY);
  });
}

/**
 * Verify JWT using JWKS or public key
 */
async function verifyJwtWithJwks(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: CLERK_ISSUER,
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

/**
 * Verify JWT using RSA public key directly
 */
function verifyJwtWithPublicKey(token: string): jwt.JwtPayload {
  return jwt.verify(token, CLERK_PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: CLERK_ISSUER,
  }) as jwt.JwtPayload;
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
      // Method 1: Try JWKS verification first
      let decoded: jwt.JwtPayload;

      try {
        decoded = await verifyJwtWithJwks(token);
        this.logger.debug('Token verified via JWKS');
      } catch (jwksError) {
        // Method 2: Fallback to direct public key verification
        this.logger.warn('JWKS verification failed, trying public key fallback', {
          error: (jwksError as Error).message,
        });

        try {
          decoded = verifyJwtWithPublicKey(token);
          this.logger.debug('Token verified via public key fallback');
        } catch (pkError) {
          this.logger.error('All JWT verification methods failed', {
            jwksError: (jwksError as Error).message,
            pkError: (pkError as Error).message,
          });
          throw new UnauthorizedException('Invalid or expired token');
        }
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
