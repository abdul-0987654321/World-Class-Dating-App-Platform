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

// Get Okta configuration from environment
const getOktaConfig = () => {
  const domain = process.env.OKTA_DOMAIN;
  const issuer = process.env.OKTA_ISSUER || (domain ? `https://${domain}/oauth2/default` : '');
  const jwksUrl = issuer ? `${issuer}/v1/keys` : '';

  return { issuer, jwksUrl };
};

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

interface OktaTokenPayload {
  sub: string;
  iss: string;
  aud?: string;
  cid?: string;
  uid?: string;
  scp?: string[];
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwksClient: jwksClient.JwksClient | null = null;
  private oktaConfig: { issuer: string; jwksUrl: string };

  constructor(
    private reflector: Reflector,
    private configService: ConfigService
  ) {
    this.oktaConfig = getOktaConfig();

    // Initialize JWKS client for Okta key discovery
    if (this.oktaConfig.jwksUrl) {
      this.jwksClient = jwksClient({
        jwksUri: this.oktaConfig.jwksUrl,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 600000, // 10 minutes
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
    }
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
      // Try to verify as Okta token first (check issuer in decoded token)
      const decoded = jwt.decode(token, { complete: true });

      if (decoded && typeof decoded.payload === 'object' && 'iss' in decoded.payload) {
        const issuer = (decoded.payload as OktaTokenPayload).iss;

        if (issuer && (issuer === this.oktaConfig.issuer || issuer.includes('okta'))) {
          // Verify Okta token
          const payload = await this.verifyOktaToken(token, decoded);

          // Normalize Okta payload for downstream use
          request.user = {
            sub: payload.sub,
            userId: payload.sub,
            oktaUserId: payload.sub,
            email: payload.email,
            emailVerified: payload.email_verified,
            firstName: payload.given_name,
            lastName: payload.family_name,
            roles: [], // Will be fetched from database
            subscription: 'free', // Will be fetched from database
            isOktaUser: true,
            iat: payload.iat,
            exp: payload.exp,
          };

          return true;
        }
      }

      // Fall back to legacy JWT verification
      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = jwt.verify(token, secret!) as JwtTokenPayload;

      // Normalize the payload for downstream use
      request.user = {
        sub: payload.sub || payload.userId,
        userId: payload.sub || payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        subscription: payload.subscription || 'free',
        deviceId: payload.deviceId,
        isOktaUser: false,
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
   * Verify Okta JWT token
   * Uses JWKS for key discovery
   */
  private async verifyOktaToken(token: string, decoded: jwt.Jwt): Promise<OktaTokenPayload> {
    const kid = decoded.header?.kid;

    if (!kid || !this.jwksClient) {
      throw new Error('Cannot verify Okta token: missing kid or JWKS client');
    }

    const key = await this.getSigningKey(kid);
    const payload = jwt.verify(token, key, {
      issuer: this.oktaConfig.issuer,
      algorithms: ['RS256'],
    }) as OktaTokenPayload;

    return payload;
  }

  /**
   * Get signing key from JWKS
   */
  private getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.jwksClient) {
        reject(new Error('JWKS client not initialized'));
        return;
      }
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
