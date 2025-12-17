import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class AdminController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== User Management Endpoints ====================

  /**
   * Get all users (admin)
   */
  @Get('users')
  @ApiOperation({ summary: 'Get all users (admin)' })
  async getAllUsers(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);
    if (status) queryString.append('status', status);

    const path = `/api/admin/users${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('adminService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get user by ID (admin)
   */
  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  async getUser(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    return this.proxyService.get('adminService', `/api/admin/users/${userId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Update user (admin)
   */
  @Put('users/:userId')
  @ApiOperation({ summary: 'Update user (admin)' })
  async updateUser(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('adminService', `/api/admin/users/${userId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Suspend user (admin)
   */
  @Post('users/:userId/suspend')
  @ApiOperation({ summary: 'Suspend user (admin)' })
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('adminService', `/api/admin/users/${userId}/suspend`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Ban user (admin)
   */
  @Post('users/:userId/ban')
  @ApiOperation({ summary: 'Ban user (admin)' })
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('adminService', `/api/admin/users/${userId}/ban`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete user (admin)
   */
  @Delete('users/:userId')
  @ApiOperation({ summary: 'Delete user (admin)' })
  async deleteUser(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    return this.proxyService.delete('adminService', `/api/admin/users/${userId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Statistics Endpoints ====================

  /**
   * Get platform statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  async getStatistics(@Headers('authorization') authorization: string) {
    return this.proxyService.get('adminService', '/api/admin/stats', {
      Authorization: authorization,
    });
  }

  /**
   * Get user analytics
   */
  @Get('analytics/users')
  @ApiOperation({ summary: 'Get user analytics' })
  async getUserAnalytics(
    @Headers('authorization') authorization: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const queryString = new URLSearchParams();
    if (startDate) queryString.append('startDate', startDate);
    if (endDate) queryString.append('endDate', endDate);

    const path = `/api/admin/analytics/users${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('adminService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Moderation Queue Endpoints ====================

  /**
   * Get moderation queue
   */
  @Get('moderation/queue')
  @ApiOperation({ summary: 'Get moderation queue' })
  async getModerationQueue(
    @Headers('authorization') authorization: string,
    @Query('status') status?: string,
  ) {
    const queryString = new URLSearchParams();
    if (status) queryString.append('status', status);

    const path = `/api/admin/moderation/queue${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('moderationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Review content
   */
  @Post('moderation/:itemId/review')
  @ApiOperation({ summary: 'Review moderation item' })
  @HttpCode(HttpStatus.OK)
  async reviewContent(
    @Headers('authorization') authorization: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('moderationService', `/api/admin/moderation/${itemId}/review`, body, {
      Authorization: authorization,
    });
  }
}
