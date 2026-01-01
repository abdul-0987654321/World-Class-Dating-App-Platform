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
    // SECURITY: Never default to '*' for CORS - require explicit origins
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'https://flamoral.com',
      'https://www.flamoral.com',
      'https://app.flamoral.com',
    ];

    // Only allow localhost in development
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigins,
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
        const jwtSecret = process.env.JWT_ACCESS_SECRET;
        if (!jwtSecret) {
          return next(new Error('Server configuration error: JWT secret not configured'));
        }
        const decoded = jwt.verify(cleanToken, jwtSecret) as { userId: string };

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

      // ===== VIDEO CALL EVENTS =====

      // Handle incoming call notification (sent to receiver)
      socket.on('call_initiated', (data: {
        callId: string;
        callerId: string;
        receiverId: string;
        callType: 'video' | 'audio';
      }) => {
        const receiverSocketId = this.userSockets.get(data.receiverId);
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('incoming_call', {
            callId: data.callId,
            callerId: data.callerId,
            callType: data.callType,
          });
          logger.info(`Incoming call sent to ${data.receiverId}`, { callId: data.callId });
        }
      });

      // Handle call accepted
      socket.on('call_accepted', (data: {
        callId: string;
        callerId: string;
        receiverId: string;
      }) => {
        const callerSocketId = this.userSockets.get(data.callerId);
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call_accepted', {
            callId: data.callId,
            receiverId: data.receiverId,
          });
          logger.info(`Call accepted notification sent to ${data.callerId}`, { callId: data.callId });
        }
      });

      // Handle call rejected/declined
      socket.on('call_rejected', (data: {
        callId: string;
        callerId: string;
        receiverId: string;
        reason?: string;
      }) => {
        const callerSocketId = this.userSockets.get(data.callerId);
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call_rejected', {
            callId: data.callId,
            receiverId: data.receiverId,
            reason: data.reason || 'declined',
          });
          logger.info(`Call rejected notification sent to ${data.callerId}`, { callId: data.callId });
        }
      });

      // Handle call ended
      socket.on('call_ended', (data: {
        callId: string;
        callerId: string;
        receiverId: string;
        duration?: number;
      }) => {
        const otherUserId = userId === data.callerId ? data.receiverId : data.callerId;
        const otherSocketId = this.userSockets.get(otherUserId);

        if (otherSocketId) {
          this.io.to(otherSocketId).emit('call_ended', {
            callId: data.callId,
            endedBy: userId,
            duration: data.duration,
          });
          logger.info(`Call ended notification sent to ${otherUserId}`, { callId: data.callId });
        }
      });

      // Handle call busy (receiver is already in another call)
      socket.on('call_busy', (data: {
        callId: string;
        callerId: string;
      }) => {
        const callerSocketId = this.userSockets.get(data.callerId);
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call_busy', {
            callId: data.callId,
          });
          logger.info(`Call busy notification sent to ${data.callerId}`, { callId: data.callId });
        }
      });

      // Handle ICE candidates for WebRTC signaling
      socket.on('ice_candidate', (data: {
        callId: string;
        targetUserId: string;
        candidate: any;
      }) => {
        const targetSocketId = this.userSockets.get(data.targetUserId);
        if (targetSocketId) {
          this.io.to(targetSocketId).emit('ice_candidate', {
            callId: data.callId,
            fromUserId: userId,
            candidate: data.candidate,
          });
        }
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

  /**
   * Send incoming call notification to user
   */
  sendIncomingCall(
    receiverId: string,
    callData: {
      callId: string;
      callerId: string;
      callerName: string;
      callerPhoto?: string;
      callType: 'video' | 'audio';
    }
  ) {
    const socketId = this.userSockets.get(receiverId);
    if (socketId) {
      this.io.to(socketId).emit('incoming_call', callData);
      logger.info(`Incoming call sent to ${receiverId}`, { callId: callData.callId });
    }
  }

  /**
   * Notify caller that call was accepted
   */
  notifyCallAccepted(callerId: string, callData: { callId: string; receiverId: string }) {
    const socketId = this.userSockets.get(callerId);
    if (socketId) {
      this.io.to(socketId).emit('call_accepted', callData);
    }
  }

  /**
   * Notify caller that call was rejected
   */
  notifyCallRejected(
    callerId: string,
    callData: { callId: string; receiverId: string; reason?: string }
  ) {
    const socketId = this.userSockets.get(callerId);
    if (socketId) {
      this.io.to(socketId).emit('call_rejected', callData);
    }
  }

  /**
   * Notify other party that call ended
   */
  notifyCallEnded(userId: string, callData: { callId: string; endedBy: string; duration?: number }) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('call_ended', callData);
    }
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
