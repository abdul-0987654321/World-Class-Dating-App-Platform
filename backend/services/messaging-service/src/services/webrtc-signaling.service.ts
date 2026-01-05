/**
 * WebRTC Signaling Service
 * Handles WebRTC signaling for video and voice calls
 * Manages SDP offer/answer exchange and ICE candidate handling
 */

import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import { RedisClient } from '../infrastructure/cache/redis';
import { createLogger } from '../utils/logger';

import { VideoCallService, CallSession } from './video-call.service';

const logger = createLogger('webrtc-signaling-service');

// WebRTC Types
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: 'password' | 'oauth';
}

export interface WebRTCConfig {
  iceServers: ICEServer[];
  iceTransportPolicy?: 'all' | 'relay';
  iceCandidatePoolSize?: number;
  bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
  rtcpMuxPolicy?: 'negotiate' | 'require';
}

// Signaling Message Types
export type SignalingMessageType =
  | 'call:offer'
  | 'call:answer'
  | 'call:reject'
  | 'call:hangup'
  | 'call:ice-candidate'
  | 'call:renegotiate'
  | 'call:media-toggle'
  | 'call:hold'
  | 'call:resume'
  | 'call:quality-report';

export interface SignalingMessage {
  type: SignalingMessageType;
  callId: string;
  senderId: string;
  receiverId: string;
  payload: any;
  timestamp: number;
}

export interface CallOfferPayload {
  sdp: RTCSessionDescriptionInit;
  callType: 'video' | 'audio';
  callerName: string;
  callerAvatar?: string;
  webrtcConfig: WebRTCConfig;
}

export interface CallAnswerPayload {
  sdp: RTCSessionDescriptionInit;
  calleeName: string;
  calleeAvatar?: string;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

export interface MediaTogglePayload {
  audio: boolean;
  video: boolean;
}

export interface CallQualityReport {
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  bitrate: number;
  frameRate?: number;
  resolution?: { width: number; height: number };
}

// Pending ICE candidates before remote description is set
interface PendingIceCandidates {
  callId: string;
  candidates: RTCIceCandidateInit[];
}

export class WebRTCSignalingService {
  private io: Server;
  private redis: RedisClient;
  private videoCallService: VideoCallService;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private pendingCandidates: Map<string, PendingIceCandidates> = new Map();
  private webrtcConfig: WebRTCConfig;

  private readonly CALL_SESSION_PREFIX = 'webrtc:call:';
  private readonly ICE_CANDIDATES_PREFIX = 'webrtc:ice:';
  private readonly CALL_TIMEOUT_MS = 60000; // 60 seconds ring timeout
  private readonly MAX_CALL_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours max

  constructor(io: Server, redis: RedisClient, videoCallService: VideoCallService) {
    this.io = io;
    this.redis = redis;
    this.videoCallService = videoCallService;
    this.webrtcConfig = this.getDefaultWebRTCConfig();
  }

  /**
   * Get default WebRTC configuration with STUN/TURN servers
   */
  private getDefaultWebRTCConfig(): WebRTCConfig {
    const config: WebRTCConfig = {
      iceServers: [
        // Google STUN servers (free, reliable)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };

    // Add TURN servers if configured
    if (process.env.TURN_SERVER_URL) {
      config.iceServers.push({
        urls: process.env.TURN_SERVER_URL,
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_PASSWORD || '',
        credentialType: 'password',
      });
    }

    // Add Twilio TURN servers if configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      // In production, you'd fetch these from Twilio's API
      // For now, use static configuration
      config.iceServers.push({
        urls: `turn:global.turn.twilio.com:3478?transport=udp`,
        username: process.env.TWILIO_TURN_USERNAME || '',
        credential: process.env.TWILIO_TURN_PASSWORD || '',
      });
    }

    // Add Xirsys TURN servers if configured
    if (process.env.XIRSYS_CHANNEL) {
      config.iceServers.push({
        urls: [
          `turn:${process.env.XIRSYS_HOST || 'turn.xirsys.com'}:80?transport=udp`,
          `turn:${process.env.XIRSYS_HOST || 'turn.xirsys.com'}:3478?transport=udp`,
          `turn:${process.env.XIRSYS_HOST || 'turn.xirsys.com'}:443?transport=tcp`,
        ],
        username: process.env.XIRSYS_USERNAME || '',
        credential: process.env.XIRSYS_PASSWORD || '',
      });
    }

    return config;
  }

  /**
   * Get WebRTC configuration for a specific call
   * Can be customized based on call type, user preferences, etc.
   */
  getWebRTCConfig(callType: 'video' | 'audio'): WebRTCConfig {
    const config = { ...this.webrtcConfig };

    // For audio-only calls, we might want stricter relay policy
    // to ensure connectivity even with restrictive NATs
    if (callType === 'audio' && process.env.AUDIO_FORCE_RELAY === 'true') {
      config.iceTransportPolicy = 'relay';
    }

    return config;
  }

  /**
   * Setup socket handlers for WebRTC signaling
   */
  setupHandlers(socket: Socket): void {
    const userId = socket.data.userId;

    if (!userId) {
      logger.warn('Socket connection without userId', { socketId: socket.id });
      socket.disconnect();
      return;
    }

    // Register user connection
    this.connectedUsers.set(userId, socket.id);
    logger.info('User connected for WebRTC signaling', { userId, socketId: socket.id });

    // Handle call offer (initiating a call)
    socket.on(
      'call:offer',
      async (
        data: {
          calleeId: string;
          calleeName: string;
          callType: 'video' | 'audio';
          sdp: RTCSessionDescriptionInit;
        },
        callback: (response: any) => void
      ) => {
        try {
          const result = await this.handleCallOffer(socket, userId, data);
          callback(result);
        } catch (error: any) {
          logger.error('Error handling call:offer', { error, userId });
          callback({ success: false, error: error.message || 'Failed to initiate call' });
        }
      }
    );

    // Handle call answer (accepting a call)
    socket.on(
      'call:answer',
      async (
        data: {
          callId: string;
          sdp: RTCSessionDescriptionInit;
        },
        callback: (response: any) => void
      ) => {
        try {
          const result = await this.handleCallAnswer(socket, userId, data);
          callback(result);
        } catch (error: any) {
          logger.error('Error handling call:answer', { error, userId });
          callback({ success: false, error: error.message || 'Failed to answer call' });
        }
      }
    );

    // Handle call rejection
    socket.on(
      'call:reject',
      async (
        data: {
          callId: string;
          reason?: string;
        },
        callback: (response: any) => void
      ) => {
        try {
          const result = await this.handleCallReject(socket, userId, data);
          callback(result);
        } catch (error: any) {
          logger.error('Error handling call:reject', { error, userId });
          callback({ success: false, error: error.message || 'Failed to reject call' });
        }
      }
    );

    // Handle call hangup
    socket.on(
      'call:hangup',
      async (
        data: {
          callId: string;
          reason?: string;
          duration?: number;
        },
        callback: (response: any) => void
      ) => {
        try {
          const result = await this.handleCallHangup(socket, userId, data);
          callback(result);
        } catch (error: any) {
          logger.error('Error handling call:hangup', { error, userId });
          callback({ success: false, error: error.message || 'Failed to end call' });
        }
      }
    );

    // Handle ICE candidate
    socket.on(
      'call:ice-candidate',
      async (data: { callId: string; candidate: RTCIceCandidateInit }) => {
        try {
          await this.handleIceCandidate(socket, userId, data);
        } catch (error) {
          logger.error('Error handling call:ice-candidate', { error, userId });
        }
      }
    );

    // Handle media toggle (mute/unmute audio/video)
    socket.on(
      'call:media-toggle',
      async (data: { callId: string; audio: boolean; video: boolean }) => {
        try {
          await this.handleMediaToggle(socket, userId, data);
        } catch (error) {
          logger.error('Error handling call:media-toggle', { error, userId });
        }
      }
    );

    // Handle call renegotiation (for adding/removing tracks)
    socket.on(
      'call:renegotiate',
      async (
        data: {
          callId: string;
          sdp: RTCSessionDescriptionInit;
        },
        callback: (response: any) => void
      ) => {
        try {
          const result = await this.handleRenegotiation(socket, userId, data);
          callback(result);
        } catch (error: any) {
          logger.error('Error handling call:renegotiate', { error, userId });
          callback({ success: false, error: error.message || 'Failed to renegotiate' });
        }
      }
    );

    // Handle call quality report
    socket.on(
      'call:quality-report',
      async (data: { callId: string; report: CallQualityReport }) => {
        try {
          await this.handleQualityReport(socket, userId, data);
        } catch (error) {
          logger.error('Error handling call:quality-report', { error, userId });
        }
      }
    );

    // Handle disconnect
    socket.on('disconnect', async () => {
      this.connectedUsers.delete(userId);
      logger.info('User disconnected from WebRTC signaling', { userId });

      // End any active calls for this user
      await this.handleUserDisconnect(userId);
    });
  }

  /**
   * Handle call offer - initiating a new call
   */
  private async handleCallOffer(
    socket: Socket,
    callerId: string,
    data: {
      calleeId: string;
      calleeName: string;
      callType: 'video' | 'audio';
      sdp: RTCSessionDescriptionInit;
    }
  ): Promise<{ success: boolean; callId?: string; webrtcConfig?: WebRTCConfig; error?: string }> {
    const { calleeId, calleeName, callType, sdp } = data;

    // Check if callee is online
    const calleeSocketId = this.connectedUsers.get(calleeId);
    if (!calleeSocketId) {
      return { success: false, error: 'User is offline' };
    }

    // Check if caller or callee is already in a call
    const [callerInCall, calleeInCall] = await Promise.all([
      this.videoCallService.isUserInCall(callerId),
      this.videoCallService.isUserInCall(calleeId),
    ]);

    if (callerInCall) {
      return { success: false, error: 'You are already in a call' };
    }

    if (calleeInCall) {
      return { success: false, error: 'User is busy on another call' };
    }

    // Get caller info (would normally fetch from user service)
    const callerName = socket.data.userName || 'Unknown';
    const callerAvatar = socket.data.userAvatar;

    // Create call session
    const callSession = await this.videoCallService.initiateCall(
      callerId,
      callerName,
      calleeId,
      calleeName,
      callType,
      callerAvatar
    );

    // Store SDP in Redis for renegotiation
    await this.redis.set(
      `${this.CALL_SESSION_PREFIX}${callSession.callId}:offer`,
      JSON.stringify(sdp),
      120 // 2 minutes
    );

    // Get WebRTC config for this call
    const webrtcConfig = this.getWebRTCConfig(callType);

    // Send offer to callee
    const callOfferPayload: CallOfferPayload = {
      sdp,
      callType,
      callerName,
      callerAvatar,
      webrtcConfig,
    };

    this.io.to(calleeSocketId).emit('call:incoming', {
      callId: callSession.callId,
      callerId,
      callerName,
      callerAvatar,
      callType,
      sdp,
      webrtcConfig,
      timestamp: Date.now(),
    });

    // Set call timeout
    this.setCallTimeout(callSession.callId, callerId, calleeId, calleeSocketId);

    logger.info('Call offer sent', {
      callId: callSession.callId,
      callerId,
      calleeId,
      callType,
    });

    return {
      success: true,
      callId: callSession.callId,
      webrtcConfig,
    };
  }

  /**
   * Handle call answer - accepting a call
   */
  private async handleCallAnswer(
    socket: Socket,
    calleeId: string,
    data: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { callId, sdp } = data;

    // Accept the call through video call service
    const result = await this.videoCallService.acceptCall(callId, calleeId);

    if (!result) {
      return { success: false, error: 'Call not found or already handled' };
    }

    // Store answer SDP
    await this.redis.set(
      `${this.CALL_SESSION_PREFIX}${callId}:answer`,
      JSON.stringify(sdp),
      7200 // 2 hours
    );

    // Send answer to caller
    const callerSocketId = this.connectedUsers.get(result.callSession.callerId);
    if (callerSocketId) {
      this.io.to(callerSocketId).emit('call:answered', {
        callId,
        calleeId,
        calleeName: socket.data.userName || 'Unknown',
        calleeAvatar: socket.data.userAvatar,
        sdp,
      });
    }

    // Flush any pending ICE candidates
    await this.flushPendingIceCandidates(callId, result.callSession.callerId);

    logger.info('Call answered', { callId, calleeId });

    return { success: true };
  }

  /**
   * Handle call rejection
   */
  private async handleCallReject(
    socket: Socket,
    userId: string,
    data: {
      callId: string;
      reason?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { callId, reason } = data;

    const callSession = await this.videoCallService.getCallSession(callId);
    if (!callSession) {
      return { success: false, error: 'Call not found' };
    }

    await this.videoCallService.rejectCall(callId, userId, reason || 'rejected');

    // Notify caller
    const callerSocketId = this.connectedUsers.get(callSession.callerId);
    if (callerSocketId) {
      this.io.to(callerSocketId).emit('call:rejected', {
        callId,
        reason: reason || 'rejected',
      });
    }

    // Cleanup
    await this.cleanupCallSession(callId);

    logger.info('Call rejected', { callId, userId, reason });

    return { success: true };
  }

  /**
   * Handle call hangup
   */
  private async handleCallHangup(
    socket: Socket,
    userId: string,
    data: {
      callId: string;
      reason?: string;
      duration?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { callId, reason, duration } = data;

    const callSession = await this.videoCallService.getCallSession(callId);
    if (!callSession) {
      return { success: false, error: 'Call not found' };
    }

    await this.videoCallService.endCall(callId, userId, duration);

    // Notify other participant
    const otherUserId =
      callSession.callerId === userId ? callSession.calleeId : callSession.callerId;
    const otherSocketId = this.connectedUsers.get(otherUserId);

    if (otherSocketId) {
      this.io.to(otherSocketId).emit('call:ended', {
        callId,
        reason: reason || 'hangup',
        duration,
        endedBy: userId,
      });
    }

    // Cleanup
    await this.cleanupCallSession(callId);

    logger.info('Call ended', { callId, userId, reason, duration });

    return { success: true };
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(
    socket: Socket,
    userId: string,
    data: {
      callId: string;
      candidate: RTCIceCandidateInit;
    }
  ): Promise<void> {
    const { callId, candidate } = data;

    const callSession = await this.videoCallService.getCallSession(callId);
    if (!callSession) {
      // Store candidate for later if call not yet established
      const pending = this.pendingCandidates.get(callId) || { callId, candidates: [] };
      pending.candidates.push(candidate);
      this.pendingCandidates.set(callId, pending);
      return;
    }

    // Forward ICE candidate to other participant
    const otherUserId =
      callSession.callerId === userId ? callSession.calleeId : callSession.callerId;
    const otherSocketId = this.connectedUsers.get(otherUserId);

    if (otherSocketId) {
      this.io.to(otherSocketId).emit('call:ice-candidate', {
        callId,
        candidate,
        fromUserId: userId,
      });
    }

    // Also store in Redis for reliability
    const candidateKey = `${this.ICE_CANDIDATES_PREFIX}${callId}:${userId}`;
    const existingCandidates = await this.redis.get(candidateKey);
    const candidates = existingCandidates ? JSON.parse(existingCandidates) : [];
    candidates.push(candidate);
    await this.redis.set(candidateKey, JSON.stringify(candidates), 300);
  }

  /**
   * Handle media toggle (mute/unmute)
   */
  private async handleMediaToggle(
    socket: Socket,
    userId: string,
    data: {
      callId: string;
      audio: boolean;
      video: boolean;
    }
  ): Promise<void> {
    const { callId, audio, video } = data;

    const callSession = await this.videoCallService.getCallSession(callId);
    if (!callSession) return;

    // Forward to other participant
    const otherUserId =
      callSession.callerId === userId ? callSession.calleeId : callSession.callerId;
    const otherSocketId = this.connectedUsers.get(otherUserId);

    if (otherSocketId) {
      this.io.to(otherSocketId).emit('call:media-toggle', {
        callId,
        userId,
        audio,
        video,
      });
    }
  }

  /**
   * Handle call renegotiation (for adding/removing tracks)
   */
  private async handleRenegotiation(
    socket: Socket,
    userId: string,
    data: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { callId, sdp } = data;

    const callSession = await this.videoCallService.getCallSession(callId);
    if (!callSession) {
      return { success: false, error: 'Call not found' };
    }

    // Forward renegotiation to other participant
    const otherUserId =
      callSession.callerId === userId ? callSession.calleeId : callSession.callerId;
    const otherSocketId = this.connectedUsers.get(otherUserId);

    if (otherSocketId) {
      this.io.to(otherSocketId).emit('call:renegotiate', {
        callId,
        sdp,
        fromUserId: userId,
      });
    }

    return { success: true };
  }

  /**
   * Handle call quality report
   */
  private async handleQualityReport(
    socket: Socket,
    userId: string,
    data: {
      callId: string;
      report: CallQualityReport;
    }
  ): Promise<void> {
    const { callId, report } = data;

    // Log for analytics
    logger.debug('Call quality report', {
      callId,
      userId,
      packetsLost: report.packetsLost,
      jitter: report.jitter,
      rtt: report.roundTripTime,
      bitrate: report.bitrate,
    });

    // Store for analytics (optional - can be used for monitoring)
    await this.redis.set(
      `webrtc:quality:${callId}:${userId}`,
      JSON.stringify({ ...report, timestamp: Date.now() }),
      300
    );
  }

  /**
   * Handle user disconnect - cleanup any active calls
   */
  private async handleUserDisconnect(userId: string): Promise<void> {
    // Find any active calls for this user
    const keys = await this.redis.keys('call:session:*');

    for (const key of keys) {
      const sessionData = await this.redis.get(key);
      if (!sessionData) continue;

      const session: CallSession = JSON.parse(sessionData);

      if (
        (session.callerId === userId || session.calleeId === userId) &&
        (session.status === 'connected' || session.status === 'ringing')
      ) {
        // End the call
        await this.videoCallService.endCall(session.callId, userId);

        // Notify other participant
        const otherUserId = session.callerId === userId ? session.calleeId : session.callerId;
        const otherSocketId = this.connectedUsers.get(otherUserId);

        if (otherSocketId) {
          this.io.to(otherSocketId).emit('call:ended', {
            callId: session.callId,
            reason: 'disconnected',
            endedBy: userId,
          });
        }

        // Cleanup
        await this.cleanupCallSession(session.callId);
      }
    }
  }

  /**
   * Set call timeout for unanswered calls
   */
  private setCallTimeout(
    callId: string,
    callerId: string,
    calleeId: string,
    calleeSocketId: string
  ): void {
    setTimeout(async () => {
      const session = await this.videoCallService.getCallSession(callId);

      if (session && session.status === 'ringing') {
        // Mark as missed
        await this.videoCallService.markCallAsMissed(callId);

        // Notify caller
        const callerSocketId = this.connectedUsers.get(callerId);
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call:timeout', { callId });
        }

        // Notify callee
        if (this.connectedUsers.has(calleeId)) {
          this.io.to(calleeSocketId).emit('call:timeout', { callId });
        }

        // Cleanup
        await this.cleanupCallSession(callId);

        logger.info('Call timed out', { callId, callerId, calleeId });
      }
    }, this.CALL_TIMEOUT_MS);
  }

  /**
   * Flush pending ICE candidates to a user
   */
  private async flushPendingIceCandidates(callId: string, userId: string): Promise<void> {
    const pending = this.pendingCandidates.get(callId);
    if (!pending || pending.candidates.length === 0) return;

    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      for (const candidate of pending.candidates) {
        this.io.to(socketId).emit('call:ice-candidate', {
          callId,
          candidate,
        });
      }
    }

    this.pendingCandidates.delete(callId);
  }

  /**
   * Cleanup call session data
   */
  private async cleanupCallSession(callId: string): Promise<void> {
    this.pendingCandidates.delete(callId);

    await Promise.all([
      this.redis.del(`${this.CALL_SESSION_PREFIX}${callId}:offer`),
      this.redis.del(`${this.CALL_SESSION_PREFIX}${callId}:answer`),
      this.redis.del(`${this.ICE_CANDIDATES_PREFIX}${callId}:*`),
    ]);
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

  /**
   * Get user's socket ID
   */
  getUserSocketId(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }
}

export default WebRTCSignalingService;
