/**
 * Call Signaling WebSocket Handler
 * Handles real-time call signaling events via Socket.IO
 */

import { Server, Socket } from 'socket.io';
import { VideoCallService } from '../services/video-call.service';
import { logger } from '../infrastructure/logger';

export interface CallSignalingEvents {
  'initiate-call': (data: InitiateCallData, callback: (response: any) => void) => void;
  'accept-call': (data: AcceptCallData, callback: (response: any) => void) => void;
  'reject-call': (data: RejectCallData, callback: (response: any) => void) => void;
  'end-call': (data: EndCallData, callback: (response: any) => void) => void;
  'ice-candidate': (data: IceCandidateData) => void;
  'recording-consent': (data: RecordingConsentData, callback: (response: any) => void) => void;
}

interface InitiateCallData {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  callType: 'video' | 'audio';
}

interface AcceptCallData {
  callId: string;
}

interface RejectCallData {
  callId: string;
  reason?: string;
}

interface EndCallData {
  callId: string;
  duration?: number;
}

interface IceCandidateData {
  callId: string;
  candidate: RTCIceCandidateInit;
}

interface RecordingConsentData {
  callId: string;
  consent: boolean;
}

export class CallSignalingHandler {
  private io: Server;
  private videoCallService: VideoCallService;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(io: Server, videoCallService: VideoCallService) {
    this.io = io;
    this.videoCallService = videoCallService;
  }

  /**
   * Setup socket handlers
   */
  setupHandlers(socket: Socket): void {
    const userId = socket.handshake.auth.userId;

    if (!userId) {
      logger.warn('Socket connection without userId', { socketId: socket.id });
      socket.disconnect();
      return;
    }

    // Store connected user
    this.connectedUsers.set(userId, socket.id);
    logger.info('User connected for call signaling', { userId, socketId: socket.id });

    // Handle initiate call
    socket.on('initiate-call', async (data: InitiateCallData, callback) => {
      try {
        await this.handleInitiateCall(socket, data, callback);
      } catch (error) {
        logger.error('Error handling initiate-call', { error, userId });
        callback({ error: 'Failed to initiate call' });
      }
    });

    // Handle accept call
    socket.on('accept-call', async (data: AcceptCallData, callback) => {
      try {
        await this.handleAcceptCall(socket, data, callback);
      } catch (error) {
        logger.error('Error handling accept-call', { error, userId });
        callback({ error: 'Failed to accept call' });
      }
    });

    // Handle reject call
    socket.on('reject-call', async (data: RejectCallData, callback) => {
      try {
        await this.handleRejectCall(socket, data, callback);
      } catch (error) {
        logger.error('Error handling reject-call', { error, userId });
        callback({ error: 'Failed to reject call' });
      }
    });

    // Handle end call
    socket.on('end-call', async (data: EndCallData, callback) => {
      try {
        await this.handleEndCall(socket, data, callback);
      } catch (error) {
        logger.error('Error handling end-call', { error, userId });
        callback({ error: 'Failed to end call' });
      }
    });

    // Handle ICE candidate
    socket.on('ice-candidate', async (data: IceCandidateData) => {
      try {
        await this.handleIceCandidate(socket, data);
      } catch (error) {
        logger.error('Error handling ice-candidate', { error, userId });
      }
    });

    // Handle recording consent
    socket.on('recording-consent', async (data: RecordingConsentData, callback) => {
      try {
        await this.handleRecordingConsent(socket, data, callback);
      } catch (error) {
        logger.error('Error handling recording-consent', { error, userId });
        callback({ error: 'Failed to set recording consent' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.connectedUsers.delete(userId);
      logger.info('User disconnected from call signaling', { userId, socketId: socket.id });
    });
  }

  /**
   * Handle initiate call
   */
  private async handleInitiateCall(
    socket: Socket,
    data: InitiateCallData,
    callback: (response: any) => void
  ): Promise<void> {
    const userId = socket.handshake.auth.userId;

    // Check if callee is online
    const calleeSocketId = this.connectedUsers.get(data.calleeId);

    if (!calleeSocketId) {
      callback({ error: 'User is offline' });
      return;
    }

    // Check if callee is already in a call
    const isCalleeInCall = await this.videoCallService.isUserInCall(data.calleeId);
    if (isCalleeInCall) {
      callback({ error: 'User is busy' });
      return;
    }

    // Check if caller is already in a call
    const isCallerInCall = await this.videoCallService.isUserInCall(userId);
    if (isCallerInCall) {
      callback({ error: 'You are already in a call' });
      return;
    }

    // Initiate call
    const callSession = await this.videoCallService.initiateCall(
      data.callerId,
      data.callerName,
      data.calleeId,
      data.calleeName,
      data.callType,
      data.callerAvatar
    );

    // Generate Agora token for caller
    const callerToken = this.videoCallService.generateAgoraToken(
      callSession.channelName,
      parseInt(data.callerId),
      'publisher'
    );

    // Update call status to ringing
    callSession.status = 'ringing';

    // Send incoming call notification to callee
    this.io.to(calleeSocketId).emit('incoming-call', {
      callId: callSession.callId,
      callerId: callSession.callerId,
      callerName: callSession.callerName,
      callerAvatar: callSession.callerAvatar,
      calleeId: callSession.calleeId,
      calleeName: callSession.calleeName,
      callType: callSession.callType,
      timestamp: callSession.startTime,
    });

    // Set timeout to mark call as missed if not accepted
    setTimeout(async () => {
      const session = await this.videoCallService.getCallSession(callSession.callId);
      if (session && session.status === 'ringing') {
        await this.videoCallService.markCallAsMissed(callSession.callId);

        // Notify caller
        socket.emit('call-timeout', { callId: callSession.callId });

        // Notify callee
        if (calleeSocketId) {
          this.io.to(calleeSocketId).emit('call-timeout', { callId: callSession.callId });
        }
      }
    }, 60000); // 60 seconds timeout

    callback({
      call: callSession,
      agoraToken: callerToken,
    });

    logger.info('Call initiated', {
      callId: callSession.callId,
      callerId: data.callerId,
      calleeId: data.calleeId,
    });
  }

  /**
   * Handle accept call
   */
  private async handleAcceptCall(
    socket: Socket,
    data: AcceptCallData,
    callback: (response: any) => void
  ): Promise<void> {
    const userId = socket.handshake.auth.userId;

    const result = await this.videoCallService.acceptCall(data.callId, userId);

    // Notify caller that call was accepted
    const callerSocketId = this.connectedUsers.get(result.callSession.callerId);
    if (callerSocketId) {
      this.io.to(callerSocketId).emit('call-accepted', {
        callId: result.callSession.callId,
        callerId: result.callSession.callerId,
        callerName: result.callSession.callerName,
        calleeId: result.callSession.calleeId,
        calleeName: result.callSession.calleeName,
        callType: result.callSession.callType,
        agoraToken: this.videoCallService.generateAgoraToken(
          result.callSession.channelName,
          parseInt(result.callSession.callerId),
          'publisher'
        ),
        channelName: result.callSession.channelName,
      });
    }

    callback({
      callId: result.callSession.callId,
      channelName: result.callSession.channelName,
      agoraToken: result.agoraToken,
      callType: result.callSession.callType,
    });

    logger.info('Call accepted', {
      callId: data.callId,
      calleeId: userId,
    });
  }

  /**
   * Handle reject call
   */
  private async handleRejectCall(
    socket: Socket,
    data: RejectCallData,
    callback: (response: any) => void
  ): Promise<void> {
    const userId = socket.handshake.auth.userId;

    const callSession = await this.videoCallService.getCallSession(data.callId);
    if (!callSession) {
      callback({ error: 'Call not found' });
      return;
    }

    await this.videoCallService.rejectCall(data.callId, userId, data.reason);

    // Notify caller that call was rejected
    const callerSocketId = this.connectedUsers.get(callSession.callerId);
    if (callerSocketId) {
      this.io.to(callerSocketId).emit('call-rejected', {
        callId: data.callId,
        reason: data.reason || 'rejected',
      });
    }

    callback({ success: true });

    logger.info('Call rejected', {
      callId: data.callId,
      calleeId: userId,
      reason: data.reason,
    });
  }

  /**
   * Handle end call
   */
  private async handleEndCall(
    socket: Socket,
    data: EndCallData,
    callback: (response: any) => void
  ): Promise<void> {
    const userId = socket.handshake.auth.userId;

    const callSession = await this.videoCallService.getCallSession(data.callId);
    if (!callSession) {
      callback({ error: 'Call not found' });
      return;
    }

    await this.videoCallService.endCall(data.callId, userId, data.duration);

    // Notify other participant
    const otherUserId =
      callSession.callerId === userId ? callSession.calleeId : callSession.callerId;
    const otherSocketId = this.connectedUsers.get(otherUserId);

    if (otherSocketId) {
      this.io.to(otherSocketId).emit('call-ended', {
        callId: data.callId,
        reason: 'normal',
        duration: data.duration,
      });
    }

    callback({ success: true });

    logger.info('Call ended', {
      callId: data.callId,
      userId,
      duration: data.duration,
    });
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(socket: Socket, data: IceCandidateData): Promise<void> {
    const userId = socket.handshake.auth.userId;

    const callSession = await this.videoCallService.getCallSession(data.callId);
    if (!callSession) {
      return;
    }

    // Forward ICE candidate to other participant
    const otherUserId =
      callSession.callerId === userId ? callSession.calleeId : callSession.callerId;
    const otherSocketId = this.connectedUsers.get(otherUserId);

    if (otherSocketId) {
      this.io.to(otherSocketId).emit('ice-candidate', {
        callId: data.callId,
        candidate: data.candidate,
      });
    }
  }

  /**
   * Handle recording consent
   */
  private async handleRecordingConsent(
    socket: Socket,
    data: RecordingConsentData,
    callback: (response: any) => void
  ): Promise<void> {
    const userId = socket.handshake.auth.userId;

    await this.videoCallService.setRecordingConsent(data.callId, userId, data.consent);

    const callSession = await this.videoCallService.getCallSession(data.callId);
    if (!callSession) {
      callback({ error: 'Call not found' });
      return;
    }

    // Notify other participant about recording consent
    const otherUserId =
      callSession.callerId === userId ? callSession.calleeId : callSession.callerId;
    const otherSocketId = this.connectedUsers.get(otherUserId);

    if (otherSocketId) {
      this.io.to(otherSocketId).emit('recording-consent-updated', {
        callId: data.callId,
        userId,
        consent: data.consent,
        recordingEnabled: callSession.recordingEnabled,
      });
    }

    callback({
      success: true,
      recordingEnabled: callSession.recordingEnabled,
    });

    logger.info('Recording consent updated', {
      callId: data.callId,
      userId,
      consent: data.consent,
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

export default CallSignalingHandler;
