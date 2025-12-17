import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'https://flamoral.com',
        'https://www.flamoral.com',
        'https://admin.flamoral.com',
        'https://app.flamoral.com',
        'https://flamoral.vercel.app',
        'https://*.flamoral.com', // Allow all subdomains
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:4000',
      ];

      // Allow requests with no origin (mobile apps, server-to-server, native WebSocket)
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

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`WebSocket CORS: Origin ${origin} not allowed`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-CSRF-Token',
      'x-csrf-token',
      'X-API-Key',
      'X-Device-ID',
      'X-Platform',
    ],
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Enable compatibility with Socket.IO v2/v3 clients
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024,
  },
  httpCompression: {
    threshold: 1024,
  },
  cookie: {
    name: 'io',
    httpOnly: true,
    sameSite: 'lax',
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebSocketGateway');
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // Add global error handler
    server.engine.on('connection_error', (err) => {
      this.logger.error('WebSocket connection error', {
        code: err.code,
        message: err.message,
        context: err.context,
      });
    });

    // Monitor server events
    server.on('connection', (socket) => {
      this.logger.debug(`New socket connection attempt: ${socket.id}`);
    });

    server.on('disconnect', (socket) => {
      this.logger.debug(`Socket disconnected: ${socket.id}`);
    });
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake (support multiple methods)
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token as string;

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.emit('error', {
          code: 'AUTH_REQUIRED',
          message: 'Authentication token required',
        });
        client.disconnect(true);
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (!payload?.userId) {
        throw new Error('Invalid token payload');
      }

      // Attach user info to socket
      (client as AuthenticatedSocket).userId = payload.userId;
      (client as AuthenticatedSocket).email = payload.email;

      // Handle multiple connections from same user (disconnect old connection)
      const existingSocketId = this.connectedUsers.get(payload.userId);
      if (existingSocketId && existingSocketId !== client.id) {
        const existingSocket = this.server.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          this.logger.log(`Disconnecting old connection for user ${payload.userId}`);
          existingSocket.emit('error', {
            code: 'DUPLICATE_CONNECTION',
            message: 'New connection established from another device',
          });
          existingSocket.disconnect(true);
        }
      }

      // Track connected user
      this.connectedUsers.set(payload.userId, client.id);

      // Join user's personal room
      client.join(`user:${payload.userId}`);

      this.logger.log(`User ${payload.userId} connected (socket: ${client.id})`);

      // Notify client of successful connection
      client.emit('connected', {
        status: 'connected',
        userId: payload.userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });

      // Broadcast online status to user's contacts (not all clients)
      this.server.to(`user:${payload.userId}`).emit('user:online', {
        userId: payload.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Client ${client.id} connection rejected: ${error.message}`,
      );
      client.emit('error', {
        code: 'AUTH_FAILED',
        message: 'Authentication failed',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    try {
      if (client.userId) {
        this.connectedUsers.delete(client.userId);
        this.logger.log(`User ${client.userId} disconnected from socket ${client.id}`);

        // Leave all rooms
        const rooms = Array.from(client.rooms);
        rooms.forEach(room => {
          if (room !== client.id) {
            client.leave(room);
          }
        });

        // Broadcast offline status to user's contacts only (not all clients)
        this.server.emit('user:offline', {
          userId: client.userId,
          timestamp: new Date().toISOString(),
        });
      } else {
        this.logger.warn(`Unauthenticated socket ${client.id} disconnected`);
      }
    } catch (error) {
      this.logger.error(`Error handling disconnect for socket ${client.id}:`, error);
    }
  }

  // ==========================================
  // Messaging Events
  // ==========================================

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string; replyTo?: string; tempId?: string },
  ) {
    try {
      const { conversationId, content, type = 'text', replyTo, tempId } = data;

      if (!conversationId || !content) {
        throw new WsException('Invalid message data: conversationId and content are required');
      }

      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tempId,
        conversationId,
        senderId: client.userId,
        content,
        type,
        replyTo,
        createdAt: new Date().toISOString(),
        status: 'sent',
      };

      // Broadcast to conversation room (exclude sender)
      client.to(`conversation:${conversationId}`).emit('message:new', message);

      // Also emit back to sender for confirmation
      client.emit('message:sent', {
        tempId,
        messageId: message.id,
        timestamp: message.createdAt,
      });

      this.logger.log(`Message sent: ${message.id} in conversation ${conversationId}`);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:typing')
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    try {
      const { conversationId, isTyping } = data;

      if (!conversationId) {
        throw new WsException('conversationId is required');
      }

      // Broadcast typing status to conversation (exclude sender)
      client.to(`conversation:${conversationId}`).emit('typing', {
        userId: client.userId,
        conversationId,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling typing: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:read')
  @SubscribeMessage('mark_read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId?: string; messageIds?: string[] },
  ) {
    try {
      const { conversationId, messageId, messageIds } = data;

      if (!conversationId) {
        throw new WsException('conversationId is required');
      }

      const readAt = new Date().toISOString();
      const idsToMark = messageIds || (messageId ? [messageId] : []);

      // Broadcast read receipt to conversation (exclude sender)
      client.to(`conversation:${conversationId}`).emit('message_read', {
        userId: client.userId,
        conversationId,
        messageIds: idsToMark,
        readAt,
      });

      return { success: true, readAt };
    } catch (error) {
      this.logger.error(`Error marking message as read: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // Conversation Management
  // ==========================================

  @SubscribeMessage('conversation:join')
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        throw new WsException('conversationId is required');
      }

      client.join(`conversation:${conversationId}`);
      this.logger.log(`User ${client.userId} joined conversation ${conversationId}`);

      // Notify other participants
      client.to(`conversation:${conversationId}`).emit('conversation:joined', {
        userId: client.userId,
        conversationId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, conversationId };
    } catch (error) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('conversation:leave')
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        throw new WsException('conversationId is required');
      }

      client.leave(`conversation:${conversationId}`);
      this.logger.log(`User ${client.userId} left conversation ${conversationId}`);

      // Notify other participants
      client.to(`conversation:${conversationId}`).emit('conversation:left', {
        userId: client.userId,
        conversationId,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error leaving conversation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // Match Events
  // ==========================================

  @SubscribeMessage('match:notify')
  async handleMatchNotification(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; matchId: string },
  ) {
    const { targetUserId, matchId } = data;

    // Send notification to matched user if online
    this.server.to(`user:${targetUserId}`).emit('match:new', {
      matchId,
      userId: client.userId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  // ==========================================
  // Presence & Status
  // ==========================================

  @SubscribeMessage('presence:get')
  async handleGetPresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    const { userIds } = data;

    const onlineUsers = userIds.filter((userId) =>
      this.connectedUsers.has(userId),
    );

    return {
      success: true,
      online: onlineUsers,
      offline: userIds.filter((id) => !onlineUsers.includes(id)),
    };
  }

  @SubscribeMessage('status:update')
  async handleStatusUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: 'online' | 'away' | 'busy' },
  ) {
    const { status } = data;

    // Broadcast status change
    this.server.emit('user:status', {
      userId: client.userId,
      status,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  // ==========================================
  // Video Call Events
  // NOTE: Video calls require BASIC tier or higher
  // ==========================================

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; callType: 'video' | 'audio' },
  ) {
    const { targetUserId, callType } = data;

    // TODO: Add subscription check here
    // Video calls require BASIC tier or higher
    // This should be validated by checking user's subscription tier from database

    // Check if target user is online
    if (!this.connectedUsers.has(targetUserId)) {
      return { success: false, error: 'User is offline' };
    }

    const callId = `call_${Date.now()}`;

    // Notify target user of incoming call
    this.server.to(`user:${targetUserId}`).emit('call:incoming', {
      callId,
      callerId: client.userId,
      callType,
      timestamp: new Date().toISOString(),
    });

    return { success: true, callId };
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; callerId: string; accepted: boolean },
  ) {
    const { callId, callerId, accepted } = data;

    // Notify caller of answer
    this.server.to(`user:${callerId}`).emit('call:answered', {
      callId,
      accepted,
      answeredBy: client.userId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string },
  ) {
    const { callId, targetUserId } = data;

    // Notify other party that call ended
    this.server.to(`user:${targetUserId}`).emit('call:ended', {
      callId,
      endedBy: client.userId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('call:signal')
  async handleCallSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; signal: any },
  ) {
    const { targetUserId, signal } = data;

    // Forward WebRTC signal to target user
    this.server.to(`user:${targetUserId}`).emit('call:signal', {
      from: client.userId,
      signal,
    });

    return { success: true };
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getOnlineUserCount(): number {
    return this.connectedUsers.size;
  }

  emitToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToConversation(conversationId: string, event: string, data: any): void {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }
}
