import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { SkipRateLimit } from '../decorators/rate-limit.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard, Role } from '../guards/roles.guard';
import { AdvancedRateLimiterMiddleware } from '../middleware/advanced-rate-limiter.middleware';
import { DDoSProtectionService } from '../services/ddos-protection.service';

/**
 * Rate Limit Admin Controller
 * Provides admin endpoints for managing rate limits and bans
 * SECURITY: Protected by Role.ADMIN guard - only admin users can access
 */
@ApiTags('admin', 'rate-limiting')
@ApiBearerAuth('JWT-auth')
@Controller('admin/rate-limit')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@SkipRateLimit() // Admin endpoints are not rate limited
export class RateLimitAdminController {
  constructor(
    private readonly ddosProtection: DDoSProtectionService,
    private readonly rateLimiter: AdvancedRateLimiterMiddleware
  ) {}

  // ==================== DDoS Protection Endpoints ====================

  /**
   * Get DDoS protection statistics
   */
  @Get('ddos/stats')
  @ApiOperation({ summary: 'Get DDoS protection statistics' })
  @ApiResponse({ status: 200, description: 'DDoS statistics retrieved successfully' })
  async getDDoSStats() {
    const stats = await this.ddosProtection.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get all banned IPs
   */
  @Get('ddos/banned')
  @ApiOperation({ summary: 'Get all banned IP addresses' })
  @ApiResponse({ status: 200, description: 'Banned IPs retrieved successfully' })
  async getBannedIPs() {
    const bannedIPs = await this.ddosProtection.getAllBannedIPs();
    return {
      success: true,
      data: bannedIPs,
      count: bannedIPs.length,
    };
  }

  /**
   * Get ban info for specific IP
   */
  @Get('ddos/banned/:ip')
  @ApiOperation({ summary: 'Get ban information for specific IP' })
  @ApiResponse({ status: 200, description: 'Ban info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'IP not found in ban list' })
  async getBanInfo(@Param('ip') ip: string) {
    const banInfo = await this.ddosProtection.getBanInfo(ip);

    if (!banInfo) {
      return {
        success: false,
        message: 'IP not found in ban list',
      };
    }

    return {
      success: true,
      data: banInfo,
    };
  }

  /**
   * Ban IP address
   */
  @Post('ddos/ban/:ip')
  @ApiOperation({ summary: 'Ban an IP address' })
  @ApiResponse({ status: 200, description: 'IP banned successfully' })
  @HttpCode(HttpStatus.OK)
  async banIP(
    @Param('ip') ip: string,
    @Query('duration') duration?: string,
    @Query('reason') reason?: string
  ) {
    const banReason = reason || 'Manual ban by admin';

    if (!duration) {
      // Permanent ban
      await this.ddosProtection.permanentlyBanIP(ip, banReason);
      return {
        success: true,
        message: `IP ${ip} permanently banned`,
        type: 'permanent',
      };
    }

    // Temporary ban
    // Parse duration (e.g., "1h", "30m", "1d")
    const durationMatch = duration.match(/^(\d+)([smhd])$/);
    if (!durationMatch) {
      return {
        success: false,
        message: 'Invalid duration format. Use format like: 30m, 1h, 1d',
      };
    }

    const units: { [key: string]: number } = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const [, value, unit] = durationMatch;
    const durationSeconds = parseInt(value, 10) * units[unit];

    await this.ddosProtection.banIP(ip, durationSeconds, banReason);

    return {
      success: true,
      message: `IP ${ip} banned for ${duration}`,
      type: 'temporary',
      durationSeconds,
    };
  }

  /**
   * Unban IP address
   */
  @Delete('ddos/ban/:ip')
  @ApiOperation({ summary: 'Unban an IP address' })
  @ApiResponse({ status: 200, description: 'IP unbanned successfully' })
  async unbanIP(@Param('ip') ip: string) {
    await this.ddosProtection.unbanIP(ip);

    return {
      success: true,
      message: `IP ${ip} unbanned successfully`,
    };
  }

  /**
   * Get violation count for IP
   */
  @Get('ddos/violations/:ip')
  @ApiOperation({ summary: 'Get violation count for IP' })
  @ApiResponse({ status: 200, description: 'Violation count retrieved successfully' })
  async getViolations(@Param('ip') ip: string) {
    const count = await this.ddosProtection.getViolationCount(ip);

    return {
      success: true,
      data: {
        ip,
        violations: count,
      },
    };
  }

  /**
   * Clear violation history for IP
   */
  @Delete('ddos/violations/:ip')
  @ApiOperation({ summary: 'Clear violation history for IP' })
  @ApiResponse({ status: 200, description: 'Violations cleared successfully' })
  async clearViolations(@Param('ip') ip: string) {
    await this.ddosProtection.clearViolations(ip);

    return {
      success: true,
      message: `Violation history cleared for IP ${ip}`,
    };
  }

  // ==================== Rate Limit Endpoints ====================

  /**
   * Reset rate limit for user
   */
  @Delete('user/:userId')
  @ApiOperation({ summary: 'Reset rate limit for user' })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  async resetUserRateLimit(
    @Param('userId') userId: string,
    @Query('method') method?: string,
    @Query('path') path?: string
  ) {
    await this.rateLimiter.resetRateLimit(userId, 'user', method, path);

    return {
      success: true,
      message: `Rate limit reset for user ${userId}`,
    };
  }

  /**
   * Reset rate limit for IP
   */
  @Delete('ip/:ip')
  @ApiOperation({ summary: 'Reset rate limit for IP address' })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  async resetIPRateLimit(
    @Param('ip') ip: string,
    @Query('method') method?: string,
    @Query('path') path?: string
  ) {
    await this.rateLimiter.resetRateLimit(ip, 'ip', method, path);

    return {
      success: true,
      message: `Rate limit reset for IP ${ip}`,
    };
  }

  /**
   * Get rate limit info for user
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get rate limit info for user' })
  @ApiResponse({ status: 200, description: 'Rate limit info retrieved successfully' })
  async getUserRateLimit(
    @Param('userId') userId: string,
    @Query('method') method: string,
    @Query('path') path: string
  ) {
    if (!method || !path) {
      return {
        success: false,
        message: 'Method and path query parameters are required',
      };
    }

    const info = await this.rateLimiter.getRateLimitInfo(userId, 'user', method, path);

    return {
      success: true,
      data: {
        userId,
        endpoint: `${method} ${path}`,
        ...info,
      },
    };
  }

  /**
   * Get rate limit info for IP
   */
  @Get('ip/:ip')
  @ApiOperation({ summary: 'Get rate limit info for IP address' })
  @ApiResponse({ status: 200, description: 'Rate limit info retrieved successfully' })
  async getIPRateLimit(
    @Param('ip') ip: string,
    @Query('method') method: string,
    @Query('path') path: string
  ) {
    if (!method || !path) {
      return {
        success: false,
        message: 'Method and path query parameters are required',
      };
    }

    const info = await this.rateLimiter.getRateLimitInfo(ip, 'ip', method, path);

    return {
      success: true,
      data: {
        ip,
        endpoint: `${method} ${path}`,
        ...info,
      },
    };
  }
}
