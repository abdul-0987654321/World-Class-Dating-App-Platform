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
import { ProxyService } from '../services/proxy.service';

@Controller()
export class MessagingController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Conversation Endpoints ====================

  /**
   * Get all conversations for the authenticated user
   */
  @Get('conversations')
  async getConversations(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/conversations${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('messagingService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Create a new conversation
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('messagingService', '/api/conversations', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get or create a conversation with another user
   */
  @Get('conversations/with/:otherUserId')
  async getOrCreateConversation(
    @Headers('authorization') authorization: string,
    @Param('otherUserId') otherUserId: string,
  ) {
    return this.proxyService.get('messagingService', `/api/conversations/with/${otherUserId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Get a specific conversation
   */
  @Get('conversations/:conversationId')
  async getConversation(
    @Headers('authorization') authorization: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.proxyService.get('messagingService', `/api/conversations/${conversationId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Delete a conversation
   */
  @Delete('conversations/:conversationId')
  async deleteConversation(
    @Headers('authorization') authorization: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.proxyService.delete('messagingService', `/api/conversations/${conversationId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Mark conversation as read
   */
  @Put('conversations/:conversationId/read')
  async markConversationAsRead(
    @Headers('authorization') authorization: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.proxyService.put('messagingService', `/api/conversations/${conversationId}/read`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Get messages for a conversation
   */
  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Headers('authorization') authorization: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/conversations/${conversationId}/messages${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('messagingService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Message Endpoints ====================

  /**
   * Send a new message
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('messagingService', '/api/messages', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get unread message count
   */
  @Get('messages/unread-count')
  async getUnreadCount(@Headers('authorization') authorization: string) {
    return this.proxyService.get('messagingService', '/api/messages/unread-count', {
      Authorization: authorization,
    });
  }

  /**
   * Get a specific message
   */
  @Get('messages/:messageId')
  async getMessage(
    @Headers('authorization') authorization: string,
    @Param('messageId') messageId: string,
    @Query('conversationId') conversationId: string,
  ) {
    return this.proxyService.get(
      'messagingService',
      `/api/messages/${messageId}?conversationId=${conversationId}`,
      { Authorization: authorization },
    );
  }

  /**
   * Update a message
   */
  @Put('messages/:messageId')
  async updateMessage(
    @Headers('authorization') authorization: string,
    @Param('messageId') messageId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('messagingService', `/api/messages/${messageId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete a message
   */
  @Delete('messages/:messageId')
  async deleteMessage(
    @Headers('authorization') authorization: string,
    @Param('messageId') messageId: string,
    @Body() body: any,
  ) {
    return this.proxyService.delete('messagingService', `/api/messages/${messageId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Update message status
   */
  @Put('messages/:messageId/status')
  async updateMessageStatus(
    @Headers('authorization') authorization: string,
    @Param('messageId') messageId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('messagingService', `/api/messages/${messageId}/status`, body, {
      Authorization: authorization,
    });
  }

  // ==================== User Status Endpoints ====================

  /**
   * Get user online status
   */
  @Get('users/:userId/status')
  async getUserStatus(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    return this.proxyService.get('messagingService', `/api/users/${userId}/status`, {
      Authorization: authorization,
    });
  }
}
