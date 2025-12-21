import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface JwtTokenPayload {
  sub: string;         // User ID
  userId?: string;     // Alternative user ID field
  email: string;
  roles?: string[];
  subscription?: string;
  deviceId?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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
      const payload = jwt.verify(token, secret) as JwtTokenPayload;

      // Normalize the payload for downstream use
      const normalizedUser = {
        sub: payload.sub || payload.userId,
        userId: payload.sub || payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        subscription: payload.subscription || 'free',
        deviceId: payload.deviceId,
        iat: payload.iat,
        exp: payload.exp,
      };

      // Attach user to request for downstream use
      request.user = normalizedUser;
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
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication failed. Please try logging in again.',
      });
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    // Support both "Bearer <token>" and just "<token>" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // If it looks like a JWT (contains dots), try to use it directly
    if (authHeader.includes('.')) {
      return authHeader;
    }

    return null;
  }
}
