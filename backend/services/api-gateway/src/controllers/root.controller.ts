import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser, JwtPayload } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { ProxyService } from '../services/proxy.service';

/**
 * Root Controller
 *
 * Provides root-level API endpoints for version information and authentication status
 * These endpoints are mounted directly at /api/v1/ without additional path segments
 */
@ApiTags('root')
@Controller()
export class RootController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * GET /api/v1/version
   * Returns application version information
   */
  @Public()
  @Get('version')
  @ApiOperation({
    summary: 'Get application version information',
    description: 'Returns the current version, build number, commit SHA, and environment',
  })
  @ApiResponse({
    status: 200,
    description: 'Application version information',
    schema: {
      type: 'object',
      properties: {
        version: {
          type: 'string',
          example: '1.0.0',
          description: 'Application version from package.json',
        },
        buildNumber: {
          type: 'string',
          example: '123',
          description: 'Build number from CI/CD or "dev" for local development',
        },
        commitSha: {
          type: 'string',
          example: 'a1b2c3d',
          description: 'Git commit SHA or "unknown"',
        },
        environment: {
          type: 'string',
          example: 'production',
          description: 'Current environment (development, staging, production)',
        },
        service: {
          type: 'string',
          example: 'api-gateway',
          description: 'Service name',
        },
      },
    },
  })
  getVersion() {
    return {
      version: process.env.APP_VERSION || '1.0.0',
      buildNumber: process.env.BUILD_NUMBER || 'dev',
      commitSha: process.env.COMMIT_SHA || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      service: 'api-gateway',
    };
  }

  /**
   * GET /api/v1/auth/status
   * Returns current authentication status
   */
  @Get('auth/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current authentication status',
    description: 'Returns whether the user is authenticated and basic user info',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication status',
    schema: {
      type: 'object',
      properties: {
        authenticated: {
          type: 'boolean',
          example: true,
          description: 'Whether the user is authenticated',
        },
        userId: {
          type: 'string',
          example: 'user_123',
          description: 'The authenticated user ID',
        },
        email: {
          type: 'string',
          example: 'user@example.com',
          description: 'The authenticated user email',
        },
        subscription: {
          type: 'string',
          example: 'premium',
          description: 'Current subscription tier',
        },
        tokenExpiry: {
          type: 'string',
          example: '2024-12-31T23:59:59Z',
          description: 'Token expiration timestamp',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAuthStatus(
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') authorization: string
  ) {
    // If we reach here, the JWT guard has already validated the token
    // Optionally fetch additional user data from auth service
    let userData = null;
    try {
      userData = await this.proxyService.get('authService', '/api/v1/auth/me', {
        Authorization: authorization,
      });
    } catch {
      // Proceed with JWT data only if auth service call fails
    }

    return {
      authenticated: true,
      userId: user?.sub || userData?.id,
      email: user?.email || userData?.email,
      subscription: user?.subscription || 'free',
      roles: user?.roles || ['user'],
      tokenExpiry: user?.exp ? new Date(user.exp * 1000).toISOString() : null,
      emailVerified: userData?.emailVerified ?? user?.emailVerified ?? false,
    };
  }

  /**
   * GET /api/v1/auth/status/public
   * Returns authentication status without requiring a valid token
   * Useful for checking if a token is valid
   */
  @Public()
  @Get('auth/status/public')
  @ApiOperation({
    summary: 'Check if authenticated (public endpoint)',
    description: 'Returns authentication status. Always returns a response, even without a token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication status check',
    schema: {
      type: 'object',
      properties: {
        authenticated: {
          type: 'boolean',
          example: false,
          description: 'Whether the request has a valid authentication token',
        },
      },
    },
  })
  getAuthStatusPublic(@Headers('authorization') authorization?: string) {
    // This is a public endpoint that just indicates whether auth header is present
    // The actual validation would need to check the token
    const hasToken = !!authorization && authorization.startsWith('Bearer ');
    return {
      authenticated: hasToken,
      message: hasToken
        ? 'Token present. Use /api/v1/auth/status for full status.'
        : 'No authentication token provided',
    };
  }
}
