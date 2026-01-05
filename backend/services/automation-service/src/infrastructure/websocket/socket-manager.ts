import { createLogger } from '@flamoral/backend-shared';
import { verify } from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

import config from '../../config';
import { cache } from '../cache/redis';

const logger = createLogger('automation-service:socket');

/**
 * Socket.IO Manager for real-time message delivery
 */
export class SocketManager {
  private io: Server;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO middleware
   */
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = verify(token as string, config.jwt.accessSecret) as any;
        socket.data.userId = decoded.userId || decoded.id;
        socket.data.user = decoded;

        logger.info('Socket authenticated', {
          socketId: socket.id,
          userId: socket.data.userId,
        });

        next();
      } catch (error: any) {
        logger.error('Socket authentication failed', { error: error.message });
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;

      logger.info('Client connected', {
        socketId: socket.id,
        userId,
      });

      // Track user socket
      this.addUserSocket(userId, socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('Client disconnected', {
          socketId: socket.id,
          userId,
        });

        this.removeUserSocket(userId, socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error', {
          socketId: socket.id,
          userId,
          error: error.message,
        });
      });

      // Emit welcome message
      socket.emit('connected', {
        socketId: socket.id,
        userId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Add user socket to tracking
   */
  private addUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);

    // Update online status in cache
    cache.set(`user:${userId}:online`, true, 300); // 5 minutes TTL
  }

  /**
   * Remove user socket from tracking
   */
  private removeUserSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        // Remove online status
        cache.delete(`user:${userId}:online`);
      }
    }
  }

  /**
   * Send message suggestion to user
   */
  async sendMessageSuggestion(userId: string, data: any): Promise<void> {
    try {
      this.io.to(`user:${userId}`).emit('message:suggestion', {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Message suggestion sent', { userId });
    } catch (error: any) {
      logger.error('Failed to send message suggestion', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Send icebreaker notification
   */
  async sendIcebreakerNotification(userId: string, data: any): Promise<void> {
    try {
      this.io.to(`user:${userId}`).emit('icebreaker:available', {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Icebreaker notification sent', { userId });
    } catch (error: any) {
      logger.error('Failed to send icebreaker notification', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Send smart reply suggestions
   */
  async sendSmartReplySuggestions(userId: string, data: any): Promise<void> {
    try {
      this.io.to(`user:${userId}`).emit('smart_reply:suggestions', {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Smart reply suggestions sent', { userId });
    } catch (error: any) {
      logger.error('Failed to send smart reply suggestions', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Send scheduled message notification
   */
  async sendScheduledMessageNotification(userId: string, data: any): Promise<void> {
    try {
      this.io.to(`user:${userId}`).emit('scheduled_message:notification', {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Scheduled message notification sent', { userId });
    } catch (error: any) {
      logger.error('Failed to send scheduled message notification', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Send automation status update
   */
  async sendAutomationStatus(userId: string, data: any): Promise<void> {
    try {
      this.io.to(`user:${userId}`).emit('automation:status', {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Automation status sent', { userId });
    } catch (error: any) {
      logger.error('Failed to send automation status', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Broadcast to multiple users
   */
  async broadcastToUsers(userIds: string[], event: string, data: any): Promise<void> {
    try {
      userIds.forEach((userId) => {
        this.io.to(`user:${userId}`).emit(event, {
          ...data,
          timestamp: new Date().toISOString(),
        });
      });

      logger.debug('Broadcast sent to users', {
        event,
        userCount: userIds.length,
      });
    } catch (error: any) {
      logger.error('Failed to broadcast to users', {
        event,
        error: error.message,
      });
    }
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Get connected user count
   */
  getConnectedCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get user socket count
   */
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
