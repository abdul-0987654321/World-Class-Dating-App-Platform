import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';

/**
 * Platform Controller
 *
 * Provides platform-level endpoints for version information and public configuration
 */
@ApiTags('platform')
@Controller('platform')
export class PlatformController {
  /**
   * GET /api/v1/platform/version
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
      },
    },
  })
  getVersion() {
    return {
      version: '1.0.0',
      buildNumber: process.env.BUILD_NUMBER || 'dev',
      commitSha: process.env.COMMIT_SHA || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * GET /api/v1/platform/config/public
   * Returns public configuration settings
   */
  @Public()
  @Get('config/public')
  @ApiOperation({
    summary: 'Get public application configuration',
    description: 'Returns public feature flags, limits, and support information',
  })
  @ApiResponse({
    status: 200,
    description: 'Public application configuration',
    schema: {
      type: 'object',
      properties: {
        features: {
          type: 'object',
          description: 'Feature flags',
          properties: {
            subscriptions: { type: 'boolean', example: true },
            coins: { type: 'boolean', example: true },
            boosts: { type: 'boolean', example: true },
            superLikes: { type: 'boolean', example: true },
            messaging: { type: 'boolean', example: true },
            videoChat: { type: 'boolean', example: false },
          },
        },
        limits: {
          type: 'object',
          description: 'Platform limits',
          properties: {
            freeSwipesPerDay: { type: 'number', example: 50 },
            freeMessagesPerDay: { type: 'number', example: 10 },
            maxPhotos: { type: 'number', example: 6 },
            maxPrompts: { type: 'number', example: 3 },
          },
        },
        support: {
          type: 'object',
          description: 'Support contact information',
          properties: {
            email: { type: 'string', example: 'support@flamoral.com' },
            helpCenter: { type: 'string', example: 'https://help.flamoral.com' },
          },
        },
      },
    },
  })
  getPublicConfig() {
    return {
      features: {
        subscriptions: true,
        coins: true,
        boosts: true,
        superLikes: true,
        messaging: true,
        videoChat: false,
      },
      limits: {
        freeSwipesPerDay: 50,
        freeMessagesPerDay: 10,
        maxPhotos: 6,
        maxPrompts: 3,
      },
      support: {
        email: 'support@flamoral.com',
        helpCenter: 'https://help.flamoral.com',
      },
    };
  }
}
