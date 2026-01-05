/**
 * Socket Manager Call Extensions
 * Additional methods to add call signaling functionality to SocketManager
 *
 * INTEGRATION INSTRUCTIONS:
 * 1. Add this import to socket-manager.ts:
 *    import { CallHandlerMixin } from './socket-manager-calls-extension';
 *
 * 2. In handleConnection method, add after existing handlers:
 *    this.registerCallHandlers(socket, userId);
 *
 * 3. Add the registerCallHandlers method from this file to SocketManager class
 *
 * 4. Add all the public emit methods from this file to SocketManager class
 */

import { Server, Socket } from 'socket.io';

import { createLogger } from '../utils/logger';

const logger = createLogger('socket-manager-calls');

/**
 * Call signaling event handlers to add to SocketManager
 */
export const CallHandlerMixin = {
  /**
   * Register call signaling handlers
   * Add this method to SocketManager class
   */
  registerCallHandlers(
    this: { io: Server; userSocketMap: Record<string, string> },
    socket: Socket,
    userId: string
  ): void {
    // Call accepted - Notify caller that callee accepted
    socket.on(
      'call:accepted',
      (data: { callId: string; channelName: string; agoraToken: string }) => {
        logger.info(`Call accepted notification from user ${userId}`, { callId: data.callId });
      }
    );

    // Call rejected - Notify caller that callee rejected
    socket.on('call:rejected', (data: { callId: string; reason?: string }) => {
      logger.info(`Call rejected notification from user ${userId}`, {
        callId: data.callId,
        reason: data.reason,
      });
    });

    // Call ended - Notify other party that call ended
    socket.on('call:ended', (data: { callId: string; duration?: number }) => {
      logger.info(`Call ended notification from user ${userId}`, {
        callId: data.callId,
        duration: data.duration,
      });
    });

    // Call quality update - For monitoring call quality
    socket.on('call:quality_update', (data: { callId: string; quality: object }) => {
      logger.debug(`Call quality update from user ${userId}`, {
        callId: data.callId,
        quality: data.quality,
      });
    });

    // ICE candidate exchange for WebRTC
    socket.on(
      'call:ice_candidate',
      async (data: { callId: string; targetUserId: string; candidate: object }) => {
        try {
          const targetSocketId = this.userSocketMap[data.targetUserId];
          if (targetSocketId) {
            this.io.to(targetSocketId).emit('call:ice_candidate', {
              callId: data.callId,
              fromUserId: userId,
              candidate: data.candidate,
            });
          }
        } catch (error) {
          logger.error('Failed to relay ICE candidate', { error, userId, callId: data.callId });
        }
      }
    );

    // SDP offer/answer exchange for WebRTC
    socket.on(
      'call:sdp',
      async (data: {
        callId: string;
        targetUserId: string;
        sdp: object;
        type: 'offer' | 'answer';
      }) => {
        try {
          const targetSocketId = this.userSocketMap[data.targetUserId];
          if (targetSocketId) {
            this.io.to(targetSocketId).emit('call:sdp', {
              callId: data.callId,
              fromUserId: userId,
              sdp: data.sdp,
              type: data.type,
            });
          }
        } catch (error) {
          logger.error('Failed to relay SDP', { error, userId, callId: data.callId });
        }
      }
    );
  },

  /**
   * Emit call event to a specific user
   */
  emitCallEvent(
    this: { io: Server; userSocketMap: Record<string, string> },
    userId: string,
    event: string,
    data: any
  ): void {
    const socketId = this.userSocketMap[userId];
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      logger.info(`Emitted call event ${event} to user ${userId}`);
    } else {
      logger.warn(`User ${userId} not connected, cannot emit call event ${event}`);
    }
  },

  /**
   * Emit incoming call notification to callee
   */
  emitIncomingCall(
    this: { io: Server; userSocketMap: Record<string, string> },
    calleeId: string,
    callData: {
      callId: string;
      callerId: string;
      callerName: string;
      callerAvatar?: string;
      callType: 'video' | 'audio';
    }
  ): boolean {
    const socketId = this.userSocketMap[calleeId];
    if (socketId) {
      this.io.to(socketId).emit('call:incoming', callData);
      logger.info(`Emitted incoming call notification to user ${calleeId}`, {
        callId: callData.callId,
      });
      return true;
    }
    logger.warn(`Callee ${calleeId} not connected, cannot send incoming call notification`);
    return false;
  },

  /**
   * Emit call accepted notification to caller
   */
  emitCallAccepted(
    this: { io: Server; userSocketMap: Record<string, string>; emitCallEvent: Function },
    callerId: string,
    callData: {
      callId: string;
      channelName: string;
      agoraToken: string;
      calleeId: string;
      calleeName: string;
    }
  ): void {
    this.emitCallEvent(callerId, 'call:accepted', callData);
  },

  /**
   * Emit call rejected notification to caller
   */
  emitCallRejected(
    this: { io: Server; userSocketMap: Record<string, string>; emitCallEvent: Function },
    callerId: string,
    callData: {
      callId: string;
      reason?: string;
    }
  ): void {
    this.emitCallEvent(callerId, 'call:rejected', callData);
  },

  /**
   * Emit call ended notification to the other party
   */
  emitCallEnded(
    this: { io: Server; userSocketMap: Record<string, string>; emitCallEvent: Function },
    userId: string,
    callData: {
      callId: string;
      reason: string;
      duration?: number;
    }
  ): void {
    this.emitCallEvent(userId, 'call:ended', callData);
  },

  /**
   * Emit call timeout notification to both parties
   */
  emitCallTimeout(
    this: { io: Server; userSocketMap: Record<string, string>; emitCallEvent: Function },
    callerId: string,
    calleeId: string,
    callId: string
  ): void {
    const timeoutData = { callId, reason: 'timeout' };
    this.emitCallEvent(callerId, 'call:timeout', timeoutData);
    this.emitCallEvent(calleeId, 'call:timeout', timeoutData);
  },
};

export default CallHandlerMixin;
