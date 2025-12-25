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
import * as crypto from 'crypto';

interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
  csrfToken: string;
}

// Allowed origins for WebSocket connections (CSRF protection)
const ALLOWED_ORIGINS = [
  'https://flamoral.com',
  'https://www.flamoral.com',
  'https://app.flamoral.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

@WebSocketGateway({
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebSocketGateway');
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private csrfTokens: Map<string, { token: string; expiry: number }> = new Map(); // userId -> CSRF token

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized with CSRF protection');
  }

  /**
   * Validate origin header to prevent Cross-Site WebSocket Hijacking
   */
  private validateOrigin(origin: string | undefined): boolean {
    if (!origin) {
      // Allow connections without origin (native apps, etc.) in production with extra validation
      return this.configService.get<string>('NODE_ENV') === 'development';
    }

    // Check if origin is in allowed list
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
        return pattern.test(origin);
      }
      return origin === allowed || origin.startsWith(allowed);
    });

    return isAllowed;
  }

  /**
   * Validate CSRF token from handshake
   */
  private validateCsrfToken(userId: string, providedToken: string | undefined): boolean {
    if (!providedToken) {
      return false;
    }

    const storedData = this.csrfTokens.get(userId);
    if (!storedData) {
      return false;
    }

    // Check if token has expired (15 minutes)
    if (Date.now() > storedData.expiry) {
      this.csrfTokens.delete(userId);
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedToken),
        Buffer.from(storedData.token)
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate a new CSRF token for a user
   */
  generateCsrfToken(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    this.csrfTokens.set(userId, { token, expiry });
    return token;
  }

  async handleConnection(client: Socket) {
    try {
      // CSRF Protection Step 1: Validate Origin
      const origin = client.handshake.headers.origin;
      if (!this.validateOrigin(origin)) {
        this.logger.warn(`Client ${client.id} rejected: Invalid origin ${origin}`);
        client.emit('error', { code: 'INVALID_ORIGIN', message: 'Connection not allowed from this origin' });
        client.disconnect();
        return;
      }

      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.emit('error', { code: 'NO_TOKEN', message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      let payload: any;
      try {
        payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
      } catch (jwtError) {
        this.logger.warn(`Client ${client.id} rejected: Invalid JWT`);
        client.emit('error', { code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
        client.disconnect();
        return;
      }

      // CSRF Protection Step 2: Validate CSRF token (if provided in handshake)
      const csrfToken = client.handshake.auth?.csrfToken;

      // For initial connection, if CSRF token is provided, validate it
      // If not provided, we'll generate one and require it for sensitive operations
      if (csrfToken && !this.validateCsrfToken(payload.userId, csrfToken)) {
        // Only reject if token was provided but invalid (not if missing - first connection)
        const storedData = this.csrfTokens.get(payload.userId);
        if (storedData) {
          this.logger.warn(`Client ${client.id} rejected: Invalid CSRF token`);
          client.emit('error', { code: 'INVALID_CSRF', message: 'Invalid CSRF token' });
          client.disconnect();
          return;
        }
      }

      // Attach user info to socket
      (client as AuthenticatedSocket).userId = payload.userId;
      (client as AuthenticatedSocket).email = payload.email;

      // Generate new CSRF token for this session
      const newCsrfToken = this.generateCsrfToken(payload.userId);
      (client as AuthenticatedSocket).csrfToken = newCsrfToken;

      // Track connected user
      this.connectedUsers.set(payload.userId, client.id);

      // Join user's personal room
      client.join(`user:${payload.userId}`);

      this.logger.log(`User ${payload.userId} connected (socket: ${client.id})`);

      // Notify client of successful connection with CSRF token
      client.emit('connected', {
        status: 'connected',
        userId: payload.userId,
        csrfToken: newCsrfToken, // Client must use this for sensitive operations
      });

      // Broadcast online status
      this.server.emit('user:online', {
        userId: payload.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Client ${client.id} connection error:`, error);
      client.emit('error', { code: 'CONNECTION_ERROR', message: 'Connection failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      // Clean up CSRF token on disconnect
      this.csrfTokens.delete(client.userId);
      this.logger.log(`User ${client.userId} disconnected`);

      // Broadcast offline status
      this.server.emit('user:offline', {
        userId: client.userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Validate CSRF token for sensitive operations
   */
  private validateOperationCsrf(client: AuthenticatedSocket, providedToken: string | undefined): boolean {
    if (!providedToken) {
      return false;
    }
    return this.validateCsrfToken(client.userId, providedToken);
  }

  // ==========================================
  // Messaging Events (with CSRF validation for writes)
  // ==========================================

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string; csrfToken?: string },
  ) {
    const { conversationId, content, type = 'text', csrfToken } = data;

    // Validate CSRF token for message sending (sensitive operation)
    if (!this.validateOperationCsrf(client, csrfToken)) {
      throw new WsException('Invalid CSRF token');
    }

    if (!conversationId || !content) {
      throw new WsException('Invalid message data');
    }

    const message = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: client.userId,
      content,
      type,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    // Broadcast to conversation room
    this.server.to(`conversation:${conversationId}`).emit('message:new', message);

    return { success: true, message };
  }

  @SubscribeMessage('message:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const { conversationId, isTyping } = data;

    // Broadcast typing status to conversation
    client.to(`conversation:${conversationId}`).emit('message:typing', {
      userId: client.userId,
      conversationId,
      isTyping,
    });
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    const { conversationId, messageId } = data;

    // Broadcast read receipt
    this.server.to(`conversation:${conversationId}`).emit('message:read', {
      userId: client.userId,
      conversationId,
      messageId,
      readAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // Conversation Management
  // ==========================================

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;

    client.join(`conversation:${conversationId}`);
    this.logger.log(`User ${client.userId} joined conversation ${conversationId}`);

    return { success: true, conversationId };
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;

    client.leave(`conversation:${conversationId}`);
    this.logger.log(`User ${client.userId} left conversation ${conversationId}`);

    return { success: true };
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
  // Video Call Events (require CSRF for initiation)
  // ==========================================

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; callType: 'video' | 'audio'; csrfToken?: string },
  ) {
    const { targetUserId, callType, csrfToken } = data;

    // Validate CSRF token for call initiation (sensitive operation)
    if (!this.validateOperationCsrf(client, csrfToken)) {
      throw new WsException('Invalid CSRF token');
    }

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
  // CSRF Token Refresh
  // ==========================================

  @SubscribeMessage('csrf:refresh')
  async handleCsrfRefresh(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Generate new CSRF token
    const newToken = this.generateCsrfToken(client.userId);
    (client as AuthenticatedSocket).csrfToken = newToken;

    return { success: true, csrfToken: newToken };
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
