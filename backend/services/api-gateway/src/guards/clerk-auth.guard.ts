/**
 * Clerk Authentication Guard for NestJS
 *
 * Validates Clerk JWTs and enforces authentication on protected routes.
 * Uses JWKS endpoint with RSA public key fallback.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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

// Decorator keys
export const IS_PUBLIC_KEY = 'isPublic';
export const SKIP_CLERK_AUTH_KEY = 'skipClerkAuth';

// JWKS client factory with caching
let jwksClientInstance: ReturnType<typeof jwksClient> | null = null;
const getJwksClient = () => {
  if (!jwksClientInstance) {
    const config = getConfig();
    jwksClientInstance = jwksClient({
      jwksUri: config.jwksUrl,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwksClientInstance;
};

export interface ClerkUser {
  userId: string;
  sessionId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  claims: Record<string, any>;
}

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

async function verifyClerkToken(token: string): Promise<jwt.JwtPayload> {
  const config = getConfig();

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: config.issuer,
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
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if Clerk auth should be skipped (for legacy auth during migration)
    const skipClerkAuth = this.reflector.getAllAndOverride<boolean>(SKIP_CLERK_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipClerkAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Extract token
    const authHeader = request.headers.authorization;
    const cookieToken = request.cookies?.['__session'] || request.cookies?.['__clerk_db_jwt'];

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      this.logger.warn('No Clerk token provided', { path: request.path });
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const decoded = await verifyClerkToken(token);

      // Validate required claims
      if (!decoded.sub) {
        throw new UnauthorizedException('Invalid token: missing user ID');
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new UnauthorizedException('Token expired');
      }

      // Check not-before
      if (decoded.nbf && decoded.nbf > now) {
        throw new UnauthorizedException('Token not yet valid');
      }

      // Attach user to request
      const clerkUser: ClerkUser = {
        userId: decoded.sub,
        sessionId: (decoded.sid as string) || '',
        email: decoded.email as string,
        firstName: decoded.first_name as string,
        lastName: decoded.last_name as string,
        imageUrl: decoded.image_url as string,
        claims: decoded,
      };

      request.user = clerkUser;
      request.clerkUser = clerkUser;

      this.logger.debug('Clerk auth successful', { userId: decoded.sub });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Clerk auth failed', {
        error: (error as Error).message,
        path: request.path,
      });

      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}

export default ClerkAuthGuard;
