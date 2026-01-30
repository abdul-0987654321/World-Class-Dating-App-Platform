import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JwtUser {
  userId: string;
  sub?: string; // Alternative user ID field from JWT standard
  email?: string;
  role?: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor() {
    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || process.env.AUTH_JWT_SECRET;

    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET or JWT_ACCESS_SECRET must be set in environment variables. ' +
        'Never use default secrets in any environment.'
      );
    }

    // SECURITY: Validate minimum secret length
    if (jwtSecret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long for security.');
    }

    this.jwtSecret = jwtSecret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // SECURITY: Specify allowed algorithms to prevent algorithm confusion attacks
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as JwtUser;

      // Attach user to request for use in controllers
      request.user = {
        userId: decoded.userId || decoded.sub,
        email: decoded.email,
        role: decoded.role,
        isAdmin: decoded.isAdmin || decoded.role === 'admin',
      };

      return true;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

/**
 * Helper function to verify ownership of a resource
 * Compares the authenticated user's ID with the requested resource's user ID
 * Allows admins to bypass ownership check
 */
export function verifyOwnership(
  user: JwtUser,
  resourceUserId: string,
  allowAdmin: boolean = true
): void {
  if (!user) {
    throw new UnauthorizedException('User not authenticated');
  }

  // Allow admins to access any resource
  if (allowAdmin && (user.isAdmin || user.role === 'admin')) {
    return;
  }

  // Check if the authenticated user owns the resource
  if (user.userId !== resourceUserId) {
    throw new ForbiddenException('You do not have permission to access this resource');
  }
}
