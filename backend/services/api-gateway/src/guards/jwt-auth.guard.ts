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

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService
  ) {}

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
      const secret = this.configService.get<string>('jwt.accessSecret');

      if (!secret) {
        this.logger.error('JWT access secret not configured');
        throw new UnauthorizedException({
          code: 'SERVER_ERROR',
          message: 'Authentication service is not properly configured.',
        });
      }

      const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as JwtTokenPayload;

      // Normalize the payload for downstream use
      request.user = {
        sub: payload.sub || payload.userId,
        userId: payload.sub || payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        subscription: payload.subscription || 'free',
        deviceId: payload.deviceId,
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
