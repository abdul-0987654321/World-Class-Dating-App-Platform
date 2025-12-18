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

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Notification Endpoints ====================

  /**
   * Get all notifications
   */
  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  async getNotifications(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unread') unread?: string,
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);
    if (unread) queryString.append('unread', unread);

    const path = `/api/notifications${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('notificationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get a specific notification
   */
  @Get(':notificationId')
  @ApiOperation({ summary: 'Get a specific notification' })
  async getNotification(
    @Headers('authorization') authorization: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.proxyService.get('notificationService', `/api/notifications/${notificationId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Mark notification as read
   */
  @Put(':notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Headers('authorization') authorization: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.proxyService.put('notificationService', `/api/notifications/${notificationId}/read`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Mark all notifications as read
   */
  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Headers('authorization') authorization: string) {
    return this.proxyService.put('notificationService', '/api/notifications/read-all', {}, {
      Authorization: authorization,
    });
  }

  /**
   * Delete notification
   */
  @Delete(':notificationId')
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(
    @Headers('authorization') authorization: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.proxyService.delete('notificationService', `/api/notifications/${notificationId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Clear all notifications
   */
  @Delete()
  @ApiOperation({ summary: 'Clear all notifications' })
  async clearAll(@Headers('authorization') authorization: string) {
    return this.proxyService.delete('notificationService', '/api/notifications', {
      Authorization: authorization,
    });
  }

  /**
   * Get unread count
   */
  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Headers('authorization') authorization: string) {
    return this.proxyService.get('notificationService', '/api/notifications/unread/count', {
      Authorization: authorization,
    });
  }

  // ==================== Notification Settings Endpoints ====================

  /**
   * Get notification settings
   */
  @Get('settings')
  @ApiOperation({ summary: 'Get notification settings' })
  async getSettings(@Headers('authorization') authorization: string) {
    return this.proxyService.get('notificationService', '/api/notifications/settings', {
      Authorization: authorization,
    });
  }

  /**
   * Update notification settings
   */
  @Put('settings')
  @ApiOperation({ summary: 'Update notification settings' })
  async updateSettings(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('notificationService', '/api/notifications/settings', body, {
      Authorization: authorization,
    });
  }

  // ==================== Push Notification Endpoints ====================

  /**
   * Register push notification token
   */
  @Post('push/register')
  @ApiOperation({ summary: 'Register push notification token' })
  @HttpCode(HttpStatus.CREATED)
  async registerPushToken(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('notificationService', '/api/notifications/push/register', body, {
      Authorization: authorization,
    });
  }

  /**
   * Unregister push notification token
   */
  @Delete('push/register')
  @ApiOperation({ summary: 'Unregister push notification token' })
  async unregisterPushToken(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.delete('notificationService', '/api/notifications/push/register', {
      Authorization: authorization,
    });
  }

  /**
   * Test push notification
   */
  @Post('push/test')
  @ApiOperation({ summary: 'Send test push notification' })
  @HttpCode(HttpStatus.OK)
  async testPushNotification(@Headers('authorization') authorization: string) {
    return this.proxyService.post('notificationService', '/api/notifications/push/test', {}, {
      Authorization: authorization,
    });
  }

  // ==================== Email Notification Endpoints ====================

  /**
   * Get email preferences
   */
  @Get('email/preferences')
  @ApiOperation({ summary: 'Get email notification preferences' })
  async getEmailPreferences(@Headers('authorization') authorization: string) {
    return this.proxyService.get('notificationService', '/api/notifications/email/preferences', {
      Authorization: authorization,
    });
  }

  /**
   * Update email preferences
   */
  @Put('email/preferences')
  @ApiOperation({ summary: 'Update email notification preferences' })
  async updateEmailPreferences(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('notificationService', '/api/notifications/email/preferences', body, {
      Authorization: authorization,
    });
  }
}
