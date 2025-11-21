import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export class SocketServer {
  private io: SocketIOServer;
  private userSockets: Map<string, string>; // userId -> socketId
  private onlineUsers: Set<string>;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || '*',
        credentials: true,
      },
    });

    this.userSockets = new Map();
    this.onlineUsers = new Set();

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Middleware for authentication
   */
  private setupMiddleware() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
          return next(new Error('Authentication error: Token not provided'));
        }

        // Remove 'Bearer ' prefix if present
        const cleanToken = token.replace('Bearer ', '');

        // Verify JWT token
        const decoded = jwt.verify(
          cleanToken,
          process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_here'
        ) as { userId: string };

        socket.userId = decoded.userId;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId!;
      logger.info(`User connected: ${userId} (socket: ${socket.id})`);

      // Store user's socket ID
      this.userSockets.set(userId, socket.id);
      this.onlineUsers.add(userId);

      // Notify user is online
      socket.broadcast.emit('user_online', { userId });

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${userId} (socket: ${socket.id})`);
        this.userSockets.delete(userId);
        this.onlineUsers.delete(userId);
        socket.broadcast.emit('user_offline', { userId });
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { conversationId: string; receiverId: string }) => {
        const receiverSocketId = this.userSockets.get(data.receiverId);
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('user_typing', {
            userId,
            conversationId: data.conversationId,
          });
        }
      });

      socket.on('typing_stop', (data: { conversationId: string; receiverId: string }) => {
        const receiverSocketId = this.userSockets.get(data.receiverId);
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('user_stop_typing', {
            userId,
            conversationId: data.conversationId,
          });
        }
      });

      // Handle message read status
      socket.on('message_read', (data: { messageId: string; senderId: string }) => {
        const senderSocketId = this.userSockets.get(data.senderId);
        if (senderSocketId) {
          this.io.to(senderSocketId).emit('message_read_receipt', {
            messageId: data.messageId,
            readBy: userId,
          });
        }
      });

      // Handle conversation opened (mark as read)
      socket.on('conversation_opened', (data: { conversationId: string }) => {
        socket.join(`conversation:${data.conversationId}`);
        logger.info(`User ${userId} joined conversation ${data.conversationId}`);
      });

      // Handle conversation closed
      socket.on('conversation_closed', (data: { conversationId: string }) => {
        socket.leave(`conversation:${data.conversationId}`);
        logger.info(`User ${userId} left conversation ${data.conversationId}`);
      });
    });
  }

  /**
   * Send a new message notification to a user
   */
  sendMessage(userId: string, message: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('new_message', message);
    }
  }

  /**
   * Send a message to a conversation room
   */
  sendMessageToConversation(conversationId: string, message: any) {
    this.io.to(`conversation:${conversationId}`).emit('new_message', message);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Get online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }
}

// Singleton instance
let socketServer: SocketServer | null = null;

export function initializeSocket(httpServer: HttpServer): SocketServer {
  if (!socketServer) {
    socketServer = new SocketServer(httpServer);
    logger.info('Socket.IO server initialized');
  }
  return socketServer;
}

export function getSocketServer(): SocketServer | null {
  return socketServer;
}
