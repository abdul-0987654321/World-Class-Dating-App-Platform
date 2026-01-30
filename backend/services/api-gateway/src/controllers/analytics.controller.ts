import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { Roles } from '../decorators/roles.decorator';
import { RolesGuard, Role } from '../guards/roles.guard';
import { ProxyService } from '../services/proxy.service';

@ApiTags('analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== User Analytics Endpoints ====================

  /**
   * Get user analytics dashboard
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get user analytics dashboard' })
  async getDashboard(@Headers('authorization') authorization: string) {
    return this.proxyService.get('analyticsService', '/api/v1/analytics/dashboard', {
      Authorization: authorization,
    });
  }

  /**
   * Get profile views
   */
  @Get('profile/views')
  @ApiOperation({ summary: 'Get profile view statistics' })
  async getProfileViews(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/profile/views${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get match statistics
   */
  @Get('matches/stats')
  @ApiOperation({ summary: 'Get match statistics' })
  async getMatchStats(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/matches/stats${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get messaging statistics
   */
  @Get('messages/stats')
  @ApiOperation({ summary: 'Get messaging statistics' })
  async getMessageStats(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/messages/stats${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get like statistics
   */
  @Get('likes/stats')
  @ApiOperation({ summary: 'Get like statistics' })
  async getLikeStats(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/likes/stats${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Event Tracking Endpoints ====================

  /**
   * Track event
   */
  @Post('events')
  @ApiOperation({ summary: 'Track analytics event' })
  @HttpCode(HttpStatus.CREATED)
  async trackEvent(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
    return this.proxyService.post('analyticsService', '/api/v1/analytics/events', body, {
      Authorization: authorization,
    });
  }

  /**
   * Track page view
   */
  @Post('pageviews')
  @ApiOperation({ summary: 'Track page view' })
  @HttpCode(HttpStatus.CREATED)
  async trackPageView(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
    return this.proxyService.post('analyticsService', '/api/v1/analytics/pageviews', body, {
      Authorization: authorization,
    });
  }

  /**
   * Track user action
   */
  @Post('actions')
  @ApiOperation({ summary: 'Track user action' })
  @HttpCode(HttpStatus.CREATED)
  async trackAction(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
    return this.proxyService.post('analyticsService', '/api/v1/analytics/actions', body, {
      Authorization: authorization,
    });
  }

  // ==================== Engagement Metrics Endpoints ====================

  /**
   * Get user engagement metrics
   */
  @Get('engagement')
  @ApiOperation({ summary: 'Get user engagement metrics' })
  async getEngagement(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/engagement${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get response rate
   */
  @Get('engagement/response-rate')
  @ApiOperation({ summary: 'Get message response rate' })
  async getResponseRate(@Headers('authorization') authorization: string) {
    return this.proxyService.get('analyticsService', '/api/v1/analytics/engagement/response-rate', {
      Authorization: authorization,
    });
  }

  /**
   * Get activity timeline
   */
  @Get('activity/timeline')
  @ApiOperation({ summary: 'Get activity timeline' })
  async getActivityTimeline(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);
    if (granularity) queryString.append('granularity', granularity);

    const path = `/api/v1/analytics/activity/timeline${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Admin Analytics Endpoints ====================

  /**
   * Get platform statistics (admin)
   */
  @Get('platform/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get platform statistics (admin)' })
  async getPlatformStats(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/platform/stats${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get user demographics (admin)
   */
  @Get('platform/demographics')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user demographics (admin)' })
  async getDemographics(@Headers('authorization') authorization: string) {
    return this.proxyService.get('analyticsService', '/api/v1/analytics/platform/demographics', {
      Authorization: authorization,
    });
  }

  /**
   * Get revenue analytics (admin)
   */
  @Get('platform/revenue')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get revenue analytics (admin)' })
  async getRevenueAnalytics(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/platform/revenue${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get retention metrics (admin)
   */
  @Get('platform/retention')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user retention metrics (admin)' })
  async getRetention(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/platform/retention${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Funnel Analysis Endpoints ====================

  /**
   * Get conversion funnel data
   */
  @Get('funnel')
  @ApiOperation({ summary: 'Get conversion funnel data' })
  async getFunnel(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/v1/analytics/funnel${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('analyticsService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get A/B test results (admin)
   */
  @Get('ab-tests/:testId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get A/B test results (admin)' })
  async getABTestResults(
    @Headers('authorization') authorization: string,
    @Param('testId') testId: string
  ) {
    return this.proxyService.get('analyticsService', `/api/v1/analytics/ab-tests/${testId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Export Endpoints ====================

  /**
   * Export analytics data
   */
  @Post('export')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Export analytics data' })
  @HttpCode(HttpStatus.OK)
  async exportData(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
    return this.proxyService.post('analyticsService', '/api/v1/analytics/export', body, {
      Authorization: authorization,
    });
  }
}
