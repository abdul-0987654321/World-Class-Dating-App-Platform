import axios from 'axios';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import conversationRepository from '../domain/repositories/conversation.repository';
import messageRepository from '../domain/repositories/message.repository';
import redisClient from '../infrastructure/cache/redis';
import {
  SendMessageRequest,
  SendMessageResponse,
  Message,
  MessageStatus,
  TypingIndicator,
  OnlineStatus,
  UserSocketMap,
  MarkAsReadRequest,
  DeleteMessageRequest,
} from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('socket-manager');

// User service URL - should be configured via environment variable
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';

export class SocketManager {
  private io: Server;
  private userSocketMap: UserSocketMap = {};

  constructor(io: Server) {
    this.io = io;
    this.initializeSocketHandlers();
  }

  /**
   * Initialize all socket event handlers
   */
  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    logger.info(`Client connected: ${socket.id}`);

    // Get userId from socket.data (set by JWT authentication middleware)
    // SECURITY: Never trust client-provided userId - always use the verified one from JWT
    const userId = socket.data.userId;

    if (!userId) {
      logger.error(`Connection rejected: No userId in socket.data (JWT verification failed)`);
      socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
      socket.disconnect();
      return;
    }

    // Store user-socket mapping
    this.userSocketMap[userId] = socket.id;
    logger.info(`User ${userId} mapped to socket ${socket.id}`);

    // Update online status in Redis
    this.updateOnlineStatus(userId, true, socket.id);

    // Broadcast online status to user's contacts
    this.broadcastOnlineStatus(userId, true);

    // Register event handlers
    this.registerMessageHandlers(socket, userId);
    this.registerTypingHandlers(socket, userId);
    this.registerConversationHandlers(socket, userId);
    this.registerDisconnectHandler(socket, userId);
  }

  /**
   * Register message-related event handlers
   */
  private registerMessageHandlers(socket: Socket, userId: string): void {
    // Send message
    socket.on('message:send', async (data: SendMessageRequest, callback) => {
      try {
        logger.info(`Message send request from ${userId} to ${data.receiverId}`);

        // Create message object
        const message: Message = {
          id: uuidv4(),
          conversationId: data.conversationId,
          senderId: userId,
          receiverId: data.receiverId,
          content: data.content,
          type: data.type,
          status: MessageStatus.SENT,
          sentAt: new Date(),
          metadata: data.metadata,
          replyTo: data.replyTo,
        };

        // Save message to database (PostgreSQL)
        await messageRepository.create(message);
        logger.info(`Message saved to database: ${message.id}`);

        // Update conversation last message
        await conversationRepository.updateLastMessage(
          data.conversationId,
          message.sentAt,
          message.content.substring(0, 100) // Preview (first 100 chars)
        );

        // Send to receiver if online
        const receiverSocketId = this.userSocketMap[data.receiverId];
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('message:new', message);

          // Update status to delivered
          message.status = MessageStatus.DELIVERED;
          message.deliveredAt = new Date();

          // Update in database
          await messageRepository.update(message.id, message.conversationId, {
            status: MessageStatus.DELIVERED,
            deliveredAt: message.deliveredAt,
          });

          // Notify sender about delivery
          socket.emit('message:delivered', {
            messageId: message.id,
            deliveredAt: message.deliveredAt,
          });
        }

        // Send confirmation to sender
        const response: SendMessageResponse = {
          success: true,
          message,
        };
        callback(response);

        logger.info(`Message sent successfully: ${message.id}`);
      } catch (error: any) {
        logger.error('Message send failed:', error);
        const response: SendMessageResponse = {
          success: false,
          error: error.message || 'Failed to send message',
        };
        callback(response);
      }
    });

    // Mark message as read
    socket.on('message:read', async (data: MarkAsReadRequest) => {
      try {
        logger.info(
          `Mark as read request for conversation ${data.conversationId} by user ${userId}`
        );

        const readAt = new Date();

        // Update messages in database
        if (data.messageIds && data.messageIds.length > 0) {
          // Mark specific messages as read
          await messageRepository.updateMany(data.messageIds, {
            status: MessageStatus.READ,
            readAt,
          });
          logger.info(`Marked ${data.messageIds.length} specific messages as read`);
        } else {
          // Mark all unread messages in conversation as read
          await messageRepository.markConversationAsRead(data.conversationId, userId, readAt);
          logger.info(`Marked all messages in conversation ${data.conversationId} as read`);
        }

        // Reset unread count for this user in the conversation
        await conversationRepository.resetUnreadCount(data.conversationId, userId);

        // Notify other participant
        const otherParticipantId = await this.getOtherParticipant(data.conversationId, userId);

        if (otherParticipantId) {
          const otherSocketId = this.userSocketMap[otherParticipantId];
          if (otherSocketId) {
            this.io.to(otherSocketId).emit('message:read', {
              messageIds: data.messageIds || [],
              readAt,
            });
          }
        }

        logger.info(`Messages marked as read in conversation ${data.conversationId}`);
      } catch (error: any) {
        logger.error('Mark as read failed:', error);
        socket.emit('error', { message: 'Failed to mark messages as read', code: 'READ_FAILED' });
      }
    });

    // Delete message
    socket.on('message:delete', async (data: DeleteMessageRequest) => {
      try {
        logger.info(`Delete message request: ${data.messageId} by user ${userId}`);

        // First, we need to query to get the message with its partition key (conversationId)
        const querySpec = {
          query: 'SELECT * FROM c WHERE c.id = @messageId',
          parameters: [{ name: '@messageId', value: data.messageId }],
        };

        const { resources } = await messageRepository['container'].items
          .query<Message>(querySpec)
          .fetchAll();

        if (resources.length === 0) {
          throw new Error('Message not found');
        }

        const message = resources[0];

        // Validate user owns the message
        if (message.senderId !== userId) {
          throw new Error('Unauthorized: You can only delete your own messages');
        }

        // Delete or mark as deleted in database
        if (data.deleteForBoth) {
          // Hard delete - remove from database completely
          await messageRepository.delete(data.messageId, message.conversationId);
          logger.info(`Message ${data.messageId} hard deleted`);

          // Notify receiver
          const receiverSocketId = this.userSocketMap[message.receiverId];
          if (receiverSocketId) {
            this.io.to(receiverSocketId).emit('message:deleted', {
              messageId: data.messageId,
              conversationId: message.conversationId,
            });
          }
        } else {
          // Soft delete - mark as deleted for this user only
          await messageRepository.markAsDeleted(data.messageId, message.conversationId, userId);
          logger.info(`Message ${data.messageId} soft deleted for user ${userId}`);
        }

        // Confirm deletion to sender
        socket.emit('message:deleted', {
          messageId: data.messageId,
          conversationId: message.conversationId,
        });

        logger.info(`Message deleted: ${data.messageId}`);
      } catch (error: any) {
        logger.error('Delete message failed:', error);
        socket.emit('error', {
          message: error.message || 'Failed to delete message',
          code: 'DELETE_FAILED',
        });
      }
    });
  }

  /**
   * Register typing indicator handlers
   */
  private registerTypingHandlers(socket: Socket, userId: string): void {
    // User started typing
    socket.on('typing:start', (data: { conversationId: string }) => {
      try {
        logger.info(`User ${userId} started typing in conversation ${data.conversationId}`);

        const typingIndicator: TypingIndicator = {
          conversationId: data.conversationId,
          userId,
          isTyping: true,
          timestamp: new Date(),
        };

        // Broadcast to other participant
        this.broadcastToConversation(
          data.conversationId,
          userId,
          'typing:indicator',
          typingIndicator
        );
      } catch (error: any) {
        logger.error('Typing start failed:', error);
      }
    });

    // User stopped typing
    socket.on('typing:stop', (data: { conversationId: string }) => {
      try {
        logger.info(`User ${userId} stopped typing in conversation ${data.conversationId}`);

        const typingIndicator: TypingIndicator = {
          conversationId: data.conversationId,
          userId,
          isTyping: false,
          timestamp: new Date(),
        };

        // Broadcast to other participant
        this.broadcastToConversation(
          data.conversationId,
          userId,
          'typing:indicator',
          typingIndicator
        );
      } catch (error: any) {
        logger.error('Typing stop failed:', error);
      }
    });
  }

  /**
   * Register conversation handlers
   */
  private registerConversationHandlers(socket: Socket, userId: string): void {
    // Join conversation room
    socket.on('conversation:join', (data: { conversationId: string }) => {
      logger.info(`User ${userId} joining conversation ${data.conversationId}`);
      socket.join(`conversation:${data.conversationId}`);
    });

    // Leave conversation room
    socket.on('conversation:leave', (data: { conversationId: string }) => {
      logger.info(`User ${userId} leaving conversation ${data.conversationId}`);
      socket.leave(`conversation:${data.conversationId}`);
    });
  }

  /**
   * Register disconnect handler
   */
  private registerDisconnectHandler(socket: Socket, userId: string): void {
    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected: ${socket.id}`);

      // Remove from user-socket mapping
      delete this.userSocketMap[userId];

      // Update online status
      this.updateOnlineStatus(userId, false);

      // Broadcast offline status
      this.broadcastOnlineStatus(userId, false);
    });
  }

  /**
   * Update user's online status in Redis
   */
  private async updateOnlineStatus(
    userId: string,
    online: boolean,
    socketId?: string
  ): Promise<void> {
    try {
      const status: OnlineStatus = {
        userId,
        online,
        lastSeen: online ? undefined : new Date(),
        socketId,
      };

      // Store in Redis with 30-day expiration
      await redisClient
        .getClient()
        .setEx(`user:online:${userId}`, 30 * 24 * 60 * 60, JSON.stringify(status));

      logger.info(`Online status updated for user ${userId}: ${online ? 'online' : 'offline'}`);
    } catch (error: any) {
      logger.error('Failed to update online status:', error);
    }
  }

  /**
   * Broadcast online status to user's contacts
   */
  private async broadcastOnlineStatus(userId: string, online: boolean): Promise<void> {
    try {
      // Get user's matched contacts from user service
      const contactUserIds = await this.getUserContacts(userId);

      const status: OnlineStatus = {
        userId,
        online,
        lastSeen: online ? undefined : new Date(),
      };

      // Broadcast to all matched users who are online
      if (contactUserIds.length > 0) {
        for (const contactId of contactUserIds) {
          const contactSocketId = this.userSocketMap[contactId];
          if (contactSocketId) {
            this.io.to(contactSocketId).emit(online ? 'user:online' : 'user:offline', status);
          }
        }
        logger.info(
          `Broadcasted ${online ? 'online' : 'offline'} status for user ${userId} to ${contactUserIds.length} contacts`
        );
      } else {
        logger.debug(`No contacts found for user ${userId}, skipping broadcast`);
      }
    } catch (error: any) {
      logger.error('Failed to broadcast online status:', error);
      // Fallback: broadcast to all connected clients
      const status: OnlineStatus = {
        userId,
        online,
        lastSeen: online ? undefined : new Date(),
      };
      this.io.emit(online ? 'user:online' : 'user:offline', status);
    }
  }

  /**
   * Get user's matched contacts from user service
   */
  private async getUserContacts(userId: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${USER_SERVICE_URL}/api/matches/${userId}/matched-user-ids`,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 && response.data.success) {
        return response.data.data || [];
      }

      logger.warn(`Failed to get contacts for user ${userId}: ${response.status}`);
      return [];
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        logger.error(`User service unavailable when fetching contacts for ${userId}`);
      } else {
        logger.error(`Error fetching contacts for user ${userId}:`, error.message);
      }
      return [];
    }
  }

  /**
   * Broadcast event to all participants in a conversation except sender
   */
  private async broadcastToConversation(
    conversationId: string,
    senderId: string,
    event: string,
    data: any
  ): Promise<void> {
    try {
      // Get other participant
      const otherParticipantId = await this.getOtherParticipant(conversationId, senderId);

      if (otherParticipantId) {
        const socketId = this.userSocketMap[otherParticipantId];
        if (socketId) {
          this.io.to(socketId).emit(event, data);
        }
      }
    } catch (error: any) {
      logger.error('Broadcast to conversation failed:', error);
    }
  }

  /**
   * Get other participant in a conversation
   */
  private async getOtherParticipant(
    conversationId: string,
    userId: string
  ): Promise<string | null> {
    try {
      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        logger.warn(`Conversation ${conversationId} not found`);
        return null;
      }

      return conversationRepository.getOtherParticipant(conversation, userId);
    } catch (error: any) {
      logger.error('Failed to get other participant:', error);
      return null;
    }
  }

  /**
   * Get online status for a user
   */
  public async getOnlineStatus(userId: string): Promise<OnlineStatus | null> {
    try {
      const statusStr = await redisClient.getClient().get(`user:online:${userId}`);
      if (statusStr) {
        return JSON.parse(statusStr as string) as OnlineStatus;
      }
      return null;
    } catch (error: any) {
      logger.error('Failed to get online status:', error);
      return null;
    }
  }

  /**
   * Send message to a specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const socketId = this.userSocketMap[userId];
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      logger.info(`Sent event ${event} to user ${userId}`);
    } else {
      logger.warn(`User ${userId} not connected, cannot send event ${event}`);
    }
  }

  /**
   * Get count of connected clients
   */
  public getConnectedCount(): number {
    return Object.keys(this.userSocketMap).length;
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    return !!this.userSocketMap[userId];
  }
}
