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
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:4000',
      'https://flamoral.com',
      'https://www.flamoral.com',
      'https://admin.flamoral.com',
      'https://app.flamoral.com',
      'https://flamoral.vercel.app',
      'https://*.flamoral.com',
    ];

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, server-to-server)
          if (!origin) {
            callback(null, true);
            return;
          }

          // Check if origin matches allowed patterns (including wildcards)
          const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin === '*') return true;
            if (allowedOrigin.includes('*')) {
              const pattern = allowedOrigin.replace(/\*/g, '.*');
              return new RegExp(`^${pattern}$`).test(origin);
            }
            return allowedOrigin === origin;
          });

          callback(null, isAllowed);
        },
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'X-Request-ID',
          'X-Correlation-ID',
        ],
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6,
      allowUpgrades: true,
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
        // Support multiple token sources
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization ||
          socket.handshake.query?.token as string;

        if (!token) {
          logger.warn(`Socket authentication failed: No token provided for ${socket.id}`);
          return next(new Error('Authentication error: Token not provided'));
        }

        // Remove 'Bearer ' prefix if present
        const cleanToken = typeof token === 'string' ? token.replace('Bearer ', '') : token;

        // Verify JWT token
        const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

        if (!jwtSecret) {
          logger.error('JWT_SECRET not configured');
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(cleanToken, jwtSecret) as { userId: string; id?: string };

        // Support both userId and id fields
        socket.userId = decoded.userId || decoded.id;

        if (!socket.userId) {
          logger.warn('Token payload missing userId');
          return next(new Error('Invalid token payload'));
        }

        logger.debug(`Socket authenticated: ${socket.id} -> User ${socket.userId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', {
          socketId: socket.id,
          error: error.message,
        });
        next(new Error(`Authentication error: ${error.message}`));
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
      socket.on('disconnect', (reason) => {
        logger.info(`User disconnected: ${userId} (socket: ${socket.id}), reason: ${reason}`);
        this.userSockets.delete(userId);
        this.onlineUsers.delete(userId);
        socket.broadcast.emit('user_offline', { userId, timestamp: new Date().toISOString() });

        // Leave all rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for user ${userId}:`, {
          socketId: socket.id,
          error: error.message || error,
        });
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
      // Support both naming conventions: call_initiated/initiate-call, call_accepted/accept-call, etc.

      // Handle initiate call - support both event names
      socket.on('initiate-call', (data: {
        callerId: string;
        callerName: string;
        callerAvatar?: string;
        calleeId: string;
        calleeName: string;
        callType: 'video' | 'audio';
      }) => {
        const receiverSocketId = this.userSockets.get(data.calleeId);
        if (receiverSocketId) {
          const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          this.io.to(receiverSocketId).emit('incoming-call', {
            callId,
            callerId: data.callerId,
            callerName: data.callerName,
            callerAvatar: data.callerAvatar,
            callType: data.callType,
            timestamp: Date.now(),
          });
          logger.info(`Incoming call sent to ${data.calleeId}`, { callId });
        }
      });

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

      // Handle accept call - support both event names
      socket.on('accept-call', (data: { callId: string }) => {
        // Find the caller from the call ID or require it in data
        // Broadcast acceptance to all participants
        socket.broadcast.emit('call-accepted', {
          callId: data.callId,
          receiverId: userId,
          timestamp: Date.now(),
        });
        logger.info(`Call accepted by ${userId}`, { callId: data.callId });
      });

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

      // Handle reject call - support both event names
      socket.on('reject-call', (data: { callId: string; reason?: string }) => {
        socket.broadcast.emit('call-rejected', {
          callId: data.callId,
          reason: data.reason || 'rejected',
          timestamp: Date.now(),
        });
        logger.info(`Call rejected by ${userId}`, { callId: data.callId });
      });

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

      // Handle end call - support both event names
      socket.on('end-call', (data: { callId: string; duration?: number }) => {
        socket.broadcast.emit('call-ended', {
          callId: data.callId,
          endedBy: userId,
          duration: data.duration,
          reason: 'normal',
          timestamp: Date.now(),
        });
        logger.info(`Call ended by ${userId}`, { callId: data.callId });
      });

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

      // Handle ICE candidates for WebRTC signaling - support both event names
      socket.on('ice-candidate', (data: {
        callId: string;
        targetUserId: string;
        candidate: any;
      }) => {
        const targetSocketId = this.userSockets.get(data.targetUserId);
        if (targetSocketId) {
          this.io.to(targetSocketId).emit('ice-candidate', {
            callId: data.callId,
            fromUserId: userId,
            candidate: data.candidate,
          });
        }
      });

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
