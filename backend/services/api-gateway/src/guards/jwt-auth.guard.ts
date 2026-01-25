import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Clerk JWKS URL for key discovery
const CLERK_JWKS_URL = 'https://endless-mollusk-23.clerk.accounts.dev/.well-known/jwks.json';
const CLERK_ISSUER = 'https://endless-mollusk-23.clerk.accounts.dev';

// Clerk RSA public key (fallback if JWKS fails)
const CLERK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvOfFmN2T9HIC6NQdc58F
IH1tjwhW9wP9s1TPlJX0mA3/eD/wgHY5RALx7Z3Ff8jfHlLgQ5U3Pd7RjpgG6b4b
fTmNI+GBmoPfh3lvIpk2qwbpd+yvAZPD+2qluynWoPYEu83fVFd4Yjd67xYva/+N
NEnYVD7DzLDZYpXfd/5U0b+RVAWQk/HoV2lfsYxIJmLpiTDkyrloYVi1H1KI1yNl
hiHwIZcTqoSFE7WnT6WRdZ0Cf+lqEZtR0bnCXWuzdrB8rzNiAxSEbvoCD8O80vfC
AX5G7VusHUd/E0CBVXEZ4cuAl14sdErfZOr+9w0g1p4sV+PmkknF3wN1cRW6ngHW
/QIDAQAB
-----END PUBLIC KEY-----`;

interface JwtTokenPayload {
  sub: string;
  userId?: string;
  email?: string;
  roles?: string[];
  subscription?: string;
  deviceId?: string;
  iat: number;
  exp: number;
}

interface ClerkTokenPayload {
  sub: string;
  iss: string;
  azp?: string;
  sid?: string;
  email?: string;
  email_verified?: boolean;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  iat: number;
  exp: number;
  nbf?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwksClient: jwksClient.JwksClient;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService
  ) {
    // Initialize JWKS client for Clerk key discovery
    this.jwksClient = jwksClient({
      jwksUri: CLERK_JWKS_URL,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please provide a valid Bearer token.',
      });
    }

    try {
      // Try to verify as Clerk token first (check issuer in decoded token)
      const decoded = jwt.decode(token, { complete: true });

      if (decoded && typeof decoded.payload === 'object' && 'iss' in decoded.payload) {
        const issuer = (decoded.payload as ClerkTokenPayload).iss;

        if (issuer === CLERK_ISSUER || issuer?.includes('clerk')) {
          // Verify Clerk token
          const payload = await this.verifyClerkToken(token, decoded);

          // Normalize Clerk payload for downstream use
          request.user = {
            sub: payload.sub,
            userId: payload.sub,
            clerkUserId: payload.sub,
            email: payload.email,
            emailVerified: payload.email_verified,
            firstName: payload.first_name,
            lastName: payload.last_name,
            imageUrl: payload.image_url,
            roles: [], // Will be fetched from database
            subscription: 'free', // Will be fetched from database
            sessionId: payload.sid,
            isClerkUser: true,
            iat: payload.iat,
            exp: payload.exp,
          };

          return true;
        }
      }

      // Fall back to legacy JWT verification
      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = jwt.verify(token, secret) as JwtTokenPayload;

      // Normalize the payload for downstream use
      request.user = {
        sub: payload.sub || payload.userId,
        userId: payload.sub || payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        subscription: payload.subscription || 'free',
        deviceId: payload.deviceId,
        isClerkUser: false,
        iat: payload.iat,
        exp: payload.exp,
      };

      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException({
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException({
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token. Please log in again.',
        });
      }

      this.logger.error('JWT verification failed', { error: (error as Error).message });

      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication failed. Please try logging in again.',
      });
    }
  }

  /**
   * Verify Clerk JWT token
   * Uses JWKS for key discovery with RSA public key fallback
   */
  private async verifyClerkToken(token: string, decoded: jwt.Jwt): Promise<ClerkTokenPayload> {
    const kid = decoded.header?.kid;

    // Try JWKS first
    if (kid) {
      try {
        const key = await this.getSigningKey(kid);
        const payload = jwt.verify(token, key, {
          issuer: CLERK_ISSUER,
          algorithms: ['RS256'],
        }) as ClerkTokenPayload;

        return payload;
      } catch (jwksError) {
        this.logger.warn('JWKS verification failed, trying public key fallback', {
          error: (jwksError as Error).message,
        });
      }
    }

    // Fallback to static public key
    const payload = jwt.verify(token, CLERK_PUBLIC_KEY, {
      issuer: CLERK_ISSUER,
      algorithms: ['RS256'],
    }) as ClerkTokenPayload;

    return payload;
  }

  /**
   * Get signing key from JWKS
   */
  private getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          reject(new Error('No public key found'));
          return;
        }
        resolve(signingKey);
      });
    });
  }

  private extractToken(request: any): string | null {
    // SECURITY: Check httpOnly cookie first (preferred, XSS-safe)
    // Then fall back to Authorization header for backwards compatibility and mobile apps
    if (request.cookies?.access_token) {
      const cookieToken = request.cookies.access_token;
      // Validate token has JWT structure (header.payload.signature)
      const parts = cookieToken.split('.');
      if (parts.length === 3) {
        return cookieToken;
      }
    }

    // Fallback to Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    // RFC 6750: OAuth 2.0 Bearer Token - Enforce strict "Bearer " prefix
    // Security: Do not accept tokens without proper Bearer prefix to prevent bypass attacks
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7).trim();

    // Validate token has JWT structure (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    return token;
  }
}
