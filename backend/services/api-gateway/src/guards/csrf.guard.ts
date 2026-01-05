import * as crypto from 'crypto';

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { SKIP_CSRF_KEY, REQUIRE_CSRF_KEY } from '../decorators/csrf.decorator';

/**
 * CSRF Guard
 *
 * Provides additional CSRF validation at the guard level
 * Works in conjunction with CsrfMiddleware
 * Respects @SkipCsrf() and @RequireCsrf() decorators
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly headerName = 'x-csrf-token';
  private readonly cookieName = 'XSRF-TOKEN';
  private readonly secretCookieName = '_csrf';

  // Safe HTTP methods that don't require CSRF by default
  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint has @SkipCsrf() decorator
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Check if endpoint has @RequireCsrf() decorator
    const requireCsrf = this.reflector.getAllAndOverride<boolean>(REQUIRE_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Skip validation for safe methods unless explicitly required
    if (!requireCsrf && this.safeMethods.includes(method)) {
      return true;
    }

    // Validate CSRF token
    return this.validateCsrfToken(request);
  }

  /**
   * Validate CSRF token from request
   */
  private validateCsrfToken(request: Request): boolean {
    try {
      // Get token from header or body
      const headerToken = request.headers[this.headerName] as string;
      const bodyToken = request.body?._csrf;
      const token = headerToken || bodyToken;

      if (!token) {
        throw new ForbiddenException('CSRF token missing');
      }

      // Get token from cookie (double-submit pattern)
      const cookieToken = request.cookies?.[this.cookieName];

      if (!cookieToken) {
        throw new ForbiddenException('CSRF cookie missing');
      }

      // Verify tokens match (timing-safe comparison)
      if (!this.timingSafeEqual(token, cookieToken)) {
        throw new ForbiddenException('CSRF token mismatch');
      }

      // Additional validation: Check secret cookie exists
      const secret = request.cookies?.[this.secretCookieName];

      if (!secret) {
        throw new ForbiddenException('CSRF secret missing');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('CSRF validation failed');
    }
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }
}
