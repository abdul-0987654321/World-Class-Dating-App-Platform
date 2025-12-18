import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators/public.decorator';
import { execSync } from 'child_process';

@Controller('platform')
export class PlatformController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * GET /api/v1/platform/version
   * Returns application version information
   */
  @Public()
  @Get('version')
  getVersion() {
    const version = '1.0.0'; // This should match package.json version
    const environment = this.configService.get<string>('nodeEnv') || 'development';

    // Try to get git SHA for build identifier
    let build = process.env.BUILD_ID || process.env.GIT_SHA || 'unknown';
    try {
      // Only attempt to get git SHA in non-production or if git is available
      if (environment !== 'production') {
        build = execSync('git rev-parse --short HEAD', {
          encoding: 'utf-8',
          timeout: 1000,
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
      }
    } catch (error) {
      // Fallback to environment variable or 'unknown'
      build = process.env.BUILD_ID || process.env.GIT_SHA || 'unknown';
    }

    return {
      version,
      build,
      environment,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/v1/platform/config/public
   * Returns public configuration settings
   */
  @Public()
  @Get('config/public')
  getPublicConfig() {
    return {
      features: {
        videoCallsEnabled: true,
        verificationEnabled: true,
        maxPhotos: 6,
      },
      support: {
        email: 'support@flamoral.com',
      },
      legal: {
        termsUrl: '/legal/terms',
        privacyUrl: '/legal/privacy',
      },
    };
  }
}
