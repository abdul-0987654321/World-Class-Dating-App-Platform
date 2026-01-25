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

// Clerk configuration
const CLERK_JWKS_URL = 'https://endless-mollusk-23.clerk.accounts.dev/.well-known/jwks.json';
const CLERK_ISSUER = 'https://endless-mollusk-23.clerk.accounts.dev';

// RSA Public Key
const CLERK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvOfFmN2T9HIC6NQdc58F
IH1tjwhW9wP9s1TPlJX0mA3/eD/wgHY5RALx7Z3Ff8jfHlLgQ5U3Pd7RjpgG6b4b
fTmNI+GBmoPfh3lvIpk2qwbpd+yvAZPD+2qluynWoPYEu83fVFd4Yjd67xYva/+N
NEnYVD7DzLDZYpXfd/5U0b+RVAWQk/HoV2lfsYxIJmLpiTDkyrloYVi1H1KI1yNl
hiHwIZcTqoSFE7WnT6WRdZ0Cf+lqEZtR0bnCXWuzdrB8rzNiAxSEbvoCD8O80vfC
AX5G7VusHUd/E0CBVXEZ4cuAl14sdErfZOr+9w0g1p4sV+PmkknF3wN1cRW6ngHW
/QIDAQAB
-----END PUBLIC KEY-----`;

// Decorator keys
export const IS_PUBLIC_KEY = 'isPublic';
export const SKIP_CLERK_AUTH_KEY = 'skipClerkAuth';

// JWKS client with caching
const jwksClientInstance = jwksClient({
  jwksUri: CLERK_JWKS_URL,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

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
    callback(null, CLERK_PUBLIC_KEY);
    return;
  }

  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(null, CLERK_PUBLIC_KEY);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey || CLERK_PUBLIC_KEY);
  });
}

async function verifyClerkToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: CLERK_ISSUER,
      },
      (err, decoded) => {
        if (err) {
          // Try direct public key as fallback
          try {
            const result = jwt.verify(token, CLERK_PUBLIC_KEY, {
              algorithms: ['RS256'],
              issuer: CLERK_ISSUER,
            });
            resolve(result as jwt.JwtPayload);
          } catch (fallbackErr) {
            reject(err);
          }
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
