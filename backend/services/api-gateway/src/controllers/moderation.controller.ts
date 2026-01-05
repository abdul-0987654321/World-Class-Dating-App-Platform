import {
  Controller,
  Get,
  Post,
  Put,
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

@ApiTags('moderation')
@ApiBearerAuth('JWT-auth')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Content Moderation Endpoints ====================

  /**
   * Submit content for moderation
   */
  @Post('submit')
  @ApiOperation({ summary: 'Submit content for moderation' })
  @HttpCode(HttpStatus.CREATED)
  async submitContent(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('moderationService', '/api/moderation/submit', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get moderation status
   */
  @Get('status/:contentId')
  @ApiOperation({ summary: 'Get content moderation status' })
  async getModerationStatus(
    @Headers('authorization') authorization: string,
    @Param('contentId') contentId: string
  ) {
    return this.proxyService.get('moderationService', `/api/moderation/status/${contentId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Get moderation queue (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Get('queue')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get moderation queue (admin)' })
  async getModerationQueue(
    @Headers('authorization') authorization: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (status) queryString.append('status', status);
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/moderation/queue${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('moderationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Approve content (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Put('approve/:contentId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Approve content (admin)' })
  async approveContent(
    @Headers('authorization') authorization: string,
    @Param('contentId') contentId: string
  ) {
    return this.proxyService.put(
      'moderationService',
      `/api/moderation/approve/${contentId}`,
      {},
      {
        Authorization: authorization,
      }
    );
  }

  /**
   * Reject content (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Put('reject/:contentId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Reject content (admin)' })
  async rejectContent(
    @Headers('authorization') authorization: string,
    @Param('contentId') contentId: string,
    @Body() body: any
  ) {
    return this.proxyService.put('moderationService', `/api/moderation/reject/${contentId}`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Report Endpoints ====================

  /**
   * Submit a report
   */
  @Post('reports')
  @ApiOperation({ summary: 'Submit a report' })
  @HttpCode(HttpStatus.CREATED)
  async submitReport(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('moderationService', '/api/moderation/reports', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get user's reports
   */
  @Get('reports/me')
  @ApiOperation({ summary: 'Get current user reports' })
  async getMyReports(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/moderation/reports/me${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('moderationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get all reports (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get all reports (admin)' })
  async getReports(
    @Headers('authorization') authorization: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (status) queryString.append('status', status);
    if (type) queryString.append('type', type);
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/moderation/reports${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('moderationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get report details (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Get('reports/:reportId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get report details (admin)' })
  async getReport(
    @Headers('authorization') authorization: string,
    @Param('reportId') reportId: string
  ) {
    return this.proxyService.get('moderationService', `/api/moderation/reports/${reportId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Update report status (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Put('reports/:reportId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Update report status (admin)' })
  async updateReport(
    @Headers('authorization') authorization: string,
    @Param('reportId') reportId: string,
    @Body() body: any
  ) {
    return this.proxyService.put('moderationService', `/api/moderation/reports/${reportId}`, body, {
      Authorization: authorization,
    });
  }

  // ==================== User Actions Endpoints ====================
  // SECURITY: All user action endpoints require Role.ADMIN

  /**
   * Ban user (admin)
   * SECURITY: Requires Role.ADMIN only (not moderator)
   */
  @Post('actions/ban')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ban user (admin)' })
  @HttpCode(HttpStatus.OK)
  async banUser(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('moderationService', '/api/moderation/actions/ban', body, {
      Authorization: authorization,
    });
  }

  /**
   * Unban user (admin)
   * SECURITY: Requires Role.ADMIN only (not moderator)
   */
  @Post('actions/unban')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Unban user (admin)' })
  @HttpCode(HttpStatus.OK)
  async unbanUser(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('moderationService', '/api/moderation/actions/unban', body, {
      Authorization: authorization,
    });
  }

  /**
   * Warn user (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Post('actions/warn')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Warn user (admin)' })
  @HttpCode(HttpStatus.OK)
  async warnUser(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('moderationService', '/api/moderation/actions/warn', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get user moderation history (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Get('users/:userId/history')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get user moderation history (admin)' })
  async getUserModerationHistory(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string
  ) {
    return this.proxyService.get('moderationService', `/api/moderation/users/${userId}/history`, {
      Authorization: authorization,
    });
  }

  // ==================== AI Moderation Endpoints ====================

  /**
   * Scan text for inappropriate content
   */
  @Post('scan/text')
  @ApiOperation({ summary: 'Scan text for inappropriate content' })
  @HttpCode(HttpStatus.OK)
  async scanText(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('moderationService', '/api/moderation/scan/text', body, {
      Authorization: authorization,
    });
  }

  /**
   * Scan image for inappropriate content
   */
  @Post('scan/image')
  @ApiOperation({ summary: 'Scan image for inappropriate content' })
  @HttpCode(HttpStatus.OK)
  async scanImage(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('moderationService', '/api/moderation/scan/image', body, {
      Authorization: authorization,
    });
  }

  // ==================== Statistics Endpoints ====================

  /**
   * Get moderation statistics (admin)
   * SECURITY: Requires Role.ADMIN or Role.MODERATOR
   */
  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get moderation statistics (admin)' })
  async getStatistics(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/moderation/statistics${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('moderationService', path, {
      Authorization: authorization,
    });
  }
}
