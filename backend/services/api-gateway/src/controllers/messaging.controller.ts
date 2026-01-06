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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { ProxyService } from '../services/proxy.service';

@ApiTags('conversations', 'messages')
@ApiBearerAuth('JWT-auth')
@Controller()
export class MessagingController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Conversation Endpoints ====================

  /**
   * Get all conversations for the authenticated user
   * Returns a list of conversations with last message and unread count
   */
  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of conversations to return (default: 20)',
  })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of conversations',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              matchId: { type: 'string' },
              participant: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firstName: { type: 'string' },
                  photoUrl: { type: 'string' },
                },
              },
              lastMessage: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  senderId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              unreadCount: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversations(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
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
  async createConversation(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
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
    @Param('otherUserId') otherUserId: string
  ) {
    return this.proxyService.get('messagingService', `/api/conversations/with/${otherUserId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Get a specific conversation with messages
   * Returns conversation details including participant info and recent messages
   */
  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get specific conversation with messages' })
  @ApiParam({ name: 'conversationId', type: String, description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation details with messages',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        matchId: { type: 'string' },
        participant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            age: { type: 'number' },
            photoUrl: { type: 'string' },
            isOnline: { type: 'boolean' },
            lastActive: { type: 'string', format: 'date-time' },
          },
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              type: { type: 'string', enum: ['text', 'image', 'gif', 'voice'] },
              senderId: { type: 'string' },
              status: { type: 'string', enum: ['sent', 'delivered', 'read'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        unreadCount: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @Headers('authorization') authorization: string,
    @Param('conversationId') conversationId: string
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
    @Param('conversationId') conversationId: string
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
    @Param('conversationId') conversationId: string
  ) {
    return this.proxyService.put(
      'messagingService',
      `/api/conversations/${conversationId}/read`,
      {},
      {
        Authorization: authorization,
      }
    );
  }

  /**
   * Get messages for a conversation
   */
  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Headers('authorization') authorization: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
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
  async sendMessage(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
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
    @Query('conversationId') conversationId: string
  ) {
    return this.proxyService.get(
      'messagingService',
      `/api/messages/${messageId}?conversationId=${conversationId}`,
      { Authorization: authorization }
    );
  }

  /**
   * Update a message
   */
  @Put('messages/:messageId')
  async updateMessage(
    @Headers('authorization') authorization: string,
    @Param('messageId') messageId: string,
    @Body() body: Record<string, unknown>
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
    @Body() body: Record<string, unknown>
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
    @Body() body: Record<string, unknown>
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
    @Param('userId') userId: string
  ) {
    return this.proxyService.get('messagingService', `/api/users/${userId}/status`, {
      Authorization: authorization,
    });
  }
}
