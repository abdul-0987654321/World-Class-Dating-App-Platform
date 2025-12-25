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
    origin: '*',
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

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user info to socket
      (client as AuthenticatedSocket).userId = payload.userId;
      (client as AuthenticatedSocket).email = payload.email;

      // Track connected user
      this.connectedUsers.set(payload.userId, client.id);

      // Join user's personal room
      client.join(`user:${payload.userId}`);

      this.logger.log(`User ${payload.userId} connected (socket: ${client.id})`);

      // Notify client of successful connection
      client.emit('connected', {
        status: 'connected',
        userId: payload.userId,
      });

      // Broadcast online status
      this.server.emit('user:online', {
        userId: payload.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Client ${client.id} connection rejected: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(`User ${client.userId} disconnected`);

      // Broadcast offline status
      this.server.emit('user:offline', {
        userId: client.userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ==========================================
  // Messaging Events
  // ==========================================

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string },
  ) {
    const { conversationId, content, type = 'text' } = data;

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
  // Video Call Events
  // ==========================================

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; callType: 'video' | 'audio' },
  ) {
    const { targetUserId, callType } = data;

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
