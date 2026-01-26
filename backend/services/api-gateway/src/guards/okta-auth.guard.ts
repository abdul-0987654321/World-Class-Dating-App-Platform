/**
 * Okta Authentication Guard for NestJS
 *
 * Validates Okta JWTs and enforces authentication on protected routes.
 * Uses @okta/jwt-verifier for token validation.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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

// Decorator keys
export const IS_PUBLIC_KEY = 'isPublic';
export const SKIP_OKTA_AUTH_KEY = 'skipOktaAuth';

export interface OktaUser {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  claims: Record<string, any>;
}

@Injectable()
export class OktaAuthGuard implements CanActivate {
  private readonly logger = new Logger(OktaAuthGuard.name);

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

    // Check if Okta auth should be skipped (for legacy auth during migration)
    const skipOktaAuth = this.reflector.getAllAndOverride<boolean>(SKIP_OKTA_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipOktaAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Extract token
    const authHeader = request.headers.authorization;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      this.logger.warn('No Okta token provided', { path: request.path });
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const config = getConfig();
      const verifier = getJwtVerifier();

      const jwt = await verifier.verifyAccessToken(token, config.audience);

      // Attach user to request
      const oktaUser: OktaUser = {
        userId: jwt.claims.sub as string,
        email: jwt.claims.email as string | undefined,
        firstName: jwt.claims.given_name as string | undefined,
        lastName: jwt.claims.family_name as string | undefined,
        claims: jwt.claims,
      };

      request.user = oktaUser;
      request.oktaUser = oktaUser;

      this.logger.debug('Okta auth successful', { userId: jwt.claims.sub });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Okta auth failed', {
        error: (error as Error).message,
        path: request.path,
      });

      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}

export default OktaAuthGuard;
